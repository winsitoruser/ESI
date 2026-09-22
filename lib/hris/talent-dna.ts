/**
 * Phase 4 — Company Talent DNA · Hire-to-Performance · Succession · Insights
 * Uses employees + performance_reviews/KPI + talent bank (no new tables required).
 */
import type { TalentProfile } from './talent-bank';
import { listTalentProfiles } from './talent-bank';
import type { RoleBlueprint } from './talent-matching';
import { matchTalentToRole, parseRoleBlueprint } from './talent-matching';
import {
  annotateUnifiedMatch,
  listInternalTalentProfiles,
  type UnifiedMatch,
} from './talent-workforce';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type DnaTrait = {
  skill: string;
  weight: number; // 0–100 prevalence among high performers
  evidence: string;
};

export type RoleDna = {
  roleKey: string;
  title: string;
  sampleSize: number;
  avgScore: number | null;
  traits: DnaTrait[];
  preferredIndustries: string[];
  salaryBand: { min: number | null; max: number | null; median: number | null };
  insight: string;
};

export type HireLoopItem = {
  profileId: string;
  fullName: string;
  hiredAs: string | null;
  employeeId: string | number | null;
  stage: 'candidate' | 'hired' | 'probation' | 'performing' | 'at_risk' | 'alumni';
  performanceScore: number | null;
  kpiAchievement: number | null;
  retentionMonths: number | null;
  skillValidation: string[];
  note: string;
};

export type SuccessionCandidate = UnifiedMatch & {
  readiness: 'ready_now' | 'ready_1y' | 'develop' | 'unlikely';
  learningPath: string[];
};

export type SuccessionPlan = {
  roleTitle: string;
  incumbent: { id: string; name: string; title: string | null } | null;
  risk: 'low' | 'medium' | 'high';
  successors: SuccessionCandidate[];
  insight: string;
};

export type WorkforceInsight = {
  kind: 'skill_gap' | 'succession_risk' | 'salary_pressure' | 'bench_thin' | 'learning';
  severity: 'info' | 'watch' | 'urgent';
  title: string;
  detail: string;
};

function normalizeRoleKey(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/\b(senior|junior|sr|jr|lead|head|manager|specialist|staff|officer)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ') || 'general';
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function loadPerformanceByEmployee(tenantId: string): Promise<Map<string, { score: number; period: string }>> {
  const map = new Map<string, { score: number; period: string }>();
  if (!sequelize) return map;
  try {
    const [rows] = await sequelize.query(
      `SELECT pr.employee_id::text AS eid, pr.overall_score::float AS score, pr.period
       FROM performance_reviews pr
       JOIN employees e ON e.id = pr.employee_id
       WHERE e.tenant_id = :tenantId
         AND pr.overall_score IS NOT NULL
         AND LOWER(COALESCE(pr.status, '')) IN ('completed', 'acknowledged', 'submitted', 'final')
       ORDER BY pr.reviewed_at DESC NULLS LAST, pr.updated_at DESC NULLS LAST`,
      { replacements: { tenantId } },
    );
    for (const r of rows || []) {
      const id = String(r.eid);
      if (!map.has(id)) map.set(id, { score: Number(r.score), period: String(r.period || '') });
    }
  } catch {
    /* table may miss status filter variants */
    try {
      const [rows] = await sequelize.query(
        `SELECT pr.employee_id::text AS eid, pr.overall_score::float AS score, pr.period
         FROM performance_reviews pr
         JOIN employees e ON e.id = pr.employee_id
         WHERE e.tenant_id = :tenantId AND pr.overall_score IS NOT NULL
         ORDER BY pr.updated_at DESC NULLS LAST`,
        { replacements: { tenantId } },
      );
      for (const r of rows || []) {
        const id = String(r.eid);
        if (!map.has(id)) map.set(id, { score: Number(r.score), period: String(r.period || '') });
      }
    } catch { /* empty */ }
  }
  return map;
}

async function loadKpiByEmployee(tenantId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!sequelize) return map;
  try {
    const [rows] = await sequelize.query(
      `SELECT ek.employee_id::text AS eid,
              ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual / ek.target * 100 ELSE 70 END)::numeric, 0) AS ach
       FROM employee_kpis ek
       JOIN employees e ON e.id = ek.employee_id
       WHERE e.tenant_id = :tenantId
       GROUP BY ek.employee_id`,
      { replacements: { tenantId } },
    );
    for (const r of rows || []) map.set(String(r.eid), Number(r.ach) || 70);
  } catch { /* empty */ }
  return map;
}

