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
  employee: ['/humanify/ess', '/employee', '/humanify/leave'],
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
      await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 12_000 });
      ok = true;
      break;
    } catch {
      /* try next password */
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
        const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
        const status = res?.status() ?? 0;
        expect(status === 200 || status === 304 || status === 307 || status === 302).toBeTruthy();
        // Should not bounce permanently to login for platform admin
        await expect(page).not.toHaveURL(/\/humanify\/login$/, { timeout: 8_000 });
      }
    });
  }

  test('payroll fiscal-signoff API', async ({ request, page }) => {
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const res = await request.get('/api/humanify/payroll?action=fiscal-signoff', {
      headers: { Cookie: cookieHeader },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.data?.engine?.version).toBeTruthy();
  });
});
