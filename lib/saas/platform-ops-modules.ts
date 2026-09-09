/**
 * Admin Total modules — support queue, platform users, system scorecard.
 * Server-only. Never return secrets or password hashes.
 */
import { computeTenantHealth } from '@/lib/saas/platform-metrics';
import { listExpiringTrials } from '@/lib/saas/humanify-billing';
import { getMidtransPublicConfig, isMidtransConfigured, midtransIsProduction } from '@/lib/saas/midtrans';
import { getBackupFreshness } from '@/lib/saas/backup-freshness';
import { getScorecardLastRun } from '@/lib/saas/scorecard-last';
import { getDigestLastRun } from '@/lib/saas/digest-last';
import { getUptimeLastRun } from '@/lib/saas/uptime-last';
import { isSmtpConfigured } from '@/lib/email/sender';
import { probeRedis } from '@/lib/redis/client';
import { logAdminAction } from '@/lib/saas/admin-audit';
import { listSupportTickets } from '@/lib/saas/support-tickets';
import { listApprovals } from '@/lib/saas/platform-approvals';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export function pickSqlCol(cols: Set<string>, snake: string, camel: string): string | null {
  if (cols.has(snake)) return snake;
  if (cols.has(camel)) return `"${camel}"`;
  return null;
}

async function tableColumns(table: string): Promise<Set<string>> {
  if (!sequelize) return new Set();
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = :table AND table_schema = 'public'
  `, { replacements: { table } });
  return new Set((cols || []).map((c: any) => c.column_name));
}

function tenantNameSql(cols: Set<string>, alias = 't') {
  const a = alias ? `${alias}.` : '';
  const parts = [
    cols.has('business_name') ? `${a}business_name` : null,
    cols.has('name') ? `${a}name` : null,
    cols.has('code') ? `${a}code` : null,
    `'tenant'`,
  ].filter(Boolean);
  return `COALESCE(${parts.join(', ')})`;
}

export type SupportKind = 'trial' | 'unpaid' | 'at_risk' | 'unverified';
export type SupportSeverity = 'danger' | 'warning' | 'info';

export type SupportItem = {
  id: string;
  kind: SupportKind;
  severity: SupportSeverity;
  title: string;
  detail: string;
  tenantId: string | null;
  tenantName: string;
  tenantSlug: string;
  href: string;
};

export type SupportQueue = {
  items: SupportItem[];
  counts: Record<SupportKind | 'total', number>;
};

function kindLabel(kind: SupportKind): string {
  if (kind === 'trial') return 'Trial hampir habis';
  if (kind === 'unpaid') return 'Tagihan belum lunas';
  if (kind === 'at_risk') return 'Tenant berisiko';
  return 'Email belum verifikasi';
}

export async function getSupportQueue(): Promise<SupportQueue> {
  const items: SupportItem[] = [];
  const counts: SupportQueue['counts'] = {
    trial: 0,
    unpaid: 0,
    at_risk: 0,
    unverified: 0,
    total: 0,
  };
  if (!sequelize) return { items, counts };

  const tCols = await tableColumns('tenants');
  const nsql = tenantNameSql(tCols);

  try {
    const trials = await listExpiringTrials(14);
    for (const t of trials) {
      const days = Number(t.days_left);
      const daysText = Number.isFinite(days) ? `${days} hari` : 'segera';
      items.push({
        id: `trial-${t.id}`,
        kind: 'trial',
        severity: Number.isFinite(days) && days <= 2 ? 'danger' : 'warning',
        title: kindLabel('trial'),
        detail: `Sisa ${daysText}${t.trial_ends_at ? ` · ${new Date(t.trial_ends_at).toLocaleDateString('id-ID')}` : ''}`,
        tenantId: t.id,
        tenantName: t.name || 'Tenant',
        tenantSlug: t.slug || '—',
        href: `/platform/tenants/${t.id}`,
      });
      counts.trial += 1;
    }
  } catch { /* trials optional */ }

  try {
    const [exists] = await sequelize.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
    `);
    if (exists?.length) {
      const bCols = await tableColumns('saas_billing_orders');
      const statusCol = bCols.has('status') ? 'o.status' : `NULL`;
      const amountCol = bCols.has('amount_idr')
        ? 'o.amount_idr'
        : (bCols.has('amount') ? 'o.amount' : 'NULL');
      const codeCol = bCols.has('order_code')
        ? 'o.order_code'
        : (bCols.has('midtrans_order_id') ? 'o.midtrans_order_id' : 'NULL');
      const createdCol = bCols.has('created_at') ? 'o.created_at' : 'NULL';
      const [orders] = await sequelize.query(`
        SELECT o.id, o.tenant_id, ${codeCol} AS order_code, ${amountCol} AS amount_idr,
          ${statusCol} AS status, ${createdCol} AS created_at,
          t.slug, ${nsql} AS tenant_name
        FROM saas_billing_orders o
        LEFT JOIN tenants t ON t.id = o.tenant_id
        WHERE LOWER(COALESCE(${statusCol}, '')) IN ('pending', 'unpaid', 'expire', 'expired', 'failed', 'deny')
        ORDER BY ${bCols.has('created_at') ? 'o.created_at' : 'o.id'} DESC
        LIMIT 40
      `);
      for (const o of orders || []) {
        if (!o.tenant_id) continue;
        const amt = Number(o.amount_idr || 0);
        items.push({
          id: `unpaid-${o.id}`,
          kind: 'unpaid',
          severity: String(o.status || '').toLowerCase().includes('fail') ? 'danger' : 'warning',
          title: kindLabel('unpaid'),
          detail: `${o.order_code || o.id} · ${o.status || 'pending'}${amt ? ` · Rp ${amt.toLocaleString('id-ID')}` : ''}`,
          tenantId: o.tenant_id,
          tenantName: o.tenant_name || 'Tenant',
          tenantSlug: o.slug || '—',
          href: `/platform/tenants/${o.tenant_id}`,
        });
        counts.unpaid += 1;
      }
    }
  } catch { /* billing optional */ }

  try {
    const [metricRows] = await sequelize.query(`
      SELECT t.id, t.slug, t.status, ${nsql} AS name,
        ${tCols.has('subscription_plan') ? 't.subscription_plan' : 'NULL AS subscription_plan'},
        ${tCols.has('setup_completed') ? 't.setup_completed' : 'NULL AS setup_completed'},
        (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
        (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
      FROM tenants t
      WHERE COALESCE(t.status::text, 'trial') NOT IN ('archived')
      LIMIT 200
    `);
    for (const row of metricRows || []) {
      const health = computeTenantHealth(row);
      if (health.label !== 'at_risk') continue;
      if (counts.at_risk >= 25) continue;
      items.push({
        id: `risk-${row.id}`,
        kind: 'at_risk',
        severity: 'danger',
        title: kindLabel('at_risk'),
        detail: `Skor ${health.score} · ${health.factors.slice(0, 3).join(', ')}`,
        tenantId: row.id,
        tenantName: row.name || row.slug || 'Tenant',
        tenantSlug: row.slug || '—',
        href: `/platform/tenants/${row.id}`,
      });
      counts.at_risk += 1;
    }
  } catch { /* health optional */ }

  try {
    if (tCols.has('settings')) {
      const verifyTable = await sequelize.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'saas_email_verifications' LIMIT 1
      `);
      const hasVerify = Boolean(verifyTable?.[0]?.length);
      const [rows] = await sequelize.query(`
        SELECT t.id, t.slug, ${nsql} AS name
        FROM tenants t
        WHERE COALESCE(t.status::text, 'trial') NOT IN ('archived')
          AND COALESCE((t.settings->>'email_verified')::boolean, false) = false
          ${hasVerify ? `AND NOT EXISTS (
            SELECT 1 FROM saas_email_verifications v
            WHERE v.tenant_id = t.id AND v.verified_at IS NOT NULL
          )` : ''}
        ORDER BY t.created_at DESC NULLS LAST
        LIMIT 40
      `);
      for (const t of rows || []) {
        items.push({
          id: `unverified-${t.id}`,
          kind: 'unverified',
          severity: 'info',
          title: kindLabel('unverified'),
          detail: 'Pemilik belum klik tautan verifikasi',
          tenantId: t.id,
          tenantName: t.name || 'Tenant',
          tenantSlug: t.slug || '—',
          href: `/platform/tenants/${t.id}`,
        });
        counts.unverified += 1;
      }
    }
  } catch { /* verify optional */ }

  const severityRank: Record<SupportSeverity, number> = { danger: 0, warning: 1, info: 2 };
  items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.kind.localeCompare(b.kind));
  counts.total = items.length;
  return { items, counts };
}

export type PlatformUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  isPlatform: boolean;
};

export async function listPlatformUsers(opts: {
  search?: string;
  scope?: 'all' | 'platform' | 'tenant';
  limit?: number;
} = {}): Promise<{ users: PlatformUserRow[]; total: number }> {
  if (!sequelize) return { users: [], total: 0 };
  const cols = await tableColumns('users');
  const tCols = await tableColumns('tenants');
  const nsql = tenantNameSql(tCols);

  const idCol = pickSqlCol(cols, 'id', 'id') || 'id';
  const emailCol = pickSqlCol(cols, 'email', 'email') || 'email';
  const nameCol = pickSqlCol(cols, 'name', 'name');
  const roleCol = pickSqlCol(cols, 'role', 'role');
  const tenantCol = pickSqlCol(cols, 'tenant_id', 'tenantId');
  const activeCol = pickSqlCol(cols, 'is_active', 'isActive');
  const loginCol = pickSqlCol(cols, 'last_login', 'lastLogin');
  const createdCol = pickSqlCol(cols, 'created_at', 'createdAt');

  const select = [
    `u.${idCol} AS id`,
    `u.${emailCol} AS email`,
    nameCol ? `u.${nameCol} AS name` : `NULL AS name`,
    roleCol ? `u.${roleCol} AS role` : `'staff' AS role`,
    tenantCol ? `u.${tenantCol} AS "tenantId"` : `NULL AS "tenantId"`,
    activeCol ? `COALESCE(u.${activeCol}, true) AS "isActive"` : `true AS "isActive"`,
    loginCol ? `u.${loginCol} AS "lastLogin"` : `NULL AS "lastLogin"`,
    createdCol ? `u.${createdCol} AS "createdAt"` : `NULL AS "createdAt"`,
    `t.slug AS "tenantSlug"`,
    `${nsql} AS "tenantName"`,
  ].join(', ');

  const conditions = ['1=1'];
  const repl: Record<string, unknown> = {
    lim: Math.min(200, Math.max(1, opts.limit || 80)),
  };

  if (opts.scope === 'platform') {
    conditions.push(`(
      ${tenantCol ? `u.${tenantCol} IS NULL` : 'true'}
      OR LOWER(COALESCE(${roleCol ? `u.${roleCol}` : `''`}, '')) IN ('super_admin', 'platform_admin')
    )`);
  } else if (opts.scope === 'tenant') {
    conditions.push(tenantCol ? `u.${tenantCol} IS NOT NULL` : 'false');
    if (roleCol) {
      conditions.push(`LOWER(COALESCE(u.${roleCol}, '')) NOT IN ('super_admin', 'platform_admin')`);
    }
  }

  if (opts.search) {
    const parts = [`u.${emailCol} ILIKE :q`];
    if (nameCol) parts.push(`u.${nameCol} ILIKE :q`);
    parts.push(`COALESCE(t.slug, '') ILIKE :q`);
    conditions.push(`(${parts.join(' OR ')})`);
    repl.q = `%${opts.search}%`;
  }

  const where = conditions.join(' AND ');
  const join = tenantCol
    ? `LEFT JOIN tenants t ON t.id = u.${tenantCol}`
    : `LEFT JOIN tenants t ON false`;

  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS total FROM users u ${join} WHERE ${where}`,
    { replacements: repl },
  );
  const [rows] = await sequelize.query(`
    SELECT ${select}
    FROM users u
    ${join}
    WHERE ${where}
    ORDER BY ${createdCol ? `u.${createdCol}` : `u.${idCol}`} DESC NULLS LAST
    LIMIT :lim
  `, { replacements: repl });

  const users: PlatformUserRow[] = (rows || []).map((r: any) => {
    const role = String(r.role || '');
    const isPlatform = !r.tenantId || ['super_admin', 'platform_admin'].includes(role);
    return {
      id: String(r.id),
      name: r.name || '—',
      email: r.email || '',
      role,
      isActive: r.isActive !== false,
      tenantId: r.tenantId || null,
      tenantName: r.tenantName || null,
      tenantSlug: r.tenantSlug || null,
      lastLogin: r.lastLogin || null,
      createdAt: r.createdAt || null,
      isPlatform,
    };
  });

  return { users, total: countRows?.[0]?.total || users.length };
}

