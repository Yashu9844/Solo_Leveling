import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { CRITERION_TEXT } from './criterionText';

interface QuestDetailSheetProps {
  template: QuestTemplate;
  instance: QuestInstance;
  dayClosed: boolean;
  onClose: () => void;
  onToggle: () => void;
  /**
   * The per-domain logging sheet (final/02 §2 for CAREER, final/03 §2
   * for DSA, final/03 §4 for BUILD, final/04 for TRAINING/SLEEP/
   * ATTENTION) — logging real data is what auto-completes these quests;
   * the "Mark complete" button below always stays available as a manual
   * fallback/override. `label` names the action ("Log application",
   * "Log problem", "Log session").
   */
  domainLog?: { label: string; onOpen: () => void };
}

/** Minimal bottom sheet — final/06 §5.3. */
export function QuestDetailSheet({
  template,
  instance,
  dayClosed,
  onClose,
  onToggle,
  domainLog,
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

        {!complete && domainLog && (
          <button
            type="button"
            onClick={domainLog.onOpen}
            disabled={dayClosed}
            className="min-h-[44px] rounded-md border border-accent text-sm text-accent disabled:opacity-40"
          >
            {domainLog.label}
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
