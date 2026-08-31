// Projections are a rebuildable cache derived entirely from the event log.
// TODO: Slice 3+ (rollups arrive with XP; player_state with levels, etc.)

/** Rebuilds all projections from the event log. TODO: Slice 3 */
export async function rebuildProjections(): Promise<void> {
  throw new Error('Not implemented — Slice 3');
}

/** Dev integrity check: rebuild from scratch and diff against cached. TODO: Slice 3 */
export async function verifyIntegrity(): Promise<{ clean: boolean; diffs: string[] }> {
  throw new Error('Not implemented — Slice 3');
}
