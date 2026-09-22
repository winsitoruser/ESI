/**
 * Humanify Talent Intelligence — explainable matching (MVP)
 * Role Fit + Actionability + Data Confidence (no black-box single score).
 */
import type { TalentProfile, RequirementPriority } from './talent-bank';

export type RoleRequirement = {
  key: string;
  label: string;
  priority: RequirementPriority;
  kind: 'skill' | 'experience' | 'location' | 'salary' | 'industry' | 'other';
  value?: string | number;
};

export type RoleBlueprint = {
  role: string | null;
  location: string | null;
  salaryMax: number | null;
  salaryMin: number | null;
  experienceMin: number | null;
  industries: string[];
  skills: string[];
  seniority: string | null;
  workMode: string | null;
  rawQuery: string;
  requirements: RoleRequirement[];
  healthGaps: string[];
};

export type MatchEvidenceRow = {
  requirement: string;
  priority: RequirementPriority;
  status: 'match' | 'partial' | 'gap' | 'uncertain';
  candidateValue: string;
  evidence: string;
};

export type TalentMatchResult = {
  profileId: string;
  fullName: string;
  roleFit: number;
  actionability: number;
  dataConfidence: number;
  whyMatch: string[];
  potentialGaps: string[];
  uncertainties: string[];
  evidence: MatchEvidenceRow[];
  compensationFit: 'good' | 'stretch' | 'mismatch' | 'unknown';
  locationFit: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  commute?: {
    candidateArea: string | null;
    officeArea: string | null;
    estimatedKm: number | null;
    workMode: string | null;
    fit: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    note: string;
  };
  intent: string;
  freshnessScore: number;
};

const SKILL_ALIASES: Record<string, string[]> = {
  'meta ads': ['facebook ads', 'meta advertising', 'paid social', 'social advertising', 'fb ads'],
  'google ads': ['adwords', 'google advertising', 'sem', 'ppc google'],
  'digital marketing': ['performance marketing', 'online marketing', 'growth marketing'],
  seo: ['search engine optimization'],
  analytics: ['data analytics', 'google analytics', 'ga4'],
  fmcg: ['fast moving consumer goods', 'consumer goods'],
  leadership: ['team lead', 'people management', 'managed team'],
};

function norm(s: string): string {
  return String(s || '').toLowerCase().trim();
}

