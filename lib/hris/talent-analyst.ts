/**
 * Phase 5 — Conversational Talent Analyst + Recruitment Memory
 * Rules-based multi-turn refine (decision support, not auto-hire).
 */
import type { TalentProfile } from './talent-bank';
import {
  parseRoleBlueprint,
  setRequirementPriority,
  simulateTalentMarket,
  suggestSmartRelaxation,
  rankTalentMatches,
  type RoleBlueprint,
  type TalentMatchResult,
} from './talent-matching';
import { rankUnifiedTalent, type UnifiedMatch } from './talent-workforce';

export type AnalystMessage = {
  role: 'user' | 'analyst';
  text: string;
  at?: string;
};

export type AnalystSuggestion = {
  id: string;
  label: string;
  applyAs: string; // user reply shortcut
};

export type AnalystTurnResult = {
  blueprint: RoleBlueprint;
  reply: string;
  suggestions: AnalystSuggestion[];
  matchCount: number;
  strongCount: number;
  topMatches: Array<TalentMatchResult | UnifiedMatch>;
  market: ReturnType<typeof simulateTalentMarket>;
  relaxation: ReturnType<typeof suggestSmartRelaxation>;
  applied: string[];
  messages: AnalystMessage[];
};

const FOCUS_SKILLS: { keys: RegExp; skill: string; label: string }[] = [
  { keys: /performance\s*marketing|perf\s*mkt|growth/i, skill: 'performance marketing', label: 'Performance Marketing' },
  { keys: /brand\s*marketing|branding|creative/i, skill: 'brand marketing', label: 'Brand Marketing' },
  { keys: /trade\s*marketing|gtm|modern\s*trade/i, skill: 'trade marketing', label: 'Trade Marketing' },
  { keys: /meta\s*ads|facebook\s*ads|fb\s*ads|paid\s*social/i, skill: 'meta ads', label: 'Meta Ads' },
  { keys: /google\s*ads|adwords|sem/i, skill: 'google ads', label: 'Google Ads' },
  { keys: /\bseo\b|search\s*engine/i, skill: 'seo', label: 'SEO' },
  { keys: /analytics|ga4|data\s*driven/i, skill: 'analytics', label: 'Analytics' },
  { keys: /fmcg|consumer\s*goods/i, skill: 'fmcg', label: 'FMCG' },
  { keys: /b2b|enterprise\s*sales/i, skill: 'b2b', label: 'B2B' },
  { keys: /fintech|banking/i, skill: 'fintech', label: 'Fintech' },
];

