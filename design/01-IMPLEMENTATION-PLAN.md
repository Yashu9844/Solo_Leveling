# Frontend Redesign — Implementation Plan & Loop State

**Read `design/00-DESIGN-SYSTEM.md` first.** That is the *what*. This is the *order*.

This file is **live state**. The development loop reads it, does the first unchecked
task, and ticks it. Do not reorder tasks; each depends on the ones above it.

- **Branch:** `frontend-redesign` (cut from `slice-13-ship`)
- **Baseline at plan time:** typecheck ✓ · lint ✓ · 47 test files / 358 unit tests ✓
- **Commit granularity:** one task = one commit, prefixed `design(pN.M):`

---

## Loop protocol

Every iteration, in order:

1. Open this file. Find the **first unchecked** `- [ ]` task.
2. Implement exactly that task. No scope creep into later tasks.
3. Run the task's stated gate:
   - **Fast gate** (every task): `npm run typecheck && npm run lint && npm run test`
   - **Full gate** (tasks marked ⛓): fast gate **plus** `npm run test:e2e`
4. If red: fix forward in the same iteration. Never tick a task on a red gate. If a
   failure is a *deliberate* copy change, update the spec in the same commit and say so
   in the commit body.
5. Commit.
6. Tick the box, append a one-line note under **Log**, and stop the iteration.

**Stopping condition:** every box ticked → post the summary in `## Handover`, then end
the loop.

**Escalate to the user instead of guessing only if:** a gate is red for reasons unrelated
to the current task and the fix would change engine/store behaviour; or a task requires
deleting a `data-testid` or an asserted string that §10 of the design system freezes.

---

## Phase 0 — Foundations

No visible change. Everything after this depends on it.

- [x] **0.1** Cut branch `frontend-redesign`. Add deps: `framer-motion@^11`,
      `@phosphor-icons/react@^2.1`, `@fontsource/inter`,
      `@fontsource/cormorant-garamond`, `@fontsource/jetbrains-mono`; devDep `sharp`.
      Pin exact majors that support React 18.3. Gate: fast.
- [ ] **0.2** `src/ui/tokens.css` → v2 token set (design system §3). **Keep every v1
      token name as an alias** (`--bg: var(--void)` etc.) so nothing breaks mid-migration.
      Extend `tailwind.config.js` with the new colour ramps, `fontFamily`
      (sans/display/mono), the §4 type scale, `--cut-*` sizes and glow shadows.
      Gate: fast.
- [ ] **0.3** `src/index.css`: utilities `.cut-sm/.cut-md/.cut-lg`, `.glow-text`,
      `.no-scrollbar`, `.hairline`, focus-visible ring, `@keyframes pulse-glow /
      shimmer-sweep / ring-pop`. Wire the three font families in `main.tsx` (enumerated
      weights only) and wrap the tree in `<MotionConfig reducedMotion="user">`.
      Gate: fast.
- [ ] **0.4** Art pipeline: `design/art.manifest.json` (slot → source filename, §2.1),
      `scripts/import-art.mjs` (sharp; 640w + 1280w webp + 20px LQIP; per-file 180 KB and
      total 1.2 MB budget, fails loudly), `npm run art` script. Run it against the four
      images present. Generate typed `src/assets/art/index.ts`. Every unfilled slot must
      export a procedural-gradient fallback. Gate: fast.
- [ ] **0.5** `vite.config.ts`: add `webp` to PWA `globPatterns`, set
      `maximumFileSizeToCacheInBytes` to the largest emitted art file, confirm total
      precache ≤ 3 MB. ⛓ Gate: full — proves the redesign starts from green.

## Phase 1 — The kit (`src/ui/kit/`)

Primitives only. Nothing is wired into a screen yet.

- [ ] **1.1** `ScreenShell` (min-h-dvh, radial ground, ≥640px device frame), `SafeTop`
      (real safe-area padding — **no fake status bar**), `PageTransition`. Gate: fast.
- [ ] **1.2** `ScreenHeader`, `SectionLabel`, `Panel`, `FramedPanel` (corner brackets),
      `QuoteCard`. Gate: fast.
