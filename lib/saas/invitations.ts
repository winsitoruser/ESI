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

/** Map invite roles onto User.role ENUM (no `viewer` in ENUM → staff). */
function roleForUserModel(role?: string | null): string {
  const r = normalizeRole(role);
  return r === 'viewer' ? 'staff' : r;
}

/** Resolve RBAC roles.id for an invite/legacy role code (best-effort). */
async function resolveRoleIdForInvite(roleCode: string): Promise<string | null> {
  if (!sequelize) return null;
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'roles'
    `);
    const colSet = new Set((cols || []).map((c: any) => c.column_name));
    if (!colSet.has('id') || !colSet.has('code')) return null;

    const aliases: Record<string, string[]> = {
      hq_admin: ['hq_admin', 'HQ_ADMIN', 'admin', 'ADMIN'],
      manager: ['manager', 'MANAGER'],
      staff: ['staff', 'STAFF', 'employee', 'EMPLOYEE'],
      viewer: ['viewer', 'VIEWER', 'staff', 'STAFF'],
    };
    const candidates = aliases[roleCode] || [roleCode];
    for (const code of candidates) {
      const [rows] = await sequelize.query(
        `SELECT id FROM roles WHERE LOWER(code) = LOWER(:code) LIMIT 1`,
        { replacements: { code } },
      );
      if (rows?.[0]?.id) return String(rows[0].id);
    }
  } catch (e: any) {
    console.warn('[invitations] resolveRoleId:', e?.message);
  }
  return null;
}

async function assignUserRoleId(userId: string | number, roleCode: string) {
  const roleId = await resolveRoleIdForInvite(roleCode);
  if (!roleId) return;
  try {
    const db = getDb();
    await db.User.update({ roleId }, { where: { id: userId } });
  } catch (e: any) {
    console.warn('[invitations] assign role_id:', e?.message);
  }
}

export async function updateMemberRole(opts: {
  tenantId: string;
  memberId: string | number;
  role: string;
  actorUserId?: string | number | null;
}): Promise<{ id: string | number; role: string }> {
  const db = getDb();
  const role = roleForUserModel(opts.role);
  const user = await db.User.findOne({
    where: { id: opts.memberId, tenantId: opts.tenantId },
  });
  if (!user) throw new Error('Anggota tidak ditemukan');
  const current = String(user.role || '').toLowerCase();
  if (FORBIDDEN_ROLES.has(current) || current === 'owner') {
    throw new Error('Role owner tidak dapat diubah dari sini');
  }
  if (String(opts.actorUserId) === String(user.id)) {
    throw new Error('Tidak dapat mengubah role akun sendiri');
  }
  await user.update({ role });
  await assignUserRoleId(user.id, normalizeRole(opts.role));
  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId ? String(opts.actorUserId) : null,
      action: 'role.change',
      resourceType: 'user',
      resourceId: String(user.id),
      meta: { from: current, to: role, email: user.email },
    });
  } catch { /* ignore */ }
  return { id: user.id, role };
}

export async function deactivateMember(opts: {
  tenantId: string;
  memberId: string | number;
  actorUserId?: string | number | null;
}): Promise<{ id: string | number; isActive: boolean }> {
  const db = getDb();
  const user = await db.User.findOne({
    where: { id: opts.memberId, tenantId: opts.tenantId },
  });
  if (!user) throw new Error('Anggota tidak ditemukan');
  const current = String(user.role || '').toLowerCase();
  if (FORBIDDEN_ROLES.has(current) || current === 'owner') {
    throw new Error('Owner tidak dapat dinonaktifkan dari sini');
  }
  if (String(opts.actorUserId) === String(user.id)) {
    throw new Error('Tidak dapat menonaktifkan akun sendiri');
  }
  await user.update({ isActive: false });
  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId ? String(opts.actorUserId) : null,
      action: 'member.deactivate',
      resourceType: 'user',
      resourceId: String(user.id),
      meta: { email: user.email, role: current },
    });
  } catch { /* ignore */ }
  return { id: user.id, isActive: false };
}

export async function reactivateMember(opts: {
  tenantId: string;
  memberId: string | number;
  actorUserId?: string | number | null;
}): Promise<{ id: string | number; isActive: boolean }> {
  const db = getDb();
  const usage = await getSeatUsage(opts.tenantId).catch(() => null);
  if (usage && usage.users >= usage.maxUsers) {
    throw new Error(`Batas user paket tercapai (${usage.users}/${usage.maxUsers}). Upgrade untuk mengaktifkan kembali.`);
  }
  const user = await db.User.findOne({
    where: { id: opts.memberId, tenantId: opts.tenantId },
  });
  if (!user) throw new Error('Anggota tidak ditemukan');
  await user.update({ isActive: true });
  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId ? String(opts.actorUserId) : null,
      action: 'member.reactivate',
      resourceType: 'user',
      resourceId: String(user.id),
      meta: { email: user.email },
    });
  } catch { /* ignore */ }
  return { id: user.id, isActive: true };
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

  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.invitedBy != null ? String(opts.invitedBy) : null,
      action: 'invite.create',
      resourceType: 'invitation',
      resourceId: id,
      meta: { email, role, emailed },
    });
  } catch { /* ignore */ }

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

export async function revokeInvitation(
  tenantId: string,
  id: string,
  actorUserId?: string | number | null,
): Promise<boolean> {
  if (!sequelize || !tenantId || !id) return false;
  await ensureInvitationsTable();
  const [rows] = await sequelize.query(
    `SELECT id, email, role FROM saas_invitations
     WHERE tenant_id = :tid AND id = :id AND status = 'pending' LIMIT 1`,
    { replacements: { tid: tenantId, id } },
  );
  if (!rows?.length) return false;
  await sequelize.query(
    `UPDATE saas_invitations SET status = 'revoked' WHERE id = :id`,
    { replacements: { id } },
  );
  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId,
      actorUserId: actorUserId != null ? String(actorUserId) : null,
      action: 'invite.revoke',
      resourceType: 'invitation',
      resourceId: id,
      meta: { email: rows[0].email, role: rows[0].role },
    });
  } catch { /* ignore */ }
  return true;
}

export async function resendInvitation(
  tenantId: string,
  id: string,
  baseUrl?: string,
  actorUserId?: string | number | null,
): Promise<CreateInviteResult> {
  if (!sequelize || !tenantId || !id) throw new Error('Undangan tidak ditemukan');
  await ensureInvitationsTable();
  const [rows] = await sequelize.query(
    `SELECT id, email, role FROM saas_invitations
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
  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId,
      actorUserId: actorUserId != null ? String(actorUserId) : null,
      action: 'invite.resend',
      resourceType: 'invitation',
      resourceId: id,
      meta: { email: row.email, role: row.role, emailed },
    });
  } catch { /* ignore */ }
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
  const legacyRole = roleForUserModel(inv.role);
  const user = await db.User.create({
    name,
    email,
    password: hashedPassword,
    tenantId: inv.tenant_id,
    role: legacyRole,
    isActive: true,
  });

  await assignUserRoleId(user.id, normalizeRole(inv.role));

  await sequelize.query(
    `UPDATE saas_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = :id`,
    { replacements: { id: inv.id } },
  );

  try {
    const { logAdminAction } = await import('./admin-audit');
    await logAdminAction({
      tenantId: inv.tenant_id,
      actorUserId: inv.invited_by ? String(inv.invited_by) : null,
      action: 'invite.accept',
      resourceType: 'user',
      resourceId: String(user.id),
      meta: { email, role: legacyRole, invitationId: inv.id },
    });
  } catch { /* ignore */ }

  return { email, tenantId: inv.tenant_id, userId: user.id };
}
