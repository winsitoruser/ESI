import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public verify-email (Wave-27).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT click "Kirim ulang" (needs session).
 */
test.describe('Humanify verify-email UI (soft)', () => {
  test('verify-email without token shows idle cues', async ({ page }) => {
    const res = await page.goto('/humanify/verify-email', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login$/);
    await expect(page.locator('body')).toContainText(/Verifikasi email/i, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Masuk untuk mengirim ulang|buka link dari email/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Login/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Kirim ulang/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href="/"], a[href*="/humanify/welcome"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/Pelajari Humanify/i, { timeout: 8_000 });
    // Soft: do not click Kirim ulang (needs session)
  });

  test('verify-email invalid token shows error', async ({ page }) => {
    const res = await page.goto('/humanify/verify-email?token=not-a-real-token', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Verifikasi email/i, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Verifikasi gagal|tidak valid|kedaluwarsa|Gagal/i, {
      timeout: 20_000,
    });
  });
});
