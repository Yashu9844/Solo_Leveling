// The Day-0 checkpoint row is created empty during onboarding
// (store/onboarding.ts) — self_efficacy: {}, automaticity: {}, enjoyment:
// {}. This module fills in self_efficacy from the carry-over instrument
// (final/11-SLICE-2-PROMPT.md Step 1; the spec gap was in docs/13, not
// final/, which is why Phase 0 didn't have it). automaticity and
// enjoyment stay {} — TODO: Slice 12, per that same Step 1.
import { db } from '../db/db';
import type { CheckpointRow } from '../db/schema';

export interface SelfEfficacy {
  items: [number, number, number, number, number, number];
  mean: number;
}

export async function getDayZeroCheckpoint(): Promise<CheckpointRow | undefined> {
  return db.checkpoint.where('day').equals(0).first();
}

export function selfEfficacyIsComplete(checkpoint: CheckpointRow | undefined): boolean {
  if (!checkpoint) return false;
  return Object.keys(checkpoint.self_efficacy).length > 0;
}

export async function saveSelfEfficacy(items: SelfEfficacy['items']): Promise<void> {
  const checkpoint = await getDayZeroCheckpoint();
  if (!checkpoint) {
    return;
  }
  const mean = items.reduce((sum, v) => sum + v, 0) / items.length;
  const self_efficacy: SelfEfficacy = { items, mean };
  await db.checkpoint.update(checkpoint.id, {
    self_efficacy: self_efficacy as unknown as Record<string, unknown>,
  });
}
