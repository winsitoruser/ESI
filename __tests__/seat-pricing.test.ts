import {
  DEFAULT_SEAT_PRICING,
  quoteSeatSubscription,
  seatRateForCount,
  normalizeAddons,
} from '@/lib/saas/seat-pricing-core';
import {
  HUMANIFY_CANONICAL_PRICES_IDR,
  entitlementsHaveFeature,
  planHasFeature,
} from '@/lib/saas/plan-entitlements';
import { parseRoleBlueprint, matchTalentToRole } from '@/lib/hris/talent-matching';
import type { TalentProfile } from '@/lib/hris/talent-bank';

describe('Humanify per-user seat pricing', () => {
  it('uses 10k for 1–250 seats (all units)', () => {
    expect(seatRateForCount(1).rateIdr).toBe(10_000);
    expect(seatRateForCount(250).rateIdr).toBe(10_000);
    expect(quoteSeatSubscription({ seats: 100 }).monthlyIdr).toBe(1_000_000);
  });

  it('drops to 9.5k for 251–1000 (all units, not graduated)', () => {
    expect(seatRateForCount(251).rateIdr).toBe(9_500);
    expect(quoteSeatSubscription({ seats: 251 }).coreIdr).toBe(251 * 9_500);
    expect(seatRateForCount(1000).rateIdr).toBe(9_500);
  });

  it('drops to 9k above 1000', () => {
    expect(seatRateForCount(1001).rateIdr).toBe(9_000);
    expect(quoteSeatSubscription({ seats: 1001 }).coreIdr).toBe(1001 * 9_000);
  });

  it('adds LMS, ATS, Bank Data per user and AIMAN as monthly flat', () => {
    const q = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true, ats: true, talentBank: true },
    });
    expect(q.coreIdr).toBe(100_000);
    expect(q.lmsIdr).toBe(15_000);
    expect(q.atsIdr).toBe(20_000);
    expect(q.talentBankIdr).toBe(15_000);
    expect(q.aiIdr).toBe(65_000);
    expect(q.monthlyIdr).toBe(215_000);
  });

  it('applies yearly 20% off to the full monthly total', () => {
    const monthly = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true },
      interval: 'monthly',
    });
    const yearly = quoteSeatSubscription({
      seats: 10,
      addons: { lms: true, ai: true },
      interval: 'yearly',
    });
    expect(yearly.periodIdr).toBe(Math.round(monthly.monthlyIdr * 12 * 0.8));
    expect(DEFAULT_SEAT_PRICING.yearlyDiscountPct).toBe(20);
  });

  it('normalizes add-on flags', () => {
    expect(normalizeAddons(undefined)).toEqual({
      lms: false, ai: false, ats: false, talentBank: false,
    });
    expect(normalizeAddons({ lms: true, ats: true })).toEqual({
      lms: true, ai: false, ats: true, talentBank: false,
    });
  });

  it('matches canonical plan list price (10k / user)', () => {
    expect(HUMANIFY_CANONICAL_PRICES_IDR.starter).toBe(DEFAULT_SEAT_PRICING.pricePerUserIdr);
    expect(DEFAULT_SEAT_PRICING.lmsPerUserIdr).toBe(1_500);
    expect(DEFAULT_SEAT_PRICING.atsPerUserIdr).toBe(2_000);
    expect(DEFAULT_SEAT_PRICING.talentBankPerUserIdr).toBe(1_500);
    expect(DEFAULT_SEAT_PRICING.aiMonthlyIdr).toBe(65_000);
  });
});

describe('ATS + Talent Bank entitlements', () => {
  it('keeps recruitment and talent_bank off paid plans without add-ons', () => {
    expect(planHasFeature('starter', 'recruitment')).toBe(false);
    expect(planHasFeature('growth', 'talent_bank')).toBe(false);
    expect(entitlementsHaveFeature('starter', 'recruitment', { ats: true })).toBe(true);
    expect(entitlementsHaveFeature('growth', 'talent_bank', { talentBank: true })).toBe(true);
    expect(entitlementsHaveFeature('trial', 'recruitment')).toBe(true);
    expect(entitlementsHaveFeature('trial', 'talent_bank')).toBe(true);
  });
});

