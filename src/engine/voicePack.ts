/**
 * The voice pack.
 *
 * Static content for engine/systemVoice.ts. Every line is original —
 * written for this app, quoting nothing — and every line obeys the same
 * four rules (design/04 §25):
 *
 *   1. The System reports a condition. It does not coach, praise or beg.
 *   2. One clause, or two short ones. It stops as soon as it has said the
 *      thing.
 *   3. It never asserts a fact the engine has not granted — nothing here
 *      claims a clear, a level or a streak the state does not carry.
 *   4. It is never cruel. Strict is the register; shame is not. A missed
 *      day is reported, never scored.
 *
 * Capitals are the voice, not shouting: this is a readout. `times_shown`
 * and `last_shown_date` live in db.system_message_state, never here —
 * this array is immutable content, the same arrangement
 * engine/reflections.ts uses for its own library.
 */
import type { SystemMessage } from './systemVoice';

const m = (
  id: string,
  text: string,
  tier: SystemMessage['tier'],
  label: string,
  tone: SystemMessage['tone'],
  extra: Partial<SystemMessage> = {}
): SystemMessage => ({ id, text, tier, label, tone, ...extra });

/** Shorthands for the PROGRESS matrix, which is most of the library. */
const P = 'PROGRESS' as const;

export const VOICE_PACK: SystemMessage[] = [
  /* ══════════════════════════════════════════════════════════════════
   * EXCEPTION — the day cannot be acted on, or the arc is not running.
   * Never an urgency line: there is nothing the Player could do with it.
   * ════════════════════════════════════════════════════════════════ */
  m('exception-closed-001', 'THE DAY IS SEALED. THE NEXT BEGINS AT 04:00.', 'EXCEPTION', 'DAY SEALED', 'closing', { phases: ['CLOSED'], cooldownDays: 3 }),
  m('exception-closed-002', 'LOGGING IS CLOSED. THE RECORD FOR TODAY IS FINAL.', 'EXCEPTION', 'DAY SEALED', 'closing', { phases: ['CLOSED'], cooldownDays: 3 }),
  m('exception-closed-003', 'THIS DAY HAS BEEN FILED. REST IS PART OF THE PROTOCOL.', 'EXCEPTION', 'DAY SEALED', 'restraint', { phases: ['CLOSED'], cooldownDays: 3 }),
  m('exception-closed-004', 'THE WINDOW HAS SHUT. NOTHING FURTHER IS REQUIRED TONIGHT.', 'EXCEPTION', 'DAY SEALED', 'restraint', { phases: ['CLOSED'], cooldownDays: 3 }),

  m('exception-before-001', 'STANDBY. THE ARC HAS NOT BEGUN.', 'EXCEPTION', 'STANDBY', 'neutral', { when: (c) => c.arcState === 'before', cooldownDays: 2 }),
  m('exception-before-002', 'INITIALISATION COMPLETE. THE FIRST DAY IS PENDING.', 'EXCEPTION', 'STANDBY', 'neutral', { when: (c) => c.arcState === 'before', cooldownDays: 2 }),

  m('exception-after-001', 'THE ARC IS CONCLUDED. THE RECORD IS CLOSED.', 'EXCEPTION', 'ARC CONCLUDED', 'verdict', { when: (c) => c.arcState === 'after', cooldownDays: 2 }),
  m('exception-after-002', 'ALL DAYS ARE ACCOUNTED FOR. READ WHAT THEY ADD UP TO.', 'EXCEPTION', 'ARC CONCLUDED', 'verdict', { when: (c) => c.arcState === 'after', cooldownDays: 2 }),
  m('exception-after-003', 'THE ARC HAS ENDED. WHAT IT BUILT DOES NOT.', 'EXCEPTION', 'ARC CONCLUDED', 'verdict', { when: (c) => c.arcState === 'after', cooldownDays: 2 }),

  /* ══════════════════════════════════════════════════════════════════
   * EVENT — something irreversible was recorded today. The Moment has
   * already played; this is the report that outlives it.
   * ════════════════════════════════════════════════════════════════ */
  m('event-level-001', 'LEVEL THRESHOLD BREACHED.', 'EVENT', 'THRESHOLD BREACHED', 'verdict', { when: (c) => c.leveledUpToday, cooldownDays: 3 }),
  m('event-level-002', 'A NEW LEVEL HAS BEEN REGISTERED TODAY.', 'EVENT', 'THRESHOLD BREACHED', 'verdict', { when: (c) => c.leveledUpToday, cooldownDays: 3 }),
  m('event-level-003', 'THE CEILING MOVED. IT WAS MOVED BY WORK.', 'EVENT', 'THRESHOLD BREACHED', 'verdict', { when: (c) => c.leveledUpToday, cooldownDays: 3 }),
  m('event-level-004', 'LEVEL UPDATED. THE REQUIREMENT SCALES WITH YOU.', 'EVENT', 'THRESHOLD BREACHED', 'verdict', { when: (c) => c.leveledUpToday, cooldownDays: 3 }),

  m('event-boss-001', 'THREAT ELIMINATED. THE RECORD STANDS.', 'EVENT', 'BOSS CLEARED', 'threat', { when: (c) => c.eventsToday.includes('BOSS_CLEARED'), cooldownDays: 1 }),
  m('event-boss-002', 'THE OBSTACLE HAS BEEN CLEARED. IT DOES NOT RETURN.', 'EVENT', 'BOSS CLEARED', 'threat', { when: (c) => c.eventsToday.includes('BOSS_CLEARED'), cooldownDays: 1 }),
  m('event-boss-003', 'BOSS CONDITION SATISFIED. THIS ONE COUNTS AS EVIDENCE.', 'EVENT', 'BOSS CLEARED', 'threat', { when: (c) => c.eventsToday.includes('BOSS_CLEARED'), cooldownDays: 1 }),

  m('event-checkpoint-001', 'CHECKPOINT SEALED. THE EVIDENCE HAS BEEN READ.', 'EVENT', 'CHECKPOINT SEALED', 'verdict', { when: (c) => c.eventsToday.includes('CHECKPOINT_SEALED'), cooldownDays: 1 }),
  m('event-checkpoint-002', 'EVALUATION COMPLETE. THE RESULT IS ON THE RECORD.', 'EVENT', 'CHECKPOINT SEALED', 'verdict', { when: (c) => c.eventsToday.includes('CHECKPOINT_SEALED'), cooldownDays: 1 }),
  m('event-checkpoint-003', 'THE MEASUREMENT IS TAKEN. WHAT FOLLOWS IS THE NEXT SEGMENT.', 'EVENT', 'CHECKPOINT SEALED', 'verdict', { when: (c) => c.eventsToday.includes('CHECKPOINT_SEALED'), cooldownDays: 1 }),

  m('event-weekly-001', 'WEEKLY CONDITION SATISFIED.', 'EVENT', 'WEEKLY CLEARED', 'momentum', { when: (c) => c.eventsToday.includes('WEEKLY_QUEST_COMPLETED'), cooldownDays: 2 }),
  m('event-weekly-002', 'THE WEEK HAS PRODUCED SOMETHING. IT IS LOGGED.', 'EVENT', 'WEEKLY CLEARED', 'momentum', { when: (c) => c.eventsToday.includes('WEEKLY_QUEST_COMPLETED'), cooldownDays: 2 }),
  m('event-weekly-003', 'A LARGER REQUIREMENT HAS BEEN MET THIS WEEK.', 'EVENT', 'WEEKLY CLEARED', 'momentum', { when: (c) => c.eventsToday.includes('WEEKLY_QUEST_COMPLETED'), cooldownDays: 2 }),

  /* ══════════════════════════════════════════════════════════════════
   * RECOVERY — reduced mode, a recoverable day, or a return after an
   * absence. Never "push harder". The floor is the point.
   * ════════════════════════════════════════════════════════════════ */
  m('recovery-reduced-001', 'CONTINUITY PROTOCOL ACTIVE. THE FLOOR IS ENOUGH.', 'RECOVERY', 'REDUCED MODE', 'restraint', { when: (c) => c.reducedMode, cooldownDays: 4 }),
  m('recovery-reduced-002', 'REDUCED MODE ENGAGED. THE ARC CONTINUES AT A LOWER LOAD.', 'RECOVERY', 'REDUCED MODE', 'restraint', { when: (c) => c.reducedMode, cooldownDays: 4 }),
  m('recovery-reduced-003', 'THE REQUIREMENT HAS BEEN LOWERED ON PURPOSE. MEET IT.', 'RECOVERY', 'REDUCED MODE', 'restraint', { when: (c) => c.reducedMode, cooldownDays: 4 }),
  m('recovery-reduced-004', 'THE MINIMUM IS THE TARGET TODAY. NOTHING ELSE IS OWED.', 'RECOVERY', 'REDUCED MODE', 'restraint', { when: (c) => c.reducedMode, cooldownDays: 4 }),
  m('recovery-reduced-005', 'RECOVERY IS PART OF PROGRESSION, NOT AN INTERRUPTION OF IT.', 'RECOVERY', 'REDUCED MODE', 'restraint', { when: (c) => c.reducedMode, cooldownDays: 4 }),

  m('recovery-available-001', 'A MINIMUM CONDITION REMAINS AVAILABLE FOR YESTERDAY.', 'RECOVERY', 'RECOVERY AVAILABLE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),
  m('recovery-available-002', 'YESTERDAY IS INCOMPLETE. A PARTIAL CLAIM IS STILL OPEN.', 'RECOVERY', 'RECOVERY AVAILABLE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),
  m('recovery-available-003', 'THE PREVIOUS DAY IS CLOSED. IT HAS NO CLAIM ON THIS ONE.', 'RECOVERY', 'POST-FAILURE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),
  m('recovery-available-004', 'ONE MISSED DAY IS A DATA POINT. THE SEQUENCE DECIDES THE REST.', 'RECOVERY', 'POST-FAILURE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),
  m('recovery-available-005', 'THE GAP IS RECORDED. IT IS NOT A VERDICT.', 'RECOVERY', 'POST-FAILURE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),
  m('recovery-available-006', 'A LAPSE WAS REGISTERED. THE PROTOCOL ACCOUNTED FOR IT.', 'RECOVERY', 'POST-FAILURE', 'restraint', { when: (c) => c.recoveryAvailable, cooldownDays: 4 }),

  m('recovery-return-001', 'THE SYSTEM HELD ITS RECORD. RESUME.', 'RECOVERY', 'RESUMED', 'restraint', { when: (c) => (c.daysSinceLastOpen ?? 0) >= 2, cooldownDays: 3 }),
  m('recovery-return-002', 'ABSENCE NOTED. NOTHING WAS LOST THAT WAS ALREADY EARNED.', 'RECOVERY', 'RESUMED', 'restraint', { when: (c) => (c.daysSinceLastOpen ?? 0) >= 2, cooldownDays: 3 }),
  m('recovery-return-003', 'THE INTERVAL IS CLOSED. THE ARC IS STILL RUNNING.', 'RECOVERY', 'RESUMED', 'restraint', { when: (c) => (c.daysSinceLastOpen ?? 0) >= 2, cooldownDays: 3 }),
  m('recovery-return-004', 'YOU WERE AWAY. THE REQUIREMENT DID NOT CHANGE.', 'RECOVERY', 'RESUMED', 'neutral', { when: (c) => (c.daysSinceLastOpen ?? 0) >= 2, cooldownDays: 3 }),
  m('recovery-return-005', 'RE-ENTRY REGISTERED. BEGIN FROM WHERE THE RECORD STOPPED.', 'RECOVERY', 'RESUMED', 'neutral', { when: (c) => (c.daysSinceLastOpen ?? 0) >= 2, cooldownDays: 3 }),

  /* ══════════════════════════════════════════════════════════════════
   * CLEARED — every core quest complete. The clear is stated, not
   * celebrated; the ceremony already happened in the Moment.
   * ════════════════════════════════════════════════════════════════ */
  m('cleared-001', 'DAILY CONDITIONS SATISFIED.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-002', 'DAY CLEARED. THE RECORD IS COMPLETE.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-003', 'ALL SIX CONDITIONS ARE MET. NOTHING REMAINS OUTSTANDING.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-004', 'THE DAY HAS BEEN CLEARED IN FULL.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-005', 'REQUIREMENT MET. THE REST OF THE DAY IS YOURS.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-006', 'STATUS UPDATED: CLEARED.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-007', 'EVIDENCE ACCUMULATES. TODAY ADDED TO IT.', 'CLEARED', 'EVIDENCE', 'verdict', { bands: ['CLEARED'] }),
  m('cleared-008', 'THE FULL CONDITION WAS MET WHILE THE DAY WAS STILL YOUNG.', 'CLEARED', 'CLEARED EARLY', 'verdict', { bands: ['CLEARED'], phases: ['MORNING', 'MIDDAY'], weight: 2 }),
  m('cleared-009', 'EARLY CLEAR REGISTERED. THIS IS THE RARE ONE.', 'CLEARED', 'CLEARED EARLY', 'verdict', { bands: ['CLEARED'], phases: ['MORNING', 'MIDDAY'], weight: 2 }),
  m('cleared-010', 'CONTINUITY PRESERVED.', 'CLEARED', 'CONTINUITY', 'verdict', { bands: ['CLEARED'], minStreak: 3 }),
  m('cleared-011', 'THE SEQUENCE HOLDS. ANOTHER DAY JOINS IT.', 'CLEARED', 'CONTINUITY', 'verdict', { bands: ['CLEARED'], minStreak: 3, weight: 2 }),
  m('cleared-012', 'THE CHAIN IS UNBROKEN. THAT IS THE WHOLE MECHANISM.', 'CLEARED', 'CONTINUITY', 'verdict', { bands: ['CLEARED'], minStreak: 7, weight: 2 }),
  m('cleared-013', 'CLEARED, AGAIN. REPETITION IS WHAT THE RECORD MEASURES.', 'CLEARED', 'CONTINUITY', 'verdict', { bands: ['CLEARED'], minStreak: 7, weight: 2 }),
  m('cleared-014', 'THE DAY CLOSES IN CREDIT.', 'CLEARED', 'DAY CLEARED', 'verdict', { bands: ['CLEARED'], phases: ['EVENING', 'NIGHT'] }),

  /* ══════════════════════════════════════════════════════════════════
   * MILESTONE — proximity. Suppressed at ZERO by tierFor(): proximity is
   * only news to someone already moving.
   * ════════════════════════════════════════════════════════════════ */
  m('milestone-level-001', 'THE NEXT THRESHOLD IS WITHIN REACH.', 'MILESTONE', 'THRESHOLD', 'momentum', { when: (c) => c.xpForNext - c.xpIntoLevel <= 60, cooldownDays: 4 }),
  m('milestone-level-002', 'THE LEVEL BOUNDARY IS CLOSE. ONE MORE CONDITION MAY CROSS IT.', 'MILESTONE', 'THRESHOLD', 'momentum', { when: (c) => c.xpForNext - c.xpIntoLevel <= 60, cooldownDays: 4 }),
  m('milestone-level-003', 'YOU ARE INSIDE THE MARGIN OF THE NEXT LEVEL.', 'MILESTONE', 'THRESHOLD', 'momentum', { when: (c) => c.xpForNext - c.xpIntoLevel <= 60, cooldownDays: 4 }),
  m('milestone-level-004', 'THE THRESHOLD IS NEAR. IT WILL NOT CROSS ITSELF.', 'MILESTONE', 'THRESHOLD', 'pressure', { when: (c) => c.xpForNext - c.xpIntoLevel <= 30, cooldownDays: 4, weight: 2 }),

  m('milestone-checkpoint-001', 'EVALUATION APPROACHES. EVIDENCE IS WHAT IS MEASURED.', 'MILESTONE', 'CHECKPOINT NEAR', 'pressure', { when: (c) => c.daysToCheckpoint !== null && c.daysToCheckpoint <= 2, cooldownDays: 3 }),
  m('milestone-checkpoint-002', 'A CHECKPOINT IS IMMINENT. THE GATES READ THE RECORD, NOT THE INTENT.', 'MILESTONE', 'CHECKPOINT NEAR', 'pressure', { when: (c) => c.daysToCheckpoint !== null && c.daysToCheckpoint <= 2, cooldownDays: 3 }),
  m('milestone-checkpoint-003', 'MEASUREMENT IS SCHEDULED. WHAT IS LOGGED BY THEN IS WHAT COUNTS.', 'MILESTONE', 'CHECKPOINT NEAR', 'pressure', { when: (c) => c.daysToCheckpoint !== null && c.daysToCheckpoint <= 2, cooldownDays: 3 }),

  m('milestone-streak-3-001', 'THREE CONSECUTIVE CLEARS. A PATTERN IS FORMING.', 'MILESTONE', 'STREAK 03', 'momentum', { when: (c) => c.streak === 3, cooldownDays: 5 }),
  m('milestone-streak-3-002', 'THREE IN SEQUENCE. THE MECHANISM IS ENGAGED.', 'MILESTONE', 'STREAK 03', 'momentum', { when: (c) => c.streak === 3, cooldownDays: 5 }),
  m('milestone-streak-7-001', 'SEVEN CONSECUTIVE CLEARS. THE SEQUENCE IS NO LONGER ACCIDENTAL.', 'MILESTONE', 'STREAK 07', 'momentum', { when: (c) => c.streak === 7, cooldownDays: 5 }),
  m('milestone-streak-7-002', 'A FULL WEEK HELD. THE RECORD REFLECTS IT.', 'MILESTONE', 'STREAK 07', 'momentum', { when: (c) => c.streak === 7, cooldownDays: 5 }),
  m('milestone-streak-14-001', 'FOURTEEN IN SEQUENCE. THIS IS NO LONGER AN ATTEMPT.', 'MILESTONE', 'STREAK 14', 'verdict', { when: (c) => c.streak === 14, cooldownDays: 5 }),
  m('milestone-streak-14-002', 'TWO UNBROKEN WEEKS. PROVE IT AGAIN TOMORROW.', 'MILESTONE', 'STREAK 14', 'verdict', { when: (c) => c.streak === 14, cooldownDays: 5 }),
  m('milestone-streak-30-001', 'THIRTY CONSECUTIVE CLEARS. THIS IS BECOMING WHO YOU ARE.', 'MILESTONE', 'STREAK 30', 'verdict', { when: (c) => c.streak === 30, cooldownDays: 5 }),
  m('milestone-streak-30-002', 'A MONTH WITHOUT A BREAK. THE SYSTEM HAS NOTHING TO ADD.', 'MILESTONE', 'STREAK 30', 'verdict', { when: (c) => c.streak === 30, cooldownDays: 5 }),

  m('milestone-midarc-001', 'THE ARC IS PAST ITS MIDPOINT. THE SECOND HALF IS SHORTER THAN IT LOOKS.', 'MILESTONE', 'MIDPOINT', 'neutral', { minArcDay: 60, when: (c) => c.arcDay === 60 || c.arcDay === 61, cooldownDays: 6 }),
  m('milestone-final-001', 'THE FINAL SEGMENT HAS BEGUN. EVERY DAY NOW CARRIES MORE WEIGHT.', 'MILESTONE', 'FINAL SEGMENT', 'pressure', { minArcDay: 113, cooldownDays: 3 }),
  m('milestone-final-002', 'THE ARC ENDS SOON. WHAT IS UNLOGGED WILL STAY UNLOGGED.', 'MILESTONE', 'FINAL SEGMENT', 'pressure', { minArcDay: 113, cooldownDays: 3 }),

  /* ══════════════════════════════════════════════════════════════════
   * PROGRESS — the everyday matrix. Phase decides the pressure, band
   * decides the fact.
   * ════════════════════════════════════════════════════════════════ */

  /* ── MORNING · ZERO — opportunity, never blame ───────────────────── */
  m('morning-zero-001', 'A NEW DAY HAS BEEN REGISTERED.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-002', 'THE RECORD FOR TODAY IS EMPTY. THAT IS NORMAL AT THIS HOUR.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-003', 'THE DAY HAS JUST BEGUN. NOTHING IS DECIDED YET.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-004', 'YOUR NEXT ASCENSION BEGINS NOW.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-005', 'SIX CONDITIONS ARE OPEN. THE FIRST ONE IS THE ONLY ONE THAT MATTERS.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-006', 'THE DAY IS UNWRITTEN. BEGIN.', P, 'DAY OPEN', 'awakening', { phases: ['MORNING'], bands: ['ZERO'] }),
  m('morning-zero-007', 'STATUS: DAY OPEN. NO ACTION REGISTERED.', P, 'DAY OPEN', 'neutral', { phases: ['MORNING'], bands: ['ZERO'] }),

  /* ── MORNING · moving ───────────────────────────────────────────── */
  m('morning-started-001', 'THE FIRST STEP HAS ALREADY BEEN TAKEN.', P, 'CONTINUITY DETECTED', 'momentum', { phases: ['MORNING'], bands: ['STARTED'] }),
  m('morning-started-002', 'CONTINUITY DETECTED BEFORE MIDDAY.', P, 'CONTINUITY DETECTED', 'momentum', { phases: ['MORNING'], bands: ['STARTED'] }),
  m('morning-started-003', 'THE DAY IS ALREADY MOVING.', P, 'CONTINUITY DETECTED', 'momentum', { phases: ['MORNING'], bands: ['STARTED', 'BUILDING'] }),
  m('morning-started-004', 'PROGRESS REGISTERED AT AN EARLY HOUR. THAT IS THE ADVANTAGE.', P, 'CONTINUITY DETECTED', 'momentum', { phases: ['MORNING'], bands: ['STARTED', 'BUILDING'] }),
  m('morning-building-001', 'THE MORNING IS PRODUCING. HOLD THE RATE.', P, 'MOMENTUM', 'momentum', { phases: ['MORNING'], bands: ['BUILDING', 'HALFWAY'] }),
  m('morning-building-002', 'A THIRD OF THE DAY, AND THE RECORD IS ALREADY MOVING.', P, 'MOMENTUM', 'momentum', { phases: ['MORNING'], bands: ['BUILDING', 'HALFWAY'] }),
  m('morning-ahead-001', 'YOU ARE AHEAD OF THE CLOCK.', P, 'AHEAD OF SCHEDULE', 'momentum', { phases: ['MORNING'], bands: ['HALFWAY', 'ADVANCING', 'NEAR_CLEAR'], weight: 2 }),
  m('morning-ahead-002', 'THE REQUIREMENT IS FALLING FASTER THAN THE DAY IS.', P, 'AHEAD OF SCHEDULE', 'momentum', { phases: ['MORNING'], bands: ['ADVANCING', 'NEAR_CLEAR'] }),
  m('morning-ahead-003', 'THIS IS AN UNUSUAL RATE. IT IS ALSO A REPEATABLE ONE.', P, 'AHEAD OF SCHEDULE', 'momentum', { phases: ['MORNING'], bands: ['HALFWAY', 'ADVANCING', 'NEAR_CLEAR'] }),

  /* ── MIDDAY · ZERO — the first real pressure of the day ──────────── */
  m('midday-zero-001', 'TIME HAS ADVANCED. YOUR STATUS HAS NOT.', P, 'NO ACTION', 'pressure', { phases: ['MIDDAY'], bands: ['ZERO'] }),
  m('midday-zero-002', 'NO ACTION HAS BEEN REGISTERED TODAY.', P, 'NO ACTION', 'pressure', { phases: ['MIDDAY'], bands: ['ZERO'] }),
  m('midday-zero-003', 'THE MORNING IS SPENT. THE RECORD IS STILL EMPTY.', P, 'NO ACTION', 'pressure', { phases: ['MIDDAY'], bands: ['ZERO'] }),
  m('midday-zero-004', 'THE SYSTEM IS WAITING.', P, 'NO ACTION', 'pressure', { phases: ['MIDDAY'], bands: ['ZERO'] }),
  m('midday-zero-005', 'STATUS WILL NOT CHANGE WITHOUT ACTION.', P, 'NO ACTION', 'pressure', { phases: ['MIDDAY', 'AFTERNOON'], bands: ['ZERO'] }),

  /* ── MIDDAY · moving ────────────────────────────────────────────── */
  m('midday-started-001', 'MOVEMENT REGISTERED. THE RATE IS BELOW REQUIREMENT.', P, 'UNDER RATE', 'neutral', { phases: ['MIDDAY'], bands: ['STARTED'] }),
  m('midday-started-002', 'ONE CONDITION IS CLEARED. FIVE ARE NOT.', P, 'UNDER RATE', 'neutral', { phases: ['MIDDAY'], bands: ['STARTED'] }),
  m('midday-started-003', 'THE DAY IS OPEN AND THE FIRST ENTRY EXISTS. CONTINUE.', P, 'UNDER RATE', 'momentum', { phases: ['MIDDAY'], bands: ['STARTED'] }),
  m('midday-building-001', 'PROGRESS IS ACCUMULATING.', P, 'MOMENTUM', 'momentum', { phases: ['MIDDAY'], bands: ['BUILDING'] }),
  m('midday-building-002', 'THE RECORD IS FILLING. THE DAY IS NOT HALF SPENT.', P, 'MOMENTUM', 'momentum', { phases: ['MIDDAY'], bands: ['BUILDING'] }),
  m('midday-building-003', 'THE RATE IS ADEQUATE. DO NOT DROP IT.', P, 'MOMENTUM', 'momentum', { phases: ['MIDDAY'], bands: ['BUILDING', 'HALFWAY'] }),
  m('midday-half-001', 'HALF THE REQUIREMENT IS CLEARED. THE REMAINDER IS YOURS.', P, 'HALF CLEARED', 'momentum', { phases: ['MIDDAY', 'AFTERNOON'], bands: ['HALFWAY'] }),
  m('midday-half-002', 'THE MIDPOINT IS PASSED BEFORE THE DAY IS.', P, 'HALF CLEARED', 'momentum', { phases: ['MIDDAY'], bands: ['HALFWAY', 'ADVANCING'] }),
  m('midday-advancing-001', 'MOMENTUM IS HOLDING.', P, 'MOMENTUM', 'momentum', { phases: ['MIDDAY', 'AFTERNOON'], bands: ['ADVANCING'] }),
  m('midday-advancing-002', 'THE REMAINING LOAD IS SMALL AND THE DAY IS LONG.', P, 'MOMENTUM', 'momentum', { phases: ['MIDDAY'], bands: ['ADVANCING', 'NEAR_CLEAR'] }),
  m('midday-near-001', 'THE FINAL CONDITIONS ARE ALL THAT REMAIN.', P, 'NEAR CLEAR', 'momentum', { phases: ['MIDDAY'], bands: ['NEAR_CLEAR'] }),
  m('midday-near-002', 'CLEARANCE IS WITHIN REACH WELL BEFORE THE CLOSE.', P, 'NEAR CLEAR', 'momentum', { phases: ['MIDDAY'], bands: ['NEAR_CLEAR'] }),

  /* ── AFTERNOON · ZERO — urgency, still not cruelty ───────────────── */
  m('afternoon-zero-001', 'HALF THE DAY IS SPENT. NOTHING IS RECORDED.', P, 'STATUS UNCHANGED', 'pressure', { phases: ['AFTERNOON'], bands: ['ZERO'] }),
  m('afternoon-zero-002', 'HALF THE DAY HAS PASSED. YOUR STATUS REMAINS UNCHANGED.', P, 'STATUS UNCHANGED', 'pressure', { phases: ['AFTERNOON'], bands: ['ZERO'] }),
  m('afternoon-zero-003', 'THE HOURS ARE BEING SPENT EITHER WAY.', P, 'STATUS UNCHANGED', 'pressure', { phases: ['AFTERNOON'], bands: ['ZERO'] }),
  m('afternoon-zero-004', 'NO ENTRY EXISTS FOR TODAY. ONE ACTION CHANGES THAT.', P, 'STATUS UNCHANGED', 'pressure', { phases: ['AFTERNOON'], bands: ['ZERO'] }),
  m('afternoon-zero-005', 'THE DAY IS MORE THAN HALF GONE AND THE LEDGER IS BLANK.', P, 'STATUS UNCHANGED', 'pressure', { phases: ['AFTERNOON'], bands: ['ZERO'] }),

  /* ── AFTERNOON · moving ─────────────────────────────────────────── */
  m('afternoon-started-001', 'ONE ENTRY AGAINST SEVERAL HOURS. THE RATE MUST RISE.', P, 'BEHIND RATE', 'pressure', { phases: ['AFTERNOON'], bands: ['STARTED'] }),
  m('afternoon-started-002', 'PROGRESS EXISTS BUT IS BEHIND THE CLOCK.', P, 'BEHIND RATE', 'pressure', { phases: ['AFTERNOON'], bands: ['STARTED', 'BUILDING'] }),
  m('afternoon-started-003', 'THE DAY IS TURNING. THE RECORD IS THIN.', P, 'BEHIND RATE', 'pressure', { phases: ['AFTERNOON'], bands: ['STARTED'] }),
  m('afternoon-building-001', 'PART OF THE REQUIREMENT IS CLEARED. THE LARGER PART IS NOT.', P, 'BEHIND RATE', 'neutral', { phases: ['AFTERNOON'], bands: ['BUILDING'] }),
  m('afternoon-building-002', 'THE AFTERNOON IS THE DECIDING SEGMENT.', P, 'BEHIND RATE', 'pressure', { phases: ['AFTERNOON'], bands: ['BUILDING'] }),
  m('afternoon-half-001', 'HALF CLEARED, HALF REMAINING, AND HOURS TO WORK WITH.', P, 'HALF CLEARED', 'momentum', { phases: ['AFTERNOON'], bands: ['HALFWAY'] }),
  m('afternoon-half-002', 'THE BALANCE IS EVEN. THE NEXT HOUR DECIDES WHICH WAY IT FALLS.', P, 'HALF CLEARED', 'momentum', { phases: ['AFTERNOON'], bands: ['HALFWAY'] }),
  m('afternoon-advancing-001', 'THE RUN IS INTACT. FINISH IT.', P, 'MOMENTUM', 'momentum', { phases: ['AFTERNOON'], bands: ['ADVANCING'] }),
  m('afternoon-advancing-002', 'MOST OF THE REQUIREMENT IS BEHIND YOU.', P, 'MOMENTUM', 'momentum', { phases: ['AFTERNOON'], bands: ['ADVANCING', 'NEAR_CLEAR'] }),
  m('afternoon-near-001', 'THE FINAL CONDITION REMAINS.', P, 'NEAR CLEAR', 'momentum', { phases: ['AFTERNOON'], bands: ['NEAR_CLEAR'] }),
  m('afternoon-near-002', 'THE DAY IS NEARLY CLEARED. DO NOT LEAVE IT AT NEARLY.', P, 'NEAR CLEAR', 'pressure', { phases: ['AFTERNOON'], bands: ['NEAR_CLEAR'] }),

  /* ── EVENING · ZERO / LOW — the recovery push ───────────────────── */
  m('evening-zero-001', 'NO ACTION HAS BEEN REGISTERED. THE DAY IS NOT YET SEALED.', P, 'DAY OPEN', 'pressure', { phases: ['EVENING'], bands: ['ZERO'] }),
  m('evening-zero-002', 'THE RECORD IS EMPTY AND THE WINDOW IS CLOSING.', P, 'DAY OPEN', 'pressure', { phases: ['EVENING'], bands: ['ZERO'] }),
  m('evening-zero-003', 'THERE IS STILL TIME TO ALTER TODAY’S RESULT.', P, 'DAY OPEN', 'pressure', { phases: ['EVENING'], bands: ['ZERO', 'STARTED'] }),
  m('evening-zero-004', 'A MINIMUM DAY IS STILL A DAY ON THE RECORD.', P, 'DAY OPEN', 'restraint', { phases: ['EVENING'], bands: ['ZERO', 'STARTED'] }),
  m('evening-started-001', 'THE DAY IS NOT YET SEALED.', P, 'DAY OPEN', 'pressure', { phases: ['EVENING'], bands: ['STARTED'] }),
  m('evening-started-002', 'ONE ENTRY STANDS. THE REST OF THE DAY IS STILL WRITABLE.', P, 'DAY OPEN', 'pressure', { phases: ['EVENING'], bands: ['STARTED'] }),
  m('evening-building-001', 'PART OF THE REQUIREMENT IS SECURED. THE WINDOW IS NARROWING.', P, 'CLOSING', 'closing', { phases: ['EVENING'], bands: ['BUILDING'] }),
  m('evening-building-002', 'WHAT IS LOGGED NOW WILL STILL BE LOGGED TOMORROW.', P, 'CLOSING', 'closing', { phases: ['EVENING'], bands: ['BUILDING', 'HALFWAY'] }),
  m('evening-half-001', 'HALF THE DAY IS SECURED. THE OTHER HALF IS A DECISION.', P, 'CLOSING', 'closing', { phases: ['EVENING'], bands: ['HALFWAY'] }),
  m('evening-half-002', 'THE REMAINING CONDITIONS ARE FEW AND THE HOURS ARE FEWER.', P, 'CLOSING', 'pressure', { phases: ['EVENING'], bands: ['HALFWAY', 'ADVANCING'] }),
  m('evening-advancing-001', 'THE RUN IS ALMOST COMPLETE.', P, 'FINAL PUSH', 'momentum', { phases: ['EVENING'], bands: ['ADVANCING'] }),
  m('evening-advancing-002', 'MOST OF TODAY IS ALREADY EARNED. CLOSE THE GAP.', P, 'FINAL PUSH', 'momentum', { phases: ['EVENING'], bands: ['ADVANCING'] }),
  m('evening-near-001', 'ONE CONDITION REMAINS.', P, 'FINAL CONDITION', 'pressure', { phases: ['EVENING'], bands: ['NEAR_CLEAR'] }),
  m('evening-near-002', 'THE DAY IS NEARLY CLEARED. THE LAST STEP IS THE SHORTEST.', P, 'FINAL CONDITION', 'pressure', { phases: ['EVENING'], bands: ['NEAR_CLEAR'] }),
  m('evening-near-003', 'THE FINAL CONDITION IS THE ONE THE RECORD WILL REMEMBER.', P, 'FINAL CONDITION', 'pressure', { phases: ['EVENING'], bands: ['NEAR_CLEAR'] }),

  /* ── NIGHT · unfinished — closure, never a scolding ──────────────── */
  m('night-zero-001', 'THE DAY IS ALMOST OVER AND NOTHING IS RECORDED.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ZERO'] }),
  m('night-zero-002', 'THE WINDOW IS NARROWING. THE DAY IS STILL OPEN.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ZERO', 'STARTED'] }),
  m('night-zero-003', 'ONE MINIMUM ACTION STILL CHANGES TODAY’S RESULT.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ZERO', 'STARTED'] }),
  m('night-zero-004', 'THE RECORD WILL CLOSE AS IT STANDS UNLESS IT IS CHANGED.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ZERO'] }),
  m('night-started-001', 'SOMETHING WAS LOGGED TODAY. THAT IS NOT NOTHING.', P, 'FINAL WINDOW', 'restraint', { phases: ['NIGHT'], bands: ['STARTED'] }),
  m('night-building-001', 'THE DAY WILL CLOSE PARTIAL. PARTIAL STILL COUNTS.', P, 'FINAL WINDOW', 'restraint', { phases: ['NIGHT'], bands: ['BUILDING'] }),
  m('night-building-002', 'THE LAST HOURS ARE STILL LOGGABLE.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['BUILDING', 'HALFWAY'] }),
  m('night-half-001', 'HALF THE REQUIREMENT IS ON THE RECORD AT THE CLOSE.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['HALFWAY'] }),
  m('night-advancing-001', 'THE DAY ENDS IN CREDIT, IF NOT IN FULL.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ADVANCING'] }),
  m('night-advancing-002', 'ALMOST THE WHOLE REQUIREMENT, WITH MINUTES TO SPARE.', P, 'FINAL WINDOW', 'closing', { phases: ['NIGHT'], bands: ['ADVANCING', 'NEAR_CLEAR'] }),
  m('night-near-001', 'ONE CONDITION SEPARATES THIS DAY FROM A CLEAR.', P, 'FINAL CONDITION', 'pressure', { phases: ['NIGHT'], bands: ['NEAR_CLEAR'] }),
  m('night-near-002', 'THE LAST REQUIREMENT IS STILL OPEN. BARELY.', P, 'FINAL CONDITION', 'pressure', { phases: ['NIGHT'], bands: ['NEAR_CLEAR'] }),

  /* ── FIRST ACTION — any phase, the day's first clear ─────────────── */
  m('first-action-001', 'THE FIRST CONDITION IS MET. CONTINUITY DETECTED.', P, 'FIRST ACTION', 'momentum', { when: (c) => c.firstActionOfDay, weight: 3, cooldownDays: 5 }),
  m('first-action-002', 'THE DAY HAS ITS FIRST ENTRY. THE HARDEST ONE IS FILED.', P, 'FIRST ACTION', 'momentum', { when: (c) => c.firstActionOfDay, weight: 3, cooldownDays: 5 }),
  m('first-action-003', 'ACTION REGISTERED. THE RECORD IS NO LONGER EMPTY.', P, 'FIRST ACTION', 'momentum', { when: (c) => c.firstActionOfDay, weight: 3, cooldownDays: 5 }),

  /* ── FINAL CONDITION — exactly one core quest outstanding ────────── */
  m('final-condition-001', 'ONE REQUIREMENT SEPARATES YOU FROM A CLEARED DAY.', P, 'FINAL CONDITION', 'pressure', { when: (c) => c.coreTotal > 0 && c.coreTotal - c.coreCompleted === 1, weight: 3, cooldownDays: 4 }),
  m('final-condition-002', 'A SINGLE CONDITION REMAINS OUTSTANDING.', P, 'FINAL CONDITION', 'pressure', { when: (c) => c.coreTotal > 0 && c.coreTotal - c.coreCompleted === 1, weight: 3, cooldownDays: 4 }),
  m('final-condition-003', 'FIVE OF SIX. THE LAST ONE IS THE ONLY ONE LEFT TO ARGUE WITH.', P, 'FINAL CONDITION', 'pressure', { when: (c) => c.coreTotal === 6 && c.coreCompleted === 5, weight: 3, cooldownDays: 4 }),

  /* ── PROLONGED ZERO — late in the day, still nothing ─────────────── */
  m('prolonged-zero-001', 'NO ACTION HAS BEEN REGISTERED. THE SYSTEM IS WAITING.', P, 'AWAITING INPUT', 'pressure', { bands: ['ZERO'], phases: ['AFTERNOON', 'EVENING', 'NIGHT'], weight: 2, cooldownDays: 6 }),
  m('prolonged-zero-002', 'SEVERAL HOURS HAVE PASSED WITHOUT AN ENTRY.', P, 'AWAITING INPUT', 'pressure', { bands: ['ZERO'], phases: ['AFTERNOON', 'EVENING', 'NIGHT'], weight: 2, cooldownDays: 6 }),
  m('prolonged-zero-003', 'THE SYSTEM DOES NOT ESTIMATE. IT ONLY RECORDS. THERE IS NOTHING TO RECORD.', P, 'AWAITING INPUT', 'pressure', { bands: ['ZERO'], phases: ['EVENING', 'NIGHT'], weight: 2, cooldownDays: 6 }),

  /* ── STREAK TEXTURE — carried under any band while a run is live ─── */
  m('streak-live-001', 'THE SEQUENCE IS LIVE. IT IS DECIDED DAILY.', P, 'CONTINUITY', 'momentum', { minStreak: 7, bands: ['STARTED', 'BUILDING', 'HALFWAY'], cooldownDays: 7 }),
  m('streak-live-002', 'A RUN IS IN PROGRESS. TODAY IS PART OF IT OR IT IS NOT.', P, 'CONTINUITY', 'momentum', { minStreak: 7, bands: ['ZERO', 'STARTED', 'BUILDING'], cooldownDays: 7 }),
  m('streak-live-003', 'THE RECORD SHOWS AN UNBROKEN SEQUENCE. IT IS NOT YET EXTENDED TODAY.', P, 'CONTINUITY', 'pressure', { minStreak: 14, bands: ['ZERO', 'STARTED'], cooldownDays: 7 }),

  /* ══════════════════════════════════════════════════════════════════
   * DEFAULT — unconditioned. The floor that makes selection total.
   * ════════════════════════════════════════════════════════════════ */
  m('default-001', 'STATUS: RECORDED.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-002', 'THE SYSTEM IS OBSERVING.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-003', 'STATUS: UNCHANGED.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-004', 'THE RECORD IS CURRENT.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-005', 'CONDITIONS ARE LISTED BELOW.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-006', 'THE ARC CONTINUES.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-007', 'EVIDENCE ACCUMULATES OR IT DOES NOT. NOTHING ELSE IS MEASURED.', 'DEFAULT', 'STATUS', 'neutral'),
  m('default-008', 'THE SYSTEM REPORTS. THE DECISION IS YOURS.', 'DEFAULT', 'STATUS', 'neutral'),
];
