/**
 * Phase 3 — Internal talent + Build vs Buy + team capability
 * Maps employees → TalentProfile shape for unified matching.
 */
import type { TalentProfile } from './talent-bank';
import { parseTalentFromText } from './talent-bank';
import {
  matchTalentToRole,
  parseRoleBlueprint,
  rankTalentMatches,
  type RoleBlueprint,
  type TalentMatchResult,
} from './talent-matching';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type TalentSourceKind = 'external' | 'employee' | 'alumni' | 'referral';

export type UnifiedMatch = TalentMatchResult & {
  sourceKind: TalentSourceKind;
  readinessDays: number | null;
  missingSkills: string[];
  buildPath?: string;
};

function yearsSince(dateRaw: unknown): number | null {
  if (!dateRaw) return null;
  const t = new Date(String(dateRaw)).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round(((Date.now() - t) / 31_557_600_000) * 10) / 10);
}

/** Convert employee row into a Living Talent Profile (synthetic id emp:{id}). */
export function employeeRowToTalentProfile(row: any, tenantId: string): TalentProfile {
  const text = [row.position, row.department, row.specialization, row.biography, row.role]
    .filter(Boolean)
    .join('\n');
  const parsed = parseTalentFromText({
    text,
    fullName: row.name,
    email: row.email,
    phone: row.phone_number,
  });
  const skills = Array.from(new Set([
    ...(parsed.skills || []),
    ...(row.position ? [String(row.position)] : []),
    ...(row.department ? [String(row.department).toLowerCase()] : []),
  ].map((s) => String(s).trim()).filter(Boolean)));

  const isAlumni = ['TERMINATED', 'RESIGNED', 'INACTIVE', 'END'].includes(String(row.status || '').toUpperCase())
    || row.is_active === false;

  return {
    id: `emp:${row.id}`,
    tenantId,
    fullName: String(row.name || 'Karyawan'),
    email: row.email ? String(row.email) : null,
    phone: row.phone_number ? String(row.phone_number) : null,
    headline: row.position ? String(row.position) : null,
    location: row.work_location ? String(row.work_location) : null,
    locationArea: row.work_location ? String(row.work_location) : null,
    currentTitle: row.position ? String(row.position) : null,
    currentCompany: 'Internal',
    experienceYears: yearsSince(row.join_date),
    educationLevel: null,
    skills,
    industries: [],
    salaryCurrent: row.base_salary != null ? Number(row.base_salary) : null,
    salaryExpectedMin: row.base_salary != null ? Number(row.base_salary) : null,
    salaryExpectedMax: row.base_salary != null ? Math.round(Number(row.base_salary) * 1.15) : null,
    noticeDays: isAlumni ? 0 : 30,
    workPreference: null,
    intent: isAlumni ? 'open' : 'not_looking',
    source: isAlumni ? 'alumni' : 'employee',
    resumeUrl: null,
    resumeText: text || null,
    tags: [isAlumni ? 'alumni' : 'employee', row.department, row.status].filter(Boolean).map(String),
    consentTalentPool: true,
    consentContact: true,
    profileUpdatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    salaryVerifiedAt: row.base_salary != null ? new Date().toISOString() : null,
    locationVerifiedAt: row.work_location ? new Date().toISOString() : null,
    availabilityVerifiedAt: null,
    metadata: {
      employeeId: row.id,
      department: row.department,
      status: row.status,
      sourceKind: isAlumni ? 'alumni' : 'employee',
    },
  };
}

