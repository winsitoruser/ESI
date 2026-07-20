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

  test('demo careers job detail soft (no apply submit)', async ({ page }) => {
    await page.goto('/c/demo/careers', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const slugLinks = page.locator('a[href^="/c/demo/careers/"]');
    const count = await slugLinks.count();
    if (count === 0) {
      await expect(page.locator('body')).toContainText(/Belum ada lowongan|Memuat|Portal karir/i, {
        timeout: 10_000,
      });
      return;
    }
    let target = slugLinks.first();
    for (let i = 0; i < count; i++) {
      const href = await slugLinks.nth(i).getAttribute('href');
      if (href && /\/c\/demo\/careers\/[^/]+/.test(href)) {
        target = slugLinks.nth(i);
        break;
      }
    }
    const href = await target.getAttribute('href');
    if (!href || !/\/c\/demo\/careers\/[^/]+/.test(href)) {
      await expect(page.locator('body')).toContainText(/Belum ada lowongan|Portal karir/i);
      return;
    }
    await target.click();
    await expect(page).toHaveURL(/\/c\/demo\/careers\/.+/, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Lamar|Lamaran|Kembali|lowongan/i, {
      timeout: 15_000,
    });
    // Soft: do not submit Kirim Lamaran
    expect(page.url()).not.toMatch(/\/humanify\/login/);
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
    await expect(page.locator('a[href="/"], a[href*="/humanify/welcome"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/humanify/signup"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/Daftar/i, { timeout: 8_000 });
  });
});
