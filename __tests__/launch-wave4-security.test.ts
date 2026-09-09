import { applyClientSessionPatch } from '../lib/saas/session-update-guard';
import { pickEmployeePatch } from '../lib/hris/employee-patch-fields';
import { sanitizePlainText, stripHtmlTags, toJsonLdScript } from '../lib/security/sanitize-user-text';
import { isSafeOutboundHttpUrl } from '../lib/security/safe-outbound-url';
import { mutationOriginAllowed, nextAuthSessionCookieOptions } from '../lib/security/csrf-origin';
import { isAcceptedFile } from '../lib/hris/employee-document-types';
import { permissionForAction, deskHasPermission } from '../lib/saas/platform-desks';
import { executeAgentTool } from '../lib/hris/aiman-agent-tools';
import {
  evaluateLogin,
  recordLoginFailure,
  recordLoginSuccess,
  _resetLoginGuard,
} from '../lib/saas/login-guard';
import { resolveExportTenantId } from '../lib/saas/export-tenant-scope';
import { sanitizePartnerLead } from '../lib/hris/partner-leads';

describe('WQ-060 session.update cannot rewrite identity', () => {
  it('drops role, tenantId, id, and impersonation keys', () => {
    const token = {
      id: 'user-1',
      role: 'staff',
      tenantId: 'aaa',
      impersonating: false,
    };
    const next = applyClientSessionPatch(token, {
      id: 'attacker',
      role: 'super_admin',
      tenantId: 'other-tenant',
      impersonating: true,
      impersonateTenantId: 'other-tenant',
      switchCompanyId: 'other-tenant',
      originalRole: 'super_admin',
      mfaSetupRequired: false,
    });
    expect(next.id).toBe('user-1');
    expect(next.role).toBe('staff');
    expect(next.tenantId).toBe('aaa');
    expect(next.impersonating).toBe(false);
    expect(next.mfaSetupRequired).toBe(false);
  });
});

describe('WQ-061 employee PATCH mass assignment', () => {
  it('strips tenant/role/company fields', () => {
    const patch = pickEmployeePatch({
      name: 'Ada',
      tenant_id: 'evil',
      tenantId: 'evil',
      companyId: 'evil',
      role: 'super_admin',
      work_role: 'owner',
      password: 'x',
      id: 'new-id',
      position: 'HR',
    });
    expect(patch).toEqual({ name: 'Ada', position: 'HR' });
  });
});

