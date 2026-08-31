import { describe, it, expect } from 'vitest';
import { applyEvents } from '../../src/engine/reduce';
import { DEFAULT_CONFIG } from '../../src/engine/config';

describe('applyEvents — Slice 0 acceptance criterion', () => {
  it('applyEvents([]) returns a valid empty state', () => {
    const state = applyEvents([], DEFAULT_CONFIG);
    expect(state.player.total_xp).toBe(0);
    expect(state.player.level).toBe(1);
    expect(state.player.rank).toBe('E');
    expect(state.days).toEqual({});
    expect(state.quests).toEqual([]);
  });

  it('a non-empty log is not yet implemented (Slice 2)', () => {
    const event = {
      id: '01H0000000000000000000009',
      type: 'APP_OPENED' as const,
      occurred_at: '2026-09-01T03:00:00Z',
      local_date: '2026-09-01',
      arc_id: 'arc-1',
      payload: {},
      source: 'system' as const,
      idem_key: 'idem-z',
      schema_v: 1,
    };
    expect(() => applyEvents([event], DEFAULT_CONFIG)).toThrow('Not implemented');
  });
});
