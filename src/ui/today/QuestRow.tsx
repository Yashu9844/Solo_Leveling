import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { ROW_SUMMARY } from './criterionText';

interface QuestRowProps {
  template: QuestTemplate;
  instance: QuestInstance;
  dayClosed: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

/** 64px row, two >= 44px tap targets: the circle (complete/undo) and the
 * rest of the row (opens the detail sheet). final/06 §4.4. */
export function QuestRow({ template, instance, dayClosed, onToggle, onOpen }: QuestRowProps) {
  const complete = instance.state === 'complete';
  const disabled = dayClosed;

  return (
    <div
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
        className="flex min-h-[44px] flex-1 flex-col items-start justify-center text-left"
      >
        <span className="text-md text-text">{template.title}</span>
        <span className="text-xs text-text-dim">{ROW_SUMMARY[template.key]}</span>
      </button>
    </div>
  );
}
