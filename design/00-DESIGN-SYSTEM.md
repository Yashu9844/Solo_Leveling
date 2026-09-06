# SYSTEM — Visual Design System v2 ("Monarch")

> Supersedes `final/06-ux-screens-design.md` §4.1–§4.4 for all rendering concerns, and
> §6's desktop rule. Does **not** supersede §1 (UX principles), §3 (screen list), §5
> (information architecture) or §7 (accessibility). Where this and `final/06` disagree
> about *what a screen says or measures*, `final/06` wins. About *how it looks*, this wins.

Companion documents:
- `design/02-NAVIGATION-FLOW.md` — every route, sheet, moment and transition.
- `design/03-SETTINGS-AND-THEMING.md` — the configurable appearance layer.
- `design/01-IMPLEMENTATION-PLAN.md` — the build order and live loop state.

Feel reference: `C:\Users\yashwanth\Desktop\system-app\src`.
Art source: `C:\Users\yashwanth\Desktop\system-app\project\assests_high_res`.

---

## 1. The idea in one paragraph

The current UI is a correct spreadsheet. The target is a **system interface from a
dungeon** — near-black ground, one electric mana accent that is the only source of colour,
hairlines that fade at both ends, panels with clipped corners and bracketed frames, a serif
display face used sparingly for ceremony, and full-bleed art sitting *behind* content under
a heavy scrim rather than beside it. Nothing glows that isn't important.

---

## 2. Art direction — two moods, one system

The supplied art splits cleanly into two families, and that split is not decorative. It
maps onto the product's own central distinction (`final/01` §4: *"Level measures effort.
Rank measures evidence. They are not convertible."*).

### 2.1 MOOD A — **Blue Arc** — *effort*

Near-black grounds, electric mana blue `#1f5fb8 → #4da3ff → #d9efff`, silhouetted figures
with one lit eye, mana-flame texture. Roughly 80% black by area, which is exactly why it
can sit under text at a 45–60% scrim and stay legible.

**Where it appears:** everywhere the app is about *doing the work*. Splash, onboarding,
Today, quest sheets, Progress → SYSTEM, Skills, Level Up, Training, the daily loop.

### 2.2 MOOD B — **Gold Horizon** — *evidence*

Warm gold and amber light over vast open landscapes; a figure looking *outward* rather than
inward. Dawn, distance, arrival.

**Where it appears — and only here:** the Start screen (the promise), the Checkpoint
report, Rank Advanced, Arc Complete, and the weekly review's distance-travelled block.
These are the five places the app says *something real changed*.

> **The rule: blue is effort, gold is evidence.** Gold never appears on a daily-loop
> screen. If gold becomes ambient it stops meaning anything — the same reasoning
> `final/06` §4.1 uses to keep red off a missed quest.

### 2.3 The third colour — **Boss**

Six plates are crimson (demons, a throne, a tier ladder). Reserved for BOSS surfaces:
`BossList` and its locked state. Never an incomplete quest, a missed day, or any state the
user could read as punishment.

Note the deliberate exception: **`boss-cleared` is gold, not red.** Clearing a boss is
evidence, and the plate the user supplied for it — an enthroned figure under warm light —
already agrees. Red is the boss you face; gold is the boss you beat.

### 2.4 Classification protocol for incoming art

The user drops new files into `assests_high_res` continuously. Each loop iteration checks
that folder and classifies anything new **before** adding it to the manifest:

1. **Dominant light** → blue = Blue Arc · warm gold/orange = Gold Horizon · red/magenta =
   Boss.
2. **Subject** → portrait figure · wide vista · creature · body/physique · architecture.
3. **Safe area** → find the darkest third; that is where text may sit. Record it as the
   slot's `focal` hint so the crop puts the figure away from the copy.
4. **Baked-in text?** If the image already carries words, the app adds **no** competing
   tagline over it — only the wordmark and the primary action.
5. **Assign to the best free slot** in §2.5. If a better fit displaces an incumbent, the
   incumbent moves to the overflow pool rather than being deleted.
6. **Never** assign a Gold Horizon plate to a daily-loop slot.

### 2.5 Slot map