- [ ] **1.3** `PrimaryButton`, `SecondaryButton`, `QuietButton`, `IconTile`. All ≥44px,
      all forward `aria-*` and `disabled`, all accept `data-testid`. Gate: fast.
- [ ] **1.4** `MeterBar`, `SegmentBar` (5-segment mastery), `StatTile`, `Segmented`
      (`layoutId` pill). Gate: fast.
- [ ] **1.5** `Sheet` base: scrim, `max-h-[86dvh]`, drag-to-dismiss, focus trap, `Esc`,
      safe-area bottom padding, scroll lock, `role="dialog"` + `aria-modal`. Gate: fast.
- [ ] **1.6** `ArtLayer` (LQIP → srcset swap, `aria-hidden`, `pointer-events-none`,
      configurable scrim gradient, gradient fallback when a slot is unfilled) and
      `Moment` base (black ground, `FramedPanel`, art band, tap-anywhere dismiss).
      Gate: fast.

## Phase 2 — Boot: Splash → Start

The one place the plan touches a test helper. See design system §10.

- [ ] **2.1** `src/ui/boot/Splash.tsx` — replaces `App.tsx`'s blank
      `status === 'loading'` div. Wordmark `SYSTEM` (Cormorant, +0.34em), hairline sweep,
      `DISCIPLINE CREATES FREEDOM`. Minimum on-screen 900 ms so it never flickers;
      dismisses as soon as arc status resolves *and* the minimum has elapsed.
      Respects reduced motion. Gate: fast.
- [ ] **2.2** `src/ui/boot/Start.tsx` at route `/start` — full-bleed `start-hero` art
      under a 4-stop vertical scrim, wordmark, `A STRONGER YOU IN ANOTHER 120 DAYS`,
      hairline divider, `BEGIN YOUR JOURNEY` → `/onboarding`. No arc → `/` redirects to
      `/start`; arc exists → `/start` redirects to `/today`. Gate: fast.
- [ ] **2.3** `tests/e2e/helpers.ts`: add the single `BEGIN YOUR JOURNEY` click to
      `reachStep6`. New `tests/e2e/boot.spec.ts`: splash appears then clears; `/start`
      renders with no arc; `/start` redirects to `/today` with an arc; a returning user
      never sees Start. ⛓ Gate: full.

## Phase 3 — Shell & navigation

- [ ] **3.1** `AppShell`: `ScreenShell` + phosphor bottom nav (House / Shield / ChartBar /
      UserCircle), active = `accent-mid` + `weight="fill"`, inactive `--ink-900`,
      `whileTap` 0.88, safe-area bottom. **Frozen:** `role="navigation"`,
      `aria-label="Primary"`, link names `TODAY PROGRESS SKILLS PROFILE`. Gate: fast.
- [ ] **3.2** `App.tsx`: `AnimatePresence mode="wait"` keyed on `location.pathname`, each
      route wrapped in `PageTransition`. Verify no double-mount of data effects.
      Gate: fast.
- [ ] **3.3** Every screen gets `ScreenHeader` with its frozen `h1` name. ⛓ Gate: full
      (`smoke.spec.ts` is the exact contract here).

## Phase 4 — Onboarding (612 lines, 6 steps)

- [ ] **4.1** Chrome: `ScreenShell`, `onboarding` art on steps 1 and 6, a 6-segment step
      rail replacing the bare `1/6`, `FramedPanel` per step, `PrimaryButton` footer
      pinned above the safe area. Gate: fast.
- [ ] **4.2** Steps 1–3 (framing / arc / rhythm). Keep placeholder `Your name` and button
      names `Begin` / `Next` verbatim. Gate: fast.
- [ ] **4.3** Steps 4–6 (main quest / if-then / baseline). Keep the main-quest placeholder
      and `Initialise system` verbatim. Adopt kit versions of `ChipToggle`, `Stepper`,
      `SingleChipSelect`, `DotPicker`. Step 5 is the product's most important screen —
      give it the `FramedPanel` + accent-rule treatment. Gate: fast.
