/**
 * Partner channel lead capture (BD-3).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export const PARTNER_TYPES = [
  { value: 'payroll_consultant', label: 'Konsultan gaji / PPh 21' },
  { value: 'bpjs', label: 'Konsultan BPJS' },
  { value: 'accountant', label: 'Kantor akuntan' },
  { value: 'attendance_vendor', label: 'Vendor mesin absensi' },
  { value: 'other', label: 'Lainnya' },
] as const;

export async function ensurePartnerLeadsTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS humanify_partner_leads (
        id UUID PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        phone VARCHAR(60),
        partner_type VARCHAR(60) NOT NULL DEFAULT 'other',
        region VARCHAR(120),
        message TEXT,
        source VARCHAR(80) DEFAULT 'web',
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      ALTER TABLE humanify_partner_leads
      ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'new'
    `);
    await seq.query(`
      ALTER TABLE humanify_partner_leads
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_leads_created
      ON humanify_partner_leads (created_at DESC)
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_leads_status
      ON humanify_partner_leads (status, created_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[partner-leads] ensure:', e?.message || e);
    return false;
  }
}

export function sanitizePartnerLead(body: Record<string, unknown>): {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  partnerType: string;
  region: string;
  message: string;
} {
  const email = String(body.email || '').trim().toLowerCase();
  const companyName = String(body.companyName || body.company_name || '').trim().slice(0, 200);
  const contactName = String(body.contactName || body.contact_name || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 60);
  const partnerType = String(body.partnerType || body.partner_type || 'other').trim().slice(0, 60);
  const region = String(body.region || '').trim().slice(0, 120);
  const message = String(body.message || '').trim().slice(0, 2000);
  return { companyName, contactName, email, phone, partnerType, region, message };
}

export async function createPartnerLead(opts: {
  body: Record<string, unknown>;
  source?: string;
  meta?: Record<string, unknown>;
  db?: any;
}): Promise<{ id: string }> {
  const seq = opts.db || sequelize;
  const data = sanitizePartnerLead(opts.body);
  if (!data.companyName || !data.contactName) {
    throw new Error('Nama perusahaan dan kontak wajib');
  }
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Email valid wajib');
  }

  const id = crypto.randomUUID();
  if (!seq) {
    // Soft accept without DB (dev)
    return { id };
  }

  await ensurePartnerLeadsTable(seq);
  await seq.query(
    `INSERT INTO humanify_partner_leads
      (id, company_name, contact_name, email, phone, partner_type, region, message, source, meta)
     VALUES
      (:id, :company, :contact, :email, :phone, :ptype, :region, :message, :source, CAST(:meta AS jsonb))`,
    {
      replacements: {
        id,
        company: data.companyName,
        contact: data.contactName,
        email: data.email,
        phone: data.phone || null,
        ptype: data.partnerType || 'other',
        region: data.region || null,
        message: data.message || null,
        source: opts.source || 'web',
        meta: JSON.stringify(opts.meta || {}),
      },
    },
  );
  return { id };
}

export const PARTNER_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed'] as const;
export type PartnerLeadStatus = (typeof PARTNER_LEAD_STATUSES)[number];

export function normalizePartnerLeadStatus(raw: unknown): PartnerLeadStatus {
  const s = String(raw || 'new').trim().toLowerCase();
  return (PARTNER_LEAD_STATUSES as readonly string[]).includes(s)
    ? (s as PartnerLeadStatus)
    : 'new';
}

export async function listPartnerLeads(opts?: {
  limit?: number;
  status?: string;
  db?: any;
}): Promise<Array<Record<string, unknown>>> {
  const seq = opts?.db || sequelize;
  if (!seq) return [];
  await ensurePartnerLeadsTable(seq);
  const limit = Math.min(100, Math.max(1, Number(opts?.limit) || 50));
  const statusFilter = opts?.status && opts.status !== 'all'
    ? normalizePartnerLeadStatus(opts.status)
    : null;
  const [rows] = await seq.query(
    `SELECT id, company_name, contact_name, email, phone, partner_type, region,
            LEFT(COALESCE(message,''), 200) AS message_preview, source, status, created_at, updated_at
     FROM humanify_partner_leads
     WHERE (:status::text IS NULL OR status = :status)
     ORDER BY created_at DESC
     LIMIT :limit`,
    { replacements: { limit, status: statusFilter } },
  );
  return (rows || []) as Array<Record<string, unknown>>;
}

export async function updatePartnerLeadStatus(opts: {
  id: string;
  status: string;
  db?: any;
}): Promise<{ ok: boolean; status?: PartnerLeadStatus }> {
  const seq = opts.db || sequelize;
  if (!seq || !opts.id) return { ok: false };
  await ensurePartnerLeadsTable(seq);
  const status = normalizePartnerLeadStatus(opts.status);
  const [rows] = await seq.query(
    `UPDATE humanify_partner_leads
     SET status = :status, updated_at = NOW()
     WHERE id = :id
     RETURNING id, status`,
    { replacements: { id: opts.id, status } },
  );
  if (!rows?.[0]) return { ok: false };
  return { ok: true, status };
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportPartnerLeadsCsv(opts?: {
  status?: string;
  limit?: number;
  db?: any;
}): Promise<string> {
  const rows = await listPartnerLeads({
    status: opts?.status,
    limit: Math.min(2000, Math.max(1, Number(opts?.limit) || 500)),
    db: opts?.db,
  });
  const header = [
    'created_at', 'company_name', 'contact_name', 'email', 'phone',
    'partner_type', 'region', 'status', 'source', 'message_preview',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.created_at, r.company_name, r.contact_name, r.email, r.phone,
      r.partner_type, r.region, r.status, r.source, r.message_preview,
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}
