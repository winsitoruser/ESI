/**
 * Privacy / Data Subject Request queue (Wave 3 — SEC privacy baseline).
 * Stores DSR tickets; fulfillment is operator-assisted (export already exists).
 */
import crypto from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export type DsrType = 'access' | 'export' | 'rectify' | 'erase' | 'restrict';
export type DsrStatus = 'received' | 'in_progress' | 'fulfilled' | 'rejected';

export async function ensureDsrTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_privacy_dsr (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      subject_email VARCHAR(255) NOT NULL,
      subject_user_id VARCHAR(64),
      request_type VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'received',
      notes TEXT,
      requested_by VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fulfilled_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_privacy_dsr_tenant
    ON saas_privacy_dsr (tenant_id, created_at DESC)
  `);
  ready = true;
}

export async function submitDsr(opts: {
  tenantId: string;
  subjectEmail: string;
  subjectUserId?: string | null;
  requestType: DsrType;
  notes?: string;
  requestedBy?: string | null;
}) {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureDsrTable();
  const id = crypto.randomUUID();
  await sequelize.query(`
    INSERT INTO saas_privacy_dsr
      (id, tenant_id, subject_email, subject_user_id, request_type, status, notes, requested_by)
    VALUES
      (:id, :tid, :email, :uid, :rtype, 'received', :notes, :by)
  `, {
    replacements: {
      id,
      tid: opts.tenantId,
      email: opts.subjectEmail.toLowerCase().trim(),
      uid: opts.subjectUserId || null,
      rtype: opts.requestType,
      notes: opts.notes || null,
      by: opts.requestedBy || null,
    },
  });
  try {
    await logAdminAction({
      tenantId: opts.tenantId,
      actorEmail: opts.requestedBy,
      action: 'privacy.dsr_submit',
      resourceType: 'dsr',
      resourceId: id,
      meta: { type: opts.requestType, subject: opts.subjectEmail },
    });
  } catch { /* */ }
  return { id, status: 'received' as DsrStatus };
}

export async function listDsr(tenantId: string, limit = 50) {
  if (!sequelize) return [];
  await ensureDsrTable();
  const [rows] = await sequelize.query(`
    SELECT id, subject_email, request_type, status, notes, created_at, fulfilled_at
    FROM saas_privacy_dsr
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT :lim
  `, { replacements: { tid: tenantId, lim: Math.min(100, Math.max(1, limit)) } });
  return rows || [];
}
