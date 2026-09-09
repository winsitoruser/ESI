/**
 * WAVE-5 WQ-080 (light). Health only — allowed on prod at small VU.
 *
 *   k6 run -e BASE_URL=https://staging.humanify.id scripts/k6/humanify-health.js
 *   k6 run -e BASE_URL=https://humanify.id -e VUS=10 -e DURATION=15s scripts/k6/humanify-health.js
 *
 * Full 200 VU login belongs on staging (humanify-login.js), never on prod.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3010').replace(/\/$/, '');
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '15s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'], // proposed SLO; freeze still 200ms pending WQ-087
  },
};

export default function () {
  const res = http.get(`${BASE}/api/health`);
  check(res, {
    'health 200': (r) => r.status === 200,
    'json ok': (r) => String(r.body || '').includes('"status"'),
  });
  sleep(0.2);
}
