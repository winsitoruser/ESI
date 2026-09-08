import {
  LEAVE_TYPE_SUGGESTIONS,
  leaveTypeAlreadyConfigured,
  suggestLeaveTypes,
  suggestionToLeaveTypePayload,
} from '@/lib/hris/leave-type-suggestions';
import {
  leaveTypeRowFromBody,
  pickExistingLeaveTypeColumns,
  normalizeLeaveTypeCode,
} from '@/lib/hris/leave-type-store';

describe('leave type suggestion codes', () => {
  it('uses lowercase codes aligned with seed/catalog', () => {
    const codes = LEAVE_TYPE_SUGGESTIONS.map((s) => s.code);
    expect(codes).toEqual(expect.arrayContaining(['annual', 'sick', 'maternity', 'menstrual', 'miscarriage']));
    expect(codes.every((c) => c === c.toLowerCase())).toBe(true);
  });

  it('treats seeded annual as already configured for Cuti Tahunan', () => {
    expect(leaveTypeAlreadyConfigured('annual', ['ANNUAL'])).toBe(true);
    expect(leaveTypeAlreadyConfigured('annual', ['annual'])).toBe(true);
    expect(leaveTypeAlreadyConfigured('menstrual', ['haid'])).toBe(true);
    expect(leaveTypeAlreadyConfigured('maternity', ['sick'])).toBe(false);
  });

  it('flags missing UU compliance types', () => {
    const { summary, suggestions } = suggestLeaveTypes(['sick']);
    expect(summary.missingCompliance).toBeGreaterThanOrEqual(3);
    expect(suggestions.find((s) => s.code === 'annual')?.alreadyConfigured).toBe(false);
    expect(suggestions.find((s) => s.code === 'sick')?.alreadyConfigured).toBe(true);
  });

  it('maps suggestion to API payload', () => {
    const annual = LEAVE_TYPE_SUGGESTIONS.find((s) => s.code === 'annual')!;
    const payload = suggestionToLeaveTypePayload(annual, 1);
    expect(payload.code).toBe('annual');
    expect(payload.maxDaysPerYear).toBe(12);
    expect(payload.carryForward).toBe(true);
  });
});

describe('leaveTypeRowFromBody schema filter', () => {
  it('normalizes camelCase body', () => {
    const row = leaveTypeRowFromBody({
      code: 'ANNUAL',
      name: 'Cuti Tahunan',
      description: 'UU 79',
      maxDaysPerYear: 12,
      isPaid: true,
    }, 'tid');
    expect(normalizeLeaveTypeCode(row.code)).toBe('annual');
    expect(row.description).toBe('UU 79');
    expect(row.max_days_per_year).toBe(12);
  });

  it('omits description when the column is missing', () => {
    const row = leaveTypeRowFromBody({
      code: 'annual',
      name: 'Cuti Tahunan',
      description: 'harus terlewat',
    }, 'tid');
    const slim = pickExistingLeaveTypeColumns(row, new Set(['tenant_id', 'code', 'name', 'category', 'max_days_per_year']));
    expect(slim.description).toBeUndefined();
    expect(slim.code).toBe('annual');
    expect(slim.name).toBe('Cuti Tahunan');
  });
});
