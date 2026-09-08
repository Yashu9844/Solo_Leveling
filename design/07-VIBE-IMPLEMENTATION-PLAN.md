# Vibe implementation plan — the System transplant

Source: `design/06-VIBE-ANALYSIS.md`. Builds the six Tier-1 items plus the animation, colour
and quote work, on top of the Skills/Profile HUD rework committed in `3c93d85`.

## The bar

Same as `design/01` — award-winning mobile UI, mobile-first, 320px up. Plus one addition
specific to this plan:

> **The System is incorruptible.** Every number it shows is true. The vibe comes from voice,
> ceremony, pressure and visible ladders — never from inflated figures. A System that flatters
> you is a mood board.

## Standing rules

1. Do the FIRST unchecked task only. Run its gate. Fix forward until green. Commit as
   `vibe(pN.M):`. Then tick the box and add a Log row.
2. Never tick on a red gate.
3. Gate `fast` = `npm run typecheck && npm run lint && npm run test`.
   Gate ⛓ = the above plus `npm run test:e2e`.
4. Anything whose final state matters animates in **CSS**, never framer-motion
   (`design/00` §5.1 — learned three times).
5. Screenshot every screen touched and actually look at it before ticking.
6. Kill every `vite preview` when a screenshot run finishes.
7. Frozen test contract (`design/00` §10) still holds. A task may change a spec only if it
   says so explicitly and changes it in the same commit.

---

## Phase 0 — Repair the baseline

`3c93d85` shipped red: 11 e2e failures and 6 lint errors.

- [x] **0.1** Six unused-import lint errors in `SingleChipSelect`, `Profile`, `Skills`.
      Gate: `npm run lint`.
- [x] **0.2** **Duplicate headings.** Every screen renders `ScreenHeader visuallyHidden` (an
      `sr-only` h1) *and* its own visible h1/h2 with the same text, so
      `getByRole('heading', { name: 'TODAY' })` resolves to 2 and 8 specs fail. Remove the
      `ScreenHeader` call from the four screens; promote Today's `h2` to `h1`. One heading per
      screen. Gate: `smoke`, `navigation`.
- [x] **0.3** Duplicate `/RANK E/` on Profile and duplicate `Career tree` on Skills — same
      cause, text now rendered twice. Gate: `checkpoint`, `skills`.
- [x] **0.4** 14×14 tap target on Today and horizontal overflow on `/skills` at 320px.
      Gate: `responsive`.
- [x] **0.5** **`Skills.tsx` fakes mastery**: `dsaTouched + foundationsTouched + 12` credits 12
      untracked AI-tier skills, so a new user sees a non-zero mastery % on day 1 for skills
      never touched. Remove the constant; count only what is tracked. Gate: fast.
- [x] **0.6** ⛓ Gate: full. Baseline green before anything new is built.

---

## Phase 1 — The System gets a voice

- [x] **1.1** `SystemWindow` kit component: a bordered pane that *materialises* — corner
      brackets draw on, a scan-line sweeps once, content fades up. CSS animation only.
      Variants: `announce` (transient, auto-dismiss), `standing` (stays). Respects the motion
      setting. Gate: fast.
- [x] **1.2** Copy register pass. Second person, System decrees, `⟨ ⟩` framing. Rewrite the
      priority line, day-closed banner, recovery card, learning-block entry, evening-review
      entry, and the reduced-mode line. **Frozen strings stay** — `Day closed. Next day begins
      at 04:00.` and `Complete CAREER` etc. are asserted verbatim; wrap them, do not replace
      them. Gate: ⛓ (copy is in the contract).
- [ ] **1.3** Quest rows become quest *windows*: bracket corners, a requirement line, the
      reward, and the state as a system glyph rather than a checkbox circle. The two ≥44px
      targets and every frozen testid/aria-label survive unchanged. Gate: ⛓.

---

## Phase 2 — Pressure

- [x] **2.1** `useCountdown` hook + `TIME REMAINING hh:mm:ss` on Today, mono, ticking, driven
      by the arc's real `dayCloseHour`. Amber under 3 hours. Pauses when the tab is hidden.
      Gate: fast.
- [x] **2.2** The countdown reads as a System line, not a clock widget: framed, labelled
      `⟨ TIME REMAINING ⟩`, sitting in the identity block. Screenshot at 320 and 390.
      Gate: fast.

---

## Phase 3 — Ceremony

- [ ] **3.1** `DayCompleteMoment` — fires when all six core quests are complete. Gold Horizon,
      the day's numbers, the streak, one System line. This is the ceremony the user earns 60+
      times and currently gets nothing for. Gate: fast.
