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
      <div className="mb-1 text-xxs uppercase tracking-wide text-text-dim">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === selected;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={active}
              className={[
                'min-h-[44px] rounded-pill border px-3 text-sm',
                active ? 'border-accent bg-accent-dim text-text' : 'border-border bg-surface-2 text-text-dim',
              ].join(' ')}
            >
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
