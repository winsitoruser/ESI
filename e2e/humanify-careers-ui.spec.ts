import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public careers portal (Wave-25).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT apply to jobs.
 */
test.describe('Humanify careers portal UI (soft)', () => {
  test('demo careers page loads soft cues', async ({ page }) => {
    const res = await page.goto('/c/demo/careers', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Portal karir|Karir|lowongan|Memuat/i, {
      timeout: 15_000,
    });
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Masuk HR/i, { timeout: 8_000 });
    await expect(page.locator('body')).toContainText(/Lamar langsung|Belum ada lowongan|lowongan/i, {
      timeout: 15_000,
    });
    // Soft: do not open apply form / submit
  });

  test('global /careers help page soft cues', async ({ page }) => {
    const res = await page.goto('/careers', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Portal karir per perusahaan/i, {
      timeout: 15_000,
    });
    await expect(page.locator('body')).toContainText(/\/c\/|slug-perusahaan/i, {
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/Masuk HR/i, { timeout: 8_000 });
    await expect(page.locator('a[href*="/humanify/welcome"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
