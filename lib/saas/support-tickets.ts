/**
 * Admin Total — support tickets (Customer Support Management).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const TICKET_STATUSES = ['new', 'assigned', 'in_progress', 'waiting', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const TICKET_SOURCES = ['internal', 'email', 'website', 'chat', 'whatsapp'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];

export type SupportTicket = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  subject: string;
  body: string | null;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  requesterEmail: string | null;
  assigneeEmail: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

function pick<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  const v = String(raw || '').toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

export async function ensureSupportTicketsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_support_tickets (
      id UUID PRIMARY KEY,
      tenant_id UUID,
      subject VARCHAR(200) NOT NULL,
      body TEXT,
      source VARCHAR(20) NOT NULL DEFAULT 'internal',
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      requester_email VARCHAR(255),
      assignee_email VARCHAR(255),
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_status
    ON saas_support_tickets (status, priority, created_at DESC)
  `);
  ready = true;
}

function mapRow(r: any): SupportTicket {
  return {
    id: String(r.id),
    tenantId: r.tenant_id || null,
    tenantName: r.tenant_name || null,
    tenantSlug: r.tenant_slug || null,
    subject: r.subject || '',
    body: r.body || null,
    source: pick(r.source, TICKET_SOURCES, 'internal'),
    status: pick(r.status, TICKET_STATUSES, 'new'),
    priority: pick(r.priority, TICKET_PRIORITIES, 'medium'),
    requesterEmail: r.requester_email || null,
    assigneeEmail: r.assignee_email || null,
    createdBy: r.created_by || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at || null,
  };
}

export async function listSupportTickets(limit = 80): Promise<{ tickets: SupportTicket[]; openCount: number }> {
  if (!sequelize) return { tickets: [], openCount: 0 };
  await ensureSupportTicketsTable();
  const lim = Math.min(200, Math.max(1, limit));
  const [rows] = await sequelize.query(`
    SELECT t.*, tn.slug AS tenant_slug, tn.slug AS tenant_name
    FROM saas_support_tickets t
    LEFT JOIN tenants tn ON tn.id = t.tenant_id
    ORDER BY
      CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      t.created_at DESC
    LIMIT :lim
  `, { replacements: { lim } });
  const [open] = await sequelize.query(`
    SELECT COUNT(*)::int AS c FROM saas_support_tickets
    WHERE status NOT IN ('resolved', 'closed')
  `);
  return { tickets: (rows || []).map(mapRow), openCount: open?.[0]?.c || 0 };
}

export async function createSupportTicket(input: {
  subject: string;
  body?: string | null;
  tenantId?: string | null;
  source?: string;
  priority?: string;
  requesterEmail?: string | null;
  createdBy?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<SupportTicket> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureSupportTicketsTable();
  const subject = String(input.subject || '').trim().slice(0, 200);
  if (!subject) throw new Error('Subjek wajib diisi');
  const id = randomUUID();
  await sequelize.query(`
    INSERT INTO saas_support_tickets
      (id, tenant_id, subject, body, source, status, priority, requester_email, created_by)
    VALUES
      (:id, :tid, :subject, :body, :source, 'new', :priority, :email, :by)
  `, {
    replacements: {
      id,
      tid: input.tenantId || null,
      subject,
      body: String(input.body || '').trim().slice(0, 4000) || null,
      source: pick(String(input.source || 'internal'), TICKET_SOURCES, 'internal'),
      priority: pick(String(input.priority || 'medium'), TICKET_PRIORITIES, 'medium'),
      email: String(input.requesterEmail || '').trim().slice(0, 255) || null,
      by: input.createdBy || null,
    },
  });
  await logAdminAction({
    tenantId: input.tenantId || null,
    actorUserId: input.actorUserId || null,
    actorEmail: input.createdBy || null,
    action: 'ticket.create',
    resourceType: 'ticket',
    resourceId: id,
    meta: { subject },
    ip: input.ip || null,
  });
  const [rows] = await sequelize.query(`
    SELECT t.*, tn.slug AS tenant_slug, tn.slug AS tenant_name
    FROM saas_support_tickets t
    LEFT JOIN tenants tn ON tn.id = t.tenant_id
    WHERE t.id = :id
  `, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function updateSupportTicket(input: {
  id: string;
  status?: string;
  priority?: string;
  assigneeEmail?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<SupportTicket> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureSupportTicketsTable();
  const id = String(input.id || '').trim();
  if (!id) throw new Error('id required');
  const [existing] = await sequelize.query(
    `SELECT * FROM saas_support_tickets WHERE id = :id LIMIT 1`,
    { replacements: { id } },
  );
  if (!existing?.length) throw new Error('Tiket tidak ditemukan');
  const status = input.status != null ? pick(input.status, TICKET_STATUSES, existing[0].status) : existing[0].status;
  const resolved = ['resolved', 'closed'].includes(status);
  await sequelize.query(`
    UPDATE saas_support_tickets SET
      status = :status,
      priority = :priority,
      assignee_email = :assignee,
      resolved_at = CASE WHEN :resolved THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
      updated_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id,
      status,
      priority: input.priority != null ? pick(input.priority, TICKET_PRIORITIES, existing[0].priority) : existing[0].priority,
      assignee: input.assigneeEmail !== undefined
        ? (String(input.assigneeEmail || '').trim() || null)
        : existing[0].assignee_email,
      resolved,
    },
  });
  await logAdminAction({
    tenantId: existing[0].tenant_id || null,
    actorUserId: input.actorUserId || null,
    actorEmail: input.actorEmail || null,
    action: 'ticket.update',
    resourceType: 'ticket',
    resourceId: id,
    meta: { status },
    ip: input.ip || null,
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_support_tickets WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}
