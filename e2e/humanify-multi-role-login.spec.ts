import { test, expect } from '@playwright/test';

/**
 * Real multi-role logins via invite accept (owner → manager + staff).
 * Env:
 *   PLAYWRIGHT_BASE_URL=https://humanify.id
 */
const stamp = Date.now().toString(36);
const OWNER_EMAIL = `e2e-mr-owner-${stamp}@humanify.test`;
const OWNER_PASS = 'E2eMulti1!';
const MEMBER_PASS = 'E2eMulti1!';

async function credentialsLogin(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/humanify/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password);
  await page.getByRole('button', { name: /Masuk/i }).first().click();
  await page.waitForURL(/\/humanify(?!\/login)/, { timeout: 20_000 });
}

test.describe('Humanify multi-role login (invite)', () => {
  test('owner invites manager+staff; each logs in with correct role', async ({ page, request }) => {
    test.setTimeout(120_000);

    const signup = await request.post('/api/humanify/signup', {
      data: {
        name: `E2E MR Owner ${stamp}`,
        email: OWNER_EMAIL,
        password: OWNER_PASS,
        companyName: `E2E MR ${stamp}`,
      },
    });
    expect(signup.ok()).toBeTruthy();

    await credentialsLogin(page, OWNER_EMAIL, OWNER_PASS);

    const roles: Array<{ email: string; role: string; name: string }> = [
      { email: `e2e-mr-mgr-${stamp}@humanify.test`, role: 'manager', name: `E2E Manager ${stamp}` },
      { email: `e2e-mr-staff-${stamp}@humanify.test`, role: 'staff', name: `E2E Staff ${stamp}` },
    ];

    for (const r of roles) {
      const inv = await page.request.post('/api/humanify/invitations?action=create', {
        data: { email: r.email, role: r.role, name: r.name },
      });
      expect(inv.status()).toBe(201);
      const invJson = await inv.json();
      const inviteUrl = invJson?.data?.inviteUrl || '';
      const token = invJson?.data?.token || (() => {
        try { return new URL(inviteUrl).searchParams.get('token'); } catch { return null; }
      })();
      test.skip(!token, 'invite token not returned — set HUMANIFY_INVITE_RETURN_TOKEN=true');

      const acc = await request.post('/api/humanify/invitations-accept', {
        data: { token, name: r.name, password: MEMBER_PASS },
      });
      expect(acc.status()).toBe(201);

      await page.context().clearCookies();
      await credentialsLogin(page, r.email, MEMBER_PASS);

      const session = await page.request.get('/api/auth/session');
      const sj = await session.json();
      expect(String(sj?.user?.role || '').toLowerCase()).toBe(r.role);

      const path = r.role === 'manager' ? '/humanify/mss' : '/humanify/ess';
      const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      expect((res?.status() ?? 0)).toBeLessThan(500);

      // Staff sidebar should not advertise Billing in nav text (soft — IA filter)
      if (r.role === 'staff') {
        const body = await page.locator('body').innerText();
        // Billing may still appear in page content elsewhere; check nav roughly
        const nav = page.locator('nav, aside').first();
        if (await nav.count()) {
          const navText = await nav.innerText().catch(() => '');
          expect(navText).not.toMatch(/Impor Karyawan/i);
        }
      }
    }
  });
});
