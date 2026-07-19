import { test, expect } from '@playwright/test';

/**
 * Soft smoke: public /api/health liveness + deep readiness (Wave-28).
 * Env: PLAYWRIGHT_BASE_URL=https://humanify.id
 */
test.describe('Humanify health probe (soft)', () => {
  test('liveness /api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('humanify');
    const cache = res.headers()['cache-control'] || '';
    expect(cache).toMatch(/no-store/i);
  });

  test('readiness /api/health?deep=1 pings db', async ({ request }) => {
    const res = await request.get('/api/health?deep=1');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe(true);
    expect(typeof body.dbLatencyMs).toBe('number');
  });
});
