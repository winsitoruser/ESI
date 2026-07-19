import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public reset-password page (Wave-25).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 */
test.describe('Humanify reset-password UI (soft)', () => {
  test('reset-password without token shows incomplete link', async ({ page }) => {
    const res = await page.goto('/humanify/reset-password', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Buat password baru/i, { timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Tautan tidak lengkap|token reset/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Minta tautan reset/i })).toBeVisible({
      timeout: 10_000,
    });
    // Soft: no submit button when token missing
    expect(await page.getByRole('button', { name: /Simpan password baru/i }).count()).toBe(0);
  });

  test('reset-password invalid token shows error (one confirm POST)', async ({ page }) => {
    const res = await page.goto('/humanify/reset-password?token=not-a-real-token', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.getByRole('button', { name: /Simpan password baru/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByPlaceholder(/Password baru/i).fill('TestPass99!');
    await page.getByPlaceholder(/Ulangi password/i).fill('TestPass99!');
    await page.getByRole('button', { name: /Simpan password baru/i }).click();
    await expect(page.locator('body')).toContainText(/Token tidak valid|kedaluwarsa|Reset gagal/i, {
      timeout: 15_000,
    });
  });
});