/** Derive Company Talent DNA per role family from high-performing employees. */
export async function buildCompanyTalentDna(
  tenantId: string,
  opts?: { minSample?: number; roleQuery?: string },
): Promise<{ roles: RoleDna[]; orgTraits: DnaTrait[]; insight: string }> {
  const internals = await listInternalTalentProfiles(tenantId, { includeAlumni: false, limit: 250 });
  const perf = await loadPerformanceByEmployee(tenantId);
  const kpi = await loadKpiByEmployee(tenantId);
  const minSample = opts?.minSample ?? 1;

  type Acc = {
    title: string;
    members: TalentProfile[];
    scores: number[];
    salaries: number[];
  };
  const byRole = new Map<string, Acc>();

  for (const p of internals) {
    const title = p.currentTitle || p.headline || 'Staff';
    const key = normalizeRoleKey(title);
    if (opts?.roleQuery) {
      const q = opts.roleQuery.toLowerCase();
      if (!key.includes(normalizeRoleKey(q)) && !title.toLowerCase().includes(q)) continue;
    }
    const eid = String(p.metadata?.employeeId ?? p.id.replace(/^emp:/, ''));
    const score = perf.get(eid)?.score ?? (kpi.has(eid) ? (kpi.get(eid)! / 20) : null);
    // Prefer high performers (score ≥ 3.5/5 or KPI ≥ 80); if no scores, include all for bootstrap DNA
    const isHigh = score == null ? true : score >= 3.5 || (kpi.get(eid) ?? 0) >= 80;
    if (!isHigh && score != null) continue;

    if (!byRole.has(key)) byRole.set(key, { title, members: [], scores: [], salaries: [] });
    const acc = byRole.get(key)!;
    acc.members.push(p);
    if (score != null) acc.scores.push(score);
    if (p.salaryCurrent != null) acc.salaries.push(p.salaryCurrent);
  }

  const roles: RoleDna[] = [];
  const orgSkill = new Map<string, number>();

  for (const [roleKey, acc] of byRole) {
    if (acc.members.length < minSample) continue;
    const skillCount = new Map<string, number>();
    for (const m of acc.members) {
      for (const s of m.skills) {
        const k = s.toLowerCase().trim();
        if (!k || k.length < 2) continue;
        skillCount.set(k, (skillCount.get(k) || 0) + 1);
        orgSkill.set(k, (orgSkill.get(k) || 0) + 1);
      }
    }
    const traits: DnaTrait[] = Array.from(skillCount.entries())
      .map(([skill, count]) => ({
        skill,
        weight: Math.round((count / acc.members.length) * 100),
        evidence: `${count}/${acc.members.length} high performers`,
      }))
      .filter((t) => t.weight >= 25 || acc.members.length <= 2)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);

    const avgScore = acc.scores.length
      ? Math.round((acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length) * 10) / 10
      : null;

    roles.push({
      roleKey,
      title: acc.title,
      sampleSize: acc.members.length,
      avgScore,
      traits,
      preferredIndustries: [],
      salaryBand: {
        min: acc.salaries.length ? Math.min(...acc.salaries) : null,
        max: acc.salaries.length ? Math.max(...acc.salaries) : null,
        median: median(acc.salaries),
      },
      insight: traits.length
        ? `DNA ${acc.title}: ${traits.slice(0, 3).map((t) => t.skill).join(', ')} membedakan high performer.`
        : `Belum cukup sinyal skill untuk ${acc.title} — lengkapi specialization karyawan.`,
    });
  }

  roles.sort((a, b) => b.sampleSize - a.sampleSize || (b.avgScore || 0) - (a.avgScore || 0));

  const orgTraits = Array.from(orgSkill.entries())
    .map(([skill, count]) => ({
      skill,
      weight: Math.min(100, Math.round((count / Math.max(1, internals.length)) * 100)),
      evidence: `${count} karyawan`,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  const insight = roles[0]
    ? `Organisasi paling kuat di pola “${roles[0].title}” (${roles[0].sampleSize} sampel). Gunakan DNA ini saat shortlist & score kandidat.`
    : 'Belum ada DNA role — pastikan ada karyawan aktif dengan posisi/skill terisi.';

  return { roles: roles.slice(0, 12), orgTraits, insight };
}

/** Align DNA traits as soft requirements onto a blueprint (Company DNA boost). */
export function applyDnaToBlueprint(blueprint: RoleBlueprint, dna: RoleDna | null): RoleBlueprint {
  if (!dna?.traits?.length) return blueprint;
  const existing = new Set(
    blueprint.requirements
      .filter((r) => r.kind === 'skill')
      .map((r) => String(r.value || r.label).toLowerCase()),
  );
  const extras = dna.traits
    .filter((t) => t.weight >= 40 && !existing.has(t.skill))
    .slice(0, 4)
    .map((t) => ({
      key: `dna:${t.skill}`,
      kind: 'skill' as const,
      label: `${t.skill} (Company DNA)`,
      value: t.skill,
      priority: t.weight >= 70 ? ('strongly_preferred' as const) : ('nice_to_have' as const),
    }));
  return {
    ...blueprint,
    skills: Array.from(new Set([...blueprint.skills, ...extras.map((e) => String(e.value))])),
    requirements: [...blueprint.requirements, ...extras],
  };
}

function monthsBetween(from: unknown): number | null {
  if (!from) return null;
  const t = new Date(String(from)).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 2_629_746_000));
}

