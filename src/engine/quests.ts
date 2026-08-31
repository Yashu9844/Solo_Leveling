import type {
  CoreQuestKey,
  EngineConfig,
  EngineDeps,
  ImplementationIntention,
  QuestState,
  QuestTemplate,
  SystemEvent,
} from './types';

// Fixed generation order — determinism (same inputs -> identical output,
// including ids drawn from deps.newId in this exact sequence) depends on
// iterating the six keys in a stable order, not object key enumeration.
const CORE_QUEST_KEYS: readonly CoreQuestKey[] = [
  'career',
  'dsa',
  'build',
  'training',
  'sleep',
  'attention',
];

const CORE_QUEST_TITLES: Record<CoreQuestKey, string> = {
  career: 'CAREER',
  dsa: 'DSA',
  build: 'BUILD',
  training: 'TRAINING',
  sleep: 'SLEEP',
  attention: 'ATTENTION',
};

// final/10-SLICE-1-PROMPT.md Step 1.2's criterion table, verbatim.
const CORE_QUEST_CRITERIA: Record<CoreQuestKey, Record<string, unknown>> = {
  career: { kind: 'applications_or_substitute', applications: 3, substituteMinutes: 25 },
  dsa: { kind: 'problems_or_minutes', problems: 1, minutes: 25 },
  build: { kind: 'minutes_with_mode', minutes: 45, modes: ['LEARN', 'SHIP'] },
  training: { kind: 'session_or_steps', steps: 8000 },
  sleep: { kind: 'wake_window', toleranceMinutes: 30 },
  attention: { kind: 'screen_time_under', minutes: 60 },
};

/**
 * Pure. Produces the six core quest templates for a new arc. XP and
 * category are always read from config.coreQuests, never hard-coded.
 * Deterministic: identical arcId/intentions/config, and an id generator
 * that yields the same sequence, produce a deep-equal result.
 *
 * Onboarding's step 5 (final/06 §5.1) only collects sentences for
 * career/dsa/training — build/sleep/attention simply carry no
 * implementation_intention. `intentions` is therefore a Partial map,
 * not a full Record<QuestKey,...> — see the Slice 1 report for why.
 */
export function generateCoreQuestTemplates(
  arcId: string,
  intentions: Partial<Record<CoreQuestKey, ImplementationIntention>>,
  config: EngineConfig,
  deps: EngineDeps
): QuestTemplate[] {
  return CORE_QUEST_KEYS.map((key) => {
    const { xp, category } = config.coreQuests[key];
    return {
      id: deps.newId(),
      arc_id: arcId,
      type: 'core',
      key,
      title: CORE_QUEST_TITLES[key],
      category,
      xp,
      criterion: CORE_QUEST_CRITERIA[key],
      implementation_intention: intentions[key],
      active_from: config.arc.startDate,
      active_to: null,
      locked_until_checkpoint: true,
    };
  });
}

/* eslint-disable @typescript-eslint/no-unused-vars -- stub: TODO Slice 2, unused params intentional */
/**
 * Pure. Generates the quest instance set for a given local_date from arc
 * config and prior history. Deterministic: identical inputs always produce
 * an identical quest set.
 * TODO: Slice 2
 */
export function generateQuests(
  localDate: string,
  history: SystemEvent[],
  config: EngineConfig
): QuestState[] {
  throw new Error('Not implemented — Slice 2');
}
/* eslint-enable @typescript-eslint/no-unused-vars */
