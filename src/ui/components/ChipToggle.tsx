interface ChipToggleProps {
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  label?: string;
}

/** A row of tappable chips for multi-select — no typing required. */
export function ChipToggle({ options, selected, onChange, label }: ChipToggleProps) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div>
      {label && <div className="mb-1 text-xxs uppercase tracking-wide text-text-dim">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={[
                'min-h-[44px] rounded-pill border px-3 text-sm',
                active
                  ? 'border-accent bg-accent-dim text-text'
                  : 'border-border bg-surface-2 text-text-dim',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