| Slot | Mood | Used by | Source | Own text |
|---|---|---|---|---|
| `boot` | Blue | Splash | `10_49_48` | |
| `start-hero` | Gold | Start screen | `11_04_44` | DISCIPLINE CREATES FREEDOM |
| `onboarding` | Blue | Onboarding steps 1 & 6 | `10_48_22` | |
| `today` | Blue | Today header bleed | `10_51_01` | |
| `level-up` | Blue | LevelUpMoment | `11_15_38` | A GREATER YOU TOMORROW |
| `rank` | Gold | RankAdvancedMoment | `11_21_19` | HIGHER THAN YESTERDAY |
| `checkpoint` | Gold | CheckpointMoment, Day-N report | `11_02_52` | |
| `progress` | Blue | Progress → SYSTEM level card | `10_54_45` | |
| `skills` | Blue | Skills header band | `10_56_27` | |
| `training` | Blue | Training log sheet, VITALITY | `11_30_52` | PROGRESS OVER COMFORT |
| `review` | Blue | Evening review header | `10_59_54` | |
| `review-weekly` | Gold | Weekly distance travelled | `11_09_20` | A BRIGHTER YOU SOMEDAY |
| `boss` | Boss | BossList header (landscape) | `11_24_03` | NEXT LEVEL AWAITS |
| `boss-throne` | Boss | Locked-boss state | `11_01_19` | |
| `boss-cleared` | Gold | BossClearedMoment | `11_22_43` | A BETTER YOU AWAITS |
| `quote` | Blue | Quote card backdrop | `10_58_14` | |

Four further boss plates are classified and parked in the manifest's `overflow` block —
kept so a later screen can claim one without re-reviewing the folder.

**Every unfilled slot must render a procedural gradient of the same value structure.** No
screen may look unfinished because art hasn't arrived.

### 2.6 Pipeline (the source PNGs are 1.8–2.5 MB each)

`scripts/import-art.mjs` (sharp, devDependency) reads `design/art.manifest.json`
(slot → `{ source, mood, focal }`) and emits per slot into `src/assets/art/`:

- `<slot>-480.webp` (q66) and `<slot>-960.webp` (q55)
- a 20px blurred LQIP as an inline base64 data URI

then regenerates a typed `src/assets/art/index.ts` exporting
`{ src, srcSet, lqip, width, height, mood, focal, hasText }`.

Widths are 480/960 rather than 640/1280 because the app is a 430px column at every
breakpoint — 960 already covers 2x on the widest phone, and 1280 would ship pixels nothing
can display. Quality is tuned low on purpose: every plate sits under a 45–85% scrim, and
often at `--art-opacity: 0.45`, so anything above ~q60 is bytes the user cannot perceive.

**Budget: ≤ 170 KB per file.** That per-file number is the one that matters — a screen
loads exactly one plate, so it *is* the per-screen art weight a phone pays. The total is
only a sanity ceiling (4 MB), because art is deliberately **not precached**: it is
runtime-cached on first view, so the sum on disk is never downloaded in one go. Capping the
total tightly would just force a quality cut on existing plates every time a new one
arrives. The script fails loudly on any breach. Idempotent and re-runnable: new art is a
manifest line plus `npm run art`, never a component change.

Current: **16/16 slots filled, 2.2 MB on disk, largest single file 154 KB.**

---

## 3. Tokens

Three layers, in `src/ui/tokens.css`. Full theme catalogue in
`design/03-SETTINGS-AND-THEMING.md`.

1. **Structural** (`:root`) — spacing, radius, geometry, corner cuts. Theme-independent.
2. **Theme** (`[data-theme="…"]`) — ground, ink, accent, glow. Swappable at runtime.
3. **Modifier** (`[data-text-scale]`, `[data-density]`, `[data-motion]`, `[data-art]`) —
   user preferences that multiply or gate the other two.

The default theme, `arc`:

```css
/* ground */
--void:#04070d  --abyss:#05080f  --deep:#070b12
--panel-top:#0a1424  --panel-bot:#060a12
--surface:#0c1626  --surface-2:#122036  --scrim:rgba(4,7,13,.86)

/* mana — the only hue */
--accent-deep:#1f5fb8  --accent:#4da3ff  --accent-mid:#5fb2ff
--accent-bright:#7cc4ff  --accent-soft:#9bd4ff  --accent-core:#d9efff

/* dawn — Gold Horizon surfaces only */
--dawn-deep:#8a5a1e  --dawn:#e8a13c  --dawn-bright:#ffc76b  --dawn-core:#fff0d0

/* hairlines & fills, always accent-derived */
--hair-strong:rgba(77,163,255,.45)  --hair:rgba(77,163,255,.22)
--hair-faint:rgba(77,163,255,.14)   --fill-faint:rgba(77,163,255,.08)

/* ink — every step clears 4.5:1 on --void; measured, not assumed */
--ink-100:#eaf3ff 18.0:1   --ink-300:#dce8f7 16.3:1   --ink-500:#b3c7dd 11.6:1
--ink-700:#90a8c2  8.2:1   --ink-900:#7b8fa8  6.1:1   --faint:#6d8299  5.1:1

/* state — semantics unchanged from final/06 §4.1 */
--state-complete:#3fbf8f  --state-pending:#77828f (grey, NEVER red)
--state-recover:#e0a33e   --state-alert:#d95c5c (data-loss + safety only)
--boss:#ff4d6d (BOSS surfaces only)
```

