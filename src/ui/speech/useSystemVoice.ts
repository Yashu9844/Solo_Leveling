import { useEffect, useRef } from 'react';
import { useSettings } from '../../store/SettingsContext';
import { armOnFirstGesture, speakSystemLine } from './systemSpeech';

/**
 * Session memory of what has already been said.
 *
 * Module-level on purpose. A page reload is a new app open and the System
 * should greet you again; a re-render, a tab round trip or a quest toggle
 * inside the same state is not, and must stay silent. The fingerprint is
 * already the identity of a state (engine/systemVoice.ts), so keying on
 * it means "speak when the System has something new to say" falls out
 * for free rather than needing a second rule.
 */
const spokenThisSession = new Set<string>();

/** Test seam — the e2e spec re-opens the app inside one browser context. */
export function resetSpokenMemory(): void {
  spokenThisSession.clear();
}

interface UseSystemVoiceArgs {
  /** The line to say. Null while the transmission is still resolving. */
  text: string | null;
  /** The state it was chosen for. Null disables speech entirely. */
  fingerprint: string | null;
}

/**
 * Says the current System line once per app open.
 *
 * The gesture fallback is not an edge case — it is the normal path on a
 * phone. Mobile browsers drop `speechSynthesis` calls made before the
 * document has seen a user interaction, and a PWA launched from the home
 * screen has seen none, so the first attempt is expected to fail there.
 * When it does, the line is armed and says itself at the Player's first
 * touch instead of being lost.
 */
export function useSystemVoice({ text, fingerprint }: UseSystemVoiceArgs): void {
  const { settings } = useSettings();
  const enabled = settings.voice;

  // Read through a ref inside the effect so toggling the setting off does
  // not re-run the effect and re-speak a line that is already said.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !text || !fingerprint) return;
    if (spokenThisSession.has(fingerprint)) return;

    // Claimed before the first await: React may run this effect twice in
    // StrictMode, and two overlapping utterances of the same line is the
    // one failure mode a user notices immediately.
    spokenThisSession.add(fingerprint);

    let disarm: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const spoke = await speakSystemLine(text);
      if (spoke || cancelled || !enabledRef.current) return;

      disarm = armOnFirstGesture(() => {
        if (!cancelled && enabledRef.current) void speakSystemLine(text);
      });
    })();

    return () => {
      cancelled = true;
      disarm?.();
    };
  }, [enabled, text, fingerprint]);

  // Note what is deliberately absent: a cancel on unmount. Today unmounts
  // on every tab change, and these lines run three or four seconds, so
  // cutting one off mid-word to move to Skills reads as a glitch rather
  // than as tidiness. Overlap is impossible anyway — speakSystemLine
  // cancels whatever is queued before it speaks. It also keeps React's
  // StrictMode double-mount in development from clipping the first word
  // of every session, which would look exactly like a bug worth
  // reporting and would not be one.
}
