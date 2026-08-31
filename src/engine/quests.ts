import type {
  CoreQuestKey,
  EngineConfig,
  EngineDeps,
  ImplementationIntention,
  QuestInstance,
  QuestTemplate,
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

/**
 * Pure. Produces the day's quest instances from the active core templates.
 * Deterministic: identical inputs (and an id generator yielding the same
 * sequence) produce a deep-equal result.
 *
 * Idempotent: `existing` is assumed already scoped to `localDate` by the
 * caller (see store/quests.ts) — any template with a matching instance in
 * `existing` returns that instance UNCHANGED, so a mid-day refresh can
 * never regenerate over (and silently reset) a completed quest. Only
 * missing templates get a fresh 'available' instance.
 *
 * Generates for `localDate` only — no backfill of past days. A day with
 * no instances is a day that was never opened, a distinction Slice 4's
 * streak logic depends on.
 */
export function generateQuests(
  localDate: string,
  templates: QuestTemplate[],
  existing: QuestInstance[],
  config: EngineConfig,
  deps: EngineDeps
): QuestInstance[] {
  // Not read this slice — core-only generation needs nothing from config.
  // Kept in the signature (symmetric with generateCoreQuestTemplates) for
  // weekly/revisit/adaptive generation in later slices.
  void config;

  const existingByTemplateId = new Map(existing.map((instance) => [instance.template_id, instance]));

  const activeCoreTemplates = templates.filter(
    (t) =>
      t.type === 'core' &&
      t.active_from <= localDate &&
      (t.active_to === null || localDate < t.active_to)
  );

  return activeCoreTemplates.map((template) => {
    const found = existingByTemplateId.get(template.id);
    if (found) {
      return found;
    }
    return {
      id: deps.newId(),
      template_id: template.id,
      local_date: localDate,
      state: 'available',
      progress: {},
      recovered: false,
    };
  });
}
