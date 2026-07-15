/**
 * Humanify SaaS Phase 12 — email digest for critical/warning account alerts.
 * Scans tenants, computes alerts, and (optionally) emails the owner.
 */
import { getTenantColumns } from './tenant-schema';
import { getAccountAlerts, summarizeAlerts, type AccountAlert } from './account-alerts';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export interface DigestTenant {
  tenantId: string;
  name: string | null;
  slug: string | null;
  ownerEmail: string | null;
  alerts: AccountAlert[];
  counts: { total: number; critical: number; warning: number; info: number };
}

export interface DigestResult {
  scanned: number;
  withAlerts: number;
  emailed: number;
  smtpConfigured: boolean;
  sent: boolean;
  tenants: DigestTenant[];
}

async function listDigestTenants(limit: number): Promise<Array<{ id: string; name: string | null; slug: string | null }>> {
  if (!sequelize) return [];
  const cols = await getTenantColumns();
  const nameExpr = [
    cols.has('business_name') ? 'business_name' : null,
    cols.has('name') ? 'name' : null,
    cols.has('code') ? 'code' : null,
    `'tenant'`,
  ].filter(Boolean).join(', ');
  const slugExpr = cols.has('slug') ? 'slug' : 'NULL';
  const statusFilter = cols.has('status')
    ? `WHERE COALESCE(status::text, '') NOT IN ('deleted', 'archived')`
    : '';
  const [rows] = await sequelize.query(`
    SELECT id, ${slugExpr} AS slug, COALESCE(${nameExpr}) AS name
    FROM tenants
    ${statusFilter}
    ORDER BY created_at DESC NULLS LAST
    LIMIT :limit
  `, { replacements: { limit } });
  return rows || [];
}

async function ownerEmailForTenant(tenantId: string): Promise<string | null> {
  if (!sequelize) return null;
  try {
    const [rows] = await sequelize.query(`
      SELECT email, role FROM users
      WHERE tenant_id = :tid AND email IS NOT NULL
      ORDER BY
        CASE LOWER(COALESCE(role, '')) WHEN 'owner' THEN 0 WHEN 'hq_admin' THEN 1 WHEN 'hr_admin' THEN 2 ELSE 3 END,
        created_at ASC NULLS LAST
      LIMIT 1
    `, { replacements: { tid: tenantId } });
    return rows?.[0]?.email || null;
  } catch {
    return null;
  }
}

function renderDigestEmail(t: DigestTenant): { subject: string; html: string; text: string } {
  const subject = `Humanify — ${t.counts.critical} kritikal, ${t.counts.warning} peringatan untuk ${t.name || 'akun Anda'}`;
  const items = t.alerts
    .map((a) => `<li><strong>[${a.severity.toUpperCase()}] ${a.title}</strong> — ${a.message}` +
      (a.actionHref ? ` (<a href="https://humanify.id${a.actionHref}">${a.actionLabel || 'buka'}</a>)` : '') + `</li>`)
    .join('');
  const html = `
    <p>Halo,</p>
    <p>Ada beberapa hal yang perlu perhatian pada akun Humanify Anda:</p>
    <ul>${items}</ul>
    <p>Kelola di <a href="https://humanify.id/humanify/billing">Billing</a> atau <a href="https://humanify.id/humanify/go-live">Go-live checklist</a>.</p>
  `;
  const text = t.alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title} — ${a.message}`).join('\n');
  return { subject, html, text };
}

export async function runAlertDigest(opts?: {
  send?: boolean;
  limit?: number;
}): Promise<DigestResult> {
  const limit = Math.min(500, Math.max(1, opts?.limit || 200));
  const send = Boolean(opts?.send);
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  const tenants = await listDigestTenants(limit);
  const result: DigestResult = {
    scanned: tenants.length,
    withAlerts: 0,
    emailed: 0,
    smtpConfigured,
    sent: send && smtpConfigured,
    tenants: [],
  };

  for (const t of tenants) {
    let alerts: AccountAlert[] = [];
    try {
      alerts = await getAccountAlerts(t.id);
    } catch {
      continue;
    }
    const actionable = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
    if (actionable.length === 0) continue;

    result.withAlerts += 1;
    const ownerEmail = await ownerEmailForTenant(t.id);
    const entry: DigestTenant = {
      tenantId: t.id,
      name: t.name,
      slug: t.slug,
      ownerEmail,
      alerts: actionable,
      counts: summarizeAlerts(actionable),
    };
    result.tenants.push(entry);

    if (send && smtpConfigured && ownerEmail) {
      try {
        const { sendEmail } = await import('../email/sender');
        const mail = renderDigestEmail(entry);
        const okSent = await sendEmail({ to: ownerEmail, subject: mail.subject, html: mail.html, text: mail.text });
        if (okSent) result.emailed += 1;
      } catch (e: any) {
        console.warn('[alert-digest] send failed:', e?.message);
      }
    }
  }

  return result;
}