`--faint` is the floor for text. Nothing dimmer than it may carry a word.

**Glow budget: at most two glowing elements per viewport**, and zero when
`[data-art="off"]` or the `contrast` theme is active.

---

## 4. Type

Self-hosted (offline PWA), latin subset, weights enumerated.

| Role | Face | Weights |
|---|---|---|
| UI / body | **Inter** | 400, 500, 600 |
| Display / ceremony | **Cormorant Garamond** | 300, 400, 500 |
| Data numerals | **JetBrains Mono** | 400, 500 |

- **JetBrains Mono, `tabular-nums`** — every number the user compares or watches change.
  `final/06` §4.2 calls tabular figures non-negotiable; that stands.
- **Cormorant Garamond** — ceremony only: the `SYSTEM` wordmark, the rank letter, a
  Moment's `12 → 13`, quote bodies. Never a number read for precision.
- **Inter** — everything else.

```
display  clamp(34px,11vw,46px)/1.0  300  wordmark, Moment numerals   Cormorant
title    clamp(20px,5.6vw,24px)/1.2 500  ceremonial headings         Cormorant
h1       21/26  500  screen title (accent-mid)                       Inter
xl       clamp(26px,8vw,32px)/1.05 600  level numbers, XP totals     JetBrains
lg       22/28  600  section headline                                Inter
md       17/24  500  quest titles                                    Inter
sm       15/22  400  body                                            Inter
xs       13/18  400  labels, metadata                                Inter
xxs      11/16  500  uppercase +0.16em — section labels              Inter
micro     9.5/14 500  uppercase +0.14em — nav labels                 Inter
```

Every size is multiplied by `--type-scale` (see §3 layer 3), so the user's text-size
setting scales the whole system coherently rather than only body copy.

**Tracking is the signature.** Uppercase labels carry +0.14em to +0.24em; the wordmark
carries +0.34em with a compensating `padding-left: 0.34em` to stay optically centred.

---

## 5. Motion

`final/06` §4.3's budgets are hard requirements and Playwright assertions:

```
tap → XP feedback rendered   < 300 ms, offline   (asserted)
quest complete                180 ms
XP counter roll               400 ms ease-out
progress bar                  500 ms
screen transition             200–320 ms
```

Root-level `<MotionConfig reducedMotion={…}>` driven by the **motion setting**, which has
three states: `full`, `reduced`, `system` (default — follows `prefers-reduced-motion`).
Moments keep their hand-rolled reduced-motion path because they also carry haptics, which
`MotionConfig` does not govern.

Easings: `[0.22, 1, 0.36, 1]` for entrances; springs `{ stiffness: 400–500, damping:
24–40 }` for taps. Route transitions and their directionality are specified per-edge in
`design/02-NAVIGATION-FLOW.md` §4.

**Nothing functional may depend on animation.**

---

## 6. Component vocabulary

New primitives in `src/ui/kit/`. Existing feature components are refactored onto them;
none are deleted.

| Primitive | Shape |
|---|---|
| `ScreenShell` | `min-h-dvh`, radial ground; ≥640px a centred 430px device frame with a 1px accent border. |
| `SafeTop` | `env(safe-area-inset-top)` padding. **Replaces the reference's fake `9:41` status bar — that never ships.** |
| `ScreenHeader` | `h1` in `accent-mid`, optional right slot, hairline fading to transparent at both ends. |
| `PageTransition` | Per-edge motion from the navigation flow doc. |
| `Panel` / `FramedPanel` | Card with clipped corners / plus four 20px accent corner brackets. `FramedPanel` is reserved for ceremony. |
| `SectionLabel` | `xxs` uppercase tracked, `--ink-700`, optional trailing hairline. |
| `PrimaryButton` / `SecondaryButton` / `QuietButton` | Full-width cut-corner accent button with glow / bordered, no glow / text-only. All ≥44px. |
| `StatTile` · `MeterBar` · `SegmentBar` | Icon+value+label · 7px animated accent bar · the 5-segment mastery bar (`final/03` §1 — never a percentage). |
| `Segmented` | 2–3 way switch, `layoutId` pill. |
| `IconTile` | 30–32px rounded square, `--hair-strong` border, phosphor icon in `--accent-bright`. |
| `QuoteCard` | Cut corners, centred Cormorant, `--ink-700`. |
| `Sheet` | Bottom-sheet base: scrim, `max-h-[86dvh]`, drag-to-dismiss, focus trap, `Esc`, safe-area padding, `role="dialog"`. |
| `Moment` | Full-screen ceremony layer: black ground, `FramedPanel`, art band, tap-anywhere dismiss. |
| `SettingsList` / `SettingsRow` / `SettingsGroup` | The modern grouped-list settings vocabulary — see `design/03-SETTINGS-AND-THEMING.md` §4. |

