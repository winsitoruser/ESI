/**
 * SFA (Sales Force Automation) API
 * 
 * Comprehensive API for managing sales operations:
 * - Leads/Prospects (CRUD + scoring + conversion)
 * - Opportunities/Pipeline (CRUD + stage management)
 * - Activities (calls, emails, meetings)
 * - Visits (GPS-tracked field visits)
 * - Targets & Achievement
 * - Quotations
 * - Territories
 * - Route Plans
 * - Dashboard/Analytics
 * 
 * Integration points:
 * - POS: Order data for target achievement
 * - Inventory: Product catalog for quotations
 * - Finance: Revenue tracking
 * - HRIS: Salesperson employee data
 * - Marketing: Campaign-to-lead attribution
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { ensureVisitLinkedTask, syncTaskStatusFromVisit } from '../../../../lib/sfa/visitTaskSync';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(query: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(query, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) {
    console.warn('SFA DB Error:', e.message);
    return [];
  }
}

async function qOne(query: string, replacements?: any): Promise<any> {
  const rows = await q(query, replacements);
  return rows[0] || null;
}

async function qExec(query: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try {
    await sequelize.query(query, replacements ? { replacements } : undefined);
    return true;
  } catch (e: any) {
    console.warn('SFA DB Exec Error:', e.message);
    return false;
  }
}

/** Extract pagination params from request query */
function getPagination(qry: any): { limit: number; offset: number; page: number } {
  const page = Math.max(parseInt(String(qry.page || '1'), 10) || 1, 1);
  const limit = Math.min(parseInt(String(qry.limit || '50'), 10) || 50, 1000);
  return { limit, offset: (page - 1) * limit, page };
}