function extractSalaryMax(text: string): number | null {
  const m = text.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(jt|juta|m(?:iliar)?)/i)
    || text.match(/salary\s*(?:max|maks|≤|<=)?\s*(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  const n = parseFloat(String(m[1]).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || 'jt').toLowerCase();
  if (unit.startsWith('m') && !unit.startsWith('jt') && unit !== 'juta') return Math.round(n * 1_000_000_000);
  if (n < 1000) return Math.round(n * 1_000_000);
  return Math.round(n);
}

function extractLocation(text: string): string | null {
  const city = text.match(
    /\b(jakarta(?:\s+(?:selatan|utara|barat|timur|pusat))?|tangerang(?:\s+selatan)?|bekasi|bogor|bandung|surabaya|medan|semarang|yogyakarta|depok|bsd|cikarang|karawang)\b/i,
  );
  if (city) return String(city[1]).trim();
  const m = text.match(/(?:di|sekitar|area|lokasi)\s+([A-Za-zÀ-ÿ.]{3,}(?:\s+[A-Za-zÀ-ÿ.]+)?)/i);
  if (!m) return null;
  const loc = String(m[1]).trim();
  if (/^(rp|salary|gaji|rp\.?|\d)/i.test(loc)) return null;
  return loc;
}

function addSkillRequirement(bp: RoleBlueprint, skill: string, priority: 'must_have' | 'strongly_preferred' | 'preferred' = 'strongly_preferred'): RoleBlueprint {
  const key = `skill:${skill.toLowerCase()}`;
  const exists = bp.requirements.find((r) => r.key === key || normEq(String(r.value || r.label), skill));
  if (exists) {
    return setRequirementPriority(bp, exists.key, priority);
  }
  return {
    ...bp,
    skills: Array.from(new Set([...bp.skills, skill])),
    requirements: [
      ...bp.requirements,
      {
        key,
        label: skill,
        kind: 'skill',
        value: skill,
        priority,
      },
    ],
    rawQuery: `${bp.rawQuery} | ${skill}`.trim(),
  };
}

function addIndustry(bp: RoleBlueprint, industry: string, asMust = true): RoleBlueprint {
  const key = `industry:${industry.toLowerCase()}`;
  const exists = bp.requirements.find((r) => r.key === key);
  if (exists) {
    return setRequirementPriority(bp, exists.key, asMust ? 'must_have' : 'preferred');
  }
  return {
    ...bp,
    industries: Array.from(new Set([...bp.industries, industry])),
    requirements: [
      ...bp.requirements,
      {
        key,
        label: industry,
        kind: 'industry',
        value: industry,
        priority: asMust ? 'must_have' : 'preferred',
      },
    ],
  };
}

function normEq(a: string, b: string) {
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

function relaxRequirement(bp: RoleBlueprint, kind: string): { blueprint: RoleBlueprint; note: string } | null {
  if (kind === 'salary' && bp.salaryMax != null) {
    const nextMax = Math.round(bp.salaryMax * 1.15);
    return {
      blueprint: {
        ...bp,
        salaryMax: nextMax,
        requirements: bp.requirements.map((r) =>
          r.kind === 'salary'
            ? { ...r, value: nextMax, label: `Salary ≤ Rp${(nextMax / 1_000_000).toFixed(1)} jt` }
            : r,
        ),
      },
      note: `Salary max dinaikkan ~15% → Rp ${(nextMax / 1_000_000).toFixed(1)} jt`,
    };
  }
  if (kind === 'experience' && bp.experienceMin != null && bp.experienceMin > 1) {
    const next = bp.experienceMin - 1;
    return {
      blueprint: {
        ...bp,
        experienceMin: next,
        requirements: bp.requirements.map((r) =>
          r.kind === 'experience'
            ? { ...r, value: next, label: `≥ ${next} tahun pengalaman` }
            : r,
        ),
      },
      note: `Pengalaman minimum ${bp.experienceMin} → ${next} tahun`,
    };
  }
  if (kind === 'industry') {
    const ind = bp.requirements.find((r) => r.kind === 'industry' && r.priority === 'must_have');
    if (ind) {
      return {
        blueprint: setRequirementPriority(bp, ind.key, 'preferred'),
        note: `${ind.label} diubah dari wajib → preferred`,
      };
    }
  }
  if (kind === 'location') {
    const loc = bp.requirements.find((r) => r.kind === 'location' && r.priority === 'must_have');
    if (loc) {
      return {
        blueprint: setRequirementPriority(bp, loc.key, 'preferred'),
        note: `Lokasi diubah menjadi preferred (remote/hybrid lebih longgar)`,
      };
    }
  }
  return null;
}

/** Apply one user utterance onto an existing (or new) blueprint. */
export function refineBlueprintFromUtterance(
  utterance: string,
  current?: RoleBlueprint | null,
): { blueprint: RoleBlueprint; applied: string[]; isNewSearch: boolean } {
  const text = utterance.trim();
  const looksLikeNewSearch = /^(cari|carikan|tolong\s+cari|find|looking\s+for|butuh|butuhkan)/i.test(text)
    || (!current && text.length > 8);

  let blueprint = current && !looksLikeNewSearch
    ? { ...current, requirements: [...current.requirements] }
    : parseRoleBlueprint(text);
  const isNewSearch = !current || looksLikeNewSearch;
  if (isNewSearch && current && looksLikeNewSearch) {
    blueprint = parseRoleBlueprint(text);
  }

  const applied: string[] = [];

  // Focus / prioritize skills
  for (const focus of FOCUS_SKILLS) {
    if (focus.keys.test(text) || (/(prioritas|fokus|utamakan|yang\s+penting)/i.test(text) && focus.keys.test(text))) {
      // only apply if mentioned or if short focus reply matches
      const mentioned = focus.keys.test(text);
      if (mentioned) {
        const asMust = /wajib|harus|must|hanya/i.test(text);
        blueprint = addSkillRequirement(blueprint, focus.skill, asMust ? 'must_have' : 'strongly_preferred');
        applied.push(`Prioritas: ${focus.label}`);
        if (/fmcg|fintech|b2b/i.test(focus.skill) || focus.skill === 'fmcg') {
          blueprint = addIndustry(blueprint, focus.label, asMust);
        }
      }
    }
  }

  // Short focus replies without "cari" — e.g. "Performance Marketing"
  if (!isNewSearch || applied.length === 0) {
    for (const focus of FOCUS_SKILLS) {
      if (focus.keys.test(text) && text.length < 60) {
        if (!applied.some((a) => a.includes(focus.label))) {
          blueprint = addSkillRequirement(blueprint, focus.skill, 'strongly_preferred');
          applied.push(`Fokus: ${focus.label}`);
        }
      }
    }
  }

  // Industry as must / preferred
  if (/\bfmcg\b/i.test(text)) {
    const asPreferred = /prefer|preferred|kalau\s+bisa|boleh/i.test(text) && !/wajib|harus|must/i.test(text);
    blueprint = addIndustry(blueprint, 'FMCG', !asPreferred);
    if (!applied.some((a) => /FMCG/i.test(a))) applied.push(asPreferred ? 'FMCG sebagai preferred' : 'FMCG sebagai wajib');
  }

  // Salary tweak
  const sal = extractSalaryMax(text);
  if (sal != null) {
    blueprint = {
      ...blueprint,
      salaryMax: sal,
      requirements: blueprint.requirements.map((r) =>
        r.kind === 'salary'
          ? { ...r, value: sal, label: `Salary ≤ Rp${(sal / 1_000_000).toFixed(1)} jt` }
          : r,
      ),
    };
    if (!blueprint.requirements.some((r) => r.kind === 'salary')) {
      blueprint.requirements.push({
        key: 'salary_max',
        label: `Salary ≤ Rp${(sal / 1_000_000).toFixed(1)} jt`,
        kind: 'salary',
        value: sal,
        priority: 'must_have',
      });
    }
    applied.push(`Salary max Rp ${(sal / 1_000_000).toFixed(1)} jt`);
  }

  // Location
  const loc = extractLocation(text);
  if (loc && /(di|sekitar|area|lokasi|pindah|dari)/i.test(text)) {
    blueprint = {
      ...blueprint,
      location: loc,
      requirements: blueprint.requirements.some((r) => r.kind === 'location')
        ? blueprint.requirements.map((r) =>
          r.kind === 'location' ? { ...r, value: loc, label: `Area ${loc}` } : r,
        )
        : [
          ...blueprint.requirements,
          { key: 'location', label: `Area ${loc}`, kind: 'location', value: loc, priority: 'must_have' },
        ],
    };
    applied.push(`Lokasi: ${loc}`);
  }

  // Explicit relax
  if (/relaks|relax|longgarkan|turunkan\s+syarat|lebih\s+longgar/i.test(text)) {
    for (const kind of ['industry', 'salary', 'experience', 'location']) {
      const hit = relaxRequirement(blueprint, kind);
      if (hit) {
        blueprint = hit.blueprint;
        applied.push(hit.note);
        break;
      }
    }
  }
  if (/fmcg.*(preferred|preferensi|bukan\s+wajib)|jadi\s+preferred/i.test(text)) {
    const hit = relaxRequirement(blueprint, 'industry');
    if (hit) {
      blueprint = hit.blueprint;
      applied.push(hit.note);
    }
  }

  // Intent filter hints stored on rawQuery for UI (matching already uses intent on profiles)
  if (/actively\s*looking|aktif\s*cari|siap\s*wawancara/i.test(text)) {
    applied.push('Prioritaskan kandidat actively looking');
    blueprint = { ...blueprint, rawQuery: `${blueprint.rawQuery} [intent:actively_looking]` };
  }

  if (applied.length === 0 && !isNewSearch) {
    // freeform append skills from parse
    const parsed = parseRoleBlueprint(text);
    for (const s of parsed.skills.slice(0, 3)) {
      blueprint = addSkillRequirement(blueprint, s, 'preferred');
      applied.push(`Tambah sinyal: ${s}`);
    }
  }

  return { blueprint, applied, isNewSearch };
}

function diversifySkillQuestions(matches: Array<TalentMatchResult | UnifiedMatch>, blueprint: RoleBlueprint): AnalystSuggestion[] {
  const suggestions: AnalystSuggestion[] = [];
  const have = new Set(blueprint.skills.map((s) => s.toLowerCase()));
  const candidates = [
    { id: 'perf', label: 'Prioritaskan Performance Marketing', applyAs: 'Performance Marketing' },
    { id: 'brand', label: 'Prioritaskan Brand Marketing', applyAs: 'Brand Marketing' },
    { id: 'trade', label: 'Prioritaskan Trade Marketing', applyAs: 'Trade Marketing' },
    { id: 'meta', label: 'Wajibkan Meta Ads', applyAs: 'wajib Meta Ads' },
    { id: 'fmcg', label: 'Filter FMCG', applyAs: 'yang pernah FMCG' },
    { id: 'relax-fmcg', label: 'FMCG jadi preferred', applyAs: 'FMCG jadi preferred' },
    { id: 'relax-salary', label: 'Longgarkan salary +15%', applyAs: 'longgarkan salary' },
  ];
  for (const c of candidates) {
    if (c.id === 'fmcg' && blueprint.industries.some((i) => /fmcg/i.test(i))) continue;
    if (c.id.startsWith('perf') && have.has('performance marketing')) continue;
    if (c.id === 'meta' && have.has('meta ads')) continue;
    suggestions.push(c);
    if (suggestions.length >= 4) break;
  }
  if (matches.length < 5) {
    suggestions.unshift({ id: 'relax', label: 'Longgarkan constraint ketat', applyAs: 'longgarkan syarat' });
  }
  return suggestions.slice(0, 4);
}

function composeReply(opts: {
  matchCount: number;
  strongCount: number;
  applied: string[];
  isNewSearch: boolean;
  blueprint: RoleBlueprint;
  market: ReturnType<typeof simulateTalentMarket>;
  topName?: string;
}): string {
  const { matchCount, strongCount, applied, isNewSearch, blueprint, market, topName } = opts;
  const parts: string[] = [];

  if (isNewSearch) {
    parts.push(
      `Ditemukan ${matchCount} kandidat relevan` +
      (strongCount ? ` (${strongCount} strong match, fit ≥70%).` : '.'),
    );
    if (blueprint.role) {
      parts.push(`Role terbaca: ${blueprint.role}${blueprint.location ? ` · ${blueprint.location}` : ''}${blueprint.salaryMax ? ` · max ${Math.round(blueprint.salaryMax / 1_000_000)} jt` : ''}.`);
    }
    if (!blueprint.skills.some((s) => /performance|brand|trade/i.test(s))) {
      parts.push('Apakah Anda ingin memprioritaskan Performance Marketing, Brand Marketing, atau Trade Marketing?');
    } else {
      parts.push('Anda bisa mempersempit dengan skill wajib, industri, atau me-relaksasi constraint.');
    }
  } else {
    if (applied.length) parts.push(`Diterapkan: ${applied.join('; ')}.`);
    parts.push(`Tersisa ${matchCount} kandidat relevan` + (strongCount ? `, ${strongCount} strong match.` : '.'));
    if (topName) parts.push(`Shortlist teratas: ${topName}.`);
    if (market.constraints?.[0] && market.constraints[0].impactPct >= 25) {
      parts.push(`Constraint terbesar saat ini: ${market.constraints[0].label}. Relaksasi bisa memperluas pool.`);
    } else if (strongCount > 0 && strongCount < 5) {
      parts.push('Jika requirement industri diubah dari wajib menjadi preferred, pool strong match biasanya naik.');
    }
  }

  return parts.join(' ');
}

export function runAnalystTurn(opts: {
  utterance: string;
  blueprint?: RoleBlueprint | null;
  messages?: AnalystMessage[];
  profiles: TalentProfile[];
  scope?: 'all' | 'external' | 'internal';
  limit?: number;
}): AnalystTurnResult {
  const { blueprint, applied, isNewSearch } = refineBlueprintFromUtterance(opts.utterance, opts.blueprint);
  const limit = opts.limit ?? 15;

  const ranked = (opts.scope === 'external'
    ? rankTalentMatches(opts.profiles, blueprint, limit)
    : rankUnifiedTalent(opts.profiles, blueprint, limit)) as Array<TalentMatchResult | UnifiedMatch>;

  const strongCount = ranked.filter((m) => m.roleFit >= 70).length;
  const market = simulateTalentMarket(opts.profiles.filter((p) => !String(p.id).startsWith('emp:')), blueprint);
  const relaxation = suggestSmartRelaxation(opts.profiles, blueprint);

  const reply = composeReply({
    matchCount: ranked.length,
    strongCount,
    applied,
    isNewSearch,
    blueprint,
    market,
    topName: ranked[0]?.fullName,
  });

  const suggestions = diversifySkillQuestions(ranked, blueprint);
  const messages: AnalystMessage[] = [
    ...(opts.messages || []),
    { role: 'user', text: opts.utterance, at: new Date().toISOString() },
    { role: 'analyst', text: reply, at: new Date().toISOString() },
  ];

  return {
    blueprint,
    reply,
    suggestions,
    matchCount: ranked.length,
    strongCount,
    topMatches: ranked.slice(0, limit),
    market,
    relaxation,
    applied,
    messages: messages.slice(-20),
  };
}

/** Expand query tokens with skill aliases for semantic-ish search. */
export function expandSemanticQuery(query: string): string[] {
  const tokens = query.toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 2);
  const out = new Set(tokens);
  const aliasMap: Record<string, string[]> = {
    meta: ['facebook', 'paid', 'social'],
    facebook: ['meta', 'fb'],
    google: ['adwords', 'sem', 'ppc'],
    fmcg: ['consumer'],
    analytics: ['ga4', 'data'],
  };
  for (const t of tokens) {
    for (const [k, vals] of Object.entries(aliasMap)) {
      if (t.includes(k) || k.includes(t)) vals.forEach((v) => out.add(v));
    }
  }
  return Array.from(out);
}

export type MemoryEvent = {
  id: string;
  profileId: string;
  profileName?: string;
  kind: string;
  title: string | null;
  detail: string | null;
  occurredAt: string;
};

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export async function listRecruitmentMemory(
  tenantId: string,
  opts?: { limit?: number; profileId?: string },
): Promise<MemoryEvent[]> {
  if (!sequelize || !tenantId) return [];
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 40));
  try {
    const [rows] = await sequelize.query(
      `SELECT i.id, i.profile_id, i.kind, i.title, i.detail, i.occurred_at, p.full_name
       FROM hris_talent_interactions i
       LEFT JOIN hris_talent_profiles p ON p.id = i.profile_id AND p.tenant_id = i.tenant_id
       WHERE i.tenant_id = :tenantId
         ${opts?.profileId ? 'AND i.profile_id = :profileId' : ''}
       ORDER BY i.occurred_at DESC
       LIMIT :limit`,
      { replacements: { tenantId, profileId: opts?.profileId, limit } },
    );
    return (rows || []).map((r: any) => ({
      id: String(r.id),
      profileId: String(r.profile_id),
      profileName: r.full_name ? String(r.full_name) : undefined,
      kind: String(r.kind),
      title: r.title ? String(r.title) : null,
      detail: r.detail ? String(r.detail) : null,
      occurredAt: new Date(r.occurred_at).toISOString(),
    }));
  } catch {
    return [];
  }
}
