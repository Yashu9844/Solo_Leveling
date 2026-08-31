import { describe, it, expect } from 'vitest';
import { applyEvents } from '../../src/engine/reduce';
import { DEFAULT_CONFIG } from '../../src/engine/config';
import { arcDay } from '../../src/engine/time';
import type { ArcStartedPayload, SystemEvent } from '../../src/engine/types';

function arcStartedEvent(overrides: Partial<ArcStartedPayload> = {}, idemKey = 'arc-started:arc-1'): SystemEvent {
  const payload: ArcStartedPayload = {
    arcId: 'arc-1',
    startDate: '2026-09-01',
    endDate: '2026-12-29',
    timezone: 'Asia/Kolkata',
    dayBoundaryHour: 4,
    dayCloseHour: 3,
    mainQuestText: 'Ship a working agent and get an offer.',
    ...overrides,
  };
  return {
    id: '01H0000000000000000000010',
    type: 'ARC_STARTED',
    occurred_at: '2026-09-01T04:30:00Z',
    local_date: '2026-09-01',
    arc_id: 'arc-1',
    payload: payload as unknown as Record<string, unknown>,
    source: 'user',
    idem_key: idemKey,
    schema_v: 1,
  };
}

function otherEvent(type: SystemEvent['type'] = 'APP_OPENED'): SystemEvent {
  return {
    id: '01H0000000000000000000009',
    type,
    occurred_at: '2026-09-01T03:00:00Z',
    local_date: '2026-09-01',
    arc_id: 'arc-1',
    payload: {},
    source: 'system',
    idem_key: 'idem-z',
    schema_v: 1,
  };
}

describe('applyEvents — Slice 0 acceptance criterion', () => {
  it('applyEvents([]) returns a valid empty state', () => {
    const state = applyEvents([], DEFAULT_CONFIG);
    expect(state.player.total_xp).toBe(0);
    expect(state.player.level).toBe(1);
    expect(state.player.rank).toBe('E');
    expect(state.days).toEqual({});
    expect(state.quests).toEqual([]);
    expect(state.arc).toBeNull();
  });
});

describe('applyEvents — ARC_STARTED (Slice 1)', () => {
  it('applyEvents([ARC_STARTED]) yields state with the arc present', () => {
    const state = applyEvents([arcStartedEvent()], DEFAULT_CONFIG);
    expect(state.arc).not.toBeNull();
    expect(state.arc?.id).toBe('arc-1');
    expect(state.arc?.start_date).toBe('2026-09-01');
    expect(state.arc?.end_date).toBe('2026-12-29');
    expect(state.arc?.status).toBe('active');
  });

  it('arcDay computed from the resulting arc: startDate -> 1, endDate -> 120', () => {
    const state = applyEvents([arcStartedEvent()], DEFAULT_CONFIG);
    const arc = state.arc!;
    expect(arcDay(`${arc.start_date}T10:00:00Z`, arc.start_date, arc.timezone)).toBe(1);
    expect(arcDay(`${arc.end_date}T10:00:00Z`, arc.start_date, arc.timezone)).toBe(120);
  });

  it('replaying the same log twice is deep-equal (determinism)', () => {
    const log = [arcStartedEvent()];
    expect(applyEvents(log, DEFAULT_CONFIG)).toEqual(applyEvents(log, DEFAULT_CONFIG));
  });

  it('duplicate ARC_STARTED with the same idem_key is a no-op', () => {
    const event = arcStartedEvent();
    const stateOnce = applyEvents([event], DEFAULT_CONFIG);
    const stateTwice = applyEvents([event, { ...event }], DEFAULT_CONFIG);
    expect(stateTwice).toEqual(stateOnce);
  });

  it('an unhandled event type throws — no silent default case', () => {
    expect(() => applyEvents([otherEvent('APP_OPENED')], DEFAULT_CONFIG)).toThrow('Not implemented');
  });
});
