import React, { useState } from 'react';
import { Field, PrimaryButton, QuietButton, Sheet, TextInput } from '../kit';
import { createTreasury } from '../../store/treasury';
import { realDeps } from '../../store/deps';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { computeAllowanceMinor, computeRemainingDays, cycleBounds } from '../../engine/treasury';

interface TreasurySetupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SourceInputRow {
  name: string;
  amountRupees: string;
  protected: boolean;
}

/** Whole rupees in paise, or NaN for anything that is not a non-negative number. */
function toMinor(rupees: string): number {
  if (rupees.trim() === '') return NaN;
  const n = Number(rupees);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

const rupees = (minor: number) =>
  `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const TreasurySetupSheet: React.FC<TreasurySetupSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // The System's day, not the phone's calendar day: between midnight and
  // 04:00 it is still yesterday. Starting the period on the calendar date
  // put the start a day after "today", so the money counted from tomorrow
  // and the card showed ₹0 spendable.
  const todayStr = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
  // The pocket is re-counted on the 5th, so a new treasury runs to the
  // 4th rather than for an arbitrary 30 days.
  const defaultEndStr = cycleBounds(todayStr).end;

  const [periodStartDate, setPeriodStartDate] = useState(todayStr);
  const [periodEndDate, setPeriodEndDate] = useState(defaultEndStr);
  const [sources, setSources] = useState<SourceInputRow[]>([
    { name: 'Pocket', amountRupees: '', protected: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSourceChange = (index: number, field: keyof SourceInputRow, value: string | boolean) => {
    setSources((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as SourceInputRow;
      return next;
    });
  };

  // What the card will show the moment this is saved, so the Player sees
  // the figure before committing to it.
  const spendableMinor = sources.reduce((sum, s) => {
    const m = toMinor(s.amountRupees);
    return s.protected || Number.isNaN(m) ? sum : sum + m;
  }, 0);
  const datesValid = periodStartDate <= todayStr && periodEndDate >= todayStr;
  const daysLeft = datesValid ? computeRemainingDays(todayStr, periodEndDate) : 0;
  const allowanceMinor = datesValid ? computeAllowanceMinor(spendableMinor, daysLeft) : null;
  const allProtected = sources.every((s) => s.protected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = sources.map((s) => ({
      name: s.name.trim(),
      amountMinor: toMinor(s.amountRupees),
      protected: s.protected,
    }));
    if (parsed.some((s) => !s.name)) return setError('Give every source a name.');
    if (parsed.some((s) => Number.isNaN(s.amountMinor))) return setError('Enter an amount of zero or more for every source.');
    if (periodStartDate > todayStr) return setError('The period cannot start after today.');
    if (periodEndDate < todayStr) return setError('The period has to run until today or later.');

    try {
      setIsSubmitting(true);
      await createTreasury({ periodStartDate, periodEndDate, currency: 'INR', sources: parsed });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up the treasury.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title="⟨ SET UP TREASURY ⟩"
      footer={
        <div className="flex items-center gap-2">
          <QuietButton type="button" onClick={onClose}>
            Cancel
          </QuietButton>
          <PrimaryButton
            size="md"
            type="submit"
            form="treasury-setup-form"
            disabled={isSubmitting}
            data-testid="treasury-setup-submit"
          >
            {isSubmitting ? 'Starting…' : 'Start treasury'}
          </PrimaryButton>
        </div>
      }
    >
      <form
        id="treasury-setup-form"
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-5"
        data-testid="treasury-setup-sheet"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput
              type="date"
              value={periodStartDate}
              max={todayStr}
              onChange={(e) => setPeriodStartDate(e.target.value)}
              required
            />
          </Field>
          <Field label="To (inclusive)">
            <TextInput
              type="date"
              value={periodEndDate}
              min={todayStr}
              onChange={(e) => setPeriodEndDate(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-700">
              Money you hold
            </span>
            <QuietButton
              type="button"
              onClick={() => setSources((prev) => [...prev, { name: '', amountRupees: '', protected: false }])}
            >
              + Add source
            </QuietButton>
          </div>

          {sources.map((src, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-2 rounded-sm p-3" style={{ border: '1px solid var(--hair)' }}>
              <div className="flex min-w-0 gap-2">
                <TextInput
                  type="text"
                  placeholder="Source name (e.g. Bank, Cash)"
                  aria-label="Source name"
                  value={src.name}
                  onChange={(e) => handleSourceChange(i, 'name', e.target.value)}
                  className="min-w-0 flex-1"
                  required
                />
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Amount ₹"
                  aria-label="Amount in rupees"
                  value={src.amountRupees}
                  onChange={(e) => handleSourceChange(i, 'amountRupees', e.target.value)}
                  className="!w-28 shrink-0 tabular-nums"
                  required
                />
              </div>
              <div className="flex min-h-tap items-center justify-between gap-2 text-xs text-ink-500">
                <label className="flex min-w-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={src.protected}
                    onChange={(e) => handleSourceChange(i, 'protected', e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">Keep aside — not for daily spending</span>
                </label>
                {sources.length > 1 && (
                  <QuietButton type="button" onClick={() => setSources((prev) => prev.filter((_, j) => j !== i))}>
                    Remove
                  </QuietButton>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-500" data-testid="treasury-setup-preview">
          {datesValid && allowanceMinor !== null
            ? `${rupees(spendableMinor)} to spend over ${daysLeft} day${daysLeft === 1 ? '' : 's'} · ${rupees(Math.max(allowanceMinor, 0))} a day`
            : 'The period has to include today.'}
        </p>
        {allProtected && spendableMinor === 0 && sources.some((s) => toMinor(s.amountRupees) > 0) && (
          <p className="text-xs text-state-recover">
            Everything is kept aside, so there is nothing to spend. Untick a source to count it.
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-state-alert">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
};
