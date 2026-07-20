import { test, expect } from '@playwright/test';

/**
 * Wave-61 / QA-4 — Manager approve leave path (staging-gated).
 *
 * Env:
 *   HUMANIFY_E2E_MANAGER_EMAIL / HUMANIFY_E2E_MANAGER_PASSWORD
 *   PLAYWRIGHT_BASE_URL=https://staging.humanify.id (recommended)
 */
const EMAIL = process.env.HUMANIFY_E2E_MANAGER_EMAIL || '';
const PASS = process.env.HUMANIFY_E2E_MANAGER_PASSWORD || '';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASS);
  await page.getByRole('button', { name: /Masuk/i }).first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 20_000 });
}

test.describe('Humanify manager approve leave (Wave-61)', () => {
  test.skip(!EMAIL || !PASS, 'Set HUMANIFY_E2E_MANAGER_EMAIL/PASSWORD');

  test('MSS / manager hub reachable', async ({ page }) => {
    await login(page);
    const res = await page.goto('/humanify/mss', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect(res?.status() ?? 0).toBeLessThan(500);
  });

  test('leave management API responds for session', async ({ page }) => {
    await login(page);
    const res = await page.request.get('/api/humanify/leave?action=list');
    expect(res.status()).toBeLessThan(500);
    // 200 = data; 401/403 = role gate OK for wrong persona
    expect([200, 401, 403]).toContain(res.status());
  });
});
