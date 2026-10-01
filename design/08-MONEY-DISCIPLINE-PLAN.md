# SYSTEM — Money Discipline (Treasury) — Implementation Plan

> Companion to `design/04-SYSTEM-MESSAGE-ENGINE.md` (the pattern this plan follows
> point-for-point), `design/00-DESIGN-SYSTEM.md` (voice, colour, the frozen test
> contract), `final/07-data-model-architecture.md` (event-sourcing rules) and
> `docs/07-data-model.md`.
>
> **Status: PLANNING ONLY. No code in this change.** Written after reading the actual
> repository (`engine/types.ts`, `engine/reduce.ts`, `db/schema.ts`, `db/db.ts`,
> `db/domainProjections.ts`, `store/training.ts`, `store/checkpoint.ts`,
> `store/attributes.ts`, `store/reality.ts`, `store/settings.ts`, `store/review.ts`,
> `ui/screens/Today.tsx`, `ui/screens/Progress.tsx`, `ui/components/AttributeBars.tsx`,
> `ui/hooks/useCountdown.ts`), not invented from the prompt alone. Every architectural
> choice below cites the existing pattern it follows or the specific reason it departs
> from one.

---

## 0. One-paragraph summary

Money Discipline ships as a new **direct-write domain** (the same architectural class as
career, DSA, training — not folded into `EngineState`), reusing the event-sourcing,
Dexie-version, store-layer and voice-engine machinery this codebase already has for six
other domains. It is **not** a new Attribute (the six are a closed, hand-tuned formula
set — §11) and grants **no XP in v1** (§12). It lives on `TODAY` (a compact card) and
`PROGRESS → REALITY` (cumulative evidence + history), never as a fourth nav tab, per the
brief. The 22:00 lock reuses the exact hour the System Message Engine already calls
`NIGHT` (§9). All money math is integer paise; nothing is a JavaScript float (§18).

---

## 1. Current architecture audit

Answers the prompt's twelve inspection questions, each traced to a real file.

| # | Question | Where | Finding |
|---|---|---|---|
| 1 | Today | `src/ui/screens/Today.tsx` (898 lines) | One big screen component. Imports every log sheet as a modal/sheet. `SystemTransmission` sits directly under the header, above the quest window (design/04 §15). The recovery card (`data-testid="recovery-card"`) is the closest existing template for a conditional, state-gated card. |
| 2 | Progress | `src/ui/screens/Progress.tsx` (316 lines) | Two sub-tabs: `SYSTEM` (level/rank/streak/attributes, XP-facing) and `REALITY` (`data-testid="reality-tab"`, cumulative all-time real-world counts, explicitly "everything here started at zero" — evidence, not game state). `getRealitySummary()` in `store/reality.ts` is the exact shape a new metric block extends. |
| 3 | Day boundaries | `src/engine/time.ts` | `localDate()` (04:00 boundary), `isDayClosed()` (03:00–04:00 window), `arcDay()` (1-indexed, inclusive). Pure, config-driven, no hidden constants. |
| 4 | Timezone | `DEFAULT_CONFIG.arc.timezone = 'Asia/Kolkata'` in `engine/config.ts`; every time function takes it as a parameter, never reads `Date`/`Intl` ambiently except through `formatInTimeZone`. |
| 5 | Event ledger | `src/db/events.ts` (`appendEvent`, `getAllEvents`), `src/engine/reduce.ts` (`applyEvents` — exhaustive switch, `default: throw`), `src/db/domainProjections.ts` (`buildDomainTables` — the *other* exhaustive switch, for direct-write domains). Two switches, two purposes: `reduce.ts` folds into the six domains that feed XP/quests/rank; `domainProjections.ts` rebuilds every direct-write table from the raw log for import/restore. |
| 6 | IndexedDB / Dexie | `src/db/schema.ts` (table row shapes + `SCHEMA_V{1..4}_ADDITIONS`), `src/db/db.ts` (`this.version(N).stores(...)`, table declarations). Current version: **4** (system message engine). Additive only, ever — no `.upgrade()` migration exists in this codebase yet. |
| 7 | System Messages | `design/04-SYSTEM-MESSAGE-ENGINE.md` + `engine/systemVoice.ts` + `engine/voicePack.ts` + `store/systemMessage.ts`. A **closed 7-tier taxonomy** (`EXCEPTION > EVENT > RECOVERY > CLEARED > MILESTONE > PROGRESS > DEFAULT`) about **the day's quest condition**, fingerprint-cached, cooldown-ranked, deterministic. Not a generic "show a message" utility — its priority order is specifically about quests/XP/streak. |
| 8 | Daily review | `src/store/review.ts` — `completeEveningReview`, 25-second flow, `REVIEW_COMPLETED` event, one row per `local_date`. Independent of the 03:00 day-close mechanism; a Player can review a day any time after they've logged it. |
| 9 | Configuration | `src/store/settings.ts` — `Settings` interface, **localStorage only**, versioned (`SETTINGS_VERSION`), explicitly never in the event log ("a theme choice says nothing about whether four months changed anything"). Device preference, not arc evidence. |
| 10 | XP / attributes | `src/engine/xp.ts` (category caps, daily cap, BONUS/BOSS exemption), `src/engine/attributes.ts` (six hand-tuned formulas, "transcribed verbatim" from spec, explicitly *not* routed through `EngineConfig` — i.e., deliberately not meant to be casually extended), `src/store/attributes.ts` (28-day windowed inputs), `src/ui/components/AttributeBars.tsx` (fixed 3-card layout: Mind{Discipline,Depth,Problem-Solving}, Craft{Engineering,Momentum}, Body{Vitality} — no spare slot). |
| 11 | Historical reports | `store/checkpoint.ts` — `exportSnapshotJson`/`importSnapshotJson` (full backup, event-log-is-the-backup philosophy, three verbatim exceptions: `arc`, `profile`, `checkpoints`), `getCheckpointReport`/`getCheckpointComparison` (day 14/30/60/90/120 ceremony). |
| 12 | Animations | `design/00 §5.1`: CSS for anything gating visibility; framer-motion only for taps/gestures. `index.css` keyframes + `[data-motion]` reduced-motion collapse. `ui/kit/SystemWindow.tsx` is the reusable "System speaks" frame (materialise: snap → scan → rise). |

---

## 2. Existing components to reuse (nothing reimplemented)

| Need | Reused from | Why it fits |
|---|---|---|
| Event envelope, idem_key, append pattern | `db/events.ts`, `engine/types.ts`'s `SystemEvent<T>` | Identical shape every other domain uses. |
| Direct-write + rebuild-on-import | `store/training.ts`'s `REBUILD_ADJACENT_TABLES` pattern, `db/domainProjections.ts`'s `buildDomainTables` | Money's tables are exactly this class: not XP-bearing at the `EngineState` level, but must survive an export/import round trip. |
| 22:00 threshold | `engine/systemVoice.ts`'s `phaseFor()` — `NIGHT` is already defined as *"22:00 through the close hour"* | The Treasury accounting window is not a new time concept; it **is** the System's own NIGHT phase. Reusing the constant (not the function — see §9) ties the feature to a fact already true about the day rather than inventing a second clock. |
| Countdown-to-a-hour UI | `ui/hooks/useCountdown(closeHour, timezone)` | Generic already — built for `dayCloseHour` but takes any hour. Reusable verbatim for "time until 22:00" with no changes. |
| Cumulative evidence surface | `store/reality.ts`'s `RealitySummary` + `Progress.tsx`'s `RealityTab` | The exact "started at zero, all-time, not gamified" register Money Discipline needs (§0). |
| Conditional state-gated card | `Today.tsx`'s recovery card (`data-testid="recovery-card"`) | Closest existing template for "a card that only sometimes has an action available." |
| The System's small-print voice pattern | `engine/voicePack.ts`'s `m()` factory, tier/cooldown/weight fields, `fnv1a` day-seeded tiebreak | Directly reusable *shape*, not reused *instance* — see §13 for why Money gets its own small library rather than injecting into `VOICE_PACK`. |
| Corrected-value history on a row | `db/schema.ts`'s `ApplicationRow.status_history: {status, date}[]` | Precedent for "keep the old value, don't overwrite" inside a direct-write row, already in this codebase. |
| A payload that names a date other than "today" | `types.ts`'s `QuestRecoveredPayload.localDate` (*"the missed day being recovered, not today"*) | Precedent for backdated entries, reserved for a later version (§20, edge case 8). |
| Backup/export table registration | `store/checkpoint.ts`'s `exportSnapshotJson`/`importSnapshotJson` | Money's new tables register here the same way every domain table already does. |

---

## 3. New domain model

Money Discipline introduces one new **domain**, architecturally parallel to Career or
DSA: its own event types, its own direct-write Dexie tables, its own pure engine module,
its own store module, its own small voice library. It does **not**:

- fold into `EngineState` (no XP, no quest, no streak dependency — see §12),
- become a seventh `Attribute` (§11),
- add a fifth nav tab (per the brief; placement is §14/§15),
- touch the onboarding flow (`ui/onboarding/*` — frozen this session, §21).

### 3.1 Terminology (SYSTEM register, not finance-app register)

