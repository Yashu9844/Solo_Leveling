import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

/**
 * The System, out loud.
 *
 * `speechSynthesis` is stubbed before any app script runs, for two
 * reasons: a CI browser has no installed voices and would silently speak
 * nothing, and a real utterance is not observable from a test anyway.
 * The stub records what was handed to the engine, which is exactly the
 * boundary this app is responsible for.
 */
const AFTERNOON = '2026-09-05T10:00:00Z';

interface SpokenLine {
  text: string;
  rate: number;
  pitch: number;
  voice: string | null;
}

declare global {
  interface Window {
    __spoken: SpokenLine[];
  }
}

async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    window.__spoken = [];

    class FakeUtterance {
      text: string;
      rate = 1;
      pitch = 1;
      volume = 1;
      lang = '';
      voice: { name: string; lang: string } | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    const voices = [
      { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
      { name: 'Microsoft Ravi - English (India)', lang: 'en-IN', localService: true },
      { name: 'Google हिन्दी', lang: 'hi-IN', localService: true },
    ];

    const synth = {
      speaking: false,
      getVoices: () => voices,
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      speak: (u: FakeUtterance) => {
        window.__spoken.push({
          text: u.text,
          rate: u.rate,
          pitch: u.pitch,
          voice: u.voice ? u.voice.name : null,
        });
        // Mirror a real engine: start, then finish a tick later.
        u.onstart?.();
        setTimeout(() => u.onend?.(), 0);
      },
    };

    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: FakeUtterance,
      configurable: true,
    });
  });
}

const spoken = (page: Page) => page.evaluate(() => window.__spoken);

test('the System speaks its line when the app opens', async ({ page }) => {
  await stubSpeech(page);
  await page.clock.install({ time: new Date(AFTERNOON) });
  await completeOnboarding(page);

  await expect(page.getByTestId('system-transmission')).toBeVisible();

  const onScreen = (
    await page.getByTestId('system-transmission').locator('p[role="status"]').textContent()
  )?.trim();

  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);

  const lines = await spoken(page);
  // What it says is what the screen says — one source, never a second
  // library written for the ear.
  expect(lines[0].text).toBe(onScreen);
});

test('it speaks in the System register, in the best voice the device has', async ({ page }) => {
  await stubSpeech(page);
  await page.clock.install({ time: new Date(AFTERNOON) });
  await completeOnboarding(page);

  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  const [first] = await spoken(page);

  expect(first.rate).toBeLessThan(1);
  expect(first.pitch).toBeLessThan(1);
  // en-IN over en-US, and never the Hindi engine.
  expect(first.voice).toContain('Ravi');
});

test('it says the line once, not on every render or tab round trip', async ({ page }) => {
  await stubSpeech(page);
  await page.clock.install({ time: new Date(AFTERNOON) });
  await completeOnboarding(page);

  await expect.poll(async () => (await spoken(page)).length).toBe(1);

  await page.getByRole('link', { name: 'SKILLS' }).click();
  await expect(page.getByRole('heading', { name: 'SKILLS' })).toBeVisible();
  await page.getByRole('link', { name: 'TODAY' }).click();
  await expect(page.getByTestId('system-transmission')).toBeVisible();

  // Same state, same line already heard — the System does not repeat itself.
  await page.waitForTimeout(500);
  expect(await spoken(page)).toHaveLength(1);
});

test('turning the voice off makes it silent', async ({ page }) => {
  await stubSpeech(page);
  await page.clock.install({ time: new Date(AFTERNOON) });
  await completeOnboarding(page);
  await expect.poll(async () => (await spoken(page)).length).toBe(1);

  await page.getByRole('link', { name: 'PROFILE' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByTestId('settings-appearance-row').click();
  await expect(page.getByTestId('appearance-screen')).toBeVisible();

  await page.getByTestId('voice-toggle-row').getByRole('button', { name: 'Off' }).click();

  // A fresh open, which is the trigger — and it must stay quiet.
  await page.reload();
  await expect(page.getByTestId('appearance-screen')).toBeVisible();
  await page.getByRole('link', { name: 'TODAY' }).click();
  await expect(page.getByTestId('system-transmission')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await spoken(page)).toHaveLength(0);
});
