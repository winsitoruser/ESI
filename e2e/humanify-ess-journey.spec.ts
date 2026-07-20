import { test, expect } from '@playwright/test';

/**
 * ESS journey (Wave-56 / QA-1) — staging-gated skeleton.
 * Skipped by default. Enable only on staging/lab:
 *   HUMANIFY_E2E_HARD=1 PLAYWRIGHT_BASE_URL=https://staging… \
 *   HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
 *   npx playwright test e2e/humanify-ess-journey.spec.ts
 *
 * Prod keeps soft auth-gate specs only.
 */
const enabled = process.env.HUMANIFY_E2E_HARD === '1';
const base = process.env.PLAYWRIGHT_BASE_URL || '';
const looksStaging = /staging|localhost|127\.0\.0\.1|lab/i.test(base);
const email = process.env.HUMANIFY_E2E_EMAIL || '';
const password = process.env.HUMANIFY_E2E_PASSWORD || '';

async function loginEmployee(page: any) {
  await page.goto('/employee/login', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/employee(?!\/login)/, { timeout: 30_000 });
}

test.describe('Humanify ESS journey (hard — staging only)', () => {
  test.skip(!enabled || !looksStaging, 'Set HUMANIFY_E2E_HARD=1 + staging PLAYWRIGHT_BASE_URL (Wave-56 QA-1)');

  test('login → home → leave → payslip shells without 5xx', async ({ page }) => {
    test.skip(!email || !password, 'HUMANIFY_E2E_EMAIL / HUMANIFY_E2E_PASSWORD required');

    await loginEmployee(page);

    for (const path of ['/employee', '/employee/leave', '/employee/payslip', '/employee/attendance'] as const) {
      const res = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      expect((res?.status() ?? 0)).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/employee\/login/);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
