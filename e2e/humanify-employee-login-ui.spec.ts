import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: employee portal login cues (Wave-29).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit credentials.
 */
test.describe('Humanify employee login UI (soft)', () => {
  test('employee login shows portal cues and fields', async ({ page }) => {
    const res = await page.goto('/employee/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Portal Karyawan/i, {
      timeout: 15_000,
    });
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk/i }).first()).toBeVisible();
    // Soft: do not submit
  });
});
