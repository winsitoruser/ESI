/**
 * WAVE-5 WQ-080 — login ramp 200 VU. Staging + synthetic accounts only.
 *
 *   ALLOW_PROD_LOAD must stay unset. Production host is refused.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3010').replace(/\/$/, '');

function refuseProd() {
  if (/https:\/\/(www\.)?humanify\.id$/i.test(BASE) && __ENV.ALLOW_PROD_LOAD !== '1') {
    throw new Error('Refusing production login load. Use staging. See docs/humanify-wave5-perf-runbook.md');
  }
}

export const options = {
  scenarios: {
    login_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export function setup() {
  refuseProd();
  return { email: __ENV.SMOKE_EMAIL || '', password: __ENV.SMOKE_PASSWORD || '' };
}

export default function (data) {
  const csrf = http.get(`${BASE}/api/auth/csrf`);
  check(csrf, { 'csrf 200': (r) => r.status === 200 });
  if (data.email && data.password) {
    const token = csrf.json('csrfToken');
    const login = http.post(
      `${BASE}/api/auth/callback/credentials`,
      {
        csrfToken: token,
        email: data.email,
        password: data.password,
        json: 'true',
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirects: 0 },
    );
    check(login, { 'login not 5xx': (r) => r.status < 500 });
  }
  sleep(1);
}