| Concept | Term used in UI/code | Rejected | Why |
|---|---|---|---|
| The whole configured money-management unit | **TREASURY** | "Budget" | User's own instruction; matches the app's existing noun register (ARC, RANK, GATE). |
| One contributing pot of money | **SOURCE** | "Account" | Neutral of *where* the money physically is. |
| Money excluded from daily spending | **RESERVE** (a source flagged `protected`) | "Savings" | "Savings" implies a goal; RESERVE is closer to "off-limits," matching the user's own wording. |
| Today's computed ceiling | **ALLOWANCE** | "Budget," "Limit" | User's own instruction. |
| What was entered | **SPEND** / **SPENT** | "Expense," "Transaction" | Matches "SPENT" already used in the user's own mockups. |
| The 30-day (or N-day) window | **PERIOD** | "Arc" | **Deliberately not "Arc."** `db.arc` is *the* 120-day journey with its own start/end/pause/status. A Treasury period is almost always shorter and independently configurable (the user's own example is 30 days inside a 120-day Arc). Reusing "Arc" would let a Player read "Treasury Arc paused" as "the whole System paused," which is false. `PERIOD` is neutral and matches "remaining days" language already in the prompt. |
| The act of registering today's number | **ACCOUNTING** | "Entry," "Log" | User's own instruction ("TREASURY ACCOUNTING"); also distinguishes it from every other `LOG ▸` sheet in the app — this one has a *time gate*, and a different verb signals that before the Player even taps it. |
| Outcome vocabulary | **PRESERVED / ON ALLOWANCE / OVER ALLOWANCE / CRITICAL / EXHAUSTED / SURVIVED / LOCKED / UNREGISTERED** | Green/red | §10 — full state machine. |

---

## 4. Treasury data model

### 4.1 Event types (append to `engine/types.ts`'s `EventType` union)

Following the exact pattern of every other domain's addition (e.g. `WEEKLY_QUEST_COMPLETED`
being added "the same way BOSS_CLEARED's handling was added"):

```ts
| 'TREASURY_CREATED'            // one-time setup: period + initial sources
| 'TREASURY_SOURCE_ADDED'       // a source added at setup or mid-period
| 'TREASURY_SOURCE_WITHDRAWN'   // a source removed/zeroed mid-period (soft, not a delete)
| 'TREASURY_RECONFIGURED'       // period end date changed, or a source's protected flag flipped
| 'DAILY_SPENDING_REGISTERED'   // the 22:00 entry for a local_date
| 'DAILY_SPENDING_CORRECTED'    // a same-or-later-day correction of an already-registered amount
| 'TREASURY_PERIOD_CONCLUDED'   // derived+recorded once, the first time `today > period.endDate` is observed
```

Seven new types — comparable granularity to Career's five or DSA's two. Every one gets an
explicit case in `engine/reduce.ts`'s switch (even if a no-op, matching the codebase's own
rule: *"Every unhandled event type still throws — deliberately no permissive default
case."*) and a case in `db/domainProjections.ts`'s `buildDomainTables` (so a full
export/import round trip reconstructs Treasury state from the log alone, per §22).

### 4.2 Payload shapes (append to `engine/types.ts`, alongside the other `*Payload` interfaces)

```ts
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP'; // INR default; abstraction only (§17)

/** All money is integer minor units (paise for INR) — §18. Never a float. */
export type AmountMinor = number;

export interface TreasurySourceInput {
  name: string;                 // "Bank", "Cash", "Reserve" — free text, Player's own label
  amountMinor: AmountMinor;
  protected: boolean;           // true = excluded from spendable treasury (the RESERVE case)
  note?: string;
}

export interface TreasuryCreatedPayload {
  treasuryId: string;
  currency: CurrencyCode;
  periodStartDate: string;      // local_date
  periodEndDate: string;        // local_date, inclusive
  accountingOpenHour: number;   // default 22 — see §9. Stored per-treasury, not a global constant,
                                 // so a future Player can configure it without a schema change.
  sources: TreasurySourceInput[];
}

export interface TreasurySourceAddedPayload {
  treasuryId: string;
  sourceId: string;
  localDate: string;
  source: TreasurySourceInput;
}

export interface TreasurySourceWithdrawnPayload {
  treasuryId: string;
  sourceId: string;
  localDate: string;
  reason?: string;
}

export interface TreasuryReconfiguredPayload {
  treasuryId: string;
  localDate: string;
  // Only the fields that changed are present — same "partial patch" shape as
  // PlanAmendedPayload's implementation_intention. Absent = unchanged.
  periodEndDate?: string;
  sourceProtectedFlips?: { sourceId: string; protected: boolean }[];
}

export interface DailySpendingRegisteredPayload {
  treasuryId: string;
  localDate: string;            // the day being accounted for (always "today" in v1 — §20 case 8)
  amountMinor: AmountMinor;
}

/** Never overwrites — the original DAILY_SPENDING_REGISTERED event and every
 * prior correction stay in the log verbatim (§8). This event is what the
 * store layer folds forward to get the row's *current* value. */
export interface DailySpendingCorrectedPayload {
  treasuryId: string;
  localDate: string;
  previousAmountMinor: AmountMinor; // redundant with the log but makes the row's
                                     // history[] reconstructable without re-scanning
  newAmountMinor: AmountMinor;
  reason?: string;
}

export interface TreasuryPeriodConcludedPayload {
  treasuryId: string;
  concludedLocalDate: string;   // the local_date this was first observed on
  finalSpendableMinor: AmountMinor; // may be negative (EXHAUSTED)
  verdict: 'SURVIVED' | 'EXHAUSTED';
}
```

### 4.3 Dexie tables (`db/schema.ts`'s `SCHEMA_V5_ADDITIONS`, `db/db.ts`'s `version(5)`)

```ts
export interface TreasuryRow {
  id: string;                    // pk
  currency: CurrencyCode;
  period_start_date: string;
  period_end_date: string;
  accounting_open_hour: number;
  status: 'active' | 'concluded';
  concluded_verdict?: 'SURVIVED' | 'EXHAUSTED';
  concluded_local_date?: string;
  created_at: string;
}

export interface TreasurySourceRow {
  id: string;                    // pk
  treasury_id: string;
  name: string;
  amount_minor: number;          // the ORIGINAL contribution — never mutated in place;
                                  // a later top-up/withdrawal is its own row (4.3.1)
  protected: boolean;
  note?: string;
  active: boolean;                // false once withdrawn — never physically deleted (§8's
                                   // "don't overwrite history" principle applies to sources too)
  created_at: string;
  withdrawn_at?: string;
}

/**
 * ONE row per local_date the Player has registered spending for — the
 * direct-write projection DAILY_SPENDING_REGISTERED/_CORRECTED fold into.
 * Never stores an "allowance" figure (§7: allowance is always recomputed,
 * never cached, so it can never drift from the sources it's derived from).
 */
export interface DailySpendingRow {
  local_date: string;             // pk
  treasury_id: string;
  amount_minor: number;           // CURRENT (latest-corrected) value
  registered_at: string;
  corrected: boolean;
  history: { amount_minor: number; changed_at: string; reason?: string }[]; // oldest first;
                                   // index 0 is the original DAILY_SPENDING_REGISTERED value
}

export const SCHEMA_V5_ADDITIONS = {
  treasury: 'id, status',
  treasury_source: 'id, treasury_id, active, [treasury_id+active]',
  daily_spending: 'local_date, treasury_id',
} as const;
```

**4.3.1 — why a top-up is a new `TreasurySourceRow`, not a mutation.** A source's
`amount_minor` is written once, at `TREASURY_SOURCE_ADDED`, and never touched again. "The
user adds money mid-period" (§20 case 14) is a *second* `TreasurySourceRow` with a later
`created_at`, not an edit to an existing one — this is what makes the row-history
principle (§8) apply uniformly to sources and to daily spending, and it's what makes
`buildDomainTables` a pure fold with no special-cased mutation logic.

**4.3.2 — no `treasury_ledger` table.** The day-by-day allowance history the prompt asks
for (§16, "Treasury History") is **not stored**. It's a pure function
(`computeTreasuryLedger`, §7) over `treasury_source` + `daily_spending`, recomputed on
read — exactly the way `store/streak.ts`'s `getStreakState` recomputes the whole streak
history from `buildDayOutcomes` on every call rather than caching a running total. This
is the single most important design decision in this plan: it makes same-day correction
(§8) trivial — correcting `daily_spending.amount_minor` for one date automatically and
correctly changes every subsequent day's *computed* allowance the next time it's read,
with no cascade-update code to write or get wrong.

---

## 5. Daily spending model

One entry per day, total amount only — matching the user's explicit instruction ("₹80,
not three separate transactions"). The data model leaves room for transaction-level entry
later without breaking anything:

- `DailySpendingRegisteredPayload`/`DailySpendingCorrectedPayload` both carry a single
  `amountMinor`, not a list — but nothing about `DailySpendingRow` assumes single-source
  entry. A v2 "itemised" mode would add a `DAILY_SPENDING_ITEM_LOGGED` event whose items
  sum to the same row's `amount_minor`, the same relationship `xp_ledger` rows already
  have to `day_rollup.xp_earned` (many detail rows, one daily total). No migration needed
  for that later — it's additive.

---

## 6. Event model

