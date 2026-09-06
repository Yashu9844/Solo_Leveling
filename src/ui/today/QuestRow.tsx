import { motion } from 'framer-motion';
import {
  Barbell,
  Briefcase,
  Code,
  Cpu,
  Eye,
  MoonStars,
  type Icon,
} from '@phosphor-icons/react';
import type { CoreQuestKey, QuestInstance, QuestTemplate } from '../../engine/types';
import { IconTile } from '../kit';
import { ROW_SUMMARY } from './criterionText';

/** One glyph per domain, so a row is recognisable before it is read. */
const QUEST_ICON: Record<CoreQuestKey, Icon> = {
  career: Briefcase,
  dsa: Code,
  build: Cpu,
  training: Barbell,
  sleep: MoonStars,
  attention: Eye,
};

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

/**
 * 64px row, two >= 44px tap targets: the circle (complete/undo) and the
 * rest of the row (opens the detail sheet). final/06 §4.4.
 *
 * The circle sits on the right, following the reference dashboard: it is
 * where a thumb rests, and the circles still align into a scannable
 * column. The domain tile leads instead, which gives each row an
 * identity at a glance.
 *
 * Complete and pending differ by shape as well as colour — a filled disc
 * inside a solid ring versus an empty ring — because final/06 §7 forbids
 * colour-only state, and roughly one man in twelve would otherwise be
 * reading this list by brightness alone.
 */
export function QuestRow({ template, instance, dayClosed, xp, onToggle, onOpen }: QuestRowProps) {
  const complete = instance.state === 'complete';
  const disabled = dayClosed;
  const displayedXp = complete ? (xp?.amount ?? template.xp) : template.xp;
  const capped = complete && xp?.cappedFrom !== undefined;
  const Glyph = QUEST_ICON[template.key as CoreQuestKey] ?? Code;

  return (
    <div
      data-testid={`quest-row-${template.key}`}
      className={[
        'flex min-h-row items-center gap-3',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      style={{ borderBottom: '1px solid var(--hair-faint)' }}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        data-testid={`quest-row-${template.key}-open`}
        className="flex min-h-tap min-w-0 flex-1 items-center gap-3 text-left"
      >
        <IconTile icon={Glyph} size={34} active={complete} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-md text-ink-100">{template.title}</span>
          <span className="truncate text-xs text-ink-900">{ROW_SUMMARY[template.key as CoreQuestKey]}</span>
        </span>
      </button>

      <span
        className={[
          'shrink-0 font-mono text-sm tabular-nums',
          complete ? 'text-accent-mid' : 'text-faint',
        ].join(' ')}
      >
        +{displayedXp}
        {capped && <span className="ml-1 text-xs text-faint">capped</span>}
      </span>

      <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        aria-label={complete ? `Undo ${template.title}` : `Complete ${template.title}`}
        aria-pressed={complete}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center"
      >
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-pill transition-colors duration-[180ms]"
          style={{
            border: `1.5px solid ${complete ? 'var(--accent)' : 'var(--state-pending)'}`,
            boxShadow: complete ? 'var(--glow-sm)' : 'none',
          }}
        >
          <motion.span
            aria-hidden
            initial={false}
            animate={{ opacity: complete ? 1 : 0, scale: complete ? 1 : 0.4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="h-[11px] w-[11px] rounded-pill"
            style={{ background: 'var(--accent)' }}
          />
        </span>
      </motion.button>
    </div>
  );
}
