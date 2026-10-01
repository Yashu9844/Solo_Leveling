import { describe, it, expect } from 'vitest';
import { selectTreasuryMessage } from '../../src/engine/treasuryVoice';
import { TREASURY_MESSAGES, type TreasuryCondition } from '../../src/engine/treasuryVoicePack';

describe('Treasury Voice - Unit Tests (P4)', () => {
  const conditions: TreasuryCondition[] = [
    'LOCKED',
    'UNREGISTERED',
    'PRESERVED',
    'ON_ALLOWANCE',
    'OVER_ALLOWANCE',
    'CRITICAL',
    'SURVIVED',
    'EXHAUSTED',
  ];

  it('provides at least one message per condition', () => {
    for (const cond of conditions) {
      const matches = TREASURY_MESSAGES.filter((m) => m.condition === cond);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it('selects a valid message deterministically for a date', () => {
    const msg1 = selectTreasuryMessage('PRESERVED', '2026-09-01');
    const msg2 = selectTreasuryMessage('PRESERVED', '2026-09-01');
    expect(msg1.id).toBe(msg2.id);
    expect(msg1.text).toBe(msg2.text);
    expect(msg1.condition).toBe('PRESERVED');
  });

  it('all message texts end with a full stop and are non-empty', () => {
    for (const msg of TREASURY_MESSAGES) {
      expect(msg.text.length).toBeGreaterThan(0);
      expect(msg.text.endsWith('.')).toBe(true);
    }
  });
});
