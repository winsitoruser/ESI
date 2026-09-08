import {
  calcProgress,
  currentOkrPeriod,
  okrPeriodOptions,
  krProgressPct,
  objectiveHealth,
  summarizeOkrs,
  buildOkrTree,
  type OkrObjective,
  type KeyResult,
} from '@/lib/hris/okr-model';

describe('OKR period helpers', () => {
  it('maps September 2026 to Q3-2026', () => {
    expect(currentOkrPeriod(new Date('2026-09-03T00:00:00Z'))).toBe('Q3-2026');
  });

  it('includes current quarter first in period options', () => {
    const opts = okrPeriodOptions(new Date('2026-09-03T00:00:00Z'));
    expect(opts[0]).toBe('Q3-2026');
    expect(opts).toEqual(expect.arrayContaining(['Q1-2026', 'Q4-2026', '2026']));
  });
});

describe('OKR progress & health', () => {
  const krs: KeyResult[] = [
    { id: 'a', title: 'A', targetValue: 100, currentValue: 80, unit: '%', weight: 1, confidence: 'on_track' },
    { id: 'b', title: 'B', targetValue: 10, currentValue: 5, unit: 'x', weight: 1, confidence: 'at_risk' },
  ];

  it('weights key-result progress', () => {
    expect(calcProgress(krs)).toBe(65);
    expect(krProgressPct(krs[0])).toBe(80);
  });

  it('treats any at-risk KR as at risk even if average is high', () => {
    expect(objectiveHealth({ progress: 80, keyResults: krs })).toBe('at_risk');
  });

  it('uses progress bands when KR confidence is healthy', () => {
    const healthy = krs.map((k) => ({ ...k, confidence: 'on_track' as const }));
    expect(objectiveHealth({ progress: 80, keyResults: healthy })).toBe('on_track');
    expect(objectiveHealth({ progress: 55, keyResults: healthy })).toBe('at_risk');
    expect(objectiveHealth({ progress: 20, keyResults: healthy })).toBe('off_track');
  });
});

describe('OKR cascade tree', () => {
  const okrs: OkrObjective[] = [
    { id: 'c', title: 'Company', level: 'company', period: 'Q3-2026', cycle: 'quarterly', progress: 50, status: 'active', keyResults: [] },
    { id: 'd', title: 'Dept', level: 'department', period: 'Q3-2026', cycle: 'quarterly', progress: 40, status: 'active', parentId: 'c', keyResults: [] },
    { id: 'i', title: 'Individu', level: 'individual', period: 'Q3-2026', cycle: 'quarterly', progress: 90, status: 'active', parentId: 'd', keyResults: [] },
    { id: 'orphan', title: 'Orphan', level: 'team', period: 'Q3-2026', cycle: 'quarterly', progress: 10, status: 'active', parentId: 'missing', keyResults: [] },
  ];

  it('nests children under parent and keeps orphans as roots', () => {
    const tree = buildOkrTree(okrs);
    const company = tree.find((n) => n.id === 'c');
    expect(company?.children.map((c) => c.id)).toEqual(['d']);
    expect(company?.children[0].children.map((c) => c.id)).toEqual(['i']);
    expect(tree.some((n) => n.id === 'orphan')).toBe(true);
  });

  it('summarizes health counts', () => {
    const s = summarizeOkrs(okrs, 'Q3-2026');
    expect(s.total).toBe(4);
    expect(s.byLevel.company).toBe(1);
    expect(s.byLevel.individual).toBe(1);
  });
});
