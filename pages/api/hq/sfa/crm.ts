import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(query: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(query, replacements ? { replacements } : undefined);
    return rows;
  } catch (e: any) {
    console.error('CRM Query Error:', e.message);
    return [];
  }
}

async function qOne(query: string, replacements?: any): Promise<any> {
  const rows = await q(query, replacements);
  return rows[0] || null;
}

async function qExec(query: string, replacements?: any): Promise<string | null> {
  if (!sequelize) return 'Database not available';
  try {
    await sequelize.query(query, replacements ? { replacements } : undefined);
    return null;
  } catch (e: any) {
    console.error('CRM Exec Error:', e.message);
    return e.message || 'Database error';
  }
}

function generateNumber(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

/** Extract pagination params from request query */
function getPagination(qry: any): { limit: number; offset: number; page: number } {
  const page = Math.max(parseInt(String(qry.page || '1'), 10) || 1, 1);
  const limit = Math.min(parseInt(String(qry.limit || '50'), 10) || 50, 1000);
  return { limit, offset: (page - 1) * limit, page };
}

export async function crmApiHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id || null;
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);

    // Manager-only actions
    const MANAGER_ONLY_ACTIONS = ['create-automation-rule', 'update-automation-rule', 'create-sla-policy', 'create-segment'];
    if (!isManager && typeof action === 'string' && MANAGER_ONLY_ACTIONS.includes(action)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Manager/Admin yang bisa melakukan aksi ini.' });
    }

    // ── GET routes ──
    if (req.method === 'GET') {
      switch (action) {
        // ═══ CRM Dashboard ═══
        case 'crm-dashboard': return getCrmDashboard(req, res, tenantId);
        // ═══ Customer 360° ═══
        case 'customers': return getCustomers(req, res, tenantId);
        case 'customer-detail': return getCustomerDetail(req, res, tenantId);
        case 'customer-timeline': return getCustomerTimeline(req, res, tenantId);
        case 'contacts': return getContacts(req, res, tenantId);
        case 'segments': return getSegments(req, res, tenantId);
        case 'customer-analytics': return getCustomerAnalytics(req, res, tenantId);
        // ═══ Communication ═══
        case 'communications': return getCommunications(req, res, tenantId);
        case 'follow-ups': return getFollowUps(req, res, tenantId);
        case 'email-templates': return getEmailTemplates(req, res, tenantId);
        case 'comm-campaigns': return getCommCampaigns(req, res, tenantId);
        // ═══ Tasks ═══
        case 'tasks': return getTasks(req, res, tenantId);
        case 'task-summary': return getTaskSummary(req, res, tenantId);
        case 'calendar-events': return getCalendarEvents(req, res, tenantId);
        // ═══ Forecasting ═══
        case 'forecasts': return getForecasts(req, res, tenantId);
        case 'deal-scores': return getDealScores(req, res, tenantId);
        case 'forecast-analytics': return getForecastAnalytics(req, res, tenantId);
        // ═══ Service ═══
        case 'tickets': return getTickets(req, res, tenantId);
        case 'ticket-detail': return getTicketDetail(req, res, tenantId);
        case 'sla-policies': return getSlaPolicies(req, res, tenantId);
        case 'satisfaction': return getSatisfaction(req, res, tenantId);
        case 'service-analytics': return getServiceAnalytics(req, res, tenantId);
        // ═══ Automation ═══
        case 'automation-rules': return getAutomationRules(req, res, tenantId);
        case 'automation-logs': return getAutomationLogs(req, res, tenantId);
        // ═══ Documents ═══
        case 'documents': return getDocuments(req, res, tenantId);
        case 'document-templates': return getDocumentTemplates(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── Audit helper: maps action query to entity type ──
    const actionEntityMap: Record<string, string> = {
      'create-customer': 'crm_customer', 'update-customer': 'crm_customer', 'delete-customer': 'crm_customer',
      'create-contact': 'crm_contact', 'update-contact': 'crm_contact', 'delete-contact': 'crm_contact',
      'create-interaction': 'crm_interaction',
      'create-communication': 'crm_communication', 'update-communication': 'crm_communication', 'delete-communication': 'crm_communication',
      'create-follow-up': 'crm_follow_up', 'update-follow-up': 'crm_follow_up', 'delete-follow-up': 'crm_follow_up',
      'create-task': 'crm_task', 'update-task': 'crm_task', 'delete-task': 'crm_task',
      'create-calendar-event': 'crm_calendar_event', 'update-calendar-event': 'crm_calendar_event', 'delete-calendar-event': 'crm_calendar_event',
      'create-ticket': 'crm_ticket', 'update-ticket': 'crm_ticket', 'delete-ticket': 'crm_ticket',
      'create-ticket-comment': 'crm_ticket_comment',
      'create-forecast': 'crm_forecast', 'update-forecast': 'crm_forecast', 'delete-forecast': 'crm_forecast',
      'create-document': 'crm_document', 'update-document': 'crm_document', 'delete-document': 'crm_document',
      'create-automation-rule': 'crm_automation_rule', 'update-automation-rule': 'crm_automation_rule', 'delete-automation-rule': 'crm_automation_rule',
      'create-segment': 'crm_segment', 'delete-segment': 'crm_segment',
      'create-email-template': 'crm_email_template', 'delete-email-template': 'crm_email_template',
      'create-sla-policy': 'crm_sla_policy',
    };
    const auditEntityType = actionEntityMap[String(action)] || 'crm_unknown';
    const auditAction = req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : req.method === 'DELETE' ? 'delete' : '';

    // Fire-and-forget audit log for write operations
    const fireAudit = (entityId?: string) => {
      if (auditAction) {
        logAudit({
          tenantId, userId, userName: (session.user as any).name,
          action: auditAction as any, entityType: auditEntityType,
          entityId: entityId || req.body?.id || (req.query.id as string) || null,
          newValues: req.method !== 'DELETE' ? req.body : undefined,
          req,
        }).catch(() => {});
      }
    };

    // ── POST routes ──
    if (req.method === 'POST') {
      fireAudit();
      switch (action) {
        case 'create-customer': return createCustomer(req, res, tenantId, userId);
        case 'import-customers-csv':
          if (!isManager) return res.status(403).json({ success: false, error: 'Hanya Manager/Admin yang dapat import bulk.' });
          return importCustomersCsv(req, res, tenantId, userId);
        case 'create-contact': return createContact(req, res, tenantId, userId);
        case 'create-interaction': return createInteraction(req, res, tenantId, userId);
        case 'create-communication': return createCommunication(req, res, tenantId, userId);
        case 'create-follow-up': return createFollowUp(req, res, tenantId, userId);
        case 'create-task': return createTask(req, res, tenantId, userId);
        case 'create-calendar-event': return createCalendarEvent(req, res, tenantId, userId);
        case 'create-ticket': return createTicket(req, res, tenantId, userId);
        case 'create-ticket-comment': return createTicketComment(req, res, tenantId, userId);
        case 'create-forecast': return createForecast(req, res, tenantId, userId);
        case 'create-document': return createDocument(req, res, tenantId, userId);
        case 'create-automation-rule': return createAutomationRule(req, res, tenantId, userId);
        case 'create-segment': return createSegment(req, res, tenantId, userId);
        case 'create-email-template': return createEmailTemplate(req, res, tenantId, userId);
        case 'create-sla-policy': return createSlaPolicy(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── PUT routes ──
    if (req.method === 'PUT') {
      fireAudit();
      switch (action) {
        case 'update-customer': return updateCustomer(req, res, tenantId);
        case 'update-contact': return updateContact(req, res, tenantId);
        case 'update-communication': return updateCommunication(req, res, tenantId);
        case 'update-task': return updateTask(req, res, tenantId);
        case 'update-ticket': return updateTicket(req, res, tenantId);
        case 'update-follow-up': return updateFollowUp(req, res, tenantId);
        case 'update-forecast': return updateForecast(req, res, tenantId);
        case 'update-document': return updateDocument(req, res, tenantId);
        case 'update-calendar-event': return updateCalendarEvent(req, res, tenantId);
        case 'update-automation-rule': return updateAutomationRule(req, res, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── DELETE routes (manager-only, enforced above) ──
    if (req.method === 'DELETE') {
      if (!isManager) return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Manager/Admin yang bisa menghapus data.' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const entityId = String(id);
      fireAudit(entityId);
      switch (action) {
        case 'delete-customer': return deleteCrmEntity(res, 'crm_customers', entityId, tenantId);
        case 'delete-contact': return deleteCrmEntity(res, 'crm_contacts', entityId, tenantId);
        case 'delete-communication': return deleteCrmEntity(res, 'crm_communications', entityId, tenantId);
        case 'delete-follow-up': return deleteCrmEntity(res, 'crm_follow_ups', entityId, tenantId);
        case 'delete-task': return deleteCrmEntity(res, 'crm_tasks', entityId, tenantId);
        case 'delete-calendar-event': return deleteCrmEntity(res, 'crm_calendar_events', entityId, tenantId);
        case 'delete-ticket': return deleteCrmEntity(res, 'crm_tickets', entityId, tenantId);
        case 'delete-forecast': return deleteCrmEntity(res, 'crm_forecasts', entityId, tenantId);
        case 'delete-document': return deleteCrmEntity(res, 'crm_documents', entityId, tenantId);
        case 'delete-automation-rule': return deleteCrmEntity(res, 'crm_automation_rules', entityId, tenantId);
        case 'delete-segment': return deleteCrmEntity(res, 'crm_customer_segments', entityId, tenantId);
        case 'delete-email-template': return deleteCrmEntity(res, 'crm_email_templates', entityId, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('CRM API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

// ════════════════════════════════════════════════════════════════
// ██  CRM DASHBOARD
// ════════════════════════════════════════════════════════════════
async function getCrmDashboard(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const tid = tenantId;
  const customerStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE customer_status='active') as active, COUNT(*) FILTER (WHERE lifecycle_stage='customer') as paying, COALESCE(AVG(health_score),0) as avg_health, COALESCE(SUM(total_revenue),0) as total_rev FROM crm_customers WHERE tenant_id = :tid`, { tid });
  const newCustomers = await qOne(`SELECT COUNT(*) as count FROM crm_customers WHERE tenant_id = :tid AND created_at >= :mstart`, { tid, mstart: monthStart });
  const contactStats = await qOne(`SELECT COUNT(*) as total FROM crm_contacts WHERE tenant_id = :tid AND is_active=true`, { tid });
  const commStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE comm_type='call') as calls, COUNT(*) FILTER (WHERE comm_type='email') as emails, COUNT(*) FILTER (WHERE comm_type='meeting') as meetings FROM crm_communications WHERE tenant_id = :tid AND created_at >= :mstart`, { tid, mstart: monthStart });
  const taskStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open') as open, COUNT(*) FILTER (WHERE status='completed') as completed, COUNT(*) FILTER (WHERE status='open' AND due_date < :today) as overdue FROM crm_tasks WHERE tenant_id = :tid`, { tid, today });
  const ticketStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open' OR status='in_progress') as open_tickets, COUNT(*) FILTER (WHERE sla_breached=true) as sla_breached, COALESCE(AVG(satisfaction_rating),0) as avg_csat FROM crm_tickets WHERE tenant_id = :tid AND created_at >= :mstart`, { tid, mstart: monthStart });
  const followUpStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending' AND due_date < :today) as overdue FROM crm_follow_ups WHERE tenant_id = :tid`, { tid, today });
  const forecastStats = await qOne(`SELECT COALESCE(SUM(target_revenue),0) as target, COALESCE(SUM(actual_revenue),0) as actual FROM crm_forecasts WHERE tenant_id = :tid AND period_start <= :today AND period_end >= :today`, { tid, today });
  const automationStats = await qOne(`SELECT COUNT(*) as rules, COUNT(*) FILTER (WHERE is_active=true) as active FROM crm_automation_rules WHERE tenant_id = :tid`, { tid });
  const docStats = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='signed') as signed FROM crm_documents WHERE tenant_id = :tid AND created_at >= :mstart`, { tid, mstart: monthStart });

  // Segment distribution
  const segmentDist = await q(`SELECT segment, COUNT(*) as count, COALESCE(SUM(total_revenue),0) as revenue FROM crm_customers WHERE tenant_id = :tid AND segment IS NOT NULL GROUP BY segment ORDER BY count DESC`, { tid });
  // Lifecycle distribution
  const lifecycleDist = await q(`SELECT lifecycle_stage, COUNT(*) as count FROM crm_customers WHERE tenant_id = :tid GROUP BY lifecycle_stage ORDER BY count DESC`, { tid });
  // Comm by type this month
  const commByType = await q(`SELECT comm_type, COUNT(*) as count FROM crm_communications WHERE tenant_id = :tid AND created_at >= :mstart GROUP BY comm_type`, { tid, mstart: monthStart });
  // Ticket by category
  const ticketByCat = await q(`SELECT category, COUNT(*) as count FROM crm_tickets WHERE tenant_id = :tid AND created_at >= :mstart AND category IS NOT NULL GROUP BY category ORDER BY count DESC`, { tid, mstart: monthStart });
  // Recent interactions
  const recentInteractions = await q(`SELECT i.*, c.display_name as customer_name FROM crm_interactions i LEFT JOIN crm_customers c ON c.id = i.customer_id WHERE i.tenant_id = :tid ORDER BY i.interaction_date DESC LIMIT 10`, { tid });

  return res.json({
    success: true,
    data: {
      customers: { total: parseInt(customerStats?.total||0), active: parseInt(customerStats?.active||0), paying: parseInt(customerStats?.paying||0), avgHealth: parseFloat(customerStats?.avg_health||0), totalRevenue: parseFloat(customerStats?.total_rev||0), newThisMonth: parseInt(newCustomers?.count||0) },
      contacts: { total: parseInt(contactStats?.total||0) },
      communications: { total: parseInt(commStats?.total||0), calls: parseInt(commStats?.calls||0), emails: parseInt(commStats?.emails||0), meetings: parseInt(commStats?.meetings||0) },
      tasks: { total: parseInt(taskStats?.total||0), open: parseInt(taskStats?.open||0), completed: parseInt(taskStats?.completed||0), overdue: parseInt(taskStats?.overdue||0) },
      tickets: { total: parseInt(ticketStats?.total||0), open: parseInt(ticketStats?.open_tickets||0), slaBreached: parseInt(ticketStats?.sla_breached||0), avgCsat: parseFloat(ticketStats?.avg_csat||0) },
      followUps: { total: parseInt(followUpStats?.total||0), overdue: parseInt(followUpStats?.overdue||0) },
      forecast: { target: parseFloat(forecastStats?.target||0), actual: parseFloat(forecastStats?.actual||0) },
      automation: { rules: parseInt(automationStats?.rules||0), active: parseInt(automationStats?.active||0) },
      documents: { total: parseInt(docStats?.total||0), signed: parseInt(docStats?.signed||0) },
      segmentDist, lifecycleDist, commByType, ticketByCat, recentInteractions
    }
  });
}

// ════════════════════════════════════════════════════════════════
// ██  CUSTOMER 360°
// ════════════════════════════════════════════════════════════════
async function getCustomers(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT c.*, (SELECT COUNT(*) FROM crm_contacts ct WHERE ct.customer_id=c.id) as contact_count, (SELECT COUNT(*) FROM crm_interactions i WHERE i.customer_id=c.id) as interaction_count, (SELECT COUNT(*) FROM crm_tickets t WHERE t.customer_id=c.id AND t.status IN ('open','in_progress')) as open_tickets FROM crm_customers c WHERE c.tenant_id = :tid AND c.is_deleted IS NOT TRUE ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_customers c WHERE c.tenant_id = :tid AND c.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getCustomerDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const customer = await qOne(`SELECT * FROM crm_customers WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId });
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  const contacts = await q(`SELECT * FROM crm_contacts WHERE customer_id = :id AND tenant_id = :tid ORDER BY is_primary DESC, first_name`, { id, tid: tenantId });
  const interactions = await q(`SELECT * FROM crm_interactions WHERE customer_id = :id AND tenant_id = :tid ORDER BY interaction_date DESC LIMIT 20`, { id, tid: tenantId });
  const tickets = await q(`SELECT * FROM crm_tickets WHERE customer_id = :id AND tenant_id = :tid ORDER BY created_at DESC LIMIT 10`, { id, tid: tenantId });
  const communications = await q(`SELECT * FROM crm_communications WHERE customer_id = :id AND tenant_id = :tid ORDER BY created_at DESC LIMIT 10`, { id, tid: tenantId });
  const documents = await q(`SELECT * FROM crm_documents WHERE customer_id = :id AND tenant_id = :tid ORDER BY created_at DESC LIMIT 10`, { id, tid: tenantId });
  const satisfaction = await q(`SELECT * FROM crm_satisfaction WHERE customer_id = :id AND tenant_id = :tid ORDER BY response_date DESC LIMIT 5`, { id, tid: tenantId });
  return res.json({ success: true, data: { customer, contacts, interactions, tickets, communications, documents, satisfaction } });
}

async function getCustomerTimeline(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const timeline = await q(`
    SELECT 'interaction' as event_type, id, interaction_type as sub_type, subject as title, description, interaction_date as event_date, created_by FROM crm_interactions WHERE customer_id = :id AND tenant_id = :tid
    UNION ALL
    SELECT 'communication' as event_type, id, comm_type as sub_type, subject as title, body as description, COALESCE(completed_at, created_at) as event_date, created_by FROM crm_communications WHERE customer_id = :id AND tenant_id = :tid
    UNION ALL
    SELECT 'ticket' as event_type, id, category as sub_type, subject as title, description, created_at as event_date, created_by FROM crm_tickets WHERE customer_id = :id AND tenant_id = :tid
    ORDER BY event_date DESC LIMIT 50
  `, { id, tid: tenantId });
  return res.json({ success: true, data: timeline });
}

async function getContacts(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const { customer_id } = req.query;
  const where = customer_id ? `WHERE ct.tenant_id = :tid AND ct.customer_id = :customer_id AND ct.is_deleted IS NOT TRUE` : 'WHERE ct.tenant_id = :tid AND ct.is_deleted IS NOT TRUE';
  const rows = await q(`SELECT ct.*, c.display_name as customer_name FROM crm_contacts ct LEFT JOIN crm_customers c ON c.id = ct.customer_id ${where} ORDER BY ct.is_primary DESC, ct.first_name LIMIT :limit OFFSET :offset`, { ...(customer_id ? { tid: tenantId, customer_id } : { tid: tenantId }), ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_contacts ct ${where}`, customer_id ? { tid: tenantId, customer_id } : { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getSegments(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT * FROM crm_customer_segments WHERE tenant_id = :tid AND is_deleted IS NOT TRUE ORDER BY customer_count DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_customer_segments WHERE tenant_id = :tid AND is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getCustomerAnalytics(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const bySegment = await q(`SELECT segment, COUNT(*) as count, COALESCE(SUM(total_revenue),0) as revenue, COALESCE(AVG(health_score),0) as avg_health FROM crm_customers WHERE tenant_id = :tid AND segment IS NOT NULL GROUP BY segment`, { tid });
  const byLifecycle = await q(`SELECT lifecycle_stage, COUNT(*) as count FROM crm_customers WHERE tenant_id = :tid GROUP BY lifecycle_stage`, { tid });
  const bySource = await q(`SELECT acquisition_source, COUNT(*) as count FROM crm_customers WHERE tenant_id = :tid AND acquisition_source IS NOT NULL GROUP BY acquisition_source ORDER BY count DESC LIMIT 10`, { tid });
  const healthDist = await q(`SELECT CASE WHEN health_score >= 80 THEN 'healthy' WHEN health_score >= 50 THEN 'at_risk' ELSE 'critical' END as health_group, COUNT(*) as count FROM crm_customers WHERE tenant_id = :tid GROUP BY health_group`, { tid });
  return res.json({ success: true, data: { bySegment, byLifecycle, bySource, healthDist } });
}

// ════════════════════════════════════════════════════════════════
// ██  COMMUNICATION HUB
// ════════════════════════════════════════════════════════════════
async function getCommunications(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT cm.*, c.display_name as customer_name FROM crm_communications cm LEFT JOIN crm_customers c ON c.id = cm.customer_id WHERE cm.tenant_id = :tid AND cm.is_deleted IS NOT TRUE ORDER BY cm.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_communications cm WHERE cm.tenant_id = :tid AND cm.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getFollowUps(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT fu.*, c.display_name as customer_name FROM crm_follow_ups fu LEFT JOIN crm_customers c ON c.id = fu.customer_id WHERE fu.tenant_id = :tid AND fu.is_deleted IS NOT TRUE ORDER BY fu.due_date ASC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_follow_ups fu WHERE fu.tenant_id = :tid AND fu.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getEmailTemplates(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT * FROM crm_email_templates WHERE tenant_id = :tid AND is_deleted IS NOT TRUE ORDER BY usage_count DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_email_templates WHERE tenant_id = :tid AND is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getCommCampaigns(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT * FROM crm_comm_campaigns WHERE tenant_id = :tid AND is_deleted IS NOT TRUE ORDER BY created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_comm_campaigns WHERE tenant_id = :tid AND is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

// ════════════════════════════════════════════════════════════════
// ██  TASKS & CALENDAR
// ════════════════════════════════════════════════════════════════
async function getTasks(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT t.*, c.display_name as customer_name FROM crm_tasks t LEFT JOIN crm_customers c ON c.id = t.customer_id WHERE t.tenant_id = :tid AND t.is_deleted IS NOT TRUE ORDER BY CASE WHEN t.status='open' THEN 0 WHEN t.status='in_progress' THEN 1 ELSE 2 END, t.due_date ASC NULLS LAST LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_tasks t WHERE t.tenant_id = :tid AND t.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getTaskSummary(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const byStatus = await q(`SELECT status, COUNT(*) as count FROM crm_tasks WHERE tenant_id = :tid GROUP BY status`, { tid });
  const byPriority = await q(`SELECT priority, COUNT(*) as count FROM crm_tasks WHERE tenant_id = :tid AND status NOT IN ('completed','cancelled') GROUP BY priority`, { tid });
  const byType = await q(`SELECT task_type, COUNT(*) as count FROM crm_tasks WHERE tenant_id = :tid AND task_type IS NOT NULL GROUP BY task_type`, { tid });
  const overdue = await qOne(`SELECT COUNT(*) as count FROM crm_tasks WHERE tenant_id = :tid AND status IN ('open','in_progress') AND due_date < NOW()`, { tid });
  return res.json({ success: true, data: { byStatus, byPriority, byType, overdue: parseInt(overdue?.count||0) } });
}

async function getCalendarEvents(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const { start, end } = req.query;
  let where = '';
  const params: any = {};
  params.tid = tenantId;
  if (start && end) { where = `WHERE ce.tenant_id = :tid AND ce.is_deleted IS NOT TRUE AND ce.start_time >= :start AND ce.start_time <= :end`; params.start = start; params.end = end; } else { where = 'WHERE ce.tenant_id = :tid AND ce.is_deleted IS NOT TRUE'; }
  const rows = await q(`SELECT ce.*, c.display_name as customer_name FROM crm_calendar_events ce LEFT JOIN crm_customers c ON c.id = ce.customer_id ${where} ORDER BY ce.start_time ASC LIMIT :limit OFFSET :offset`, { ...params, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_calendar_events ce ${where}`, params);
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

// ════════════════════════════════════════════════════════════════
// ██  FORECASTING
// ════════════════════════════════════════════════════════════════
async function getForecasts(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT f.*, (SELECT COUNT(*) FROM crm_forecast_items fi WHERE fi.forecast_id=f.id) as item_count FROM crm_forecasts f WHERE f.tenant_id = :tid AND f.is_deleted IS NOT TRUE ORDER BY f.period_start DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_forecasts f WHERE f.tenant_id = :tid AND f.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getDealScores(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT ds.*, c.display_name as customer_name FROM crm_deal_scores ds LEFT JOIN crm_customers c ON c.id = ds.customer_id WHERE ds.tenant_id = :tid AND ds.is_deleted IS NOT TRUE ORDER BY ds.overall_score DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_deal_scores ds WHERE ds.tenant_id = :tid AND ds.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getForecastAnalytics(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const forecasts = await q(`SELECT name, period_start, period_end, target_revenue, actual_revenue, best_case, most_likely, worst_case FROM crm_forecasts WHERE tenant_id = :tid ORDER BY period_start DESC LIMIT 12`, { tid });
  const accuracy = await q(`SELECT name, accuracy_score FROM crm_forecasts WHERE tenant_id = :tid AND accuracy_score IS NOT NULL ORDER BY period_start DESC LIMIT 6`, { tid });
  const dealScoreDist = await q(`SELECT CASE WHEN overall_score >= 80 THEN 'hot' WHEN overall_score >= 50 THEN 'warm' ELSE 'cold' END as temp, COUNT(*) as count FROM crm_deal_scores WHERE tenant_id = :tid GROUP BY temp`, { tid });
  return res.json({ success: true, data: { forecasts, accuracy, dealScoreDist } });
}

// ════════════════════════════════════════════════════════════════
// ██  SERVICE / TICKETING
// ════════════════════════════════════════════════════════════════
async function getTickets(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT tk.*, c.display_name as customer_name,
    (SELECT COUNT(*) FROM crm_ticket_comments tc WHERE tc.ticket_id=tk.id) as comment_count,
    (SELECT COUNT(*)::int FROM crm_tasks ct WHERE ct.ticket_id=tk.id AND ct.task_type IN ('field_visit','visit')) as field_task_count
    FROM crm_tickets tk LEFT JOIN crm_customers c ON c.id = tk.customer_id WHERE tk.tenant_id = :tid AND tk.is_deleted IS NOT TRUE ORDER BY CASE WHEN tk.status='open' THEN 0 WHEN tk.status='in_progress' THEN 1 WHEN tk.status='waiting' THEN 2 ELSE 3 END, tk.priority='critical' DESC, tk.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_tickets tk WHERE tk.tenant_id = :tid AND tk.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getTicketDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const ticket = await qOne(`SELECT tk.*, c.display_name as customer_name FROM crm_tickets tk LEFT JOIN crm_customers c ON c.id = tk.customer_id WHERE tk.id = :id AND tk.tenant_id = :tid`, { id, tid: tenantId });
  const comments = await q(`SELECT * FROM crm_ticket_comments WHERE ticket_id = :id ORDER BY created_at ASC`, { id });
  const linkedTasksRaw = await q(`
    SELECT t.*, c.display_name as customer_name, u.name as assigned_user_name
    FROM crm_tasks t
    LEFT JOIN crm_customers c ON c.id = t.customer_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.tenant_id = :tid AND t.ticket_id = :id
    ORDER BY t.created_at DESC
  `, { tid: tenantId, id });
  const visitIds = [...new Set((linkedTasksRaw || []).map((row: any) => row.sfa_visit_id).filter(Boolean))];
  const visitMap: Record<string, { status?: string; visit_date?: string; purpose?: string }> = {};
  for (const vid of visitIds) {
    const v = await qOne(`SELECT id, status, visit_date, purpose FROM sfa_visits WHERE id = :id AND tenant_id = :tid`, { id: vid, tid: tenantId });
    if (v?.id) visitMap[String(v.id)] = { status: v.status, visit_date: v.visit_date, purpose: v.purpose };
  }
  const linkedTasks = (linkedTasksRaw || []).map((row: any) => {
    const vm = row.sfa_visit_id ? visitMap[String(row.sfa_visit_id)] : null;
    return vm ? { ...row, visit_status: vm.status, visit_date: vm.visit_date, visit_purpose: vm.purpose } : row;
  });
  return res.json({ success: true, data: { ticket, comments, linkedTasks } });
}

async function getSlaPolicies(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT * FROM crm_sla_policies WHERE tenant_id = :tid AND is_deleted IS NOT TRUE ORDER BY is_default DESC, name LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_sla_policies WHERE tenant_id = :tid AND is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getSatisfaction(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const data = await q(`SELECT s.*, c.display_name as customer_name FROM crm_satisfaction s LEFT JOIN crm_customers c ON c.id = s.customer_id WHERE s.tenant_id = :tid ORDER BY s.response_date DESC LIMIT 100`, { tid: tenantId });
  const avgScores = await qOne(`SELECT AVG(CASE WHEN survey_type='nps' THEN score END) as avg_nps, AVG(CASE WHEN survey_type='csat' THEN score END) as avg_csat, COUNT(*) as total FROM crm_satisfaction WHERE tenant_id = :tid`, { tid: tenantId });
  return res.json({ success: true, data: { responses: data, avgNps: parseFloat(avgScores?.avg_nps||0), avgCsat: parseFloat(avgScores?.avg_csat||0), totalResponses: parseInt(avgScores?.total||0) } });
}

async function getServiceAnalytics(_req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const tid = tenantId;
  const byStatus = await q(`SELECT status, COUNT(*) as count FROM crm_tickets WHERE tenant_id = :tid GROUP BY status`, { tid });
  const byCategory = await q(`SELECT category, COUNT(*) as count FROM crm_tickets WHERE tenant_id = :tid AND category IS NOT NULL GROUP BY category ORDER BY count DESC`, { tid });
  const byPriority = await q(`SELECT priority, COUNT(*) as count FROM crm_tickets WHERE tenant_id = :tid GROUP BY priority`, { tid });
  const avgResolution = await qOne(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours FROM crm_tickets WHERE tenant_id = :tid AND resolved_at IS NOT NULL`, { tid });
  const slaStats = await qOne(`SELECT COUNT(*) FILTER (WHERE sla_breached=false) as met, COUNT(*) FILTER (WHERE sla_breached=true) as breached, COUNT(*) as total FROM crm_tickets WHERE tenant_id = :tid AND sla_breached IS NOT NULL`, { tid });
  return res.json({ success: true, data: { byStatus, byCategory, byPriority, avgResolutionHours: parseFloat(avgResolution?.avg_hours||0), sla: { met: parseInt(slaStats?.met||0), breached: parseInt(slaStats?.breached||0), total: parseInt(slaStats?.total||0) } } });
}

// ════════════════════════════════════════════════════════════════
// ██  AUTOMATION
// ════════════════════════════════════════════════════════════════
async function getAutomationRules(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT ar.*, (SELECT COUNT(*) FROM crm_automation_logs al WHERE al.rule_id=ar.id) as log_count FROM crm_automation_rules ar WHERE ar.tenant_id = :tid AND ar.is_deleted IS NOT TRUE ORDER BY ar.priority DESC, ar.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_automation_rules ar WHERE ar.tenant_id = :tid AND ar.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getAutomationLogs(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT al.*, ar.name as rule_name FROM crm_automation_logs al LEFT JOIN crm_automation_rules ar ON ar.id = al.rule_id WHERE al.tenant_id = :tid AND al.is_deleted IS NOT TRUE ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_automation_logs al WHERE al.tenant_id = :tid AND al.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

// ════════════════════════════════════════════════════════════════
// ██  DOCUMENTS
// ════════════════════════════════════════════════════════════════
async function getDocuments(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT d.*, c.display_name as customer_name FROM crm_documents d LEFT JOIN crm_customers c ON c.id = d.customer_id WHERE d.tenant_id = :tid AND d.is_deleted IS NOT TRUE ORDER BY d.created_at DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_documents d WHERE d.tenant_id = :tid AND d.is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

async function getDocumentTemplates(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const pg = getPagination(req.query);
  const rows = await q(`SELECT * FROM crm_document_templates WHERE tenant_id = :tid AND is_deleted IS NOT TRUE ORDER BY usage_count DESC LIMIT :limit OFFSET :offset`, { tid: tenantId, ...pg });
  const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM crm_document_templates WHERE tenant_id = :tid AND is_deleted IS NOT TRUE`, { tid: tenantId });
  return res.json({ success: true, rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
}

// ════════════════════════════════════════════════════════════════
// ██  CREATE OPERATIONS
// ════════════════════════════════════════════════════════════════
function parseCsvLineSimple(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (!inQ && ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.map((s) => s.replace(/^"|"$/g, ''));
}

async function importCustomersCsv(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const csv = String(req.body?.csv || '').trim();
  if (!csv) return res.status(400).json({ success: false, error: 'Field csv wajib (teks CSV).' });
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return res.status(400).json({ success: false, error: 'Minimal baris header + 1 data.' });
  const header = parseCsvLineSimple(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const idx = (name: string) => header.indexOf(name);
  let inserted = 0;
  const errors: string[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLineSimple(lines[r]);
    const get = (aliases: string[]) => {
      for (const a of aliases) {
        const i = idx(a);
        if (i >= 0 && cells[i] !== undefined && cells[i] !== '') return cells[i];
      }
      return '';
    };
    const display_name = get(['display_name', 'nama', 'name', 'nama_toko', 'outlet']);
    const company_name = get(['company_name', 'perusahaan', 'pt']);
    if (!display_name && !company_name) {
      errors.push(`Baris ${r + 1}: isi display_name atau company_name`);
      continue;
    }
    const num = generateNumber('CUS');
    const row = {
      tenantId,
      num,
      display_name: display_name || company_name,
      company_name: company_name || null,
      customer_type: get(['customer_type', 'tipe']) || 'company',
      address: get(['address', 'alamat']) || null,
      city: get(['city', 'kota']) || null,
      province: get(['province', 'provinsi']) || null,
      postal_code: get(['postal_code', 'kode_pos']) || null,
      segment: get(['segment', 'tier', 'kelas']) || null,
      lifecycle_stage: get(['lifecycle_stage', 'tahap']) || 'prospect',
      customer_status: get(['customer_status', 'status']) || 'active',
      notes: get(['notes', 'catatan']) || null,
      userId,
    };
    const okIns = await qExec(
      `INSERT INTO crm_customers (tenant_id, customer_number, display_name, company_name, customer_type, address, city, province, postal_code, lifecycle_stage, customer_status, segment, notes, tags, custom_fields, created_by)
       VALUES (:tenantId, :num, :display_name, :company_name, :customer_type, :address, :city, :province, :postal_code, :lifecycle_stage, :customer_status, :segment, :notes, '[]', '{}', :userId)`,
      {
        ...row,
        customer_type: row.customer_type || 'company',
      },
    );
    if (okIns) {
      errors.push(`Baris ${r + 1}: ${okIns}`);
    } else {
      inserted++;
    }
  }
  return res.json({
    success: true,
    message: `${inserted} pelanggan diimpor`,
    inserted,
    errors: errors.slice(0, 50),
  });
}

async function createCustomer(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const num = generateNumber('CUS');
  const ok = await qExec(`INSERT INTO crm_customers (tenant_id, customer_number, display_name, company_name, customer_type, industry, company_size, website, address, city, province, postal_code, lifecycle_stage, customer_status, acquisition_source, segment, credit_limit, payment_terms, tax_id, territory_id, assigned_to, notes, tags, custom_fields, created_by) VALUES (:tenantId, :num, :display_name, :company_name, :customer_type, :industry, :company_size, :website, :address, :city, :province, :postal_code, :lifecycle_stage, :customer_status, :acquisition_source, :segment, :credit_limit, :payment_terms, :tax_id, :territory_id, :assigned_to, :notes, :tags, :custom_fields, :userId)`,
    { tenantId, num, display_name: b.display_name||null, company_name: b.company_name||null, customer_type: b.customer_type||'company', industry: b.industry||null, company_size: b.company_size||null, website: b.website||null, address: b.address||null, city: b.city||null, province: b.province||null, postal_code: b.postal_code||null, lifecycle_stage: b.lifecycle_stage||'prospect', customer_status: b.customer_status||'active', acquisition_source: b.acquisition_source||null, segment: b.segment||null, credit_limit: b.credit_limit||0, payment_terms: b.payment_terms||null, tax_id: b.tax_id||null, territory_id: b.territory_id||null, assigned_to: b.assigned_to||null, notes: b.notes||null, tags: JSON.stringify(b.tags||[]), custom_fields: JSON.stringify(b.custom_fields||{}), userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, data: { customer_number: num } });
}

async function createContact(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_contacts (tenant_id, customer_id, first_name, last_name, title, department, email, phone, mobile, whatsapp, is_primary, is_decision_maker, role_in_deal, communication_preference, notes) VALUES (:tenantId, :customer_id, :first_name, :last_name, :title, :department, :email, :phone, :mobile, :whatsapp, :is_primary, :is_decision_maker, :role_in_deal, :communication_preference, :notes)`,
    { tenantId, ...b, is_primary: b.is_primary||false, is_decision_maker: b.is_decision_maker||false });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createInteraction(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_interactions (tenant_id, customer_id, contact_id, interaction_type, direction, subject, description, outcome, duration_minutes, channel, lead_id, opportunity_id, sentiment, created_by) VALUES (:tenantId, :customer_id, :contact_id, :interaction_type, :direction, :subject, :description, :outcome, :duration_minutes, :channel, :lead_id, :opportunity_id, :sentiment, :userId)`,
    { tenantId, ...b, userId });
  // Update customer last_interaction_date
  if (b.customer_id) await qExec(`UPDATE crm_customers SET last_interaction_date = NOW() WHERE id = :id`, { id: b.customer_id });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createCommunication(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const num = generateNumber('COM');
  const ok = await qExec(`INSERT INTO crm_communications (tenant_id, comm_number, customer_id, contact_id, comm_type, direction, status, subject, body, call_duration, meeting_location, meeting_start, meeting_end, outcome, next_action, scheduled_at, lead_id, opportunity_id, created_by) VALUES (:tenantId, :num, :customer_id, :contact_id, :comm_type, :direction, :status, :subject, :body, :call_duration, :meeting_location, :meeting_start, :meeting_end, :outcome, :next_action, :scheduled_at, :lead_id, :opportunity_id, :userId)`,
    { tenantId, num, customer_id: b.customer_id||null, contact_id: b.contact_id||null, comm_type: b.comm_type||'call', direction: b.direction||'outbound', status: b.status||'completed', subject: b.subject||null, body: b.body||null, call_duration: b.call_duration||null, meeting_location: b.meeting_location||null, meeting_start: b.meeting_start||null, meeting_end: b.meeting_end||null, outcome: b.outcome||null, next_action: b.next_action||null, scheduled_at: b.scheduled_at||null, lead_id: b.lead_id||null, opportunity_id: b.opportunity_id||null, userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, data: { comm_number: num } });
}

async function createFollowUp(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_follow_ups (tenant_id, customer_id, contact_id, title, description, follow_up_type, priority, due_date, assigned_to, lead_id, opportunity_id, reminder_minutes_before, notes, created_by) VALUES (:tenantId, :customer_id, :contact_id, :title, :description, :follow_up_type, :priority, :due_date, :assigned_to, :lead_id, :opportunity_id, :reminder_minutes_before, :notes, :userId)`,
    { tenantId, ...b, priority: b.priority||'medium', userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createTask(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const num = generateNumber('TSK');
  const base = {
    tenantId, num, title: b.title||null, description: b.description||null, task_type: b.task_type||'follow_up', priority: b.priority||'medium', status: b.status||'open', due_date: b.due_date||null, start_date: b.start_date||null, customer_id: b.customer_id||null, contact_id: b.contact_id||null, lead_id: b.lead_id||null, opportunity_id: b.opportunity_id||null, ticket_id: b.ticket_id||null, assigned_to: b.assigned_to||null, assigned_team: b.assigned_team||null, estimated_hours: b.estimated_hours||null, tags: JSON.stringify(b.tags||[]), checklist: JSON.stringify(b.checklist||[]), userId,
  };
  let ok = await qExec(
    `INSERT INTO crm_tasks (tenant_id, task_number, title, description, task_type, priority, status, due_date, start_date, customer_id, contact_id, lead_id, opportunity_id, ticket_id, assigned_to, assigned_team, estimated_hours, tags, checklist, purpose, sfa_visit_id, created_by) VALUES (:tenantId, :num, :title, :description, :task_type, :priority, :status, :due_date, :start_date, :customer_id, :contact_id, :lead_id, :opportunity_id, :ticket_id, :assigned_to, :assigned_team, :estimated_hours, :tags, :checklist, :purpose, :sfa_visit_id, :userId)`,
    { ...base, purpose: b.purpose||null, sfa_visit_id: b.sfa_visit_id||null },
  );
  if (ok) {
    const err = String(ok).toLowerCase();
    if (err.includes('purpose') || err.includes('sfa_visit_id')) {
      ok = await qExec(
        `INSERT INTO crm_tasks (tenant_id, task_number, title, description, task_type, priority, status, due_date, start_date, customer_id, contact_id, lead_id, opportunity_id, ticket_id, assigned_to, assigned_team, estimated_hours, tags, checklist, created_by) VALUES (:tenantId, :num, :title, :description, :task_type, :priority, :status, :due_date, :start_date, :customer_id, :contact_id, :lead_id, :opportunity_id, :ticket_id, :assigned_to, :assigned_team, :estimated_hours, :tags, :checklist, :userId)`,
        base,
      );
    }
  }
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, data: { task_number: num } });
}

async function createCalendarEvent(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_calendar_events (tenant_id, title, description, event_type, start_time, end_time, all_day, location, is_virtual, meeting_url, customer_id, contact_id, opportunity_id, organizer_id, attendees, reminders, color, created_by) VALUES (:tenantId, :title, :description, :event_type, :start_time, :end_time, :all_day, :location, :is_virtual, :meeting_url, :customer_id, :contact_id, :opportunity_id, :userId, :attendees, :reminders, :color, :userId)`,
    { tenantId, ...b, all_day: b.all_day||false, is_virtual: b.is_virtual||false, attendees: JSON.stringify(b.attendees||[]), reminders: JSON.stringify(b.reminders||[{minutes:15}]), userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createTicket(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const num = generateNumber('TKT');
  // Calculate SLA
  let first_response_due = null, resolution_due = null;
  const sla = await qOne(`SELECT * FROM crm_sla_policies WHERE tenant_id = :tenantId AND is_active=true AND is_default=true LIMIT 1`, { tenantId });
  if (sla) {
    const now = new Date();
    const severity = b.severity || 'minor';
    const frMin = sla[`first_response_${severity}`] || 480;
    const resMin = sla[`resolution_${severity}`] || 2880;
    first_response_due = new Date(now.getTime() + frMin * 60000).toISOString();
    resolution_due = new Date(now.getTime() + resMin * 60000).toISOString();
  }
  const ok = await qExec(`INSERT INTO crm_tickets (tenant_id, ticket_number, customer_id, contact_id, subject, description, category, subcategory, priority, severity, source_channel, assigned_to, assigned_team, sla_policy_id, first_response_due, resolution_due, tags, created_by) VALUES (:tenantId, :num, :customer_id, :contact_id, :subject, :description, :category, :subcategory, :priority, :severity, :source_channel, :assigned_to, :assigned_team, :sla_id, :first_response_due, :resolution_due, :tags, :userId)`,
    { tenantId, num, customer_id: b.customer_id||null, contact_id: b.contact_id||null, subject: b.subject||null, description: b.description||null, category: b.category||'request', subcategory: b.subcategory||null, priority: b.priority||'medium', severity: b.severity||'minor', source_channel: b.source_channel||'email', assigned_to: b.assigned_to||null, assigned_team: b.assigned_team||null, sla_id: sla?.id||null, first_response_due, resolution_due, tags: JSON.stringify(b.tags||[]), userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, data: { ticket_number: num } });
}

async function createTicketComment(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_ticket_comments (ticket_id, comment_type, body, is_public, created_by) VALUES (:ticket_id, :comment_type, :body, :is_public, :userId)`,
    { ...b, comment_type: b.comment_type||'reply', is_public: b.is_public!==false, userId });
  // Update first_response_at if first reply
  if (b.ticket_id) {
    await qExec(`UPDATE crm_tickets SET first_response_at = COALESCE(first_response_at, NOW()), updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: b.ticket_id, tid: tenantId });
  }
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createForecast(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_forecasts (tenant_id, name, forecast_period, period_start, period_end, target_revenue, target_deals, target_new_customers, best_case, most_likely, worst_case, owner_id, team_id, notes, created_by) VALUES (:tenantId, :name, :forecast_period, :period_start, :period_end, :target_revenue, :target_deals, :target_new_customers, :best_case, :most_likely, :worst_case, :owner_id, :team_id, :notes, :userId)`,
    { tenantId, name: b.name||null, forecast_period: b.forecast_period||'monthly', period_start: b.period_start||null, period_end: b.period_end||null, target_revenue: b.target_revenue||0, target_deals: b.target_deals||0, target_new_customers: b.target_new_customers||0, best_case: b.best_case||0, most_likely: b.most_likely||0, worst_case: b.worst_case||0, owner_id: b.owner_id||null, team_id: b.team_id||null, notes: b.notes||null, userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createDocument(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const num = generateNumber('DOC');
  const ok = await qExec(`INSERT INTO crm_documents (tenant_id, document_number, title, document_type, status, customer_id, opportunity_id, total_value, tags, created_by) VALUES (:tenantId, :num, :title, :document_type, :status, :customer_id, :opportunity_id, :total_value, :tags, :userId)`,
    { tenantId, num, ...b, status: b.status||'draft', tags: JSON.stringify(b.tags||[]), userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, data: { document_number: num } });
}

async function createAutomationRule(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_automation_rules (tenant_id, name, description, rule_type, trigger_event, trigger_entity, trigger_conditions, actions, is_active, priority, created_by) VALUES (:tenantId, :name, :description, :rule_type, :trigger_event, :trigger_entity, :trigger_conditions, :actions, :is_active, :priority, :userId)`,
    { tenantId, ...b, rule_type: b.rule_type||'trigger', trigger_conditions: JSON.stringify(b.trigger_conditions||[]), actions: JSON.stringify(b.actions||[]), is_active: b.is_active!==false, priority: b.priority||0, userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createSegment(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_customer_segments (tenant_id, name, code, description, segment_type, rules, color, is_active, created_by) VALUES (:tenantId, :name, :code, :description, :segment_type, :rules, :color, :is_active, :userId)`,
    { tenantId, ...b, segment_type: b.segment_type||'static', rules: JSON.stringify(b.rules||{}), is_active: b.is_active!==false, userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createEmailTemplate(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: number) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_email_templates (tenant_id, name, category, subject, body_html, body_text, variables, channel, is_active, created_by) VALUES (:tenantId, :name, :category, :subject, :body_html, :body_text, :variables, :channel, :is_active, :userId)`,
    { tenantId, ...b, channel: b.channel||'email', variables: JSON.stringify(b.variables||[]), is_active: b.is_active!==false, userId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function createSlaPolicy(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const b = req.body;
  const ok = await qExec(`INSERT INTO crm_sla_policies (tenant_id, name, description, first_response_critical, first_response_major, first_response_minor, resolution_critical, resolution_major, resolution_minor, business_hours, is_default, is_active) VALUES (:tenantId, :name, :description, :frc, :frma, :frmi, :rc, :rma, :rmi, :bh, :is_default, :is_active)`,
    { tenantId, name: b.name, description: b.description, frc: b.first_response_critical||30, frma: b.first_response_major||120, frmi: b.first_response_minor||480, rc: b.resolution_critical||240, rma: b.resolution_major||1440, rmi: b.resolution_minor||2880, bh: JSON.stringify(b.business_hours||{}), is_default: b.is_default||false, is_active: b.is_active!==false });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

// ════════════════════════════════════════════════════════════════
// ██  UPDATE OPERATIONS
// ════════════════════════════════════════════════════════════════
async function updateCustomer(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const ALLOWED = ['display_name', 'company_name', 'customer_type', 'industry', 'company_size', 'website', 'address', 'city', 'province', 'postal_code', 'lifecycle_stage', 'customer_status', 'acquisition_source', 'segment', 'credit_limit', 'payment_terms', 'tax_id', 'territory_id', 'assigned_to', 'notes', 'tags', 'custom_fields', 'health_score', 'total_revenue', 'last_interaction_date'];
  if (fields.tags) fields.tags = JSON.stringify(fields.tags);
  if (fields.custom_fields) fields.custom_fields = JSON.stringify(fields.custom_fields);
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
  const ok = await qExec(`UPDATE crm_customers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateTask(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.status === 'completed' && !fields.completed_date) fields.completed_date = new Date().toISOString();
  const ALLOWED = ['title', 'description', 'task_type', 'priority', 'status', 'due_date', 'start_date', 'completed_date', 'customer_id', 'contact_id', 'lead_id', 'opportunity_id', 'ticket_id', 'assigned_to', 'assigned_team', 'estimated_hours', 'actual_hours', 'tags', 'checklist', 'notes', 'purpose', 'sfa_visit_id'];
  if (fields.tags) fields.tags = JSON.stringify(fields.tags);
  if (fields.checklist) fields.checklist = JSON.stringify(fields.checklist);
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE crm_tasks SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateTicket(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.status === 'resolved' && !fields.resolved_at) fields.resolved_at = new Date().toISOString();
  // Check SLA breach
  if (fields.status === 'resolved') {
    const ticket = await qOne(`SELECT resolution_due FROM crm_tickets WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId });
    if (ticket?.resolution_due && new Date() > new Date(ticket.resolution_due)) {
      fields.sla_breached = true;
    }
  }
  const ALLOWED = ['subject', 'description', 'category', 'subcategory', 'priority', 'severity', 'status', 'assigned_to', 'assigned_team', 'resolved_at', 'sla_breached', 'first_response_at', 'notes', 'tags'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE crm_tickets SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateFollowUp(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.status === 'completed' && !fields.completed_date) fields.completed_date = new Date().toISOString();
  const ALLOWED = ['title', 'description', 'follow_up_type', 'priority', 'status', 'due_date', 'completed_date', 'assigned_to', 'notes'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE crm_follow_ups SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateAutomationRule(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.trigger_conditions) fields.trigger_conditions = JSON.stringify(fields.trigger_conditions);
  if (fields.actions) fields.actions = JSON.stringify(fields.actions);
  const ALLOWED = ['name', 'description', 'rule_type', 'trigger_event', 'trigger_entity', 'trigger_conditions', 'actions', 'is_active', 'priority'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE crm_automation_rules SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateContact(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const ALLOWED = ['first_name', 'last_name', 'title', 'department', 'email', 'phone', 'mobile', 'whatsapp', 'is_primary', 'is_decision_maker', 'role_in_deal', 'communication_preference', 'notes', 'is_active'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
  const ok = await qExec(`UPDATE crm_contacts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateCommunication(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.status === 'completed' && !fields.completed_at) fields.completed_at = new Date().toISOString();
  if (fields.email_to) fields.email_to = JSON.stringify(fields.email_to);
  if (fields.email_cc) fields.email_cc = JSON.stringify(fields.email_cc);
  if (fields.meeting_attendees) fields.meeting_attendees = JSON.stringify(fields.meeting_attendees);
  if (fields.attachments) fields.attachments = JSON.stringify(fields.attachments);
  const ALLOWED = ['comm_type', 'direction', 'status', 'subject', 'body', 'call_duration', 'meeting_location', 'meeting_start', 'meeting_end', 'outcome', 'next_action', 'scheduled_at', 'completed_at', 'email_to', 'email_cc', 'meeting_attendees', 'attachments'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  sets.push('updated_at = NOW()');
  const ok = await qExec(`UPDATE crm_communications SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateForecast(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const ALLOWED = ['name', 'forecast_period', 'period_start', 'period_end', 'target_revenue', 'target_deals', 'target_new_customers', 'best_case', 'most_likely', 'worst_case', 'actual_revenue', 'notes', 'accuracy_score'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
  const ok = await qExec(`UPDATE crm_forecasts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateDocument(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.tags) fields.tags = JSON.stringify(fields.tags);
  if (fields.metadata) fields.metadata = JSON.stringify(fields.metadata);
  const ALLOWED = ['title', 'document_type', 'status', 'customer_id', 'opportunity_id', 'total_value', 'notes', 'tags', 'metadata'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
  const ok = await qExec(`UPDATE crm_documents SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

async function updateCalendarEvent(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id, ...fields } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (fields.attendees) fields.attendees = JSON.stringify(fields.attendees);
  if (fields.reminders) fields.reminders = JSON.stringify(fields.reminders);
  const ALLOWED = ['title', 'description', 'event_type', 'start_time', 'end_time', 'all_day', 'location', 'is_virtual', 'meeting_url', 'customer_id', 'contact_id', 'opportunity_id', 'attendees', 'reminders', 'color', 'status'];
  const safeFields: any = {};
  const sets: string[] = [];
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) { safeFields[key] = fields[key]; sets.push(`${key} = :${key}`); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });
  const ok = await qExec(`UPDATE crm_calendar_events SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId, ...safeFields });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true });
}

// ════════════════════════════════════════════════════════════════
// ██  DELETE OPERATIONS (Manager-only)
// ════════════════════════════════════════════════════════════════
async function deleteCrmEntity(res: NextApiResponse, table: string, id: string, tenantId: string) {
  const ok = await qExec(`UPDATE ${table} SET is_deleted=true, deleted_at=NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId });
  return ok ? res.status(500).json({ success: false, error: ok }) : res.json({ success: true, message: 'Data berhasil dihapus' });
}

export default withModuleGuard('crm', crmApiHandler);
