/**
 * Authenticated UI deep smoke — all People/Attendance/Payroll/Talent pages listed by QA.
 * Soft button probe (non-destructive). Works on staging or prod with explicit allow.
 *
 *   PLAYWRIGHT_BASE_URL=https://humanify.id \
 *   HUMANIFY_E2E_ALLOW_PROD=1 \
 *   HUMANIFY_E2E_EMAIL=… HUMANIFY_E2E_PASSWORD=… \
 *   npx playwright test e2e/humanify-module-pages-ui.spec.ts --reporter=line
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
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 60_000 });
}

const PAGES = [
  '/humanify/employees',
  '/humanify/employees-import',
  '/humanify/organization',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/contracts',
  '/humanify/assets',
  '/humanify/org-settings',
  '/humanify/ess',
  '/humanify/mss',
  '/humanify/attendance',
  '/humanify/attendance-management',
  '/humanify/attendance/daily',
  '/humanify/attendance/devices',
  '/humanify/attendance/settings',
  '/humanify/leave',
  '/humanify/okr',
  '/humanify/kpi',
  '/humanify/kpi-settings',
  '/humanify/performance',
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/thr',
  '/humanify/payroll/pph21',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/lembur',
  '/humanify/payroll/bonus',
  '/humanify/payroll/cash-advance',
  '/humanify/payroll/loan',
  '/humanify/payroll/laporan',
  '/humanify/payroll/disbursement',
  '/humanify/reimbursement',
  '/humanify/casual-workforce',
  '/humanify/recruitment',
  '/careers',
  '/humanify/lms',
] as const;

test.describe('Humanify module pages UI', () => {
  test.skip(!enabled, 'Set PLAYWRIGHT_BASE_URL + credentials (+ HUMANIFY_E2E_ALLOW_PROD=1 for prod)');
  test.setTimeout(10 * 60_000);

  test('login → all module pages load → soft CTA probe', async ({ page }) => {
    await login(page);

    for (const path of PAGES) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const status = res?.status() ?? 0;
      expect(status, path).toBeLessThan(500);

      if (path === '/careers') {
        await expect(page.locator('body')).toBeVisible();
        continue;
      }

      await expect(page, path).not.toHaveURL(/\/humanify\/login$/);
      await expect(page.locator('body')).toBeVisible();

      // Soft tabs: click first non-active tab if present
      const tabs = page.locator('button[role="tab"]:visible, [role="tablist"] button:visible, nav button:visible');
      const tabCount = Math.min(await tabs.count(), 4);
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click({ timeout: 3_000 }).catch(() => {});
      }

      const candidates = page.locator(
        'button:visible, a[role="button"]:visible, [data-testid*="add"]:visible, [data-testid*="create"]:visible',
      );
      const count = await candidates.count();
      if (count > 0) {
        const first = candidates.first();
        const label = ((await first.innerText().catch(() => '')) || '').trim().toLowerCase();
        const dangerous =
          /hapus|delete|terminate|phk|bayar|disburse|approve|tolak|reject|logout|keluar|kirim|submit final/.test(
            label,
          );
        if (!dangerous) {
          await first.click({ trial: true }).catch(() => {});
        }
      }
    }
  });
});
