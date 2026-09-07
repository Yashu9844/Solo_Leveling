interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
  label?: string;
}

/** A numeric +/- stepper — no keyboard typing required. */
export function Stepper({ value, onChange, step = 1, min = 0, suffix, label }: StepperProps) {
  return (
    <div>
      {label && <div className="mb-2 text-xxs uppercase tracking-wide text-ink-700">{label}</div>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="cut-sm min-h-tap min-w-[44px] text-lg text-ink-100"
          style={{ border: '1px solid var(--hair)', background: 'var(--surface-2)' }}
          aria-label="Decrease"
        >
          −
        </button>
        <span className="min-w-[64px] text-center font-mono text-md tabular-nums text-ink-100">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="cut-sm min-h-tap min-w-[44px] text-lg text-ink-100"
          style={{ border: '1px solid var(--hair)', background: 'var(--surface-2)' }}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
