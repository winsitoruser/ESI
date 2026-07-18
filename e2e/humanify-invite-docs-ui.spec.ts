import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: invite team page + employee documents panel reachable.
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 */
const EMAIL = process.env.E2E_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.E2E_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

async function login(page: import('@playwright/test').Page) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  let ok = false;
  for (const pass of PASSWORDS) {
    await page.locator('input[type="password"], input[name="password"]').first().fill(pass!);
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

test.describe('Humanify invite + docs UI (soft)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('team invite page loads', async ({ page }) => {
    const res = await page.goto('/humanify/users', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/undangan|invite|tim|email/i, { timeout: 15_000 });
  });

  test('employees page has export / create controls', async ({ page }) => {
    const res = await page.goto('/humanify/employees', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const exportBtn = page.getByRole('button', { name: /Export/i });
    const addBtn = page.getByRole('button', { name: /Tambah Karyawan/i });
    // At least one control visible for HR admin
    const any = (await exportBtn.count()) + (await addBtn.count());
    expect(any).toBeGreaterThan(0);
  });

  test('payroll page fiscal banner soft', async ({ page }) => {
    const res = await page.goto('/humanify/payroll', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
  });
});
