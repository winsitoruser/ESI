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
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_leads_created
      ON humanify_partner_leads (created_at DESC)
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
