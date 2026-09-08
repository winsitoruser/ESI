/**
 * Admin Total — marketing campaigns + funnel (spec §11).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';
import { QA_TENANT_SLUG_REGEX } from '@/lib/saas/partners';
import { overviewPeriodBounds } from '@/lib/saas/platform-subscriptions';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const CAMPAIGN_CHANNELS = ['google', 'instagram', 'linkedin', 'email', 'affiliate', 'other'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
export const CAMPAIGN_STATUSES = ['draft', 'live', 'ended'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type MarketingCampaign = {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  impressions: number;
  visitors: number;
  budgetIdr: number;
  note: string | null;
  createdAt: string;
};

function pick<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const v = String(raw || '').toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

export async function ensureCampaignsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_marketing_campaigns (
      id UUID PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      channel VARCHAR(40) NOT NULL DEFAULT 'other',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      starts_at DATE,
      ends_at DATE,
      impressions INT NOT NULL DEFAULT 0,
      visitors INT NOT NULL DEFAULT 0,
      budget_idr BIGINT NOT NULL DEFAULT 0,
      note TEXT,
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

function mapRow(r: any): MarketingCampaign {
  return {
    id: String(r.id),
    name: r.name || '',
    channel: pick(r.channel, CAMPAIGN_CHANNELS, 'other'),
    status: pick(r.status, CAMPAIGN_STATUSES, 'draft'),
    startsAt: r.starts_at || null,
    endsAt: r.ends_at || null,
    impressions: Number(r.impressions || 0),
    visitors: Number(r.visitors || 0),
    budgetIdr: Number(r.budget_idr || 0),
    note: r.note || null,
    createdAt: r.created_at,
  };
}

export async function listCampaigns(): Promise<{ campaigns: MarketingCampaign[] }> {
  if (!sequelize) return { campaigns: [] };
  await ensureCampaignsTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_marketing_campaigns ORDER BY created_at DESC LIMIT 100`,
  );
  return { campaigns: (rows || []).map(mapRow) };
}

export async function upsertCampaign(input: {
  id?: string;
  name: string;
  channel?: string;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  impressions?: number;
  visitors?: number;
  budgetIdr?: number;
  note?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<MarketingCampaign> {
  if (!sequelize) throw new Error('Database unavailable');
  const name = String(input.name || '').trim().slice(0, 160);
  if (!name) throw new Error('Nama campaign wajib');
  await ensureCampaignsTable();
  const id = String(input.id || '').trim() || randomUUID();
  await sequelize.query(`
    INSERT INTO saas_marketing_campaigns
      (id, name, channel, status, starts_at, ends_at, impressions, visitors, budget_idr, note, created_by)
    VALUES
      (:id, :name, :channel, :status, :starts, :ends, :imp, :vis, :budget, :note, :by)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      channel = EXCLUDED.channel,
      status = EXCLUDED.status,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      impressions = EXCLUDED.impressions,
      visitors = EXCLUDED.visitors,
      budget_idr = EXCLUDED.budget_idr,
      note = EXCLUDED.note,
      updated_at = NOW()
  `, {
    replacements: {
      id,
      name,
      channel: pick(input.channel, CAMPAIGN_CHANNELS, 'other'),
      status: pick(input.status, CAMPAIGN_STATUSES, 'draft'),
      starts: input.startsAt || null,
      ends: input.endsAt || null,
      imp: Math.max(0, Math.round(Number(input.impressions) || 0)),
      vis: Math.max(0, Math.round(Number(input.visitors) || 0)),
      budget: Math.max(0, Math.round(Number(input.budgetIdr) || 0)),
      note: String(input.note || '').trim().slice(0, 2000) || null,
      by: input.actorEmail || null,
    },
  });
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: input.id ? 'marketing.campaign_update' : 'marketing.campaign_create',
    resourceType: 'campaign',
    resourceId: id,
    ip: input.ip,
    meta: { name },
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_marketing_campaigns WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export type MarketingFunnel = {
  visitors: number;
  registrations: number;
  trials: number;
  paid: number;
  conversionRegisterPct: number;
  conversionPaidPct: number;
  periodLabel: string;
};

export function funnelRates(input: { visitors: number; registrations: number; trials: number; paid: number }) {
  const conversionRegisterPct = input.visitors > 0
    ? Math.round((input.registrations / input.visitors) * 1000) / 10
    : 0;
  const conversionPaidPct = input.registrations > 0
    ? Math.round((input.paid / input.registrations) * 1000) / 10
    : 0;
  return { conversionRegisterPct, conversionPaidPct };
}

export async function getMarketingFunnel(period = '30d'): Promise<MarketingFunnel> {
  const bounds = overviewPeriodBounds(period);
  const empty: MarketingFunnel = {
    visitors: 0, registrations: 0, trials: 0, paid: 0,
    conversionRegisterPct: 0, conversionPaidPct: 0, periodLabel: bounds.label,
  };
  if (!sequelize) return empty;
  await ensureCampaignsTable();
  let visitors = 0;
  try {
    const [camp] = await sequelize.query(`
      SELECT COALESCE(SUM(visitors), 0)::int AS visitors
      FROM saas_marketing_campaigns
      WHERE status <> 'draft'
    `);
    visitors = camp?.[0]?.visitors || 0;
  } catch { /* */ }
  try {
    const [rows] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= :fromTs AND created_at <= :toTs)::int AS registrations,
        COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'trial')::int AS trials,
        COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'active')::int AS paid
      FROM tenants
      WHERE COALESCE(status::text, 'trial') <> 'archived'
        AND COALESCE(slug, '') !~* :qaRegex
    `, { replacements: { fromTs: bounds.from, toTs: bounds.to, qaRegex: QA_TENANT_SLUG_REGEX } });
    const registrations = rows?.[0]?.registrations || 0;
    const trials = rows?.[0]?.trials || 0;
    const paid = rows?.[0]?.paid || 0;
    const rates = funnelRates({ visitors, registrations, trials, paid });
    return { visitors, registrations, trials, paid, periodLabel: bounds.label, ...rates };
  } catch {
    return empty;
  }
}
