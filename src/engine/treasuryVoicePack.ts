// Static voice pack for Money Discipline (Treasury).
// Follows design/08-MONEY-DISCIPLINE-PLAN.md §13.
// Pure static data, no I/O.

export type TreasuryTone = 'restraint' | 'pressure' | 'verdict' | 'neutral';
export type TreasuryCondition =
  | 'LOCKED'
  | 'UNREGISTERED'
  | 'PRESERVED'
  | 'ON_ALLOWANCE'
  | 'OVER_ALLOWANCE'
  | 'CRITICAL'
  | 'SURVIVED'
  | 'EXHAUSTED';

export interface TreasuryMessage {
  id: string;
  text: string;
  condition: TreasuryCondition;
  tone: TreasuryTone;
}

export const TREASURY_MESSAGES: TreasuryMessage[] = [
  // LOCKED
  { id: 'locked-1', condition: 'LOCKED', tone: 'neutral', text: 'ACCOUNTING OPENS AT 22:00.' },
  { id: 'locked-2', condition: 'LOCKED', tone: 'neutral', text: 'TREASURY GATE LOCKED UNTIL EVENING.' },
  { id: 'locked-3', condition: 'LOCKED', tone: 'neutral', text: 'RESOURCE MONITORING STANDBY.' },

  // UNREGISTERED
  { id: 'unregistered-1', condition: 'UNREGISTERED', tone: 'pressure', text: 'THE DAY CLOSED UNACCOUNTED.' },
  { id: 'unregistered-2', condition: 'UNREGISTERED', tone: 'pressure', text: 'NO SPENDING ENTRY RECORDED.' },
  { id: 'unregistered-3', condition: 'UNREGISTERED', tone: 'pressure', text: 'TREASURY LEDGER UNVERIFIED.' },

  // PRESERVED
  { id: 'preserved-1', condition: 'PRESERVED', tone: 'restraint', text: 'RESOURCE PRESERVED.' },
  { id: 'preserved-2', condition: 'PRESERVED', tone: 'restraint', text: 'SPENDING KEPT BELOW ALLOWANCE.' },
  { id: 'preserved-3', condition: 'PRESERVED', tone: 'restraint', text: 'CAPITAL RETAINED FOR FUTURE CYCLES.' },

  // ON_ALLOWANCE
  { id: 'on-allowance-1', condition: 'ON_ALLOWANCE', tone: 'restraint', text: 'THE ALLOWANCE WAS MET EXACTLY.' },
  { id: 'on-allowance-2', condition: 'ON_ALLOWANCE', tone: 'restraint', text: 'EXACT BUDGET BALANCE MAINTAINED.' },

  // OVER_ALLOWANCE
  { id: 'over-allowance-1', condition: 'OVER_ALLOWANCE', tone: 'pressure', text: 'RESOURCE DEPLETION DETECTED.' },
  { id: 'over-allowance-2', condition: 'OVER_ALLOWANCE', tone: 'pressure', text: 'ALLOWANCE EXCEEDED. MARGIN REDUCED.' },
  { id: 'over-allowance-3', condition: 'OVER_ALLOWANCE', tone: 'pressure', text: 'FUTURE ALLOWANCE COMPROMISED.' },

  // CRITICAL
  { id: 'critical-1', condition: 'CRITICAL', tone: 'pressure', text: 'THE RESERVE IS AT ITS FLOOR.' },
  { id: 'critical-2', condition: 'CRITICAL', tone: 'pressure', text: 'TREASURY DEFICIT IMMINENT.' },
  { id: 'critical-3', condition: 'CRITICAL', tone: 'pressure', text: 'ZERO MARGIN REMAINING.' },

  // SURVIVED
  { id: 'survived-1', condition: 'SURVIVED', tone: 'verdict', text: 'THE TREASURY SURVIVED THE PERIOD.' },
  { id: 'survived-2', condition: 'SURVIVED', tone: 'verdict', text: 'TREASURY CYCLE CONCLUDED WITH SURPLUS.' },

  // EXHAUSTED
  { id: 'exhausted-1', condition: 'EXHAUSTED', tone: 'verdict', text: 'THE TREASURY DID NOT LAST THE PERIOD.' },
  { id: 'exhausted-2', condition: 'EXHAUSTED', tone: 'verdict', text: 'TREASURY CYCLE CONCLUDED IN DEFICIT.' },
];
