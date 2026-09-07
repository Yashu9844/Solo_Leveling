import { Briefcase } from '@phosphor-icons/react';
import { IconTile, MeterBar, SectionLabel } from '../kit';

/**
 * The live preview, pinned at the top of Appearance (design/03 §4).
 *
 * Settings apply instantly, so this is not a preview of something
 * pending — it is a sample of the app's own vocabulary, kept on screen
 * while you scroll a list of thirty controls. Without it you would tap
 * a theme, navigate two screens back to see what it did, and navigate
 * two screens forward to try the next one.
 *
 * The four things in it are the four things every setting touches: a
 * section label (tracking and ink), a quest row (icon tile, title, mono
 * XP, the completion circle), a meter (accent and glow), and a line of
 * display serif (the type scale, at the size where it shows).
 *
 * It is sticky rather than fixed. Fixed would escape the scroll
 * container and sit over the bottom nav; sticky stays inside the
 * screen's own flow and stops at the top of it.
 */
export function AppearancePreview() {
  return (
    <div
      className="sticky top-0 z-10 -mx-gutter px-gutter pb-4 pt-3"
      // An opaque ground, not a blur: the rows scrolling underneath must
      // not show through the sample they are changing.
      style={{ background: 'var(--void)', borderBottom: '1px solid var(--hair-faint)' }}
      aria-hidden
    >
      <div
        className="cut-sm px-4 py-4"
        style={{ border: '1px solid var(--hair)', background: 'var(--surface)' }}
      >
        <SectionLabel rule className="mb-3">
          Today&rsquo;s quests
        </SectionLabel>

        <div className="flex items-center gap-3">
          <IconTile icon={Briefcase} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md text-ink-100">CAREER</span>
            <span className="block truncate text-xs text-ink-700">3 applications</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-700">+100</span>
          <span
            className="h-5 w-5 shrink-0 rounded-pill"
            style={{ background: 'var(--accent)', boxShadow: 'var(--glow-sm)' }}
          />
        </div>

        <MeterBar pct={62} height={7} className="mt-4" />

        {/* Dropped on a short viewport. Pinned, this card takes nearly
            half of a 320x568 screen at text scale XL, and at that point
            it is competing with the list it exists to serve. The quest
            row above already shows the type scale; the serif line is the
            part that can go. */}
        <p className="mt-4 font-display text-[calc(15px*var(--type-scale))] leading-[1.5] text-ink-700 [@media(max-height:640px)]:hidden">
          Discipline is remembering what you want.
        </p>
      </div>
    </div>
  );
}
