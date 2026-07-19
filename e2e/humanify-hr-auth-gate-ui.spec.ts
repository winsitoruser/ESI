import { test, expect } from '@playwright/test';

/**
 * Soft HR auth-gate (Wave-49) — core HRIS modules redirect when unauthenticated.
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT login or mutate HR data.
 */
const HR_GATED = [
  '/humanify/employees',
  '/humanify/employees-import',
  '/humanify/attendance',
  '/humanify/attendance-management',
  '/humanify/attendance/daily',
  '/humanify/leave',
  '/humanify/recruitment',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/reimbursement',
  '/humanify/performance',
  '/humanify/organization',
] as const;

test.describe('Humanify HR UI (soft auth-gate)', () => {
  for (const path of HR_GATED) {
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
      // Soft: do not submit login / do not open HR APIs
    });
  }
});
