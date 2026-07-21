/**
 * Authenticated UI smoke — visit key Humanify pages and click primary CTAs (soft).
 * Staging only. Usage:
 *   PLAYWRIGHT_BASE_URL=https://staging.humanify.id \
 *   HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
 *   npx playwright test e2e/humanify-authenticated-ui-smoke.spec.ts
 */
import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || '';
const email = process.env.HUMANIFY_E2E_EMAIL || process.env.SMOKE_EMAIL || '';
const password = process.env.HUMANIFY_E2E_PASSWORD || process.env.SMOKE_PASSWORD || '';
const allowProd = process.env.HUMANIFY_E2E_ALLOW_PROD === '1';
const enabled =
  Boolean(email && password) &&
  (/staging|lab/i.test(base) || (allowProd && /humanify\.id/i.test(base)));

async function login(page: any) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 45_000 });
}

const PAGES = [
  '/humanify',
  '/humanify/employees',
  '/humanify/attendance',
  '/humanify/leave',
  '/humanify/payroll/main',
  '/humanify/payroll/thr',
  '/humanify/payroll/bpjs',
  '/humanify/recruitment',
  '/humanify/performance',
  '/humanify/organization',
  '/humanify/billing',
  '/humanify/reports',
  '/humanify/users',
  '/humanify/training',
  '/employee',
] as const;

test.describe('Humanify authenticated UI smoke (staging)', () => {
  test.skip(!enabled, 'Set PLAYWRIGHT_BASE_URL=staging + credentials');

  test('login → key pages load → primary buttons visible/clickable (soft)', async ({ page }) => {
    await login(page);

    for (const path of PAGES) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      expect((res?.status() ?? 0)).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/humanify\/login$/);
      await expect(page.locator('body')).toBeVisible();

      // Soft: find a primary action button if present; click only safe non-destructive ones
      const candidates = page.locator(
        'button:visible, a[role="button"]:visible, [data-testid*="add"]:visible, [data-testid*="create"]:visible',
      );
      const count = await candidates.count();
      if (count > 0) {
        const first = candidates.first();
        const label = ((await first.innerText().catch(() => '')) || '').trim().toLowerCase();
        const dangerous = /hapus|delete|terminate|phk|bayar|disburse|approve|tolak|reject|logout|keluar/.test(label);
        if (!dangerous) {
          await first.click({ trial: true }).catch(() => {});
        }
      }
    }
  });
});
