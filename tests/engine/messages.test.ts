import { describe, it, expect } from 'vitest';
import { selectMessage, type DayFacts, type MessageContext } from '../../src/engine/messages';

function day(local_date: string, core_completed: number, core_total = 6): DayFacts {
  return { local_date, core_completed, core_total };
}

describe('selectMessage', () => {
  it('falls back to the neutral P5 status when there is not enough history for P4', () => {
    const context: MessageContext = {
      today: day('2026-09-05', 4),
      trailingDays: [day('2026-09-03', 6), day('2026-09-04', 5)], // only 2 days
    };
    expect(selectMessage(context)).toBe('4 of 6 complete.');
  });

  it('P5 is always available even with zero history', () => {
    const context: MessageContext = { today: day('2026-09-05', 0), trailingDays: [] };
    expect(selectMessage(context)).toBe('0 of 6 complete.');
  });

  it('produces the P4 consistency fact once there are at least 7 trailing days', () => {
    const trailingDays = [
      day('2026-08-30', 6),
      day('2026-08-31', 6),
      day('2026-09-01', 3),
      day('2026-09-02', 6),
      day('2026-09-03', 6),
      day('2026-09-04', 4),
      day('2026-09-05', 6),
    ];
    const context: MessageContext = { today: day('2026-09-06', 6), trailingDays };
    // 5 of the 7 trailing days were fully complete (6 of 6).
    expect(selectMessage(context)).toBe('5 of the last 7 days were fully complete.');
  });

  it('P4 only counts the trailing 14 days, even with more history available', () => {
    const trailingDays = Array.from({ length: 20 }, (_, i) => day(`2026-08-${10 + i}`, 6, 6));
    const context: MessageContext = { today: day('2026-09-06', 6), trailingDays };
    expect(selectMessage(context)).toBe('14 of the last 14 days were fully complete.');
  });

  it('P4 prefers a real signal over P5 when both are available', () => {
    const trailingDays = Array.from({ length: 7 }, (_, i) => day(`2026-08-${20 + i}`, 6, 6));
    const context: MessageContext = { today: day('2026-08-27', 6), trailingDays };
    expect(selectMessage(context)).not.toBe('6 of 6 complete.');
  });
});
