import { SystemWindow, type SystemWindowTone } from '../kit';
import type { SystemMessage, SystemMessageContext } from '../../engine/systemVoice';

/**
 * The System speaking about *you*, at the top of Today.
 *
 * design/04-SYSTEM-MESSAGE-ENGINE.md §15. This is not a quote card and
 * must never become one: no quotation marks, no attribution, no centred
 * serif italic. It is a readout — a decree in capitals with the numbers
 * that justify it printed underneath, which is what stops the line from
 * reading as an assertion and makes it read as a measurement.
 *
 * It sits above the DAILY QUEST window deliberately. The System states
 * the condition first, then lists requirements; reversing that order
 * turns the line into a footnote on a checklist.
 *
 * All motion comes from SystemWindow's CSS arrival, so the reduced-motion
 * rules in index.css collapse it to a finished block with nothing hidden
 * and nothing to re-enable (§17).
 */

/**
 * Tone → frame colour.
 *
 * Deliberately conservative. design/00 §2.2 bans gold from every
 * daily-loop screen and §2.3 reserves red for BOSS surfaces, and Today is
 * the daily loop — so the only split here is amber for the states that
 * already own amber on this screen (the recovery card, the day-closed
 * banner). Everything else is the arc's blue. A System that changes
 * colour for emphasis is a System whose colours mean nothing.
 */
const TONE_FRAME: Partial<Record<SystemMessage['tone'], SystemWindowTone>> = {
  restraint: 'recover',
};

interface SystemTransmissionProps {
  message: SystemMessage;
  context: SystemMessageContext;
  /** The state the message was chosen for. Re-keys the arrival animation. */
  fingerprint: string;
}

export function SystemTransmission({ message, context, fingerprint }: SystemTransmissionProps) {
  const tone = TONE_FRAME[message.tone] ?? 'accent';
  const lit = message.tone === 'verdict' || message.tone === 'momentum';

  return (
    <SystemWindow
      // Keyed on the fingerprint, not on the date: the window re-plays its
      // arrival when the System has something new to say, and stays put
      // when the Player is merely coming back to a screen they have
      // already read. A decree that re-announces itself on every
      // navigation stops being a decree.
      key={fingerprint}
      arrive
      tone={tone}
      label={`SYSTEM · ${message.label}`}
      className="cut-sm mb-2 px-3 pb-2.5 pt-2"
      testId="system-transmission"
    >
      {/*
        role="status" rather than role="alert": a screen reader should
        announce the line once when it lands, without interrupting
        whatever the Player was doing or stealing focus from the quest
        list below.
      */}
      <p
        role="status"
        className="font-display text-[15px] uppercase leading-[1.35] tracking-[0.055em] text-ink-100 line-clamp-2"
        style={lit ? { textShadow: 'var(--glow-text)' } : undefined}
      >
        {message.text}
      </p>

      <div
        aria-hidden
        className="mt-2 mb-1.5 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, var(--hair-strong) 20%, var(--hair-strong) 80%, transparent)',
        }}
      />

      {/*
        The receipt under the decree. Affectless on purpose — it is the
        evidence for the sentence above, and the reason the line reads as
        measured rather than asserted. tabular-nums so the figures do not
        shift as the day fills.
      */}
      <p className="font-mono text-[9.5px] uppercase tabular-nums tracking-[0.16em] text-faint">
        DAY {String(context.arcDay).padStart(2, '0')}
        {' · '}
        {context.coreCompleted}/{context.coreTotal || 6} CLEARED
        {' · '}
        {context.xpEarned}/{context.xpTarget} XP
        {context.streak > 0 && (
          <>
            {' · '}
            STREAK {context.streak}
          </>
        )}
      </p>
    </SystemWindow>
  );
}
