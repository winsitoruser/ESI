import { test, expect } from '@playwright/test';

/**
 * Soft payroll auth-gate (Wave-47 / Wave-48) — deferred payroll Playwright slices.
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 * Does NOT login or run payroll calculations.
 */
const PAYROLL_GATED = [
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/pph21',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/thr',
  '/humanify/payroll/bonus',
  '/humanify/payroll/lembur',
  '/humanify/payroll/laporan',
  '/humanify/payroll/disbursement',
  '/humanify/payroll/cash-advance',
  '/humanify/payroll/loan',
] as const;

test.describe('Humanify payroll UI (soft auth-gate)', () => {
  for (const path of PAYROLL_GATED) {
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
      // Soft: do not submit login / do not open payroll APIs
    });
  }
});
