import type { CoreQuestKey } from '../../engine/types';

// Presentation copy only — not domain logic. The actual criterion values
// live in engine/quests.ts's CORE_QUEST_CRITERIA; these strings describe
// them in the exact wording of final/01-quests-xp-level-rank.md §1 and
// final/06-ux-screens-design.md §5.2's row summaries.

/** Short row-summary text, e.g. "3 applications". final/06 §5.2. */
export const ROW_SUMMARY: Record<CoreQuestKey, string> = {
  career: '3 applications',
  dsa: '1 problem / 25m',
  build: '45 min',
  training: 'session or 8k steps',
  sleep: 'wake 08:00–09:00',
  attention: '≤ 60 min',
};

/** The completion criterion, in plain words, for the quest detail sheet. */
export const CRITERION_TEXT: Record<CoreQuestKey, string> = {
  career: '3 quality applications, or 25 minutes of substitute career work.',
  dsa: '1 problem logged, or 25 minutes.',
  build: '45+ minutes of AI/agentic work, tagged LEARN or SHIP.',
  training: 'A training session, or 8,000+ steps.',
  sleep: 'Wake within 30 minutes of 08:30 (08:00–09:00).',
  attention: '60 minutes or under, from Digital Wellbeing.',
};
