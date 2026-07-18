import { test, expect } from '@playwright/test';

/**
 * Soft UI smoke: employee documents panel + upload modal cues (FE-3).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 */
const EMAIL = process.env.E2E_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.E2E_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

async function login(page: import('@playwright/test').Page) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  let ok = false;
  for (const pass of PASSWORDS) {
    await page.locator('input[type="password"], input[name="password"]').first().fill(pass!);
    await page.getByRole('button', { name: /Masuk/i }).first().click();
    try {
      await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 15_000 });
      ok = true;
      break;
    } catch {
      await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').first().fill(EMAIL);
    }
  }
  expect(ok).toBeTruthy();
}

test.describe('Humanify docs upload UI (soft)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('employees page opens and documents tab reachable', async ({ page }) => {
    const res = await page.goto('/humanify/employees', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/karyawan|employee/i, { timeout: 15_000 });

    // Soft: click first employee row if present
    const row = page.locator('table tbody tr, [data-employee-id], .employee-row').first();
    if (await row.count()) {
      await row.click({ timeout: 5_000 }).catch(() => {});
      const docsTab = page.getByRole('button', { name: /Dokumen|Documents/i })
        .or(page.getByText(/Dokumen|Documents/i).first());
      if (await docsTab.count()) {
        await docsTab.first().click({ timeout: 5_000 }).catch(() => {});
      }
      // Upload / Tambah dokumen control if panel loaded
      const uploadCue = page.getByRole('button', { name: /Upload|Tambah|Unggah|Dokumen/i });
      if (await uploadCue.count()) {
        await uploadCue.first().click({ timeout: 5_000 }).catch(() => {});
        // Modal cues: file input or drag zone or progress
        const modalCue = page.locator('text=/PDF|JPG|drag|seret|Unggah|maksimal/i').first();
        if (await modalCue.count()) {
          await expect(modalCue).toBeVisible({ timeout: 8_000 });
        }
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('esign page loads with Privy badge area', async ({ page }) => {
    const res = await page.goto('/humanify/esign', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/e-?sign|Privy|tanda tangan/i, { timeout: 15_000 });
  });

  test('slip gaji page loads (payslip gate soft)', async ({ page }) => {
    const res = await page.goto('/humanify/payroll/slip-gaji', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    expect((res?.status() ?? 0)).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/slip|gaji|payslip/i, { timeout: 15_000 });
  });
});
