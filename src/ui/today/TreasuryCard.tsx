import React, { useState, useEffect, useRef } from 'react';
import { Lock } from '@phosphor-icons/react';
import { MeterBar, PrimaryButton, QuietButton, SystemWindow } from '../kit';
import { type TreasuryCondition } from '../../engine/treasuryVoicePack';
import {
  getTreasurySummary,
  registerSpending,
  correctSpending,
  type TreasurySummary,
} from '../../store/treasury';
import { computeAllowanceMinor } from '../../engine/treasury';
import { selectTreasuryMessage } from '../../engine/treasuryVoice';

interface TreasuryCardProps {
  onOpenSetup?: () => void;
  onOpenHistory?: () => void;
  onSurvived?: (finalSpendableMinor: number) => void;
}

export const TreasuryCard: React.FC<TreasuryCardProps> = ({ onOpenSetup, onOpenHistory, onSurvived }) => {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [spendInputRupees, setSpendInputRupees] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Held in a ref so the polling effect below runs ONCE. It used to list
  // `onSurvived` as a dependency, and Today passes a fresh arrow function
  // on every render — so every keystroke re-ran the effect, whose reload
  // reset the amount field to empty. That is why typing a number seemed
  // to be ignored and the field snapped back to nothing.
  const onSurvivedRef = useRef(onSurvived);
  onSurvivedRef.current = onSurvived;
  const survivedFired = useRef(false);

  useEffect(() => {
    let mounted = true;
    const reload = async () => {
      const sum = await getTreasurySummary();
      if (!mounted) return;
      setSummary(sum);
      if (sum.justConcludedVerdict === 'SURVIVED' && !survivedFired.current) {
        survivedFired.current = true;
        onSurvivedRef.current?.(sum.spendableMinor);
      }
    };
    void reload();
    const interval = setInterval(() => void reload(), 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
    isAccountingOpen,
  } = summary;

  // Once today is registered the card shows the treasury as the System
  // now stands: today's spend comes off, today stops counting as a day
  // still to be funded, and the allowance is what tomorrow gets. That is
  // the 3,800 -> 3,770 / 29 = 130.00 step of the spec, shown the moment
  // the Player registers instead of the next morning.
  const effSpendableMinor = todaySpending ? spendableMinor - todaySpending.amount_minor : spendableMinor;
  const effDays = todaySpending ? Math.max(remainingDays - 1, 0) : remainingDays;
  const effAllowanceMinor = todaySpending ? computeAllowanceMinor(effSpendableMinor, effDays) : allowanceMinor;
  const spendableRupees = (effSpendableMinor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const allowanceRupees =
    effAllowanceMinor !== null ? (Math.max(effAllowanceMinor, 0) / 100).toFixed(2) : '—';
  const spentRupees = todaySpending ? (todaySpending.amount_minor / 100).toFixed(2) : '0';

  const captionCondition: TreasuryCondition =
    statusResult.status === 'CONCLUDED' ? (statusResult.verdict as TreasuryCondition) : (statusResult.status as TreasuryCondition);
  const captionMsg = selectTreasuryMessage(captionCondition, todayLocalDate);

  const handleRegister = async () => {
    const val = parseFloat(spendInputRupees);
    if (isNaN(val) || val < 0) return;
    const amountMinor = Math.round(val * 100);

    try {
      setIsSubmitting(true);
      await registerSpending(treasury.id, amountMinor, todayLocalDate);
      setIsSubmitting(false);
      setIsEditing(false);
      setSpendInputRupees('');
      await getTreasurySummary().then(setSummary);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleCorrect = async () => {
    const val = parseFloat(spendInputRupees);
    if (isNaN(val) || val < 0) return;
    const amountMinor = Math.round(val * 100);

    try {
      setIsSubmitting(true);
      await correctSpending(treasury.id, todayLocalDate, amountMinor);
      setIsSubmitting(false);
      setIsEditing(false);
      setSpendInputRupees('');
      await getTreasurySummary().then(setSummary);
    } catch {
      setIsSubmitting(false);
    }
  };

  const locked = !isAccountingOpen && !todaySpending;
  const money = (n: string) => `₹${n}`;

  const amountField = (
    <div className="init-slot min-w-0 flex-1 px-3">
      <span aria-hidden className="mr-1 shrink-0 font-mono text-sm text-ink-700">₹</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        placeholder="0.00"
        aria-label="Today's spending"
        value={spendInputRupees}
        onChange={(e) => setSpendInputRupees(e.target.value)}
        className="tabular-nums"
        data-testid="treasury-spend-input"
      />
    </div>
  );

  const initialMinor = summary.sources
    .filter((src) => src.active && !src.protected)
    .reduce((sum, src) => sum + src.amount_minor, 0);
  const gaugePct = initialMinor > 0 ? (Math.max(0, effSpendableMinor) / initialMinor) * 100 : 0;
  const strained = statusResult.status === 'OVER_ALLOWANCE' || statusResult.status === 'CRITICAL';

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
            >
              {money(spendableRupees)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-xl font-bold leading-none tabular-nums text-ink-100">{effDays}</div>
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
          <span className="shrink-0 text-xs tracking-normal tabular-nums text-accent-mid">{money(allowanceRupees)} / day</span>
        </div>

        <div
          className="mt-3 px-3 py-2.5"
          style={{
            background: 'color-mix(in srgb, var(--void) 55%, var(--surface))',
            borderLeft: `2px solid ${strained ? 'var(--state-recover)' : 'var(--accent)'}`,
          }}
        >
          {locked && (
            <p className="flex items-center gap-2 text-xs text-ink-500">
              <Lock size={13} weight="bold" aria-hidden className="shrink-0 text-accent-mid" />
              <span className="min-w-0">Spending opens at 22:00</span>
            </p>
          )}

          {isAccountingOpen && !todaySpending && (
            <div className="flex items-center gap-2">
              {amountField}
              <PrimaryButton
                size="md"
                fullWidth={false}
                className="shrink-0"
                onClick={handleRegister}
                disabled={isSubmitting || !spendInputRupees}
                data-testid="treasury-register-button"
              >
                Register
              </PrimaryButton>
            </div>
          )}

          {todaySpending && !isEditing && (
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-ink-500">
                Spent today{' '}
                <span className="font-mono font-bold tabular-nums text-ink-100">{money(spentRupees)}</span>
              </p>
              {isAccountingOpen && (
                <QuietButton
                  onClick={() => {
                    setSpendInputRupees(String(todaySpending.amount_minor / 100));
                    setIsEditing(true);
                  }}
                  className="-my-3 -mr-2 shrink-0 text-xs font-semibold uppercase tracking-[0.12em]"
                  data-testid="treasury-correct-button"
                >
                  Correct
                </QuietButton>
              )}
            </div>
          )}

          {todaySpending && isEditing && (
            <div className="flex items-center gap-2">
              {amountField}
              <PrimaryButton
                size="md"
                fullWidth={false}
                className="shrink-0"
                onClick={handleCorrect}
                disabled={isSubmitting || !spendInputRupees}
              >
                Confirm
              </PrimaryButton>
              <QuietButton onClick={() => setIsEditing(false)} className="shrink-0 text-xs">
                Cancel
              </QuietButton>
            </div>
          )}

          {!locked && (
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

function Heading() {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="block h-[6px] w-[6px] shrink-0 rotate-45"
        style={{ background: 'var(--accent-core)', boxShadow: 'var(--glow-sm)' }}
      />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-mid">
        ⟨ Treasury ⟩
      </span>
    </span>
  );
}
