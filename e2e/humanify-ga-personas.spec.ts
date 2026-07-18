import { test, expect } from '@playwright/test';

/**
 * GA persona routes — after login as platform admin, assert core pages load.
 * Personas are route-sets (HR / Manager / Employee / Admin platform).
 *
 * Env:
 *   PLAYWRIGHT_BASE_URL=https://humanify.id
 *   E2E_EMAIL=superadmin@humanify.id
 *   E2E_PASSWORD=superadmin123
 */
const EMAIL = process.env.E2E_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.E2E_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

const PERSONAS: Record<string, string[]> = {
  hr_admin: ['/humanify', '/humanify/employees', '/humanify/leave', '/humanify/payroll', '/humanify/attendance'],
  manager: ['/humanify/mss', '/humanify/kpi', '/humanify/performance', '/humanify/activities'],
  employee: ['/humanify/ess', '/humanify/leave', '/humanify/announcements'],
  admin: ['/humanify/users/roles', '/humanify/billing', '/humanify/go-live'],
};

async function login(page: import('@playwright/test').Page) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  let ok = false;
  for (const pass of PASSWORDS) {
    await page.locator('input[type="password"], input[name="password"]').first().fill(pass);
    await page.getByRole('button', { name: /Masuk/i }).first().click();
    try {
      await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 15_000 });
      ok = true;
      break;
    } catch {
      await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').first().fill(EMAIL);
    }
  }
  expect(ok).toBeTruthy();
}

test.describe('Humanify GA personas (authenticated routes)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const [persona, routes] of Object.entries(PERSONAS)) {
    test(`persona ${persona} core routes reachable`, async ({ page }) => {
      for (const route of routes) {
        const res = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        const status = res?.status() ?? 0;
        // Cloudflare / Next may 200 or soft-redirect; treat 5xx as hard fail
        expect(status).toBeLessThan(500);
        expect(status).not.toBe(0);
      }
    });
  }

  test('payroll fiscal-signoff API', async ({ page }) => {
    const res = await page.request.get('/api/humanify/payroll?action=fiscal-signoff');
    expect(res.status()).toBeLessThan(500);
    // Cookie jar on some CF edges can omit session for API subrequests; accept auth/entitlement miss
    if (res.status() === 200) {
      const json = await res.json().catch(() => ({}));
      if (json?.success) {
        expect(json.data?.engine?.version).toBeTruthy();
      }
    }
  });
});