export async function setPlatformUserActive(opts: {
  userId: string;
  isActive: boolean;
  actorUserId?: string | null;
  actorEmail?: string | null;
  ip?: string | null;
}): Promise<{ id: string; isActive: boolean }> {
  if (!sequelize) throw new Error('Database unavailable');
  const userId = String(opts.userId || '').trim();
  if (!userId) throw new Error('userId required');

  const cols = await tableColumns('users');
  const idCol = pickSqlCol(cols, 'id', 'id') || 'id';
  const roleCol = pickSqlCol(cols, 'role', 'role');
  const activeCol = pickSqlCol(cols, 'is_active', 'isActive');
  const emailCol = pickSqlCol(cols, 'email', 'email') || 'email';
  const tenantCol = pickSqlCol(cols, 'tenant_id', 'tenantId');
  if (!activeCol) throw new Error('Kolom status pengguna tidak tersedia');

  const [rows] = await sequelize.query(
    `SELECT ${idCol} AS id, ${emailCol} AS email,
      ${roleCol ? `${roleCol} AS role` : `'staff' AS role`},
      ${tenantCol ? `${tenantCol} AS "tenantId"` : `NULL AS "tenantId"`},
      COALESCE(${activeCol}, true) AS "isActive"
     FROM users WHERE CAST(${idCol} AS text) = :id LIMIT 1`,
    { replacements: { id: userId } },
  );
  const row = rows?.[0];
  if (!row) throw new Error('Pengguna tidak ditemukan');

  if (opts.actorUserId && String(row.id) === String(opts.actorUserId) && opts.isActive === false) {
    throw new Error('Tidak bisa menonaktifkan akun sendiri');
  }

  const role = String(row.role || '').toLowerCase();
  if (!opts.isActive && ['super_admin', 'platform_admin'].includes(role) && activeCol && roleCol) {
    const [cnt] = await sequelize.query(`
      SELECT COUNT(*)::int AS c FROM users
      WHERE LOWER(COALESCE(${roleCol}, '')) IN ('super_admin', 'platform_admin')
        AND COALESCE(${activeCol}, true) = true
    `);
    if ((cnt?.[0]?.c || 0) <= 1) {
      throw new Error('Tidak bisa menonaktifkan operator platform terakhir');
    }
  }

  await sequelize.query(
    `UPDATE users SET ${activeCol} = :active WHERE CAST(${idCol} AS text) = :id`,
    { replacements: { active: opts.isActive, id: userId } },
  );

  await logAdminAction({
    tenantId: row.tenantId || null,
    actorUserId: opts.actorUserId || null,
    actorEmail: opts.actorEmail || null,
    action: opts.isActive ? 'user.activate' : 'user.deactivate',
    resourceType: 'user',
    resourceId: String(row.id),
    meta: { email: row.email, role: row.role },
    ip: opts.ip || null,
  });

  return { id: String(row.id), isActive: opts.isActive };
}

