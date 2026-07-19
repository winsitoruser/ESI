import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public ROI calculator (Wave-26 / Wave-33).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit calculator / burn APIs.
 */
test.describe('Humanify ROI calculator UI (soft)', () => {
  test('roi calculator page shows public cues', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const res = await page.goto('/humanify/pricing/roi-calculator', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Kalkulator ROI/i, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Hitung Berapa Banyak|yang Bisa Anda Hemat/i, {
      timeout: 15_000,
    });
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href*="/humanify/welcome"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href*="/humanify/partners"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="range"]').first()).toBeVisible({ timeout: 10_000 });
    // Soft: do not drive API-heavy recalculation loops
  });
});
