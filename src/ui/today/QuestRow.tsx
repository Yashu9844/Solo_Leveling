import { motion } from 'framer-motion';
import {
  Barbell,
  Briefcase,
  CaretRight,
  Check,
  Code,
  Cpu,
  Eye,
  MoonStars,
  type Icon,
} from '@phosphor-icons/react';
import type { CoreQuestKey, QuestInstance, QuestTemplate } from '../../engine/types';
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

/** Tile color scheme for domain icon box matching reference design */
const DOMAIN_THEME: Record<CoreQuestKey, { bg: string; border: string; color: string; glow: string }> = {
  attention: {
    bg: 'rgba(15, 45, 85, 0.65)',
    border: 'rgba(77, 163, 255, 0.45)',
    color: '#5fb2ff',
    glow: '0 0 10px rgba(77, 163, 255, 0.35)',
  },
  build: {
    bg: 'rgba(15, 45, 85, 0.65)',
    border: 'rgba(77, 163, 255, 0.45)',
    color: '#5fb2ff',
    glow: '0 0 10px rgba(77, 163, 255, 0.35)',
  },
  career: {
    bg: 'rgba(55, 20, 85, 0.65)',
    border: 'rgba(192, 132, 252, 0.45)',
    color: '#c084fc',
    glow: '0 0 10px rgba(192, 132, 252, 0.35)',
  },
  dsa: {
    bg: 'rgba(55, 20, 85, 0.65)',
    border: 'rgba(192, 132, 252, 0.45)',
    color: '#c084fc',
    glow: '0 0 10px rgba(192, 132, 252, 0.35)',
  },
  sleep: {
    bg: 'rgba(55, 20, 85, 0.65)',
    border: 'rgba(192, 132, 252, 0.45)',
    color: '#c084fc',
    glow: '0 0 10px rgba(192, 132, 252, 0.35)',
  },
  training: {
    bg: 'rgba(55, 20, 85, 0.65)',
    border: 'rgba(192, 132, 252, 0.45)',
    color: '#c084fc',
    glow: '0 0 10px rgba(192, 132, 252, 0.35)',
  },
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
 * Cut-corner HUD card row matching the exact reference image.
 * 64px min height, two >= 44px tap targets: the circle (complete/undo) and the
 * rest of the row (opens the detail sheet).
 */
export function QuestRow({ template, instance, dayClosed, xp, onToggle, onOpen }: QuestRowProps) {
  const complete = instance.state === 'complete';
  const disabled = dayClosed;
  const displayedXp = complete ? (xp?.amount ?? template.xp) : template.xp;
  const capped = complete && xp?.cappedFrom !== undefined;
  const key = template.key as CoreQuestKey;
  const Glyph = QUEST_ICON[key] ?? Code;
  const theme = DOMAIN_THEME[key] ?? DOMAIN_THEME.attention;

  return (
    <div
      data-testid={`quest-row-${template.key}`}
      className={[
        // 56px, not the 64px --row-min: six of these plus the header, the
        // System line and three footer blocks have to fit 412x915 without
        // scrolling (final/06 §5.2). The inner targets are untouched — the
        // circle is still 44x44 and the row body still clears min-h-tap.
        'cut-sm mb-0.5 flex min-h-[52px] items-center gap-3 px-3 py-1 transition-all duration-150',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      style={{
        border: complete ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid rgba(77, 163, 255, 0.22)',
        background: complete
          ? 'linear-gradient(180deg, rgba(35, 18, 55, 0.75), rgba(18, 10, 32, 0.85))'
          : 'linear-gradient(180deg, rgba(12, 22, 38, 0.75), rgba(7, 13, 24, 0.85))',
        boxShadow: complete ? '0 0 14px rgba(168, 85, 247, 0.15)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        data-testid={`quest-row-${template.key}-open`}
        className="flex min-h-tap min-w-0 flex-1 items-center gap-3 text-left"
      >
        {/* Futuristic Icon Tile Box */}
        <div
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] transition-transform duration-150"
          style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.glow,
          }}
        >
          <Glyph size={18} weight="fill" color={theme.color} />
        </div>

        <span className="flex min-w-0 flex-col justify-center">
          <span className="truncate text-xs font-bold uppercase tracking-[0.14em] text-ink-100">
            {template.title}
          </span>
          <span className="truncate text-[11px] text-ink-900">
            {ROW_SUMMARY[key]}
          </span>
        </span>
      </button>

      <span
        className="shrink-0 font-mono text-xs font-semibold tabular-nums text-accent-mid"
      >
        +{displayedXp} XP
        {capped && <span className="ml-1 text-[10px] text-faint">capped</span>}
      </span>

      {/* Completion Status Checkbox Target */}
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
          className="flex h-6 w-6 items-center justify-center rounded-pill transition-all duration-200"
          style={{
            border: complete ? 'none' : '1.5px solid rgba(120, 140, 165, 0.5)',
            background: complete ? 'linear-gradient(135deg, #c084fc, #9333ea)' : 'transparent',
            boxShadow: complete ? '0 0 12px rgba(168, 85, 247, 0.6)' : 'none',
          }}
        >
          {complete ? (
            <Check size={14} weight="bold" color="#ffffff" />
          ) : null}
        </span>
      </motion.button>

      {/* Decoration, not a control. It duplicated the row body's own
          onOpen and rendered as a third 14x14 tap zone jammed against
          the completion circle — under the 44px floor and competing
          with the target beside it. The row is still the open target. */}
      <span aria-hidden className="shrink-0 text-ink-700">
        <CaretRight size={14} weight="bold" />
      </span>
    </div>
  );
}

