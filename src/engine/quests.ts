import type { EngineConfig, QuestState, SystemEvent } from './types';

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
