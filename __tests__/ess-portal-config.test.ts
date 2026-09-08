import { isEssModuleEnabled, parseEssPortalConfig } from '@/lib/hris/ess-portal-config';

describe('parseEssPortalConfig', () => {
  it('defaults all modules on and face enrollment required', () => {
    const cfg = parseEssPortalConfig(null);
    expect(cfg.requireFaceEnrollment).toBe(true);
    expect(cfg.modules.payslip).toBe(true);
    expect(cfg.announcement).toBe('');
  });

  it('keeps an explicit off switch', () => {
    const cfg = parseEssPortalConfig({
      requireFaceEnrollment: false,
      modules: { travel: false, payslip: true },
      announcement: '  Hari libur nasional  ',
    });
    expect(cfg.requireFaceEnrollment).toBe(false);
    expect(cfg.modules.travel).toBe(false);
    expect(cfg.modules.payslip).toBe(true);
    expect(cfg.announcement).toBe('Hari libur nasional');
  });
});

describe('isEssModuleEnabled', () => {
  it('treats missing config as enabled', () => {
    expect(isEssModuleEnabled(null, 'claims')).toBe(true);
  });

  it('honours disabled modules', () => {
    const cfg = parseEssPortalConfig({ modules: { claims: false } });
    expect(isEssModuleEnabled(cfg, 'claims')).toBe(false);
    expect(isEssModuleEnabled(cfg, 'leave')).toBe(true);
  });
});
