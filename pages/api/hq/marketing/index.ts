/**
 * Marketing & Campaign API
 * Campaigns, Segments, Promotions, Content, Budgets, Analytics
 * Integrates with: SFA, POS, CRM/Loyalty, Finance, Inventory
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, r?: any): Promise<any[]> {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, r ? { replacements: r } : undefined); return rows || []; }
  catch (e: any) { console.error('MKT DB:', e.message); return []; }
}
async function qOne(sql: string, r?: any) { return (await q(sql, r))[0] || null; }
async function qExec(sql: string, r?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, r ? { replacements: r } : undefined); return true; }
  catch (e: any) { console.error('MKT Exec:', e.message); return false; }
}

function ok(res: NextApiResponse, data: any, code = 200) { return res.status(code).json({ success: true, ...data }); }
function fail(res: NextApiResponse, msg: string, code = 400) { return res.status(code).json({ success: false, error: msg }); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return fail(res, 'Unauthorized', 401);
    const { action } = req.query;
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id || null;

    if (req.method === 'GET') {
      if (action === 'dashboard') return getDashboard(res, tid);
      if (action === 'campaigns') return getCampaigns(req, res, tid);
      if (action === 'campaign-detail') return getCampaignDetail(req, res, tid);
      if (action === 'segments') return ok(res, { data: await q(`SELECT * FROM mkt_segments WHERE tenant_id = :tid ORDER BY customer_count DESC`, { tid }) });
      if (action === 'promotions') return getPromotions(req, res, tid);
      if (action === 'content-assets') return ok(res, { data: await q(`SELECT * FROM mkt_content_assets WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 100`, { tid }) });
      if (action === 'budgets') return ok(res, { data: await q(`SELECT * FROM mkt_budgets WHERE tenant_id = :tid ORDER BY period DESC`, { tid }) });
      if (action === 'segment-detail') {
        const { id } = req.query;
        const seg = await qOne(`SELECT * FROM mkt_segments WHERE id = :id AND tenant_id = :tid`, { id, tid });
        const rules = await q(`SELECT * FROM mkt_segment_rules WHERE segment_id = :id ORDER BY rule_group, sort_order`, { id });
        return seg ? ok(res, { data: { ...seg, rules } }) : fail(res, 'Not found', 404);
      }
      return fail(res, 'Unknown action');
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (action === 'create-campaign') return createCampaign(b, res, tid, uid);
      if (action === 'create-segment') return createSegment(b, res, tid, uid);
      if (action === 'create-promotion') return createPromotion(b, res, tid, uid);
      if (action === 'create-budget') return createBudget(b, res, tid, uid);
      if (action === 'create-content') return createContent(b, res, tid, uid);
      if (action === 'add-channel') return addChannel(b, res);
      if (action === 'validate-promo') return validatePromo(b, res, tid);
      if (action === 'redeem-promo') return redeemPromo(b, res, tid);
      if (action === 'refresh-segment') {
        const done = await qExec(`UPDATE mkt_segments SET last_refreshed_at = NOW(), updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: b.segment_id, tid });
        return done ? ok(res, { message: 'Segment di-refresh' }) : fail(res, 'Failed', 500);
      }
      return fail(res, 'Unknown action');
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return fail(res, 'id required');
      const tableMap: Record<string, string> = { 'update-campaign': 'mkt_campaigns', 'update-segment': 'mkt_segments', 'update-promotion': 'mkt_promotions', 'update-budget': 'mkt_budgets', 'update-channel': 'mkt_campaign_channels' };
      const table = tableMap[String(action)];
      if (!table) return fail(res, 'Unknown action');
      return updateEntity(b, res, table, uid, tid);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return fail(res, 'id required');
      const delMap: Record<string, string> = { 'delete-campaign': 'mkt_campaigns', 'delete-segment': 'mkt_segments', 'delete-promotion': 'mkt_promotions', 'delete-content': 'mkt_content_assets', 'delete-budget': 'mkt_budgets', 'delete-channel': 'mkt_campaign_channels' };
      const t = delMap[String(action)];
      if (!t) return fail(res, 'Unknown action');
      return (await qExec(`DELETE FROM ${t} WHERE id = :id AND tenant_id = :tid`, { id, tid })) ? ok(res, { message: 'Deleted' }) : fail(res, 'Failed', 500);
    }

    return fail(res, `Method ${req.method} Not Allowed`, 405);
  } catch (error: any) {
    console.error('Marketing API Error:', error);
    return fail(res, error.message || 'Internal Server Error', 500);
  }
}

// ── DASHBOARD ──
async function getDashboard(res: NextApiResponse, tid: string) {
  const camps = await q(`SELECT status, COUNT(*) as count, COALESCE(SUM(budget),0) as budget, COALESCE(SUM(spent),0) as spent FROM mkt_campaigns WHERE tenant_id = :tid GROUP BY status`, { tid });
  const promos = await q(`SELECT status, COUNT(*) as count, COALESCE(SUM(usage_count),0) as used FROM mkt_promotions WHERE tenant_id = :tid GROUP BY status`, { tid });
  const segs = await q(`SELECT segment_type, COUNT(*) as count, COALESCE(SUM(customer_count),0) as customers FROM mkt_segments WHERE tenant_id = :tid GROUP BY segment_type`, { tid });
  const topPromos = await q(`SELECT * FROM mkt_promotions WHERE tenant_id = :tid AND status = 'active' ORDER BY usage_count DESC LIMIT 5`, { tid });
  const active = await q(`SELECT * FROM mkt_campaigns WHERE tenant_id = :tid AND status = 'active' ORDER BY start_date DESC LIMIT 10`, { tid });
  const budSum = await qOne(`SELECT COALESCE(SUM(total_budget),0) as total, COALESCE(SUM(spent),0) as spent, COALESCE(SUM(remaining),0) as remaining FROM mkt_budgets WHERE tenant_id = :tid AND status = 'active'`, { tid });
  const reach = await qOne(`SELECT COALESCE(SUM(actual_reach),0) as reach, COALESCE(SUM(actual_conversions),0) as conv FROM mkt_campaigns WHERE tenant_id = :tid AND status = 'active'`, { tid });
  const roi = await qOne(`SELECT COALESCE(AVG(roi),0) as avg FROM mkt_campaigns WHERE tenant_id = :tid AND status IN ('active','completed') AND roi > 0`, { tid });

  return ok(res, { data: {
    summary: { activeCampaigns: active.length, totalBudget: parseFloat(budSum?.total||0), totalSpent: parseFloat(budSum?.spent||0), totalReach: parseInt(reach?.reach||0), totalConversions: parseInt(reach?.conv||0), avgRoi: parseFloat(roi?.avg||0) },
    activeCampaigns: active, campaignStats: camps, promoStats: promos, segmentStats: segs, topPromos
  }});
}

// ── CAMPAIGNS ──
async function getCampaigns(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const { status, type, search } = req.query;
  let w = 'WHERE tenant_id = :tid'; const p: any = { tid };
  if (status) { w += ' AND status = :status'; p.status = status; }
  if (type) { w += ' AND campaign_type = :type'; p.type = type; }
  if (search) { w += ' AND name ILIKE :s'; p.s = `%${search}%`; }
  return ok(res, { data: await q(`SELECT * FROM mkt_campaigns ${w} ORDER BY created_at DESC LIMIT 100`, p) });
}

async function getCampaignDetail(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const { id } = req.query;
  if (!id) return fail(res, 'id required');
  const c = await qOne(`SELECT * FROM mkt_campaigns WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!c) return fail(res, 'Not found', 404);
  c.channels = await q(`SELECT * FROM mkt_campaign_channels WHERE campaign_id = :id`, { id });
  c.audiences = await q(`SELECT * FROM mkt_campaign_audiences WHERE campaign_id = :id LIMIT 100`, { id });
  c.budgetItems = await q(`SELECT * FROM mkt_budget_items WHERE campaign_id = :id`, { id });
  return ok(res, { data: c });
}

async function createCampaign(b: any, res: NextApiResponse, tid: string, uid: any) {
  if (!b.name) return fail(res, 'name required');
  const cnt = await qOne(`SELECT COUNT(*) as c FROM mkt_campaigns WHERE tenant_id = :tid`, { tid });
  const num = `CMP-${new Date().getFullYear()}${String(parseInt(cnt?.c||0)+1).padStart(4,'0')}`;
  const done = await qExec(`
    INSERT INTO mkt_campaigns (tenant_id, campaign_number, name, description, objective, campaign_type, status, priority, start_date, end_date, budget, target_audience, target_reach, target_conversions, target_revenue, tags, branch_ids, territory_ids, created_by)
    VALUES (:tid, :num, :name, :desc, :obj, :type, :st, :pri, :sd, :ed, :budget, :aud, :reach, :conv, :rev, :tags, :br, :ter, :uid)
  `, { tid, num, name: b.name, desc: b.description||'', obj: b.objective||'brand_awareness', type: b.campaign_type||'multi_channel', st: b.status||'draft', pri: b.priority||'medium', sd: b.start_date||null, ed: b.end_date||null, budget: b.budget||0, aud: b.target_audience||'', reach: b.target_reach||0, conv: b.target_conversions||0, rev: b.target_revenue||0, tags: JSON.stringify(b.tags||[]), br: JSON.stringify(b.branch_ids||[]), ter: JSON.stringify(b.territory_ids||[]), uid });
  return done ? ok(res, { message: 'Campaign berhasil dibuat', data: { campaign_number: num } }, 201) : fail(res, 'Failed', 500);
}

async function getCampaignAnalytics(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const { id } = req.query;
  if (!id) return fail(res, 'id required');
  const c = await qOne(`SELECT * FROM mkt_campaigns WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!c) return fail(res, 'Not found', 404);
  const channels = await q(`SELECT channel_type, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(conversions) as conversions, SUM(revenue_generated) as revenue, AVG(ctr) as ctr FROM mkt_campaign_channels WHERE campaign_id = :id GROUP BY channel_type`, { id });
  return ok(res, { data: { campaign: c, channelPerformance: channels, roi: c.spent > 0 ? ((c.actual_revenue - c.spent) / c.spent * 100) : 0 } });
}

// ── PROMOTIONS ──
async function getPromotions(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const { status, type, search } = req.query;
  let w = 'WHERE tenant_id = :tid'; const p: any = { tid };
  if (status) { w += ' AND status = :status'; p.status = status; }
  if (type) { w += ' AND promo_type = :type'; p.type = type; }
  if (search) { w += ' AND (name ILIKE :s OR promo_code ILIKE :s)'; p.s = `%${search}%`; }
  return ok(res, { data: await q(`SELECT * FROM mkt_promotions ${w} ORDER BY created_at DESC LIMIT 100`, p) });
}

async function createPromotion(b: any, res: NextApiResponse, tid: string, uid: any) {
  if (!b.name || !b.promo_type) return fail(res, 'name and promo_type required');
  const done = await qExec(`
    INSERT INTO mkt_promotions (tenant_id, campaign_id, promo_code, name, description, promo_type, discount_type, discount_value, min_purchase, max_discount, buy_quantity, get_quantity, status, start_date, end_date, usage_limit, per_customer_limit, applicable_branches, applicable_segments, applicable_products, applicable_categories, exclude_products, terms, is_stackable, priority, auto_apply, created_by)
    VALUES (:tid, :cid, :code, :name, :desc, :type, :dT, :dV, :min, :max, :bQ, :gQ, :st, :sd, :ed, :lim, :pc, :br, :seg, :prod, :cat, :excl, :terms, :stack, :pri, :auto, :uid)
  `, { tid, cid: b.campaign_id||null, code: b.promo_code||'', name: b.name, desc: b.description||'', type: b.promo_type, dT: b.discount_type||'percentage', dV: b.discount_value||0, min: b.min_purchase||0, max: b.max_discount||0, bQ: b.buy_quantity||0, gQ: b.get_quantity||0, st: b.status||'draft', sd: b.start_date||null, ed: b.end_date||null, lim: b.usage_limit||0, pc: b.per_customer_limit||0, br: JSON.stringify(b.applicable_branches||[]), seg: JSON.stringify(b.applicable_segments||[]), prod: JSON.stringify(b.applicable_products||[]), cat: JSON.stringify(b.applicable_categories||[]), excl: JSON.stringify(b.exclude_products||[]), terms: b.terms||'', stack: b.is_stackable||false, pri: b.priority||0, auto: b.auto_apply||false, uid });
  return done ? ok(res, { message: 'Promosi berhasil dibuat' }, 201) : fail(res, 'Failed', 500);
}

async function validatePromo(b: any, res: NextApiResponse, tid: string) {
  if (!b.promo_code) return fail(res, 'promo_code required');
  const promo = await qOne(`SELECT * FROM mkt_promotions WHERE tenant_id = :tid AND promo_code = :code AND status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())`, { tid, code: b.promo_code });
  if (!promo) return fail(res, 'Kode promo tidak valid atau sudah expired');
  if (promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit) return fail(res, 'Kuota promo sudah habis');
  if (b.order_total && promo.min_purchase > 0 && b.order_total < promo.min_purchase) return fail(res, `Minimum pembelian Rp ${promo.min_purchase.toLocaleString()}`);
  let discount = 0;
  if (promo.discount_type === 'percentage') { discount = (b.order_total || 0) * promo.discount_value / 100; if (promo.max_discount > 0) discount = Math.min(discount, promo.max_discount); }
  else { discount = promo.discount_value; }
  return ok(res, { data: { valid: true, promo_code: promo.promo_code, name: promo.name, promo_type: promo.promo_type, discount_type: promo.discount_type, discount_value: promo.discount_value, discount_amount: discount, min_purchase: promo.min_purchase } });
}

async function redeemPromo(b: any, res: NextApiResponse, tid: string) {
  if (!b.promo_code || !b.order_id) return fail(res, 'promo_code and order_id required');
  const promo = await qOne(`SELECT * FROM mkt_promotions WHERE tenant_id = :tid AND promo_code = :code AND status = 'active'`, { tid, code: b.promo_code });
  if (!promo) return fail(res, 'Promo tidak ditemukan');
  await qExec(`INSERT INTO mkt_promotion_usage (promotion_id, customer_id, order_id, branch_id, discount_applied, order_total) VALUES (:pid, :cid, :oid, :bid, :disc, :total)`, { pid: promo.id, cid: b.customer_id||null, oid: b.order_id, bid: b.branch_id||null, disc: b.discount_applied||0, total: b.order_total||0 });
  await qExec(`UPDATE mkt_promotions SET usage_count = usage_count + 1 WHERE id = :id`, { id: promo.id });
  return ok(res, { message: 'Promo redeemed' });
}

// ── SEGMENTS, BUDGETS, CONTENT, CHANNELS ──
async function createSegment(b: any, res: NextApiResponse, tid: string, uid: any) {
  if (!b.code || !b.name) return fail(res, 'code and name required');
  const rows = await q(`INSERT INTO mkt_segments (tenant_id, code, name, description, segment_type, criteria, tags, auto_refresh, refresh_frequency, created_by) VALUES (:tid, :code, :name, :desc, :type, :crit, :tags, :auto, :freq, :uid) RETURNING id`, { tid, code: b.code, name: b.name, desc: b.description||'', type: b.segment_type||'static', crit: JSON.stringify(b.criteria||{}), tags: JSON.stringify(b.tags||[]), auto: b.auto_refresh||false, freq: b.refresh_frequency||'weekly', uid });
  if (rows[0]?.id && b.rules) { for (let i = 0; i < b.rules.length; i++) { const r = b.rules[i]; await qExec(`INSERT INTO mkt_segment_rules (segment_id, rule_group, field, operator, value, value_type, logic_operator, sort_order) VALUES (:sid, :grp, :f, :op, :v, :vt, :lo, :s)`, { sid: rows[0].id, grp: r.rule_group||0, f: r.field, op: r.operator, v: r.value||'', vt: r.value_type||'string', lo: r.logic_operator||'AND', s: i }); } }
  return ok(res, { message: 'Segment berhasil dibuat' }, 201);
}

async function createBudget(b: any, res: NextApiResponse, tid: string, uid: any) {
  if (!b.name || !b.period) return fail(res, 'name and period required');
  const done = await qExec(`INSERT INTO mkt_budgets (tenant_id, name, period_type, period, total_budget, allocated, remaining, notes, created_by) VALUES (:tid, :name, :pt, :per, :total, 0, :total, :notes, :uid)`, { tid, name: b.name, pt: b.period_type||'monthly', per: b.period, total: b.total_budget||0, notes: b.notes||'', uid });
  return done ? ok(res, { message: 'Budget berhasil dibuat' }, 201) : fail(res, 'Failed', 500);
}

async function createContent(b: any, res: NextApiResponse, tid: string, uid: any) {
  if (!b.title) return fail(res, 'title required');
  const done = await qExec(`INSERT INTO mkt_content_assets (tenant_id, campaign_id, title, asset_type, file_url, file_name, description, tags, created_by) VALUES (:tid, :cid, :title, :type, :url, :fname, :desc, :tags, :uid)`, { tid, cid: b.campaign_id||null, title: b.title, type: b.asset_type||'image', url: b.file_url||'', fname: b.file_name||'', desc: b.description||'', tags: JSON.stringify(b.tags||[]), uid });
  return done ? ok(res, { message: 'Content berhasil dibuat' }, 201) : fail(res, 'Failed', 500);
}

async function addChannel(b: any, res: NextApiResponse) {
  if (!b.campaign_id || !b.channel_type) return fail(res, 'campaign_id and channel_type required');
  const done = await qExec(`INSERT INTO mkt_campaign_channels (campaign_id, channel_type, channel_name, budget_allocated, content, content_url, schedule, metadata) VALUES (:cid, :type, :name, :budget, :content, :url, :sched, :meta)`, { cid: b.campaign_id, type: b.channel_type, name: b.channel_name||'', budget: b.budget_allocated||0, content: b.content||'', url: b.content_url||'', sched: JSON.stringify(b.schedule||{}), meta: JSON.stringify(b.metadata||{}) });
  return done ? ok(res, { message: 'Channel ditambahkan' }, 201) : fail(res, 'Failed', 500);
}

// ── GENERIC UPDATE ──
async function updateEntity(b: any, res: NextApiResponse, table: string, uid: any, tid?: string) {
  const { id, ...data } = b;
  const sets: string[] = []; const params: any = { id, tid };
  const skip = ['id', 'created_at', 'created_by'];
  for (const [k, v] of Object.entries(data)) {
    if (skip.includes(k)) continue;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) { sets.push(`${k} = :${k}`); params[k] = JSON.stringify(v); }
    else if (Array.isArray(v)) { sets.push(`${k} = :${k}`); params[k] = JSON.stringify(v); }
    else { sets.push(`${k} = :${k}`); params[k] = v; }
  }
  sets.push('updated_at = NOW()');
  if (uid) { sets.push('updated_by = :uid'); params.uid = uid; }
  const done = await qExec(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, params);
  return done ? ok(res, { message: 'Updated' }) : fail(res, 'Failed', 500);
}
