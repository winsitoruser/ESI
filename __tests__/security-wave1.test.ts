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
