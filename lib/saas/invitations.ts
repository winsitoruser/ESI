/**
 * Phase 23 — team invitations & multi-user onboarding.
 *
 * Owner/admin invites teammates by email → invitee sets a password on a public
 * accept page → a tenant-scoped User is created with the assigned (non-privileged)
 * role. Tokens are hashed at rest, single-use, and expire in 7 days.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSeatUsage } from './seat-metering';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}
const getDb = () => require('../../models');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roles an owner/admin may hand out — never privileged/platform roles. */
export const INVITE_ROLES: Array<{ code: string; label: string }> = [
  { code: 'hq_admin', label: 'Admin' },
  { code: 'manager', label: 'Manajer' },
  { code: 'staff', label: 'Staf' },
  { code: 'viewer', label: 'Viewer (baca saja)' },
];
const ALLOWED_ROLE_CODES = new Set(INVITE_ROLES.map((r) => r.code));
const FORBIDDEN_ROLES = new Set(['owner', 'super_admin', 'superadmin', 'superhero', 'platform_admin']);

let ready = false;
export async function ensureInvitationsTable(): Promise<boolean> {
  if (!sequelize) return false;
  if (ready) return true;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_invitations (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(64) NOT NULL DEFAULT 'staff',
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      invited_by VARCHAR(64),
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_saas_inv_tenant ON saas_invitations (tenant_id);`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_saas_inv_email ON saas_invitations (tenant_id, email);`);
  ready = true;
  return true;
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function normalizeRole(role?: string | null): string {
  const r = String(role || 'staff').toLowerCase();
  if (FORBIDDEN_ROLES.has(r)) throw new Error('Role tidak diizinkan');
  if (!ALLOWED_ROLE_CODES.has(r)) throw new Error('Role tidak valid');
  return r;
}

export interface CreateInviteResult {
  id: string;
  emailed: boolean;
  inviteUrl?: string;
  token?: string;
}

export async function createInvitation(opts: {
  tenantId: string;
  email: string;
  role?: string;
  name?: string;
  invitedBy?: string | number | null;
  baseUrl?: string;
}): Promise<CreateInviteResult> {
  if (!sequelize) throw new Error('Database unavailable');
  if (!opts.tenantId) throw new Error('Tenant tidak ditemukan');
  await ensureInvitationsTable();

  const email = String(opts.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Format email tidak valid');
  const role = normalizeRole(opts.role);
  const base = (opts.baseUrl || process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');

  const db = getDb();

  // Email is globally unique — cannot invite someone who already has an account.
  const existingUser = await db.User.findOne({ where: { email } });
  if (existingUser) throw new Error('Email ini sudah menjadi pengguna');

  // Seat guardrail (users) — pending invites count toward the cap.
  try {
    const usage = await getSeatUsage(opts.tenantId);
    if (usage) {
      const [[pending]] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM saas_invitations
         WHERE tenant_id = :tid AND status = 'pending' AND expires_at > NOW()`,
        { replacements: { tid: opts.tenantId } },
      );
      const projected = usage.users + (pending?.c || 0) + 1;
      if (projected > usage.maxUsers) {
        throw new Error(`Batas user paket ${usage.planId} tercapai (${usage.users}/${usage.maxUsers}). Upgrade untuk menambah anggota.`);
      }
    }
  } catch (e: any) {
    if (/Batas user/.test(String(e?.message))) throw e;
    // otherwise fail-open on seat metering errors
  }

  // Refresh any existing pending invite for the same email.
  await sequelize.query(
    `UPDATE saas_invitations SET status = 'revoked'
     WHERE tenant_id = :tid AND LOWER(email) = :email AND status = 'pending'`,
    { replacements: { tid: opts.tenantId, email } },
  );

  const token = crypto.randomBytes(24).toString('base64url');
  const id = crypto.randomUUID();
  await sequelize.query(
    `INSERT INTO saas_invitations (id, tenant_id, email, name, role, token_hash, invited_by, status, expires_at)
     VALUES (:id, :tid, :email, :name, :role, :hash, :by, 'pending', NOW() + INTERVAL '7 days')`,
    {
      replacements: {
        id, tid: opts.tenantId, email, name: opts.name || null, role,
        hash: hashToken(token), by: opts.invitedBy != null ? String(opts.invitedBy) : null,
      },
    },
  );

  const inviteUrl = `${base}/humanify/join?token=${encodeURIComponent(token)}`;

  let emailed = false;
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const { sendEmail } = await import('../email/sender');
      emailed = await sendEmail({
        to: email,
        subject: 'Undangan bergabung di Humanify',
        html: `
          <p>Anda diundang bergabung ke tim di Humanify.</p>
          <p><a href="${inviteUrl}">Klik di sini untuk menerima undangan &amp; membuat akun</a></p>
          <p>Link berlaku 7 hari.</p>
        `,
        text: `Undangan Humanify: ${inviteUrl} (berlaku 7 hari)`,
      });
    } catch (e: any) {
      console.warn('[invitations] SMTP send failed:', e?.message);
    }
  }

  const expose = process.env.NODE_ENV !== 'production'
    || process.env.HUMANIFY_INVITE_RETURN_TOKEN === 'true'
    || !emailed;

  return { id, emailed, inviteUrl: expose ? inviteUrl : undefined, token: expose ? token : undefined };
}

export interface InvitationRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  expired: boolean;
}

export async function listInvitations(tenantId: string): Promise<InvitationRow[]> {
  if (!sequelize || !tenantId) return [];
  await ensureInvitationsTable();
  const [rows] = await sequelize.query(
    `SELECT id, email, name, role, status, created_at, expires_at, accepted_at,
            (status = 'pending' AND expires_at <= NOW()) AS expired
     FROM saas_invitations
     WHERE tenant_id = :tid
     ORDER BY created_at DESC
     LIMIT 200`,
    { replacements: { tid: tenantId } },
  );
  return (rows || []).map((r: any) => ({
    id: r.id,
    email: r.email,
    name: r.name || null,
    role: r.role,
    status: r.status,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at || null,
    expired: Boolean(r.expired),
  }));
}

export interface MemberRow {
  id: string | number;
  name: string;
  email: string;
  role: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
}

export async function listTenantMembers(tenantId: string): Promise<MemberRow[]> {
  if (!sequelize || !tenantId) return [];
  try {
    // Use the model so attributes map to the correct (mixed-case) columns.
    const db = getDb();
    const rows = await db.User.findAll({
      where: { tenantId },
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
      order: [['createdAt', 'ASC']],
      raw: true,
    });
    return (rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role || null,
      isActive: r.isActive !== false,
      lastLogin: r.lastLogin || null,
      createdAt: r.createdAt || null,
    }));
  } catch (e: any) {
    console.warn('[invitations] listTenantMembers:', e?.message);
    return [];
  }
}

export async function revokeInvitation(tenantId: string, id: string): Promise<boolean> {
  if (!sequelize || !tenantId || !id) return false;
  await ensureInvitationsTable();
  const [rows] = await sequelize.query(
    `SELECT id FROM saas_invitations
     WHERE tenant_id = :tid AND id = :id AND status = 'pending' LIMIT 1`,
    { replacements: { tid: tenantId, id } },
  );
  if (!rows?.length) return false;
  await sequelize.query(
    `UPDATE saas_invitations SET status = 'revoked' WHERE id = :id`,
    { replacements: { id } },
  );
  return true;
}

export async function resendInvitation(
  tenantId: string,
  id: string,
  baseUrl?: string,
): Promise<CreateInviteResult> {
  if (!sequelize || !tenantId || !id) throw new Error('Undangan tidak ditemukan');
  await ensureInvitationsTable();
  const [rows] = await sequelize.query(
    `SELECT id, email FROM saas_invitations
     WHERE tenant_id = :tid AND id = :id AND status = 'pending' LIMIT 1`,
    { replacements: { tid: tenantId, id } },
  );
  const row = rows?.[0];
  if (!row) throw new Error('Undangan aktif tidak ditemukan');

  const base = (baseUrl || process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const token = crypto.randomBytes(24).toString('base64url');
  await sequelize.query(
    `UPDATE saas_invitations
     SET token_hash = :hash, expires_at = NOW() + INTERVAL '7 days'
     WHERE id = :id`,
    { replacements: { hash: hashToken(token), id } },
  );

  const inviteUrl = `${base}/humanify/join?token=${encodeURIComponent(token)}`;
  let emailed = false;
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const { sendEmail } = await import('../email/sender');
      emailed = await sendEmail({
        to: row.email,
        subject: 'Undangan bergabung di Humanify (dikirim ulang)',
        html: `<p>Undangan bergabung ke Humanify.</p><p><a href="${inviteUrl}">Terima undangan</a> (berlaku 7 hari).</p>`,
        text: `Undangan Humanify: ${inviteUrl} (berlaku 7 hari)`,
      });
    } catch { /* */ }
  }
  const expose = process.env.NODE_ENV !== 'production'
    || process.env.HUMANIFY_INVITE_RETURN_TOKEN === 'true'
    || !emailed;
  return { id, emailed, inviteUrl: expose ? inviteUrl : undefined, token: expose ? token : undefined };
}

export interface InvitePreview {
  valid: boolean;
  email?: string;
  role?: string;
  companyName?: string;
  reason?: string;
}

export async function getInvitationByToken(token: string): Promise<InvitePreview> {
  if (!sequelize) return { valid: false, reason: 'Database unavailable' };
  await ensureInvitationsTable();
  const raw = String(token || '');
  if (!raw) return { valid: false, reason: 'Token wajib diisi' };

  const [rows] = await sequelize.query(
    `SELECT i.email, i.role, i.status, i.expires_at, t.name AS company_name
     FROM saas_invitations i
     LEFT JOIN tenants t ON t.id = i.tenant_id
     WHERE i.token_hash = :hash LIMIT 1`,
    { replacements: { hash: hashToken(raw) } },
  );
  const row = rows?.[0];
  if (!row) return { valid: false, reason: 'Undangan tidak ditemukan' };
  if (row.status !== 'pending') return { valid: false, reason: 'Undangan sudah dipakai atau dibatalkan' };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { valid: false, reason: 'Undangan sudah kedaluwarsa' };

  return { valid: true, email: row.email, role: row.role, companyName: row.company_name || 'Humanify' };
}

export interface AcceptResult {
  email: string;
  tenantId: string;
  userId: number;
}

export async function acceptInvitation(opts: {
  token: string;
  name: string;
  password: string;
}): Promise<AcceptResult> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureInvitationsTable();

  const raw = String(opts.token || '');
  const name = String(opts.name || '').trim();
  const password = String(opts.password || '');
  if (!raw) throw new Error('Token wajib diisi');
  if (!name) throw new Error('Nama wajib diisi');
  if (password.length < 8) throw new Error('Password minimal 8 karakter');

  const [rows] = await sequelize.query(
    `SELECT * FROM saas_invitations
     WHERE token_hash = :hash AND status = 'pending' AND expires_at > NOW() LIMIT 1`,
    { replacements: { hash: hashToken(raw) } },
  );
  const inv = rows?.[0];
  if (!inv) throw new Error('Undangan tidak valid atau sudah kedaluwarsa');

  const db = getDb();
  const email = String(inv.email).toLowerCase();
  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    // Someone already registered this email — close the invite gracefully.
    await sequelize.query(
      `UPDATE saas_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = :id`,
      { replacements: { id: inv.id } },
    );
    throw new Error('Email ini sudah menjadi pengguna. Silakan login.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.User.create({
    name,
    email,
    password: hashedPassword,
    tenantId: inv.tenant_id,
    role: inv.role,
    isActive: true,
  });

  await sequelize.query(
    `UPDATE saas_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = :id`,
    { replacements: { id: inv.id } },
  );

  return { email, tenantId: inv.tenant_id, userId: user.id };
}
