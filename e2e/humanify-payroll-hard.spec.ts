import { test, expect } from '@playwright/test';

/**
 * Hard payroll UI (Wave-54 / CP-S4-1) — D-014.
 * Skipped by default. Enable only on staging:
 *   HUMANIFY_E2E_HARD=1 PLAYWRIGHT_BASE_URL=https://staging… \
 *   HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
 *   npx playwright test e2e/humanify-payroll-hard.spec.ts
 *
 * Prod must keep soft auth-gate only (`humanify-payroll-ui.spec.ts`).
 */
const enabled = process.env.HUMANIFY_E2E_HARD === '1';
const base = process.env.PLAYWRIGHT_BASE_URL || '';
const looksStaging = /staging|localhost|127\.0\.0\.1|lab/i.test(base);
const email = process.env.HUMANIFY_E2E_EMAIL || '';
const password = process.env.HUMANIFY_E2E_PASSWORD || '';

test.describe('Humanify payroll UI (hard — staging only)', () => {
  test.skip(!enabled || !looksStaging, 'Set HUMANIFY_E2E_HARD=1 + staging PLAYWRIGHT_BASE_URL (D-014)');

  test('login then open payroll main without 5xx', async ({ page }) => {
    test.skip(!email || !password, 'HUMANIFY_E2E_EMAIL / HUMANIFY_E2E_PASSWORD required');

    await page.goto('/humanify/login', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 30_000 });

    const res = await page.goto('/humanify/payroll/main', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/humanify\/login/);
  });
});
