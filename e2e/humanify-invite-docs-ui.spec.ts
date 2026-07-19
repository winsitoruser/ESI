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
    await expect(page.locator('body')).toContainText(/karyawan|employee/i, { timeout: 15_000 });
    // Soft: Export / Tambah may be gated by CanAccess / PageGuard for some roles
    const exportBtn = page.getByRole('button', { name: /Export/i });
    const addBtn = page.getByRole('button', { name: /Tambah Karyawan/i });
    const any = (await exportBtn.count()) + (await addBtn.count());
    if (any === 0) {
      // Still OK if list/empty-state rendered
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('payroll page fiscal banner soft', async ({ page }) => {
    const res = await page.goto('/humanify/payroll', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Fiscal engine|payroll|gaji|sign-?off|tanda tangan/i, {
      timeout: 15_000,
    });
    const checklist = page.getByRole('link', { name: /Checklist sign-off|sign-off|Fiscal/i });
    if (await checklist.count()) {
      await expect(checklist.first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('security page MFA enrollment cues soft', async ({ page }) => {
    const res = await page.goto('/humanify/security', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Keamanan|2FA|TOTP|Aktifkan 2FA/i, {
      timeout: 15_000,
    });
    // Soft: do not click enroll / confirm — read-only cue only
    const enrollBtn = page.getByRole('button', { name: /Aktifkan 2FA/i });
    if (await enrollBtn.count()) {
      await expect(enrollBtn.first()).toBeVisible({ timeout: 8_000 });
    }
  });
});
