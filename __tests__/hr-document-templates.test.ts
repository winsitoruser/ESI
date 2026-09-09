import { applyMergeFields, buildMergeContext } from '../lib/hris/letter-merge-fields';
import {
  applyBrandingToLetterhead,
  defaultTemplateFor,
  letterheadFromBranding,
  sanitizeHrTemplate,
  templateToDraft,
  templateTypeForDocument,
  disciplinaryTemplateType,
} from '../lib/hris/document-templates';
import { readTenantBranding, DEFAULT_BRANDING } from '../lib/saas/humanify-branding';

describe('letter merge fields', () => {
  it('replaces contract and KPI placeholders', () => {
    const ctx = buildMergeContext({
      letterData: { salary: 'Rp 8.000.000', contractType: 'PKWT', kpiScore: '90' },
      companyName: 'PT Demo',
    });
    const out = applyMergeFields('{{employee_name}} {{salary}} {{contract_type}} {{kpi_score}} {{company_name}}', {
      ...ctx,
      employee_name: 'Ani',
    });
    expect(out).toContain('Ani');
    expect(out).toContain('Rp 8.000.000');
    expect(out).toContain('PKWT');
    expect(out).toContain('90');
    expect(out).toContain('PT Demo');
  });
});

describe('HR document templates', () => {
  it('maps document and disciplinary types', () => {
    expect(templateTypeForDocument('employment-contract', { contractType: 'PKWTT' })).toBe('employment-contract-pkwtt');
    expect(templateTypeForDocument('reference-letter', { kind: 'paklaring' })).toBe('paklaring');
    expect(disciplinaryTemplateType('TEGURAN')).toBe('reprehend-letter');
    expect(disciplinaryTemplateType('SP2')).toBe('warning-letter');
  });

  it('keeps merge fields in default contract and paklaring bodies', () => {
    const pkwt = defaultTemplateFor('employment-contract');
    expect(pkwt.body).toContain('{{employee_name}}');
    expect(pkwt.body).toContain('{{contract_type}}');
    const pak = defaultTemplateFor('paklaring');
    expect(pak.subject.toLowerCase()).toContain('paklaring');
    expect(pak.body).toContain('{{end_date}}');
  });

  it('sanitizes unknown payload against catalog defaults', () => {
    const t = sanitizeHrTemplate({ name: '  Custom SP  ', body: 'Halo {{employee_name}}' }, 'warning-letter');
    expect(t.type).toBe('warning-letter');
    expect(t.name).toBe('Custom SP');
    expect(t.body).toContain('{{employee_name}}');
    expect(t.useGlobalLetterhead).toBe(true);
  });

  it('applies tenant logo to letterhead and drafts', () => {
    const branding = {
      ...DEFAULT_BRANDING,
      logoUrl: '/uploads/letter-logos/logo-acme.png',
      companyName: 'PT Acme',
      address: 'Jakarta',
    };
    const lh = letterheadFromBranding(branding);
    expect(lh.logoUrl).toBe('/uploads/letter-logos/logo-acme.png');
    expect(lh.companyName).toBe('PT Acme');

    const merged = applyBrandingToLetterhead({ companyName: 'Override' }, branding);
    expect(merged.companyName).toBe('Override');
    expect(merged.logoUrl).toBe(branding.logoUrl);

    const draft = templateToDraft(defaultTemplateFor('paklaring'), branding, {
      employee_name: 'Budi',
      company_name: 'PT Acme',
      join_date: '2020-01-01',
      end_date: '2026-01-01',
    });
    expect(draft.letterhead?.logoUrl).toBe(branding.logoUrl);
    expect(draft.body).toContain('Budi');
    expect(draft.body).not.toContain('{{employee_name}}');
  });
});

describe('readTenantBranding', () => {
  it('reads logo, stamp, and letterhead fields', () => {
    const b = readTenantBranding({
      branding: {
        logoUrl: '/uploads/letter-logos/x.png',
        stampUrl: '/uploads/letter-logos/stamp.png',
        companyName: 'PT Tes',
        letterheadLayout: 'left',
        primaryColor: '#0f766e',
      },
    });
    expect(b.logoUrl).toBe('/uploads/letter-logos/x.png');
    expect(b.stampUrl).toBe('/uploads/letter-logos/stamp.png');
    expect(b.companyName).toBe('PT Tes');
    expect(b.letterheadLayout).toBe('left');
    expect(b.primaryColor).toBe('#0f766e');
  });

  it('rejects unsafe logo URLs', () => {
    const b = readTenantBranding({ branding: { logoUrl: 'javascript:alert(1)' } });
    expect(b.logoUrl).toBe('');
  });
});