/** Hire-to-performance loop: talent bank ↔ employees via email, enrich with outcomes. */
export async function buildHirePerformanceLoop(tenantId: string): Promise<{
  items: HireLoopItem[];
  summary: { hired: number; performing: number; atRisk: number; alumni: number };
  insight: string;
}> {
  const { items: bank } = await listTalentProfiles(tenantId, { limit: 200 });
  const internals = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 250 });
  const perf = await loadPerformanceByEmployee(tenantId);
  const kpi = await loadKpiByEmployee(tenantId);

  const byEmail = new Map<string, TalentProfile>();
  for (const p of internals) {
    if (p.email) byEmail.set(p.email.toLowerCase(), p);
  }

  const items: HireLoopItem[] = [];

  // Bank profiles that became employees
  for (const b of bank) {
    if (!b.email) continue;
    const emp = byEmail.get(b.email.toLowerCase());
    if (!emp) continue;
    const eid = String(emp.metadata?.employeeId ?? emp.id.replace(/^emp:/, ''));
    const score = perf.get(eid)?.score ?? null;
    const ach = kpi.get(eid) ?? null;
    const isAlumni = emp.metadata?.sourceKind === 'alumni';
    let stage: HireLoopItem['stage'] = 'hired';
    if (isAlumni) stage = 'alumni';
    else if (score != null && score < 2.5) stage = 'at_risk';
    else if (ach != null && ach < 60) stage = 'at_risk';
    else if (score != null || ach != null) stage = 'performing';
    else if ((monthsBetween(emp.metadata?.joinDate) ?? monthsBetween(emp.profileUpdatedAt) ?? 12) < 3) {
      stage = 'probation';
    }

    items.push({
      profileId: b.id,
      fullName: b.fullName,
      hiredAs: emp.currentTitle,
      employeeId: emp.metadata?.employeeId ?? null,
      stage,
      performanceScore: score,
      kpiAchievement: ach,
      retentionMonths: monthsBetween(emp.profileUpdatedAt),
      skillValidation: (emp.skills || []).filter((s) =>
        (b.skills || []).some((bs) => bs.toLowerCase() === s.toLowerCase()),
      ).slice(0, 5),
      note: stage === 'performing'
        ? 'Outcome positif — perkuat DNA role ini dari profil hire.'
        : stage === 'at_risk'
          ? 'Performansi lemah — tinjau ulang signal matching / onboarding.'
          : stage === 'alumni'
            ? 'Sudah offboard — masukkan ke borrow pool.'
            : 'Baru bergabung — pantau probation.',
    });
  }

  // Internal high/low performers without bank link still useful for loop summary
  for (const emp of internals.slice(0, 40)) {
    if (emp.email && bank.some((b) => b.email && b.email.toLowerCase() === emp.email!.toLowerCase())) continue;
    const eid = String(emp.metadata?.employeeId ?? emp.id.replace(/^emp:/, ''));
    const score = perf.get(eid)?.score ?? null;
    const ach = kpi.get(eid) ?? null;
    if (score == null && ach == null) continue;
    const isAlumni = emp.metadata?.sourceKind === 'alumni';
    let stage: HireLoopItem['stage'] = 'performing';
    if (isAlumni) stage = 'alumni';
    else if ((score != null && score < 2.5) || (ach != null && ach < 60)) stage = 'at_risk';

    items.push({
      profileId: emp.id,
      fullName: emp.fullName,
      hiredAs: emp.currentTitle,
      employeeId: emp.metadata?.employeeId ?? null,
      stage,
      performanceScore: score,
      kpiAchievement: ach,
      retentionMonths: null,
      skillValidation: (emp.skills || []).slice(0, 5),
      note: 'Internal outcome (belum tertaut Bank Data via email).',
    });
  }

  const summary = {
    hired: items.filter((i) => i.stage === 'hired' || i.stage === 'probation').length,
    performing: items.filter((i) => i.stage === 'performing').length,
    atRisk: items.filter((i) => i.stage === 'at_risk').length,
    alumni: items.filter((i) => i.stage === 'alumni').length,
  };

  const insight =
    summary.atRisk > 0
      ? `${summary.atRisk} talent berisiko — bandingkan DNA hire vs outcome untuk kalibrasi matching.`
      : summary.performing > 0
        ? `${summary.performing} hire/internal berkinerja baik — DNA role bisa diperkuat dari mereka.`
        : 'Belum ada outcome performansi. Isi performance review / KPI agar loop aktif.';

  return { items: items.slice(0, 40), summary, insight };
}

