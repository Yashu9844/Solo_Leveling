import React, { useState, useEffect, useRef } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { MeterBar, PrimaryButton, QuietButton, SystemWindow } from '../kit';
import { type TreasuryCondition } from '../../engine/treasuryVoicePack';
import { getTreasurySummary, setDaySpending, startNewCycle, type TreasurySummary } from '../../store/treasury';
import { computeAllowanceMinor } from '../../engine/treasury';
import { selectTreasuryMessage } from '../../engine/treasuryVoice';

interface TreasuryCardProps {
  onOpenSetup?: () => void;
  onOpenHistory?: () => void;
  onSurvived?: (finalSpendableMinor: number) => void;
  /** Bumped by the parent when something changed that the card cannot see
   * (the setup sheet just created the treasury), so it reloads now rather
   * than at the next 30-second poll. */
  reloadToken?: number;
}

export const TreasuryCard: React.FC<TreasuryCardProps> = ({ onOpenSetup, onOpenHistory, onSurvived, reloadToken = 0 }) => {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [spendInputRupees, setSpendInputRupees] = useState('');
  // The day being entered. Defaults to today, but any earlier day of the
  // period can be picked: spending is never locked to an hour of the day.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Monthly pocket check-in (the 5th). Dismissal lasts until the next
  // load, so the question comes back rather than being silenced for good.
  const [pocketInput, setPocketInput] = useState('');
  const [checkInDismissed, setCheckInDismissed] = useState(false);
  const pocketPrefilled = useRef(false);

  // Held in a ref so the polling effect below runs ONCE. It used to list
  // `onSurvived` as a dependency, and Today passes a fresh arrow function
  // on every render — so every keystroke re-ran the effect, whose reload
  // reset the amount field to empty.
  const onSurvivedRef = useRef(onSurvived);
  onSurvivedRef.current = onSurvived;
  const survivedFired = useRef(false);

  const mountedRef = useRef(true);
  const reload = useRef(async () => {});
  reload.current = async () => {
    const sum = await getTreasurySummary();
    if (!mountedRef.current) return;
    setSummary(sum);
    if (sum.justConcludedVerdict === 'SURVIVED' && !survivedFired.current) {
      survivedFired.current = true;
      onSurvivedRef.current?.(sum.spendableMinor);
    }
  };

  // Polls every 30s for the life of the card. Runs ONCE (empty deps) so
  // nothing a keystroke re-renders can restart it.
  useEffect(() => {
    mountedRef.current = true;
    void reload.current();
    const interval = setInterval(() => void reload.current(), 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // A one-off reload when the parent says something changed underneath us
  // (the setup sheet just created the treasury). Without it the card sat on
  // "Set up" for up to 30 seconds after the Player had finished setting up.
  useEffect(() => {
    if (reloadToken > 0) void reload.current();
  }, [reloadToken]);

  // The field shows what is stored for the selected day. It is re-synced
  // only when the day or its stored figure changes — NOT on every render
  // or poll — so typing is never wiped.
  const day = selectedDate ?? summary?.todayLocalDate ?? '';
  const storedMinor = summary?.entries.find((e) => e.localDate === day)?.amountMinor ?? null;
  const syncKey = `${day}:${storedMinor ?? ''}`;
  const lastSync = useRef<string | null>(null);
  useEffect(() => {
    if (!day || lastSync.current === syncKey) return;
    lastSync.current = syncKey;
    setSpendInputRupees(storedMinor === null ? '' : String(storedMinor / 100));
    setError(null);
  }, [day, syncKey, storedMinor]);

  const checkIn = summary?.cycleCheckIn ?? null;
  useEffect(() => {
    if (checkIn && !pocketPrefilled.current) {
      pocketPrefilled.current = true;
      setPocketInput(checkIn.suggestedMinor > 0 ? String(checkIn.suggestedMinor / 100) : '');
    }
  }, [checkIn]);

  const handleStartCycle = async () => {
    const rupees = pocketInput.trim() === '' ? NaN : Number(pocketInput);
    const minor = Number.isFinite(rupees) ? Math.round(rupees * 100) : NaN;
    if (!Number.isFinite(minor) || minor < 0) {
      setError('Enter the amount in your pocket.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await startNewCycle(minor);
      pocketPrefilled.current = false;
      setSelectedDate(null);
      await getTreasurySummary().then(setSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the new cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkIn && !checkInDismissed) {
    const range = `${format(parseISO(checkIn.cycleStart), 'd MMM')} – ${format(parseISO(checkIn.cycleEnd), 'd MMM')}`;
    return (
      <div className="mt-3" data-testid="treasury-card">
        <SystemWindow arrive className="px-4 py-4">
          <div data-testid="cycle-checkin">
            <Heading label="New cycle" />
            <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-700">
              {range}
            </p>
            <p className="mt-1 text-sm text-ink-100">How much is in your pocket right now?</p>
            <p className="mt-1 text-xs text-faint">
              Spending is counted down from this amount until the 4th.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="init-slot min-w-0 flex-1 px-3">
                <span aria-hidden className="mr-1 shrink-0 font-mono text-sm text-ink-700">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  aria-label="Money in your pocket"
                  value={pocketInput}
                  onChange={(e) => setPocketInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleStartCycle();
                  }}
                  className="tabular-nums"
                  data-testid="cycle-pocket-input"
                />
              </div>
              <PrimaryButton
                size="md"
                fullWidth={false}
                className="shrink-0"
                onClick={handleStartCycle}
                disabled={isSubmitting || pocketInput.trim() === ''}
                data-testid="cycle-start-button"
              >
                Start
              </PrimaryButton>
            </div>

            {error && (
              <p role="alert" className="mt-2 text-xs text-state-alert">
                {error}
              </p>
            )}

            <QuietButton
              onClick={() => setCheckInDismissed(true)}
              className="-ml-2 mt-1 text-xs"
              data-testid="cycle-later"
            >
              Not now
            </QuietButton>
          </div>
        </SystemWindow>
      </div>
    );
  }

  if (!summary || !summary.treasury) {
    return (
      <div className="mt-3" data-testid="treasury-card">
        <SystemWindow arrive className="flex items-center justify-between gap-3 px-4 py-3">
          <Heading />
          <QuietButton onClick={onOpenSetup} className="-mr-2 shrink-0 text-xs font-semibold uppercase tracking-[0.12em]">
            Set up ›
          </QuietButton>
        </SystemWindow>
      </div>
    );
  }

  const {
    treasury,
    todaySpending,
    todayLocalDate,
    remainingDays,
    spendableMinor,
    allowanceMinor,
    statusResult,
    unaccounted,
  } = summary;

  const isToday = day === todayLocalDate;

  // Once today is registered the card shows the treasury as the System
  // now stands: today's spend comes off, today stops counting as a day
  // still to be funded, and the allowance is what tomorrow gets
  // (3,800 -> 3,770 / 29 = 130.00), shown the moment the Player enters it.
  const effSpendableMinor = todaySpending ? spendableMinor - todaySpending.amount_minor : spendableMinor;
  const effDays = todaySpending ? Math.max(remainingDays - 1, 0) : remainingDays;
  const effAllowanceMinor = todaySpending ? computeAllowanceMinor(effSpendableMinor, effDays) : allowanceMinor;
  const spendableRupees = (effSpendableMinor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const allowanceRupees =
    effAllowanceMinor !== null ? (Math.max(effAllowanceMinor, 0) / 100).toFixed(2) : '—';

  const captionCondition: TreasuryCondition =
    statusResult.status === 'CONCLUDED'
      ? (statusResult.verdict as TreasuryCondition)
      : (statusResult.status as TreasuryCondition);
  const captionMsg = selectTreasuryMessage(captionCondition, todayLocalDate);

  const money = (n: string) => `₹${n}`;
  const dayLabel = format(parseISO(day), 'EEE d MMM');

  const typed = spendInputRupees.trim() === '' ? NaN : Number(spendInputRupees);
  const typedMinor = Number.isFinite(typed) ? Math.round(typed * 100) : NaN;
  const valid = Number.isFinite(typedMinor) && typedMinor >= 0;
  const changed = valid && typedMinor !== storedMinor;

  const handleSave = async () => {
    if (!changed) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await setDaySpending(treasury.id, day, typedMinor);
      await getTreasurySummary().then(setSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that amount.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shiftDay = (delta: number) => {
    const d = parseISO(day);
    d.setDate(d.getDate() + delta);
    const next = format(d, 'yyyy-MM-dd');
    if (next < treasury.period_start_date || next > todayLocalDate) return;
    setSelectedDate(next === todayLocalDate ? null : next);
  };

  const strained = isToday && (statusResult.status === 'OVER_ALLOWANCE' || statusResult.status === 'CRITICAL');
  const initialMinor = summary.sources
    .filter((src) => src.active && !src.protected)
    .reduce((sum, src) => sum + src.amount_minor, 0);
  const gaugePct = initialMinor > 0 ? (Math.max(0, effSpendableMinor) / initialMinor) * 100 : 0;

  return (
    <div className="mt-3" data-testid="treasury-card">
      <SystemWindow arrive className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Heading />
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="-my-3 -mr-2 flex min-h-tap items-center px-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-mid"
              data-testid="treasury-history-open"
            >
              History ›
            </button>
          )}
        </div>

        {/* The status-window hero: one lit figure, the rest is readout. */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-ink-700">
              Spendable
            </div>
            <div
              className="glow-text mt-1 font-mono font-bold leading-none tabular-nums text-accent-core"
              style={{ fontSize: 'calc(34px * var(--type-scale))' }}
              data-testid="treasury-spendable"
            >
              {money(spendableRupees)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="font-mono text-xl font-bold leading-none tabular-nums text-ink-100"
              data-testid="treasury-days-left"
            >
              {effDays}
            </div>
            <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-ink-700">
              Days left
            </div>
          </div>
        </div>

        {/* The treasury as a gauge — it only ever drains, so the bar
            is the whole story at a glance. */}
        <MeterBar pct={gaugePct} height={6} label="Treasury remaining" className="mt-3" />

        <div className="mt-3 flex items-baseline gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
          <span className="shrink-0 text-ink-700">{todaySpending ? 'Allowance · tomorrow' : 'Allowance'}</span>
          <span aria-hidden className="min-w-[12px] flex-1 border-b border-dotted border-hair" />
          <span
            className="shrink-0 text-xs tracking-normal tabular-nums text-accent-mid"
            data-testid="treasury-allowance"
          >
            {money(allowanceRupees)} / day
          </span>
        </div>

        <div
          className="mt-3 px-3 py-2.5"
          style={{
            background: 'color-mix(in srgb, var(--void) 55%, var(--surface))',
            borderLeft: `2px solid ${strained ? 'var(--state-recover)' : 'var(--accent)'}`,
          }}
        >
          {/* Which day is being fed. Always open, at any hour; earlier days
              of the period can be filled in or changed too. */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => shiftDay(-1)}
              disabled={day <= treasury.period_start_date}
              className="-ml-2 flex min-h-tap min-w-[44px] items-center justify-center text-accent-mid disabled:opacity-30"
              data-testid="treasury-prev-day"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <span
              className="min-w-0 truncate text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500"
              data-testid="treasury-day-label"
            >
              {isToday ? `Today · ${dayLabel}` : dayLabel}
            </span>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => shiftDay(1)}
              disabled={isToday}
              className="-mr-2 flex min-h-tap min-w-[44px] items-center justify-center text-accent-mid disabled:opacity-30"
              data-testid="treasury-next-day"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="init-slot min-w-0 flex-1 px-3">
              <span aria-hidden className="mr-1 shrink-0 font-mono text-sm text-ink-700">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                aria-label={`Spending for ${dayLabel}`}
                value={spendInputRupees}
                onChange={(e) => setSpendInputRupees(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                }}
                className="tabular-nums"
                data-testid="treasury-spend-input"
              />
            </div>
            <PrimaryButton
              size="md"
              fullWidth={false}
              className="shrink-0"
              onClick={handleSave}
              disabled={isSubmitting || !changed}
              data-testid="treasury-register-button"
            >
              {storedMinor === null ? 'Register' : 'Update'}
            </PrimaryButton>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-state-alert">
              {error}
            </p>
          )}

          {isToday && unaccounted.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDate(unaccounted[0] ?? null)}
              className="mt-1 flex min-h-tap w-full items-center justify-between gap-2 text-left font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--state-recover)' }}
              data-testid="treasury-unaccounted"
            >
              <span className="min-w-0 truncate">
                {unaccounted.length} {unaccounted.length === 1 ? 'day' : 'days'} unaccounted
              </span>
              <span className="shrink-0">Fill in ›</span>
            </button>
          )}

          {isToday && (
            <p
              role="status"
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: strained ? 'var(--state-recover)' : 'var(--accent-mid)' }}
            >
              {captionMsg.text}
            </p>
          )}
        </div>
      </SystemWindow>
    </div>
  );
};

function Heading({ label = 'Treasury' }: { label?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="block h-[6px] w-[6px] shrink-0 rotate-45"
        style={{ background: 'var(--accent-core)', boxShadow: 'var(--glow-sm)' }}
      />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-mid">
        ⟨ {label} ⟩
      </span>
    </span>
  );
}
