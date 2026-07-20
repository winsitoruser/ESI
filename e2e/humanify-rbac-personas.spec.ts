import { test, expect } from '@playwright/test';

/**
 * Wave-59 / QA-2 — RBAC persona smoke (staging-gated).
 * Requires seeded tenant users (optional — skips when env missing).
 *
 * Env:
 *   HUMANIFY_E2E_HR_EMAIL / HUMANIFY_E2E_HR_PASSWORD
 *   HUMANIFY_E2E_EMPLOYEE_EMAIL / HUMANIFY_E2E_EMPLOYEE_PASSWORD
 *   PLAYWRIGHT_BASE_URL=https://staging.humanify.id (recommended)
 */
const HR_EMAIL = process.env.HUMANIFY_E2E_HR_EMAIL || '';
const HR_PASS = process.env.HUMANIFY_E2E_HR_PASSWORD || '';
const EMP_EMAIL = process.env.HUMANIFY_E2E_EMPLOYEE_EMAIL || '';
const EMP_PASS = process.env.HUMANIFY_E2E_EMPLOYEE_PASSWORD || '';

async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.getByRole('button', { name: /Masuk/i }).first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 20_000 });
}

test.describe('Humanify RBAC personas (Wave-59)', () => {
  test.skip(!HR_EMAIL || !HR_PASS, 'Set HUMANIFY_E2E_HR_EMAIL/PASSWORD for HR persona');

  test('HR admin can open payroll', async ({ page }) => {
    await loginAs(page, HR_EMAIL, HR_PASS);
    const res = await page.goto('/humanify/payroll', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect(res?.status() ?? 0).toBeLessThan(500);
    expect(res?.status()).not.toBe(403);
  });

  test.skip(!EMP_EMAIL || !EMP_PASS, 'Set HUMANIFY_E2E_EMPLOYEE_EMAIL/PASSWORD for employee persona');

  test('employee ESS route loads', async ({ page }) => {
    await loginAs(page, EMP_EMAIL, EMP_PASS);
    const res = await page.goto('/employee', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect(res?.status() ?? 0).toBeLessThan(500);
  });
});