Table format per the prompt's own field list. Every event carries the full envelope
(`id, type, occurred_at, local_date, arc_id, payload, source, idem_key, schema_v`) — the
columns below are payload-only.

| Event | Preserves | idem_key pattern |
|---|---|---|
| `TREASURY_CREATED` | period dates, currency, accounting hour, initial sources | `treasury-created:${treasuryId}` |
| `TREASURY_SOURCE_ADDED` | source id/name/amount/protected, local_date | `treasury-source-added:${sourceId}` |
| `TREASURY_SOURCE_WITHDRAWN` | source id, local_date, reason | `treasury-source-withdrawn:${sourceId}` |
| `TREASURY_RECONFIGURED` | only the changed fields, local_date | `treasury-reconfig:${treasuryId}:${localDate}:${deps.newId()}` (a treasury can be reconfigured more than once a day, unlike spending) |
| `DAILY_SPENDING_REGISTERED` | treasury id, local_date, amount | `treasury-spend:${treasuryId}:${localDate}` — **one per date, by construction**, which is what makes "one final daily entry" (§8's second question) enforced at the idem_key level, the same way `review:${today}` enforces one evening review per day |
| `DAILY_SPENDING_CORRECTED` | previous + new amount, local_date, reason | `treasury-spend-correct:${treasuryId}:${localDate}:${deps.newId()}` — **not** idempotent-by-date, because a day may be corrected more than once |
| `TREASURY_PERIOD_CONCLUDED` | verdict, final spendable, concluded date | `treasury-concluded:${treasuryId}` |

`arc_id` on every Treasury event is the *App's* current arc id (`state.arc.id`), for
consistency with every other event type — it does **not** mean the Treasury period and
the Arc share a lifecycle (§3.1). It's provenance, not a foreign-key relationship the
engine reasons about.

---

## 7. Allowance calculation model

**The formula, precisely, in integer minor units:**

```
spendableMinor(t) =
    Σ { source.amount_minor : source.protected == false AND source.active == true
                               AND source.created_at's local_date <= t }
  − Σ { dailySpending[d].amount_minor : periodStart <= d < t }

remainingDays(t) = periodEndDate − t + 1        // inclusive, matches arcDay's own convention

allowanceMinor(t) = remainingDays(t) > 0
    ? floor(spendableMinor(t) / remainingDays(t))   // floor, never round up — never let the
                                                       // displayed ceiling promise more than
                                                       // the treasury actually contains
    : null                                            // period concluded — see §10
```

Verified against both of the prompt's own worked examples (paise omitted for readability,
math is identical):

| | Day 1 (before entry) | Day 1 spend | Day 2 (after) |
|---|---|---|---|
| Example 1 (under) | 3800 / 30 = **126.67** | 30 | 3770 / 29 = **130.00** ✓ |
| Example 2 (over) | 3800 / 30 = **126.67** | 150 | 3650 / 29 = **125.86** ✓ |

**Why `allowanceMinor` is never stored, only computed (§4.3.2 restated for this
section):** floor-division at every step means repeated storage-and-reuse of a rounded
figure would compound rounding error across 30 days. Recomputing fresh from
`spendableMinor`/`remainingDays` on every read means the displayed number is always
exactly reproducible from the two integers that produced it — the same "derive, never
cache-and-drift" principle `store/streak.ts` already follows for the streak count.

**Day-transition timing.** `t` in the formula above is always the **04:00-boundary
`local_date`**, computed once at render/read time via `localDate(now, tz)` — never
"whatever day was open when the Player last registered." This is what prevents an
off-by-one: `remainingDays(t)` is evaluated fresh every time Today renders, so a Player
who opens the app at 00:30 (still "yesterday" by the 04:00 boundary — `isDayClosed` would
in fact already be blocking most logging at that hour) and one who opens it at 09:00 see
`t` computed identically by the one shared function, not by two different code paths.

---

## 8. Day transition model / edit-correction strategy

**Correction strategy — same-day only, additive, never overwritten:**

1. Before 22:00: nothing to correct — accounting is locked (§9), so there is no value yet.
2. 22:00–close: `DAILY_SPENDING_REGISTERED` fires once (idem_key enforces this — a second
   tap of "Register" without going through Correct is a no-op, mirroring
   `logInterviewBenchmark`'s "log a pass, stay passed forever" idempotency, except here
   the *value* is fixed, not just a flag).
3. After registering, the UI swaps the "Register" action for a **"Correct"** action
   showing the currently-registered figure. Tapping it re-opens the same amount field,
   pre-filled, with an explicit confirm step ("Change ₹80 to ₹90?") — never a silent
   overwrite.
4. Confirming emits `DAILY_SPENDING_CORRECTED` (not a second `..._REGISTERED`, which
   would collide on idem_key by design). The store layer folds it onto `daily_spending`:
   `history.push({amount_minor: <old value>, changed_at, reason})`, then sets
   `amount_minor` to the new value and `corrected = true`.
5. **A correction is allowed at any point before the Player next opens accounting for a
   later date** — in practice, this means "until the day rolls over at 04:00," since
   accounting for a new date can't open until 22:00 the *following* evening anyway. No
   separate expiry needs to be enforced; the 04:00 boundary and the 22:00 lock already
   bracket the only window in which a correction is meaningful.
6. The raw event log is the ultimate ledger: even if `daily_spending`'s row were ever
   lost or corrupted, `buildDomainTables` reconstructs the same current value by folding
   `DAILY_SPENDING_REGISTERED` then every `DAILY_SPENDING_CORRECTED` for that date, in
   order — the row is a cache of a fold, never a second source of truth.

---

## 9. 10 PM lock/unlock model

**The gate is a pure function, not a new clock:**

```ts
// engine/treasury.ts
export function isAccountingOpen(minutesOfDay: number, dayClosed: boolean, openHour: number): boolean {
  if (dayClosed) return false;               // 03:00–04:00 — nothing can be logged, full stop
  return minutesOfDay >= openHour * 60;        // openHour default 22, per-treasury configurable
}
```

This takes `minutesOfDay` and `dayClosed` as **parameters**, the same signature shape
`engine/systemVoice.ts`'s `phaseFor(minutesOfDay, dayClosed)` already uses — deliberately
*not* a call into `systemVoice.ts`, even though the default 22:00 threshold is the exact
hour that engine calls `NIGHT`. Two separate small pure functions with the same shape,
rather than one subsystem depending on the other's internal taxonomy: the System Message
Engine's `NIGHT` window is a *voice* concept (§7 of design/04 — "everything outside the
four windows is NIGHT") that happens to start at the same hour; Treasury's lock is a
*product rule* that happens to agree with it today and must stay correct even if a future
Player configures `accountingOpenHour` away from 22 for their own Treasury (per-treasury,
not global — §4.2) while the System's own NIGHT phase stays fixed. Coupling them would
make a Treasury config change silently move the System's voice windows, which is a
second, unrelated feature acquiring a side effect nobody asked for.

