import type { Attribute, EngineConfig } from './types';

export interface AttributeWindow {
  local_date: string;
  [metric: string]: number | string;
}

export interface AttributeResult {
  attribute: Attribute;
  value: number; // 0-100
  components: Record<string, number>;
}

/**
 * Pure. Computes all six derived attributes over a 28-day rolling window.
 * Every term is clamped to [0,1] before weighting; components are returned
 * alongside the total so the UI can render the formula breakdown.
 * TODO: Slice 10
 */
export function attributesFrom(
  window28: AttributeWindow[],
  config: EngineConfig
): AttributeResult[] {
  throw new Error('Not implemented — Slice 10');
}
