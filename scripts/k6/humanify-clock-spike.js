/**
 * WAVE-5 WQ-082 — clock-in spike 1000 req/min. Staging synthetic employees only.
 * Requires PERF_ALLOW_WRITE=1 so a dry run cannot punch production.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3010').replace(/\/$/, '');

export const options = {
  scenarios: {
    clock_spike: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.CLOCK_RATE || 16), // ~960/min
      timeUnit: '1s',
      duration: __ENV.DURATION || '1m',
      preAllocatedVUs: 20,
      maxVUs: 80,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  if (__ENV.PERF_ALLOW_WRITE !== '1') {
    throw new Error('Set PERF_ALLOW_WRITE=1 on staging only. Clock spike writes attendance.');
  }
  if (/https:\/\/(www\.)?humanify\.id$/i.test(BASE)) {
    throw new Error('Clock spike is forbidden on production.');
  }
}

export default function () {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.K6_COOKIE) headers.Cookie = __ENV.K6_COOKIE;
  const res = http.post(
    `${BASE}/api/employee/dashboard`,
    JSON.stringify({ action: 'clock-in', lat: -6.2, lng: 106.8 }),
    { headers },
  );
  check(res, { 'not 5xx': (r) => r.status < 500 });
  sleep(0.1);
}