Icons: `@phosphor-icons/react`, per-icon imports. `regular` inactive, `fill` active.

### 6.1 State shapes survive

`final/06` §4.4: *"Every state has a shape as well as a colour."* The quest row keeps its
glyphs (`○ ● ◐ ↺ ⌁`) and its **two separate ≥44px targets** (circle = complete, row =
detail). Restyling may change stroke, fill and glow. It may not merge the targets, drop a
glyph, or make a state colour-only.

---

## 7. Copy voice

**Adopt the reference's voice. Never displace the evidence.**

- ✅ Uppercase tracked section labels · a `SYSTEM` wordmark · `DISCIPLINE CREATES FREEDOM`
  on the boot path · second-person, short, declarative sentences.
- ✅ `QuoteCard` fed from the **existing** `engine/messages.ts` and
  `engine/reflections.ts` pools, attributed `— SYSTEM`. No new hardcoded quote list; the
  app already has a curated one.
- ❌ Never replace criterion text, checkpoint reports, attribute formulas, rank-gate
  checklists or the REALITY table with motivational copy. `final/06` §5.3: *"No
  motivational quote here — competence evidence outperforms it at the point of action."*
  The quest sheet stays quote-free.
- ❌ Never put a quote on a failure or recovery surface.
- ❌ Never overlay a tagline on art that already carries one (§2.4 rule 4).

---

## 8. Responsive — mobile-first, strict

**Target 360×640. Must not break at 320×568. Must be excellent at 390×844 and 430×932.**

1. `100dvh` everywhere, never `100vh`.
2. `env(safe-area-inset-*)` on top chrome and bottom nav.
3. **No horizontal scroll at any viewport** — asserted per route per viewport.
4. Gutter `--gutter` (24px, 18px below 360px, and density-aware).
5. Display type uses `clamp()`; no fixed px above 24px on a text node.
6. `label … value` rows truncate the label (`min-w-0` + `truncate`), never the value.
7. Art: `object-fit: cover`, explicit dimensions to reserve layout, LQIP underneath,
   `loading="lazy"` except the current screen's hero.
8. ≥640px the app becomes a centred 430px device frame. `final/06` §6's "left rail at
   ≥1024px" is **dropped**.
9. 44px minimum touch target everywhere, at every text scale and density. Tested.
10. Text scale to 200% without breakage.

Playwright matrix: `320×568`, `360×640`, `393×852`, `430×932`, `768×1024`, `1280×800`.

---

## 9. Accessibility

Contrast ≥ 4.5:1 for body text in **every theme** (measured per theme, not assumed) · 44px
targets · motion setting fully honoured · every state has a shape · semantic landmarks ·
`aria-live` on XP · art layers `aria-hidden` + `pointer-events-none` · a visible 2px
`--accent-bright` focus ring, never `outline:none` without a replacement.

---

## 10. What must not change (the contract with the test suite)

This is a **rendering** change. 358 unit tests and 26 e2e specs encode behaviour and are
the safety net that makes autonomous execution possible.

Frozen unless a task explicitly says otherwise **and** updates the spec in the same commit:

- All 29 `data-testid` values.
- Accessible names asserted in e2e: `Complete CAREER` / `Undo CAREER` (all six quests),
  `Initialise system`, `Begin`, `Next`, `Close`, …
- `role="navigation"` + `aria-label="Primary"`, containing links named
  `TODAY PROGRESS SKILLS PROFILE`, each matched by a heading of the same name.
- Exact asserted strings, e.g. `Day closed. Next day begins at 04:00.`
- Placeholders `Your name` and `This is the only thing the app judges you against.`
- Route paths `/today` `/progress` `/skills` `/profile` `/onboarding`.
- IndexedDB name `system-arc` and every store shape.

**Sanctioned exceptions**, each part of its own commit:
1. A Start screen precedes onboarding → `tests/e2e/helpers.ts` gains one click.
2. Settings lives at `/profile/settings` — a *child* of the profile tab, so the four-tab
   contract above is untouched.

**Settings are stored in `localStorage`, never in the event log.** They are device
preferences, not evidence; putting them in the log would corrupt what `verifyIntegrity()`
means. See `design/03-SETTINGS-AND-THEMING.md` §2.
