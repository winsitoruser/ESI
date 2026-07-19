import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public ROI calculator (Wave-26).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit calculator / burn APIs.
 */
test.describe('Humanify ROI calculator UI (soft)', () => {
  test('roi calculator page shows public cues', async ({ page }) => {
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
  });
});