describe('WQ-062 stored XSS', () => {
  it('strips script tags from names and announcements', () => {
    expect(stripHtmlTags('<script>alert(1)</script>HR')).toBe('HR');
    expect(sanitizePlainText('<img src=x onerror=alert(1)>Pengumuman')).toBe('Pengumuman');
    expect(sanitizePlainText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('escapes JSON-LD so job titles cannot break out of script', () => {
    const html = toJsonLdScript({ title: '</script><script>alert(1)</script>' });
    expect(html).not.toContain('</script>');
    expect(html).toContain('\\u003c');
  });
});

describe('WQ-063 CSRF origin + cookie flags', () => {
  it('allows same-host Origin and missing Origin; rejects cross-site Origin', () => {
    expect(mutationOriginAllowed({
      method: 'POST',
      origin: 'https://humanify.id',
      host: 'humanify.id',
    })).toBe(true);
    expect(mutationOriginAllowed({
      method: 'POST',
      origin: 'https://evil.example',
      host: 'humanify.id',
    })).toBe(false);
    expect(mutationOriginAllowed({
      method: 'POST',
      origin: '',
      host: 'humanify.id',
    })).toBe(true);
    expect(mutationOriginAllowed({ method: 'GET', origin: 'https://evil.example', host: 'humanify.id' })).toBe(true);
  });

  it('session cookies are httpOnly + SameSite=Lax', () => {
    const c = nextAuthSessionCookieOptions(true);
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe('lax');
    expect(c.secure).toBe(true);
    expect(c.path).toBe('/');
  });
});

describe('WQ-064 SSRF outbound URLs', () => {
  it('rejects loopback, metadata, and private ranges', () => {
    expect(isSafeOutboundHttpUrl('http://127.0.0.1:9/ssrf')).toBe(false);
    expect(isSafeOutboundHttpUrl('http://localhost/ssrf')).toBe(false);
    expect(isSafeOutboundHttpUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isSafeOutboundHttpUrl('http://[::1]:9/ssrf')).toBe(false);
    expect(isSafeOutboundHttpUrl('http://10.0.0.8/hook')).toBe(false);
    expect(isSafeOutboundHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeOutboundHttpUrl('https://hooks.slack.com/services/x')).toBe(true);
  });

  it('partner lead sanitizer ignores attacker URL fields', () => {
    const data = sanitizePartnerLead({
      companyName: 'SSRF Co',
      contactName: 'Probe',
      email: 'a@b.co',
      webhookUrl: 'http://127.0.0.1:9/ssrf',
      logoUrl: 'http://169.254.169.254/',
    } as any);
    expect((data as any).webhookUrl).toBeUndefined();
    expect(data.companyName).toBe('SSRF Co');
  });
});

describe('WQ-065 employee document upload types', () => {
  it('rejects executables, html, svg, and mime/ext mismatch', () => {
    expect(isAcceptedFile({ name: 'cv.pdf', type: 'application/pdf' })).toBe(true);
    expect(isAcceptedFile({ name: 'photo.png', type: 'image/png' })).toBe(true);
    expect(isAcceptedFile({ name: 'payload.exe', type: 'application/octet-stream' })).toBe(false);
    expect(isAcceptedFile({ name: 'page.html', type: 'text/html' })).toBe(false);
    expect(isAcceptedFile({ name: 'polyglot.svg', type: 'image/svg+xml' })).toBe(false);
    expect(isAcceptedFile({ name: 'malware.exe.pdf', type: 'application/pdf' })).toBe(false);
    expect(isAcceptedFile({ name: 'x.pdf', type: 'application/x-msdownload' })).toBe(false);
  });
});

describe('WQ-066 platform desk finance/roles', () => {
  it('maps mutating platform actions to permissions CS cannot hold', () => {
    expect(permissionForAction('finance-refund', 'POST')).toBe('finance.refund');
    expect(permissionForAction('staff-desk', 'POST')).toBe('roles.assign');
    expect(permissionForAction('tenant-plan', 'PATCH')).toBe('clients.edit');
    expect(deskHasPermission('cs', 'finance.refund')).toBe(false);
    expect(deskHasPermission('cs', 'roles.assign')).toBe(false);
    expect(deskHasPermission('cs', 'clients.edit')).toBe(false);
    expect(deskHasPermission('finance', 'finance.refund')).toBe(true);
  });
});

describe('WQ-067 AIMAN tenant fail-closed', () => {
  it('refuses tools without tenant and write without confirm', async () => {
    const none = await executeAgentTool('payroll_prep_checklist', null);
    expect(none.ok).toBe(false);
    expect(none.error).toBe('NO_TENANT');

    const write = await executeAgentTool('run_automation_scan', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(write.ok).toBe(false);
    expect(write.error).toBe('CONFIRM_REQUIRED');
  });
});

describe('WQ-068 login lockout', () => {
  beforeEach(() => _resetLoginGuard());

  it('locks the same email+ip after repeated failures; other accounts stay open', async () => {
    const email = 'lockme@humanify.test';
    const ip = '203.0.113.9';
    for (let i = 0; i < 8; i++) {
      await recordLoginFailure(email, ip);
    }
    const locked = await evaluateLogin(email, ip);
    expect(locked.allowed).toBe(false);
    expect(locked.reason).toBe('account_locked');

    const other = await evaluateLogin('other@humanify.test', ip);
    expect(other.allowed).toBe(true);

    await recordLoginSuccess(email, ip);
    const after = await evaluateLogin(email, ip);
    expect(after.allowed).toBe(true);
  });
});

describe('WQ-069 export/search after company switch', () => {
  it('uses the active session tenant and ignores spoofed query tenant', () => {
    const out = resolveExportTenantId({
      sessionTenantId: 'company-b',
      requestedTenantId: 'company-a',
    });
    expect(out.tenantId).toBe('company-b');
    expect(out.rejectedSpoof).toBe(true);
    expect(resolveExportTenantId({ sessionTenantId: null, requestedTenantId: 'company-a' }).tenantId).toBeNull();
  });
});