- [ ] **4.4** ⛓ Gate: full (`onboarding.spec.ts`).

## Phase 5 — Today (the core loop)

- [ ] **5.1** Header block: `today` art bleeding from the top-right at
      `mix-blend-lighten` under a directional scrim; `DAY nn` in display type; a
      LEVEL / XP `MeterBar` / RANK panel split like the reference dashboard; streak line
      in mono. Preserve `data-testid="xp-bar-fill"`. Gate: fast.
- [ ] **5.2** `QuestRow`: `IconTile` per quest key, title + `ROW_SUMMARY`, mono XP right,
      accent-filled glowing circle on complete. **Frozen:** two ≥44px targets,
      `aria-label` `Complete X`/`Undo X`, `aria-pressed`,
      `data-testid="quest-row-<key>"` and `-open`, the state glyphs. Gate: fast.
- [ ] **5.3** Secondary blocks as `Panel`s with `SectionLabel` headers: weekly quest
      (`weekly-quest-progress`), revisits (`revisits-due`), `MaintenanceCard`, learning
      block button, evening-review entry. Gate: fast.
- [ ] **5.4** Status surfaces: recovery card (`recovery-card`, `--state-recover`, never
      red, no quote), day-closed banner (string frozen), level-up inline banner, system
      line (`system-line`, left accent rule, no box), error notice. Gate: fast.
- [ ] **5.5** ⛓ Gate: full — `core-loop`, `xp`, `streak`, `reflections`,
      `weekly-quest`, `offline`. Explicitly re-confirm the **<300 ms tap→XP** budget.

## Phase 6 — Sheets

- [ ] **6.1** `QuestDetailSheet` on the `Sheet` base. If-then sentence in a `FramedPanel`.
      Stays quote-free (design system §7). Gate: fast.
- [ ] **6.2** `LogApplicationSheet`, `LogProblemSheet`, `LogBuildSessionSheet`.
      Gate: fast.
- [ ] **6.3** `LogTrainingSheet`, `LogSleepSheet`, `LogAttentionSheet`,
      `LearningBlockSheet`. Gate: fast.
- [ ] **6.4** ⛓ Gate: full — `career`, `dsa`, `build`, `build-artifact-kind`,
      `physical-lifestyle`, `body-metrics`, `learning-block`, `deep-work-timer`.

## Phase 7 — Progress & Skills

- [ ] **7.1** Progress chrome + SYSTEM sub-tab: `Segmented` for SYSTEM/REALITY, a
      `progress`-art level card (level, XP meter, rank) mirroring the reference, then
      `AttributeBars` regrouped under MIND / CRAFT / CAREER / BODY `SectionLabel`s,
      weekly-review entry. Gate: fast.
- [ ] **7.2** REALITY sub-tab: a proper Day-0 → Now two-column table, mono tabular,
      label truncates and value never does. Preserve `data-testid="reality-tab"`.
      Gate: fast.
- [ ] **7.3** Skills: `skills` art header band, `SegmentBar` topic rows for DSA and
      Foundations, AI tiers as chip clusters, career tree as data rows, interview
      benchmark as a `FramedPanel`. Gate: fast.
- [ ] **7.4** ⛓ Gate: full — `skills`, `attributes`.

## Phase 8 — Profile, Checkpoint, Reviews

