/**
 * Humanify Talent Bank — Living Talent Profile (MVP Phase 1)
 * Privacy-by-design: consent flags stored on profile; no cross-tenant access.
 */
import { randomUUID } from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type TalentIntent =
  | 'actively_looking'
  | 'open'
  | 'not_looking'
  | 'do_not_contact';

export type RequirementPriority =
  | 'must_have'
  | 'strongly_preferred'
  | 'preferred'
  | 'nice_to_have'
  | 'exclude';

export type TalentProfile = {
  id: string;
  tenantId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  headline: string | null;
  location: string | null;
  locationArea: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  experienceYears: number | null;
  educationLevel: string | null;
  skills: string[];
  industries: string[];
  salaryCurrent: number | null;
  salaryExpectedMin: number | null;
  salaryExpectedMax: number | null;
  noticeDays: number | null;
  workPreference: string | null;
  intent: TalentIntent;
  source: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  tags: string[];
  consentTalentPool: boolean;
  consentContact: boolean;
  profileUpdatedAt: string | null;
  salaryVerifiedAt: string | null;
  locationVerifiedAt: string | null;
  availabilityVerifiedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type TalentEvidence = {
  id: string;
  profileId: string;
  claimKey: string;
  claimLabel: string;
  evidence: string;
  source: string;
  confidence: number;
  verified: boolean;
  observedAt: string | null;
};

export type TalentInteraction = {
  id: string;
  profileId: string;
  kind: string;
  title: string | null;
  detail: string | null;
  openingId: string | null;
  candidateId: string | null;
  occurredAt: string;
};

let schemaReady = false;

export async function ensureTalentBankSchema() {
  if (!sequelize || schemaReady) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_profiles (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(64),
      headline VARCHAR(255),
      location VARCHAR(255),
      location_area VARCHAR(255),
      current_title VARCHAR(255),
      current_company VARCHAR(255),
      experience_years NUMERIC(5,1),
      education_level VARCHAR(64),
      skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      industries JSONB NOT NULL DEFAULT '[]'::jsonb,
      salary_current INTEGER,
      salary_expected_min INTEGER,
      salary_expected_max INTEGER,
      notice_days INTEGER,
      work_preference VARCHAR(64),
      intent VARCHAR(32) NOT NULL DEFAULT 'open',
      source VARCHAR(64),
      resume_url TEXT,
      resume_text TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      consent_talent_pool BOOLEAN NOT NULL DEFAULT TRUE,
      consent_contact BOOLEAN NOT NULL DEFAULT TRUE,
      profile_updated_at TIMESTAMPTZ,
      salary_verified_at TIMESTAMPTZ,
      location_verified_at TIMESTAMPTZ,
      availability_verified_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_talent_profiles_tenant
      ON hris_talent_profiles (tenant_id)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_talent_profiles_email
      ON hris_talent_profiles (tenant_id, lower(email))
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_evidence (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      claim_key VARCHAR(128) NOT NULL,
      claim_label VARCHAR(255) NOT NULL,
      evidence TEXT NOT NULL,
      source VARCHAR(128) NOT NULL DEFAULT 'cv',
      confidence NUMERIC(5,2) NOT NULL DEFAULT 70,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      observed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_talent_evidence_profile
      ON hris_talent_evidence (tenant_id, profile_id)
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_interactions (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      kind VARCHAR(64) NOT NULL,
      title VARCHAR(255),
      detail TEXT,
      opening_id UUID,
      candidate_id UUID,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_talent_interactions_profile
      ON hris_talent_interactions (tenant_id, profile_id, occurred_at DESC)
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_self_update_tokens (
      token VARCHAR(64) PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_talent_self_update_profile
      ON hris_talent_self_update_tokens (tenant_id, profile_id)
  `);
  schemaReady = true;
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return asStringArray(parsed);
    } catch { /* */ }
    return raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function asObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* */ }
  }
  return {};
}

function rowToProfile(row: any): TalentProfile {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    fullName: String(row.full_name || ''),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    headline: row.headline ? String(row.headline) : null,
    location: row.location ? String(row.location) : null,
    locationArea: row.location_area ? String(row.location_area) : null,
    currentTitle: row.current_title ? String(row.current_title) : null,
    currentCompany: row.current_company ? String(row.current_company) : null,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    educationLevel: row.education_level ? String(row.education_level) : null,
    skills: asStringArray(row.skills),
    industries: asStringArray(row.industries),
    salaryCurrent: row.salary_current != null ? Number(row.salary_current) : null,
    salaryExpectedMin: row.salary_expected_min != null ? Number(row.salary_expected_min) : null,
    salaryExpectedMax: row.salary_expected_max != null ? Number(row.salary_expected_max) : null,
    noticeDays: row.notice_days != null ? Number(row.notice_days) : null,
    workPreference: row.work_preference ? String(row.work_preference) : null,
    intent: (String(row.intent || 'open') as TalentIntent),
    source: row.source ? String(row.source) : null,
    resumeUrl: row.resume_url ? String(row.resume_url) : null,
    resumeText: row.resume_text ? String(row.resume_text) : null,
    tags: asStringArray(row.tags),
    consentTalentPool: row.consent_talent_pool !== false,
    consentContact: row.consent_contact !== false,
    profileUpdatedAt: row.profile_updated_at ? new Date(row.profile_updated_at).toISOString() : null,
    salaryVerifiedAt: row.salary_verified_at ? new Date(row.salary_verified_at).toISOString() : null,
    locationVerifiedAt: row.location_verified_at ? new Date(row.location_verified_at).toISOString() : null,
    availabilityVerifiedAt: row.availability_verified_at ? new Date(row.availability_verified_at).toISOString() : null,
    metadata: asObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

/** Lightweight CV / free-text extraction for MVP (no external ML). */
export function parseTalentFromText(input: {
  text?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}): Partial<TalentProfile> & { evidence: Omit<TalentEvidence, 'id' | 'profileId'>[] } {
  const text = String(input.text || '');
  const lower = text.toLowerCase();
  const evidence: Omit<TalentEvidence, 'id' | 'profileId'>[] = [];

  const skillLexicon = [
    'digital marketing', 'meta ads', 'facebook ads', 'google ads', 'tiktok ads',
    'seo', 'sem', 'analytics', 'performance marketing', 'brand marketing',
    'content marketing', 'crm', 'salesforce', 'hubspot', 'excel', 'sql',
    'python', 'javascript', 'react', 'node', 'figma', 'ui/ux', 'product management',
    'project management', 'leadership', 'fmcg', 'e-commerce', 'fintech',
  ];
  const skills = skillLexicon.filter((s) => lower.includes(s));
  for (const s of skills) {
    evidence.push({
      claimKey: `skill:${s}`,
      claimLabel: s,
      evidence: `Disebutkan dalam CV/teks profil`,
      source: 'cv',
      confidence: 72,
      verified: false,
      observedAt: new Date().toISOString(),
    });
  }

  const industries: string[] = [];
  for (const ind of ['fmcg', 'e-commerce', 'fintech', 'banking', 'healthcare', 'education', 'retail']) {
    if (lower.includes(ind)) industries.push(ind.toUpperCase() === 'FMCG' ? 'FMCG' : ind.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  let experienceYears: number | null = null;
  const expMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:\+)?\s*(?:tahun|years?|yrs?)/i);
  if (expMatch) {
    experienceYears = Number(String(expMatch[1]).replace(',', '.'));
    evidence.push({
      claimKey: 'experience_years',
      claimLabel: 'Pengalaman',
      evidence: `${experienceYears} tahun (dari teks)`,
      source: 'cv',
      confidence: 68,
      verified: false,
      observedAt: new Date().toISOString(),
    });
  }

  let salaryExpectedMin: number | null = null;
  let salaryExpectedMax: number | null = null;
  const salaryMatch = text.match(/(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:[-–]\s*(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+))?\s*(?:jt|juta|million)?/i);
  if (salaryMatch && /gaji|salary|expected|ekspektasi|budget/i.test(text)) {
    const parseNum = (s: string) => {
      const cleaned = s.replace(/[.,]/g, '');
      const n = Number(cleaned);
      if (/jt|juta|million/i.test(text) && n < 1000) return n * 1_000_000;
      return n;
    };
    salaryExpectedMin = parseNum(salaryMatch[1]);
    salaryExpectedMax = salaryMatch[2] ? parseNum(salaryMatch[2]) : salaryExpectedMin;
  }

  const locationHints = ['jakarta', 'tangerang', 'bsd', 'bandung', 'surabaya', 'bekasi', 'depok', 'yogya', 'medan', 'bali'];
  let location: string | null = null;
  for (const loc of locationHints) {
    if (lower.includes(loc)) {
      location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  const emailFromText = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phoneFromText = text.match(/(?:\+62|0)8\d{8,12}/)?.[0] || null;

  return {
    fullName: input.fullName || text.split('\n').map((l) => l.trim()).find((l) => l.length > 2 && l.length < 80) || 'Kandidat baru',
    email: input.email || emailFromText,
    phone: input.phone || phoneFromText,
    skills,
    industries,
    experienceYears,
    salaryExpectedMin,
    salaryExpectedMax,
    location,
    locationArea: location,
    resumeText: text || null,
    profileUpdatedAt: new Date().toISOString(),
    evidence,
  };
}

export async function listTalentProfiles(
  tenantId: string,
  opts?: { q?: string; intent?: string; location?: string; limit?: number; offset?: number },
): Promise<{ items: TalentProfile[]; total: number }> {
  await ensureTalentBankSchema();
  if (!sequelize) return { items: [], total: 0 };
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const offset = Math.max(0, opts?.offset ?? 0);
  const where: string[] = ['tenant_id = :tenantId', 'consent_talent_pool = TRUE'];
  const replacements: Record<string, unknown> = { tenantId, limit, offset };

  if (opts?.q) {
    where.push(`(
      full_name ILIKE :q OR email ILIKE :q OR headline ILIKE :q OR current_title ILIKE :q
      OR location ILIKE :q OR resume_text ILIKE :q
      OR skills::text ILIKE :q OR tags::text ILIKE :q
    )`);
    replacements.q = `%${opts.q}%`;
  }
  if (opts?.intent) {
    where.push('intent = :intent');
    replacements.intent = opts.intent;
  }
  if (opts?.location) {
    where.push('(location ILIKE :loc OR location_area ILIKE :loc)');
    replacements.loc = `%${opts.location}%`;
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM hris_talent_profiles WHERE ${whereSql}`,
    { replacements },
  );
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_talent_profiles WHERE ${whereSql}
     ORDER BY COALESCE(profile_updated_at, updated_at) DESC NULLS LAST
     LIMIT :limit OFFSET :offset`,
    { replacements },
  );
  return {
    items: (rows || []).map(rowToProfile),
    total: Number(countRows?.[0]?.n || 0),
  };
}

export async function getTalentProfile(tenantId: string, id: string): Promise<TalentProfile | null> {
  await ensureTalentBankSchema();
  if (!sequelize) return null;
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_talent_profiles WHERE tenant_id = :tenantId AND id = :id LIMIT 1`,
    { replacements: { tenantId, id } },
  );
  return rows?.[0] ? rowToProfile(rows[0]) : null;
}

export async function upsertTalentProfile(
  tenantId: string,
  input: Partial<TalentProfile> & { fullName: string },
  opts?: { evidence?: Omit<TalentEvidence, 'id' | 'profileId'>[] },
): Promise<TalentProfile> {
  await ensureTalentBankSchema();
  if (!sequelize) throw new Error('Database unavailable');

  const id = input.id || randomUUID();
  const existing = input.id ? await getTalentProfile(tenantId, input.id) : null;
  const now = new Date().toISOString();

  if (!existing) {
    await sequelize.query(
      `INSERT INTO hris_talent_profiles (
        id, tenant_id, full_name, email, phone, headline, location, location_area,
        current_title, current_company, experience_years, education_level,
        skills, industries, salary_current, salary_expected_min, salary_expected_max,
        notice_days, work_preference, intent, source, resume_url, resume_text, tags,
        consent_talent_pool, consent_contact, profile_updated_at,
        salary_verified_at, location_verified_at, availability_verified_at, metadata
      ) VALUES (
        :id, :tenantId, :fullName, :email, :phone, :headline, :location, :locationArea,
        :currentTitle, :currentCompany, :experienceYears, :educationLevel,
        CAST(:skills AS jsonb), CAST(:industries AS jsonb), :salaryCurrent, :salaryExpectedMin, :salaryExpectedMax,
        :noticeDays, :workPreference, :intent, :source, :resumeUrl, :resumeText, CAST(:tags AS jsonb),
        :consentTalentPool, :consentContact, :profileUpdatedAt,
        :salaryVerifiedAt, :locationVerifiedAt, :availabilityVerifiedAt, CAST(:metadata AS jsonb)
      )`,
      {
        replacements: {
          id,
          tenantId,
          fullName: input.fullName,
          email: input.email || null,
          phone: input.phone || null,
          headline: input.headline || null,
          location: input.location || null,
          locationArea: input.locationArea || input.location || null,
          currentTitle: input.currentTitle || null,
          currentCompany: input.currentCompany || null,
          experienceYears: input.experienceYears ?? null,
          educationLevel: input.educationLevel || null,
          skills: JSON.stringify(input.skills || []),
          industries: JSON.stringify(input.industries || []),
          salaryCurrent: input.salaryCurrent ?? null,
          salaryExpectedMin: input.salaryExpectedMin ?? null,
          salaryExpectedMax: input.salaryExpectedMax ?? null,
          noticeDays: input.noticeDays ?? null,
          workPreference: input.workPreference || null,
          intent: input.intent || 'open',
          source: input.source || 'manual',
          resumeUrl: input.resumeUrl || null,
          resumeText: input.resumeText || null,
          tags: JSON.stringify(input.tags || []),
          consentTalentPool: input.consentTalentPool !== false,
          consentContact: input.consentContact !== false,
          profileUpdatedAt: input.profileUpdatedAt || now,
          salaryVerifiedAt: input.salaryVerifiedAt || null,
          locationVerifiedAt: input.locationVerifiedAt || null,
          availabilityVerifiedAt: input.availabilityVerifiedAt || null,
          metadata: JSON.stringify(input.metadata || {}),
        },
      },
    );
  } else {
    const merged = { ...existing, ...input, id: existing.id };
    await sequelize.query(
      `UPDATE hris_talent_profiles SET
        full_name = :fullName, email = :email, phone = :phone, headline = :headline,
        location = :location, location_area = :locationArea,
        current_title = :currentTitle, current_company = :currentCompany,
        experience_years = :experienceYears, education_level = :educationLevel,
        skills = CAST(:skills AS jsonb), industries = CAST(:industries AS jsonb),
        salary_current = :salaryCurrent, salary_expected_min = :salaryExpectedMin,
        salary_expected_max = :salaryExpectedMax, notice_days = :noticeDays,
        work_preference = :workPreference, intent = :intent, source = :source,
        resume_url = :resumeUrl, resume_text = :resumeText, tags = CAST(:tags AS jsonb),
        consent_talent_pool = :consentTalentPool, consent_contact = :consentContact,
        profile_updated_at = :profileUpdatedAt,
        salary_verified_at = :salaryVerifiedAt, location_verified_at = :locationVerifiedAt,
        availability_verified_at = :availabilityVerifiedAt,
        metadata = CAST(:metadata AS jsonb), updated_at = NOW()
      WHERE tenant_id = :tenantId AND id = :id`,
      {
        replacements: {
          id: merged.id,
          tenantId,
          fullName: merged.fullName,
          email: merged.email,
          phone: merged.phone,
          headline: merged.headline,
          location: merged.location,
          locationArea: merged.locationArea,
          currentTitle: merged.currentTitle,
          currentCompany: merged.currentCompany,
          experienceYears: merged.experienceYears,
          educationLevel: merged.educationLevel,
          skills: JSON.stringify(merged.skills || []),
          industries: JSON.stringify(merged.industries || []),
          salaryCurrent: merged.salaryCurrent,
          salaryExpectedMin: merged.salaryExpectedMin,
          salaryExpectedMax: merged.salaryExpectedMax,
          noticeDays: merged.noticeDays,
          workPreference: merged.workPreference,
          intent: merged.intent || 'open',
          source: merged.source,
          resumeUrl: merged.resumeUrl,
          resumeText: merged.resumeText,
          tags: JSON.stringify(merged.tags || []),
          consentTalentPool: merged.consentTalentPool !== false,
          consentContact: merged.consentContact !== false,
          profileUpdatedAt: now,
          salaryVerifiedAt: merged.salaryVerifiedAt,
          locationVerifiedAt: merged.locationVerifiedAt,
          availabilityVerifiedAt: merged.availabilityVerifiedAt,
          metadata: JSON.stringify(merged.metadata || {}),
        },
      },
    );
  }

  if (opts?.evidence?.length) {
    for (const ev of opts.evidence) {
      await sequelize.query(
        `INSERT INTO hris_talent_evidence (
          id, tenant_id, profile_id, claim_key, claim_label, evidence, source, confidence, verified, observed_at
        ) VALUES (
          :id, :tenantId, :profileId, :claimKey, :claimLabel, :evidence, :source, :confidence, :verified, :observedAt
        )`,
        {
          replacements: {
            id: randomUUID(),
            tenantId,
            profileId: id,
            claimKey: ev.claimKey,
            claimLabel: ev.claimLabel,
            evidence: ev.evidence,
            source: ev.source || 'cv',
            confidence: ev.confidence ?? 70,
            verified: Boolean(ev.verified),
            observedAt: ev.observedAt || now,
          },
        },
      );
    }
  }

  const saved = await getTalentProfile(tenantId, id);
  if (!saved) throw new Error('Failed to save talent profile');
  return saved;
}

export async function deleteTalentProfile(tenantId: string, id: string): Promise<boolean> {
  await ensureTalentBankSchema();
  if (!sequelize) return false;
  const [, meta] = await sequelize.query(
    `DELETE FROM hris_talent_profiles WHERE tenant_id = :tenantId AND id = :id`,
    { replacements: { tenantId, id } },
  );
  return Number((meta as any)?.rowCount || 0) > 0;
}

export async function listTalentEvidence(tenantId: string, profileId: string): Promise<TalentEvidence[]> {
  await ensureTalentBankSchema();
  if (!sequelize) return [];
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_talent_evidence WHERE tenant_id = :tenantId AND profile_id = :profileId
     ORDER BY confidence DESC, created_at DESC`,
    { replacements: { tenantId, profileId } },
  );
  return (rows || []).map((r: any) => ({
    id: String(r.id),
    profileId: String(r.profile_id),
    claimKey: String(r.claim_key),
    claimLabel: String(r.claim_label),
    evidence: String(r.evidence),
    source: String(r.source),
    confidence: Number(r.confidence),
    verified: Boolean(r.verified),
    observedAt: r.observed_at ? new Date(r.observed_at).toISOString() : null,
  }));
}

export async function addTalentInteraction(
  tenantId: string,
  input: {
    profileId: string;
    kind: string;
    title?: string;
    detail?: string;
    openingId?: string;
    candidateId?: string;
    occurredAt?: string;
  },
): Promise<TalentInteraction> {
  await ensureTalentBankSchema();
  if (!sequelize) throw new Error('Database unavailable');
  const id = randomUUID();
  const occurredAt = input.occurredAt || new Date().toISOString();
  await sequelize.query(
    `INSERT INTO hris_talent_interactions (
      id, tenant_id, profile_id, kind, title, detail, opening_id, candidate_id, occurred_at
    ) VALUES (
      :id, :tenantId, :profileId, :kind, :title, :detail, :openingId, :candidateId, :occurredAt
    )`,
    {
      replacements: {
        id,
        tenantId,
        profileId: input.profileId,
        kind: input.kind,
        title: input.title || null,
        detail: input.detail || null,
        openingId: input.openingId || null,
        candidateId: input.candidateId || null,
        occurredAt,
      },
    },
  );
  return {
    id,
    profileId: input.profileId,
    kind: input.kind,
    title: input.title || null,
    detail: input.detail || null,
    openingId: input.openingId || null,
    candidateId: input.candidateId || null,
    occurredAt,
  };
}

export async function listTalentInteractions(tenantId: string, profileId: string): Promise<TalentInteraction[]> {
  await ensureTalentBankSchema();
  if (!sequelize) return [];
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_talent_interactions WHERE tenant_id = :tenantId AND profile_id = :profileId
     ORDER BY occurred_at DESC LIMIT 50`,
    { replacements: { tenantId, profileId } },
  );
  return (rows || []).map((r: any) => ({
    id: String(r.id),
    profileId: String(r.profile_id),
    kind: String(r.kind),
    title: r.title ? String(r.title) : null,
    detail: r.detail ? String(r.detail) : null,
    openingId: r.opening_id ? String(r.opening_id) : null,
    candidateId: r.candidate_id ? String(r.candidate_id) : null,
    occurredAt: new Date(r.occurred_at).toISOString(),
  }));
}

export async function getTalentBankStats(tenantId: string) {
  await ensureTalentBankSchema();
  if (!sequelize) {
    return { total: 0, activelyLooking: 0, open: 0, recentlyUpdated: 0, withConsent: 0 };
  }
  const [rows] = await sequelize.query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE intent = 'actively_looking')::int AS actively_looking,
      COUNT(*) FILTER (WHERE intent = 'open')::int AS open_intent,
      COUNT(*) FILTER (WHERE profile_updated_at >= NOW() - INTERVAL '30 days')::int AS recently_updated,
      COUNT(*) FILTER (WHERE consent_talent_pool = TRUE)::int AS with_consent
     FROM hris_talent_profiles WHERE tenant_id = :tenantId`,
    { replacements: { tenantId } },
  );
  const r = rows?.[0] || {};
  return {
    total: Number(r.total || 0),
    activelyLooking: Number(r.actively_looking || 0),
    open: Number(r.open_intent || 0),
    recentlyUpdated: Number(r.recently_updated || 0),
    withConsent: Number(r.with_consent || 0),
  };
}

/** Import past applicants (hris_candidates) into talent bank — rediscovery foundation. */
export async function syncCandidatesIntoTalentBank(tenantId: string): Promise<{ imported: number; skipped: number }> {
  await ensureTalentBankSchema();
  if (!sequelize) return { imported: 0, skipped: 0 };
  let imported = 0;
  let skipped = 0;
  try {
    const [rows] = await sequelize.query(
      `SELECT id, full_name, email, phone, experience_summary, education_level, resume_url, source, notes, metadata, current_stage, status
       FROM hris_candidates WHERE tenant_id = :tenantId ORDER BY updated_at DESC NULLS LAST LIMIT 500`,
      { replacements: { tenantId } },
    );
    for (const row of rows || []) {
      const email = row.email ? String(row.email).toLowerCase() : null;
      if (email) {
        const [existing] = await sequelize.query(
          `SELECT id FROM hris_talent_profiles WHERE tenant_id = :tenantId AND lower(email) = :email LIMIT 1`,
          { replacements: { tenantId, email } },
        );
        if (existing?.[0]) {
          skipped += 1;
          continue;
        }
      }
      const text = [row.experience_summary, row.notes, row.education_level].filter(Boolean).join('\n');
      const parsed = parseTalentFromText({
        text,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
      });
      const profile = await upsertTalentProfile(
        tenantId,
        {
          fullName: String(row.full_name || parsed.fullName || 'Kandidat'),
          email: row.email || parsed.email || null,
          phone: row.phone || parsed.phone || null,
          skills: parsed.skills || [],
          industries: parsed.industries || [],
          experienceYears: parsed.experienceYears ?? null,
          educationLevel: row.education_level || null,
          resumeUrl: row.resume_url || null,
          resumeText: text || null,
          source: row.source || 'applicant_sync',
          tags: ['from_ats', String(row.current_stage || ''), String(row.status || '')].filter(Boolean),
          intent: 'open',
          metadata: { syncedCandidateId: row.id, ...(asObject(row.metadata)) },
        },
        { evidence: parsed.evidence },
      );
      await addTalentInteraction(tenantId, {
        profileId: profile.id,
        kind: 'synced_from_ats',
        title: 'Diimpor dari ATS',
        detail: `Stage: ${row.current_stage || '-'} · Status: ${row.status || '-'}`,
        candidateId: String(row.id),
      });
      imported += 1;
    }
  } catch {
    /* table may not exist in some envs */
  }
  return { imported, skipped };
}

/** Issue a one-time self-update link for candidate intent / salary / availability. */
export async function createSelfUpdateToken(
  tenantId: string,
  profileId: string,
  ttlHours = 72,
): Promise<{ token: string; expiresAt: string; urlPath: string }> {
  await ensureTalentBankSchema();
  if (!sequelize) throw new Error('Database unavailable');
  const profile = await getTalentProfile(tenantId, profileId);
  if (!profile) throw new Error('Profile not found');
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16);
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  await sequelize.query(
    `INSERT INTO hris_talent_self_update_tokens (token, tenant_id, profile_id, expires_at)
     VALUES (:token, :tenantId, :profileId, :expiresAt)`,
    { replacements: { token, tenantId, profileId, expiresAt } },
  );
  return { token, expiresAt, urlPath: `/talent/update/${token}` };
}

export async function resolveSelfUpdateToken(token: string): Promise<{
  tenantId: string;
  profile: TalentProfile;
  expiresAt: string;
} | null> {
  await ensureTalentBankSchema();
  if (!sequelize || !token) return null;
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_talent_self_update_tokens
     WHERE token = :token AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    { replacements: { token } },
  );
  const row = rows?.[0];
  if (!row) return null;
  const profile = await getTalentProfile(String(row.tenant_id), String(row.profile_id));
  if (!profile) return null;
  return {
    tenantId: String(row.tenant_id),
    profile,
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function applySelfUpdate(
  token: string,
  patch: {
    currentTitle?: string;
    currentCompany?: string;
    location?: string;
    salaryExpectedMin?: number | null;
    salaryExpectedMax?: number | null;
    noticeDays?: number | null;
    workPreference?: string | null;
    intent?: TalentIntent;
    consentTalentPool?: boolean;
    consentContact?: boolean;
  },
): Promise<TalentProfile> {
  const resolved = await resolveSelfUpdateToken(token);
  if (!resolved) throw new Error('Token tidak valid atau kedaluwarsa');
  const { tenantId, profile } = resolved;
  const now = new Date().toISOString();
  const updated = await upsertTalentProfile(tenantId, {
    id: profile.id,
    fullName: profile.fullName,
    currentTitle: patch.currentTitle ?? profile.currentTitle,
    currentCompany: patch.currentCompany ?? profile.currentCompany,
    location: patch.location ?? profile.location,
    locationArea: patch.location ?? profile.locationArea,
    salaryExpectedMin: patch.salaryExpectedMin !== undefined ? patch.salaryExpectedMin : profile.salaryExpectedMin,
    salaryExpectedMax: patch.salaryExpectedMax !== undefined ? patch.salaryExpectedMax : profile.salaryExpectedMax,
    noticeDays: patch.noticeDays !== undefined ? patch.noticeDays : profile.noticeDays,
    workPreference: patch.workPreference ?? profile.workPreference,
    intent: patch.intent ?? profile.intent,
    consentTalentPool: patch.consentTalentPool ?? profile.consentTalentPool,
    consentContact: patch.consentContact ?? profile.consentContact,
    salaryVerifiedAt: patch.salaryExpectedMin != null || patch.salaryExpectedMax != null ? now : profile.salaryVerifiedAt,
    locationVerifiedAt: patch.location ? now : profile.locationVerifiedAt,
    availabilityVerifiedAt: patch.intent || patch.noticeDays != null ? now : profile.availabilityVerifiedAt,
    profileUpdatedAt: now,
  });
  await sequelize.query(
    `UPDATE hris_talent_self_update_tokens SET used_at = NOW() WHERE token = :token`,
    { replacements: { token } },
  );
  await addTalentInteraction(tenantId, {
    profileId: profile.id,
    kind: 'self_update',
    title: 'Kandidat memperbarui profil',
    detail: `Intent: ${updated.intent} · Lokasi: ${updated.location || '-'} · Gaji: ${updated.salaryExpectedMin || '-'}`,
  });
  return updated;
}
