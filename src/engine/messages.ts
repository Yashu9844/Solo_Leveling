import type { PlayerState } from './types';

export interface MessageContext {
  local_date: string;
  recent_lapse: boolean;
}

export interface MessageLogEntry {
  key: string;
  shown_at: string;
}

/**
 * Pure. Selects the next System Message for the given context, respecting
 * cooldowns and never selecting a "challenging" tone message immediately
 * after a lapse. Prefers a System Message over a reflection when both are
 * available. Never uses the words "failed", "broken", "lost", or "ruined".
 * TODO: Slice 5
 */
export function selectMessage(
  context: MessageContext,
  state: PlayerState,
  log: MessageLogEntry[]
): string {
  throw new Error('Not implemented — Slice 5');
}
