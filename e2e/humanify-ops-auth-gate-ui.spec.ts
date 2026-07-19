import { test, expect } from '@playwright/test';

/**
 * Soft ops/settings auth-gate (Wave-50) — billing, security, KPI, training, …
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT login or mutate tenant data.
 */
const OPS_GATED = [
  '/humanify/billing',
  '/humanify/security',
  '/humanify/kpi',
  '/humanify/kpi-settings',
  '/humanify/okr',
  '/humanify/training',
  '/humanify/training-development',
  '/humanify/enterprise',
  '/humanify/sso',
  '/humanify/go-live',
  '/humanify/users',
  '/humanify/reports',
] as const;

test.describe('Humanify ops UI (soft auth-gate)', () => {
  for (const path of OPS_GATED) {
    test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
      const res = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      expect((res?.status() ?? 0)).toBeLessThan(500);
      await expect(page).toHaveURL(/\/humanify\/login/, { timeout: 15_000 });
      expect(page.url()).toMatch(/callbackUrl=/i);
      const decoded = decodeURIComponent(page.url());
      expect(decoded).toContain(path);
      // Soft: do not submit login / do not open ops APIs
    });
  }
});
