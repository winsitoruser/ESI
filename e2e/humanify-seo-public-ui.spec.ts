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
    expect(body).toMatch(/Allow:\s*\/\.well-known\/security\.txt/i);
    expect(body).toMatch(/Allow:\s*\/llms\.txt/i);
    expect(body).toMatch(/Allow:\s*\/humans\.txt/i);
    expect(body).toMatch(/Allow:\s*\/careers/i);
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
    expect(body).toMatch(/humanify\.id\/humanify\/partners/i);
    expect(body).toMatch(/humanify\.id\/humanify\/pricing\/roi-calculator/i);
    expect(body).toMatch(/humanify\.id\/humanify\/signup/i);
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

  test('llms.txt describes Humanify public surfaces', async ({ page }) => {
    const res = await page.goto('/llms.txt', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Humanify/i);
    expect(body).toMatch(/humanify\.id\/humanify\/welcome/i);
    expect(body).toMatch(/sitemap\.xml/i);
    expect(body).toMatch(/humans\.txt/i);
    expect(body).toMatch(/\.well-known\/security\.txt/i);
    expect(body).toMatch(/humanify\.id\/careers/i);
  });

  test('humans.txt is reachable with team contact', async ({ page }) => {
    const res = await page.goto('/humans.txt', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/TEAM|Naincode/i);
    expect(body).toMatch(/ops@humanify\.id|CONTACT/i);
    expect(body).toMatch(/llms\.txt/i);
  });
});