export async function listInternalTalentProfiles(
  tenantId: string,
  opts?: { includeAlumni?: boolean; limit?: number },
): Promise<TalentProfile[]> {
  if (!sequelize || !tenantId) return [];
  const limit = Math.min(300, Math.max(1, opts?.limit ?? 100));
  const includeAlumni = opts?.includeAlumni !== false;
  const sp = `sp_int_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await sequelize.query(`SAVEPOINT ${sp}`);
    const [rows] = await sequelize.query(
      `SELECT id, name, email, phone_number, position, department, work_location,
              specialization, biography, role, status, is_active, join_date, base_salary, updated_at
       FROM employees
       WHERE tenant_id = :tenantId
         AND (
           COALESCE(is_active, true) = true
           OR UPPER(COALESCE(status, '')) IN ('ACTIVE', 'PROBATION')
           ${includeAlumni ? `OR UPPER(COALESCE(status, '')) IN ('TERMINATED','RESIGNED','INACTIVE','END')
             OR COALESCE(is_active, true) = false` : ''}
         )
       ORDER BY updated_at DESC NULLS LAST
       LIMIT :limit`,
      { replacements: { tenantId, limit } },
    );
    await sequelize.query(`RELEASE SAVEPOINT ${sp}`);
    return (rows || []).map((r: any) => employeeRowToTalentProfile(r, tenantId));
  } catch {
    try { await sequelize.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch { /* ignore */ }
    try { await sequelize.query(`RELEASE SAVEPOINT ${sp}`); } catch { /* ignore */ }
    return [];
  }
}

export function annotateUnifiedMatch(
  match: TalentMatchResult,
  profile: TalentProfile,
  blueprint: RoleBlueprint,
): UnifiedMatch {
  const sourceKind = (profile.metadata?.sourceKind as TalentSourceKind)
    || (profile.source === 'alumni' ? 'alumni' : profile.id.startsWith('emp:') ? 'employee' : 'external');

  const mustSkills = blueprint.requirements
    .filter((r) => r.kind === 'skill' && (r.priority === 'must_have' || r.priority === 'strongly_preferred'))
    .map((r) => String(r.value || r.label).toLowerCase());
  const have = new Set(profile.skills.map((s) => s.toLowerCase()));
  const blob = `${profile.resumeText || ''} ${profile.headline || ''}`.toLowerCase();
  const missingSkills = mustSkills.filter((s) => !have.has(s) && !blob.includes(s));

  let readinessDays: number | null = null;
  if (sourceKind === 'external') {
    readinessDays = profile.noticeDays ?? 30;
  } else if (sourceKind === 'alumni') {
    readinessDays = 14;
  } else {
    readinessDays = missingSkills.length === 0 ? 0 : missingSkills.length * 30;
  }

  const buildPath = sourceKind === 'employee' && missingSkills.length
    ? `Upskill: ${missingSkills.slice(0, 3).join(', ')} (~${readinessDays} hari)`
    : sourceKind === 'employee'
      ? 'Siap diinternal-mobility / mutasi'
      : undefined;

  return {
    ...match,
    sourceKind,
    readinessDays,
    missingSkills,
    buildPath,
  };
}

export function rankUnifiedTalent(
  profiles: TalentProfile[],
  blueprint: RoleBlueprint,
  limit = 25,
): UnifiedMatch[] {
  return profiles
    .filter((p) => p.consentTalentPool)
    .map((p) => annotateUnifiedMatch(matchTalentToRole(p, blueprint), p, blueprint))
    .sort((a, b) => {
      const score = (m: UnifiedMatch) => m.roleFit * 0.45 + m.actionability * 0.25 + m.dataConfidence * 0.15
        + (m.sourceKind === 'employee' && m.missingSkills.length === 0 ? 8 : 0)
        + (m.sourceKind === 'alumni' ? 3 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export type BuildBuyOption = {
  path: 'build' | 'buy' | 'borrow';
  label: string;
  count: number;
  top: UnifiedMatch[];
  note: string;
};

export function analyzeBuildVsBuy(
  external: TalentProfile[],
  internal: TalentProfile[],
  blueprint: RoleBlueprint,
): {
  options: BuildBuyOption[];
  insight: string;
  recommendation: 'build' | 'buy' | 'borrow' | 'mixed';
} {
  const ext = rankUnifiedTalent(external, blueprint, 10).filter((m) => m.roleFit >= 65);
  const emp = rankUnifiedTalent(
    internal.filter((p) => p.metadata?.sourceKind !== 'alumni'),
    blueprint,
    10,
  );
  const readyInternal = emp.filter((m) => m.missingSkills.length <= 1 && m.roleFit >= 55);
  const upskillable = emp.filter((m) => m.missingSkills.length >= 1 && m.missingSkills.length <= 3 && m.roleFit >= 45);
  const alumni = rankUnifiedTalent(
    internal.filter((p) => p.metadata?.sourceKind === 'alumni'),
    blueprint,
    5,
  ).filter((m) => m.roleFit >= 55);

  const options: BuildBuyOption[] = [
    {
      path: 'buy',
      label: 'Buy — rekrut eksternal',
      count: ext.length,
      top: ext.slice(0, 3),
      note: ext[0]
        ? `Kandidat terbaik ${ext[0].fullName} (fit ${ext[0].roleFit}%, siap ~${ext[0].readinessDays ?? '—'} hari)`
        : 'Belum ada kandidat eksternal kuat di Bank Data',
    },
    {
      path: 'build',
      label: 'Build — kembangkan internal',
      count: readyInternal.length + upskillable.length,
      top: [...readyInternal, ...upskillable].slice(0, 3),
      note: readyInternal[0]
        ? `${readyInternal[0].fullName} hampir siap${readyInternal[0].missingSkills.length ? ` · gap: ${readyInternal[0].missingSkills.join(', ')}` : ''}`
        : upskillable[0]
          ? `${upskillable.length} karyawan bisa di-upskill`
          : 'Belum ada kandidat internal yang cocok',
    },
    {
      path: 'borrow',
      label: 'Borrow — alumni / kontrak',
      count: alumni.length,
      top: alumni.slice(0, 3),
      note: alumni[0]
        ? `Alumni ${alumni[0].fullName} (fit ${alumni[0].roleFit}%)`
        : 'Pool alumni belum terisi — sync offboarding ke Bank Data ke depan',
    },
  ];

  let recommendation: 'build' | 'buy' | 'borrow' | 'mixed' = 'buy';
  if (readyInternal.length >= 1 && ext.length < 3) recommendation = 'build';
  else if (readyInternal.length >= 1 && ext.length >= 1) recommendation = 'mixed';
  else if (ext.length === 0 && upskillable.length >= 1) recommendation = 'build';
  else if (ext.length === 0 && alumni.length >= 1) recommendation = 'borrow';

  const insight =
    recommendation === 'build'
      ? 'Internal mobility / upskill lebih realistis daripada hiring baru untuk requirement ini.'
      : recommendation === 'mixed'
        ? 'Bandingkan biaya hire eksternal vs waktu upskill internal sebelum memutuskan.'
        : recommendation === 'borrow'
          ? 'Pertimbangkan alumni atau kontrak sementara sambil menambah Bank Data.'
          : 'Talent eksternal di Bank Data mencukupi untuk shortlist hire.';

  return { options, insight, recommendation };
}

export type TeamCapability = {
  department: string;
  headcount: number;
  strengths: { skill: string; count: number }[];
  gaps: string[];
  contributionHint: string;
};

export async function analyzeTeamCapability(
  tenantId: string,
  blueprint?: RoleBlueprint | null,
): Promise<{ teams: TeamCapability[]; neededSkills: string[] }> {
  const internals = await listInternalTalentProfiles(tenantId, { includeAlumni: false, limit: 200 });
  const byDept = new Map<string, TalentProfile[]>();
  for (const p of internals) {
    const dept = String(p.metadata?.department || p.currentTitle || 'Umum');
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(p);
  }

  const neededSkills = (blueprint?.requirements || [])
    .filter((r) => r.kind === 'skill')
    .map((r) => String(r.value || r.label));

  const teams: TeamCapability[] = [];
  for (const [department, members] of byDept) {
    const skillCount = new Map<string, number>();
    for (const m of members) {
      for (const s of m.skills) {
        const k = s.toLowerCase();
        skillCount.set(k, (skillCount.get(k) || 0) + 1);
      }
    }
    const strengths = Array.from(skillCount.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const have = new Set(strengths.map((s) => s.skill));
    const gaps = neededSkills.filter((s) => !have.has(s.toLowerCase()) && ![...have].some((h) => h.includes(s.toLowerCase())));

    teams.push({
      department,
      headcount: members.length,
      strengths,
      gaps: gaps.slice(0, 5),
      contributionHint: gaps.length
        ? `Hire berikutnya sebaiknya menutup: ${gaps.slice(0, 2).join(', ')}`
        : 'Tim sudah menutup skill inti requirement saat ini',
    });
  }

  teams.sort((a, b) => b.headcount - a.headcount);
  return { teams: teams.slice(0, 12), neededSkills };
}

export function blueprintFromQueryOrBody(query: string, body?: any): RoleBlueprint {
  let blueprint = parseRoleBlueprint(query);
  if (Array.isArray(body?.requirements) && body.requirements.length) {
    blueprint = { ...blueprint, requirements: body.requirements };
  }
  return blueprint;
}

/** Convenience: external-only strong matches count for market insight. */
export function externalStrongCount(profiles: TalentProfile[], blueprint: RoleBlueprint): number {
  return rankTalentMatches(profiles, blueprint, 10_000).filter((m) => m.roleFit >= 70).length;
}