export function learningRecommendationsForGaps(missingSkills: string[]): string[] {
  return missingSkills.slice(0, 5).map((s) => {
    const skill = s.trim();
    if (/ads|meta|google|seo|marketing/i.test(skill)) {
      return `Kursus terapan: ${skill} (30–60 hari) + project shadowing`;
    }
    if (/sql|data|analytics|excel|python/i.test(skill)) {
      return `Learning path data: ${skill} + sertifikasi singkat`;
    }
    if (/lead|manage|people|coach/i.test(skill)) {
      return `Mentoring 1:1 + stretch assignment kepemimpinan (${skill})`;
    }
    return `Upskill terstruktur: ${skill} (~30 hari per gap)`;
  });
}

function readinessFromGaps(missing: number, roleFit: number): SuccessionCandidate['readiness'] {
  if (missing === 0 && roleFit >= 70) return 'ready_now';
  if (missing <= 1 && roleFit >= 55) return 'ready_1y';
  if (missing <= 3 && roleFit >= 40) return 'develop';
  return 'unlikely';
}

/** Succession plans for key roles / departments. */
export async function buildSuccessionPlans(
  tenantId: string,
  opts?: { roleQuery?: string; limitRoles?: number },
): Promise<{ plans: SuccessionPlan[]; insight: string }> {
  const internals = await listInternalTalentProfiles(tenantId, { includeAlumni: false, limit: 200 });
  const titles = new Map<string, TalentProfile[]>();
  for (const p of internals) {
    const t = p.currentTitle || 'Staff';
    const key = opts?.roleQuery
      ? (t.toLowerCase().includes(opts.roleQuery.toLowerCase()) ? t : null)
      : t;
    if (!key) continue;
    if (!titles.has(key)) titles.set(key, []);
    titles.get(key)!.push(p);
  }

  // Prefer roles with few people (bench risk) or explicit query
  const roleEntries = Array.from(titles.entries())
    .sort((a, b) => a[1].length - b[1].length)
    .slice(0, opts?.limitRoles ?? 8);

  const plans: SuccessionPlan[] = [];

  for (const [roleTitle, holders] of roleEntries) {
    const incumbent = holders[0];
    const blueprint = parseRoleBlueprint(
      `${roleTitle} ${incumbent.skills.slice(0, 5).join(' ')} ${incumbent.location || ''}`,
    );
    const pool = internals.filter((p) => p.id !== incumbent.id);
    const ranked = pool
      .map((p) => {
        const base = annotateUnifiedMatch(matchTalentToRole(p, blueprint), p, blueprint);
        const learningPath = learningRecommendationsForGaps(base.missingSkills);
        const readiness = readinessFromGaps(base.missingSkills.length, base.roleFit);
        return { ...base, readiness, learningPath } as SuccessionCandidate;
      })
      .filter((m) => m.readiness !== 'unlikely')
      .sort((a, b) => {
        const order = { ready_now: 0, ready_1y: 1, develop: 2, unlikely: 3 };
        return order[a.readiness] - order[b.readiness] || b.roleFit - a.roleFit;
      })
      .slice(0, 5);

    const readyCount = ranked.filter((r) => r.readiness === 'ready_now' || r.readiness === 'ready_1y').length;
    const risk: SuccessionPlan['risk'] =
      holders.length <= 1 && readyCount === 0 ? 'high'
        : holders.length <= 2 && readyCount < 2 ? 'medium'
          : 'low';

    plans.push({
      roleTitle,
      incumbent: {
        id: incumbent.id,
        name: incumbent.fullName,
        title: incumbent.currentTitle,
      },
      risk,
      successors: ranked,
      insight:
        risk === 'high'
          ? `Tidak ada successor siap untuk ${roleTitle} — prioritaskan develop atau hire.`
          : risk === 'medium'
            ? `Bench tipis untuk ${roleTitle}; siapkan learning path successor.`
            : `Suksesi ${roleTitle} relatif aman.`,
    });
  }

  plans.sort((a, b) => {
    const r = { high: 0, medium: 1, low: 2 };
    return r[a.risk] - r[b.risk];
  });

  const high = plans.filter((p) => p.risk === 'high').length;
  return {
    plans,
    insight: high
      ? `${high} role berisiko suksesi tinggi — lihat successor & learning recommendations.`
      : plans.length
        ? 'Peta suksesi tersedia; pantau role dengan risk medium.'
        : 'Belum cukup data posisi untuk peta suksesi.',
  };
}

