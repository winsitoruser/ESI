import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });
const q = async (sql: string, r?: any) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements: r }); return rows as any[]; }
  catch (e: any) { console.warn('Advanced Q: (table may not exist):', e.message); return []; }
};
const qOne = async (sql: string, r?: any) => {
  if (!sequelize) return null;
  try { const [rows] = await sequelize.query(sql, { replacements: r }); return (rows as any[])[0] || null; }
  catch (e: any) { console.warn('Advanced QOne: (table may not exist):', e.message); return null; }
};
const qExec = async (sql: string, r?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements: r }); return true; }
  catch (e: any) { console.warn('Advanced Exec: (table may not exist):', e.message); return false; }
};
/** Extract pagination params */
function getPagination(qry: any): { limit: number; offset: number; page: number } {
  const page = Math.max(parseInt(String(qry.page || '1'), 10) || 1, 1);
  const limit = Math.min(parseInt(String(qry.limit || '50'), 10) || 50, 1000);
  return { limit, offset: (page - 1) * limit, page };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);
    const { action } = req.query;
    const b = req.body || {};
    const userName = (session.user as any).name || 'System';

    // Fire-and-forget audit
    type AuditAct = 'create' | 'update' | 'delete' | 'convert' | 'assign' | 'status_change' | 'import' | 'export' | 'approve' | 'reject' | 'link';
    const fireAudit = (act: AuditAct, entityType: string, entityId?: string, newVals?: any) => {
      logAudit({ tenantId: tid, userId: uid, userName, action: act, entityType, entityId, newValues: newVals, req }).catch(() => {});
    };

    // Manager-only actions for Advanced API
    const MGR_ONLY = ['process-approval', 'create-geofence', 'update-geofence', 'create-product-commission', 'update-field-order-status'];
    if (!isManager && typeof action === 'string' && MGR_ONLY.includes(action)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Manager/Admin yang bisa melakukan aksi ini.' });
    }

    switch (action) {
      // ═══════════════════════════════════════
      // COVERAGE PLANS
      // ═══════════════════════════════════════
      case 'coverage-plans': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT cp.*, (SELECT COUNT(*) FROM sfa_coverage_assignments ca WHERE ca.coverage_plan_id = cp.id AND ca.status = 'active') as assignment_count FROM sfa_coverage_plans cp WHERE cp.tenant_id = :tid AND cp.is_active = true ORDER BY cp.priority LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_coverage_plans cp WHERE cp.tenant_id = :tid AND cp.is_active = true`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-coverage-plan': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { code, name, description, customer_class, visit_frequency, visits_per_period, min_visit_duration, required_activities } = b;
        if (!code || !name) return err(res, 'code & name wajib');
        await qExec(`INSERT INTO sfa_coverage_plans (tenant_id,code,name,description,customer_class,visit_frequency,visits_per_period,min_visit_duration,required_activities,created_by) VALUES (:tid,:code,:name,:desc,:cc,:vf,:vpp,:mvd,:ra,:uid)`,
          { tid, code, name, desc: description, cc: customer_class || 'general', vf: visit_frequency || 'weekly', vpp: visits_per_period || 4, mvd: min_visit_duration || 15, ra: JSON.stringify(required_activities || ['order_taking']), uid });
        fireAudit('create', 'sfa_coverage_plan', undefined, { code, name });
        return ok(res, { message: 'Coverage plan dibuat' });
      }
      case 'update-coverage-plan': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: cpId, ...cpF } = b;
        const cpAllowed = ['name', 'description', 'customer_class', 'visit_frequency', 'visits_per_period', 'min_visit_duration', 'is_active'];
        const cpSets = Object.keys(cpF).filter(k => cpAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (cpSets.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_coverage_plans SET ${cpSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...cpF, id: cpId, uid, tid });
        fireAudit('update', 'sfa_coverage_plan', cpId, cpF);
        return ok(res, { message: 'Coverage plan diperbarui' });
      }

      // ═══════════════════════════════════════
      // COVERAGE ASSIGNMENTS
      // ═══════════════════════════════════════
      case 'coverage-assignments': {
        const pg = getPagination(req.query);
        const { assigned_to: caUser, team_id: caTeam, status: caStatus } = req.query;
        let w = 'WHERE ca.tenant_id = :tid'; const p: any = { tid };
        if (caUser) { w += ' AND ca.assigned_to = :uid2'; p.uid2 = caUser; }
        if (caTeam) { w += ' AND ca.team_id = :tmid'; p.tmid = caTeam; }
        if (caStatus) { w += ' AND ca.status = :st'; p.st = caStatus; } else { w += " AND ca.status = 'active'"; }
        const rows = await q(`SELECT ca.*, u.name as ff_name, t.name as team_name, cp.name as plan_name FROM sfa_coverage_assignments ca LEFT JOIN users u ON ca.assigned_to = u.id LEFT JOIN sfa_teams t ON ca.team_id = t.id LEFT JOIN sfa_coverage_plans cp ON ca.coverage_plan_id = cp.id ${w} ORDER BY ca.next_planned_visit ASC NULLS LAST LIMIT :limit OFFSET :offset`, { ...p, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_coverage_assignments ca ${w}`, p);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-coverage-assignment': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ca = b;
        if (!ca.customer_name || !ca.assigned_to) return err(res, 'customer_name & assigned_to wajib');
        await qExec(`INSERT INTO sfa_coverage_assignments (tenant_id,coverage_plan_id,customer_id,customer_name,customer_class,assigned_to,team_id,territory_id,visit_day,visit_frequency,customer_address,customer_lat,customer_lng,notes) VALUES (:tid,:cpid,:cid,:cname,:cc,:ato,:tmid,:terid,:vday,:vf,:addr,:lat,:lng,:notes)`,
          { tid, cpid: ca.coverage_plan_id || null, cid: ca.customer_id || null, cname: ca.customer_name, cc: ca.customer_class || 'general', ato: ca.assigned_to, tmid: ca.team_id || null, terid: ca.territory_id || null, vday: ca.visit_day, vf: ca.visit_frequency || 'weekly', addr: ca.customer_address, lat: ca.customer_lat, lng: ca.customer_lng, notes: ca.notes });
        fireAudit('assign', 'sfa_coverage_assignment', undefined, { customer_name: ca.customer_name, assigned_to: ca.assigned_to });
        return ok(res, { message: 'Coverage assignment dibuat' });
      }
      case 'coverage-compliance': {
        const rows = await q(`
          SELECT u.id as user_id, u.name, t.name as team_name,
            COUNT(ca.id) as total_customers,
            SUM(ca.total_visits_planned) as total_planned,
            SUM(ca.total_visits_actual) as total_actual,
            CASE WHEN SUM(ca.total_visits_planned) > 0 THEN ROUND(SUM(ca.total_visits_actual)::numeric / SUM(ca.total_visits_planned) * 100, 1) ELSE 0 END as compliance_pct,
            COUNT(CASE WHEN ca.next_planned_visit < CURRENT_DATE THEN 1 END) as overdue_visits
          FROM sfa_coverage_assignments ca
          JOIN users u ON ca.assigned_to = u.id
          LEFT JOIN sfa_teams t ON ca.team_id = t.id
          WHERE ca.tenant_id = :tid AND ca.status = 'active'
          GROUP BY u.id, u.name, t.name ORDER BY compliance_pct DESC
        `, { tid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // FIELD ORDERS
      // ═══════════════════════════════════════
      case 'field-orders': {
        const pg = getPagination(req.query);
        const { status: foSt, salesperson_id: foSp, date_from: foDF, date_to: foDT } = req.query;
        let w2 = 'WHERE fo.tenant_id = :tid'; const p2: any = { tid };
        if (foSt) { w2 += ' AND fo.status = :st'; p2.st = foSt; }
        if (foSp) { w2 += ' AND fo.salesperson_id = :sp'; p2.sp = foSp; }
        if (foDF) { w2 += ' AND fo.order_date >= :df'; p2.df = foDF; }
        if (foDT) { w2 += ' AND fo.order_date <= :dt'; p2.dt = foDT; }
        const rows = await q(`SELECT fo.*, u.name as salesperson_name, t.name as team_name, (SELECT COUNT(*) FROM sfa_field_order_items i WHERE i.field_order_id = fo.id) as item_count FROM sfa_field_orders fo LEFT JOIN users u ON fo.salesperson_id = u.id LEFT JOIN sfa_teams t ON fo.team_id = t.id ${w2} ORDER BY fo.order_date DESC, fo.created_at DESC LIMIT :limit OFFSET :offset`, { ...p2, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_field_orders fo ${w2}`, p2);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'field-order-detail': {
        const { id } = req.query;
        const [fo] = await q(`SELECT fo.*, u.name as salesperson_name FROM sfa_field_orders fo LEFT JOIN users u ON fo.salesperson_id = u.id WHERE fo.id = :id AND fo.tenant_id = :tid`, { id, tid });
        if (!fo) return err(res, 'Order not found', 404);
        const items = await q(`SELECT * FROM sfa_field_order_items WHERE field_order_id = :id ORDER BY sort_order`, { id });
        return ok(res, { data: { ...fo, items } });
      }
      case 'create-field-order': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const fo = b;
        if (!fo.customer_name) return err(res, 'customer_name wajib');
        const num = `FO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(Date.now()).slice(-6)}`;
        const [row] = await q(`INSERT INTO sfa_field_orders (tenant_id,order_number,visit_id,customer_id,customer_name,customer_address,salesperson_id,team_id,territory_id,order_date,delivery_date,payment_method,payment_terms,notes,lat,lng,created_by) VALUES (:tid,:num,:vid,:cid,:cname,:caddr,:sp,:tmid,:terid,:odate,:ddate,:pm,:pt,:notes,:lat,:lng,:uid) RETURNING id`,
          { tid, num, vid: fo.visit_id||null, cid: fo.customer_id||null, cname: fo.customer_name, caddr: fo.customer_address||null, sp: fo.salesperson_id||uid, tmid: fo.team_id||null, terid: fo.territory_id||null, odate: fo.order_date||new Date().toISOString().slice(0,10), ddate: fo.delivery_date||null, pm: fo.payment_method||'credit', pt: fo.payment_terms||30, notes: fo.notes||null, lat: fo.lat||null, lng: fo.lng||null, uid });
        if (!row) return err(res, 'Gagal membuat field order');

        // Insert items
        let subtotal = 0;
        if (fo.items && fo.items.length > 0) {
          for (let i = 0; i < fo.items.length; i++) {
            const item = fo.items[i];
            const qty = parseFloat(item.quantity) || 1;
            const price = parseFloat(item.unit_price) || 0;
            const discPct = parseFloat(item.discount_pct) || 0;
            const discAmt = price * qty * (discPct / 100);
            const itemTotal = (price * qty) - discAmt;
            subtotal += itemTotal;
            await qExec(`INSERT INTO sfa_field_order_items (field_order_id,product_id,product_name,product_sku,category_name,quantity,unit,unit_price,discount_pct,discount_amount,subtotal,commission_rate,sort_order) VALUES (:foid,:pid,:pname,:psku,:cname,:qty,:unit,:price,:dpct,:damt,:sub,:cr,:so)`,
              { foid: row.id, pid: item.product_id||null, pname: item.product_name, psku: item.product_sku, cname: item.category_name, qty, unit: item.unit||'pcs', price, dpct: discPct, damt: discAmt, sub: itemTotal, cr: item.commission_rate||0, so: i+1 });
          }
        }
        const taxAmt = subtotal * 0.11; // PPN 11%
        const total = subtotal + taxAmt;
        await qExec(`UPDATE sfa_field_orders SET subtotal=:sub, tax_amount=:tax, total=:total WHERE id=:id AND tenant_id=:tid`, { sub: subtotal, tax: taxAmt, total, id: row.id, tid });

        fireAudit('create', 'sfa_field_order', row.id, { order_number: num, total });
        return ok(res, { message: 'Field order dibuat', data: { id: row.id, order_number: num, total } });
      }
      case 'update-field-order-status': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: foId, status: foStatus, rejected_reason } = b;
        if (!foId || !foStatus) return err(res, 'id & status wajib');
        const validStatuses = ['draft', 'submitted', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(foStatus)) return err(res, 'Status tidak valid');
        let foSql = 'UPDATE sfa_field_orders SET status=:status, updated_by=:uid, updated_at=NOW()';
        const foParams: any = { status: foStatus, uid, id: foId, tid };
        if (foStatus === 'approved') { foSql += ', approved_by=:uid, approved_at=NOW()'; }
        if (foStatus === 'rejected' && rejected_reason) { foSql += ', rejected_reason=:reason'; foParams.reason = rejected_reason; }
        foSql += ' WHERE id=:id AND tenant_id=:tid';
        await qExec(foSql, foParams);
        fireAudit(foStatus === 'approved' ? 'approve' : foStatus === 'rejected' ? 'reject' : 'status_change', 'sfa_field_order', foId, { status: foStatus });

        // Auto-sync ke sfa_sales_entries saat order di-approve (tidak double insert karena guard NOT EXISTS)
        let autoSyncedLines = 0;
        if (foStatus === 'approved') {
          try {
            const order = await qOne(
              `SELECT fo.*, u.name AS salesperson_name, c.name AS customer_display, c.channel AS customer_channel
                 FROM sfa_field_orders fo
                 LEFT JOIN users u ON fo.salesperson_id = u.id
                 LEFT JOIN customers c ON c.id::text = fo.customer_id::text
                WHERE fo.id = :id AND fo.tenant_id = :tid`,
              { id: foId, tid },
            );
            if (order) {
              const items = await q(
                `SELECT product_id, product_name, product_sku, category_name,
                        quantity, unit, unit_price, discount_amount, subtotal
                   FROM sfa_field_order_items WHERE field_order_id = :fid ORDER BY sort_order`,
                { fid: foId },
              );
              const entryDate = order.order_date || new Date().toISOString().slice(0, 10);
              const period = String(entryDate).slice(0, 7);
              const year = parseInt(period.split('-')[0], 10);
              for (const it of items) {
                // guard: skip bila sudah pernah disync
                const exists = await qOne(
                  `SELECT id FROM sfa_sales_entries
                    WHERE tenant_id = :tid AND reference_type = 'field_order'
                      AND reference_id = :rid AND product_sku = :psku LIMIT 1`,
                  { tid, rid: String(foId), psku: it.product_sku || '' },
                );
                if (exists) continue;
                const qty = parseFloat(it.quantity) || 0;
                const price = parseFloat(it.unit_price) || 0;
                const disc = parseFloat(it.discount_amount) || 0;
                const net = parseFloat(it.subtotal) || (qty * price - disc);
                const okInsert = await qExec(
                  `INSERT INTO sfa_sales_entries
                     (tenant_id, entry_date, period, year, sales_type, source, reference_type, reference_id, reference_number,
                      salesperson_id, salesperson_name, team_id, territory_id,
                      outlet_id, outlet_name, outlet_channel,
                      product_id, product_sku, product_name, product_group, product_uom,
                      quantity, unit_price, gross_amount, discount_amount, net_amount, currency,
                      status, created_by)
                   VALUES
                     (:tid, :edate, :period, :year, 'primary', 'field_order', 'field_order', :rid, :rnum,
                      :sp, :spname, :team, :ter,
                      :oid, :oname, :ochan,
                      :pid, :psku, :pname, :pgrp, :puom,
                      :qty, :price, :gross, :disc, :net, :curr,
                      'confirmed', :uid)`,
                  {
                    tid, uid,
                    edate: entryDate, period, year,
                    rid: String(foId), rnum: order.order_number,
                    sp: order.salesperson_id, spname: order.salesperson_name,
                    team: order.team_id, ter: order.territory_id,
                    oid: order.customer_id ? String(order.customer_id) : null,
                    oname: order.customer_display || order.customer_name,
                    ochan: order.customer_channel || null,
                    pid: it.product_id ? String(it.product_id) : null,
                    psku: it.product_sku || null,
                    pname: it.product_name, pgrp: it.category_name || null,
                    puom: it.unit || 'pcs',
                    qty, price, gross: qty * price, disc, net,
                    curr: 'IDR',
                  },
                );
                if (okInsert) autoSyncedLines++;
              }
              if (autoSyncedLines > 0) {
                fireAudit('link', 'sfa_sales_entry', String(foId), { source: 'field_order_auto_sync', lines: autoSyncedLines });
              }
            }
          } catch (syncErr: any) {
            console.warn('[advanced] auto-sync sales entry error:', syncErr.message);
          }
        }

        return ok(res, { message: `Order ${foStatus}`, auto_synced_lines: autoSyncedLines });
      }

      // ═══════════════════════════════════════
      // DISPLAY AUDITS (Merchandising)
      // ═══════════════════════════════════════
      case 'display-audits': {
        const pg = getPagination(req.query);
        const { salesperson_id: daSp, date_from: daDF, date_to: daDT } = req.query;
        let w3 = 'WHERE da.tenant_id = :tid'; const p3: any = { tid };
        if (daSp) { w3 += ' AND da.salesperson_id = :sp'; p3.sp = daSp; }
        if (daDF) { w3 += ' AND da.audit_date >= :df'; p3.df = daDF; }
        if (daDT) { w3 += ' AND da.audit_date <= :dt'; p3.dt = daDT; }
        const rows = await q(`SELECT da.*, u.name as salesperson_name FROM sfa_display_audits da LEFT JOIN users u ON da.salesperson_id = u.id ${w3} ORDER BY da.audit_date DESC LIMIT :limit OFFSET :offset`, { ...p3, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_display_audits da ${w3}`, p3);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'display-audit-detail': {
        const { id } = req.query;
        const [da] = await q(`SELECT da.*, u.name as salesperson_name FROM sfa_display_audits da LEFT JOIN users u ON da.salesperson_id = u.id WHERE da.id = :id AND da.tenant_id = :tid`, { id, tid });
        if (!da) return err(res, 'Audit not found', 404);
        const items = await q(`SELECT * FROM sfa_display_items WHERE audit_id = :id ORDER BY sort_order`, { id });
        return ok(res, { data: { ...da, items } });
      }
      case 'create-display-audit': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const da = b;
        const [row] = await q(`INSERT INTO sfa_display_audits (tenant_id,visit_id,customer_id,customer_name,salesperson_id,audit_date,store_type,notes,lat,lng,created_by) VALUES (:tid,:vid,:cid,:cname,:sp,:adate,:stype,:notes,:lat,:lng,:uid) RETURNING id`,
          { tid, vid: da.visit_id||null, cid: da.customer_id||null, cname: da.customer_name, sp: da.salesperson_id||uid, adate: da.audit_date||new Date().toISOString().slice(0,10), stype: da.store_type, notes: da.notes, lat: da.lat||null, lng: da.lng||null, uid });
        // Insert items
        let totalItems = 0, compliantItems = 0, totalScore = 0, maxTotalScore = 0;
        if (da.items && da.items.length > 0) {
          for (let i = 0; i < da.items.length; i++) {
            const item = da.items[i];
            totalItems++;
            if (item.is_compliant) compliantItems++;
            totalScore += parseFloat(item.score) || 0;
            maxTotalScore += parseFloat(item.max_score) || 10;
            await qExec(`INSERT INTO sfa_display_items (audit_id,category,check_item,is_compliant,score,max_score,facing_count,shelf_position,photo_url,notes,sort_order) VALUES (:aid,:cat,:ci,:ic,:sc,:ms,:fc,:sp,:purl,:notes,:so)`,
              { aid: row.id, cat: item.category, ci: item.check_item, ic: item.is_compliant||false, sc: item.score||0, ms: item.max_score||10, fc: item.facing_count||0, sp: item.shelf_position, purl: item.photo_url, notes: item.notes, so: i+1 });
          }
        }
        const overallScore = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;
        const compliancePct = totalItems > 0 ? (compliantItems / totalItems) * 100 : 0;
        await qExec(`UPDATE sfa_display_audits SET total_items=:ti, compliant_items=:ci, overall_score=:os, compliance_pct=:cp WHERE id=:id AND tenant_id=:tid`, { ti: totalItems, ci: compliantItems, os: overallScore, cp: compliancePct, id: row.id, tid });
        return ok(res, { message: 'Display audit dibuat', data: { id: row.id, compliance_pct: compliancePct } });
      }

      // ═══════════════════════════════════════
      // COMPETITOR ACTIVITIES
      // ═══════════════════════════════════════
      case 'competitor-activities': {
        const pg = getPagination(req.query);
        const { territory_id: caTer, competitor_name: caCn, impact_level: caIl } = req.query;
        let w4 = 'WHERE c.tenant_id = :tid'; const p4: any = { tid };
        if (caTer) { w4 += ' AND c.territory_id = :ter'; p4.ter = caTer; }
        if (caCn) { w4 += ' AND c.competitor_name ILIKE :cn'; p4.cn = `%${caCn}%`; }
        if (caIl) { w4 += ' AND c.impact_level = :il'; p4.il = caIl; }
        const rows = await q(`SELECT c.*, u.name as reporter_name, ter.name as territory_name FROM sfa_competitor_activities c LEFT JOIN users u ON c.salesperson_id = u.id LEFT JOIN sfa_territories ter ON c.territory_id = ter.id ${w4} ORDER BY c.reported_date DESC LIMIT :limit OFFSET :offset`, { ...p4, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_competitor_activities c ${w4}`, p4);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-competitor-activity': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ca = b;
        if (!ca.competitor_name) return err(res, 'competitor_name wajib');
        await qExec(`INSERT INTO sfa_competitor_activities (tenant_id,visit_id,customer_id,customer_name,salesperson_id,territory_id,reported_date,competitor_name,competitor_brand,activity_type,product_category,description,competitor_price,our_price,price_difference,promo_type,promo_detail,display_quality,stock_availability,estimated_market_share,photo_url,impact_level,action_required,tags,created_by) VALUES (:tid,:vid,:cid,:cname,:sp,:terid,:rdate,:cn,:cb,:at,:pc,:desc,:cp,:op,:pd,:pt,:pdet,:dq,:sa,:ems,:purl,:il,:ar,:tags,:uid)`,
          { tid, vid: ca.visit_id||null, cid: ca.customer_id||null, cname: ca.customer_name, sp: ca.salesperson_id||uid, terid: ca.territory_id||null, rdate: ca.reported_date||new Date().toISOString().slice(0,10), cn: ca.competitor_name, cb: ca.competitor_brand, at: ca.activity_type||'promotion', pc: ca.product_category, desc: ca.description, cp: ca.competitor_price||null, op: ca.our_price||null, pd: ca.price_difference||null, pt: ca.promo_type, pdet: ca.promo_detail, dq: ca.display_quality, sa: ca.stock_availability, ems: ca.estimated_market_share||null, purl: ca.photo_url, il: ca.impact_level||'medium', ar: ca.action_required, tags: JSON.stringify(ca.tags||[]), uid });
        return ok(res, { message: 'Aktivitas kompetitor dilaporkan' });
      }
      case 'update-competitor-activity': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: caId, ...caF } = b;
        if (!caId) return err(res, 'id required');
        const caAllowed = ['resolved', 'impact_level', 'action_required', 'description', 'resolved_at'];
        if (caF.resolved === true && !caF.resolved_at) caF.resolved_at = new Date().toISOString();
        const caSets = Object.keys(caF).filter(k => caAllowed.includes(k)).map(k => `${k} = :${k}`).join(', ');
        if (!caSets) return err(res, 'No valid fields');
        await qExec(`UPDATE sfa_competitor_activities SET ${caSets}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { ...caF, id: caId, tid });
        return ok(res, { message: 'Aktivitas kompetitor diupdate' });
      }
      case 'competitor-summary': {
        const rows = await q(`
          SELECT competitor_name, COUNT(*) as report_count,
            COUNT(DISTINCT territory_id) as territories_affected,
            AVG(estimated_market_share) as avg_market_share,
            MAX(reported_date) as last_reported,
            COUNT(CASE WHEN impact_level = 'high' THEN 1 END) as high_impact_count,
            COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved_count
          FROM sfa_competitor_activities WHERE tenant_id = :tid
          GROUP BY competitor_name ORDER BY report_count DESC
        `, { tid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // SURVEYS
      // ═══════════════════════════════════════
      case 'survey-templates': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT st.*, (SELECT COUNT(*) FROM sfa_survey_responses sr WHERE sr.template_id = st.id) as response_count FROM sfa_survey_templates st WHERE st.tenant_id = :tid ORDER BY st.status, st.title LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_survey_templates st WHERE st.tenant_id = :tid`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'survey-template-detail': {
        const { id } = req.query;
        const [st] = await q(`SELECT * FROM sfa_survey_templates WHERE id = :id AND tenant_id = :tid`, { id, tid });
        if (!st) return err(res, 'Survey not found', 404);
        const questions = await q(`SELECT * FROM sfa_survey_questions WHERE template_id = :id ORDER BY sort_order`, { id });
        return ok(res, { data: { ...st, questions } });
      }
      case 'create-survey-template': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const st = b;
        if (!st.code || !st.title) return err(res, 'code & title wajib');
        const [row] = await q(`INSERT INTO sfa_survey_templates (tenant_id,code,title,description,survey_type,target_audience,is_required,estimated_minutes,status,created_by) VALUES (:tid,:code,:title,:desc,:st,:ta,:ir,:em,:status,:uid) RETURNING id`,
          { tid, code: st.code, title: st.title, desc: st.description, st: st.survey_type||'general', ta: st.target_audience||'customer', ir: st.is_required||false, em: st.estimated_minutes||5, status: 'active', uid });
        // Insert questions
        if (st.questions && st.questions.length > 0) {
          for (let i = 0; i < st.questions.length; i++) {
            const q2 = st.questions[i];
            await qExec(`INSERT INTO sfa_survey_questions (template_id,question_text,question_type,is_required,options,placeholder,help_text,section,sort_order) VALUES (:tmid,:qt,:qtype,:ir,:opts,:ph,:ht,:sec,:so)`,
              { tmid: row.id, qt: q2.question_text, qtype: q2.question_type||'text', ir: q2.is_required||false, opts: JSON.stringify(q2.options||[]), ph: q2.placeholder, ht: q2.help_text, sec: q2.section, so: i+1 });
          }
          await qExec(`UPDATE sfa_survey_templates SET question_count = :qc WHERE id = :id AND tenant_id = :tid`, { qc: st.questions.length, id: row.id, tid });
        }
        return ok(res, { message: 'Survey template dibuat', data: { id: row.id } });
      }
      case 'submit-survey-response': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const sr = b;
        if (!sr.template_id) return err(res, 'template_id wajib');
        await qExec(`INSERT INTO sfa_survey_responses (tenant_id,template_id,visit_id,customer_id,customer_name,respondent_id,response_date,answers,score,completion_pct,duration_seconds,lat,lng,notes) VALUES (:tid,:tmid,:vid,:cid,:cname,:rid,:rdate,:answers,:score,:comp,:dur,:lat,:lng,:notes)`,
          { tid, tmid: sr.template_id, vid: sr.visit_id||null, cid: sr.customer_id||null, cname: sr.customer_name, rid: uid, rdate: sr.response_date||new Date().toISOString().slice(0,10), answers: JSON.stringify(sr.answers||{}), score: sr.score||null, comp: sr.completion_pct||100, dur: sr.duration_seconds||null, lat: sr.lat||null, lng: sr.lng||null, notes: sr.notes });
        return ok(res, { message: 'Survey response disimpan' });
      }
      case 'survey-responses': {
        const pg = getPagination(req.query);
        const { template_id: srTm } = req.query;
        let w5 = 'WHERE sr.tenant_id = :tid'; const p5: any = { tid };
        if (srTm) { w5 += ' AND sr.template_id = :tmid'; p5.tmid = srTm; }
        const rows = await q(`SELECT sr.*, st.title as survey_title, u.name as respondent_name FROM sfa_survey_responses sr LEFT JOIN sfa_survey_templates st ON sr.template_id = st.id LEFT JOIN users u ON sr.respondent_id = u.id ${w5} ORDER BY sr.response_date DESC LIMIT :limit OFFSET :offset`, { ...p5, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_survey_responses sr ${w5}`, p5);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }

      // ═══════════════════════════════════════
      // APPROVAL WORKFLOWS
      // ═══════════════════════════════════════
      case 'approval-workflows': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT aw.*, (SELECT COUNT(*) FROM sfa_approval_steps s WHERE s.workflow_id = aw.id) as step_count, (SELECT COUNT(*) FROM sfa_approval_requests ar WHERE ar.workflow_id = aw.id AND ar.status = 'pending') as pending_count FROM sfa_approval_workflows aw WHERE aw.tenant_id = :tid ORDER BY aw.entity_type LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_approval_workflows aw WHERE aw.tenant_id = :tid`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'approval-workflow-detail': {
        const { id } = req.query;
        const [aw] = await q(`SELECT * FROM sfa_approval_workflows WHERE id = :id AND tenant_id = :tid`, { id, tid });
        if (!aw) return err(res, 'Workflow not found', 404);
        const steps = await q(`SELECT * FROM sfa_approval_steps WHERE workflow_id = :id ORDER BY sort_order`, { id });
        return ok(res, { data: { ...aw, steps } });
      }
      case 'create-approval-workflow': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const aw = b;
        if (!aw.code || !aw.name || !aw.entity_type) return err(res, 'code, name, entity_type wajib');
        const [row] = await q(`INSERT INTO sfa_approval_workflows (tenant_id,code,name,description,entity_type,condition_rules,total_steps,created_by) VALUES (:tid,:code,:name,:desc,:et,:cr,:ts,:uid) RETURNING id`,
          { tid, code: aw.code, name: aw.name, desc: aw.description, et: aw.entity_type, cr: JSON.stringify(aw.condition_rules||{}), ts: aw.steps?.length||1, uid });
        if (aw.steps) {
          for (let i = 0; i < aw.steps.length; i++) {
            const s = aw.steps[i];
            await qExec(`INSERT INTO sfa_approval_steps (workflow_id,step_number,step_name,approver_type,approver_role,approver_user_id,can_reject,can_delegate,notify_on_pending,sort_order) VALUES (:wid,:sn,:sname,:at,:ar,:auid,:cr,:cd,:np,:so)`,
              { wid: row.id, sn: i+1, sname: s.step_name, at: s.approver_type||'role', ar: s.approver_role, auid: s.approver_user_id||null, cr: s.can_reject !== false, cd: s.can_delegate||false, np: s.notify_on_pending !== false, so: i+1 });
          }
        }
        return ok(res, { message: 'Workflow approval dibuat', data: { id: row.id } });
      }
      case 'approval-requests': {
        const pg = getPagination(req.query);
        const { status: arSt, entity_type: arEt, my_approvals } = req.query;
        let w6 = 'WHERE ar.tenant_id = :tid'; const p6: any = { tid };
        if (arSt) { w6 += ' AND ar.status = :st'; p6.st = arSt; }
        if (arEt) { w6 += ' AND ar.entity_type = :et'; p6.et = arEt; }
        if (my_approvals === 'true') { w6 += ' AND ar.current_approver_id = :uid'; p6.uid = uid; }
        const rows = await q(`SELECT ar.*, u.name as requester_name, aw.name as workflow_name FROM sfa_approval_requests ar LEFT JOIN users u ON ar.requested_by = u.id LEFT JOIN sfa_approval_workflows aw ON ar.workflow_id = aw.id ${w6} ORDER BY ar.requested_at DESC LIMIT :limit OFFSET :offset`, { ...p6, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_approval_requests ar ${w6}`, p6);
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'submit-approval': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ap = b;
        if (!ap.entity_type || !ap.entity_id) return err(res, 'entity_type & entity_id wajib');
        // Find matching workflow
        const [wf] = await q(`SELECT * FROM sfa_approval_workflows WHERE tenant_id = :tid AND entity_type = :et AND is_active = true LIMIT 1`, { tid, et: ap.entity_type });
        if (!wf) return err(res, 'Tidak ada workflow approval untuk tipe ini');
        // Get first step
        const [step] = await q(`SELECT * FROM sfa_approval_steps WHERE workflow_id = :wid ORDER BY sort_order LIMIT 1`, { wid: wf.id });
        await qExec(`INSERT INTO sfa_approval_requests (tenant_id,workflow_id,entity_type,entity_id,entity_number,entity_summary,requested_by,current_step,total_steps,status,current_approver_role,amount,priority,due_date,metadata) VALUES (:tid,:wid,:et,:eid,:enum,:esum,:uid,1,:ts,'pending',:car,:amt,:pri,:due,:meta)`,
          { tid, wid: wf.id, et: ap.entity_type, eid: ap.entity_id, enum: ap.entity_number, esum: ap.entity_summary, uid, ts: wf.total_steps, car: step?.approver_role, amt: ap.amount||null, pri: ap.priority||'normal', due: ap.due_date||null, meta: JSON.stringify(ap.metadata||{}) });
        return ok(res, { message: 'Approval request diajukan' });
      }
      case 'process-approval': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: arId, decision, reason } = b;
        if (!arId || !decision) return err(res, 'id & decision wajib');
        const [arReq] = await q(`SELECT * FROM sfa_approval_requests WHERE id = :id AND tenant_id = :tid`, { id: arId, tid });
        if (!arReq) return err(res, 'Request not found', 404);

        const history = arReq.approval_history || [];
        history.push({ step: arReq.current_step, approver_id: uid, decision, reason, timestamp: new Date().toISOString() });

        if (decision === 'rejected') {
          await qExec(`UPDATE sfa_approval_requests SET status='rejected', final_status='rejected', rejected_by=:uid, rejected_reason=:reason, approval_history=:hist::jsonb, completed_at=NOW(), updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { uid, reason, hist: JSON.stringify(history), id: arId, tid });
        } else if (arReq.current_step >= arReq.total_steps) {
          await qExec(`UPDATE sfa_approval_requests SET status='approved', final_status='approved', approval_history=:hist::jsonb, completed_at=NOW(), updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { hist: JSON.stringify(history), id: arId, tid });
        } else {
          const nextStep = arReq.current_step + 1;
          const [nxtStep] = await q(`SELECT * FROM sfa_approval_steps WHERE workflow_id = :wid AND step_number = :sn`, { wid: arReq.workflow_id, sn: nextStep });
          await qExec(`UPDATE sfa_approval_requests SET current_step=:ns, current_approver_role=:car, approval_history=:hist::jsonb, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { ns: nextStep, car: nxtStep?.approver_role, hist: JSON.stringify(history), id: arId, tid });
        }
        return ok(res, { message: `Approval ${decision}` });
      }

      // ═══════════════════════════════════════
      // GEOFENCES
      // ═══════════════════════════════════════
      case 'geofences': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT gf.*, ter.name as territory_name FROM sfa_geofences gf LEFT JOIN sfa_territories ter ON gf.territory_id = ter.id WHERE gf.tenant_id = :tid ORDER BY gf.name LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_geofences gf WHERE gf.tenant_id = :tid`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-geofence': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const gf = b;
        if (!gf.name || !gf.center_lat || !gf.center_lng) return err(res, 'name, center_lat, center_lng wajib');
        await qExec(`INSERT INTO sfa_geofences (tenant_id,name,description,fence_type,center_lat,center_lng,radius_meters,polygon_coords,reference_type,reference_id,customer_id,territory_id,alert_on_enter,alert_on_exit,created_by) VALUES (:tid,:name,:desc,:ft,:lat,:lng,:rad,:poly,:rt,:rid,:cid,:terid,:ae,:ax,:uid)`,
          { tid, name: gf.name, desc: gf.description, ft: gf.fence_type||'circle', lat: gf.center_lat, lng: gf.center_lng, rad: gf.radius_meters||200, poly: JSON.stringify(gf.polygon_coords||[]), rt: gf.reference_type, rid: gf.reference_id||null, cid: gf.customer_id||null, terid: gf.territory_id||null, ae: gf.alert_on_enter!==false, ax: gf.alert_on_exit||false, uid });
        return ok(res, { message: 'Geofence dibuat' });
      }
      case 'check-geofence': {
        const { lat, lng, customer_id: gfCid } = req.query;
        if (!lat || !lng) return err(res, 'lat & lng wajib');
        const fLat = parseFloat(lat as string), fLng = parseFloat(lng as string);
        let gfWhere = 'WHERE gf.tenant_id = :tid AND gf.is_active = true';
        const gfParams: any = { tid };
        if (gfCid) { gfWhere += ' AND gf.customer_id = :cid'; gfParams.cid = gfCid; }
        const fences = await q(`SELECT * FROM sfa_geofences gf ${gfWhere}`, gfParams);
        const inside: any[] = [];
        for (const f of fences) {
          if (f.fence_type === 'circle') {
            const dist = haversine(fLat, fLng, parseFloat(f.center_lat), parseFloat(f.center_lng));
            if (dist <= (f.radius_meters || 200)) inside.push({ ...f, distance: Math.round(dist) });
          }
        }
        return ok(res, { data: { inside_geofence: inside.length > 0, matching_fences: inside } });
      }

      // ═══════════════════════════════════════
      // INVENTORY PRODUCTS (for commission form)
      // ═══════════════════════════════════════
      case 'inventory-products': {
        const { search: pSearch } = req.query;
        let pw = ''; const pp: any = {};
        if (pSearch) { pw = " WHERE name ILIKE :s OR sku ILIKE :s OR category ILIKE :s"; pp.s = `%${pSearch}%`; }
        const rows = await q(`SELECT id, name, sku, category, price FROM products${pw} ORDER BY name LIMIT 100`, pp);
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // PRODUCT COMMISSIONS
      // ═══════════════════════════════════════
      case 'product-commissions': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT * FROM sfa_product_commissions WHERE tenant_id = :tid AND is_active = true ORDER BY product_name LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_product_commissions WHERE tenant_id = :tid AND is_active = true`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-product-commission': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const pc = b;
        if (!pc.product_name) return err(res, 'product_name wajib');
        await qExec(`INSERT INTO sfa_product_commissions (tenant_id,product_name,product_sku,category_name,commission_type,commission_rate,flat_amount,min_quantity,bonus_rate,bonus_threshold,effective_from,effective_to,notes,created_by) VALUES (:tid,:pname,:psku,:cname,:ct,:cr,:fa,:mq,:br,:bt,:ef,:et,:notes,:uid)`,
          { tid, pname: pc.product_name, psku: pc.product_sku, cname: pc.category_name, ct: pc.commission_type||'percentage', cr: pc.commission_rate||0, fa: pc.flat_amount||0, mq: pc.min_quantity||0, br: pc.bonus_rate||0, bt: pc.bonus_threshold||0, ef: pc.effective_from||null, et: pc.effective_to||null, notes: pc.notes, uid });
        return ok(res, { message: 'Product commission dibuat' });
      }
      case 'update-product-commission': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: pcId, ...pcF } = b;
        const pcAllowed = ['commission_rate', 'flat_amount', 'min_quantity', 'bonus_rate', 'bonus_threshold', 'is_active', 'notes'];
        const pcSets = Object.keys(pcF).filter(k => pcAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (pcSets.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_product_commissions SET ${pcSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...pcF, id: pcId, uid, tid });
        return ok(res, { message: 'Product commission diperbarui' });
      }

      // ═══════════════════════════════════════
      // COMMISSION GROUPS (Bundle/Cross-sell)
      // ═══════════════════════════════════════
      case 'commission-groups': {
        const pg = getPagination(req.query);
        const groups = await q(`SELECT g.*, (SELECT COUNT(*) FROM sfa_commission_group_products gp WHERE gp.group_id = g.id) as product_count FROM sfa_commission_groups g WHERE g.tenant_id = :tid AND g.is_deleted IS NOT TRUE ORDER BY g.priority DESC, g.name LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_commission_groups g WHERE g.tenant_id = :tid AND g.is_deleted IS NOT TRUE`, { tid });
        for (const g of groups) {
          (g as any).products = await q(`SELECT * FROM sfa_commission_group_products WHERE group_id = :gid ORDER BY sort_order`, { gid: (g as any).id });
        }
        return ok(res, { rows: groups, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-commission-group': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const cg = b;
        if (!cg.name) return err(res, 'name wajib');
        if (!cg.products || cg.products.length < 2) return err(res, 'Minimal 2 produk dalam group');
        const row = await qOne(`INSERT INTO sfa_commission_groups (tenant_id,code,name,description,group_type,calculation_method,bonus_amount,bonus_percentage,min_total_quantity,min_total_value,period_type,effective_from,effective_to,priority,notes,created_by) VALUES (:tid,:code,:name,:desc,:gt,:cm,:ba,:bp,:mtq,:mtv,:pt,:ef,:et,:pri,:notes,:uid) RETURNING *`,
          { tid, code: cg.code || `CG-${Date.now().toString(36).toUpperCase()}`, name: cg.name, desc: cg.description, gt: cg.group_type || 'bundle', cm: cg.calculation_method || 'flat', ba: cg.bonus_amount || 0, bp: cg.bonus_percentage || 0, mtq: cg.min_total_quantity || 0, mtv: cg.min_total_value || 0, pt: cg.period_type || 'monthly', ef: cg.effective_from || null, et: cg.effective_to || null, pri: cg.priority || 0, notes: cg.notes, uid });
        if (row) {
          for (let i = 0; i < cg.products.length; i++) {
            const p = cg.products[i];
            await qExec(`INSERT INTO sfa_commission_group_products (group_id,product_id,product_name,product_sku,min_quantity,weight,sort_order) VALUES (:gid,:pid,:pname,:psku,:mq,:w,:so)`,
              { gid: (row as any).id, pid: p.product_id, pname: p.product_name, psku: p.product_sku || '', mq: p.min_quantity || 1, w: p.weight || 1, so: i });
          }
        }
        return ok(res, { data: row, message: 'Commission group dibuat' });
      }
      case 'update-commission-group': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: cgId, products: cgProds, ...cgF } = b;
        const cgAllowed = ['name', 'description', 'group_type', 'calculation_method', 'bonus_amount', 'bonus_percentage', 'min_total_quantity', 'min_total_value', 'period_type', 'effective_from', 'effective_to', 'is_active', 'priority', 'notes'];
        const cgSets = Object.keys(cgF).filter(k => cgAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (cgSets.length > 0) {
          await qExec(`UPDATE sfa_commission_groups SET ${cgSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...cgF, id: cgId, uid, tid });
        }
        if (cgProds && Array.isArray(cgProds)) {
          await qExec(`DELETE FROM sfa_commission_group_products WHERE group_id=:gid`, { gid: cgId });
          for (let i = 0; i < cgProds.length; i++) {
            const p = cgProds[i];
            await qExec(`INSERT INTO sfa_commission_group_products (group_id,product_id,product_name,product_sku,min_quantity,weight,sort_order) VALUES (:gid,:pid,:pname,:psku,:mq,:w,:so)`,
              { gid: cgId, pid: p.product_id, pname: p.product_name, psku: p.product_sku || '', mq: p.min_quantity || 1, w: p.weight || 1, so: i });
          }
        }
        return ok(res, { message: 'Commission group diperbarui' });
      }
      case 'delete-commission-group': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        const dgId = req.query.id;
        await qExec(`UPDATE sfa_commission_groups SET is_deleted=true, deleted_at=NOW(), deleted_by=:uid WHERE id=:id AND tenant_id=:tid`, { id: dgId, uid, tid });
        return ok(res, { message: 'Commission group dihapus' });
      }

      // ═══════════════════════════════════════
      // OUTLET TARGETS (Per-product customer/outlet targets)
      // ═══════════════════════════════════════
      case 'outlet-targets': {
        const pg = getPagination(req.query);
        const rows = await q(`SELECT * FROM sfa_outlet_targets WHERE tenant_id = :tid ORDER BY year DESC, period DESC, product_name LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_outlet_targets WHERE tenant_id = :tid`, { tid });
        return ok(res, { rows, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'create-outlet-target': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ot = b;
        if (!ot.product_name || !ot.target_value) return err(res, 'product_name dan target_value wajib');
        const row = await qOne(`INSERT INTO sfa_outlet_targets (tenant_id,code,name,product_id,product_name,product_sku,target_type,target_value,period_type,period,year,bronze_threshold_pct,silver_threshold_pct,gold_threshold_pct,platinum_threshold_pct,bronze_bonus,silver_bonus,gold_bonus,platinum_bonus,assigned_to,team_id,notes,created_by) VALUES (:tid,:code,:name,:pid,:pname,:psku,:tt,:tv,:pt,:per,:yr,:btp,:stp,:gtp,:ptp,:bb,:sb,:gb,:pb,:at,:tmid,:notes,:uid) RETURNING *`,
          { tid, code: ot.code || `OT-${Date.now().toString(36).toUpperCase()}`, name: ot.name || `Target ${ot.product_name}`, pid: ot.product_id, pname: ot.product_name, psku: ot.product_sku || '', tt: ot.target_type || 'outlet_count', tv: ot.target_value, pt: ot.period_type || 'monthly', per: ot.period || new Date().toISOString().slice(5, 7), yr: ot.year || new Date().getFullYear(), btp: ot.bronze_threshold_pct || 60, stp: ot.silver_threshold_pct || 80, gtp: ot.gold_threshold_pct || 100, ptp: ot.platinum_threshold_pct || 120, bb: ot.bronze_bonus || 0, sb: ot.silver_bonus || 0, gb: ot.gold_bonus || 0, pb: ot.platinum_bonus || 0, at: ot.assigned_to || null, tmid: ot.team_id || null, notes: ot.notes, uid });
        return ok(res, { data: row, message: 'Outlet target dibuat' });
      }
      case 'update-outlet-target': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: otId, ...otF } = b;
        const otAllowed = ['target_value', 'achieved_value', 'achievement_pct', 'bronze_threshold_pct', 'silver_threshold_pct', 'gold_threshold_pct', 'platinum_threshold_pct', 'bronze_bonus', 'silver_bonus', 'gold_bonus', 'platinum_bonus', 'is_active', 'notes'];
        const otSets = Object.keys(otF).filter(k => otAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (otSets.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_outlet_targets SET ${otSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...otF, id: otId, uid, tid });
        return ok(res, { message: 'Outlet target diperbarui' });
      }
      case 'outlet-target-summary': {
        const summary = await q(`SELECT target_type, COUNT(*) as count, COALESCE(AVG(achievement_pct),0) as avg_achievement, SUM(CASE WHEN achievement_pct >= gold_threshold_pct THEN 1 ELSE 0 END) as on_target, SUM(CASE WHEN achievement_pct < bronze_threshold_pct THEN 1 ELSE 0 END) as below_target FROM sfa_outlet_targets WHERE tenant_id = :tid AND is_active = true GROUP BY target_type`, { tid });
        return ok(res, { data: summary });
      }

      // ═══════════════════════════════════════
      // SALES STRATEGIES
      // ═══════════════════════════════════════
      case 'sales-strategies': {
        const pg = getPagination(req.query);
        const strategies = await q(`SELECT s.*, (SELECT COUNT(*) FROM sfa_strategy_kpis k WHERE k.strategy_id = s.id) as kpi_count FROM sfa_sales_strategies s WHERE s.tenant_id = :tid ORDER BY s.year DESC, s.status, s.name LIMIT :limit OFFSET :offset`, { tid, ...pg });
        const [totalRow] = await q(`SELECT COUNT(*)::int AS total FROM sfa_sales_strategies s WHERE s.tenant_id = :tid`, { tid });
        return ok(res, { rows: strategies, total: totalRow?.total ?? 0, page: pg.page, limit: pg.limit });
      }
      case 'sales-strategy-detail': {
        const sid = req.query.id;
        const strat = await qOne(`SELECT * FROM sfa_sales_strategies WHERE id = :id AND tenant_id = :tid`, { id: sid, tid });
        if (!strat) return err(res, 'Strategy tidak ditemukan');
        (strat as any).kpis = await q(`SELECT * FROM sfa_strategy_kpis WHERE strategy_id = :sid AND tenant_id = :tid ORDER BY sort_order`, { sid, tid });
        return ok(res, { data: strat });
      }
      case 'create-sales-strategy': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ss = b;
        if (!ss.name) return err(res, 'name wajib');
        const sRow = await qOne(`INSERT INTO sfa_sales_strategies (tenant_id,code,name,description,strategy_type,period_type,period,year,status,overall_target,assigned_teams,assigned_users,notes,created_by) VALUES (:tid,:code,:name,:desc,:st,:pt,:per,:yr,'draft',:ot,:at,:au,:notes,:uid) RETURNING *`,
          { tid, code: ss.code || `STR-${Date.now().toString(36).toUpperCase()}`, name: ss.name, desc: ss.description, st: ss.strategy_type || 'balanced', pt: ss.period_type || 'monthly', per: ss.period || new Date().toISOString().slice(5, 7), yr: ss.year || new Date().getFullYear(), ot: ss.overall_target || 0, at: JSON.stringify(ss.assigned_teams || []), au: JSON.stringify(ss.assigned_users || []), notes: ss.notes, uid });
        if (sRow && ss.kpis && Array.isArray(ss.kpis)) {
          for (let i = 0; i < ss.kpis.length; i++) {
            const k = ss.kpis[i];
            await qExec(`INSERT INTO sfa_strategy_kpis (strategy_id,tenant_id,kpi_code,kpi_name,description,kpi_type,target_value,unit,weight,scoring_method,threshold_bronze,threshold_silver,threshold_gold,threshold_platinum,multiplier_bronze,multiplier_silver,multiplier_gold,multiplier_platinum,sort_order) VALUES (:sid,:tid,:code,:name,:desc,:type,:tv,:unit,:w,:sm,:tb,:ts,:tg,:tp,:mb,:ms,:mg,:mp,:so)`,
              { sid: (sRow as any).id, tid, code: k.kpi_code || `KPI-${i + 1}`, name: k.kpi_name, desc: k.description, type: k.kpi_type, tv: k.target_value || 0, unit: k.unit || '', w: k.weight || 0, sm: k.scoring_method || 'linear', tb: k.threshold_bronze || 60, ts: k.threshold_silver || 80, tg: k.threshold_gold || 100, tp: k.threshold_platinum || 120, mb: k.multiplier_bronze || 0.6, ms: k.multiplier_silver || 0.8, mg: k.multiplier_gold || 1.0, mp: k.multiplier_platinum || 1.5, so: i });
          }
          await qExec(`UPDATE sfa_sales_strategies SET kpi_count=:kc, total_weight=:tw WHERE id=:id AND tenant_id=:tid`, { kc: ss.kpis.length, tw: ss.kpis.reduce((s: number, k: any) => s + (parseFloat(k.weight) || 0), 0), id: (sRow as any).id, tid });
        }
        return ok(res, { data: sRow, message: 'Sales strategy dibuat' });
      }
      case 'update-sales-strategy': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: ssId, kpis: ssKpis, ...ssF } = b;
        const ssAllowed = ['name', 'description', 'strategy_type', 'status', 'overall_target', 'assigned_teams', 'assigned_users', 'notes'];
        const ssSets = Object.keys(ssF).filter(k => ssAllowed.includes(k)).map(k => {
          if (k === 'assigned_teams' || k === 'assigned_users') return `${k}=:${k}::jsonb`;
          return `${k}=:${k}`;
        });
        if (ssSets.length > 0) {
          const params: any = { ...ssF, id: ssId, uid, tid };
          if (ssF.assigned_teams) params.assigned_teams = JSON.stringify(ssF.assigned_teams);
          if (ssF.assigned_users) params.assigned_users = JSON.stringify(ssF.assigned_users);
          await qExec(`UPDATE sfa_sales_strategies SET ${ssSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, params);
        }
        if (ssKpis && Array.isArray(ssKpis)) {
          await qExec(`DELETE FROM sfa_strategy_kpis WHERE strategy_id=:sid AND tenant_id=:tid`, { sid: ssId, tid });
          for (let i = 0; i < ssKpis.length; i++) {
            const k = ssKpis[i];
            await qExec(`INSERT INTO sfa_strategy_kpis (strategy_id,tenant_id,kpi_code,kpi_name,description,kpi_type,target_value,achieved_value,achievement_pct,unit,weight,scoring_method,threshold_bronze,threshold_silver,threshold_gold,threshold_platinum,multiplier_bronze,multiplier_silver,multiplier_gold,multiplier_platinum,sort_order) VALUES (:sid,:tid,:code,:name,:desc,:type,:tv,:av,:ap,:unit,:w,:sm,:tb,:ts,:tg,:tp,:mb,:ms,:mg,:mp,:so)`,
              { sid: ssId, tid, code: k.kpi_code || `KPI-${i + 1}`, name: k.kpi_name, desc: k.description, type: k.kpi_type, tv: k.target_value || 0, av: k.achieved_value || 0, ap: k.achievement_pct || 0, unit: k.unit || '', w: k.weight || 0, sm: k.scoring_method || 'linear', tb: k.threshold_bronze || 60, ts: k.threshold_silver || 80, tg: k.threshold_gold || 100, tp: k.threshold_platinum || 120, mb: k.multiplier_bronze || 0.6, ms: k.multiplier_silver || 0.8, mg: k.multiplier_gold || 1.0, mp: k.multiplier_platinum || 1.5, so: i });
          }
          await qExec(`UPDATE sfa_sales_strategies SET kpi_count=:kc, total_weight=:tw, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { kc: ssKpis.length, tw: ssKpis.reduce((s: number, k: any) => s + (parseFloat(k.weight) || 0), 0), id: ssId, tid });
        }
        return ok(res, { message: 'Sales strategy diperbarui' });
      }
      case 'activate-strategy': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        await qExec(`UPDATE sfa_sales_strategies SET status='active', updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { id: b.id, uid, tid });
        return ok(res, { message: 'Strategy diaktifkan' });
      }
      case 'strategy-scorecard': {
        const sid = req.query.id || b.id;
        const kpis = await q(`SELECT * FROM sfa_strategy_kpis WHERE strategy_id = :sid AND tenant_id = :tid ORDER BY sort_order`, { sid, tid });
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const k of kpis as any[]) {
          const pct = k.target_value > 0 ? (k.achieved_value / k.target_value) * 100 : 0;
          let multiplier = 0;
          if (pct >= k.threshold_platinum) multiplier = parseFloat(k.multiplier_platinum);
          else if (pct >= k.threshold_gold) multiplier = parseFloat(k.multiplier_gold);
          else if (pct >= k.threshold_silver) multiplier = parseFloat(k.multiplier_silver);
          else if (pct >= k.threshold_bronze) multiplier = parseFloat(k.multiplier_bronze);
          k.achievement_pct = pct.toFixed(2);
          k.multiplier = multiplier;
          k.weighted_score = (parseFloat(k.weight) * multiplier).toFixed(2);
          k.tier = pct >= k.threshold_platinum ? 'platinum' : pct >= k.threshold_gold ? 'gold' : pct >= k.threshold_silver ? 'silver' : pct >= k.threshold_bronze ? 'bronze' : 'below';
          totalWeightedScore += parseFloat(k.weighted_score);
          totalWeight += parseFloat(k.weight);
        }
        const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight * 100) : 0;
        return ok(res, { data: { kpis, overall_score: overallScore.toFixed(2), total_weighted_score: totalWeightedScore.toFixed(2) } });
      }

      // ═══════════════════════════════════════
      // COMMISSION SUMMARY (aggregated view)
      // ═══════════════════════════════════════
      case 'commission-summary': {
        const [prodComm] = await q(`SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM sfa_product_commissions WHERE tenant_id = :tid`, { tid });
        const [groupComm] = await q(`SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM sfa_commission_groups WHERE tenant_id = :tid`, { tid });
        const [outletTgt] = await q(`SELECT COUNT(*) as total, COALESCE(AVG(achievement_pct),0) as avg_achievement FROM sfa_outlet_targets WHERE tenant_id = :tid AND is_active = true`, { tid });
        const [strategies] = await q(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM sfa_sales_strategies WHERE tenant_id = :tid`, { tid });
        return ok(res, { data: { product_commissions: prodComm, commission_groups: groupComm, outlet_targets: outletTgt, strategies } });
      }

      // ═══════════════════════════════════════
      // ADVANCED DASHBOARD
      // ═══════════════════════════════════════
      case 'advanced-dashboard': {
        const today = new Date().toISOString().slice(0, 10);
        const monthStart = today.slice(0, 7) + '-01';
        const [summary] = await q(`
          SELECT
            (SELECT COUNT(*) FROM sfa_coverage_assignments WHERE tenant_id=:tid AND status='active') as total_coverage,
            (SELECT COUNT(*) FROM sfa_coverage_assignments WHERE tenant_id=:tid AND status='active' AND next_planned_visit < :today) as overdue_visits,
            (SELECT COUNT(*) FROM sfa_field_orders WHERE tenant_id=:tid AND order_date >= :mstart) as field_orders_this_month,
            (SELECT COALESCE(SUM(total),0) FROM sfa_field_orders WHERE tenant_id=:tid AND order_date >= :mstart AND status != 'rejected') as field_order_revenue,
            (SELECT COUNT(*) FROM sfa_display_audits WHERE tenant_id=:tid AND audit_date >= :mstart) as audits_this_month,
            (SELECT COALESCE(AVG(compliance_pct),0) FROM sfa_display_audits WHERE tenant_id=:tid AND audit_date >= :mstart) as avg_compliance,
            (SELECT COUNT(*) FROM sfa_competitor_activities WHERE tenant_id=:tid AND reported_date >= :mstart) as competitor_reports,
            (SELECT COUNT(*) FROM sfa_competitor_activities WHERE tenant_id=:tid AND resolved = false) as unresolved_competitors,
            (SELECT COUNT(*) FROM sfa_survey_responses WHERE tenant_id=:tid AND response_date >= :mstart) as surveys_completed,
            (SELECT COUNT(*) FROM sfa_approval_requests WHERE tenant_id=:tid AND status='pending') as pending_approvals,
            (SELECT COUNT(*) FROM sfa_geofences WHERE tenant_id=:tid AND is_active=true) as active_geofences,
            (SELECT COUNT(*) FROM sfa_product_commissions WHERE tenant_id=:tid AND is_active=true) as active_commissions
        `, { tid, today, mstart: monthStart });

        return ok(res, { data: { summary } });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.warn('SFA Advanced API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default withModuleGuard('sfa', handler);
