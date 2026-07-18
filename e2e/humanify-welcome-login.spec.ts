import { test, expect } from '@playwright/test';

/**
 * Smoke: marketing welcome loads and routes to Humanify login form.
 * Does not assert successful auth (credentials differ per env).
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
});