describe('Talent matching MVP', () => {
  const profile: TalentProfile = {
    id: 'p1',
    tenantId: 't1',
    fullName: 'Andi Pratama',
    email: 'andi@example.com',
    phone: null,
    headline: 'Senior Digital Marketing',
    location: 'Tangerang',
    locationArea: 'Tangerang',
    currentTitle: 'Marketing Specialist',
    currentCompany: 'PT ABC',
    experienceYears: 5,
    educationLevel: 'S1',
    skills: ['digital marketing', 'meta ads', 'google ads', 'analytics'],
    industries: ['FMCG'],
    salaryCurrent: 9_000_000,
    salaryExpectedMin: 9_500_000,
    salaryExpectedMax: 10_000_000,
    noticeDays: 30,
    workPreference: 'hybrid',
    intent: 'open',
    source: 'manual',
    resumeUrl: null,
    resumeText: 'Digital Marketing Specialist with Meta Ads and Google Ads in FMCG.',
    tags: [],
    consentTalentPool: true,
    consentContact: true,
    profileUpdatedAt: new Date().toISOString(),
    salaryVerifiedAt: new Date().toISOString(),
    locationVerifiedAt: new Date().toISOString(),
    availabilityVerifiedAt: new Date().toISOString(),
    metadata: {},
  };

  it('parses NL query into role blueprint', () => {
    const bp = parseRoleBlueprint(
      'Cari Marketing Manager sekitar Tangerang, salary maksimal Rp10 juta, strong digital marketing dan FMCG',
    );
    expect(bp.location?.toLowerCase()).toContain('tangerang');
    expect(bp.salaryMax).toBe(10_000_000);
    expect(bp.skills.some((s) => s.includes('digital'))).toBe(true);
    expect(bp.industries).toContain('FMCG');
  });

  it('scores role fit, actionability, and confidence separately', () => {
    const bp = parseRoleBlueprint(
      'Marketing Manager Tangerang salary Rp10 juta digital marketing FMCG 5 tahun',
    );
    const m = matchTalentToRole(profile, bp);
    expect(m.roleFit).toBeGreaterThanOrEqual(60);
    expect(m.actionability).toBeGreaterThanOrEqual(50);
    expect(m.dataConfidence).toBeGreaterThanOrEqual(50);
    expect(m.whyMatch.length).toBeGreaterThan(0);
    expect(m.compensationFit).toBe('good');
  });
});

describe('Talent workforce Phase 3', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { employeeRowToTalentProfile, analyzeBuildVsBuy, annotateUnifiedMatch } = require('@/lib/hris/talent-workforce');

  it('maps employee rows to talent profiles', () => {
    const p = employeeRowToTalentProfile({
      id: 7,
      name: 'Siti Internal',
      email: 'siti@co.id',
      position: 'Digital Marketing Specialist',
      department: 'MARKETING',
      specialization: 'Meta Ads Google Ads',
      status: 'ACTIVE',
      is_active: true,
      join_date: '2020-01-01',
      base_salary: 8_000_000,
      work_location: 'Jakarta',
    }, 't1');
    expect(p.id).toBe('emp:7');
    expect(p.metadata.sourceKind).toBe('employee');
    expect(p.skills.length).toBeGreaterThan(0);
  });

  it('recommends build vs buy from internal/external pools', () => {
    const bp = parseRoleBlueprint('Marketing Manager digital marketing Jakarta salary 10 juta');
    const external = [{
      ...{
        id: 'x1', tenantId: 't1', fullName: 'Eksternal A', email: null, phone: null,
        headline: 'Marketing Manager', location: 'Jakarta', locationArea: 'Jakarta',
        currentTitle: 'Marketing Manager', currentCompany: 'PT X', experienceYears: 6,
        educationLevel: null, skills: ['digital marketing', 'meta ads'], industries: [],
        salaryCurrent: null, salaryExpectedMin: 9_000_000, salaryExpectedMax: 10_000_000,
        noticeDays: 30, workPreference: 'hybrid', intent: 'actively_looking' as const, source: 'manual',
        resumeUrl: null, resumeText: 'Digital marketing manager Meta Ads', tags: [],
        consentTalentPool: true, consentContact: true, profileUpdatedAt: new Date().toISOString(),
        salaryVerifiedAt: new Date().toISOString(), locationVerifiedAt: new Date().toISOString(),
        availabilityVerifiedAt: new Date().toISOString(), metadata: {},
      },
    }];
    const internal = [employeeRowToTalentProfile({
      id: 1, name: 'Internal B', position: 'Marketing Specialist', department: 'MARKETING',
      specialization: 'digital marketing', status: 'ACTIVE', is_active: true, join_date: '2019-01-01',
      base_salary: 7_500_000, work_location: 'Jakarta',
    }, 't1')];
    const result = analyzeBuildVsBuy(external as any, internal, bp);
    expect(result.options.length).toBe(3);
    expect(['build', 'buy', 'borrow', 'mixed']).toContain(result.recommendation);
  });

  it('annotates readiness for employees', () => {
    const bp = parseRoleBlueprint('Marketing Manager meta ads google ads');
    const emp = employeeRowToTalentProfile({
      id: 2, name: 'Gap Person', position: 'Staff', department: 'OPS', status: 'ACTIVE',
      is_active: true, join_date: '2022-01-01',
    }, 't1');
    const m = annotateUnifiedMatch(matchTalentToRole(emp, bp), emp, bp);
    expect(m.sourceKind).toBe('employee');
    expect(Array.isArray(m.missingSkills)).toBe(true);
  });
});

