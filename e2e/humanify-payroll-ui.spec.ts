import { test, expect } from '@playwright/test';

/**
 * Soft payroll auth-gate (Wave-47) — first slice of deferred payroll Playwright.
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT login or run payroll calculations.
 */
test.describe('Humanify payroll UI (soft auth-gate)', () => {
  test('unauthenticated /humanify/payroll redirects to login', async ({ page }) => {
    const res = await page.goto('/humanify/payroll', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page).toHaveURL(/\/humanify\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/callbackUrl=/i);
    expect(decodeURIComponent(page.url())).toMatch(/\/humanify\/payroll/i);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 });
    // Soft: do not submit login / do not open payroll APIs
  });

  test('unauthenticated /humanify/payroll/main redirects to login', async ({ page }) => {
    const res = await page.goto('/humanify/payroll/main', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page).toHaveURL(/\/humanify\/login/, { timeout: 15_000 });
    expect(decodeURIComponent(page.url())).toMatch(/\/humanify\/payroll\/main/i);
    // Soft: do not submit login
  });

  test('unauthenticated /humanify/payroll/pph21 redirects to login', async ({ page }) => {
    const res = await page.goto('/humanify/payroll/pph21', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page).toHaveURL(/\/humanify\/login/, { timeout: 15_000 });
    expect(decodeURIComponent(page.url())).toMatch(/\/humanify\/payroll\/pph21/i);
    // Soft: do not submit login
  });
});
