# SYSTEM — Visual Design System v2 ("Monarch")

> This document **supersedes `final/06-ux-screens-design.md` §4.1 (Tokens), §4.2 (Type),
> §4.3 (Motion) and §4.4 (Core components)** for all rendering concerns.
> It does **not** supersede §1 (UX principles), §3 (screen list), §5 (information
> architecture / wireframe content), §6 (responsive rules) or §7 (accessibility).
> Where this document and `final/06` disagree about *what a screen says or measures*,
> `final/06` wins. Where they disagree about *how it looks*, this document wins.

Reference implementation of the target feel: `C:\Users\yashwanth\Desktop\system-app\src`
(12 screens, static mock, no functionality). Art direction reference:
`C:\Users\yashwanth\Desktop\system-app\project\assests_high_res`.

---

## 1. The idea in one paragraph

The current UI is a correct spreadsheet. The target UI is a **system interface from a
dungeon** — near-black ground, one electric-blue mana accent that is the *only* source of
colour, hairline rules that fade at both ends, panels with clipped corners and bracketed
frames, a serif display face used sparingly for ceremony, and full-bleed art that sits
*behind* content under a heavy vertical scrim rather than beside it. Nothing glows that
isn't important. The blue is a budget, not a decoration.

---

## 2. Art direction

The supplied art is one coherent look and every design decision below assumes it:

- **Ground is true black-blue** (`#04070d`–`#0a1424`). Art is ~80% black by area.
- **One hue.** Electric mana blue, ramping from deep `#1f5fb8` through `#4da3ff` to a
  white-hot core `#d9efff`. The glow *is* the brand.
- **Silhouette over detail.** Figures read as shapes with a single lit eye. This is why
  art can sit under text at 45–60% scrim and stay legible.
- **One exception:** the boss/demon plate carries red-magenta. That colour is **reserved
  for BOSS surfaces only** and must never appear on a missed quest, an incomplete row, or
  any state the user could read as punishment (`final/06` §4.1 is explicit and stands).

### 2.1 Art slots

Art is addressed by **semantic slot**, never by filename, so new uploads slot in without
touching component code. Slots not yet backed by a file fall back to a procedural
radial-gradient of the same value structure — every screen must look finished with zero
images present.

| Slot | Used by | Crop | Priority |
|---|---|---|---|
| `boot` | Splash | centre, very dark | P1 |
| `start-hero` | Start screen | portrait, figure upper-third | P1 |
| `onboarding` | Onboarding steps 1 and 6 | portrait, low contrast | P2 |
| `today` | Today header bleed (right 210px, `mix-blend-lighten`) | corner | P2 |
| `level-up` | LevelUpMoment | landscape band | P1 |
| `rank` | RankAdvancedMoment | portrait | P2 |
| `boss` | BossList header, BossClearedMoment | landscape band | P1 |
| `progress` | Progress → SYSTEM level card | portrait | P2 |
| `skills` | Skills header band | landscape | P3 |
| `checkpoint` | CheckpointMoment | portrait | P2 |
| `review` | Evening / Weekly review header | landscape band | P3 |
| `quote` | Quote card backdrop | any | P3 |

### 2.2 Art pipeline (non-negotiable — the source PNGs are 1.8–2.0 MB each)

`scripts/import-art.mjs` (sharp, devDependency) reads `design/art.manifest.json`
(slot → source filename), and for every slot emits into `src/assets/art/`:

- `<slot>-640.webp`  (q72, width 640)  — phone 1x/2x
- `<slot>-1280.webp` (q70, width 1280) — desktop frame / large phones
- a 20px blurred LQIP as an inline base64 data URI

and regenerates a typed `src/assets/art/index.ts` exporting, per slot,
`{ src, srcSet, lqip, width, height }`. **Budget: every emitted file ≤ 180 KB; total art
≤ 1.2 MB.** The script fails loudly if a slot blows the budget.

The script is idempotent and re-runnable. When new art lands, add a manifest line and
re-run — no component changes.

> PWA note: `vite.config.ts` precaches `**/*.png`. Art ships as `.webp` and is added to
> `globPatterns` deliberately, with `maximumFileSizeToCacheInBytes` raised only as far as
> the largest emitted file. Total precache budget: **3 MB**.

---

## 3. Tokens

Defined in `src/ui/tokens.css`. Old token names are retained as aliases through the whole
migration so no screen is ever half-broken.

