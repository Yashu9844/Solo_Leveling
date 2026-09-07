interface SingleChipSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  labelFor: (option: T) => string;
  selected: T | null;
  onSelect: (option: T) => void;
}

/** A row of chips where exactly one can be selected — tapping the
 * selected chip again does nothing (there is always exactly one active
 * choice once one is picked, no deselect-to-empty). No typing. */
export function SingleChipSelect<T extends string>({
  label,
  options,
  labelFor,
  selected,
  onSelect,
}: SingleChipSelectProps<T>) {
  return (
    <div>
      <div className="mb-2 text-xxs uppercase tracking-wide text-ink-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === selected;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={active}
              // Same chip as ChipToggle. They are one control with
              // different arity, and they matched before only by
              // coincidence.
              className="min-h-tap rounded-pill px-4 text-sm transition-colors duration-150"
              style={{
                border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
                background: active ? 'var(--fill-faint)' : 'var(--surface-2)',
                color: active ? 'var(--accent-mid)' : 'var(--ink-500)',
              }}
            >
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