/** Lightweight market benchmark: bank salary vs internal DNA band. */
export async function buildTalentMarketBenchmark(
  tenantId: string,
  roleQuery?: string,
): Promise<{
  roleTitle: string;
  bankMedian: number | null;
  internalMedian: number | null;
  pressure: 'below' | 'aligned' | 'above' | 'unknown';
  sampleBank: number;
  sampleInternal: number;
  note: string;
}> {
  const blueprint = roleQuery ? parseRoleBlueprint(roleQuery) : null;
  const title = blueprint?.role || roleQuery || 'Semua role';
  const { items: bank } = await listTalentProfiles(tenantId, { limit: 200 });
  const internals = await listInternalTalentProfiles(tenantId, { includeAlumni: false, limit: 200 });

  const q = (roleQuery || '').toLowerCase().trim();
  const bankSal = bank
    .filter((p) => {
      if (!q) return p.salaryExpectedMin != null;
      const blob = `${p.currentTitle || ''} ${p.headline || ''} ${p.skills.join(' ')}`.toLowerCase();
      return blob.includes(q.split(/\s+/)[0] || '');
    })
    .map((p) => p.salaryExpectedMin)
    .filter((n): n is number => n != null && n > 0);

  const intSal = internals
    .filter((p) => {
      if (!q) return p.salaryCurrent != null;
      const blob = `${p.currentTitle || ''} ${p.skills.join(' ')}`.toLowerCase();
      return blob.includes(q.split(/\s+/)[0] || '');
    })
    .map((p) => p.salaryCurrent)
    .filter((n): n is number => n != null && n > 0);

  const bankMedian = median(bankSal);
  const internalMedian = median(intSal);
  let pressure: 'below' | 'aligned' | 'above' | 'unknown' = 'unknown';
  if (bankMedian != null && internalMedian != null) {
    const ratio = bankMedian / internalMedian;
    pressure = ratio > 1.15 ? 'above' : ratio < 0.9 ? 'below' : 'aligned';
  }

  const note =
    pressure === 'above'
      ? 'Ekspektasi market (Bank Data) di atas median internal — siapkan banding atau longgar constraint gaji.'
      : pressure === 'below'
        ? 'Internal pay di atas market expect — daya tarik kompensasi relatif kuat.'
        : pressure === 'aligned'
          ? 'Band gaji internal selaras dengan ekspektasi Bank Data.'
          : 'Data gaji belum cukup untuk benchmark.';

  return {
    roleTitle: title,
    bankMedian,
    internalMedian,
    pressure,
    sampleBank: bankSal.length,
    sampleInternal: intSal.length,
    note,
  };
}

