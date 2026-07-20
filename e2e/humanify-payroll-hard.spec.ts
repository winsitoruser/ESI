import { test, expect } from '@playwright/test';

/**
 * Hard payroll UI (Wave-55 / PAY-L2-1) — D-014 amend: staging continuous.
 * Skipped by default. Enable only on public staging (or lab host):
 *   HUMANIFY_E2E_HARD=1 PLAYWRIGHT_BASE_URL=https://staging.humanify.id \
 *   HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
 *   npx playwright test e2e/humanify-payroll-hard.spec.ts
 *
 * Do NOT use http://127.0.0.1:3021 — NEXTAUTH_URL is https://staging.humanify.id,
 * so cookies mismatch and login sticks on /auth/login. Loopback only with
 * HUMANIFY_E2E_ALLOW_LOOPBACK=1 (local NEXTAUTH_URL must match).
 *
 * Prod must keep soft auth-gate only (`humanify-payroll-ui.spec.ts`).
 */
const enabled = process.env.HUMANIFY_E2E_HARD === '1';
const base = process.env.PLAYWRIGHT_BASE_URL || '';
const looksLoopback = /localhost|127\.0\.0\.1/i.test(base);
const allowLoopback = process.env.HUMANIFY_E2E_ALLOW_LOOPBACK === '1';
const looksStaging =
  /staging|lab/i.test(base) || (looksLoopback && allowLoopback);
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
  test.skip(
    !enabled || !looksStaging,
    'Set HUMANIFY_E2E_HARD=1 + PLAYWRIGHT_BASE_URL=https://staging.humanify.id (not 127.0.0.1; D-014/D-025)',
  );

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