```css
:root {
  /* ── ground ─────────────────────────────────────────── */
  --void:        #04070d;   /* the app's true black */
  --abyss:       #05080f;
  --deep:        #070b12;
  --panel-top:   #0a1424;   /* screen gradient top */
  --panel-bot:   #060a12;   /* screen gradient bottom */
  --surface:     #0c1626;   /* card */
  --surface-2:   #122036;   /* card, raised / pressed */
  --scrim:       rgba(4,7,13,0.86);

  /* ── mana (the ONLY hue) ────────────────────────────── */
  --accent-deep:   #1f5fb8;
  --accent:        #4da3ff;   /* unchanged from v1 — the brand */
  --accent-mid:    #5fb2ff;
  --accent-bright: #7cc4ff;
  --accent-soft:   #9bd4ff;
  --accent-core:   #d9efff;   /* white-hot; glows and 1px cores only */

  /* ── hairlines & fills (always accent-derived) ──────── */
  --hair-strong: rgba(77,163,255,0.45);
  --hair:        rgba(77,163,255,0.22);
  --hair-faint:  rgba(77,163,255,0.14);
  --fill-faint:  rgba(77,163,255,0.08);

  /* ── ink ────────────────────────────────────────────── */
  --ink-100: #eaf3ff;  /* headline */
  --ink-300: #dce8f7;  /* body-strong */
  --ink-500: #b3c7dd;  /* body */
  --ink-700: #8fa9c4;  /* secondary */
  --ink-900: #6a7f97;  /* tertiary */
  --faint:   #536377;  /* metadata — the floor for text, 4.6:1 on --void */

  /* ── state (semantics unchanged from final/06 §4.1) ─── */
  --state-complete: #3fbf8f;
  --state-pending:  #6a7f97;  /* grey, NEVER red */
  --state-recover:  #e0a33e;
  --state-alert:    #d95c5c;  /* RESERVED: data-loss + safety only */
  --boss:           #ff4d6d;  /* RESERVED: BOSS surfaces only */

  /* ── glow (a budget, not a decoration) ──────────────── */
  --glow-sm: 0 0 12px rgba(77,163,255,0.45);
  --glow-md: 0 0 26px rgba(77,163,255,0.28);
  --glow-lg: 0 0 40px rgba(77,163,255,0.18);
  --glow-text: 0 0 28px rgba(77,163,255,0.55);

  /* ── geometry ───────────────────────────────────────── */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-pill: 999px;
  --cut-sm: 10px; --cut-md: 12px; --cut-lg: 14px;   /* clip-path corner cut */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px;
  --sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-12:48px;
  --gutter: 24px;                                   /* the screen side gutter */
  --shell-max: 430px;                               /* the phone column */
}
```

**Glow budget: at most two glowing elements per viewport.** The XP bar and the primary
button, or a Moment's number. If a third wants to glow, something else stops.

---

## 4. Type

Self-hosted (offline PWA), latin subset only, weights enumerated to keep the budget.

| Role | Face | Weights |
|---|---|---|
| UI / body | **Inter** | 400, 500, 600 |
| Display / ceremony | **Cormorant Garamond** | 300, 400, 500 |
| Data numerals | **JetBrains Mono** | 400, 500 |

`final/06` §4.2 names JetBrains Mono and says tabular figures are non-negotiable. That
stands. The split is:

- **JetBrains Mono, `tabular-nums`** — every number the user compares or watches change:
  XP, counts, percentages, dates, timers, streaks, checkpoint values.
- **Cormorant Garamond** — ceremonial only: the `SYSTEM` wordmark, the rank letter, the
  `12 → 13` in a Moment, quote bodies. Never a number the user has to read precisely.
- **Inter** — everything else.

Scale (px, `clamp()` on display sizes so a 320px phone never overflows):

```
display   clamp(34px, 11vw, 46px) / 1.0    300  wordmark, Moment numerals   Cormorant
title     clamp(20px, 5.6vw, 24px) / 1.2   500  ceremonial headings         Cormorant
h1        21px / 26px  500  screen title (accent-mid)                       Inter
xl        clamp(26px, 8vw, 32px) / 1.05  600  level numbers, XP totals      JetBrains
lg        22px / 28px  600  section headline                                Inter
md        17px / 24px  500  quest titles                                    Inter
sm        15px / 22px  400  body                                            Inter
xs        13px / 18px  400  labels, metadata                                Inter
xxs       11px / 16px  500  uppercase, +0.16em — section labels             Inter
micro      9.5px/14px  500  uppercase, +0.14em — nav labels                 Inter
```