export type SystemCheck = {
  id: string;
  label: string;
  ok: boolean;
  warning?: boolean;
  detail: string;
  href?: string;
};

export type SystemStatus = {
  checks: SystemCheck[];
  okCount: number;
  warnCount: number;
  failCount: number;
  redis: Awaited<ReturnType<typeof probeRedis>>;
  backup: ReturnType<typeof getBackupFreshness>;
  scorecard: ReturnType<typeof getScorecardLastRun>;
  digest: ReturnType<typeof getDigestLastRun>;
  uptime: ReturnType<typeof getUptimeLastRun>;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const smtp = isSmtpConfigured();
  const rlsRaw = String(process.env.HUMANIFY_RLS_MODE || 'soft').toLowerCase();
  const rlsMode = rlsRaw === 'strict' || rlsRaw === 'force' ? 'strict' : 'soft';
  const rlsBound = String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase() === 'true';
  const redis = await probeRedis();
  const backup = getBackupFreshness();
  const scorecard = getScorecardLastRun();
  const digest = getDigestLastRun();
  const uptime = getUptimeLastRun();
  const midtrans = isMidtransConfigured();
  const midtransProd = midtransIsProduction();
  const midtransCfg = getMidtransPublicConfig();
  const db = Boolean(process.env.DATABASE_URL || process.env.DB_HOST);
  const nextAuth = Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);

  const checks: SystemCheck[] = [
    {
      id: 'db',
      label: 'Database',
      ok: db,
      detail: db ? 'Koneksi terkonfigurasi' : 'DATABASE_URL / DB_HOST belum di-set',
    },
    {
      id: 'smtp',
      label: 'SMTP',
      ok: smtp,
      detail: smtp ? 'Kredensial terisi (tanpa menampilkan secret)' : 'SMTP_USER / SMTP_PASSWORD kosong — email tidak terkirim',
    },
    {
      id: 'redis',
      label: 'Redis',
      ok: !redis.configured || redis.ok,
      warning: redis.configured && !redis.ok,
      detail: !redis.configured
        ? 'Tidak dikonfigurasi (fallback memori)'
        : redis.ok
          ? `Ping ${redis.latencyMs ?? 0} ms`
          : redis.error || 'Ping gagal',
    },
    {
      id: 'rls',
      label: 'RLS tenant',
      ok: true,
      warning: rlsMode !== 'strict',
      detail: `Mode ${rlsMode}${rlsBound ? ' · request-bound' : ' · belum request-bound'}`,
      href: '/platform/observability',
    },
    {
      id: 'midtrans',
      label: 'Midtrans Snap',
      ok: midtrans,
      warning: !midtrans,
      detail: midtrans
        ? `${midtransProd ? 'Production' : 'Sandbox'} · ${midtransCfg.serverKeyFingerprint || 'key terisi'} · webhook ${midtransCfg.webhookPath}${midtransCfg.iris.configured ? ' · Iris siap' : ' · Iris belum di-set'}`
        : 'MIDTRANS_SERVER_KEY belum di-set — checkout jatuh ke manual',
      href: '/platform/billing',
    },
    {
      id: 'nextauth',
      label: 'NextAuth',
      ok: nextAuth,
      detail: nextAuth ? 'Secret & URL terisi' : 'NEXTAUTH_SECRET / NEXTAUTH_URL kurang',
    },
    {
      id: 'backup',
      label: 'Backup',
      ok: backup.ok,
      warning: backup.skipped,
      detail: backup.skipped
        ? 'Pengecekan di-skip'
        : backup.ok
          ? `Fresh · ${backup.ageHours != null ? `${backup.ageHours} jam` : 'usia tidak diketahui'}`
          : backup.reason || 'Dump terbaru tidak ditemukan',
    },
    {
      id: 'scorecard',
      label: 'Security scorecard',
      ok: !scorecard.present || scorecard.ok,
      warning: scorecard.present && !scorecard.ok,
      detail: scorecard.present
        ? `${scorecard.failedTotal ?? 0} gagal · ${scorecard.ageHours != null ? `${scorecard.ageHours} jam lalu` : scorecard.at || '—'}`
        : 'Belum ada run',
      href: '/platform/observability',
    },
    {
      id: 'digest',
      label: 'Digest cron',
      ok: !digest.present || digest.ok,
      detail: digest.present
        ? `${digest.sent ?? 0} terkirim · ${digest.ageHours != null ? `${digest.ageHours} jam lalu` : digest.at || '—'}`
        : 'Belum ada run',
    },
    {
      id: 'uptime',
      label: 'Uptime probe',
      ok: !uptime.present || uptime.ok,
      detail: uptime.present
        ? `${uptime.result || 'ok'} · ${uptime.ageHours != null ? `${uptime.ageHours} jam lalu` : uptime.at || '—'}`
        : 'Belum ada run',
      href: '/platform/observability',
    },
  ];

  return {
    checks,
    okCount: checks.filter((c) => c.ok && !c.warning).length,
    warnCount: checks.filter((c) => c.ok && c.warning).length,
    failCount: checks.filter((c) => !c.ok).length,
    redis,
    backup,
    scorecard,
    digest,
    uptime,
  };
}

