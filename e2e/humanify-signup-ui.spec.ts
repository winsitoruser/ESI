import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public signup without referral (Wave-27).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit (avoids tenant creation / rate-limit burn).
 */
test.describe('Humanify signup UI (soft, no ref)', () => {
  test('signup page loads with empty optional partner', async ({ page }) => {
    const res = await page.goto('/humanify/signup', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Daftar Humanify|Daftar|trial/i, {
      timeout: 15_000,
    });
    await expect(page.locator('body')).toContainText(/Kode partner \(opsional\)|Kode partner/i, {
      timeout: 10_000,
    });

    const byLabel = page.getByLabel(/Kode partner/i);
    if (await byLabel.count()) {
      await expect(byLabel.first()).toHaveValue('', { timeout: 8_000 });
    }
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Sudah punya akun|Masuk di sini/i, {
      timeout: 10_000,
    });
    // Soft: do not submit
  });
});
