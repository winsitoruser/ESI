import {
  entitlementsHaveFeature,
  filterMenuByPlanFeatures,
  isPathAllowedForEntitlements,
} from '../lib/saas/plan-entitlements';

describe('sidebar plan filter keepLocked', () => {
  const items = [
    { id: 'pay', name: 'Payroll', href: '/humanify/payroll' },
    { id: 'kpi', name: 'KPI', href: '/humanify/kpi' },
    { id: 'att', name: 'Absensi', href: '/humanify/attendance' },
  ];

  it('hides payroll and KPI on starter by default', () => {
    const out = filterMenuByPlanFeatures(items, 'starter');
    expect(out.map((i) => i.id)).toEqual(['att']);
  });

  it('keeps payroll and KPI visible but locked on starter', () => {
    const out = filterMenuByPlanFeatures(items, 'starter', { keepLocked: true });
    expect(out.map((i) => i.id)).toEqual(['pay', 'kpi', 'att']);
    expect(out.find((i) => i.id === 'pay')?.locked).toBe(true);
    expect(out.find((i) => i.id === 'kpi')?.locked).toBe(true);
    expect(out.find((i) => i.id === 'att')?.locked).toBeUndefined();
  });

  it('keeps payroll unlocked on growth', () => {
    const out = filterMenuByPlanFeatures(items, 'growth', { keepLocked: true });
    expect(out.find((i) => i.id === 'pay')?.locked).toBeUndefined();
  });
});

describe('LMS and AIMAN are add-ons, not Enterprise bundle', () => {
  const lmsItems = [
    { id: 'lms', name: 'LMS', href: '/humanify/lms' },
    { id: 'ai', name: 'AIMAN', href: '/humanify/ai' },
    { id: 'pay', name: 'Payroll', href: '/humanify/payroll' },
  ];

  it('hides LMS and AIMAN on enterprise without add-ons', () => {
    const out = filterMenuByPlanFeatures(lmsItems, 'enterprise');
    expect(out.map((i) => i.id)).toEqual(['pay']);
    expect(entitlementsHaveFeature('enterprise', 'lms')).toBe(false);
    expect(entitlementsHaveFeature('enterprise', 'ai')).toBe(false);
    expect(isPathAllowedForEntitlements('/humanify/lms', 'enterprise')).toBe(false);
    expect(isPathAllowedForEntitlements('/humanify/ai', 'enterprise')).toBe(false);
  });

  it('unlocks LMS and AIMAN when add-ons are on', () => {
    expect(entitlementsHaveFeature('enterprise', 'lms', { lms: true })).toBe(true);
    expect(entitlementsHaveFeature('enterprise', 'ai', { ai: true })).toBe(true);
    expect(isPathAllowedForEntitlements('/humanify/lms', 'starter', { lms: true })).toBe(true);
    expect(isPathAllowedForEntitlements('/humanify/payroll', 'starter')).toBe(false);
  });

  it('keeps trial full-access including LMS and AIMAN', () => {
    expect(entitlementsHaveFeature('trial', 'lms')).toBe(true);
    expect(entitlementsHaveFeature('trial', 'ai')).toBe(true);
  });
});