- [ ] **8.1** Profile chrome + `LevelSummary` hero + `CheckpointRow` (*"the app's most
      important sentence"* — give it the strongest non-Moment treatment on the screen) +
      `BossList` (the **only** place `--boss` red appears) + `AchievementsList`.
      Gate: fast.
- [ ] **8.2** Data cards: `BackupCard`, `PaperImportCard`, `InstallCard`,
      `BodyMetricsCard`, arc-pause control, dev-only blocks (kept visually quarantined in
      `--state-alert`). Gate: fast.
- [ ] **8.3** `CheckpointScreen` + `CheckpointInstrumentsCard` + `InstrumentSliders` —
      entry form and report, `FramedPanel`, rank-gate checklist with ✓/✗ shapes.
      Gate: fast.
- [ ] **8.4** `EveningReview` and `WeeklyReview` on the `Sheet`/full-screen bases, with a
      `review`-art header band and a closing `QuoteCard` on the *evening* review only.
      Gate: fast.
- [ ] **8.5** ⛓ Gate: full — `checkpoint`, `checkpoint-instruments`, `backup`,
      `backup-nudge`, `paper-import`, `review`, `weekly-review`.

## Phase 9 — Moments

The highest-drama surfaces. `final/05` §2.3 governs timing; this only changes the skin.

- [ ] **9.1** `LevelUpMoment` and `RankAdvancedMoment` on the `Moment` base: `level-up` /
      `rank` art band, Cormorant numerals, sweeping accent rule, corner brackets. Keep
      the existing phase timings, haptics and reduced-motion path exactly. Gate: fast.
- [ ] **9.2** `BossClearedMoment` (boss art, `--boss` accent), `MasteryMoment`,
      `EvidenceAcceptedMoment`, `CheckpointMoment`. Gate: fast.
- [ ] **9.3** ⛓ Gate: full — `checkpoint-moment`.

## Phase 10 — Responsiveness & polish

The strict pass. This is where "must fit any phone" is proven, not asserted.

- [ ] **10.1** `playwright.config.ts`: add projects for `320×568`, `360×640`, `430×932`,
      `768×1024`, `1280×800` alongside Pixel 7. New `tests/e2e/responsive.spec.ts`:
      for every route × every viewport — no horizontal scroll, every interactive element
      ≥44×44, no text clipped, bottom nav never overlaps content. Gate: fast (the new
      spec is expected to fail here; that is 10.2's job).
- [ ] **10.2** Fix every failure `responsive.spec.ts` reports until it is green at all six
      viewports. ⛓ Gate: full.
- [ ] **10.3** A11y pass: `prefers-reduced-motion` renders every screen and Moment at its
      final state with no motion; focus-visible ring on every control; contrast audit of
      the final palette against real backgrounds; `aria-live` on XP; art layers
      `aria-hidden`. Add assertions where cheap. Gate: fast.
- [ ] **10.4** Performance: initial JS ≤ 320 KB gzipped, art ≤ 1.2 MB, precache ≤ 3 MB,
      **tap→XP < 300 ms re-asserted**. Trim icon and font imports if over. Gate: fast.
- [ ] **10.5** Stragglers: `DeepWorkTimer`, `DotPicker`, `SingleChipSelect`,
      `ChipToggle`, `Stepper` and any component still on v1 tokens. Then **delete the v1
      token aliases** from `tokens.css` and prove nothing referenced them. ⛓ Gate: full.

## Phase 11 — Close out

- [ ] **11.1** Docs: add the superseded-by pointer to `final/06` §4, refresh
      `design/00-DESIGN-SYSTEM.md` with anything learned, note the art re-import command
      for future uploads. Gate: fast.
- [ ] **11.2** Final ⛓ full gate on a clean tree. Write `## Handover` below: what
      changed, screenshots of every screen at 360×640, remaining art slots still on
      gradient fallback, and how to re-run `npm run art`.

---

## Standing rules

- **New art arriving mid-flight is expected.** If files appear in
  `system-app/project/assests_high_res` between iterations: add manifest lines, re-run
  `npm run art`, commit as `design(art): <slots>`. This never blocks a task and never
  requires a component change.
- Never edit anything under `src/engine/` or `src/store/` unless a task says to. This is
  a rendering change.
- Never delete a `data-testid`.
- Never `git push`, never open a PR — commits stay local unless the user asks.
- Prefer refactoring a component onto a kit primitive over rewriting it.

---

## Log

| # | Task | Note |
|---|---|---|
| — | plan written | baseline green: 47 files / 358 tests, typecheck + lint clean |
| 0.1 | deps | framer-motion 11.18.2 (last React-18 line), phosphor 2.1.10, 3 fontsource families, sharp (dev). Gate green. |

---

## Handover

_(written by task 11.2)_