**Before 22:00 (LOCKED):** every read-only figure remains visible (§ "what happens before
10pm" in the brief) — treasury, current allowance, remaining days, projected allowance,
history. Only the amount input and the Register/Correct action are disabled.

**UI transition, 22:00 exactly:** `Today.tsx` already re-derives its whole state on
mount and on the existing local-date-change poll; the Treasury card subscribes to the
same `useCountdown`-driven re-render used for the day-close countdown (§2), so
`isAccountingOpen` is re-evaluated every second the tab is visible — no separate timer,
no missed-transition risk from a backgrounded tab (the existing countdown hook already
handles `visibilitychange` by recomputing from the real clock on resume rather than
trusting an elapsed interval, which is exactly the correctness property this transition
needs too).

**Motion:** per design/00 §5.1, the LOCKED→OPEN swap changes what's interactive, so it's
CSS only — a `SystemWindow`-style corner-bracket materialise (reusing the existing
`system-frame-in`/`system-bracket-in` keyframes) on the input's first appearance, nothing
JS-driven, nothing whose completion the input's usability depends on.

---

## 10. Status state machine

Seven states, each independently derivable from data already computed above — no state
is stored; every render recomputes the current one.

```
LOCKED         — before openHour, OR dayClosed. No spend registered yet, none can be.
UNREGISTERED   — accounting is open (or the day has since closed) and no spend was
                 entered for that date at all. (A day that closes still LOCKED-and-never-
                 opened becomes UNREGISTERED permanently in history — §20 case 8.)
PRESERVED      — registered, spent < today's allowance.
ON ALLOWANCE   — registered, spent == today's allowance exactly.
OVER ALLOWANCE — registered, spent > today's allowance, but spendableMinor(t+1) > 0.
CRITICAL       — registered, and spendableMinor(t+1) <= 0 but remainingDays(t+1) > 0 —
                 the treasury is exhausted with days still left in the period.
CONCLUDED      — remainingDays(t) <= 0, i.e. t > periodEndDate. Sub-states:
                   SURVIVED  — final spendableMinor >= 0
                   EXHAUSTED — final spendableMinor <  0
```

Transition table (today's state depends only on `spendableMinor(t)`, `remainingDays(t)`,
and whether `daily_spending[t]` exists):

| remainingDays(t) | daily_spending[t]? | spent vs allowance | State |
|---|---|---|---|
| ≤ 0 | — | — | `CONCLUDED` (→ `SURVIVED`/`EXHAUSTED` by sign of final spendableMinor) |
| > 0 | none, accounting not yet open | — | `LOCKED` |
| > 0 | none, accounting open or day closed | — | `UNREGISTERED` |
| > 0 | present | spent < allowance | `PRESERVED` |
| > 0 | present | spent == allowance | `ON ALLOWANCE` |
| > 0 | present, spendableMinor(t+1) > 0 | spent > allowance | `OVER ALLOWANCE` |
| > 0 | present, spendableMinor(t+1) ≤ 0 | spent > allowance | `CRITICAL` |

No `EXHAUSTED` mid-period state distinct from `CRITICAL` — a treasury that hits zero
before the period ends is still being managed (more days remain, allowance is just
`floor(≤0 / n)` = 0 or negative-clamped-to-0), so it stays `CRITICAL` until either the
Player adds a source (§20 case 14, moves it back to `PRESERVED`/`OVER`) or the period
ends (`CONCLUDED → EXHAUSTED`). Two names for the same underlying number would be the
"GREEN/RED" flattening the prompt explicitly asked this plan to avoid, aimed the other
direction.

---

## 11. Money Discipline attribute model

**Recommendation: no new Attribute. This is option E — Reality metrics — not option D.**

Reasoning, grounded in what's actually in the repo (§1 row 10):

1. The six existing attributes are a **closed set**. `engine/attributes.ts`'s own
   comment states the six formulas are *"transcribed verbatim"* from spec and
   *deliberately* not routed through `EngineConfig` — i.e., not meant to be tuned or
   extended casually, unlike every genuinely tunable constant in the app.
2. `AttributeBars.tsx` renders a **fixed 3-card layout** (Mind / Craft / Body) with all
   six slots already assigned. A seventh attribute has no group to join without either
   inventing a fourth card (a real navigation/layout change to a component untouched by
   this feature otherwise) or awkwardly appending it to an unrelated card.
3. **The user's own stated risk is exactly right and is why REALITY, not an Attribute,
   is the correct fit**: *"someone with more starting money would automatically look
   more disciplined"* if the metric were raw money. The six existing attributes are all
   ratios over a fixed window (§ engine/attributes.ts — every term is `clamp01(x / N)`),
   which is the normalization technique that would be needed here too — but building and
   tuning a seventh weighted formula, on a domain with a fundamentally different scale
   (₹ vs. count-of-sessions), competing for review attention against six formulas already
   validated by `final/01`'s own simulation (`final/xp-simulation.py`), is a much larger
   and riskier undertaking than the feature warrants for v1.
4. `RealityTab` already exists for **exactly** this purpose — cumulative, all-time,
   normalized-where-it-matters, explicitly *not* fed into XP or the level curve
   (`docs/07`, `final/06 §5.5`). Money Discipline's evidence (days under allowance,
   overspend frequency, treasury survival) is the same *shape* of fact as "first-attempt
   rate on Medium problems" or "quality application rate" — both already live in
   `RealitySummary` as normalized rates, not raw counts.

**What actually goes into REALITY (§16 has the full list) is itself already
normalized** — percentages and rates, not ₹ figures — so the "money saved ≠ discipline"
problem the user flagged is solved by *which numbers* get shown, not by wrapping them in
a new Attribute formula.

**If a future version wants a true Attribute:** the formula would need inputs of the
same normalized shape the other six use (e.g. `daysUnderAllowance / windowDays`,
`1 − overspendFrequency`, `treasurySurvivalRate`), a new `Attribute` union member, a
group decision (a "Reserve" or "Discipline"-adjacent card — Discipline already exists and
is arguably the closest semantic fit, but merging Money into the existing DISCIPLINE
formula would violate the same "transcribed verbatim, don't touch" rule from a different
direction). Flagged as an open question (§35), not resolved here.

---

## 12. XP recommendation

**Recommendation: zero XP in v1.** Money Discipline contributes **only** to REALITY
(§11), never to `total_xp`, never to a category cap, never to the level curve.

Why, beyond the user's own explicit caution:

- `XpCategory` is a **closed union** (`CAREER|MIND|CRAFT|BODY|SLEEP|ATTENTION|LEARN|MAINT|
  BONUS|BOSS`) with hand-tuned `categoryCaps` and a `dailyCap: 700` calibrated by
  `final/xp-simulation.py` against a specific 120-day level-40 terminus (`engine/config.ts`'s
  own comment: revising one constant already required re-deriving the whole curve).
  Adding a new source of XP — even a small, capped one — reopens that calibration.
- The self-correcting mechanic (spend less → future allowance rises) is **already the
  reward**. Layering XP on top risks exactly the "perverse incentive" the user names:
  entering a fake low number to farm both a favourable allowance *and* XP is a strictly
  worse failure mode than entering a fake low number for allowance alone, because it adds
  a second, larger incentive to lie about the one input this feature cannot verify.