describe('Talent DNA Phase 4', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    applyDnaToBlueprint,
    learningRecommendationsForGaps,
    composePredictiveInsights,
  } = require('@/lib/hris/talent-dna');

  it('applies company DNA traits onto blueprint', () => {
    const bp = parseRoleBlueprint('Marketing Manager Jakarta salary 10 juta');
    const before = bp.requirements.length;
    const next = applyDnaToBlueprint(bp, {
      roleKey: 'marketing',
      title: 'Marketing Manager',
      sampleSize: 3,
      avgScore: 4.2,
      traits: [
        { skill: 'experimentation', weight: 80, evidence: '2/3' },
        { skill: 'analytics', weight: 60, evidence: '2/3' },
      ],
      preferredIndustries: [],
      salaryBand: { min: null, max: null, median: null },
      insight: 'test',
    });
    expect(next.requirements.length).toBeGreaterThan(before);
    expect(next.requirements.some((r: any) => String(r.value).includes('experimentation'))).toBe(true);
  });

  it('builds learning paths from skill gaps', () => {
    const paths = learningRecommendationsForGaps(['meta ads', 'sql', 'people leadership']);
    expect(paths.length).toBe(3);
    expect(paths[0]).toMatch(/Meta Ads|meta ads|Kursus/i);
  });

  it('composes predictive insights from packs', () => {
    const out = composePredictiveInsights({
      dna: {
        roles: [{ roleKey: 'x', title: 'Solo Role', sampleSize: 1, avgScore: null, traits: [], preferredIndustries: [], salaryBand: { min: null, max: null, median: null }, insight: '' }],
        orgTraits: [],
        insight: 'org',
      },
      succession: {
        plans: [{
          roleTitle: 'Critical Role',
          incumbent: { id: '1', name: 'A', title: 'Critical Role' },
          risk: 'high',
          successors: [],
          insight: 'No successor',
        }],
        insight: 'risk',
      },
      hireLoop: {
        items: [],
        summary: { hired: 0, performing: 2, atRisk: 1, alumni: 0 },
        insight: 'loop',
      },
      benchmark: {
        roleTitle: 'Mgr',
        bankMedian: 12_000_000,
        internalMedian: 9_000_000,
        pressure: 'above',
        sampleBank: 3,
        sampleInternal: 2,
        note: 'pressure note',
      },
    });
    expect(out.insights.length).toBeGreaterThanOrEqual(3);
    expect(out.insights.some((i: any) => i.kind === 'succession_risk')).toBe(true);
  });
});

describe('Talent Analyst Phase 5', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { refineBlueprintFromUtterance, runAnalystTurn, expandSemanticQuery } = require('@/lib/hris/talent-analyst');

  const baseProfile = {
    id: 'p1', tenantId: 't1', fullName: 'Andi Pratama', email: null, phone: null,
    headline: 'Marketing Manager', location: 'Tangerang', locationArea: 'Tangerang',
    currentTitle: 'Marketing Manager', currentCompany: 'PT FMCG', experienceYears: 6,
    educationLevel: null, skills: ['digital marketing', 'meta ads', 'performance marketing'], industries: ['fmcg'],
    salaryCurrent: null, salaryExpectedMin: 9_000_000, salaryExpectedMax: 10_000_000,
    noticeDays: 30, workPreference: 'hybrid', intent: 'actively_looking' as const, source: 'manual',
    resumeUrl: null, resumeText: 'Performance marketing Meta Ads FMCG', tags: [],
    consentTalentPool: true, consentContact: true, profileUpdatedAt: new Date().toISOString(),
    salaryVerifiedAt: new Date().toISOString(), locationVerifiedAt: new Date().toISOString(),
    availabilityVerifiedAt: new Date().toISOString(), metadata: {},
  };

  it('starts a new search and asks clarifying questions', () => {
    const turn = runAnalystTurn({
      utterance: 'Cari Marketing Manager Tangerang sekitar Rp10 juta',
      profiles: [baseProfile],
      scope: 'external',
    });
    expect(turn.matchCount).toBeGreaterThanOrEqual(1);
    expect(turn.reply).toMatch(/Ditemukan|kandidat/i);
    expect(turn.suggestions.length).toBeGreaterThan(0);
    expect(turn.blueprint.location?.toLowerCase()).toContain('tangerang');
  });

  it('refines with Performance Marketing focus', () => {
    const first = refineBlueprintFromUtterance('Cari Marketing Manager Tangerang salary 10 juta');
    const second = refineBlueprintFromUtterance('Performance Marketing', first.blueprint);
    expect(second.applied.some((a: string) => /Performance/i.test(a))).toBe(true);
    expect(second.blueprint.skills.some((s: string) => /performance/i.test(s))).toBe(true);
  });

  it('expands semantic query tokens', () => {
    const tokens = expandSemanticQuery('meta ads fmcg analytics');
    expect(tokens).toEqual(expect.arrayContaining(['meta', 'fmcg', 'analytics']));
  });
});
