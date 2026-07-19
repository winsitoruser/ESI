import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public invite-accept /humanify/join (Wave-26).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT POST accept (no account creation).
 */
test.describe('Humanify join invite UI (soft)', () => {
  test('join without token shows incomplete link', async ({ page }) => {
    const res = await page.goto('/humanify/join', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Bergabung ke tim/i, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Tautan tidak lengkap|token undangan|tidak ditemukan/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Kembali ke login/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('a[href*="/humanify/welcome"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/Pelajari Humanify/i, { timeout: 8_000 });
  });

  test('join invalid token shows invalid reason (GET preview only)', async ({ page }) => {
    const res = await page.goto('/humanify/join?token=not-a-real-token', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Bergabung ke tim/i, { timeout: 15_000 });
    // Soft: invalid preview — no accept form submit
    await expect(page.locator('body')).toContainText(/tidak valid|kedaluwarsa|tidak ditemukan|Gagal/i, {
      timeout: 15_000,
    });
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    expect(await page.getByRole('button', { name: /Buat akun|Terima undangan|Bergabung/i }).count()).toBeLessThan(2);
    // Soft: invalid preview — no accept form submit
  });
});
