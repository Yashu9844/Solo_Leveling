import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { CRITERION_TEXT } from './criterionText';

interface QuestDetailSheetProps {
  template: QuestTemplate;
  instance: QuestInstance;
  dayClosed: boolean;
  onClose: () => void;
  onToggle: () => void;
  /** CAREER only (final/02 §2) — opens the application/substitute log,
   * which auto-completes this quest at 3 quality applications or 25
   * substitute minutes. The manual "Mark complete" button below still
   * works as a fallback/override. */
  onOpenCareerLog?: () => void;
}

/** Minimal bottom sheet — final/06 §5.3. No 5/10-min button, no history
 * line, no mode selectors (those are Slices 7-9's domain sheets). */
export function QuestDetailSheet({
  template,
  instance,
  dayClosed,
  onClose,
  onToggle,
  onOpenCareerLog,
}: QuestDetailSheetProps) {
  const complete = instance.state === 'complete';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[60vh] w-full flex-col gap-4 rounded-t-md border-t border-border bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{template.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        {template.implementation_intention && (
          <div className="rounded-md border border-border p-3 text-sm text-text">
            "At {template.implementation_intention.time} at {template.implementation_intention.place} I
            will {template.implementation_intention.first_action}."
          </div>
        )}

        <p className="text-sm text-text-dim">{CRITERION_TEXT[template.key]}</p>

        {template.key === 'career' && !complete && onOpenCareerLog && (
          <button
            type="button"
            onClick={onOpenCareerLog}
            disabled={dayClosed}
            className="min-h-[44px] rounded-md border border-accent text-sm text-accent disabled:opacity-40"
          >
            Log application
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          disabled={dayClosed}
          className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
        >
          {complete ? 'Undo' : 'Mark complete'}
        </button>
      </div>
    </div>
  );
}
