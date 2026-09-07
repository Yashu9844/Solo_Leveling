import { CaretRight, Check } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

/**
 * The settings grouped list.
 *
 * design/03-SETTINGS-AND-THEMING.md §4: modern grouped-list conventions,
 * mobile-first — what someone expects from a phone settings screen, not
 * a web form. Groups carry an uppercase header; rows are at least 56px
 * with a leading glyph, a label, the current value trailing, and a
 * chevron only when tapping actually goes somewhere.
 *
 * Settings is the one screen in the app with no art and no glow. §4 is
 * blunt about why: a settings screen is not a stage, and making it
 * dramatic would only make it harder to use. So nothing in this file
 * reaches for --glow-*, and no caller puts an ArtLayer behind it.
 */

interface SettingsGroupProps {
  /** Uppercase header above the card. Omit for an unlabelled group. */
  title?: string;
  /** Sits under the card in small type — the place for "why this
   * exists", so a row's own label can stay short. */
  footnote?: ReactNode;
  children: ReactNode;
  /** Destructive groups (reset arc) take --state-alert. */
  tone?: 'default' | 'alert';
  /** The card holds a set of mutually exclusive choices. Makes it a
   * radiogroup, which is what the `selected` rows inside it need as a
   * parent to mean anything to a screen reader. */
  choice?: boolean;
  className?: string;
}

export function SettingsGroup({
  title,
  footnote,
  children,
  tone = 'default',
  choice = false,
  className = '',
}: SettingsGroupProps) {
  const alert = tone === 'alert';
  return (
    <div className={['mt-6', className].join(' ')}>
      {title && (
        <div
          className={[
            'mb-2 px-1 text-xxs uppercase tracking-wide',
            alert ? 'text-state-alert' : 'text-ink-700',
          ].join(' ')}
        >
          {title}
        </div>
      )}
      <div
        role={choice ? 'radiogroup' : undefined}
        aria-label={choice ? title : undefined}
        className="cut-sm overflow-hidden"
        style={{
          border: `1px solid ${alert ? 'var(--state-alert)' : 'var(--hair)'}`,
          background: 'var(--surface)',
        }}
      >
        {children}
      </div>
      {footnote && <p className="mt-2 px-1 text-xs leading-[1.5] text-faint">{footnote}</p>}
    </div>
  );
}

interface SettingsRowProps {
  icon?: Icon;
  label: string;
  /** Second line under the label, for a row that needs a sentence. */
  description?: string;
  /** Current value, shown trailing. */
  value?: ReactNode;
  /** Makes the row a button. Shows a chevron unless `selected` is set. */
  onClick?: () => void;
  /**
   * Marks the row as one option in a list you choose from.
   *
   * A chevron is a promise that tapping goes somewhere else. On a theme
   * or accent row it goes nowhere — it picks — so those get a check and
   * `aria-checked` instead. Passing this at all switches the row into
   * that mode, including when it is false.
   */
  selected?: boolean;
  /** A control rendered on its own line below the label — Segmented for
   * three or fewer choices (§4). */
  control?: ReactNode;
  tone?: 'default' | 'alert';
  disabled?: boolean;
  testId?: string;
}

/**
 * One row.
 *
 * The 56px floor is a minimum, not a height: with the text-size setting
 * at XL a two-line row is taller, and a fixed height would clip it. A
 * row with a control below the label is taller again by construction.
 */
export function SettingsRow({
  icon: Glyph,
  label,
  description,
  value,
  onClick,
  selected,
  control,
  tone = 'default',
  disabled = false,
  testId,
}: SettingsRowProps) {
  const alert = tone === 'alert';

  const body = (
    <>
      <div className="flex w-full items-center gap-3">
        {Glyph && (
          <Glyph
            size={18}
            weight="regular"
            color={alert ? 'var(--state-alert)' : 'var(--ink-700)'}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={['block text-sm leading-[1.35]', alert ? 'text-state-alert' : 'text-ink-100'].join(
              ' '
            )}
          >
            {label}
          </span>
          {description && (
            <span className="mt-0.5 block text-xs leading-[1.4] text-faint">{description}</span>
          )}
        </span>
        {value !== undefined && (
          <span className="shrink-0 text-right text-xs text-ink-700">{value}</span>
        )}
        {selected !== undefined ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {selected && <Check size={15} weight="bold" color="var(--accent-mid)" aria-hidden />}
          </span>
        ) : (
          onClick && <CaretRight size={14} color="var(--ink-900)" aria-hidden className="shrink-0" />
        )}
      </div>
      {control && <div className="mt-3 w-full">{control}</div>}
    </>
  );

  const shared = 'flex w-full flex-col px-4 py-3 text-left';
  const style = { minHeight: 'var(--row-min, 56px)' } as const;

  // A row with a control is not itself tappable — the control is. Making
  // the whole row a button would nest interactive elements, which breaks
  // both the accessibility tree and the tap target.
  if (!onClick) {
    return (
      <div
        className={[shared, 'justify-center', disabled ? 'opacity-40' : ''].join(' ')}
        style={style}
        data-testid={testId}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role={selected !== undefined ? 'radio' : undefined}
      aria-checked={selected !== undefined ? selected : undefined}
      className={[shared, 'justify-center', disabled ? 'opacity-40' : ''].join(' ')}
      style={style}
      data-testid={testId}
    >
      {body}
    </button>
  );
}

/** A hairline between rows, inset past the icon column so the list reads
 * as one card rather than as stacked strips. */
export function SettingsDivider() {
  return <div className="ml-4 h-px" style={{ background: 'var(--hair-faint)' }} aria-hidden />;
}

/**
 * Joins rows with dividers so callers do not have to interleave them by
 * hand — and so a row added later cannot forget one.
 */
export function SettingsList({ children }: { children: ReactNode[] }) {
  const rows = children.filter(Boolean);
  return (
    <>
      {rows.map((row, i) => (
        <div key={i}>
          {i > 0 && <SettingsDivider />}
          {row}
        </div>
      ))}
    </>
  );
}
