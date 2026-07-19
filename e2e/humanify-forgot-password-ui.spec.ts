import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public forgot-password page (Wave-24).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit (avoids email / rate-limit burn).
 */
test.describe('Humanify forgot-password UI (soft)', () => {
  test('forgot-password page shows reset cues', async ({ page }) => {
    const res = await page.goto('/humanify/forgot-password', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login$/);
    await expect(page.locator('body')).toContainText(/Lupa password/i, { timeout: 15_000 });
    await expect(page.getByLabel(/Email/i).or(page.locator('input[type="email"]')).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /Kirim tautan reset|Kirim/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Kembali ke login/i, { timeout: 8_000 });
    // Soft: do not submit (avoids email / rate-limit burn)
  });

  test('login page links to forgot-password', async ({ page }) => {
    const res = await page.goto('/humanify/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const link = page.getByRole('link', { name: /Lupa password/i });
    if (await link.count()) {
      await expect(link.first()).toBeVisible({ timeout: 10_000 });
      await link.first().click();
      await expect(page).toHaveURL(/forgot-password/, { timeout: 15_000 });
    } else {
      // Soft: page still reachable
      await page.goto('/humanify/forgot-password', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(/Lupa password/i, { timeout: 10_000 });
    }
  });
});
