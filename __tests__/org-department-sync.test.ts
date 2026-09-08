import {
  resolveDepartmentOption,
  slugDepartmentCode,
  getDepartmentLabel,
} from '@/lib/hris/master-data';
import { buildEmployeeMutationUpdates } from '@/lib/hris/mutation-workflow';
import { wouldCreateCycle } from '@/lib/hris/employee-genealogy';
import {
  mergeOrgUnitSuggestionPool,
  filterOrgUnitSuggestions,
  unusedCatalogSuggestions,
} from '@/lib/hris/org-unit-suggestions';

describe('resolveDepartmentOption', () => {
  it('maps wizard labels to canonical codes', () => {
    expect(resolveDepartmentOption('Finance').code).toBe('FINANCE');
    expect(resolveDepartmentOption('Operations').code).toBe('OPERATIONS');
    expect(resolveDepartmentOption('SDM').code).toBe('HR');
    expect(resolveDepartmentOption('Keuangan').code).toBe('FINANCE');
  });

  it('keeps known codes', () => {
    expect(resolveDepartmentOption('IT')).toEqual({ code: 'IT', label: 'IT' });
    expect(resolveDepartmentOption('HR').code).toBe('HR');
  });

  it('slugifies custom departments', () => {
    expect(slugDepartmentCode('Legal & Compliance')).toBe('LEGAL_COMPLIANCE');
    expect(resolveDepartmentOption('Legal').code).toBe('LEGAL');
  });
});

describe('getDepartmentLabel', () => {
  it('returns Indonesian labels for master codes', () => {
    expect(getDepartmentLabel('FINANCE')).toBe('Keuangan');
    expect(getDepartmentLabel('HR')).toBe('SDM');
  });
});

describe('buildEmployeeMutationUpdates', () => {
  it('writes department, org unit, and supervisor together', () => {
    const { setClauses, replacements } = buildEmployeeMutationUpdates({
      to_department: 'FINANCE',
      to_position: 'Staff Finance',
      to_org_structure_id: 'org-1',
      to_supervisor_id: 'emp-boss',
    });
    expect(setClauses).toEqual(expect.arrayContaining([
      'department = :dept',
      'org_structure_id = :orgId',
      'supervisor_id = :supervisorId',
      'position = :pos',
    ]));
    expect(replacements).toMatchObject({
      dept: 'FINANCE',
      orgId: 'org-1',
      supervisorId: 'emp-boss',
      pos: 'Staff Finance',
    });
  });

  it('skips empty placement fields', () => {
    const { setClauses, replacements } = buildEmployeeMutationUpdates({});
    expect(setClauses).toEqual(['updated_at = NOW()']);
    expect(replacements).toEqual({});
  });
});

describe('org unit suggestions', () => {
  it('marks catalog codes that already exist and adds extra tenant units', () => {
    const pool = mergeOrgUnitSuggestionPool([
      { code: 'FINANCE', name: 'Keuangan' },
      { code: 'LEGAL', name: 'Legal' },
    ]);
    const finance = pool.find((s) => s.code === 'FINANCE');
    const legal = pool.find((s) => s.code === 'LEGAL');
    expect(finance?.alreadyInOrg).toBe(true);
    expect(finance?.source).toBe('catalog');
    expect(legal).toMatchObject({ source: 'existing', alreadyInOrg: true, label: 'Legal' });
  });

  it('empty query returns unused catalog; typing filters by name or code', () => {
    const pool = mergeOrgUnitSuggestionPool([{ code: 'HR', name: 'SDM' }]);
    const unused = unusedCatalogSuggestions(pool);
    expect(unused.every((s) => s.code !== 'HR')).toBe(true);
    const typed = filterOrgUnitSuggestions('keu', pool);
    expect(typed.some((s) => s.code === 'FINANCE')).toBe(true);
  });
});

describe('wouldCreateCycle', () => {
  const rows = [
    { id: 'a', supervisor_id: null, name: 'A' },
    { id: 'b', supervisor_id: 'a', name: 'B' },
    { id: 'c', supervisor_id: 'b', name: 'C' },
  ];

  it('blocks assigning a descendant as supervisor', () => {
    expect(wouldCreateCycle('a', 'c', rows)).toBe(true);
  });

  it('allows a new manager up the tree', () => {
    expect(wouldCreateCycle('c', 'a', rows)).toBe(false);
  });
});
