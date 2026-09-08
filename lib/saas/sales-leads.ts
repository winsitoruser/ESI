/**
 * Admin Total — sales CRM pipeline (spec §9).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const SALES_STAGES = [
  'new', 'contacted', 'qualified', 'demo', 'proposal', 'negotiation', 'won', 'lost',
] as const;
export type SalesStage = (typeof SALES_STAGES)[number];

export const SALES_STAGE_LABEL: Record<SalesStage, string> = {
  new: 'New lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  demo: 'Demo',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const LEAD_SOURCES = ['web', 'referral', 'partner', 'inbound', 'outbound', 'event', 'other'] as const;

export type SalesLead = {
  id: string;
  company: string;
  pic: string;
  email: string | null;
  phone: string | null;
  source: string;
  interest: string | null;
  estimatedDealIdr: number;
  ownerEmail: string | null;
  nextFollowUp: string | null;
  status: SalesStage;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

function pickStage(raw: unknown): SalesStage {
  const v = String(raw || 'new').toLowerCase();
  return (SALES_STAGES as readonly string[]).includes(v) ? (v as SalesStage) : 'new';
}

export async function ensureSalesLeadsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_sales_leads (
      id UUID PRIMARY KEY,
      company VARCHAR(200) NOT NULL,
      pic VARCHAR(160) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(60),
      source VARCHAR(40) NOT NULL DEFAULT 'web',
      interest VARCHAR(160),
      estimated_deal_idr BIGINT NOT NULL DEFAULT 0,
      owner_email VARCHAR(255),
      next_follow_up DATE,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_sales_leads_status
    ON saas_sales_leads (status, created_at DESC)
  `);
  ready = true;
}

function mapRow(r: any): SalesLead {
  return {
    id: String(r.id),
    company: r.company || '',
    pic: r.pic || '',
    email: r.email || null,
    phone: r.phone || null,
    source: r.source || 'web',
    interest: r.interest || null,
    estimatedDealIdr: Number(r.estimated_deal_idr || 0),
    ownerEmail: r.owner_email || null,
    nextFollowUp: r.next_follow_up || null,
    status: pickStage(r.status),
    note: r.note || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function pipelineTotals(leads: SalesLead[]) {
  const open = leads.filter((l) => l.status !== 'won' && l.status !== 'lost');
  const qualified = leads.filter((l) =>
    ['qualified', 'demo', 'proposal', 'negotiation'].includes(l.status),
  );
  const proposal = leads.filter((l) => l.status === 'proposal' || l.status === 'negotiation');
  const sum = (rows: SalesLead[]) => rows.reduce((n, r) => n + r.estimatedDealIdr, 0);
  return {
    totalPipelineIdr: sum(open),
    qualifiedPipelineIdr: sum(qualified),
    proposalIdr: sum(proposal),
    expectedClosingIdr: Math.round(sum(proposal) * 0.6),
    wonCount: leads.filter((l) => l.status === 'won').length,
    lostCount: leads.filter((l) => l.status === 'lost').length,
    openCount: open.length,
  };
}

export async function listSalesLeads(limit = 200): Promise<{
  leads: SalesLead[];
  byStage: Record<SalesStage, SalesLead[]>;
  totals: ReturnType<typeof pipelineTotals>;
}> {
  if (!sequelize) {
    const empty = Object.fromEntries(SALES_STAGES.map((s) => [s, []])) as Record<SalesStage, SalesLead[]>;
    return { leads: [], byStage: empty, totals: pipelineTotals([]) };
  }
  await ensureSalesLeadsTable();
  const lim = Math.min(500, Math.max(1, limit));
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_sales_leads ORDER BY created_at DESC LIMIT :lim`,
    { replacements: { lim } },
  );
  const leads = (rows || []).map(mapRow);
  const byStage = Object.fromEntries(
    SALES_STAGES.map((s) => [s, leads.filter((l) => l.status === s)]),
  ) as Record<SalesStage, SalesLead[]>;
  return { leads, byStage, totals: pipelineTotals(leads) };
}

export async function createSalesLead(input: {
  company: string;
  pic: string;
  email?: string | null;
  phone?: string | null;
  source?: string;
  interest?: string | null;
  estimatedDealIdr?: number;
  ownerEmail?: string | null;
  nextFollowUp?: string | null;
  note?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<SalesLead> {
  if (!sequelize) throw new Error('Database unavailable');
  const company = String(input.company || '').trim().slice(0, 200);
  const pic = String(input.pic || '').trim().slice(0, 160);
  if (!company || !pic) throw new Error('Perusahaan dan PIC wajib');
  await ensureSalesLeadsTable();
  const id = randomUUID();
  const source = String(input.source || 'web').toLowerCase().slice(0, 40) || 'web';
  await sequelize.query(`
    INSERT INTO saas_sales_leads
      (id, company, pic, email, phone, source, interest, estimated_deal_idr, owner_email, next_follow_up, note)
    VALUES
      (:id, :company, :pic, :email, :phone, :source, :interest, :deal, :owner, :follow, :note)
  `, {
    replacements: {
      id,
      company,
      pic,
      email: String(input.email || '').trim().toLowerCase() || null,
      phone: String(input.phone || '').trim().slice(0, 60) || null,
      source,
      interest: String(input.interest || '').trim().slice(0, 160) || null,
      deal: Math.max(0, Math.round(Number(input.estimatedDealIdr) || 0)),
      owner: String(input.ownerEmail || '').trim().toLowerCase() || null,
      follow: input.nextFollowUp || null,
      note: String(input.note || '').trim().slice(0, 4000) || null,
    },
  });
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'crm.lead_create',
    resourceType: 'sales_lead',
    resourceId: id,
    ip: input.ip,
    meta: { company },
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_sales_leads WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function updateSalesLead(input: {
  id: string;
  status?: string;
  ownerEmail?: string | null;
  nextFollowUp?: string | null;
  estimatedDealIdr?: number;
  note?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<SalesLead | null> {
  if (!sequelize) throw new Error('Database unavailable');
  const id = String(input.id || '').trim();
  if (!id) return null;
  await ensureSalesLeadsTable();
  const sets: string[] = ['updated_at = NOW()'];
  const repl: Record<string, unknown> = { id };
  if (input.status != null) {
    sets.push('status = :status');
    repl.status = pickStage(input.status);
  }
  if (input.ownerEmail !== undefined) {
    sets.push('owner_email = :owner');
    repl.owner = String(input.ownerEmail || '').trim().toLowerCase() || null;
  }
  if (input.nextFollowUp !== undefined) {
    sets.push('next_follow_up = :follow');
    repl.follow = input.nextFollowUp || null;
  }
  if (input.estimatedDealIdr != null) {
    sets.push('estimated_deal_idr = :deal');
    repl.deal = Math.max(0, Math.round(Number(input.estimatedDealIdr) || 0));
  }
  if (input.note !== undefined) {
    sets.push('note = :note');
    repl.note = String(input.note || '').trim().slice(0, 4000) || null;
  }
  const [rows] = await sequelize.query(
    `UPDATE saas_sales_leads SET ${sets.join(', ')} WHERE id = :id RETURNING *`,
    { replacements: repl },
  );
  if (!rows?.[0]) return null;
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'crm.lead_update',
    resourceType: 'sales_lead',
    resourceId: id,
    ip: input.ip,
    meta: { status: repl.status || null },
  });
  return mapRow(rows[0]);
}