export type PlatformNotice = {
  id: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  href: string;
};

export async function getPlatformNotifications(): Promise<{
  items: PlatformNotice[];
  unread: number;
}> {
  const items: PlatformNotice[] = [];
  try {
    const queue = await getSupportQueue();
    if (queue.counts.unpaid) {
      items.push({
        id: 'unpaid',
        tone: 'danger',
        title: `${queue.counts.unpaid} pembayaran belum lunas`,
        detail: 'Tagihan pending/failed di antrean support',
        href: '/platform/support',
      });
    }
    if (queue.counts.trial) {
      items.push({
        id: 'trial',
        tone: 'warning',
        title: `${queue.counts.trial} trial hampir habis`,
        detail: 'Perlu follow-up atau perpanjang trial',
        href: '/platform/subscriptions',
      });
    }
    if (queue.counts.at_risk) {
      items.push({
        id: 'risk',
        tone: 'danger',
        title: `${queue.counts.at_risk} tenant berisiko`,
        detail: 'Skor kesehatan rendah',
        href: '/platform/support',
      });
    }
    if (queue.counts.unverified) {
      items.push({
        id: 'email',
        tone: 'info',
        title: `${queue.counts.unverified} email belum verifikasi`,
        detail: 'Pemilik tenant belum klik tautan',
        href: '/platform/support',
      });
    }
  } catch { /* */ }
  try {
    const tickets = await listSupportTickets(30);
    const urgent = tickets.tickets.filter(
      (t) => !['resolved', 'closed'].includes(t.status) && (t.priority === 'critical' || t.priority === 'high'),
    );
    if (tickets.openCount) {
      items.push({
        id: 'tickets',
        tone: urgent.length ? 'danger' : 'warning',
        title: `${tickets.openCount} tiket support terbuka`,
        detail: urgent.length ? `${urgent.length} prioritas tinggi/kritis` : 'Belum ditutup',
        href: '/platform/support?tab=tickets',
      });
    }
  } catch { /* */ }
  try {
    const approvals = await listApprovals({ status: 'pending', limit: 20 });
    if (approvals.pendingCount) {
      items.push({
        id: 'approvals',
        tone: 'warning',
        title: `${approvals.pendingCount} approval menunggu`,
        detail: 'Refund atau aksi keuangan belum diputuskan',
        href: '/platform/approvals',
      });
    }
  } catch { /* */ }
  return { items, unread: items.length };
}
