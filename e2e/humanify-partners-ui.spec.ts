import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public partner lead form (Wave-17 / Wave-32).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does not submit a live lead unless E2E_PARTNER_SUBMIT=1.
 */
test.describe('Humanify partners UI (soft)', () => {
  test('public partners page shows form cues', async ({ page }) => {
    const res = await page.goto('/humanify/partners', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/Partner Channel|partner/i, { timeout: 15_000 });
    await expect(page.getByText(/Kirim pendaftaran|Nama perusahaan|Email/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Should not bounce to login (public whitelist)
    expect(page.url()).not.toMatch(/\/humanify\/login/);

    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href="/"], a[href*="/humanify/welcome"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href*="/humanify/signup"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Daftar|Jenis mitra/i, { timeout: 10_000 });
    await expect(page.locator('a[href*="/humanify/pricing/roi-calculator"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('body')).toContainText(/ROI|kalkulator/i, { timeout: 8_000 });
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 });
    // Soft: do not submit (avoids partner lead / rate-limit burn)

    if (process.env.E2E_PARTNER_SUBMIT === '1') {
      const stamp = Date.now().toString(36);
      await page.locator('input').nth(1).fill(`E2E Co ${stamp}`).catch(() => {});
      await page.getByLabel(/Nama perusahaan/i).fill(`E2E Co ${stamp}`).catch(async () => {
        await page.locator('form input').first().fill(`E2E Co ${stamp}`);
      });
      // Soft fill via placeholders / structure
      const inputs = page.locator('form input:not([type="hidden"]):not(.hidden)');
      if (await inputs.count() >= 3) {
        await inputs.nth(0).fill(`E2E Co ${stamp}`);
        await inputs.nth(1).fill('E2E Contact');
        await inputs.nth(2).fill(`e2e-${stamp}@example.com`);
      }
      await page.getByRole('button', { name: /Kirim/i }).click();
      await expect(page.locator('body')).toContainText(/terkirim|Terima kasih|menghubungi/i, {
        timeout: 15_000,
      });
    }
  });
});
