import { redactForLlm } from '@/lib/hris/ai-prompt-redact';
import { assertSafeUpload } from '@/lib/security/safe-upload';
import { canActAsChecker } from '@/lib/saas/maker-checker';
import {
  mintStepUpToken,
  verifyStepUpToken,
  isStepUpRequired,
} from '@/lib/saas/step-up-auth';
import { canExportSensitiveData } from '@/lib/saas/export-audit';

describe('SEC-AI-001 prompt redaction', () => {
  it('masks keys, NIK-like, and emails', () => {
    const raw = 'key=sk_live_abc123456789 password=secret123 NIK 3201010101010001 mail@test.com';
    const out = redactForLlm(raw);
    expect(out).not.toMatch(/sk_live_abc/);
    expect(out).toContain('[REDACTED_EMAIL]');
    expect(out).toMatch(/\*{4}|\[REDACTED/);
    expect(out).not.toContain('3201010101010001');
  });
});

describe('SEC-APP-009 safe upload', () => {
  it('rejects unknown mime and oversize', () => {
    expect(assertSafeUpload({ mime: 'application/x-msdownload', size: 10 }).ok).toBe(false);
    expect(assertSafeUpload({ mime: 'application/pdf', size: 50 * 1024 * 1024 }).ok).toBe(false);
  });

  it('accepts PDF with magic bytes', () => {
    const buf = Buffer.from('%PDF-1.4 hello');
    const r = assertSafeUpload({
      mime: 'application/pdf',
      originalName: 'a.pdf',
      size: buf.length,
      buffer: buf,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.storedName).toMatch(/\.pdf$/);
  });
});

describe('SEC-ABU-016 maker-checker roles', () => {
  it('allows owner/hr_admin as checker, not employee', () => {
    expect(canActAsChecker('owner')).toBe(true);
    expect(canActAsChecker('hr_admin')).toBe(true);
    expect(canActAsChecker('employee')).toBe(false);
  });
});

describe('SEC-IAM-008 step-up token', () => {
  it('mints and verifies bound token', () => {
    const token = mintStepUpToken({ userId: 'u1', tenantId: 't1', purpose: 'export' });
    expect(verifyStepUpToken(token, { userId: 'u1', tenantId: 't1', purpose: 'export' })).toBe(true);
    expect(verifyStepUpToken(token, { userId: 'u2', tenantId: 't1', purpose: 'export' })).toBe(false);
    expect(verifyStepUpToken(token, { userId: 'u1', tenantId: 't1', purpose: 'other' })).toBe(false);
  });

  it('defaults off until env enabled', () => {
    delete process.env.HUMANIFY_STEP_UP_REQUIRED;
    expect(isStepUpRequired()).toBe(false);
    process.env.HUMANIFY_STEP_UP_REQUIRED = 'true';
    expect(isStepUpRequired()).toBe(true);
    delete process.env.HUMANIFY_STEP_UP_REQUIRED;
  });
});

describe('SEC-ABU-005 export roles', () => {
  it('allows hr/finance/owner, denies employee', () => {
    expect(canExportSensitiveData('owner')).toBe(true);
    expect(canExportSensitiveData('finance')).toBe(true);
    expect(canExportSensitiveData('employee')).toBe(false);
  });
});

describe('SEC-APP-015 safe redirect', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { safeInternalPath } = require('@/lib/security/safe-redirect');
  it('blocks open redirects', () => {
    expect(safeInternalPath('https://evil.com', '/humanify')).toBe('/humanify');
    expect(safeInternalPath('//evil.com', '/humanify')).toBe('/humanify');
    expect(safeInternalPath('/humanify/billing', '/humanify')).toBe('/humanify/billing');
    expect(safeInternalPath('/etc/passwd', '/humanify')).toBe('/humanify');
  });
});

describe('SEC-IAM-018 risk-based auth', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { assessLoginRisk } = require('@/lib/saas/risk-based-auth');
  it('scores new IP + automation as high risk', () => {
    const r = assessLoginRisk({
      role: 'owner',
      currentIp: '1.2.3.4',
      previousIp: '9.9.9.9',
      currentUa: 'curl/8.0',
      previousUa: 'Mozilla/5.0',
    });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.requireMfaChallenge).toBe(true);
    expect(r.signals).toEqual(expect.arrayContaining(['new_ip', 'automation_ua']));
  });
});

describe('SEC-APP-010 SSRF guard present', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isSafeOutboundHttpUrl } = require('@/lib/security/safe-outbound-url');
  it('blocks private and metadata hosts', () => {
    expect(isSafeOutboundHttpUrl('http://127.0.0.1/x')).toBe(false);
    expect(isSafeOutboundHttpUrl('https://example.com/hook')).toBe(true);
  });
});

describe('Wave5 attendance anti-cheat', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    mintAttendanceNonce,
    consumeAttendanceNonce,
    distanceKm,
    assessAttendancePunch,
  } = require('@/lib/hris/attendance-anti-cheat');

  it('mints and consumes nonce once', () => {
    process.env.HUMANIFY_ATTENDANCE_NONCE = 'true';
    const { nonce } = mintAttendanceNonce({ userId: 'u', tenantId: 't' });
    expect(consumeAttendanceNonce({ userId: 'u', tenantId: 't', nonce }).ok).toBe(true);
    expect(consumeAttendanceNonce({ userId: 'u', tenantId: 't', nonce }).ok).toBe(false);
    delete process.env.HUMANIFY_ATTENDANCE_NONCE;
  });

  it('detects impossible travel speed', () => {
    const r = assessAttendancePunch({
      lat: -6.2,
      lng: 106.8,
      previous: { lat: 1.3, lng: 103.8, atMs: Date.now() - 10 * 60_000 },
    });
    expect(r.flags).toContain('impossible_travel');
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeGreaterThan(100);
  });
});

describe('Wave9 feature flag gate', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { canUseFeatureFlag } = require('@/lib/saas/feature-flag-gate');
  it('denies employee for talent_bank role list', () => {
    expect(canUseFeatureFlag({ flag: 'talent_bank', role: 'employee', tenantFlags: { talent_bank: true } })).toBe(false);
    expect(canUseFeatureFlag({ flag: 'talent_bank', role: 'hr_admin', tenantFlags: { talent_bank: true } })).toBe(true);
  });
});

describe('Wave7 export velocity', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { trackExportVelocity } = require('@/lib/saas/security-monitor');
  it('flags after threshold', () => {
    const id = `t-${Date.now()}`;
    let last = { abnormal: false, count: 0 };
    for (let i = 0; i < 8; i++) {
      last = trackExportVelocity({ tenantId: id, actorUserId: 'u', maxPerWindow: 8 });
    }
    expect(last.abnormal).toBe(true);
  });
});

describe('Wave12 SoD + fraud score', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { assertSeparationOfDuties } = require('@/lib/saas/maker-checker');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scoreFraudAnomaly } = require('@/lib/saas/fraud-anomaly');
  it('blocks same maker/checker', () => {
    expect(assertSeparationOfDuties('a', 'a')).toBe(false);
    expect(assertSeparationOfDuties('a', 'b')).toBe(true);
  });
  it('scores high anomaly', () => {
    const r = scoreFraudAnomaly({ massChangeCount: 12, abnormalExports: 2, bankChangesPending: 4 });
    expect(r.level).toBe('high');
  });
});
