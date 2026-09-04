import { expect, type Page } from '@playwright/test';

async function fillStep5(page: Page) {
  await page.getByTestId('career-intention-place').fill('my desk');
  await page.getByTestId('career-intention-action').fill('open the job board before anything');
  await page.getByTestId('dsa-intention-place').fill('my desk');
  await page.getByTestId('dsa-intention-action').fill('open the editor');
  await page.getByTestId('training-intention-place').fill('the gym');
  await page.getByTestId('training-intention-action').fill('change & start');
}

/** Drives a fresh /onboarding load up to (not including) the final submit,
 * leaving the page on step 6. */
export async function reachStep6(page: Page, name = 'Ada') {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Begin' }).click(); // -> step 2
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 3
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 4
  await page
    .getByPlaceholder('This is the only thing the app judges you against.')
    .fill('Ship a working agent and land an offer.');
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 5
  await fillStep5(page);
  await page.getByRole('button', { name: 'Next' }).click(); // -> step 6
}

/** Full fresh-boot onboarding flow, landing on /today. */
export async function completeOnboarding(page: Page, name = 'Ada') {
  await reachStep6(page, name);
  await page.getByRole('button', { name: 'Initialise system' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

/**
 * Waits until db.quest_instance actually shows `state` for a template
 * titled `templateTitle` on `localDate` — i.e. the confirmed write, not
 * the optimistic UI. A toggle's write is a full rebuildProjections
 * (Slice 4+), which resolves on a different timeline than the
 * synchronous optimistic update a click triggers; a test that reloads
 * right after seeing the optimistic UI can race ahead of the real write
 * and see it vanish. Poll the actual IndexedDB the reload will re-read,
 * not the DOM, before reloading.
 */
export async function waitForQuestInstanceState(
  page: Page,
  templateTitle: string,
  localDate: string,
  state: 'available' | 'complete'
) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ templateTitle, localDate, state }) =>
          new Promise<boolean>((resolve, reject) => {
            const openReq = indexedDB.open('system-arc');
            openReq.onerror = () => reject(openReq.error);
            openReq.onsuccess = () => {
              const idb = openReq.result;
              const tx = idb.transaction(['quest_template', 'quest_instance'], 'readonly');
              const templateStore = tx.objectStore('quest_template');
              const templateReq = templateStore.getAll();
              templateReq.onsuccess = () => {
                const template = (templateReq.result as { id: string; title: string }[]).find(
                  (t) => t.title === templateTitle
                );
                if (!template) {
                  resolve(false);
                  return;
                }
                const instanceStore = tx.objectStore('quest_instance');
                const instanceReq = instanceStore.getAll();
                instanceReq.onsuccess = () => {
                  const instances = instanceReq.result as {
                    template_id: string;
                    local_date: string;
                    state: string;
                  }[];
                  const match = instances.find(
                    (i) => i.template_id === template.id && i.local_date === localDate
                  );
                  resolve(match?.state === state);
                };
                instanceReq.onerror = () => reject(instanceReq.error);
              };
              templateReq.onerror = () => reject(templateReq.error);
            };
          }),
        { templateTitle, localDate, state }
      )
    )
    .toBe(true);
}
