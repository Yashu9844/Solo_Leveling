import type { CoreQuestKey, QuestInstance, QuestTemplate } from '../../engine/types';

// Deterministic, not adaptive — Slice 11 owns the rules-based version
// (engine/rules.ts, still a stub). This is plain presentation logic, not
// domain logic, so it lives in ui/ rather than engine/.
const CORE_ORDER: readonly CoreQuestKey[] = [
  'career',
  'dsa',
  'build',
  'training',
  'sleep',
  'attention',
];

/**
 * "Today: {title} at {intention.time}." for the first incomplete core
 * quest in fixed order, or "Today: {title}." if it has no intention, or
 * "Six of six. Day closed." once all six are complete.
 */
export function priorityLine(templates: QuestTemplate[], instances: QuestInstance[]): string {
  const templateByKey = new Map(templates.map((t) => [t.key, t]));
  const instanceByTemplateId = new Map(instances.map((i) => [i.template_id, i]));

  for (const key of CORE_ORDER) {
    const template = templateByKey.get(key);
    if (!template) continue;
    const instance = instanceByTemplateId.get(template.id);
    if (instance && instance.state !== 'complete') {
      return template.implementation_intention
        ? `Today: ${template.title} at ${template.implementation_intention.time}.`
        : `Today: ${template.title}.`;
    }
  }

  return 'Six of six. Day closed.';
}
