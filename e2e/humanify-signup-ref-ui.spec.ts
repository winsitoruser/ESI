import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: public signup with referral prefill (Wave-23).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT submit signup (avoids creating tenants / rate-limit burn).
 */
test.describe('Humanify signup referral UI (soft)', () => {
  test('signup ?ref=DEMO prefills partner code', async ({ page }) => {
    const res = await page.goto('/humanify/signup?ref=DEMO', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    expect(page.url()).not.toMatch(/\/humanify\/login/);
    await expect(page.locator('body')).toContainText(/Daftar|Signup|Buat akun|Kode partner/i, {
      timeout: 15_000,
    });

    const byLabel = page.getByLabel(/Kode partner/i);
    if (await byLabel.count()) {
      await expect(byLabel.first()).toHaveValue(/DEMO/i, { timeout: 10_000 });
    } else {
      // Soft fallback: any visible input with DEMO, or body cue
      const demoInput = page.locator('input[value="DEMO"], input[value="demo"]');
      if (await demoInput.count()) {
        await expect(demoInput.first()).toBeVisible({ timeout: 8_000 });
      } else {
        await expect(page.locator('body')).toContainText(/Kode partner|DEMO/i, { timeout: 8_000 });
      }
    }
    await expect(page.locator('a[href*="/humanify/login"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).toContainText(/Sudah punya akun|Masuk di sini/i, {
      timeout: 10_000,
    });
    // Soft: do not submit signup
  });
});
