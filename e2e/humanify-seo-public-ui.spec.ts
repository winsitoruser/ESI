import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: robots.txt + sitemap.xml (Wave-27).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 */
test.describe('Humanify SEO public surfaces (soft)', () => {
  test('robots.txt allows marketing and disallows api', async ({ page }) => {
    const res = await page.goto('/robots.txt', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/User-agent/i);
    expect(body).toMatch(/Disallow:\s*\/api\//i);
    expect(body).toMatch(/Sitemap:\s*https:\/\/humanify\.id\/sitemap\.xml/i);
  });

  test('sitemap.xml lists public welcome URL', async ({ page }) => {
    const res = await page.goto('/sitemap.xml', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/urlset/i);
    expect(body).toMatch(/humanify\.id\/humanify\/welcome/i);
  });

  test('security.txt is reachable with Contact', async ({ page }) => {
    const res = await page.goto('/.well-known/security.txt', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Contact:\s*mailto:ops@humanify\.id/i);
    expect(body).toMatch(/Expires:/i);
    expect(body).toMatch(/Canonical:\s*https:\/\/humanify\.id\/\.well-known\/security\.txt/i);
  });
});
