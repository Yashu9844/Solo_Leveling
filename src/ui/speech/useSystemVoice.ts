import { useEffect, useRef } from 'react';
import { useSettings } from '../../store/SettingsContext';
import { armOnFirstGesture, speakSystemLine } from './systemSpeech';
import { playClip, stopClip } from './voicePackAudio';

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
  /** The id of the line, which is also the name of its rendered clip. */
  messageId: string | null;
  /** The same line as text, for the device-speech fallback. */
  text: string | null;
  /** The state it was chosen for. Null disables speech entirely. */
  fingerprint: string | null;
}

/**
 * Says the current System line once per app open.
 *
 * Two engines, tried in order:
 *
 *  1. The rendered clip (`/voice/<id>.mp3`) — the actual character voice,
 *     pre-rendered at build time. This is what the Player hears normally.
 *  2. The device's own speech engine — flat, synthetic, and always
 *     present. It covers a line whose clip is missing and a build that
 *     shipped without a pack at all.
 *
 * The gesture fallback wrapping both is not an edge case, it is the
 * normal path on a phone: browsers reject `audio.play()` and drop
 * `speechSynthesis` calls until the document has seen a user
 * interaction, and a PWA launched from the home screen has seen none. So
 * the first attempt is *expected* to fail there, and the line is armed
 * rather than lost — it says itself at the Player's first touch.
 */
export function useSystemVoice({ messageId, text, fingerprint }: UseSystemVoiceArgs): void {
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

    const say = async (): Promise<boolean> => {
      if (messageId && (await playClip(messageId))) return true;
      return speakSystemLine(text);
    };

    void (async () => {
      const spoke = await say();
      if (spoke || cancelled || !enabledRef.current) return;

      disarm = armOnFirstGesture(() => {
        if (!cancelled && enabledRef.current) void say();
      });
    })();

    return () => {
      cancelled = true;
      disarm?.();
    };
  }, [enabled, text, messageId, fingerprint]);

  // Turning the voice off should stop the System mid-sentence rather than
  // take effect after it finishes talking.
  useEffect(() => {
    if (!enabled) stopClip();
  }, [enabled]);

  // Note what is deliberately absent: a cancel on unmount. Today unmounts
  // on every tab change, and these lines run three or four seconds, so
  // cutting one off mid-word to move to Skills reads as a glitch rather
  // than as tidiness. Overlap is impossible anyway — both engines stop
  // whatever is playing before they start. It also keeps React's
  // StrictMode double-mount in development from clipping the first word
  // of every session, which would look exactly like a bug worth
  // reporting and would not be one.
}
