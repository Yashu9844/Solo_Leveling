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
      {label && <div className="mb-2 text-xxs uppercase tracking-wide text-ink-700">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className="min-h-tap rounded-pill px-4 text-sm transition-colors duration-150"
              style={{
                border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
                background: active ? 'var(--fill-faint)' : 'var(--surface-2)',
                color: active ? 'var(--accent-mid)' : 'var(--ink-500)',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
