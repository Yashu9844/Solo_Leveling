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
      <span className="text-sm text-ink-500">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n} of 5`}
            aria-pressed={value === n}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-pill text-lg transition-colors duration-150"
            style={{
              border: `1px solid ${value === n ? 'var(--accent)' : 'var(--hair)'}`,
              background: value === n ? 'var(--accent)' : 'transparent',
              color: value === n ? 'var(--on-accent)' : 'var(--ink-900)',
              boxShadow: value === n ? 'var(--glow-sm)' : 'none',
            }}
          >
            {/* Filled versus hollow, not colour alone — final/06 §7. The
                glyph is what makes the chosen dot readable with the
                colour removed. */}
            {value === n ? '●' : '○'}
          </button>
        ))}
      </div>
    </div>
  );
}
