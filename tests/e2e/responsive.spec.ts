import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

const SAFE_TIME = '2026-09-05T10:00:00Z';

/**
 * Every route the app can be sitting on, at every viewport the config
 * declares. design/00 §8 makes the responsive rules a contract rather
 * than a preference, and this is where they are enforced.
 */
const ROUTES = [
  '/today',
  '/progress',
  '/skills',
  '/profile',
  '/profile/settings',
  '/profile/settings/appearance',
  '/profile/settings/system',
  '/profile/settings/data',
  '/profile/settings/about',
];

/** The floor from final/06 §7. A target below this is not reliably
 * tappable with a thumb, whatever it looks like. */
const MIN_TAP = 44;

async function boot(page: Page) {
  await page.clock.install({ time: new Date(SAFE_TIME) });
  await completeOnboarding(page);
}

/** A cold load re-runs the splash hold, so waiting on anything else
 * measures the splash instead of the screen. */
async function goto(page: Page, path: string) {
  await page.goto(path);
  await page.locator('nav').waitFor();
  await page.waitForTimeout(250);
}

interface Offender {
  what: string;
  detail: string;
}

async function auditPage(page: Page): Promise<Offender[]> {
  return page.evaluate((minTap) => {
    const problems: { what: string; detail: string }[] = [];
    const describe = (el: Element) => {
      const cls = (el.getAttribute('class') ?? '').slice(0, 60);
      const text = (el.textContent ?? '').trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${text ? ` "${text}"` : ''}`;
    };

    // ── 1. no horizontal scroll ────────────────────────────────────
    const doc = document.documentElement;
    const main = document.querySelector('main');
    if (doc.scrollWidth > doc.clientWidth) {
      problems.push({ what: 'document scrolls sideways', detail: `${doc.scrollWidth} > ${doc.clientWidth}` });
    }
    if (main && main.scrollWidth > main.clientWidth) {
      problems.push({ what: 'main scrolls sideways', detail: `${main.scrollWidth} > ${main.clientWidth}` });
    }

    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    };

    // ── 2. every interactive element clears the tap floor ──────────
    const interactive = document.querySelectorAll(
      'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea'
    );
    for (const el of interactive) {
      if (!visible(el)) continue;
      // A control nested inside a bigger control inherits its target.
      if (el.parentElement?.closest('button, [role="button"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.height < minTap - 0.5 || r.width < minTap - 0.5) {
        problems.push({
          what: 'tap target below 44px',
          detail: `${Math.round(r.width)}x${Math.round(r.height)} — ${describe(el)}`,
        });
      }
    }

    // ── 3. no text clipped by its own box ──────────────────────────
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      if (el.children.length > 0) continue; // leaves only — text lives there
      const s = getComputedStyle(el);
      if (s.overflow === 'visible' && s.overflowX === 'visible') continue;
      if (s.textOverflow === 'ellipsis') continue; // truncation is a choice
      // .sr-only is a 1px clipped box on purpose — that is the whole
      // technique. It is not visible text and cannot be clipped text.
      if (el.classList.contains('sr-only')) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        problems.push({ what: 'text clipped horizontally', detail: describe(el) });
      }
    }

    // ── 4. the nav never sits on top of content ────────────────────
    const nav = document.querySelector('nav');
    if (nav && main) {
      const n = nav.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      if (n.top < m.bottom - 1) {
        problems.push({
          what: 'nav overlaps content',
          detail: `nav.top ${Math.round(n.top)} < main.bottom ${Math.round(m.bottom)}`,
        });
      }
    }

    return problems;
  }, MIN_TAP);
}

test('every route survives this viewport', async ({ page }) => {
  await boot(page);

  const found: string[] = [];
  for (const route of ROUTES) {
    await goto(page, route);
    for (const p of await auditPage(page)) {
      found.push(`${route}: ${p.what} — ${p.detail}`);
    }
  }
  expect(found, found.join('\n')).toEqual([]);
});

test('the worst case: text scale XL, comfortable density', async ({ page }) => {
  await boot(page);

  // Set through the same localStorage key the app reads, so the inline
  // bootstrap applies it before first paint on every load below.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('system.settings.v1') || '{}');
    localStorage.setItem(
      'system.settings.v1',
      JSON.stringify({ ...s, version: 1, textScale: 'xl', density: 'comfortable' })
    );
  });

  const found: string[] = [];
  for (const route of ROUTES) {
    await goto(page, route);
    for (const p of await auditPage(page)) {
      found.push(`${route} @XL: ${p.what} — ${p.detail}`);
    }
  }
  expect(found, found.join('\n')).toEqual([]);
});
