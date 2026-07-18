import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.SMOKE_BASE_URL || 'http://localhost:3010';

/**
 * Humanify smoke — public path welcome → login.
 * Against local: npm run dev, then npm run test:e2e:humanify
 * Against prod: PLAYWRIGHT_BASE_URL=https://humanify.id npm run test:e2e:humanify
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
