/**
 * Humanify SaaS Phase 8 — partner / referral codes (lean reseller)
 */
import crypto from 'crypto';
import { getTenantColumns, parseTenantSettings } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensurePartnersTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_partners (
      id UUID PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      contact_email VARCHAR(255),
      commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_partners_code ON saas_partners (code)
  `);
  ready = true;
}

export function normalizePartnerCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

export async function resolvePartnerByCode(codeRaw: string): Promise<{
  id: string;
  code: string;
  name: string;
  commission_pct?: number;
} | null> {
  if (!sequelize) return null;
  const code = normalizePartnerCode(codeRaw);
  if (!code) return null;
  await ensurePartnersTable();
  const [rows] = await sequelize.query(`
    SELECT id, code, name, commission_pct FROM saas_partners
    WHERE code = :code AND status = 'active'
    LIMIT 1
  `, { replacements: { code } });
  return rows?.[0] || null;
}

/** Pure calc — preview only; no payout / Midtrans. */
export function estimatePartnerCommission(amountIdr: number, commissionPct: number): {
  amountIdr: number;
  commissionPct: number;
  commissionIdr: number;
} {
  const pct = Math.max(0, Math.min(100, Number(commissionPct) || 0));
  const amount = Math.max(0, Math.round(Number(amountIdr) || 0));
  return {
    amountIdr: amount,
    commissionPct: pct,
    commissionIdr: Math.round((amount * pct) / 100),
  };
}

export async function previewPartnerCommission(opts: {
  partnerCode: string;
  amountIdr: number;
}): Promise<{
  partner: { id: string; code: string; name: string; commissionPct: number } | null;
  estimate: ReturnType<typeof estimatePartnerCommission> | null;
  error?: string;
}> {
  const partner = await resolvePartnerByCode(opts.partnerCode);
  if (!partner) {
    return { partner: null, estimate: null, error: 'Partner tidak ditemukan' };
  }
  const pct = Number(partner.commission_pct ?? 10);
  const estimate = estimatePartnerCommission(opts.amountIdr, pct);
  return {
    partner: {
      id: partner.id,
      code: partner.code,
      name: partner.name,
      commissionPct: pct,
    },
    estimate,
  };
}

export async function listPartners() {
  if (!sequelize) return [];
  await ensurePartnersTable();
  const [rows] = await sequelize.query(`
    SELECT p.*,
      (
        SELECT COUNT(*)::int FROM tenants t
        WHERE t.settings->>'partner_code' = p.code
           OR t.settings->'partner'->>'code' = p.code
      ) AS tenant_count
    FROM saas_partners p
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
  return rows || [];
}

export async function createPartner(opts: {
  code: string;
  name: string;
  contactEmail?: string;
  commissionPct?: number;
  notes?: string;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensurePartnersTable();
  const code = normalizePartnerCode(opts.code);
  if (!code || code.length < 3) throw new Error('Kode partner minimal 3 karakter');
  const name = String(opts.name || '').trim();
  if (!name) throw new Error('Nama partner wajib');
  const id = crypto.randomUUID();
  await sequelize.query(`
    INSERT INTO saas_partners (id, code, name, contact_email, commission_pct, notes)
    VALUES (:id, :code, :name, :email, :pct, :notes)
  `, {
    replacements: {
      id,
      code,
      name,
      email: opts.contactEmail || null,
      pct: opts.commissionPct ?? 10,
      notes: opts.notes || null,
    },
  });
  return { id, code, name };
}

/** Stable sales walkthrough partner — upsert code DEMO (10%). */
export async function ensureDemoPartner(opts?: {
  attachSlug?: string | null;
}): Promise<{
  code: string;
  id: string;
  created: boolean;
  attachedSlug: string | null;
}> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensurePartnersTable();
  const code = 'DEMO';
  const name = 'Humanify Demo Partner';
  const email = 'partners@humanify.id';
  const pct = 10;
  const notes = 'Wave-21 sales walkthrough — signup ?ref=DEMO / ?partner=DEMO';

  const [existing] = await sequelize.query(
    `SELECT id FROM saas_partners WHERE code = :code LIMIT 1`,
    { replacements: { code } },
  );
  let id = existing?.[0]?.id as string | undefined;
  let created = false;
  if (id) {
    await sequelize.query(
      `UPDATE saas_partners
       SET name = :name, contact_email = :email, commission_pct = :pct,
           status = 'active', notes = :notes, updated_at = NOW()
       WHERE code = :code`,
      { replacements: { code, name, email, pct, notes } },
    );
  } else {
    id = crypto.randomUUID();
    await sequelize.query(
      `INSERT INTO saas_partners (id, code, name, contact_email, commission_pct, status, notes)
       VALUES (:id, :code, :name, :email, :pct, 'active', :notes)`,
      { replacements: { id, code, name, email, pct, notes } },
    );
    created = true;
  }

  const attachSlug = opts?.attachSlug === undefined ? 'demo' : opts.attachSlug;
  let attachedSlug: string | null = null;
  if (attachSlug) {
    const [tenants] = await sequelize.query(
      `SELECT id FROM tenants WHERE slug = :slug LIMIT 1`,
      { replacements: { slug: attachSlug } },
    );
    const tid = tenants?.[0]?.id as string | undefined;
    if (tid) {
      const att = await attachPartnerToTenant(tid, code);
      if (att.attached) attachedSlug = attachSlug;
    }
  }

  return { code, id: id!, created, attachedSlug };
}

