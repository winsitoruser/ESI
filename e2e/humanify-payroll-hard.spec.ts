import { test, expect } from '@playwright/test';

/**
 * Hard payroll UI (Wave-55 / PAY-L2-1) — D-014 amend: staging continuous.
 * Skipped by default. Enable only on staging/lab:
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

async function login(page: any) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 30_000 });
}

test.describe('Humanify payroll UI (hard — staging only)', () => {
  test.skip(!enabled || !looksStaging, 'Set HUMANIFY_E2E_HARD=1 + staging PLAYWRIGHT_BASE_URL (D-014)');

  test('login → payroll main → slip → PPh21 without 5xx', async ({ page }) => {
    test.skip(!email || !password, 'HUMANIFY_E2E_EMAIL / HUMANIFY_E2E_PASSWORD required');

    await login(page);

    for (const path of [
      '/humanify/payroll/main',
      '/humanify/payroll/slip-gaji',
      '/humanify/payroll/pph21',
    ] as const) {
      const res = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      expect((res?.status() ?? 0)).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/humanify\/login/);
      // Soft assert: page shell rendered (no crash)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
