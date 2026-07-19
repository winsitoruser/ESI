import { test, expect } from '@playwright/test';

/**
 * Smoke: marketing welcome loads and routes to Humanify login form.
 * Soft login cues (forgot / signup) — Wave-28. Does not submit credentials.
 */
test.describe('Humanify welcome → login', () => {
  test('welcome page is reachable and links to login', async ({ page }) => {
    const res = await page.goto('/humanify/welcome', { waitUntil: 'domcontentloaded' });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();
    await expect(page).toHaveTitle(/Humanify/i);

    const loginLink = page.locator('a[href*="/humanify/login"]').first();
    await expect(loginLink).toBeVisible({ timeout: 15_000 });
    await loginLink.click();
    await expect(page).toHaveURL(/\/humanify\/login/);
  });

  test('login page shows email + password fields', async ({ page }) => {
    await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk/i }).first()).toBeVisible();
  });

  test('login page shows forgot-password and signup cues (soft)', async ({ page }) => {
    const res = await page.goto('/humanify/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('a[href*="/humanify/forgot-password"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('body')).toContainText(/Lupa password/i, { timeout: 10_000 });
    await expect(page.locator('a[href*="/humanify/signup"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/employee/login"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/Portal Karyawan/i, { timeout: 10_000 });
    // Soft: do not submit login
  });

  test('welcome page shows ROI and employee portal CTAs (soft)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const res = await page.goto('/humanify/welcome', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('a[href*="/humanify/pricing/roi-calculator"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('a[href*="/employee/login"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/humanify/signup"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
