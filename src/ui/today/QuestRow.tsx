import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { ROW_SUMMARY } from './criterionText';

interface QuestRowProps {
  template: QuestTemplate;
  instance: QuestInstance;
  dayClosed: boolean;
  /** Actual XP granted for a completed instance (may be capped below
   * template.xp) — omitted while incomplete, where the row shows the
   * template's nominal value instead. */
  xp?: { amount: number; cappedFrom?: number };
  onToggle: () => void;
  onOpen: () => void;
}

/** 64px row, two >= 44px tap targets: the circle (complete/undo) and the
 * rest of the row (opens the detail sheet). final/06 §4.4. */
export function QuestRow({ template, instance, dayClosed, xp, onToggle, onOpen }: QuestRowProps) {
  const complete = instance.state === 'complete';
  const disabled = dayClosed;
  const displayedXp = complete ? (xp?.amount ?? template.xp) : template.xp;
  const capped = complete && xp?.cappedFrom !== undefined;

  return (
    <div
      data-testid={`quest-row-${template.key}`}
      className={[
        'flex min-h-[64px] items-center gap-3 border-b border-border',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={complete ? `Undo ${template.title}` : `Complete ${template.title}`}
        aria-pressed={complete}
        className={[
          'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill border text-lg transition-transform duration-[180ms]',
          complete
            ? 'border-accent bg-accent text-bg'
            : 'border-state-pending text-state-pending',
        ].join(' ')}
      >
        {complete ? '●' : '○'}
      </button>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="flex min-h-[44px] flex-1 items-center justify-between text-left"
      >
        <span className="flex flex-col items-start justify-center">
          <span className="text-md text-text">{template.title}</span>
          <span className="text-xs text-text-dim">{ROW_SUMMARY[template.key]}</span>
        </span>
        <span
          className={[
            'font-mono text-sm tabular-nums',
            complete ? 'text-accent' : 'text-text-faint',
          ].join(' ')}
        >
          +{displayedXp}
          {capped && <span className="ml-1 text-xs text-text-faint">capped</span>}
        </span>
      </button>
    </div>
  );
}
