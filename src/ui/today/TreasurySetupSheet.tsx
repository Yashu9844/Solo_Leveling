import React, { useState } from 'react';
import { Sheet } from '../kit/Sheet';
import { PrimaryButton, QuietButton } from '../kit';
import { createTreasury } from '../../store/treasury';
import { format, addDays } from 'date-fns';

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

export const TreasurySetupSheet: React.FC<TreasurySetupSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultEndStr = format(addDays(new Date(), 29), 'yyyy-MM-dd');

  const [periodStartDate, setPeriodStartDate] = useState(todayStr);
  const [periodEndDate, setPeriodEndDate] = useState(defaultEndStr);
  const [sources, setSources] = useState<SourceInputRow[]>([
    { name: 'Bank Account', amountRupees: '3800', protected: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSource = () => {
    setSources((prev) => [...prev, { name: '', amountRupees: '', protected: false }]);
  };

  const handleRemoveSource = (index: number) => {
    if (sources.length <= 1) return;
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSourceChange = (
    index: number,
    field: keyof SourceInputRow,
    value: string | boolean
  ) => {
    setSources((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as SourceInputRow;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validSources = sources.map((s) => {
      const rupees = parseFloat(s.amountRupees);
      if (isNaN(rupees) || rupees < 0) {
        throw new Error('Please enter valid non-negative numbers for amounts.');
      }
      if (!s.name.trim()) {
        throw new Error('Please enter a name for every source.');
      }
      return {
        name: s.name.trim(),
        amountMinor: Math.round(rupees * 100),
        protected: s.protected,
      };
    });

    if (validSources.length === 0) {
      setError('At least one source is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createTreasury({
        periodStartDate,
        periodEndDate,
        currency: 'INR',
        sources: validSources,
      });
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to initialize treasury.');
    }
  };

  return (
    <Sheet open={isOpen} onClose={onClose} title="⟨ SET UP TREASURY ⟩">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm" data-testid="treasury-setup-sheet">
        {error && (
          <div className="p-2 text-xs rounded border border-[var(--state-critical)] bg-[var(--state-critical)]/10 text-[var(--state-critical)]">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-400)]">
            Period Dates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[var(--ink-500)] block">START DATE</span>
              <input
                type="date"
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--ink-700)] rounded px-2 py-1 text-xs text-[var(--ink-100)]"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-[var(--ink-500)] block">END DATE (INCLUSIVE)</span>
              <input
                type="date"
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--ink-700)] rounded px-2 py-1 text-xs text-[var(--ink-100)]"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--ink-400)]">
              Capital Sources
            </label>
            <button
              type="button"
              onClick={handleAddSource}
              className="text-xs text-[var(--accent-mana,#4da3ff)] hover:underline"
            >
              + Add Source
            </button>
          </div>

          {sources.map((src, i) => (
            <div
              key={i}
              className="p-2 bg-[var(--bg-card)] border border-[var(--ink-800)] rounded space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Source name (e.g. Bank, Cash)"
                  value={src.name}
                  onChange={(e) => handleSourceChange(i, 'name', e.target.value)}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--ink-700)] rounded px-2 py-1 text-xs text-[var(--ink-100)]"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount ₹"
                  value={src.amountRupees}
                  onChange={(e) => handleSourceChange(i, 'amountRupees', e.target.value)}
                  className="w-28 bg-[var(--bg-surface)] border border-[var(--ink-700)] rounded px-2 py-1 text-xs text-[var(--ink-100)]"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--ink-400)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={src.protected}
                    onChange={(e) => handleSourceChange(i, 'protected', e.target.checked)}
                    className="rounded"
                  />
                  <span>Protected Reserve (excluded from daily spendable)</span>
                </label>
                {sources.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(i)}
                    className="text-[10px] text-[var(--state-critical)] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <QuietButton type="button" onClick={onClose}>
            Cancel
          </QuietButton>
          <PrimaryButton type="submit" disabled={isSubmitting} data-testid="treasury-setup-submit">
            {isSubmitting ? 'Initializing...' : 'Start Treasury Period'}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
};
