import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) {
    console.error('CRM-SFA Integration Error:', e.message);
    return [];
  }
}
async function qOne(sql: string, replacements?: any): Promise<any> {
  const rows = await q(sql, replacements);
  return rows[0] || null;
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try {
    await sequelize.query(sql, replacements ? { replacements } : undefined);
    return true;
  } catch (e: any) {
    console.error('CRM-SFA Exec Error:', e.message);
    return false;
  }
}

function genId(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const { action } = req.query;

    // ════════════════════════════════════════════════════════════
    // GET — Cross-module data queries
    // ════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {
        // Integration health overview
        case 'health': {
          const [crmCount, sfaCount, linkedLeads, linkedVisits, syncedForecasts] = await Promise.all([
            qOne(`SELECT COUNT(*) as c FROM crm_customers WHERE tenant_id = :tid`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM sfa_leads WHERE tenant_id = :tid`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM crm_customers WHERE tenant_id = :tid AND source_lead_id IS NOT NULL`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM crm_interactions WHERE tenant_id = :tid AND source_type = 'sfa_visit'`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM crm_forecasts WHERE tenant_id = :tid AND source_pipeline_id IS NOT NULL`, { tid: tenantId }),
          ]);
          return res.json({
            success: true,
            data: {
              crmCustomers: parseInt(crmCount?.c || 0),
              sfaLeads: parseInt(sfaCount?.c || 0),
              linkedLeads: parseInt(linkedLeads?.c || 0),
              linkedVisits: parseInt(linkedVisits?.c || 0),
              syncedForecasts: parseInt(syncedForecasts?.c || 0),
            }
          });
        }

        // Leads eligible for conversion to CRM customer
        case 'convertible-leads': {
          const leads = await q(`
            SELECT l.id, l.lead_number, l.company_name, l.contact_name, l.email, l.phone,
              l.status, l.lead_score, l.expected_value, l.source, l.created_at
            FROM sfa_leads l
            WHERE l.tenant_id = :tid
              AND l.status IN ('qualified', 'proposal', 'negotiation', 'converted')
              AND NOT EXISTS (
                SELECT 1 FROM crm_customers c WHERE c.source_lead_id = l.id AND c.tenant_id = :tid
              )
            ORDER BY l.lead_score DESC, l.expected_value DESC
          `, { tid: tenantId });
          return res.json({ success: true, data: leads });
        }

        // SFA visits not yet linked to CRM interactions
        case 'unlinkable-visits': {
          const visits = await q(`
            SELECT v.id, v.visit_number, v.customer_name, v.status, v.check_in_time,
              v.check_out_time, v.notes, v.salesperson_id,
              u.name as salesperson_name
            FROM sfa_visits v
            LEFT JOIN users u ON u.id = v.salesperson_id
            WHERE v.tenant_id = :tid
              AND v.status = 'completed'
              AND NOT EXISTS (
                SELECT 1 FROM crm_interactions i WHERE i.source_visit_id = v.id AND i.tenant_id = :tid
              )
            ORDER BY v.check_in_time DESC
            LIMIT 50
          `, { tid: tenantId });
          return res.json({ success: true, data: visits });
        }

        // Pipeline opportunities for forecast sync
        case 'syncable-pipeline': {
          const opps = await q(`
            SELECT o.id, o.title, o.expected_value, o.probability, o.stage, o.status,
              o.expected_close_date, o.created_by,
              u.name as owner_name
            FROM sfa_opportunities o
            LEFT JOIN users u ON u.id = o.created_by
            WHERE o.tenant_id = :tid
              AND o.status = 'open'
              AND NOT EXISTS (
                SELECT 1 FROM crm_forecast_items fi WHERE fi.source_opportunity_id = o.id
              )
            ORDER BY o.expected_value DESC
          `, { tid: tenantId });
          return res.json({ success: true, data: opps });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ════════════════════════════════════════════════════════════
    // POST — Cross-module write operations
    // ════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      switch (action) {

        // ─── Convert SFA Lead → CRM Customer ───
        case 'convert-lead': {
          const { leadId } = req.body;
          if (!leadId) return res.status(400).json({ success: false, error: 'leadId required' });

          const lead = await qOne(`SELECT * FROM sfa_leads WHERE id = :id AND tenant_id = :tid`, { id: leadId, tid: tenantId });
          if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

          // Check if already converted
          const existing = await qOne(`SELECT id FROM crm_customers WHERE source_lead_id = :lid AND tenant_id = :tid`, { lid: leadId, tid: tenantId });
          if (existing) return res.status(409).json({ success: false, error: 'Lead sudah dikonversi ke customer', customerId: existing.id });

          const custId = genId('CUS');
          const custNumber = genId('CUS');

          // Create CRM Customer from lead data
          await qExec(`
            INSERT INTO crm_customers (id, tenant_id, customer_number, name, company_name, email, phone,
              source, source_lead_id, lifecycle_stage, health_score, tags, created_by, created_at, updated_at)
            VALUES (:id, :tid, :num, :name, :company, :email, :phone,
              'sfa_lead', :leadId, 'new', 70, :tags, :uid, NOW(), NOW())
          `, {
            id: custId, tid: tenantId, num: custNumber,
            name: lead.contact_name || lead.company_name,
            company: lead.company_name,
            email: lead.email, phone: lead.phone,
            leadId, tags: JSON.stringify(['from-sfa']),
            uid: userId
          });

          // Create primary contact
          const contactId = genId('CON');
          await qExec(`
            INSERT INTO crm_contacts (id, tenant_id, customer_id, name, email, phone,
              is_primary, created_by, created_at, updated_at)
            VALUES (:id, :tid, :cid, :name, :email, :phone, true, :uid, NOW(), NOW())
          `, {
            id: contactId, tid: tenantId, cid: custId,
            name: lead.contact_name || lead.company_name,
            email: lead.email, phone: lead.phone, uid: userId
          });

          // Mark lead as converted in SFA
          await qExec(`UPDATE sfa_leads SET status = 'converted', converted_at = NOW(), converted_by = :uid WHERE id = :id`, { uid: userId, id: leadId });

          // Log interaction
          await qExec(`
            INSERT INTO crm_interactions (id, tenant_id, customer_id, interaction_type, summary,
              source_type, created_by, created_at)
            VALUES (:id, :tid, :cid, 'conversion', :summary, 'sfa_lead', :uid, NOW())
          `, {
            id: genId('INT'), tid: tenantId, cid: custId,
            summary: `Lead ${lead.lead_number || leadId} dikonversi menjadi customer oleh ${userName}`,
            uid: userId
          });

          return res.json({
            success: true,
            message: `Lead berhasil dikonversi menjadi customer`,
            data: { customerId: custId, contactId, leadId }
          });
        }

        // ─── Bulk Convert Leads → Customers ───
        case 'bulk-convert-leads': {
          const { leadIds } = req.body;
          if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ success: false, error: 'leadIds array required' });
          }

          let converted = 0, skipped = 0, errors = 0;
          for (const leadId of leadIds) {
            try {
              const lead = await qOne(`SELECT * FROM sfa_leads WHERE id = :id AND tenant_id = :tid`, { id: leadId, tid: tenantId });
              if (!lead) { skipped++; continue; }

              const existing = await qOne(`SELECT id FROM crm_customers WHERE source_lead_id = :lid AND tenant_id = :tid`, { lid: leadId, tid: tenantId });
              if (existing) { skipped++; continue; }

              const custId = genId('CUS');
              await qExec(`
                INSERT INTO crm_customers (id, tenant_id, customer_number, name, company_name, email, phone,
                  source, source_lead_id, lifecycle_stage, health_score, tags, created_by, created_at, updated_at)
                VALUES (:id, :tid, :num, :name, :company, :email, :phone,
                  'sfa_lead', :leadId, 'new', 70, '["from-sfa"]', :uid, NOW(), NOW())
              `, {
                id: custId, tid: tenantId, num: genId('CUS'),
                name: lead.contact_name || lead.company_name,
                company: lead.company_name,
                email: lead.email, phone: lead.phone,
                leadId, uid: userId
              });

              await qExec(`UPDATE sfa_leads SET status = 'converted', converted_at = NOW(), converted_by = :uid WHERE id = :id`, { uid: userId, id: leadId });
              converted++;
            } catch { errors++; }
          }

          return res.json({ success: true, message: `${converted} lead dikonversi`, data: { converted, skipped, errors } });
        }

        // ─── Link SFA Visit → CRM Interaction ───
        case 'link-visit': {
          const { visitId, customerId } = req.body;
          if (!visitId) return res.status(400).json({ success: false, error: 'visitId required' });

          const visit = await qOne(`SELECT * FROM sfa_visits WHERE id = :id AND tenant_id = :tid`, { id: visitId, tid: tenantId });
          if (!visit) return res.status(404).json({ success: false, error: 'Visit not found' });

          // Auto-resolve customer if not provided
          let resolvedCustomerId = customerId;
          if (!resolvedCustomerId && visit.customer_name) {
            const cust = await qOne(`SELECT id FROM crm_customers WHERE (name = :name OR company_name = :name) AND tenant_id = :tid LIMIT 1`,
              { name: visit.customer_name, tid: tenantId });
            resolvedCustomerId = cust?.id;
          }

          const intId = genId('INT');
          await qExec(`
            INSERT INTO crm_interactions (id, tenant_id, customer_id, interaction_type, summary,
              notes, source_type, source_visit_id, created_by, created_at)
            VALUES (:id, :tid, :cid, 'visit', :summary, :notes, 'sfa_visit', :vid, :uid, :time)
          `, {
            id: intId, tid: tenantId, cid: resolvedCustomerId,
            summary: `Kunjungan ${visit.visit_number || ''} oleh sales — ${visit.purpose || 'Field visit'}`,
            notes: visit.notes,
            vid: visitId, uid: visit.salesperson_id || userId,
            time: visit.check_in_time || new Date()
          });

          return res.json({ success: true, message: 'Visit berhasil ditautkan ke CRM', data: { interactionId: intId } });
        }

        // ─── Bulk Link Visits → CRM Interactions ───
        case 'bulk-link-visits': {
          const { visitIds } = req.body;
          if (!visitIds || !Array.isArray(visitIds)) return res.status(400).json({ success: false, error: 'visitIds array required' });

          let linked = 0, failed = 0;
          for (const vid of visitIds) {
            try {
              const visit = await qOne(`SELECT * FROM sfa_visits WHERE id = :id AND tenant_id = :tid`, { id: vid, tid: tenantId });
              if (!visit) { failed++; continue; }

              const exists = await qOne(`SELECT id FROM crm_interactions WHERE source_visit_id = :vid AND tenant_id = :tid`, { vid, tid: tenantId });
              if (exists) { continue; }

              let custId = null;
              if (visit.customer_name) {
                const cust = await qOne(`SELECT id FROM crm_customers WHERE (name = :n OR company_name = :n) AND tenant_id = :tid LIMIT 1`, { n: visit.customer_name, tid: tenantId });
                custId = cust?.id;
              }

              await qExec(`
                INSERT INTO crm_interactions (id, tenant_id, customer_id, interaction_type, summary,
                  notes, source_type, source_visit_id, created_by, created_at)
                VALUES (:id, :tid, :cid, 'visit', :summary, :notes, 'sfa_visit', :vid, :uid, :time)
              `, {
                id: genId('INT'), tid: tenantId, cid: custId,
                summary: `Kunjungan ${visit.visit_number || ''} — ${visit.purpose || 'Field visit'}`,
                notes: visit.notes, vid, uid: visit.salesperson_id || userId,
                time: visit.check_in_time || new Date()
              });
              linked++;
            } catch { failed++; }
          }
          return res.json({ success: true, message: `${linked} visit ditautkan`, data: { linked, failed } });
        }

        // ─── Sync Pipeline → CRM Forecast ───
        case 'sync-pipeline-forecast': {
          const { period, forecastType } = req.body;
          const fPeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
          const fType = forecastType || 'revenue';

          // Get or create forecast for this period
          let forecast = await qOne(`SELECT * FROM crm_forecasts WHERE tenant_id = :tid AND period = :p AND forecast_type = :ft LIMIT 1`,
            { tid: tenantId, p: fPeriod, ft: fType });

          if (!forecast) {
            const fId = genId('FCT');
            await qExec(`
              INSERT INTO crm_forecasts (id, tenant_id, name, period, forecast_type, status,
                target_amount, predicted_amount, created_by, created_at, updated_at)
              VALUES (:id, :tid, :name, :period, :ft, 'draft', 0, 0, :uid, NOW(), NOW())
            `, { id: fId, tid: tenantId, name: `Forecast ${fPeriod}`, period: fPeriod, ft: fType, uid: userId });
            forecast = { id: fId };
          }

          // Get open pipeline opportunities
          const opps = await q(`
            SELECT id, title, expected_value, probability, stage, expected_close_date, created_by
            FROM sfa_opportunities
            WHERE tenant_id = :tid AND status = 'open'
              AND NOT EXISTS (SELECT 1 FROM crm_forecast_items fi WHERE fi.source_opportunity_id = id)
            ORDER BY expected_value DESC
          `, { tid: tenantId });

          let synced = 0;
          let totalWeighted = 0;
          for (const opp of opps) {
            const weighted = (parseFloat(opp.expected_value) || 0) * ((parseFloat(opp.probability) || 50) / 100);
            await qExec(`
              INSERT INTO crm_forecast_items (id, forecast_id, name, amount, weighted_amount,
                probability, stage, source_opportunity_id, owner_id, close_date, created_at)
              VALUES (:id, :fid, :name, :amount, :weighted, :prob, :stage, :oid, :owner, :close, NOW())
            `, {
              id: genId('FCI'), fid: forecast.id,
              name: opp.title, amount: opp.expected_value || 0,
              weighted, prob: opp.probability || 50,
              stage: opp.stage, oid: opp.id,
              owner: opp.created_by, close: opp.expected_close_date
            });
            totalWeighted += weighted;
            synced++;
          }

          // Update forecast totals
          if (synced > 0) {
            await qExec(`
              UPDATE crm_forecasts SET
                predicted_amount = COALESCE(predicted_amount, 0) + :total,
                updated_at = NOW()
              WHERE id = :fid
            `, { total: totalWeighted, fid: forecast.id });
          }

          return res.json({
            success: true,
            message: `${synced} opportunity disinkronkan ke forecast`,
            data: { forecastId: forecast.id, synced, totalWeighted }
          });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('CRM-SFA Integration Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