**Tracking is the signature.** Uppercase labels carry `+0.14em` to `+0.24em`; the
wordmark carries `+0.34em` with a compensating `padding-left: 0.34em` so it stays
optically centred.

---

## 5. Motion

`final/06` §4.3's budgets are **hard requirements and Playwright assertions** — they
survive this redesign unchanged:

```
tap → XP feedback rendered      < 300 ms, offline   (asserted)
quest complete                   180 ms
XP counter roll                  400 ms ease-out
progress bar                     500 ms
screen transition                200–320 ms
```

Implementation: `framer-motion`, wrapped once at the root in
`<MotionConfig reducedMotion="user">` so `prefers-reduced-motion` is honoured globally
without per-component branching. The existing hand-rolled reduced-motion checks
(e.g. `LevelUpMoment`) are kept — Moments carry haptics, which `MotionConfig` does not
govern.

Standard easings: `[0.22, 1, 0.36, 1]` for entrances; springs
`{ stiffness: 400–500, damping: 24–40 }` for taps.

Canonical interactions:
- Tap on any button: `whileTap={{ scale: 0.97 }}` (0.88 for icon-only nav).
- Route change: fade + 14px rise + 0.985 scale in, −10px + 0.99 out, 320 ms.
- Tab underline / segmented pill: shared `layoutId`.
- Bar fills: `initial={{ width: 0 }}` → target, 500–900 ms, `ease-out`.

**Nothing functional may depend on animation.**

---

## 6. Component vocabulary

New primitives live in `src/ui/kit/`. Existing feature components are refactored to use
them; none are deleted.

| Primitive | Shape |
|---|---|
| `ScreenShell` | `min-h-dvh`, radial page ground; ≥640px renders a 430×92dvh device frame with a 1px accent border and a deep drop shadow. |
| `SafeTop` | `env(safe-area-inset-top)` padding. **Replaces system-app's fake `9:41` StatusBar mock — that never ships.** |
| `ScreenHeader` | `h1` in `accent-mid` + optional right slot + a hairline that fades to transparent at both ends. |
| `PageTransition` | The route-change motion above. |
| `Panel` | Card. `cut-sm/md/lg` clipped corners, `--hair` border, `--surface` fill. |
| `FramedPanel` | `Panel` + four 20px corner brackets in solid accent + inset glow. Reserved for ceremony: Moments, checkpoint reports, quote hero. |
| `SectionLabel` | `xxs` uppercase tracked, `--ink-700`, optional trailing hairline. |
| `PrimaryButton` | Full-width, `cut-lg`, accent border, accent gradient fill at 14%→5%, `--glow-md`, `tracking-[0.2em]` uppercase. |
| `SecondaryButton` | Same geometry, `--hair` border, no glow, `--ink-500`. |
| `QuietButton` | Text-only, `--accent`, 44px target. |
| `StatTile` | Icon / `xl` mono value / `xs` label. |
| `MeterBar` | 7px, accent gradient `deep→soft`, `--glow-sm`, animated width. |
| `SegmentBar` | The 5-segment mastery bar (`final/03` §1 — never a percentage). |
| `Segmented` | 2–3 way switch, `layoutId` pill, active text on accent = `#061019`. |
| `IconTile` | 30–32px rounded square, `--hair-strong` border, `--fill-faint` fill, phosphor icon in `--accent-bright`. |
| `QuoteCard` | `cut-sm`, `--hair` border, translucent fill, centred Cormorant, `--ink-700`. |
| `Sheet` | Bottom sheet base: scrim, `max-h-[86dvh]`, top hairline, safe-area bottom padding, drag-to-dismiss, focus trap, `Esc` to close. Every log sheet is rebuilt on this. |
| `Moment` | Full-screen ceremony layer: black ground, `FramedPanel`, art band, tap-anywhere dismiss. |

Icons: `@phosphor-icons/react`, imported per-icon (tree-shaken). `weight="regular"`
inactive, `weight="fill"` active.

### 6.1 State shapes survive

`final/06` §4.4: *"Every state has a shape as well as a colour."* The quest row keeps its
distinct glyphs (`○ ● ◐ ↺ ⌁`) and its **two separate ≥44px targets** (circle = complete,
row = detail). Restyling may change stroke, fill and glow. It may not merge the targets,
drop a glyph, or make a state colour-only.