function skillMatches(required: string, candidateSkills: string[], haystack: string): boolean {
  const req = norm(required);
  const aliases = [req, ...(SKILL_ALIASES[req] || [])];
  const cand = candidateSkills.map(norm);
  const blob = `${cand.join(' ')} ${norm(haystack)}`;
  return aliases.some((a) => blob.includes(a) || cand.some((c) => c.includes(a) || a.includes(c)));
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

export function computeFreshnessScore(p: TalentProfile): number {
  const weights = [
    { days: daysSince(p.profileUpdatedAt), w: 30, halfLife: 60 },
    { days: daysSince(p.salaryVerifiedAt), w: 25, halfLife: 90 },
    { days: daysSince(p.locationVerifiedAt), w: 20, halfLife: 90 },
    { days: daysSince(p.availabilityVerifiedAt), w: 25, halfLife: 45 },
  ];
  let score = 0;
  let max = 0;
  for (const item of weights) {
    max += item.w;
    if (item.days == null) {
      score += item.w * 0.35;
      continue;
    }
    const ratio = Math.max(0, 1 - item.days / (item.halfLife * 2));
    score += item.w * ratio;
  }
  return Math.round((score / max) * 100);
}

/** Parse natural-language hiring request into a Role Blueprint. */
export function parseRoleBlueprint(query: string): RoleBlueprint {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const healthGaps: string[] = [];

  const roleMatch = raw.match(
    /(?:cari|butuh|rekrut|untuk|posisi)?\s*([A-Za-z][A-Za-z0-9 /&.-]{2,40}?(?:manager|specialist|engineer|analyst|executive|lead|head|director|staff|officer))/i,
  );
  let role = roleMatch?.[1]?.trim() || null;
  if (!role) {
    const simple = raw.match(/(marketing manager|digital marketing|software engineer|data analyst|hr manager|product manager)/i);
    role = simple?.[1] || null;
  }
  if (!role) healthGaps.push('Role / judul posisi belum jelas');

  const locHints = ['tangerang', 'jakarta', 'bsd', 'bandung', 'surabaya', 'bekasi', 'depok', 'yogya', 'medan', 'bali', 'remote'];
  let location: string | null = null;
  for (const loc of locHints) {
    if (lower.includes(loc)) {
      location = loc === 'remote' ? 'Remote' : loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }
  if (!location) healthGaps.push('Lokasi belum tersedia');

  let salaryMax: number | null = null;
  let salaryMin: number | null = null;
  const sal = lower.match(/(?:salary|gaji|budget|maksimal|max|sekitar)?[^\d]{0,12}(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(jt|juta|m)?/);
  if (sal) {
    let n = Number(String(sal[1]).replace(',', '.'));
    if (sal[2] || /jt|juta/.test(lower)) n *= 1_000_000;
    if (n < 1000) n *= 1_000_000;
    salaryMax = Math.round(n);
    salaryMin = Math.round(n * 0.85);
  } else {
    healthGaps.push('Budget salary belum tersedia');
  }

  let experienceMin: number | null = null;
  const exp = lower.match(/(\d+)\s*(?:\+)?\s*(?:tahun|thn|years?|yrs?)/);
  if (exp) experienceMin = Number(exp[1]);
  else healthGaps.push('Minimal pengalaman belum jelas');

  const skillLexicon = [
    'digital marketing', 'meta ads', 'google ads', 'tiktok ads', 'seo', 'analytics',
    'performance marketing', 'brand marketing', 'leadership', 'sql', 'python', 'react',
  ];
  const skills = skillLexicon.filter((s) => lower.includes(s));
  const industries: string[] = [];
  if (lower.includes('fmcg')) industries.push('FMCG');
  if (lower.includes('e-commerce') || lower.includes('ecommerce')) industries.push('E-Commerce');
  if (lower.includes('fintech')) industries.push('Fintech');

  let seniority: string | null = null;
  if (/manager|head|lead|director/i.test(raw)) seniority = 'Manager';
  else if (/senior/i.test(raw)) seniority = 'Senior';
  else if (/junior|entry/i.test(raw)) seniority = 'Junior';

  let workMode: string | null = null;
  if (/hybrid/i.test(raw)) workMode = 'hybrid';
  else if (/remote|wfh/i.test(raw)) workMode = 'remote';
  else if (/onsite|wfo|kantor/i.test(raw)) workMode = 'onsite';
  else healthGaps.push('Work mode belum tersedia');

  const requirements: RoleRequirement[] = [];
  if (skills[0]) {
    requirements.push({
      key: `skill:${skills[0]}`,
      label: skills[0],
      priority: 'must_have',
      kind: 'skill',
      value: skills[0],
    });
  }
  skills.slice(1).forEach((s, i) => {
    requirements.push({
      key: `skill:${s}`,
      label: s,
      priority: i === 0 ? 'strongly_preferred' : 'preferred',
      kind: 'skill',
      value: s,
    });
  });
  if (salaryMax != null) {
    requirements.push({
      key: 'salary_max',
      label: `Salary ≤ Rp${(salaryMax / 1_000_000).toFixed(1)} jt`,
      priority: 'must_have',
      kind: 'salary',
      value: salaryMax,
    });
  }
  if (location) {
    requirements.push({
      key: 'location',
      label: `Area ${location}`,
      priority: 'must_have',
      kind: 'location',
      value: location,
    });
  }
  if (experienceMin != null) {
    requirements.push({
      key: 'experience',
      label: `≥ ${experienceMin} tahun pengalaman`,
      priority: 'strongly_preferred',
      kind: 'experience',
      value: experienceMin,
    });
  }
  industries.forEach((ind) => {
    requirements.push({
      key: `industry:${ind}`,
      label: ind,
      priority: 'preferred',
      kind: 'industry',
      value: ind,
    });
  });

  return {
    role,
    location,
    salaryMax,
    salaryMin,
    experienceMin,
    industries,
    skills,
    seniority,
    workMode,
    rawQuery: raw,
    requirements,
    healthGaps,
  };
}

function priorityWeight(p: RequirementPriority): number {
  switch (p) {
    case 'must_have': return 4;
    case 'strongly_preferred': return 3;
    case 'preferred': return 2;
    case 'nice_to_have': return 1;
    case 'exclude': return 0;
    default: return 1;
  }
}

export function matchTalentToRole(profile: TalentProfile, blueprint: RoleBlueprint): TalentMatchResult {
  const evidence: MatchEvidenceRow[] = [];
  const whyMatch: string[] = [];
  const potentialGaps: string[] = [];
  const uncertainties: string[] = [];
  const haystack = [
    profile.resumeText,
    profile.headline,
    profile.currentTitle,
    profile.skills.join(' '),
    profile.industries.join(' '),
  ].filter(Boolean).join(' ');

  let fitScore = 0;
  let fitMax = 0;

  for (const req of blueprint.requirements) {
    if (req.priority === 'exclude') continue;
    const w = priorityWeight(req.priority);
    fitMax += 25 * w;
    let status: MatchEvidenceRow['status'] = 'uncertain';
    let candidateValue = '—';
    let ev = 'Tidak ditemukan bukti yang cukup';

    if (req.kind === 'skill' && typeof req.value === 'string') {
      const ok = skillMatches(req.value, profile.skills, haystack);
      if (ok) {
        status = 'match';
        candidateValue = req.value;
        ev = `Skill / pengalaman terkait "${req.value}" ditemukan di profil`;
        whyMatch.push(req.label);
        fitScore += 25 * w;
      } else {
        status = profile.resumeText ? 'gap' : 'uncertain';
        candidateValue = 'Belum terbukti';
        ev = profile.resumeText
          ? `Belum ada bukti kuat untuk ${req.label}`
          : `Tidak ditemukan bukti yang cukup mengenai ${req.label}`;
        if (status === 'gap') potentialGaps.push(req.label);
        else uncertainties.push(req.label);
        fitScore += status === 'uncertain' ? 8 * w : 0;
      }
    } else if (req.kind === 'experience') {
      const min = Number(req.value || 0);
      const yrs = profile.experienceYears;
      if (yrs == null) {
        status = 'uncertain';
        uncertainties.push('Pengalaman (tahun)');
        fitScore += 6 * w;
        ev = 'Pengalaman belum terverifikasi di profil';
      } else if (yrs >= min) {
        status = 'match';
        candidateValue = `${yrs} tahun`;
        ev = `Pengalaman ${yrs} tahun memenuhi minimal ${min}`;
        whyMatch.push(`${yrs} th pengalaman`);
        fitScore += 25 * w;
      } else if (yrs >= min - 1) {
        status = 'partial';
        candidateValue = `${yrs} tahun`;
        ev = `Pengalaman ${yrs} tahun mendekati minimal ${min}`;
        potentialGaps.push(`Pengalaman ${yrs}/${min} th`);
        fitScore += 15 * w;
      } else {
        status = 'gap';
        candidateValue = `${yrs} tahun`;
        potentialGaps.push(`Pengalaman ${yrs}/${min} th`);
        fitScore += 4 * w;
      }
    } else if (req.kind === 'location') {
      const want = norm(String(req.value || ''));
      const have = norm(`${profile.location || ''} ${profile.locationArea || ''}`);
      if (!have) {
        status = 'uncertain';
        uncertainties.push('Lokasi');
        fitScore += 8 * w;
      } else if (have.includes(want) || want.includes(have)) {
        status = 'match';
        candidateValue = profile.location || profile.locationArea || '';
        ev = `Domisili/area cocok dengan ${req.value}`;
        whyMatch.push(`Lokasi ${candidateValue}`);
        fitScore += 25 * w;
      } else {
        status = 'partial';
        candidateValue = profile.location || profile.locationArea || '';
        potentialGaps.push(`Lokasi ${candidateValue} vs ${req.value}`);
        fitScore += 10 * w;
      }
    } else if (req.kind === 'salary') {
      const max = Number(req.value || 0);
      const expMin = profile.salaryExpectedMin;
      const expMax = profile.salaryExpectedMax ?? expMin;
      if (expMin == null && expMax == null) {
        status = 'uncertain';
        uncertainties.push('Ekspektasi gaji');
        fitScore += 8 * w;
      } else if ((expMin ?? 0) <= max * 1.05) {
        status = 'match';
        candidateValue = formatSalaryRange(expMin, expMax);
        ev = `Ekspektasi dalam/dekat budget`;
        whyMatch.push('Salary fit');
        fitScore += 25 * w;
      } else if ((expMin ?? 0) <= max * 1.2) {
        status = 'partial';
        candidateValue = formatSalaryRange(expMin, expMax);
        potentialGaps.push('Salary sedikit di atas budget');
        fitScore += 12 * w;
      } else {
        status = 'gap';
        candidateValue = formatSalaryRange(expMin, expMax);
        potentialGaps.push('Salary di atas budget');
        fitScore += 2 * w;
      }
    } else if (req.kind === 'industry') {
      const want = norm(String(req.value || ''));
      const have = profile.industries.map(norm);
      if (have.some((i) => i.includes(want) || want.includes(i)) || norm(haystack).includes(want)) {
        status = 'match';
        candidateValue = String(req.value);
        whyMatch.push(String(req.value));
        fitScore += 25 * w;
        ev = `Industri ${req.value} tercatat`;
      } else {
        status = 'uncertain';
        uncertainties.push(String(req.label));
        fitScore += 6 * w;
      }
    }

    evidence.push({
      requirement: req.label,
      priority: req.priority,
      status,
      candidateValue,
      evidence: ev,
    });
  }

  const roleFit = fitMax > 0 ? Math.round((fitScore / fitMax) * 100) : 50;

  // Actionability — realistic to hire now
  let action = 50;
  if (profile.intent === 'actively_looking') action += 25;
  else if (profile.intent === 'open') action += 15;
  else if (profile.intent === 'not_looking') action -= 15;
  else if (profile.intent === 'do_not_contact') action = 5;

  if (profile.consentContact === false) action = Math.min(action, 10);
  if (profile.noticeDays != null) {
    if (profile.noticeDays <= 14) action += 10;
    else if (profile.noticeDays <= 30) action += 5;
    else action -= 5;
  }
  if (blueprint.salaryMax != null && profile.salaryExpectedMin != null) {
    if (profile.salaryExpectedMin <= blueprint.salaryMax) action += 10;
    else if (profile.salaryExpectedMin <= blueprint.salaryMax * 1.15) action += 0;
    else action -= 15;
  }
  if (blueprint.location && profile.location) {
    if (norm(profile.location).includes(norm(blueprint.location))) action += 8;
  }
  const actionability = Math.max(0, Math.min(100, Math.round(action)));

  const freshnessScore = computeFreshnessScore(profile);
  let dataConfidence = Math.round(freshnessScore * 0.55);
  if (profile.resumeText && profile.resumeText.length > 80) dataConfidence += 12;
  if (profile.skills.length >= 3) dataConfidence += 8;
  if (profile.salaryExpectedMin != null) dataConfidence += 8;
  if (profile.location) dataConfidence += 7;
  if (profile.experienceYears != null) dataConfidence += 5;
  dataConfidence = Math.max(0, Math.min(100, dataConfidence));

  let compensationFit: TalentMatchResult['compensationFit'] = 'unknown';
  if (blueprint.salaryMax != null && profile.salaryExpectedMin != null) {
    if (profile.salaryExpectedMin <= blueprint.salaryMax) compensationFit = 'good';
    else if (profile.salaryExpectedMin <= blueprint.salaryMax * 1.15) compensationFit = 'stretch';
    else compensationFit = 'mismatch';
  }

  let locationFit: TalentMatchResult['locationFit'] = 'unknown';
  const commute = estimateCommute(
    profile.location || profile.locationArea,
    blueprint.location,
    blueprint.workMode || profile.workPreference,
  );
  if (blueprint.location && (profile.location || profile.locationArea)) {
    locationFit = commute.fit;
    if (commute.fit === 'excellent' || commute.fit === 'good') {
      whyMatch.push(commute.note);
    } else if (commute.fit === 'poor') {
      potentialGaps.push('Commute / lokasi jauh');
    }
  }

  return {
    profileId: profile.id,
    fullName: profile.fullName,
    roleFit,
    actionability,
    dataConfidence,
    whyMatch: whyMatch.slice(0, 6),
    potentialGaps: potentialGaps.slice(0, 6),
    uncertainties: uncertainties.slice(0, 6),
    evidence,
    compensationFit,
    locationFit,
    commute,
    intent: profile.intent,
    freshnessScore,
  };
}

function formatSalaryRange(min: number | null | undefined, max: number | null | undefined): string {
  const f = (n: number) => `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} jt`;
  if (min != null && max != null && min !== max) return `${f(min)}–${f(max)}`;
  if (min != null) return f(min);
  if (max != null) return f(max);
  return '—';
}

/** Rough area distance matrix (km) for commute intelligence MVP — privacy-safe areas only. */
const AREA_KM: Record<string, Record<string, number>> = {
  jakarta: { jakarta: 5, tangerang: 25, bsd: 12, bekasi: 28, depok: 22, bandung: 150 },
  tangerang: { jakarta: 25, tangerang: 5, bsd: 12, bekasi: 45, depok: 35, bandung: 160 },
  bsd: { jakarta: 30, tangerang: 12, bsd: 5, bekasi: 50, depok: 40, bandung: 165 },
  bekasi: { jakarta: 28, tangerang: 45, bsd: 50, bekasi: 5, depok: 30, bandung: 140 },
  depok: { jakarta: 22, tangerang: 35, bsd: 40, bekasi: 30, depok: 5, bandung: 130 },
  bandung: { jakarta: 150, tangerang: 160, bsd: 165, bekasi: 140, depok: 130, bandung: 5 },
  surabaya: { surabaya: 5, jakarta: 780 },
  remote: { remote: 0 },
};

function areaKey(raw: string | null | undefined): string | null {
  const s = norm(raw || '');
  if (!s) return null;
  if (s.includes('remote') || s.includes('wfh')) return 'remote';
  for (const k of Object.keys(AREA_KM)) {
    if (s.includes(k)) return k;
  }
  return null;
}

export function estimateCommute(
  candidateLocation: string | null | undefined,
  officeLocation: string | null | undefined,
  workMode?: string | null,
): NonNullable<TalentMatchResult['commute']> {
  const cand = areaKey(candidateLocation);
  const office = areaKey(officeLocation);
  const mode = workMode || null;

  if (mode === 'remote' || office === 'remote') {
    return {
      candidateArea: candidateLocation || null,
      officeArea: officeLocation || 'Remote',
      estimatedKm: 0,
      workMode: 'remote',
      fit: 'excellent',
      note: 'Work mode remote — commute tidak relevan',
    };
  }
  if (!cand || !office) {
    return {
      candidateArea: candidateLocation || null,
      officeArea: officeLocation || null,
      estimatedKm: null,
      workMode: mode,
      fit: 'unknown',
      note: 'Area belum cukup untuk estimasi commute (privasi: hanya area, bukan alamat)',
    };
  }
  const km = AREA_KM[cand]?.[office] ?? AREA_KM[office]?.[cand] ?? null;
  let fit: NonNullable<TalentMatchResult['commute']>['fit'] = 'unknown';
  if (km == null) fit = 'unknown';
  else if (km <= 15) fit = 'excellent';
  else if (km <= 30) fit = 'good';
  else if (km <= 50) fit = 'fair';
  else fit = 'poor';

  if (mode === 'hybrid' && fit === 'fair') fit = 'good';

  return {
    candidateArea: candidateLocation || cand,
    officeArea: officeLocation || office,
    estimatedKm: km,
    workMode: mode,
    fit,
    note: km != null
      ? `Perkiraan jarak area ±${km} km · mode ${mode || 'belum diisi'}`
      : 'Jarak area belum terpetakan',
  };
}

export function setRequirementPriority(
  blueprint: RoleBlueprint,
  key: string,
  priority: RequirementPriority,
): RoleBlueprint {
  return {
    ...blueprint,
    requirements: blueprint.requirements.map((r) => (r.key === key ? { ...r, priority } : r)),
  };
}

export function rankTalentMatches(
  profiles: TalentProfile[],
  blueprint: RoleBlueprint,
  limit = 25,
): TalentMatchResult[] {
  return profiles
    .filter((p) => p.intent !== 'do_not_contact' && p.consentTalentPool)
    .map((p) => matchTalentToRole(p, blueprint))
    .sort((a, b) => {
      const score = (m: TalentMatchResult) => m.roleFit * 0.5 + m.actionability * 0.3 + m.dataConfidence * 0.2;
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export type MarketScenario = {
  label: string;
  available: number;
  deltaNote?: string;
};

/** Talent Market Simulator — constraint impact on pool size. */
export function simulateTalentMarket(
  profiles: TalentProfile[],
  blueprint: RoleBlueprint,
): { exact: number; scenarios: MarketScenario[]; constraints: { label: string; impactPct: number }[]; insight: string } {
  const base = rankTalentMatches(profiles, blueprint, 10_000);
  const exact = base.filter((m) => m.roleFit >= 70).length;

  const scenarios: MarketScenario[] = [
    { label: 'Current requirement', available: exact },
  ];

  if (blueprint.salaryMax != null) {
    const bumped = { ...blueprint, salaryMax: Math.round(blueprint.salaryMax * 1.1) };
    bumped.requirements = blueprint.requirements.map((r) =>
      r.kind === 'salary' ? { ...r, value: bumped.salaryMax!, label: `Salary ≤ Rp${((bumped.salaryMax || 0) / 1e6).toFixed(1)} jt` } : r,
    );
    const n = rankTalentMatches(profiles, bumped, 10_000).filter((m) => m.roleFit >= 70).length;
    scenarios.push({ label: `Salary +10%`, available: n, deltaNote: `+${Math.max(0, n - exact)}` });
  }
  if (blueprint.salaryMax != null) {
    const bumped = { ...blueprint, salaryMax: Math.round(blueprint.salaryMax * 1.2) };
    bumped.requirements = blueprint.requirements.map((r) =>
      r.kind === 'salary' ? { ...r, value: bumped.salaryMax!, label: `Salary ≤ Rp${((bumped.salaryMax || 0) / 1e6).toFixed(1)} jt` } : r,
    );
    const n = rankTalentMatches(profiles, bumped, 10_000).filter((m) => m.roleFit >= 70).length;
    scenarios.push({ label: `Salary +20%`, available: n });
  }
  if (blueprint.experienceMin != null && blueprint.experienceMin > 1) {
    const relaxed = {
      ...blueprint,
      experienceMin: blueprint.experienceMin - 1,
      requirements: blueprint.requirements.map((r) =>
        r.kind === 'experience'
          ? { ...r, value: blueprint.experienceMin! - 1, label: `≥ ${blueprint.experienceMin! - 1} tahun pengalaman` }
          : r,
      ),
    };
    const n = rankTalentMatches(profiles, relaxed, 10_000).filter((m) => m.roleFit >= 70).length;
    scenarios.push({ label: `Experience ${blueprint.experienceMin} → ${blueprint.experienceMin - 1} th`, available: n });
  }
  if (blueprint.industries.length) {
    const relaxed = {
      ...blueprint,
      industries: [],
      requirements: blueprint.requirements.map((r) =>
        r.kind === 'industry' ? { ...r, priority: 'preferred' as RequirementPriority } : r,
      ),
    };
    const n = rankTalentMatches(profiles, relaxed, 10_000).filter((m) => m.roleFit >= 70).length;
    scenarios.push({ label: 'Industry → preferred', available: n });
  }

  // Constraint impact: drop each must_have
  const constraints: { label: string; impactPct: number }[] = [];
  const musts = blueprint.requirements.filter((r) => r.priority === 'must_have');
  for (const m of musts) {
    const without = {
      ...blueprint,
      requirements: blueprint.requirements.filter((r) => r.key !== m.key),
    };
    const n = rankTalentMatches(profiles, without, 10_000).filter((x) => x.roleFit >= 70).length;
    const impactPct = exact === 0 ? (n > 0 ? 100 : 0) : Math.round(((n - exact) / Math.max(exact, 1)) * 100);
    constraints.push({ label: m.label, impactPct: Math.max(0, -Math.min(0, impactPct) || Math.round((1 - exact / Math.max(n, 1)) * 100)) });
  }
  constraints.sort((a, b) => b.impactPct - a.impactPct);

  let insight = 'Pool saat ini terbatas pada requirement yang ada.';
  if (constraints[0] && constraints[0].impactPct >= 30) {
    insight = `${constraints[0].label} adalah constraint terbesar. Relaksasi parameter ini memperluas talent pool secara signifikan.`;
  } else if (exact >= 10) {
    insight = 'Talent pool cukup untuk shortlist. Prioritaskan Role Fit + Actionability.';
  }

  return { exact, scenarios, constraints, insight };
}

export function suggestSmartRelaxation(
  profiles: TalentProfile[],
  blueprint: RoleBlueprint,
): { label: string; available: number }[] {
  const sim = simulateTalentMarket(profiles, blueprint);
  return sim.scenarios.filter((s) => s.label !== 'Current requirement').slice(0, 4).map((s) => ({
    label: s.label,
    available: s.available,
  }));
}