export function composePredictiveInsights(input: {
  dna: Awaited<ReturnType<typeof buildCompanyTalentDna>>;
  succession: Awaited<ReturnType<typeof buildSuccessionPlans>>;
  hireLoop: Awaited<ReturnType<typeof buildHirePerformanceLoop>>;
  benchmark: Awaited<ReturnType<typeof buildTalentMarketBenchmark>>;
}): { insights: WorkforceInsight[]; insight: string } {
  const { dna, succession, hireLoop, benchmark } = input;
  const insights: WorkforceInsight[] = [];

  for (const plan of succession.plans.filter((p) => p.risk !== 'low').slice(0, 4)) {
    insights.push({
      kind: 'succession_risk',
      severity: plan.risk === 'high' ? 'urgent' : 'watch',
      title: `Suksesi: ${plan.roleTitle}`,
      detail: plan.insight,
    });
  }

  if (hireLoop.summary.atRisk > 0) {
    insights.push({
      kind: 'skill_gap',
      severity: hireLoop.summary.atRisk >= 3 ? 'urgent' : 'watch',
      title: 'Hire outcome at risk',
      detail: `${hireLoop.summary.atRisk} profil dengan sinyal performansi lemah — kalibrasi matching & onboarding.`,
    });
  }

  if (benchmark.pressure === 'above') {
    insights.push({
      kind: 'salary_pressure',
      severity: 'watch',
      title: `Tekanan gaji: ${benchmark.roleTitle}`,
      detail: benchmark.note,
    });
  }

  const thin = dna.roles.filter((r) => r.sampleSize <= 1).slice(0, 3);
  for (const r of thin) {
    insights.push({
      kind: 'bench_thin',
      severity: 'info',
      title: `Bench tipis: ${r.title}`,
      detail: 'Hanya 1 sampel high-performer — DNA role masih bootstrap.',
    });
  }

  const topGaps = succession.plans
    .flatMap((p) => p.successors.flatMap((s) => s.missingSkills))
    .slice(0, 3);
  if (topGaps.length) {
    insights.push({
      kind: 'learning',
      severity: 'info',
      title: 'Learning recommendations',
      detail: learningRecommendationsForGaps(topGaps).join(' · '),
    });
  }

  return {
    insights: insights.slice(0, 12),
    insight: insights[0]?.detail || dna.insight,
  };
}

export async function buildPredictiveInsights(
  tenantId: string,
  roleQuery?: string,
): Promise<{ insights: WorkforceInsight[]; insight: string }> {
  const [dna, succession, hireLoop, benchmark] = await Promise.all([
    buildCompanyTalentDna(tenantId, { roleQuery }),
    buildSuccessionPlans(tenantId, { roleQuery, limitRoles: 6 }),
    buildHirePerformanceLoop(tenantId),
    buildTalentMarketBenchmark(tenantId, roleQuery),
  ]);
  return composePredictiveInsights({ dna, succession, hireLoop, benchmark });
}

/** Full Phase 4 dashboard payload. */
export async function getTalentIntelligencePhase4(
  tenantId: string,
  roleQuery?: string,
): Promise<{
  dna: Awaited<ReturnType<typeof buildCompanyTalentDna>>;
  hireLoop: Awaited<ReturnType<typeof buildHirePerformanceLoop>>;
  succession: Awaited<ReturnType<typeof buildSuccessionPlans>>;
  benchmark: Awaited<ReturnType<typeof buildTalentMarketBenchmark>>;
  predictive: { insights: WorkforceInsight[]; insight: string };
}> {
  const [dna, hireLoop, succession, benchmark] = await Promise.all([
    buildCompanyTalentDna(tenantId, { roleQuery }),
    buildHirePerformanceLoop(tenantId),
    buildSuccessionPlans(tenantId, { roleQuery }),
    buildTalentMarketBenchmark(tenantId, roleQuery),
  ]);
  const predictive = composePredictiveInsights({ dna, succession, hireLoop, benchmark });
  return { dna, hireLoop, succession, benchmark, predictive };
}