- `final/01 §2.1.1`'s BONUS/BOSS categories are reserved for **frequency-limited,
  real-world milestones** (a boss cleared, a weekly quest, a recovery claim) — not
  ongoing daily behaviour. A `TREASURY_PERIOD_CONCLUDED` "survived" verdict is the one
  event in this whole feature that has that shape (one-time, at the end of a period,
  externally verifiable in the sense that the Player either did or didn't run out).

**Deferred, not rejected, for v2+:** a single flat `config.treasurySurvivedXp` grant
(BONUS category, exempt from caps, same shape as `BOSS_CLEARED`'s flat 500) on
`TREASURY_PERIOD_CONCLUDED` with `verdict: 'SURVIVED'` only — never per-day, never
proportional to money saved. Explicitly out of scope for the phases in §30; revisit only
after real usage shows the mechanic alone isn't motivating enough.

---

## 13. System Message integration

**Recommendation: Money gets its own small voice library and its own small surface —
it does not inject into `VOICE_PACK` or compete for the main Today transmission.**

Why, directly from design/04's own stated risk (§1.1): *"Adding a second [line] that says
roughly the same thing in a different tone would make Today noisier and both lines
weaker."* The existing System Transmission's whole taxonomy (`EXCEPTION > EVENT >
RECOVERY > CLEARED > MILESTONE > PROGRESS > DEFAULT`) is about **the day's quest
condition** — its priority order, its bands, its phases are all quest/XP-shaped. Treasury
states (`LOCKED / UNREGISTERED / PRESERVED / OVER / CRITICAL / CONCLUDED`) don't map onto
that taxonomy without distorting it, and shoehorning them in via `when` guards would mean
a Treasury edge case could suddenly win priority over a real quest EVENT, which is
exactly backwards for a screen whose primary subject is still the six daily quests
(§0, §15 — Money stays secondary).

So: a second, much smaller instance of the *same reusable shape* —

```ts
// engine/treasuryVoice.ts — same factory/cooldown/weight/fingerprint shape as
// systemVoice.ts + voicePack.ts, intentionally NOT the same module or array.
type TreasuryTone = 'restraint' | 'pressure' | 'verdict' | 'neutral';
type TreasuryCondition = 'LOCKED' | 'UNREGISTERED' | 'PRESERVED' | 'ON_ALLOWANCE'
                        | 'OVER_ALLOWANCE' | 'CRITICAL' | 'SURVIVED' | 'EXHAUSTED';

interface TreasuryMessage {
  id: string; text: string; condition: TreasuryCondition[]; tone: TreasuryTone;
  cooldownDays?: number; weight?: number;
}
```

~5–8 lines per condition (roughly 40–55 total — a fraction of the 326-line main pack),
same `fnv1a` day-seeded tiebreak for variety, same cooldown-with-fallback-to-full-pool
anti-starvation rule (design/04 §11). Rendered as **one caption line under the Treasury
card's numbers** (small, mono, `--ink-700`, matching the existing `system-line`'s
register — evidence-toned, not display-toned), never in the display-face headline slot
the main transmission owns.

Examples (originals, matching §25's four voice rules from `voicePack.ts`'s own header —
report a condition, one or two clauses, never assert an ungranted fact, never cruel):

| Condition | Line |
|---|---|
| `LOCKED` | `ACCOUNTING OPENS AT 22:00.` |
| `UNREGISTERED` (day closed, nothing entered) | `THE DAY CLOSED UNACCOUNTED.` |
| `PRESERVED` | `RESOURCE PRESERVED.` |
| `ON_ALLOWANCE` | `THE ALLOWANCE WAS MET EXACTLY.` |
| `OVER_ALLOWANCE` | `RESOURCE DEPLETION DETECTED.` |
| `CRITICAL` | `THE RESERVE IS AT ITS FLOOR.` |
| `SURVIVED` | `THE TREASURY SURVIVED THE PERIOD.` |
| `EXHAUSTED` | `THE TREASURY DID NOT LAST THE PERIOD.` |

**Cross-reference risk, addressed directly:** could the main System Transmission and
this caption ever read as contradictory on the same screen (e.g. main line says
`DAILY CONDITIONS SATISFIED` while the Treasury caption says `RESOURCE DEPLETION
DETECTED`)? Yes, deliberately — they're reporting on two genuinely different facts
(quests cleared; money overspent) that really can both be true the same day, the same way
a cleared day and an active Reduced Mode banner can coexist today. Each line stays
honest about its own domain; the alternative (suppressing one to avoid apparent
dissonance) would make one of them lie.

---

## 14. TODAY UI design

Placement, relative to what's already on the screen (§1 row 1, §15's own instruction that
it "must not dominate the six daily quests"):

```
SCREEN TITLE / HUD (existing — level, rank, countdown)
SYSTEM TRANSMISSION (existing — design/04)
system-line (existing — evidence/reflection)
──────────────────────────────────────────────
[ TREASURY CARD — new, compact, collapsed by default ]
──────────────────────────────────────────────
DAILY QUEST window (existing — the six core quests, unchanged, still primary)
recovery-card (existing, if applicable)
weekly-quest-progress (existing)
revisits-due (existing)
```

Rationale for *below* the transmission, *above* the quests: the transmission is the
System's opening statement for the whole day (design/04 §15 — "the System speaks before
it lists requirements"); Treasury is a second, smaller fact the System is also holding,
analogous to how `recovery-card` already sits as a conditional insert without
competing with the quest list for primacy. Quests stay the first scrollable content a
Player reaches.

**Card content (collapsed, LOCKED state — most of the day):**

```
┌─ TREASURY ──────────────────────────────────┐
│  ₹3,641                    30 DAYS REMAINING │
│  ⟨ DAILY ALLOWANCE ⟩  ₹121.37                │
│  ⟨ ACCOUNTING ⟩  LOCKED · OPENS 22:00        │
└───────────────────────────────────────────────┘
```

**Card content (OPEN, unregistered):**

```
┌─ TREASURY ──────────────────────────────────┐
│  ₹3,641                    30 DAYS REMAINING │
│  ⟨ DAILY ALLOWANCE ⟩  ₹121.37                │
│  TODAY'S SPENDING                            │
│  ₹ [__________]           [ REGISTER ]       │
└───────────────────────────────────────────────┘
```

**Card content (registered, PRESERVED):**

```
┌─ TREASURY ──────────────────────────────────┐
│  ₹3,611                    29 DAYS REMAINING │
│  TODAY  ₹30 SPENT · PRESERVED ₹96.67         │
│  NEW ALLOWANCE  ₹124.52          [ CORRECT ] │
│  RESOURCE PRESERVED.                         │
└───────────────────────────────────────────────┘
```

- Uses `MeterBar`/`StatTile`-adjacent primitives from `ui/kit`, not new one-off styling —
  `FramedPanel` or `Panel` for the card shell (design/00 §6), `--accent` blue throughout
  (never gold — §17), a restrained `--state-recover` amber only on `OVER_ALLOWANCE` /
  `CRITICAL`, matching the app's existing amber usage (recovery card, day-closed banner).
- `data-testid="treasury-card"` on the shell, `treasury-spend-input`,
  `treasury-register-button`, `treasury-correct-button`.
- `role="status"` on the caption line (§13), same as `system-transmission`.
- Renders **nothing** if `db.treasury` has no active row — same null-guard pattern every
  other conditional Today block already uses (`!arcId` early return). No forced setup
  flow, no onboarding change (§21).
- Above-the-fold budget: this card is one more fixed-height block in an already-scrolling
  list (Today is not a single-viewport screen even today — recovery card, weekly quest
  and revisits-due already push content below the fold when present). No 320px-height
  regression risk analogous to design/04's own concern about the transmission itself,
  because the transmission sits at a fixed position above everything and this card is
  purely additive further down.

---

## 15. PROGRESS UI design

Lives inside the **existing** `RealityTab` (`Progress.tsx`), as a new block below the
current `rows` table — not a new sub-tab, not a new route, per the brief.

```
CONTROLLED EVIDENCE                              (existing header, unchanged)
  Problems              0
  First-attempt M       —
  ...                                             (existing rows, unchanged)

TREASURY                                          ← new SectionLabel block
  Initial                ₹3,800
  Current                ₹3,611
  Spent (period)         ₹189
  Days remaining         29 / 30
  Current allowance      ₹124.52
  Average daily spend     ₹63
  Days under allowance    5 / 6
  Days over allowance     1 / 6
  Survival rate           83%
  [ VIEW HISTORY › ]                               ← opens the history Sheet (§16)
```

Same `Row` component `RealityTab` already uses (`label` truncates, value doesn't — per
design/00's own trap table entry on this exact pattern), same `data-testid="reality-tab"`
container (the block is additive content inside it, no new top-level testid required
unless a specific row needs one for e2e — `treasury-history-open` on the History link).

Renders nothing (not even the block header) if no Treasury is configured — consistent
with `RealityTab`'s existing behaviour when a domain has zero data (rows already show
`—` rather than being hidden individually; a whole-block hide is used here instead
because an unconfigured Treasury isn't "zero," it's "not opted into," a different case
from every existing REALITY row).

---

## 16. History design

**A `Sheet` (`ui/kit/Sheet.tsx`), not a new route** — reached from the `VIEW HISTORY`
link in §15. Matches every other "more detail on a scrollable list" surface in the app
(log sheets, `QuestDetailSheet`) rather than adding a route to `design/02`'s navigation
table for a screen that's a drill-down, not a destination.

```
⟨ TREASURY LEDGER ⟩                                          [ × ]
────────────────────────────────────────────────────────────
DAY 01 · 01 SEP                                    PRESERVED
  Allowance ₹126.67   Spent ₹30.00   Preserved ₹96.67
  Treasury → ₹3,770.00        Next allowance → ₹130.00

DAY 02 · 02 SEP                                OVER ALLOWANCE
  Allowance ₹130.00   Spent ₹150.00   Over ₹20.00
  Treasury → ₹3,620.00        Next allowance → ₹129.29

DAY 03 · 03 SEP                                 UNREGISTERED
  No entry recorded. Treasury carried forward unchanged.
...
```

One row per `computeTreasuryLedger` entry (§4.3.2 — computed, not stored), newest or
oldest first (recommend **oldest first**, matching the audit/report register — this is a
ledger, not an activity feed; contrast with the Skills Dungeon Gate list from this same
session, which intentionally showed newest-first because it's a feed of attempts, not an
accounting record). Paginated only if the list is long enough to matter — reuse the exact
prev/next pattern just shipped in `Skills.tsx`'s Dungeon Gate history (5/page, `PREV`/
`NEXT`, disabled-state styling) rather than inventing a second pagination component.

A simple sparkline/bar chart is **optional and secondary** — the prompt says "only if it
genuinely improves understanding," and a 30-row table of three numbers each is already
legible without one. If added later: one `MeterBar`-derived row per day showing spent as
a fraction of that day's allowance, no new charting dependency.

---

## 17. Visual design

**Accent stays the arc's blue.** Design/00 §2.2 is explicit and absolute: *"Gold never
appears on a daily-loop screen"* and *"If gold becomes ambient it stops meaning
anything."* Today is the daily loop by definition. The user's own prompt raises gold as a
candidate and asks for verification against the existing hierarchy — verified, and it
fails: Treasury's Today card and its REALITY block are both daily/frequent-check
surfaces, not one of the five sanctioned gold ceremonies (Start, Checkpoint, Rank
Advanced, Arc Complete, weekly distance-travelled).

**Where gold *is* correct, and only there:** `TREASURY_PERIOD_CONCLUDED` with
`verdict: 'SURVIVED'` is a genuine "something real changed" moment — it's a period ending
successfully, the same shape as Arc Complete or Rank Advanced. A one-time **Moment**
(`ui/kit/Moment.tsx`, full-screen ceremony layer, §6 of design/00) styled Gold Horizon is
the *one* place this feature earns that treatment — a `TreasurySurvivedMoment`, shown
once, gated the same way `LevelUpMoment`/`RankAdvancedMoment` already are. `EXHAUSTED`
gets no ceremony at all — a factual line only (§13), never a "failure" screen, matching
design/00 §7's rule: *"Never put a quote on a failure or recovery surface."*

**Overspending (`OVER_ALLOWANCE`/`CRITICAL`):** restrained `--state-recover` amber —
*not* `--boss`/crimson (§2.3 reserves that for BOSS surfaces exclusively) and *not* a
new colour. Same amber the recovery card and day-closed banner already use, so the
Player's colour vocabulary for "something needs attention, not danger" doesn't grow a
second hue.

**Shape, not just colour, carries state** (design/00 §6.1's "every state has a shape as
well as a colour" rule, restated for this feature): `LOCKED` shows a closed-lock glyph;
`UNREGISTERED` an empty-diamond outline (reusing the exact ◇/◆ draft/armed glyph pair
this session's own Dungeon Gate feature established in `Skills.tsx`); `PRESERVED` a
filled accent diamond; `OVER_ALLOWANCE`/`CRITICAL` the same filled diamond in amber. No
state is colour-only.

---

## 18. Motion design

Per design/00 §5.1's binary rule — nothing here gates visibility or reachability via
JavaScript:

| Element | Mechanism |
|---|---|
| Card materialising when a Treasury first exists | CSS, `system-frame-in`/`system-bracket-in` (existing keyframes, reused verbatim) |
| LOCKED → OPEN swap at 22:00 | Not an animation *of* state — the state itself is re-derived every second (§9); the input's *appearance* uses the same CSS materialise as above, replayed via `key={condition}` the same way `SystemTransmission` replays only on fingerprint change |
| Number roll on the treasury/allowance figures after registering | `framer-motion` `whileTap`-adjacent — a **flourish only**; the final digits render correctly via CSS/React state regardless of whether the roll completes, satisfying "nothing functional depends on animation" |
| Correction confirm step | `Sheet`'s existing drag-to-dismiss/focus-trap machinery, no new sheet primitive |
| `TreasurySurvivedMoment` | `ui/kit/Moment.tsx` verbatim — same tap-anywhere-dismiss, same reduced-motion collapse |

---

## 19. Timezone model

Single source of truth: `config.arc.timezone` (`Asia/Kolkata` in `DEFAULT_CONFIG`), the
exact same value and the exact same `formatInTimeZone` mechanism `engine/time.ts` already
uses for the 04:00/03:00 boundaries. **No second timezone concept is introduced.**

- `accountingOpenHour` (default 22) is a **wall-clock hour in `config.arc.timezone`**,
  read the identical way `dayCloseHour`/`dayBoundaryHour` already are — a plain number,
  not a second IANA zone identifier.
- Device timezone is irrelevant, by the same reasoning design/04 §20 already documents
  for the System Message Engine ("Clock skew / device timezone ≠ IST — Irrelevant, every
  computation goes through `formatInTimeZone(config.arc.timezone)`"). A Player travelling
  does not get a different lock hour; the Treasury (like the Arc) is defined in IST.
- `local_date` on every Treasury event is computed once at write time via the existing
  `localDate()` function and never recomputed later — identical rule to every other
  event type in the codebase (`types.ts`'s own comment: "computed at write time, never
  recomputed").

---

## 20. Edge case matrix

All 25 cases from the prompt, resolved against the model in §7–§10.

| # | Case | Resolution |
|---|---|---|
| 1 | Treasury = ₹0 | `spendableMinor(t) == 0` → `allowanceMinor = 0`. Status `CRITICAL` if `remainingDays > 0`, else `CONCLUDED/EXHAUSTED`. |
| 2 | Treasury < ₹0 | Same formula, negative numerator → `allowanceMinor` clamped to `0` for **display** (never shows a negative allowance — nothing to allow), but `spendableMinor` itself is shown as negative so the deficit is visible (§ "make overspending visible immediately"). |
| 3 | Spending > treasury | Registers normally — `DailySpendingRegisteredPayload` has no upper bound. Next day's `spendableMinor` goes negative; case 2 applies. |
| 4 | Spending == allowance | `ON ALLOWANCE` (§10) — a real, distinct state, not folded into PRESERVED or OVER. |
| 5 | Spending = ₹0 | `PRESERVED`, `preserved = full allowance`. Fully valid entry, not treated as "no entry" (§8's UNREGISTERED is a *different* case — genuinely nothing entered). |
| 6 | Remaining days = 1 | Formula handles it with no special case: `allowanceMinor(t) = spendableMinor(t) / 1`. |
| 7 | Remaining days = 0 | `t > periodEndDate` → `CONCLUDED`. Handled structurally by §7's `remainingDays(t) > 0` guard, not a separate branch. |
| 8 | User misses the 22:00 input | That date's `daily_spending` row never exists. §10: `UNREGISTERED`, permanently, in history. `spendableMinor` for later dates simply doesn't subtract anything for that date (it's honestly unaccounted, not assumed-zero-spend) — documented limitation of a manual system with no bank integration (§3, §35). Backdated catch-up entry is explicitly deferred (§35), not built in v1. |
| 9 | User opens app at 2 AM | `t` via `localDate()` is still the *previous* boundary day (04:00 boundary) unless `isDayClosed` is already true (03:00–04:00), in which case Treasury is `LOCKED` the same as every other logging surface. No special Treasury logic — inherits the app's existing day model exactly. |
| 10 | User changes timezone | Not supported — same as the rest of the app (§19). The Arc's timezone is fixed at onboarding; Treasury reuses it, never asks separately. |
| 11 | User changes device timezone | Irrelevant (§19) — computation never reads device time. |
| 12 | User changes arc end date | Means the *Arc's* end date (`db.arc`), which is architecturally separate from the *Treasury's* `period_end_date` (§3.1) — no interaction by construction. If the user meant the *Treasury's* period end: `TREASURY_RECONFIGURED` with a new `periodEndDate`, effective from the local_date it's applied — `remainingDays` recomputes correctly on the next read since it's never cached. |
| 13 | User changes starting treasury | Not directly editable — the "starting" figure is the sum of `TreasurySourceRow`s at `TREASURY_CREATED`, immutable by design (§4.3.1). A correction here is a new source addition/withdrawal (cases 14/15), which is the honest framing: you don't "edit history," you add a new fact. |
| 14 | User adds money mid-period | `TREASURY_SOURCE_ADDED` — a new `TreasurySourceRow`, folds into `spendableMinor(t)` for every `t` from its `created_at` date forward (§4.2's formula already filters on `source.created_at's local_date <= t`). |
| 15 | User withdraws money | `TREASURY_SOURCE_WITHDRAWN` — sets `active = false` on that source's row from its withdrawal date forward. The formula's `AND source.active == true` clause needs to be date-aware too, precisely: a withdrawal excludes the source from `spendableMinor(t)` for `t >= withdrawalDate`, not retroactively (§8's "don't rewrite history" principle again). |
| 16 | User corrects spending | §8, in full. |
| 17 | App is offline at 22:00 | No different from any other offline write in this app — IndexedDB is local-first (§3 of docs/08), the event is appended locally the moment the Player registers it regardless of network state, because there is no network dependency anywhere in this feature (§ "no bank API", §22). |
| 18 | App is closed at 22:00 | Nothing fires automatically — there is no background write in this architecture (matches the whole app's model: `APP_OPENED` itself only records on open, nothing runs while closed). The Player registers whenever they next open the app *during* the open window; if they open it *after* the window closed (i.e. after `dayCloseHour`), that date becomes `UNREGISTERED` (case 8). |
| 19 | App opened before AND after 22:00 in the same session | `isAccountingOpen` is re-evaluated live (§9) — the card transitions in place, no remount needed, no stale "locked" state surviving past the threshold. |
| 20 | Daylight/timezone changes | India does not observe DST; `Asia/Kolkata` has a fixed UTC offset. Not a real-world case for this deployment; `formatInTimeZone` would handle a DST-observing zone correctly regardless (IANA data, not manual offset math), if this were ever reconfigured for a different Player. |
| 21 | User imports backup | `importSnapshotJson` restores `db.event` verbatim, then `buildDomainTables` reconstructs `treasury`/`treasury_source`/`daily_spending` from the replayed log (§22) — identical mechanism to every other direct-write domain. |
| 22 | User restores old data | Same path as 21. Because `daily_spending.history[]` is itself derived from the ordered event replay, a restore reconstructs corrections in the same order they originally happened — no special-casing needed. |
| 23 | Multiple configuration versions | `TreasuryRow.status: 'active' \| 'concluded'` — a Player can have at most one **active** Treasury at a time in v1 (simplicity, per the brief's "do not overbuild" instruction), but nothing prevents a *second* `TREASURY_CREATED` after the first concludes; `db.treasury` is a table, not a singleton row, so history of past periods survives naturally. Starting a new period while one is still active is out of scope for v1 (§35). |
| 24 | Arc is paused | Treasury has **no dependency on Arc pause state** (§3.1 — deliberately decoupled). A paused Arc does not pause the Treasury's clock; money keeps accruing/depleting on real calendar days regardless of whether the Player paused their quest schedule. Flagged as a considered decision, not an oversight — worth confirming with the Player (§35), since "I paused the Arc, should my money-survival period also pause?" has a real argument either way. |
| 25 | Reduced Mode | No interaction. Reduced Mode is a streak/quest-completion state (`engine/streak.ts`); Treasury doesn't read it and isn't read by it. The two RECOVERY-tier concepts (quest Reduced Mode, Treasury CRITICAL) are allowed to be simultaneously true and independently reported (§13's cross-reference note). |

---

## 21. Data migration

**None required for existing installs.** Dexie `version(5)` is purely additive
(`treasury`, `treasury_source`, `daily_spending` are new stores; nothing existing
changes shape) — the identical situation `SCHEMA_V2_ADDITIONS`/`V3`/`V4` already handled,
each of which needed zero `.upgrade()` logic because Dexie carries unlisted stores
forward automatically. An existing Player's app updates, gains three empty tables, and
sees no Treasury card (§14's null-guard) until they complete setup.

**Onboarding is untouched.** The six-step onboarding flow (redesigned this session) is
frozen for this feature — Treasury setup is its own short flow, reachable from Profile
(a "SET UP TREASURY" row, matching `SettingsRow`'s existing vocabulary), never inserted
into the Arc's own six steps. This keeps the frozen onboarding test contract
(`tests/e2e/onboarding.spec.ts`) completely unaffected.

---

## 22. Backup / restore

Two existing functions gain new table registrations — no new export/import mechanism:

- **`exportSnapshotJson`** (`store/checkpoint.ts`): already exports `events` in full,
  which is sufficient for Treasury (a fully direct-write domain, §4) — no change to the
  function's *shape* needed, since `treasury`/`treasury_source`/`daily_spending` are
  never included verbatim the way `arc`/`profile`/`checkpoints` are (they're
  event-derivable, unlike those three).
- **`importSnapshotJson`**: its transaction's table list (currently ~20 tables) gains
  `db.treasury`, `db.treasury_source`, `db.daily_spending`. `buildDomainTables`
  (`db/domainProjections.ts`) gains a `case` for each of the seven new event types,
  producing the three new tables' rows the same way it already produces `application`/
  `dsa_problem`/`training_session`/etc. rows from their respective events.

No encryption exists in this codebase today for any exported data (career applications,
DSA problems and training data are just as "private" and travel in the same plaintext
JSON export) — Treasury data gets **the same treatment as everything else**, not a
special encrypted carve-out, per the principle that this app is already "local-first,
offline, private" (docs/08) end-to-end, not selectively for one domain. If encrypted
export is ever added, it applies to the whole snapshot, not Money specifically (flagged
in §35 only because the prompt asked; not recommended as Money-specific scope).

---

## 23. Privacy audit

| Surface | Audit finding |
|---|---|
| Local persistence | IndexedDB only, same as every other domain — no new storage mechanism. |
| Export | Plaintext JSON, same as every other domain (§22) — no regression, no improvement, consistent. |
| Import | Validated (`ImportValidationError`) before any write, same as every other domain. |
| Console logs | **New rule for this feature specifically**: no `console.log`/`console.error` in any Treasury store/engine function may include `amountMinor`, `spendableMinor`, or any derived money figure — errors log the *operation* ("failed to register spending") never the *value*. Enforced by code review at implementation time (§29 has a corresponding test-strategy note); no existing lint rule catches this automatically, flagged as a manual-review item. |
| Network | Zero — no fetch, no API, matching §22's "no bank API" boundary absolutely. Verifiable the same way `design/04 §25`'s acceptance criterion 7 already verifies the voice engine: "No `Math.random()`, no `fetch`... anywhere in the feature." |
| Screenshots / demo mode | The app has no demo mode. Not applicable. |
| Debug tools | None exist in production builds today; not introduced by this feature. |
| Analytics | None exist in this codebase at all (confirmed by the absence of any analytics import anywhere in `src/`) — nothing to audit. |

---

## 24. Test strategy

Mirrors design/04's own three-tier plan exactly (§19 of that document), applied to this
domain:

1. **`tests/engine/treasury.test.ts`** — pure, no Dexie. The allowance formula, the
   status state machine, `isAccountingOpen`, edge cases 1–9 from §20 as literal test
   cases.
2. **`tests/engine/treasury-store.test.ts`** — fake-indexeddb, the `*-store.test.ts`
   convention every Dexie-backed module here already uses. Registration, correction
   folding, source add/withdraw, ledger recomputation, import/export round trip.
3. **`tests/engine/treasuryVoice.test.ts`** — mirrors `systemVoice.test.ts`'s structure:
   content integrity, determinism, cooldown, variety.
4. **`tests/e2e/treasury.spec.ts`** — Playwright. Setup flow, locked state before 22:00
   (via `page.clock.install`, the exact pattern every existing spec already uses for
   `SAFE_TIME`), registration after 22:00, correction, history sheet, REALITY block
   rendering, responsive check at 320px (reusing `responsive.spec.ts`'s existing
   viewport matrix rather than duplicating it).

## 25. Unit test cases (representative, not exhaustive — full list expands §20's table)

- `allowanceMinor` matches both of the prompt's own worked examples exactly, in paise.
- `allowanceMinor` floors, never rounds — a case where floor vs. round differ is asserted
  explicitly (e.g. `spendableMinor = 100`, `remainingDays = 3` → `33`, not `33.33` rounded
  to `33` by coincidence — pick a case where naive rounding would differ, e.g. `101/3`).
- Negative `spendableMinor` yields `allowanceMinor` clamped to 0 for display,
  unclamped for the raw figure used in status derivation.
- `remainingDays(periodEndDate) == 1`; `remainingDays(periodEndDate + 1) == 0`.
- A source added mid-period does not retroactively change `spendableMinor` for dates
  before its `created_at`.
- A withdrawal does not retroactively change `spendableMinor` for dates before its
  withdrawal date.
- Correcting day 3's spend changes the *computed* ledger for days 4+ on the next read,
  with no stored row for days 4+ needing to change.
- `DAILY_SPENDING_REGISTERED` is idempotent per `(treasuryId, localDate)` via idem_key;
  a duplicate call is a no-op, mirroring `logInterviewBenchmark`'s existing test pattern.
- `TREASURY_PERIOD_CONCLUDED` fires with `verdict: 'EXHAUSTED'` when final
  `spendableMinor < 0`, `'SURVIVED'` when `>= 0` (including exactly `0`).

## 26. Property / invariant tests

Following `tests/engine/fuzz.test.ts`'s existing pattern (10,000 random seeds over
`buildProjections`) — this codebase already has a fuzz harness; Treasury reuses its
shape rather than inventing a new one:

- **Conservation**: for any random sequence of source-adds/withdrawals/spend-
  registrations/corrections, `spendableMinor(t)` always equals
  `Σ(active, non-protected source amounts as of t) − Σ(daily_spending amounts for d < t)` —
  recomputed two independent ways (direct sum vs. fold-through-`computeTreasuryLedger`)
  and asserted equal, every seed.
- **Monotonic days**: `remainingDays(t)` is strictly decreasing as `t` advances by one
  calendar day, for any fixed `periodEndDate`.
- **Correction commutativity within a day**: registering ₹80 then correcting to ₹90
  yields the same current state as if ₹90 had been the original registration — *except*
  `history.length` and `corrected`, which must differ (the correction is remembered even
  though the current value converges).
- **No negative allowance ever displayed**: for any random walk of the state, the
  *displayed* `allowanceMinor` is never negative, even when `spendableMinor` is.
- **Import/export round trip**: for any random sequence of Treasury events, `export →
  wipe → import → recompute` yields byte-identical `daily_spending`/`treasury_source`
  rows to the pre-export state (mirrors an existing pattern this app likely already
  fuzzes for the core event log, per `fuzz.test.ts`'s stated scope — confirm and extend
  rather than duplicate at implementation time).

## 27. Manual mobile test cases

1. At 320px, the Treasury card (locked state) shows no horizontal scroll and no clipped
   figure — the exact overflow class of bug fixed in `Skills.tsx` this session; this is
   the first thing to check given how recently that exact failure mode showed up in this
   codebase.
2. Registering a spend amount with the on-screen numeric keyboard open does not push the
   `REGISTER` button off-screen or behind the keyboard.
3. The countdown-to-22:00 (if shown) does not visibly stutter or reset on backgrounding
   and returning to the tab (reuses `useCountdown`'s existing visibility-change handling —
   verify it, don't assume it).
4. Text scale XL (§ design/00 rule 10) — the ledger history Sheet's three-line-per-day
   rows don't clip the largest figures.
5. `prefers-reduced-motion: reduce` — the LOCKED→OPEN transition and the
   `TreasurySurvivedMoment` both render their finished state instantly, no stuck opacity.
6. Correction confirm dialog is reachable and dismissible with the app's existing back-
   gesture handling (`design/02`'s overlay-stack contract) — verify it doesn't introduce
   a second, conflicting "back closes X" target.

---

## 28. Exact files to modify

| File | Change |
|---|---|
| `src/engine/types.ts` | +7 `EventType` union members, +7 payload interfaces (§4.1, §4.2). |
| `src/engine/reduce.ts` | +7 explicit cases in `applyOne`'s switch (no-op, matching the career/DSA/training precedent — Treasury doesn't fold into `EngineState`). |
| `src/db/schema.ts` | +`SCHEMA_V5_ADDITIONS`, +3 Row interfaces (§4.3). |
| `src/db/db.ts` | +3 `Table` declarations, `this.version(5).stores({...SCHEMA_V1, ...V2, ...V3, ...V4, ...V5_ADDITIONS})`. |
| `src/db/domainProjections.ts` | +7 cases in `buildDomainTables`'s switch, producing the three new tables' rows from events. |
| `src/store/checkpoint.ts` | `importSnapshotJson`'s transaction table list gains the three new tables. (`exportSnapshotJson` needs no change — §22.) |
| `src/ui/screens/Today.tsx` | +1 import, +1 state/effect (mirrors the `SystemTransmission` wiring in design/04 §21), +1 element between the transmission and the quest window. |
| `src/ui/screens/Progress.tsx` | `RealityTab` gains a new block (§15) — additive JSX + one new store call. |

## 29. New files to create

| File | Purpose |
|---|---|
| `src/engine/treasury.ts` | Pure: allowance formula, status state machine, `isAccountingOpen`, `computeTreasuryLedger`. |
| `src/engine/treasuryVoice.ts` | Pure: the small Treasury caption message taxonomy + selection (§13). |
| `src/engine/treasuryVoicePack.ts` | Static content — the ~40–55 caption lines. |
| `src/store/treasury.ts` | Write path (`createTreasury`, `addSource`, `withdrawSource`, `registerSpending`, `correctSpending`, `reconfigureTreasury`) + read path (`getTreasurySummary`, `getTreasuryLedger`, `getTreasuryRealityMetrics`). |
| `src/ui/today/TreasuryCard.tsx` | The compact Today surface, all four states (§14). |
| `src/ui/today/TreasurySetupSheet.tsx` | One-time setup flow (sources, period, protected reserve). Reached from Profile, not onboarding (§21). |
| `src/ui/progress/TreasuryHistorySheet.tsx` | The paginated ledger (§16). |
| `src/ui/moments/TreasurySurvivedMoment.tsx` | The one Gold Horizon ceremony (§17). |
| `tests/engine/treasury.test.ts` | §24, §25, §26. |
| `tests/engine/treasury-store.test.ts` | §24. |
| `tests/engine/treasuryVoice.test.ts` | §24. |
| `tests/e2e/treasury.spec.ts` | §24, §27. |
| `design/08-MONEY-DISCIPLINE-PLAN.md` | This document. |

No changes to `design/02-NAVIGATION-FLOW.md`'s route table (no new route — §16), no
changes to `ui/onboarding/*` (§21), no changes to `engine/attributes.ts`/
`ui/components/AttributeBars.tsx` (§11), no changes to `engine/xp.ts`/`engine/config.ts`'s
XP constants (§12).

---

## 30. Implementation phases

Mirrors design/04's own phase table shape (§23 there), each phase independently
testable and committable, per the brief's `PLAN → DESIGN → IMPLEMENT → TEST → RUN →
VERIFY → REVIEW → FIX → COMMIT` loop:

| Phase | Work | Gate |
|---|---|---|
| P1 | `engine/treasury.ts` — formula, state machine, lock gate. Pure, no I/O. | Unit tests §25 pass against hand-computed fixtures (the prompt's own two worked examples, verified in §7). |
| P2 | `engine/types.ts` + `db/schema.ts` + `db/db.ts` (version 5) + `engine/reduce.ts` cases + `db/domainProjections.ts` cases. | `npm run typecheck`; existing test suite still green (additive-only schema change, §21). |
| P3 | `store/treasury.ts` — write + read paths. | `tests/engine/treasury-store.test.ts` passes; manual Dexie inspection confirms row shapes match §4.3. |
| P4 | `engine/treasuryVoice.ts` + `engine/treasuryVoicePack.ts`. | `tests/engine/treasuryVoice.test.ts` passes; content-integrity checks mirror `systemVoice.test.ts`'s own (§24). |
| P5 | `ui/today/TreasurySetupSheet.tsx` + the write side of `store/treasury.ts` wired to it. | Manual: can complete setup, see a row in `db.treasury`. |
| P6 | `ui/today/TreasuryCard.tsx`, all four states, wired into `Today.tsx`. | `tests/e2e/treasury.spec.ts`'s locked/open/registered cases pass; §27 manual pass at 320px. |
| P7 | `ui/progress/TreasuryHistorySheet.tsx` + `Progress.tsx`'s `RealityTab` block. | Remaining e2e cases pass; history matches hand-computed ledger for a scripted week of entries. |
| P8 | `ui/moments/TreasurySurvivedMoment.tsx` + `TREASURY_PERIOD_CONCLUDED` firing logic. | Manual: fast-forward a test fixture past `periodEndDate`, confirm the Moment fires once and only once. |
| P9 | `store/checkpoint.ts` export/import registration (§22, §28). | Round-trip property test (§26) passes. |
| P10 | Full `npm run verify` + responsive sweep at 320/360/430/768/1024 + the full e2e suite. | Suite green, including everything pre-existing. |

Each phase is a separate commit per the brief's instruction not to implement the whole
feature in one operation.

## 31. Loop-by-loop development plan

One `PLAN → DESIGN → IMPLEMENT → TEST → RUN → VERIFY → REVIEW → FIX → COMMIT` cycle per
phase in §30 — ten loops. Phases P1–P4 have no UI and can be built and fully tested
without touching `Today.tsx`/`Progress.tsx` at all, which means the highest-risk
integration points (§ "Risks," §33) are deferred until the underlying math and data
model are already proven correct by unit and property tests — the same order this
session's own Skills.tsx work implicitly followed (fix the structural bug, verify with a
script, *then* touch the visual layer).

---

## 32. Acceptance criteria

1. The two worked examples in the prompt reproduce exactly, in the UI, to the paisa.
2. Before 22:00 IST, the spend input is genuinely disabled (not just visually dimmed —
   an e2e test attempts to type into it and asserts nothing happens).
3. After 22:00, registering once locks that date; a second identical registration is a
   no-op (idem_key), and the UI shows `CORRECT`, not a second `REGISTER`.
4. A correction preserves the original value in `history[]`, never deletes it.
5. Money Discipline never appears as a fifth bottom-nav tab.
6. Money Discipline never contributes to `total_xp`, any `XpCategory`, or any of the six
   existing Attributes (§11, §12 — verified by a test asserting `getAttributes()`'s
   output is bit-identical with and without Treasury events in the log).
7. Gold accent appears **only** on the `TreasurySurvivedMoment`; every other Treasury
   surface uses the arc's blue (§17 — verified by a visual/DOM check, not just review).
8. The feature works fully offline (no `fetch` anywhere in `engine/treasury.ts` or
   `store/treasury.ts` — same literal check design/04 §25 already runs for the voice
   engine).
9. `importSnapshotJson` round-trips Treasury data with zero loss (§22, §26).
10. `npm run verify` is green, including every pre-existing test.
11. Every Treasury voice line is original (§13 — no published-work quotation).

## 33. Definition of done

All of §32, plus:

- Every file in §28/§29 exists and matches the shapes specified in §4/§9/§10/§13.
- `design/00 §10`'s frozen contract is unmodified — no existing testid, accessible name,
  route path, or IndexedDB store shape changed (only additions).
- The Skills.tsx overflow lesson from this same session (`max-w-* mx-auto` inside a flex
  parent) is explicitly checked against `TreasuryCard`/`TreasurySetupSheet`/
  `TreasuryHistorySheet` before merge — not assumed absent.
- A second engineer (or a fresh read-through) can trace every displayed number on the
  Treasury card back to a specific line in §7's formula with no hidden state.

## 34. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| The 22:00 lock is trivially bypassable by editing IndexedDB directly (browser devtools) | Low | Accepted — this is a personal single-user local-first app with no server boundary; the lock is a *discipline* mechanic, not a security boundary. Documented so it's not mistaken for one later. |
| An unregistered day (§20 case 8) silently understates real-world spend, making future allowance look more generous than reality | **Medium** | This is an inherent property of manual entry with no bank integration (an explicit product boundary, not a bug) — mitigated by making `UNREGISTERED` a visible, permanent history state (§10) rather than hiding the gap, and by the System's own honest caption (§13: `THE DAY CLOSED UNACCOUNTED.`). Not solvable without violating the "no bank API" boundary; documented rather than "fixed." |
| Treasury and Arc pause states diverging confuses the Player (§20 case 24) | Medium | Flagged as an open question (§35) rather than guessed at — needs the Player's actual preference before P5. |
| A future Attribute/XP tie-in (§11, §12) gets added later without re-reading this document's reasoning | Medium | This document states the reasoning inline, not just the conclusion, specifically so a later change can be evaluated against it rather than re-derived from scratch. |
| Rounding/floor behaviour (§7) surprises a Player who expects "round to nearest paisa" | Low | Documented explicitly in §7 and covered by an explicit test (§25) picking a case where floor and round differ. |
| Seven new event types is a meaningful surface-area increase to `reduce.ts`'s exhaustive switch, which every future event-type addition must now also account for | Low | Matches the exact precedent every other domain already set (career: 5, DSA: 2, training: 5) — not a new pattern, just more of an existing one. |

## 35. Open questions

All 6 decisions resolved before implementation:

1. **Does pausing the Arc also pause the Treasury?** (§20 case 24.) Two defensible
   answers exist; this plan defaults to "no interaction".
   - **RESOLUTION: CONFIRMED.** No interaction. Treasury operates on real calendar days and does not pause when an Arc is paused.

2. **What happens if the Player wants to start a new Treasury period while one is still active** (§20 case 23)?
   - **RESOLUTION: CONFIRMED.** v1 supports at most one active period (`status: 'active'`). Concluding a period allows a new one to be created.

3. **Should a missed (`UNREGISTERED`) day ever be backdated-correctable**, the way `QUEST_RECOVERED` lets a missed quest day be claimed the next day?
   - **RESOLUTION: CONFIRMED DEFERRED.** Deferred for v1. Missed days remain `UNREGISTERED` in history.

4. **`accountingOpenHour` — configurable per-Treasury from day one, or hardcoded to 22 for v1** with the field present in the data model?
   - **RESOLUTION: CONFIRMED.** Data model carries `accountingOpenHour` (default 22 per Treasury); UI hardcodes 22 for v1.

5. **Currency**: `CurrencyCode` as a union from day one (`'INR' | 'USD' | 'EUR' | 'GBP'`) defaulting to `'INR'`.
   - **RESOLUTION: CONFIRMED.** Implemented as `'INR' | 'USD' | 'EUR' | 'GBP'` with `'INR'` default.

6. **The MONEY DISCIPLINE Attribute** (§11) — no new Attribute in v1.
   - **RESOLUTION: CONFIRMED.** No 7th attribute in v1. Treasury evidence lives in `REALITY` (`Progress` tab).