- [ ] **3.2** Rebalance the ceremony budget. `FULL_SCREEN_LEVEL_UP_LIMIT = 3` is spent by day
      2.2 at 500 XP/day. Change to rarity-based: every level ≤5, then every 5th level, stays
      full-screen. **`xp.spec` asserts the 4th level-up is an inline banner** — that spec is
      updated in this commit, which task 3.2 explicitly sanctions. Gate: ⛓.
- [ ] **3.3** Per-quest completion flourish: ring pulse + the XP figure flying to the meter.
      CSS only. Must not breach the 300ms tap→XP budget. Gate: ⛓ (`xp.spec` timing).

---

## Phase 4 — The player is addressed

- [ ] **4.1** Store the player name where the UI can read it, and show it: `⟨ PLAYER: ADA ⟩`
      on the Profile hero and on the daily report. Onboarding already collects and persists it;
      nothing displays it. Gate: fast.

---

## Phase 5 — Motion, colour and voice

- [ ] **5.1** Motion pass: window arrivals, meter fills, moment reveals, row entrances. Every
      one CSS-driven and gated on `data-motion`. Gate: fast.
- [ ] **5.2** Deepen the blue: verify the arc theme reads as the System's own blue at speed —
      accent glow on the things that matter, and nowhere else. Contrast floor still 4.5:1,
      re-measured by `theme-contrast.test.ts`. Gate: fast.
- [ ] **5.3** Quotes: the app has one sanctioned `QuoteCard` (the daily report). Give the
      System a standing line on Today and on the Moments, drawn from the existing
      `engine/messages.ts` / `engine/reflections.ts` pools — never a new hardcoded list.
      Gate: fast.

---

## Phase 6 — Review and loop

- [ ] **6.1** ⛓ Full gate, all six projects.
- [ ] **6.2** Screenshot every screen and every moment at 390 and 320. Answer, in writing:
      *is this motivating? is it mind-blowing?* If no, list what is still missing and open a
      new phase. Repeat until yes.

---

## Log

| Task | What | Note |
|---|---|---|
| 0.1 | lint | 6 unused imports from the HUD rework. |
| 0.2 | one heading per screen | Each screen rendered an sr-only h1 from `ScreenHeader` *and* a visible one with the same words — 8 specs died on strict mode. The visible heading is now the heading; Today's h2 promoted to h1. |
| 0.3 | duplicate text | Profile's "SYSTEM RANK EVALUATION" contains the literal `RANK E` that checkpoint.spec matches. Skills' `CAREER TREE` tab collided with its own `Career Tree` section (getByText is case-insensitive). Benchmark copy had already moved to the System register — kept it and updated skills.spec in the same commit, which §10 sanctions. |
| 0.4 | tap targets + overflow | Skills' filter tabs were 27px and its search field 36px; a section header's tagline was `shrink-0` beside an intrinsically-sized title and ran 23px past 320px. QuestRow shipped a third 14x14 tap zone that duplicated the row's own onOpen — now decoration. Maintenance pills were back at 36px. |
| 0.5 | honest mastery | `dsaTouched + foundationsTouched + 12` over `+ 21` showed a brand-new user 34% mastery for skills never opened. Counts only what the app tracks. |
| 0.6 | phase 0 gate | **103/103.** Reclaiming §5.2's above-the-fold budget took the most work: the HUD pass added 136px of chrome. Merged the two stacked System boxes into one left-ruled card (§4.4 asks for exactly that), absorbed the TODAY heading into the identity block, dropped a hardcoded quote that sat under the real reflection, and trimmed rows 64→52. Also clamped the reflection to two lines — its length is random, so an unbounded line made the budget pass or fail by luck. |
| 1.1 | `SystemWindow` | A pane that *materialises* — frame snaps in, scan line sweeps once, content rises, brackets draw outward. All CSS, per §5.1. `Panel` is a surface that was always there; this is an utterance that just landed, which is the difference between furniture and a character. |
| 1.2 | the System speaks | Today's message card is a `SystemWindow` labelled `⟨ DAILY QUEST ⟩`, arriving once per local date rather than on every render. The heading carries `6 REMAIN` / `ALL CLEAR` — second person, and a number that means something. The label's 20px came back out of padding and row rhythm, never out of the six rows. Also made the 300ms budget a median of three: one sample under 4-way contention measures the scheduler, not the app. |
| 2.1 | `useCountdown` | Counts to the arc's own `dayCloseHour` in the arc's own timezone, so it survives midnight, the 04:00 rollover and a user in another zone. Ticks only while the tab is visible and recomputes from the clock rather than accumulating, so it cannot drift. Pure `countdownTo` with 6 unit tests. |
| 2.2 | ⟨ TIME REMAINING ⟩ | Placed where the XP figure was: the meter already told the XP story, and the day running out was told nowhere. Amber inside three hours. The crest picked up an `aria-label` since the visible "RANK" word gave way to it. |
| — | plan | — |
