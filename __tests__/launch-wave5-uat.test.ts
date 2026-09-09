import fs from 'fs';
import path from 'path';
import {
  PERF_PEAK,
  PERF_SLO,
  assertLoadTargetAllowed,
  k6DurationThreshold,
} from '../lib/saas/perf-targets';
import {
  assertPublicHtmlMatchesPriceBook,
  enterpriseBundlesLmsOrAi,
  requiredPublicPriceClaims,
} from '../lib/saas/public-price-claims';
import { classifyMidtransStatus, computeMidtransSignature } from '../lib/saas/midtrans';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('WAVE-5 perf targets (WQ-080/087)', () => {
  it('freezes 200 VU login and 1000 clock/min', () => {
    expect(PERF_PEAK.loginVu).toBe(200);
    expect(PERF_PEAK.clockReqPerMin).toBe(1000);
    expect(PERF_PEAK.soakHours).toBe(8);
    expect(k6DurationThreshold(PERF_SLO.loginP95Ms)).toBe('p(95)<800');
  });

  it('refuses production login/clock load', () => {
    expect(assertLoadTargetAllowed('https://humanify.id', 'health').ok).toBe(true);
    expect(assertLoadTargetAllowed('https://humanify.id', 'login').ok).toBe(false);
    expect(assertLoadTargetAllowed('https://humanify.id', 'clock').ok).toBe(false);
    expect(assertLoadTargetAllowed('https://staging.humanify.id', 'login').ok).toBe(true);
  });

  it('k6 scripts refuse prod writes', () => {
    const clock = read('scripts/k6/humanify-clock-spike.js');
    expect(clock).toMatch(/PERF_ALLOW_WRITE/);
    expect(clock).toMatch(/forbidden on production/);
    expect(read('scripts/k6/humanify-login.js')).toMatch(/Refusing production login load/);
  });
});

describe('WQ-103 public price claims', () => {
  it('lists IDR strings from the 9 Sep price book', () => {
    const claims = requiredPublicPriceClaims();
    expect(claims).toEqual(['Rp 10.000', 'Rp 9.500', 'Rp 9.000', 'Rp 1.500', 'Rp 65.000']);
    expect(enterpriseBundlesLmsOrAi()).toBe(false);
    const html = claims.map((c) => `Rp <!-- -->${c.slice(3)}`).join(' ') + ' add-on';
    expect(assertPublicHtmlMatchesPriceBook(html).ok).toBe(true);
    expect(assertPublicHtmlMatchesPriceBook('<p>free</p>').missing.length).toBe(5);
  });
});

describe('WQ-095 keyboard labels in source', () => {
  it('associates login and ESS leave fields with htmlFor', () => {
    expect(read('components/humanify/HumanifyLoginForm.tsx')).toMatch(/htmlFor="humanify-login-email"/);
    expect(read('components/humanify/HumanifyLoginForm.tsx')).toMatch(/Lompat ke formulir masuk/);
    expect(read('components/humanify/EmployeePortalLoginForm.tsx')).toMatch(/htmlFor="ess-login-email"/);
    expect(read('components/employee/EmployeePortal.tsx')).toMatch(/htmlFor="ess-leave-type"/);
    expect(read('components/employee/EmployeePortal.tsx')).toMatch(/htmlFor="ess-leave-reason"/);
    expect(read('components/employee/EmployeePortal.tsx')).toMatch(/id="ess-leave-start"/);
  });
});

describe('WQ-100 Midtrans status + bad signature', () => {
  it('maps settlement/pending/deny/expire/cancel', () => {
    expect(classifyMidtransStatus('settlement')).toBe('paid');
    expect(classifyMidtransStatus('pending')).toBe('pending');
    expect(classifyMidtransStatus('deny')).toBe('failed');
    expect(classifyMidtransStatus('expire')).toBe('failed');
    expect(classifyMidtransStatus('cancel')).toBe('failed');
  });

  it('rejects a tampered signature', () => {
    const good = computeMidtransSignature('HFY-1', '200', '10000.00', 'SB-SECRET');
    const bad = computeMidtransSignature('HFY-1', '200', '10000.00', 'OTHER');
    expect(good).not.toBe(bad);
    expect(good).not.toBe('invalid');
  });
});
