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
      {label && <div className="mb-1 text-xxs uppercase tracking-wide text-text-dim">{label}</div>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="min-h-[44px] min-w-[44px] rounded-md border border-border bg-surface-2 text-lg text-text"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="min-w-[64px] text-center font-mono text-md tabular-nums text-text">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="min-h-[44px] min-w-[44px] rounded-md border border-border bg-surface-2 text-lg text-text"
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}