---

## 7. Copy voice

The user asked for system-app's wording. system-app is a mock and its copy is
decorative; this app's copy is load-bearing (`final/05`). The rule:

**Adopt the voice. Never displace the evidence.**

- ✅ Uppercase tracked section labels (`TODAY'S QUESTS`, `THIS WEEK`, `MIND`).
- ✅ A `SYSTEM` wordmark, `DISCIPLINE CREATES FREEDOM`, `A STRONGER YOU IN ANOTHER 120
  DAYS` on Start/Splash.
- ✅ `QuoteCard` on Progress, Profile, Skills, Start, Evening review — fed from the
  **existing** `engine/messages.ts` + `engine/reflections.ts` pools, attributed `— SYSTEM`.
  No new hardcoded quote list; the app already has a curated one.
- ✅ Second-person, short, declarative sentences.
- ❌ Never replace criterion text, checkpoint reports, attribute formulas, rank-gate
  checklists or the REALITY table with motivational copy. `final/06` §5.3 is explicit:
  *"No motivational quote here — competence evidence outperforms it at the point of
  action."* The quest sheet stays quote-free.
- ❌ Never add a quote to a failure or recovery surface.

---

## 8. Responsive — mobile-first, strict

**Design target: 360 × 640. Must not break at 320 × 568. Must be excellent at 390 × 844
and 430 × 932.**

Rules, enforced by test:

1. `100dvh` everywhere (never `100vh` — mobile URL bars).
2. `env(safe-area-inset-*)` on the top chrome and the bottom nav.
3. **No horizontal scroll at any viewport.** Asserted:
   `documentElement.scrollWidth <= clientWidth` on every route × every viewport.
4. Side gutter is `--gutter` (24px), dropping to 18px below 360px.
5. Display type uses `clamp()`; no fixed px above 24px on a text node.
6. Long data rows (`label … value`) truncate the label with `min-w-0` + `truncate`,
   never the value.
7. Images: `object-fit: cover`, explicit `width`/`height` to reserve layout, LQIP
   underneath, `loading="lazy"` except the current screen's hero.
8. ≥640px: the app becomes a **centred 430px device frame** on a radial ground — the
   entire desktop adaptation. `final/06` §6's "left rail at ≥1024px" is **dropped**; the
   frame is better and it is what the reference does.
9. 44px minimum touch target survives everywhere. Verified by test.
10. Dynamic type to 200% without breakage (`final/06` §7).

Playwright viewport matrix: `320×568`, `360×640`, `393×852` (Pixel 7 — existing project),
`430×932`, `768×1024`, `1280×800`.

---

## 9. Accessibility — unchanged, and re-verified

Contrast ≥ 4.5:1 for body text (`--faint` on `--void` is the floor and passes at 4.6:1) ·
44px targets · `prefers-reduced-motion` fully honoured · every state has a shape ·
semantic landmarks · `aria-live` on XP updates · every decorative art layer is
`aria-hidden` + `pointer-events-none` · focus is visible on a dark ground (2px
`--accent-bright` ring, never `outline: none` without a replacement).

---

## 10. What must not change (the contract with the test suite)

The redesign is a **rendering** change. 358 unit tests and 26 e2e specs encode behaviour,
and they are the safety net that makes autonomous execution possible.

Frozen unless a task explicitly says otherwise **and** updates the spec in the same commit:

- All 29 `data-testid` values.
- Accessible names: `Complete CAREER` / `Undo CAREER` (all six quests),
  `Initialise system`, `Begin`, `Next`, `Close`, and every other name asserted in e2e.
- `role="navigation"` with `aria-label="Primary"`, containing links named
  `TODAY` `PROGRESS` `SKILLS` `PROFILE`, each matched by a heading of the same name.
- Exact strings asserted in e2e, e.g. `Day closed. Next day begins at 04:00.`
- Placeholders: `Your name`, `This is the only thing the app judges you against.`
- Route paths `/today` `/progress` `/skills` `/profile` `/onboarding`.
- IndexedDB name `system-arc` and every store shape.

**One deliberate exception** (Phase 2): a Start screen is inserted before onboarding, so
`tests/e2e/helpers.ts` gains a single "enter the system" click. That edit is part of the
Phase 2 commit and is the only sanctioned helper change in the plan.
