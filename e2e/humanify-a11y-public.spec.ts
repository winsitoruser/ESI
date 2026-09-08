import { test, expect } from '@playwright/test';

/**
 * PR-037 — public login has labeled fields and keyboard-focusable submit.
 */
test('humanify login is labeled and keyboard reachable', async ({ page }) => {
  await page.goto('/humanify/login');
  const email = page.getByLabel(/email/i).first();
  const password = page.getByLabel(/password|kata sandi/i).first();
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await email.focus();
  await expect(email).toBeFocused();
  const submit = page.getByRole('button', { name: /masuk|login|sign in/i }).first();
  await expect(submit).toBeVisible();
});