/** Attach partner attribution into tenant settings after provision. */
export async function attachPartnerToTenant(
  tenantId: string,
  partnerCode: string,
): Promise<{ attached: boolean; code?: string }> {
  if (!sequelize) return { attached: false };
  const partner = await resolvePartnerByCode(partnerCode);
  if (!partner) return { attached: false };

  const cols = await getTenantColumns();
  if (!cols.has('settings')) return { attached: false };

  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  const settings = parseTenantSettings(rows?.[0]?.settings);
  settings.partner_code = partner.code;
  settings.partner = {
    id: partner.id,
    code: partner.code,
    name: partner.name,
    attachedAt: new Date().toISOString(),
  };
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return { attached: true, code: partner.code };
}

/**
 * Anchored (^) regex matching QA / smoke / hardening test tenant slugs.
 * Deliberately excludes real tenants like `pt-naincode`, `naincode-hq`
 * (only slugs *starting with* `naincode-test` match).
 */
export const QA_TENANT_SLUG_REGEX =
  '^(empty-qa-|qa-|smoke-|ent-|bill-|seat-|golive-|p5b-|ent5-|harden-|invite-|sso-|offb-|smtp-test-|phase|p\\d+-|naincode-test|search-co|plan-co|digest-co|reset-co|lock-|mfa-co|import-co|notif-co|alert-co|redir)';

/**
 * Soft-suspend QA & smoke tenants matching known prefixes / test emails.
 * Default dryRun=true; pass dryRun:false to apply.
 */
export async function cleanupQaTenants(opts?: {
  dryRun?: boolean;
  olderThanHours?: number;
}): Promise<{ matched: number; suspended: number; slugs: string[] }> {
  if (!sequelize) return { matched: 0, suspended: 0, slugs: [] };
  const hours = Math.max(1, opts?.olderThanHours ?? 24);
  const dryRun = opts?.dryRun !== false;
  const cols = await getTenantColumns();

  const emailExpr = cols.has('contact_email')
    ? `COALESCE(contact_email, '')`
    : cols.has('business_email')
      ? `COALESCE(business_email, '')`
      : `''`;

  const [rows] = await sequelize.query(`
    SELECT id, slug, status
    FROM tenants
    WHERE (
      COALESCE(slug, '') ~* :qaRegex
      OR ${emailExpr} ILIKE '%@humanify.test'
    )
    AND COALESCE(status::text, '') <> 'suspended'
    AND created_at < NOW() - (:hours)::int * INTERVAL '1 hour'
    ORDER BY created_at ASC
    LIMIT 500
  `, { replacements: { hours, qaRegex: QA_TENANT_SLUG_REGEX } });

  const list = rows || [];
  const slugs = list.map((r: any) => r.slug).filter(Boolean);
  if (dryRun || !list.length) {
    return { matched: list.length, suspended: 0, slugs };
  }

  for (const row of list) {
    await sequelize.query(
      `UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: row.id } },
    );
  }

  return { matched: list.length, suspended: list.length, slugs };
}

/**
 * Archive QA/smoke tenants that are already `suspended` (cleanup step two).
 * Matches the same slug/email rules as {@link cleanupQaTenants}.
 * Default dryRun=true; pass dryRun:false to apply.
 */
async function ensureArchivedTenantStatus(): Promise<void> {
  if (!sequelize) return;
  try {
    await sequelize.query(`ALTER TYPE enum_tenants_status ADD VALUE IF NOT EXISTS 'archived'`);
  } catch {
    // Non-Postgres or type already present / concurrent add — ignore.
  }
}

export async function archiveSuspendedQaTenants(opts?: {
  dryRun?: boolean;
  olderThanHours?: number;
}): Promise<{ matched: number; archived: number; slugs: string[] }> {
  if (!sequelize) return { matched: 0, archived: 0, slugs: [] };
  const hours = Math.max(1, opts?.olderThanHours ?? 24);
  const dryRun = opts?.dryRun !== false;
  await ensureArchivedTenantStatus();
  const cols = await getTenantColumns();

  const emailExpr = cols.has('contact_email')
    ? `COALESCE(contact_email, '')`
    : cols.has('business_email')
      ? `COALESCE(business_email, '')`
      : `''`;
  const timeCol = cols.has('updated_at') ? 'updated_at' : 'created_at';

  const [rows] = await sequelize.query(`
    SELECT id, slug, status
    FROM tenants
    WHERE status::text = 'suspended'
    AND (
      COALESCE(slug, '') ~* :qaRegex
      OR ${emailExpr} ILIKE '%@humanify.test'
    )
    AND ${timeCol} < NOW() - (:hours)::int * INTERVAL '1 hour'
    ORDER BY ${timeCol} ASC
    LIMIT 500
  `, { replacements: { hours, qaRegex: QA_TENANT_SLUG_REGEX } });

  const list = rows || [];
  const slugs = list.map((r: any) => r.slug).filter(Boolean);
  if (dryRun || !list.length) {
    return { matched: list.length, archived: 0, slugs };
  }

  for (const row of list) {
    await sequelize.query(
      `UPDATE tenants SET status = 'archived', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: row.id } },
    );
  }

  return { matched: list.length, archived: list.length, slugs };
}
