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

  test('auth csrf endpoint returns token', async ({ request }) => {
    const res = await request.get('/api/auth/csrf');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThan(8);
  });

  test('auth providers lists credentials', async ({ request }) => {
    const res = await request.get('/api/auth/providers');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
    const blob = JSON.stringify(body);
    expect(blob).toMatch(/credentials/i);
  });

  test('favicon and employee PWA manifest are public', async ({ request }) => {
    const fav = await request.get('/favicon.ico');
    expect(fav.status()).toBeLessThan(400);

    const man = await request.get('/manifest-employee.json');
    expect(man.status()).toBe(200);
    const body = await man.json();
    expect(body.name || body.short_name).toMatch(/Humanify/i);
    expect(String(body.start_url || '')).toMatch(/\/employee/);
  });

  test('employee service worker script is public', async ({ request }) => {
    const res = await request.get('/sw-employee.js');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toMatch(/\/auth\/login/);
  });

  test('legacy service-worker.js is public', async ({ request }) => {
    const res = await request.get('/service-worker.js');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toMatch(/\/auth\/login/);
  });

  test('PWA icon under /icons is public', async ({ request }) => {
    const res = await request.get('/icons/humanify-192.png');
    expect(res.status()).toBe(200);
    const ctype = res.headers()['content-type'] || '';
    expect(ctype).toMatch(/image\//i);
  });
});