const sfaEntityMap: Record<string, string> = {
  'create-lead': 'sfa_lead', 'update-lead': 'sfa_lead', 'delete-lead': 'sfa_lead', 'convert-lead': 'sfa_lead',
  'create-opportunity': 'sfa_opportunity', 'update-opportunity': 'sfa_opportunity', 'delete-opportunity': 'sfa_opportunity',
  'create-activity': 'sfa_activity', 'update-activity': 'sfa_activity', 'delete-activity': 'sfa_activity',
  'create-visit': 'sfa_visit', 'update-visit': 'sfa_visit', 'checkin-visit': 'sfa_visit', 'checkout-visit': 'sfa_visit',
  'create-quotation': 'sfa_quotation', 'update-quotation': 'sfa_quotation', 'delete-quotation': 'sfa_quotation',
  'create-territory': 'sfa_territory', 'create-target': 'sfa_target', 'update-target': 'sfa_target',
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);

    // Fire-and-forget audit for write operations
    type AuditAction = 'create' | 'update' | 'delete' | 'convert' | 'assign' | 'status_change' | 'import' | 'export' | 'approve' | 'reject' | 'link';
    const fireAudit = (act: AuditAction, entityId?: string, newVals?: any) => {
      const entity = sfaEntityMap[String(action)] || 'sfa_entity';
      logAudit({
        tenantId, userId, userName, action: act, entityType: entity,
        entityId: entityId || req.body?.id || (req.query.id as string) || undefined,
        newValues: newVals, req,
      }).catch(() => {});
    };

    // DELETE operations restricted to manager/admin only
    if (req.method === 'DELETE' && !isManager) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Manager/Admin yang bisa menghapus data.' });
    }

    // ── GET routes ──
    if (req.method === 'GET') {
      switch (action) {
        case 'dashboard': return getDashboard(req, res, tenantId);
        case 'leads': return getLeads(req, res, tenantId);
        case 'lead-detail': return getLeadDetail(req, res, tenantId);
        case 'opportunities': return getOpportunities(req, res, tenantId);
        case 'pipeline': return getPipeline(req, res, tenantId);
        case 'activities': return getActivities(req, res, tenantId);
        case 'visits': return getVisits(req, res, tenantId);
        case 'targets': return getTargets(req, res, tenantId);
        case 'quotations': return getQuotations(req, res, tenantId);
        case 'territories': return getTerritories(req, res, tenantId);
        case 'route-plans': return getRoutePlans(req, res, tenantId);
        case 'unified-dashboard': return getUnifiedDashboard(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── POST routes ──
    if (req.method === 'POST') {
      fireAudit(action === 'convert-lead' ? 'convert' : 'create', undefined, req.body);
      switch (action) {
        case 'create-lead': return createLead(req, res, tenantId, session);
        case 'create-opportunity': return createOpportunity(req, res, tenantId, session);
        case 'create-activity': return createActivity(req, res, tenantId, session);
        case 'create-visit': return createVisit(req, res, tenantId, session);
        case 'create-quotation': return createQuotation(req, res, tenantId, session);
        case 'create-territory': return createTerritory(req, res, tenantId, session);
        case 'create-target': return createTarget(req, res, tenantId, session);
        case 'convert-lead': return convertLead(req, res, tenantId, session);
        case 'checkin-visit': return checkinVisit(req, res, tenantId, session);
        case 'checkout-visit': return checkoutVisit(req, res, tenantId, session);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── PUT routes ──
    if (req.method === 'PUT') {
      fireAudit('update', req.body?.id, req.body);
      switch (action) {
        case 'update-lead': return updateLead(req, res, tenantId, session);
        case 'update-opportunity': return updateOpportunity(req, res, tenantId, session);
        case 'update-activity': return updateActivity(req, res, tenantId, session);
        case 'update-visit': return updateVisit(req, res, tenantId, session);
        case 'update-quotation': return updateQuotation(req, res, tenantId, session);
        case 'update-target': return updateTarget(req, res, tenantId, session);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── DELETE routes ──
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      fireAudit('delete', String(id));
      switch (action) {
        case 'delete-lead': return deleteLead(req, res, String(id), tenantId);
        case 'delete-opportunity': return deleteOpportunity(req, res, String(id), tenantId);
        case 'delete-activity': return deleteActivity(req, res, String(id), tenantId);
        case 'delete-quotation': return deleteQuotation(req, res, String(id), tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.warn('SFA API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

// ════════════════════════════════════════════════════════════════
// ██  DASHBOARD & ANALYTICS
// ════════════════════════════════════════════════════════════════
async function getDashboard(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const [leadStats] = await Promise.all([
    q(`SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value),0) as value FROM sfa_leads WHERE tenant_id = :tid GROUP BY status`, { tid })
  ]);

  const oppStats = await q(`SELECT stage, COUNT(*) as count, COALESCE(SUM(expected_value),0) as value FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open' GROUP BY stage`, { tid });
  const targetStats = await q(`SELECT target_type, SUM(target_value) as target, SUM(actual_value) as actual FROM sfa_targets WHERE tenant_id = :tid AND period = to_char(NOW(), 'YYYY-MM') GROUP BY target_type`, { tid });
  const recentActivities = await q(`SELECT * FROM sfa_activities WHERE tenant_id = :tid ORDER BY activity_date DESC LIMIT 10`, { tid });
  const visitStats = await q(`SELECT status, COUNT(*) as count FROM sfa_visits WHERE tenant_id = :tid AND visit_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY status`, { tid });
  const topLeads = await q(`SELECT * FROM sfa_leads WHERE tenant_id = :tid AND status NOT IN ('lost', 'converted') ORDER BY estimated_value DESC LIMIT 5`, { tid });

  // Pipeline value
  const pipelineTotal = await qOne(`SELECT COALESCE(SUM(expected_value), 0) as total, COUNT(*) as count FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'`, { tid });

  // Conversion rate (leads converted / total leads)
  const convRate = await qOne(`SELECT 
    COUNT(*) FILTER (WHERE status = 'converted') as converted,
    COUNT(*) as total
    FROM sfa_leads WHERE tenant_id = :tid`, { tid });

  // Revenue from POS (integration point)
  let posRevenue = null;
  try {
    posRevenue = await qOne(`SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as transactions FROM pos_transactions WHERE created_at >= date_trunc('month', CURRENT_DATE)`);
  } catch (e) {}

  return res.json({
    success: true,
    data: {
      summary: {
        totalLeads: leadStats.reduce((s: number, r: any) => s + parseInt(r.count), 0),
        pipelineValue: parseFloat(pipelineTotal?.total || 0),
        pipelineCount: parseInt(pipelineTotal?.count || 0),
        conversionRate: convRate?.total > 0 ? ((convRate.converted / convRate.total) * 100).toFixed(1) : 0,
        posRevenue: posRevenue ? parseFloat(posRevenue.revenue) : null,
      },
      leadsByStatus: leadStats,
      pipeline: oppStats,
      targets: targetStats,
      recentActivities,
      visitStats,
      topLeads,
    }
  });
}

// ════════════════════════════════════════════════════════════════
// ██  LEADS
// ════════════════════════════════════════════════════════════════
async function getLeads(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { status, source, priority, search, territory_id } = req.query;
  let where = 'WHERE l.tenant_id = :tid AND l.is_deleted IS NOT TRUE';
  const params: any = { tid: tenantId };
  if (status) { where += ' AND l.status = :status'; params.status = status; }
  if (source) { where += ' AND l.source = :source'; params.source = source; }
  if (priority) { where += ' AND l.priority = :priority'; params.priority = priority; }
  if (territory_id) { where += ' AND l.territory_id = :territory_id'; params.territory_id = territory_id; }
  if (search) { where += ' AND (l.contact_name ILIKE :search OR l.company_name ILIKE :search OR l.contact_email ILIKE :search)'; params.search = `%${search}%`; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_leads l ${where}`, params);
  const leads = await q(`
    SELECT l.*, t.name as territory_name
    FROM sfa_leads l
    LEFT JOIN sfa_territories t ON l.territory_id = t.id
    ${where}
    ORDER BY l.created_at DESC
    LIMIT :limit OFFSET :offset
  `, params);

  return res.json({ success: true, rows: leads, total: parseInt(total?.cnt || '0'), page, limit });
}

async function getLeadDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const lead = await qOne(`SELECT l.*, t.name as territory_name FROM sfa_leads l LEFT JOIN sfa_territories t ON l.territory_id = t.id WHERE l.id = :id AND l.tenant_id = :tid`, { id, tid: tenantId });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const activities = await q(`SELECT * FROM sfa_activities WHERE lead_id = :id AND tenant_id = :tid ORDER BY activity_date DESC`, { id, tid: tenantId });
  const visits = await q(`SELECT * FROM sfa_visits WHERE lead_id = :id AND tenant_id = :tid ORDER BY visit_date DESC`, { id, tid: tenantId });
  const opportunities = await q(`SELECT * FROM sfa_opportunities WHERE lead_id = :id AND tenant_id = :tid ORDER BY created_at DESC`, { id, tid: tenantId });

  return res.json({ success: true, data: { ...lead, activities, visits, opportunities } });
}

async function createLead(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { company_name, contact_name, contact_email, contact_phone, contact_title, industry, company_size, source, priority, estimated_value, territory_id, address, city, province, notes, tags, custom_fields } = req.body;
  if (!contact_name) return res.status(400).json({ success: false, error: 'contact_name required' });

  // Auto-generate lead number
  const count = await qOne(`SELECT COUNT(*) as cnt FROM sfa_leads WHERE tenant_id = :tid`, { tid: tenantId });
  const leadNumber = `LD-${String(parseInt(count?.cnt || 0) + 1).padStart(4, '0')}`;

  const ok = await qExec(`
    INSERT INTO sfa_leads (tenant_id, lead_number, company_name, contact_name, contact_email, contact_phone, contact_title, industry, company_size, source, priority, estimated_value, territory_id, address, city, province, notes, tags, custom_fields, created_by, score)
    VALUES (:tenantId, :leadNumber, :company_name, :contact_name, :contact_email, :contact_phone, :contact_title, :industry, :company_size, :source, :priority, :estimated_value, :territory_id, :address, :city, :province, :notes, :tags, :custom_fields, :userId, :score)
  `, {
    tenantId, leadNumber, company_name: company_name || '', contact_name, contact_email: contact_email || '', contact_phone: contact_phone || '', contact_title: contact_title || '', industry: industry || '', company_size: company_size || '', source: source || 'manual', priority: priority || 'medium', estimated_value: estimated_value || 0, territory_id: territory_id || null, address: address || '', city: city || '', province: province || '', notes: notes || '', tags: JSON.stringify(tags || []), custom_fields: JSON.stringify(custom_fields || {}), userId: session.user.id, score: priority === 'high' ? 80 : priority === 'medium' ? 50 : 30
  });

  return ok
    ? res.status(201).json({ success: true, message: 'Lead berhasil dibuat' })
    : res.status(500).json({ success: false, error: 'Failed to create lead' });
}

async function updateLead(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sets: string[] = [];
  const params: any = { id };
  const allowed = ['company_name', 'contact_name', 'contact_email', 'contact_phone', 'contact_title', 'industry', 'company_size', 'source', 'status', 'priority', 'estimated_value', 'territory_id', 'address', 'city', 'province', 'notes', 'score', 'next_follow_up', 'lost_reason'];
  for (const key of allowed) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  if (data.tags) { sets.push('tags = :tags'); params.tags = JSON.stringify(data.tags); }
  if (data.custom_fields) { sets.push('custom_fields = :custom_fields'); params.custom_fields = JSON.stringify(data.custom_fields); }
  sets.push('updated_at = NOW()');
  sets.push('updated_by = :userId');
  params.userId = session.user.id;

  if (data.status === 'lost') sets.push('lost_reason = COALESCE(:lost_reason, lost_reason)');
  
  const ok = await qExec(`UPDATE sfa_leads SET ${sets.join(', ')} WHERE id = :id`, params);
  return ok ? res.json({ success: true, message: 'Lead diperbarui' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function convertLead(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { lead_id, opportunity_title, expected_value, expected_close_date } = req.body;
  if (!lead_id) return res.status(400).json({ success: false, error: 'lead_id required' });

  const lead = await qOne(`SELECT * FROM sfa_leads WHERE id = :lead_id AND tenant_id = :tid`, { lead_id, tid: tenantId });
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  // Create opportunity from lead
  const count = await qOne(`SELECT COUNT(*) as cnt FROM sfa_opportunities WHERE tenant_id = :tid`, { tid: tenantId });
  const oppNumber = `OPP-${String(parseInt(count?.cnt || 0) + 1).padStart(4, '0')}`;

  await qExec(`
    INSERT INTO sfa_opportunities (tenant_id, lead_id, opportunity_number, title, customer_name, contact_name, contact_email, contact_phone, stage, expected_value, expected_close_date, territory_id, source, created_by)
    VALUES (:tenantId, :lead_id, :oppNumber, :title, :company, :contact, :email, :phone, 'qualification', :value, :closeDate, :territory_id, :source, :userId)
  `, {
    tenantId, lead_id, oppNumber, title: opportunity_title || `Opportunity - ${lead.company_name || lead.contact_name}`, company: lead.company_name, contact: lead.contact_name, email: lead.contact_email, phone: lead.contact_phone, value: expected_value || lead.estimated_value, closeDate: expected_close_date || null, territory_id: lead.territory_id, source: lead.source, userId: session.user.id
  });

  // Update lead status
  await qExec(`UPDATE sfa_leads SET status = 'converted', converted_at = NOW(), updated_at = NOW() WHERE id = :lead_id`, { lead_id });

  return res.json({ success: true, message: 'Lead berhasil dikonversi menjadi opportunity' });
}

async function deleteLead(_req: NextApiRequest, res: NextApiResponse, id: string, tenantId?: string) {
  const ok = await qExec(`UPDATE sfa_leads SET is_deleted = true, deleted_at = NOW() WHERE id = :id${tenantId ? ' AND tenant_id = :tid' : ''}`, { id, tid: tenantId });
  return ok ? res.json({ success: true, message: 'Deleted' }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  OPPORTUNITIES / PIPELINE
// ════════════════════════════════════════════════════════════════
async function getOpportunities(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { stage, status, search } = req.query;
  let where = 'WHERE o.tenant_id = :tid AND o.is_deleted IS NOT TRUE';
  const params: any = { tid: tenantId };
  if (stage) { where += ' AND o.stage = :stage'; params.stage = stage; }
  if (status) { where += ' AND o.status = :status'; params.status = status; }
  if (search) { where += ' AND (o.title ILIKE :search OR o.customer_name ILIKE :search)'; params.search = `%${search}%`; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_opportunities o ${where}`, params);
  const opps = await q(`SELECT o.*, t.name as territory_name FROM sfa_opportunities o LEFT JOIN sfa_territories t ON o.territory_id = t.id ${where} ORDER BY o.expected_value DESC LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: opps, total: parseInt(total?.cnt || '0'), page, limit });
}

async function getPipeline(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const stages = await q(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(expected_value), 0) as value, AVG(probability) as avg_probability
    FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'
    GROUP BY stage ORDER BY 
      CASE stage WHEN 'qualification' THEN 1 WHEN 'needs_analysis' THEN 2 WHEN 'proposal' THEN 3 WHEN 'negotiation' THEN 4 WHEN 'closed_won' THEN 5 WHEN 'closed_lost' THEN 6 ELSE 7 END
  `, { tid });
  const total = await qOne(`SELECT COALESCE(SUM(expected_value), 0) as value, COUNT(*) as count FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'`, { tid });
  const weighted = await qOne(`SELECT COALESCE(SUM(expected_value * probability / 100), 0) as value FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'`, { tid });

  return res.json({ success: true, data: { stages, totalValue: parseFloat(total?.value || 0), totalCount: parseInt(total?.count || 0), weightedValue: parseFloat(weighted?.value || 0) } });
}

async function createOpportunity(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { title, customer_name, contact_name, contact_email, contact_phone, stage, expected_value, expected_close_date, lead_id, territory_id, product_interest, notes, priority } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title required' });

  const count = await qOne(`SELECT COUNT(*) as cnt FROM sfa_opportunities WHERE tenant_id = :tid`, { tid: tenantId });
  const oppNumber = `OPP-${String(parseInt(count?.cnt || 0) + 1).padStart(4, '0')}`;

  const ok = await qExec(`
    INSERT INTO sfa_opportunities (tenant_id, opportunity_number, title, customer_name, contact_name, contact_email, contact_phone, stage, expected_value, expected_close_date, lead_id, territory_id, product_interest, notes, priority, probability, created_by)
    VALUES (:tenantId, :oppNumber, :title, :customer_name, :contact_name, :contact_email, :contact_phone, :stage, :expected_value, :expected_close_date, :lead_id, :territory_id, :product_interest, :notes, :priority, :probability, :userId)
  `, {
    tenantId, oppNumber, title, customer_name: customer_name || '', contact_name: contact_name || '', contact_email: contact_email || '', contact_phone: contact_phone || '', stage: stage || 'qualification', expected_value: expected_value || 0, expected_close_date: expected_close_date || null, lead_id: lead_id || null, territory_id: territory_id || null, product_interest: product_interest || '', notes: notes || '', priority: priority || 'medium', probability: stage === 'qualification' ? 10 : stage === 'proposal' ? 40 : stage === 'negotiation' ? 70 : 10, userId: session.user.id
  });

  return ok ? res.status(201).json({ success: true, message: 'Opportunity berhasil dibuat' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function updateOpportunity(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sets: string[] = [];
  const params: any = { id };
  const allowed = ['title', 'customer_name', 'contact_name', 'contact_email', 'contact_phone', 'stage', 'status', 'priority', 'probability', 'expected_value', 'actual_value', 'expected_close_date', 'actual_close_date', 'product_interest', 'notes', 'next_action', 'next_action_date', 'lost_reason', 'won_reason', 'territory_id'];
  for (const key of allowed) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  sets.push('updated_at = NOW(), updated_by = :userId, last_activity_at = NOW()');
  params.userId = session.user.id;

  if (data.status === 'won') { sets.push('actual_close_date = COALESCE(:actual_close_date, NOW())'); }

  const ok = await qExec(`UPDATE sfa_opportunities SET ${sets.join(', ')} WHERE id = :id`, params);
  return ok ? res.json({ success: true, message: 'Opportunity diperbarui' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function deleteOpportunity(_req: NextApiRequest, res: NextApiResponse, id: string, tenantId?: string) {
  const ok = await qExec(`UPDATE sfa_opportunities SET is_deleted = true, deleted_at = NOW() WHERE id = :id${tenantId ? ' AND tenant_id = :tid' : ''}`, { id, tid: tenantId });
  return ok ? res.json({ success: true, message: 'Deleted' }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  ACTIVITIES
// ════════════════════════════════════════════════════════════════
async function getActivities(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { status, type, lead_id, opportunity_id } = req.query;
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  const params: any = { tid: tenantId };
  if (status) { where += ' AND status = :status'; params.status = status; }
  if (type) { where += ' AND activity_type = :type'; params.type = type; }
  if (lead_id) { where += ' AND lead_id = :lead_id'; params.lead_id = lead_id; }
  if (opportunity_id) { where += ' AND opportunity_id = :opp_id'; params.opp_id = opportunity_id; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_activities ${where}`, params);
  const activities = await q(`SELECT * FROM sfa_activities ${where} ORDER BY activity_date DESC LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: activities, total: parseInt(total?.cnt || '0'), page, limit });
}

async function createActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { activity_type, subject, description, lead_id, opportunity_id, activity_date, duration_minutes, location, contact_name, contact_phone, priority } = req.body;
  if (!subject || !activity_type) return res.status(400).json({ success: false, error: 'subject and activity_type required' });

  const ok = await qExec(`
    INSERT INTO sfa_activities (tenant_id, lead_id, opportunity_id, activity_type, subject, description, activity_date, duration_minutes, location, contact_name, contact_phone, priority, assigned_to, created_by)
    VALUES (:tenantId, :lead_id, :opportunity_id, :activity_type, :subject, :description, :activity_date, :duration_minutes, :location, :contact_name, :contact_phone, :priority, :userId, :userId)
  `, {
    tenantId, lead_id: lead_id || null, opportunity_id: opportunity_id || null, activity_type, subject, description: description || '', activity_date: activity_date || new Date().toISOString(), duration_minutes: duration_minutes || 30, location: location || '', contact_name: contact_name || '', contact_phone: contact_phone || '', priority: priority || 'medium', userId: session.user.id
  });

  // Update last_activity_at on lead/opportunity
  if (lead_id) await qExec(`UPDATE sfa_leads SET last_activity_at = NOW() WHERE id = :lead_id`, { lead_id });
  if (opportunity_id) await qExec(`UPDATE sfa_opportunities SET last_activity_at = NOW() WHERE id = :opportunity_id`, { opportunity_id });

  return ok ? res.status(201).json({ success: true, message: 'Aktivitas berhasil dicatat' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function updateActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const sets: string[] = [];
  const params: any = { id };
  const allowed = ['activity_type', 'subject', 'description', 'status', 'priority', 'activity_date', 'duration_minutes', 'location', 'outcome', 'outcome_notes'];
  for (const key of allowed) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  if (data.status === 'completed') sets.push('completed_at = NOW()');
  sets.push('updated_at = NOW(), updated_by = :userId');
  params.userId = session.user.id;

  const ok = await qExec(`UPDATE sfa_activities SET ${sets.join(', ')} WHERE id = :id`, params);
  return ok ? res.json({ success: true, message: 'Aktivitas diperbarui' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function deleteActivity(_req: NextApiRequest, res: NextApiResponse, id: string, tenantId?: string) {
  const ok = await qExec(`UPDATE sfa_activities SET is_deleted = true, deleted_at = NOW() WHERE id = :id${tenantId ? ' AND tenant_id = :tid' : ''}`, { id, tid: tenantId });
  return ok ? res.json({ success: true, message: 'Deleted' }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  VISITS (GPS-tracked)
// ════════════════════════════════════════════════════════════════
async function getVisits(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { salesperson_id, status, date_from, date_to } = req.query;
  let where = 'WHERE v.tenant_id = :tid';
  const params: any = { tid: tenantId };
  if (salesperson_id) { where += ' AND v.salesperson_id = :sp'; params.sp = salesperson_id; }
  if (status) { where += ' AND v.status = :status'; params.status = status; }
  if (date_from) { where += ' AND v.visit_date >= :from'; params.from = date_from; }
  if (date_to) { where += ' AND v.visit_date <= :to'; params.to = date_to; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_visits v ${where}`, params);
  const visits = await q(`
    SELECT v.*,
      u.name AS salesperson_name,
      (SELECT ct.id::text FROM crm_tasks ct
        WHERE ct.tenant_id = v.tenant_id AND ct.sfa_visit_id = v.id
        ORDER BY ct.created_at DESC NULLS LAST LIMIT 1) AS linked_crm_task_id
    FROM sfa_visits v
    LEFT JOIN users u ON u.id = v.salesperson_id
    ${where}
    ORDER BY v.visit_date DESC, v.check_in_time DESC NULLS LAST
    LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: visits, total: parseInt(total?.cnt || '0'), page, limit });
}

async function createVisit(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { salesperson_id, lead_id, opportunity_id, customer_name, visit_type, purpose, visit_date } = req.body;
  const vdate = visit_date || new Date().toISOString().split('T')[0];
  const sp = salesperson_id != null && salesperson_id !== '' ? Number(salesperson_id) : Number(session?.user?.id) || 0;
  const rows = await q(`
    INSERT INTO sfa_visits (tenant_id, salesperson_id, lead_id, opportunity_id, customer_name, visit_type, purpose, visit_date, status)
    VALUES (:tenantId, :sp, :lead_id, :opp_id, :customer_name, :visit_type, :purpose, :visit_date, 'planned')
    RETURNING id, customer_name, purpose, visit_date, salesperson_id
  `, {
    tenantId, sp, lead_id: lead_id || null, opp_id: opportunity_id || null, customer_name: customer_name || '', visit_type: visit_type || 'regular', purpose: purpose || '', visit_date: vdate,
  });
  const row = rows[0];
  if (row?.id) {
    await ensureVisitLinkedTask({
      tenantId,
      visit: {
        id: row.id,
        customer_name: row.customer_name || customer_name,
        purpose: row.purpose || purpose,
        visit_date: row.visit_date || vdate,
        salesperson_id: row.salesperson_id ?? sp,
      },
      createdByUserId: session?.user?.id != null ? Number(session.user.id) : null,
      assigneeUserId: sp || (session?.user?.id != null ? Number(session.user.id) : null),
    });
  }
  return rows.length
    ? res.status(201).json({ success: true, message: 'Kunjungan dijadwalkan', data: { id: row.id } })
    : res.status(500).json({ success: false, error: 'Failed' });
}

async function checkinVisit(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { visit_id, lat, lng, address, photo_url } = req.body;
  if (!visit_id) return res.status(400).json({ success: false, error: 'visit_id required' });

  const ok = await qExec(`
    UPDATE sfa_visits SET status = 'in_progress', check_in_time = NOW(), check_in_lat = :lat, check_in_lng = :lng, check_in_address = :address, check_in_photo_url = :photo
    WHERE id = :visit_id AND tenant_id = :tid
  `, { visit_id, lat: lat || null, lng: lng || null, address: address || '', photo: photo_url || '', tid: tenantId });

  if (ok) await syncTaskStatusFromVisit(tenantId, visit_id);
  return ok ? res.json({ success: true, message: 'Check-in berhasil' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function checkoutVisit(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { visit_id, lat, lng, address, photo_url, outcome, outcome_notes, order_taken, order_value, feedback, next_visit_date } = req.body;
  if (!visit_id) return res.status(400).json({ success: false, error: 'visit_id required' });

  const ok = await qExec(`
    UPDATE sfa_visits SET status = 'completed', check_out_time = NOW(), check_out_lat = :lat, check_out_lng = :lng, check_out_address = :address, check_out_photo_url = :photo,
      outcome = :outcome, outcome_notes = :notes, order_taken = :order_taken, order_value = :order_value, feedback = :feedback, next_visit_date = :next_date,
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - check_in_time))::integer / 60
    WHERE id = :visit_id AND tenant_id = :tid
  `, {
    visit_id, tid: tenantId, lat: lat || null, lng: lng || null, address: address || '', photo: photo_url || '', outcome: outcome || 'no_order', notes: outcome_notes || '', order_taken: order_taken || false, order_value: order_value || 0, feedback: feedback || '', next_date: next_visit_date || null,
  });

  if (ok) await syncTaskStatusFromVisit(tenantId, visit_id);
  return ok ? res.json({ success: true, message: 'Check-out berhasil' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function updateVisit(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const sets: string[] = [];
  const params: any = { id };
  for (const key of ['customer_name', 'visit_type', 'purpose', 'visit_date', 'status', 'outcome', 'outcome_notes', 'feedback', 'next_visit_date']) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE sfa_visits SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { ...params, tid: tenantId });
  if (ok && data.status !== undefined) await syncTaskStatusFromVisit(tenantId, id);
  return ok ? res.json({ success: true }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  TARGETS
// ════════════════════════════════════════════════════════════════
async function getTargets(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { period, target_type } = req.query;
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  const params: any = { tid: tenantId };
  if (period) { where += ' AND period = :period'; params.period = period; }
  if (target_type) { where += ' AND target_type = :target_type'; params.target_type = target_type; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_targets ${where}`, params);
  const targets = await q(`SELECT * FROM sfa_targets ${where} ORDER BY period DESC, target_type LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: targets, total: parseInt(total?.cnt || '0'), page, limit });
}

async function createTarget(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { target_type, period_type, period, target_value, unit, branch_id, territory_id, assigned_to, product_category, customer_segment, notes } = req.body;
  if (!target_type || !period || !target_value) return res.status(400).json({ success: false, error: 'target_type, period, target_value required' });

  const ok = await qExec(`
    INSERT INTO sfa_targets (tenant_id, branch_id, territory_id, target_type, period_type, period, assigned_to, target_value, unit, product_category, customer_segment, notes, created_by)
    VALUES (:tenantId, :branch_id, :territory_id, :target_type, :period_type, :period, :assigned_to, :target_value, :unit, :product_category, :customer_segment, :notes, :userId)
  `, {
    tenantId, branch_id: branch_id || null, territory_id: territory_id || null, target_type, period_type: period_type || 'monthly', period, assigned_to: assigned_to || null, target_value, unit: unit || 'IDR', product_category: product_category || '', customer_segment: customer_segment || '', notes: notes || '', userId: session.user.id
  });

  return ok ? res.status(201).json({ success: true, message: 'Target berhasil dibuat' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function updateTarget(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const sets: string[] = [];
  const params: any = { id };
  for (const key of ['target_value', 'actual_value', 'achievement_pct', 'status', 'notes']) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  // Auto-calculate achievement
  if (data.actual_value !== undefined && data.target_value !== undefined) {
    sets.push('achievement_pct = CASE WHEN :target_value > 0 THEN (:actual_value / :target_value * 100) ELSE 0 END');
  }
  sets.push('updated_at = NOW(), updated_by = :userId');
  params.userId = session.user.id;
  const ok = await qExec(`UPDATE sfa_targets SET ${sets.join(', ')} WHERE id = :id`, params);
  return ok ? res.json({ success: true }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  QUOTATIONS
// ════════════════════════════════════════════════════════════════
async function getQuotations(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { status } = req.query;
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  const params: any = { tid: tenantId };
  if (status) { where += ' AND status = :status'; params.status = status; }

  const { limit, offset, page } = getPagination(req.query);
  params.limit = limit;
  params.offset = offset;

  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_quotations ${where}`, params);
  const quots = await q(`SELECT * FROM sfa_quotations ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: quots, total: parseInt(total?.cnt || '0'), page, limit });
}

async function createQuotation(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { customer_name, customer_email, customer_phone, customer_address, opportunity_id, lead_id, valid_until, items, notes, terms_conditions, discount_type, discount_value } = req.body;
  if (!customer_name || !items || items.length === 0) return res.status(400).json({ success: false, error: 'customer_name and items required' });

  const count = await qOne(`SELECT COUNT(*) as cnt FROM sfa_quotations WHERE tenant_id = :tid`, { tid: tenantId });
  const quotNumber = `QT-${new Date().getFullYear()}${String(parseInt(count?.cnt || 0) + 1).padStart(4, '0')}`;

  let subtotal = 0;
  for (const item of items) { subtotal += (item.quantity || 1) * (item.unit_price || 0); }
  const discountAmt = discount_type === 'percentage' ? subtotal * (discount_value || 0) / 100 : (discount_value || 0);
  const taxAmt = (subtotal - discountAmt) * 0.11;
  const total = subtotal - discountAmt + taxAmt;

  // Create quotation
  const quotRows = await q(`
    INSERT INTO sfa_quotations (tenant_id, quotation_number, opportunity_id, lead_id, customer_name, customer_email, customer_phone, customer_address, salesperson_id, valid_until, subtotal, discount_type, discount_value, discount_amount, tax_amount, total, notes, terms_conditions, created_by)
    VALUES (:tenantId, :quotNumber, :opportunity_id, :lead_id, :customer_name, :customer_email, :customer_phone, :customer_address, :sp, :valid_until, :subtotal, :discount_type, :discount_value, :discount_amount, :tax_amount, :total, :notes, :terms, :userId)
    RETURNING id
  `, {
    tenantId, quotNumber, opportunity_id: opportunity_id || null, lead_id: lead_id || null, customer_name, customer_email: customer_email || '', customer_phone: customer_phone || '', customer_address: customer_address || '', sp: session.user.id, valid_until: valid_until || null, subtotal, discount_type: discount_type || 'amount', discount_value: discount_value || 0, discount_amount: discountAmt, tax_amount: taxAmt, total, notes: notes || '', terms: terms_conditions || '', userId: session.user.id
  });

  if (quotRows[0]?.id) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemSubtotal = (item.quantity || 1) * (item.unit_price || 0);
      await qExec(`
        INSERT INTO sfa_quotation_items (quotation_id, product_id, product_name, product_sku, description, quantity, unit, unit_price, discount_pct, subtotal, sort_order)
        VALUES (:qid, :product_id, :product_name, :sku, :desc, :qty, :unit, :price, :disc, :subtotal, :sort)
      `, {
        qid: quotRows[0].id, product_id: item.product_id || null, product_name: item.product_name || '', sku: item.product_sku || '', desc: item.description || '', qty: item.quantity || 1, unit: item.unit || 'pcs', price: item.unit_price || 0, disc: item.discount_pct || 0, subtotal: itemSubtotal, sort: i
      });
    }
  }

  return res.status(201).json({ success: true, message: 'Quotation berhasil dibuat', data: { quotation_number: quotNumber } });
}

async function updateQuotation(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const sets: string[] = [];
  const params: any = { id };
  for (const key of ['status', 'valid_until', 'notes', 'terms_conditions', 'rejected_reason']) {
    if (data[key] !== undefined) { sets.push(`${key} = :${key}`); params[key] = data[key]; }
  }
  if (data.status === 'approved') { sets.push('approved_by = :userId, approved_at = NOW()'); }
  if (data.status === 'sent') { sets.push('sent_at = NOW()'); }
  sets.push('updated_at = NOW(), updated_by = :userId');
  params.userId = session.user.id;
  const ok = await qExec(`UPDATE sfa_quotations SET ${sets.join(', ')} WHERE id = :id`, params);
  return ok ? res.json({ success: true }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function deleteQuotation(_req: NextApiRequest, res: NextApiResponse, id: string, tenantId?: string) {
  await qExec(`UPDATE sfa_quotation_items SET is_deleted = true, deleted_at = NOW() WHERE quotation_id = :id`, { id });
  const ok = await qExec(`UPDATE sfa_quotations SET is_deleted = true, deleted_at = NOW() WHERE id = :id${tenantId ? ' AND tenant_id = :tid' : ''}`, { id, tid: tenantId });
  return ok ? res.json({ success: true, message: 'Deleted' }) : res.status(500).json({ success: false, error: 'Failed' });
}

// ════════════════════════════════════════════════════════════════
// ██  TERRITORIES & ROUTE PLANS
// ════════════════════════════════════════════════════════════════
async function getTerritories(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { limit, offset, page } = getPagination(_req.query);
  const params: any = { tid: tenantId, limit, offset };
  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_territories WHERE tenant_id = :tid`, { tid: tenantId });
  const territories = await q(`SELECT * FROM sfa_territories WHERE tenant_id = :tid ORDER BY code LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: territories, total: parseInt(total?.cnt || '0'), page, limit });
}

async function createTerritory(req: NextApiRequest, res: NextApiResponse, tenantId: string, session: any) {
  const { code, name, region, city, province, description } = req.body;
  if (!code || !name) return res.status(400).json({ success: false, error: 'code and name required' });
  const ok = await qExec(`
    INSERT INTO sfa_territories (tenant_id, code, name, region, city, province, description)
    VALUES (:tenantId, :code, :name, :region, :city, :province, :desc)
  `, { tenantId, code, name, region: region || '', city: city || '', province: province || '', desc: description || '' });
  return ok ? res.status(201).json({ success: true, message: 'Territory berhasil dibuat' }) : res.status(500).json({ success: false, error: 'Failed' });
}

async function getRoutePlans(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { limit, offset, page } = getPagination(req.query);
  const params: any = { tid: tenantId, limit, offset };
  const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_route_plans WHERE tenant_id = :tid`, { tid: tenantId });
  const plans = await q(`SELECT * FROM sfa_route_plans WHERE tenant_id = :tid ORDER BY name LIMIT :limit OFFSET :offset`, params);
  return res.json({ success: true, rows: plans, total: parseInt(total?.cnt || '0'), page, limit });
}

// ════════════════════════════════════════════════════════════════
// ██  UNIFIED DASHBOARD (combines core + enhanced + advanced)
// ════════════════════════════════════════════════════════════════
async function getUnifiedDashboard(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  // Core metrics
  const tid = tenantId;
  const leadCount = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'new') as new_leads, COUNT(*) FILTER (WHERE status = 'converted') as converted FROM sfa_leads WHERE tenant_id = :tid`, { tid });
  const pipelineTotal = await qOne(`SELECT COALESCE(SUM(expected_value), 0) as value, COUNT(*) as count FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'`, { tid });
  const visitStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM sfa_visits WHERE tenant_id = :tid AND visit_date >= :mstart`, { tid, mstart: monthStart });
  const convRate = await qOne(`SELECT COUNT(*) FILTER (WHERE status = 'converted') as converted, COUNT(*) as total FROM sfa_leads WHERE tenant_id = :tid`, { tid });

  // Enhanced metrics
  const teamCount = await qOne(`SELECT COUNT(*) as total FROM sfa_teams WHERE tenant_id = :tid AND is_active = true`, { tid });
  const targetStats = await qOne(`SELECT COUNT(*) as groups, (SELECT COUNT(*) FROM sfa_target_assignments WHERE tenant_id = :tid AND status = 'active') as assignments FROM sfa_target_groups WHERE tenant_id = :tid AND status = 'active'`, { tid });
  const incentiveStats = await qOne(`SELECT COUNT(*) as schemes, (SELECT COUNT(*) FROM sfa_incentive_calculations WHERE tenant_id = :tid AND status = 'pending') as pending_calcs FROM sfa_incentive_schemes WHERE tenant_id = :tid AND is_active = true`, { tid });

  // Advanced metrics
  const coverageStats = await qOne(`SELECT COUNT(*) as total_coverage, COUNT(*) FILTER (WHERE next_planned_visit < :today) as overdue_visits FROM sfa_coverage_assignments WHERE tenant_id = :tid AND status = 'active'`, { tid, today });
  const foStats = await qOne(`SELECT COUNT(*) as orders, COALESCE(SUM(total),0) as revenue FROM sfa_field_orders WHERE tenant_id = :tid AND order_date >= :mstart AND status != 'rejected'`, { tid, mstart: monthStart });
  const auditStats = await qOne(`SELECT COUNT(*) as audits, COALESCE(AVG(compliance_pct),0) as avg_compliance FROM sfa_display_audits WHERE tenant_id = :tid AND audit_date >= :mstart`, { tid, mstart: monthStart });
  const compStats = await qOne(`SELECT COUNT(*) as reports, COUNT(*) FILTER (WHERE resolved = false) as unresolved FROM sfa_competitor_activities WHERE tenant_id = :tid AND reported_date >= :mstart`, { tid, mstart: monthStart });
  const approvalStats = await qOne(`SELECT COUNT(*) as pending FROM sfa_approval_requests WHERE tenant_id = :tid AND status = 'pending'`, { tid });
  const surveyStats = await qOne(`SELECT COUNT(*) as completed FROM sfa_survey_responses WHERE tenant_id = :tid AND response_date >= :mstart`, { tid, mstart: monthStart });

  return res.json({
    success: true,
    data: {
      // Sales
      totalLeads: parseInt(leadCount?.total || 0),
      newLeads: parseInt(leadCount?.new_leads || 0),
      convertedLeads: parseInt(leadCount?.converted || 0),
      conversionRate: convRate?.total > 0 ? ((convRate.converted / convRate.total) * 100).toFixed(1) : '0',
      pipelineValue: parseFloat(pipelineTotal?.value || 0),
      pipelineCount: parseInt(pipelineTotal?.count || 0),
      // Visits
      visitsThisMonth: parseInt(visitStats?.total || 0),
      visitsCompleted: parseInt(visitStats?.completed || 0),
      // Teams
      activeTeams: parseInt(teamCount?.total || 0),
      // Targets
      targetGroups: parseInt(targetStats?.groups || 0),
      targetAssignments: parseInt(targetStats?.assignments || 0),
      // Incentives
      incentiveSchemes: parseInt(incentiveStats?.schemes || 0),
      pendingIncentives: parseInt(incentiveStats?.pending_calcs || 0),
      // Coverage
      totalCoverage: parseInt(coverageStats?.total_coverage || 0),
      overdueVisits: parseInt(coverageStats?.overdue_visits || 0),
      // Field Orders
      fieldOrdersThisMonth: parseInt(foStats?.orders || 0),
      fieldOrderRevenue: parseFloat(foStats?.revenue || 0),
      // Audits
      auditsThisMonth: parseInt(auditStats?.audits || 0),
      avgCompliance: parseFloat(auditStats?.avg_compliance || 0),
      // Competitor
      competitorReports: parseInt(compStats?.reports || 0),
      unresolvedCompetitor: parseInt(compStats?.unresolved || 0),
      // Approvals
      pendingApprovals: parseInt(approvalStats?.pending || 0),
      // Surveys
      surveysCompleted: parseInt(surveyStats?.completed || 0),
    }
  });
}

export default withModuleGuard('sfa', handler);
