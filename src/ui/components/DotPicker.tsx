interface DotPickerProps {
  label: string;
  value: number; // 1-5
  onChange: (value: number) => void;
}

/** A 1-5 dot row — final/05 §5's "Energy ○ ○ ● ○ ○" picker. One tap sets
 * the value; no typing, no slider. */
export function DotPicker({ label, value, onChange }: DotPickerProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-dim">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n} of 5`}
            aria-pressed={value === n}
            className={[
              'flex h-[44px] w-[44px] items-center justify-center rounded-pill border text-lg',
              value === n ? 'border-accent bg-accent text-bg' : 'border-state-pending text-state-pending',
            ].join(' ')}
          >
            {value === n ? '●' : '○'}
          </button>
        ))}
      </div>
    </div>
  );
}
