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
      {label && (
        <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-700">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              // cut-sm rather than a pill, and lit rather than merely
              // tinted when chosen. Onboarding is the first surface the
              // user ever sees; a generic rounded pill here tells them
              // the rest of the app is a different application.
              className="cut-sm flex min-h-tap items-center gap-1.5 px-3.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all duration-150"
              style={{
                border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
                background: active
                  ? 'linear-gradient(180deg, rgba(77,163,255,0.18), rgba(77,163,255,0.05))'
                  : 'var(--surface-2)',
                color: active ? 'var(--accent-mid)' : 'var(--ink-500)',
                boxShadow: active ? '0 0 12px rgba(77,163,255,0.28)' : 'none',
              }}
            >
              {active && (
                <span aria-hidden className="text-[10px] leading-none">
                  ✓
                </span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
