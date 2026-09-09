/**
 * WAVE-5 WQ-081 — authenticated dashboard. Staging only. Cookie via K6_COOKIE.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3010').replace(/\/$/, '');

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

export function setup() {
  if (/https:\/\/(www\.)?humanify\.id$/i.test(BASE) && __ENV.ALLOW_PROD_LOAD !== '1') {
    throw new Error('Refusing production dashboard load. Use staging.');
  }
}

export default function () {
  const headers = {};
  if (__ENV.K6_COOKIE) headers.Cookie = __ENV.K6_COOKIE;
  const res = http.get(`${BASE}/api/humanify/dashboard`, { headers });
  check(res, { 'not 5xx': (r) => r.status < 500 });
  sleep(1);
}
