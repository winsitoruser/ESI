import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });

const q = async (sql: string, replacements?: any) => {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows as any[];
  } catch (e: any) { console.warn('Enhanced Q: (table may not exist):', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => {
  const rows = await q(sql, replacements);
  return rows[0] || null;
};
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try {
    await sequelize.query(sql, { replacements });
    return true;
  } catch (e: any) { console.warn('Enhanced Exec: (table may not exist):', e.message); return false; }
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

    // Manager-only actions for Enhanced API
    const MGR_ONLY = ['create-team', 'update-team', 'create-target-group', 'update-target-group', 'create-incentive-scheme', 'update-plafon'];
    if (!isManager && typeof action === 'string' && MGR_ONLY.includes(action)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Manager/Admin yang bisa melakukan aksi ini.' });
    }

    switch (action) {
      // ═══════════════════════════════════════
      // TEAMS
      // ═══════════════════════════════════════
      case 'teams': {
        const { limit, offset, page } = getPagination(req.query);
        const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_teams WHERE tenant_id = :tid`, { tid });
        const rows = await q(`
          SELECT t.*, u.name as leader_name, ter.name as territory_name,
            (SELECT COUNT(*) FROM sfa_team_members m WHERE m.team_id = t.id AND m.is_active = true) as member_count
          FROM sfa_teams t
          LEFT JOIN users u ON t.leader_id = u.id
          LEFT JOIN sfa_territories ter ON t.territory_id = ter.id
          WHERE t.tenant_id = :tid
          ORDER BY t.name
          LIMIT :limit OFFSET :offset
        `, { tid, limit, offset });
        return ok(res, { rows, total: parseInt(total?.cnt || '0'), page, limit });
      }
      case 'team-detail': {
        const { id } = req.query;
        const [team] = await q(`SELECT t.*, u.name as leader_name FROM sfa_teams t LEFT JOIN users u ON t.leader_id = u.id WHERE t.id = :id AND t.tenant_id = :tid`, { id, tid });
        if (!team) return err(res, 'Team not found', 404);
        const members = await q(`
          SELECT m.*, u.name as user_name, u.email, u.role as user_role,
            (SELECT COUNT(*) FROM sfa_visits v WHERE v.salesperson_id = m.user_id AND v.tenant_id = :tid AND v.status = 'completed' AND TO_CHAR(v.visit_date,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')) as visits_this_month,
            (SELECT COALESCE(SUM(o.actual_value),0) FROM sfa_opportunities o WHERE o.created_by = m.user_id AND o.tenant_id = :tid AND o.status = 'won' AND TO_CHAR(o.actual_close_date,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')) as revenue_this_month
          FROM sfa_team_members m JOIN users u ON m.user_id = u.id WHERE m.team_id = :id ORDER BY m.role DESC, u.name
        `, { id, tid });
        return ok(res, { data: { ...team, members } });
      }
      case 'create-team': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { code, name, description, team_type, territory_id, leader_id, max_members } = b;
        if (!code || !name) return err(res, 'code & name wajib');
        await qExec(`INSERT INTO sfa_teams (tenant_id,code,name,description,team_type,territory_id,leader_id,max_members,created_by) VALUES (:tid,:code,:name,:desc,:tt,:ter,:lid,:max,:uid)`,
          { tid, code, name, desc: description, tt: team_type || 'field_force', ter: territory_id || null, lid: leader_id || null, max: max_members || 20, uid });
        fireAudit('create', 'sfa_team', undefined, { code, name, team_type });
        return ok(res, { message: 'Tim berhasil dibuat' });
      }
      case 'update-team': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: tid2, ...fields } = b;
        const sets = Object.keys(fields).filter(k => ['name','description','team_type','territory_id','leader_id','max_members','is_active'].includes(k)).map(k => `${k} = :${k}`);
        if (sets.length === 0) return err(res, 'Tidak ada field yang diupdate');
        await qExec(`UPDATE sfa_teams SET ${sets.join(',')}, updated_by = :uid, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { ...fields, id: tid2, tid, uid });
        fireAudit('update', 'sfa_team', tid2, fields);
        return ok(res, { message: 'Tim diperbarui' });
      }
      case 'add-member': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { team_id, user_id, role, position, daily_visit_target, monthly_revenue_target } = b;
        if (!team_id || !user_id) return err(res, 'team_id & user_id wajib');
        await qExec(`INSERT INTO sfa_team_members (team_id,user_id,role,position,daily_visit_target,monthly_revenue_target) VALUES (:team_id,:user_id,:role,:pos,:dvt,:mrt) ON CONFLICT (team_id,user_id) DO UPDATE SET role=:role, position=:pos, is_active=true, updated_at=NOW()`,
          { team_id, user_id, role: role || 'member', pos: position || 'Sales Executive', dvt: daily_visit_target || 8, mrt: monthly_revenue_target || 0 });
        fireAudit('assign', 'sfa_team_member', undefined, { team_id, user_id, role });
        return ok(res, { message: 'Anggota ditambahkan' });
      }
      case 'remove-member': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        const { member_id } = req.query;
        await qExec(`UPDATE sfa_team_members SET is_active = false, leave_date = CURRENT_DATE, updated_at = NOW() WHERE id = :mid AND team_id IN (SELECT id FROM sfa_teams WHERE tenant_id = :tid)`, { mid: member_id, tid });
        fireAudit('delete', 'sfa_team_member', String(member_id));
        return ok(res, { message: 'Anggota dinonaktifkan' });
      }

      // ═══════════════════════════════════════
      // TARGET GROUPS
      // ═══════════════════════════════════════
      case 'target-groups': {
        const { period, year, status } = req.query;
        let where = 'WHERE tg.tenant_id = :tid';
        const params: any = { tid };
        if (period) { where += ' AND tg.period = :period'; params.period = period; }
        if (year) { where += ' AND tg.year = :year'; params.year = year; }
        if (status) { where += ' AND tg.status = :status'; params.status = status; }
        const { limit, offset, page } = getPagination(req.query);
        params.limit = limit; params.offset = offset;
        const total = await qOne(`SELECT COUNT(*) as cnt FROM sfa_target_groups tg ${where}`, params);
        const rows = await q(`
          SELECT tg.*, t.name as team_name, ter.name as territory_name,
            (SELECT COUNT(*) FROM sfa_target_assignments ta WHERE ta.target_group_id = tg.id) as assignment_count
          FROM sfa_target_groups tg
          LEFT JOIN sfa_teams t ON tg.team_id = t.id
          LEFT JOIN sfa_territories ter ON tg.territory_id = ter.id
          ${where} ORDER BY tg.year DESC, tg.period DESC, tg.name
          LIMIT :limit OFFSET :offset
        `, params);
        return ok(res, { rows, total: parseInt(total?.cnt || '0'), page, limit });
      }
      case 'target-group-detail': {
        const { id } = req.query;
        const [tg] = await q(`SELECT * FROM sfa_target_groups WHERE id = :id AND tenant_id = :tid`, { id, tid });
        if (!tg) return err(res, 'Target group not found', 404);
        const assignments = await q(`
          SELECT ta.*, u.name as user_name, t.name as team_name
          FROM sfa_target_assignments ta
          LEFT JOIN users u ON ta.assigned_to = u.id
          LEFT JOIN sfa_teams t ON ta.team_id = t.id
          WHERE ta.target_group_id = :id ORDER BY u.name
        `, { id });
        const productTargets = await q(`
          SELECT tp.* FROM sfa_target_products tp WHERE tp.target_group_id = :id ORDER BY tp.category_name, tp.product_name
        `, { id });
        return ok(res, { data: { ...tg, assignments, productTargets } });
      }
      case 'create-target-group': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { code, name, description, group_type, period_type, period, year, team_id, territory_id, branch_id, total_target_value, target_metrics, distribution_method, notes } = b;
        if (!code || !name || !period) return err(res, 'code, name, period wajib');
        const [row] = await q(`INSERT INTO sfa_target_groups (tenant_id,code,name,description,group_type,period_type,period,year,team_id,territory_id,branch_id,total_target_value,target_metrics,distribution_method,notes,created_by)
          VALUES (:tid,:code,:name,:desc,:gt,:pt,:period,:year,:team,:ter,:br,:ttv,:tm,:dm,:notes,:uid) RETURNING id`,
          { tid, code, name, desc: description, gt: group_type||'general', pt: period_type||'monthly', period, year: year||new Date().getFullYear(), team: team_id||null, ter: territory_id||null, br: branch_id||null, ttv: total_target_value||0, tm: JSON.stringify(target_metrics||{}), dm: distribution_method||'manual', notes, uid });
        return ok(res, { message: 'Target group dibuat', data: { id: row.id } });
      }
      case 'update-target-group': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: tgId, ...f } = b;
        const allowed = ['name','description','status','total_target_value','target_metrics','notes'];
        const sets2 = Object.keys(f).filter(k => allowed.includes(k)).map(k => k === 'target_metrics' ? `${k} = :${k}::jsonb` : `${k} = :${k}`);
        if (sets2.length === 0) return err(res, 'Tidak ada perubahan');
        if (f.target_metrics) f.target_metrics = JSON.stringify(f.target_metrics);
        await qExec(`UPDATE sfa_target_groups SET ${sets2.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...f, id: tgId, uid, tid });
        return ok(res, { message: 'Target group diperbarui' });
      }

      // ═══════════════════════════════════════
      // TARGET ASSIGNMENTS (per FF)
      // ═══════════════════════════════════════
      case 'create-target-assignment': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const ta = b;
        if (!ta.target_group_id) return err(res, 'target_group_id wajib');
        await qExec(`INSERT INTO sfa_target_assignments (target_group_id,tenant_id,assigned_to,team_id,territory_id,assignment_type,revenue_target,volume_target,volume_unit,visit_target,new_customer_target,effective_call_target,collection_target,weight_config,notes,created_by)
          VALUES (:tgid,:tid,:ato,:tmid,:terid,:atype,:rt,:vt,:vu,:vis,:nct,:ect,:ct,:wc,:notes,:uid)`,
          { tgid: ta.target_group_id, tid, ato: ta.assigned_to||null, tmid: ta.team_id||null, terid: ta.territory_id||null, atype: ta.assignment_type||'individual', rt: ta.revenue_target||0, vt: ta.volume_target||0, vu: ta.volume_unit||'pcs', vis: ta.visit_target||0, nct: ta.new_customer_target||0, ect: ta.effective_call_target||0, ct: ta.collection_target||0, wc: JSON.stringify(ta.weight_config||{}), notes: ta.notes, uid });
        return ok(res, { message: 'Target assignment dibuat' });
      }
      case 'update-target-assignment': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: taId, ...tf } = b;
        const taFields = ['revenue_target','volume_target','visit_target','new_customer_target','effective_call_target','collection_target','status','notes'];
        const taSets = Object.keys(tf).filter(k => taFields.includes(k)).map(k => `${k}=:${k}`);
        if (taSets.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_target_assignments SET ${taSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...tf, id: taId, uid, tid });
        return ok(res, { message: 'Target assignment diperbarui' });
      }

      // ═══════════════════════════════════════
      // TARGET PRODUCTS
      // ═══════════════════════════════════════
      case 'create-target-product': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const tp = b;
        await qExec(`INSERT INTO sfa_target_products (target_assignment_id,target_group_id,tenant_id,assigned_to,product_id,product_name,product_sku,category_id,category_name,target_type,revenue_target,volume_target,volume_unit,priority,notes)
          VALUES (:taid,:tgid,:tid,:ato,:pid,:pname,:psku,:cid,:cname,:tt,:rt,:vt,:vu,:pri,:notes)`,
          { taid: tp.target_assignment_id||null, tgid: tp.target_group_id||null, tid, ato: tp.assigned_to||null, pid: tp.product_id||null, pname: tp.product_name, psku: tp.product_sku, cid: tp.category_id||null, cname: tp.category_name, tt: tp.target_type||'product', rt: tp.revenue_target||0, vt: tp.volume_target||0, vu: tp.volume_unit||'pcs', pri: tp.priority||'medium', notes: tp.notes });
        return ok(res, { message: 'Target produk ditambahkan' });
      }
      case 'target-products': {
        const { target_group_id, assigned_to } = req.query;
        let w = 'WHERE tp.tenant_id = :tid';
        const p: any = { tid };
        if (target_group_id) { w += ' AND tp.target_group_id = :tgid'; p.tgid = target_group_id; }
        if (assigned_to) { w += ' AND tp.assigned_to = :ato'; p.ato = assigned_to; }
        const rows = await q(`SELECT tp.*, u.name as user_name FROM sfa_target_products tp LEFT JOIN users u ON tp.assigned_to = u.id ${w} ORDER BY tp.category_name, tp.product_name`, p);
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // ACHIEVEMENTS
      // ═══════════════════════════════════════
      case 'achievements': {
        const { period: aPeriod, year: aYear, team_id: aTeam } = req.query;
        let w2 = 'WHERE a.tenant_id = :tid';
        const p2: any = { tid };
        if (aPeriod) { w2 += ' AND a.period = :period'; p2.period = aPeriod; }
        if (aYear) { w2 += ' AND a.year = :year'; p2.year = aYear; }
        if (aTeam) { w2 += ' AND a.team_id = :team_id'; p2.team_id = aTeam; }
        const { limit: l2, offset: o2, page: p2p } = getPagination(req.query);
        p2.limit = l2; p2.offset = o2;
        const total2 = await qOne(`SELECT COUNT(*) as cnt FROM sfa_achievements a ${w2}`, p2);
        const rows = await q(`
          SELECT a.*, u.name as user_name, t.name as team_name
          FROM sfa_achievements a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN sfa_teams t ON a.team_id = t.id
          ${w2} ORDER BY a.weighted_pct DESC
          LIMIT :limit OFFSET :offset
        `, p2);
        return ok(res, { rows, total: parseInt(total2?.cnt || '0'), page: p2p, limit: l2 });
      }
      case 'calculate-achievement': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { user_id: calcUid, period: calcPeriod, year: calcYear } = b;
        if (!calcUid || !calcPeriod) return err(res, 'user_id & period wajib');
        const yr = calcYear || new Date().getFullYear();

        // Get target assignment
        const tAssigns = await q(`
          SELECT ta.* FROM sfa_target_assignments ta
          JOIN sfa_target_groups tg ON ta.target_group_id = tg.id
          WHERE ta.tenant_id = :tid AND ta.assigned_to = :uid AND tg.period = :period AND tg.year = :year AND ta.status = 'active'
          LIMIT 1
        `, { tid, uid: calcUid, period: calcPeriod, year: yr });

        // Calculate actuals from SFA data
        const [actuals] = await q(`
          SELECT
            COALESCE((SELECT SUM(o.actual_value) FROM sfa_opportunities o WHERE o.created_by = :uid AND o.tenant_id = :tid AND o.status = 'won' AND TO_CHAR(o.actual_close_date,'YYYY-MM') = :pm),0) as total_revenue,
            COALESCE((SELECT COUNT(*) FROM sfa_visits v WHERE v.salesperson_id = :uid AND v.tenant_id = :tid AND v.status = 'completed' AND TO_CHAR(v.visit_date,'YYYY-MM') = :pm),0) as completed_visits,
            COALESCE((SELECT COUNT(*) FROM sfa_visits v WHERE v.salesperson_id = :uid AND v.tenant_id = :tid AND v.status = 'completed' AND v.order_taken = true AND TO_CHAR(v.visit_date,'YYYY-MM') = :pm),0) as effective_calls,
            COALESCE((SELECT COUNT(*) FROM sfa_leads l WHERE l.created_by = :uid AND l.tenant_id = :tid AND l.status = 'new' AND TO_CHAR(l.created_at,'YYYY-MM') = :pm),0) as new_customers,
            COALESCE((SELECT COUNT(DISTINCT o.id) FROM sfa_opportunities o WHERE o.created_by = :uid AND o.tenant_id = :tid AND o.status = 'won' AND TO_CHAR(o.actual_close_date,'YYYY-MM') = :pm),0) as total_orders
        `, { uid: calcUid, tid, pm: `${yr}-${String(calcPeriod).padStart(2,'0')}` });

        // Get weight params
        const params3 = await q(`SELECT param_key, param_value FROM sfa_parameters WHERE tenant_id = :tid AND category = 'target'`, { tid });
        const weights: any = {};
        params3.forEach((p: any) => { if (p.param_key.startsWith('weight_')) weights[p.param_key.replace('weight_','')] = parseFloat(p.param_value) || 0; });
        const wRev = weights.revenue || 40, wVol = weights.volume || 25, wVis = weights.visit || 15, wNC = weights.new_customer || 10, wEC = weights.effective_call || 10;

        let revPct = 0, visPct = 0, ncPct = 0, ecPct = 0;
        if (tAssigns.length > 0) {
          const ta = tAssigns[0];
          if (ta.revenue_target > 0) revPct = Math.min(999, (actuals.total_revenue / ta.revenue_target) * 100);
          if (ta.visit_target > 0) visPct = Math.min(999, (actuals.completed_visits / ta.visit_target) * 100);
          if (ta.new_customer_target > 0) ncPct = Math.min(999, (actuals.new_customers / ta.new_customer_target) * 100);
          if (ta.effective_call_target > 0) ecPct = Math.min(999, (actuals.effective_calls / ta.effective_call_target) * 100);
        }
        const weightedPct = (revPct * wRev + visPct * wVis + ncPct * wNC + ecPct * wEC) / (wRev + wVis + wNC + wEC);

        // Get rating params
        const ratingParams = await q(`SELECT param_key, param_value FROM sfa_parameters WHERE tenant_id = :tid AND category = 'achievement'`, { tid });
        const rp: any = {};
        ratingParams.forEach((p: any) => { rp[p.param_key] = parseFloat(p.param_value); });
        let rating = 'poor';
        if (weightedPct >= (rp.rating_excellent_min || 120)) rating = 'excellent';
        else if (weightedPct >= (rp.rating_good_min || 100)) rating = 'good';
        else if (weightedPct >= (rp.rating_average_min || 80)) rating = 'average';
        else if (weightedPct >= (rp.rating_below_min || 60)) rating = 'below_avg';

        // Get team for user
        const [memberRow] = await q(`SELECT team_id FROM sfa_team_members WHERE user_id = :uid AND is_active = true LIMIT 1`, { uid: calcUid });
        const teamId = memberRow?.team_id || null;

        // Upsert achievement
        await qExec(`
          INSERT INTO sfa_achievements (tenant_id,target_assignment_id,target_group_id,user_id,team_id,period,year,
            total_revenue,total_visits,completed_visits,effective_calls,new_customers,total_orders,
            revenue_pct,visit_pct,new_customer_pct,effective_call_pct,weighted_pct,rating,calculated_at)
          VALUES (:tid,:taid,:tgid,:uid,:tmid,:period,:year,:rev,:tv,:cv,:ec,:nc,:to2,:rp,:vp,:ncp,:ecp,:wp,:rating,NOW())
          ON CONFLICT (tenant_id,user_id,period,year) DO UPDATE SET
            total_revenue=:rev,completed_visits=:cv,effective_calls=:ec,new_customers=:nc,total_orders=:to2,
            revenue_pct=:rp,visit_pct=:vp,new_customer_pct=:ncp,effective_call_pct=:ecp,weighted_pct=:wp,rating=:rating,calculated_at=NOW(),updated_at=NOW()
        `, {
          tid, taid: tAssigns[0]?.id || null, tgid: tAssigns[0]?.target_group_id || null, uid: calcUid, tmid: teamId,
          period: calcPeriod, year: yr,
          rev: actuals.total_revenue, tv: actuals.completed_visits, cv: actuals.completed_visits,
          ec: actuals.effective_calls, nc: actuals.new_customers, to2: actuals.total_orders,
          rp: revPct.toFixed(2), vp: visPct.toFixed(2), ncp: ncPct.toFixed(2), ecp: ecPct.toFixed(2),
          wp: weightedPct.toFixed(2), rating
        });

        // Also update target assignment achievement fields
        if (tAssigns.length > 0) {
          await qExec(`UPDATE sfa_target_assignments SET revenue_achieved=:rev, revenue_achievement_pct=:rp, visit_achieved=:cv, visit_achievement_pct=:vp, new_customer_achieved=:nc, effective_call_achieved=:ec, weighted_achievement=:wp, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { rev: actuals.total_revenue, rp: revPct.toFixed(2), cv: actuals.completed_visits, vp: visPct.toFixed(2), nc: actuals.new_customers, ec: actuals.effective_calls, wp: weightedPct.toFixed(2), id: tAssigns[0].id, tid });
        }

        return ok(res, { message: 'Achievement dihitung', data: { revenue: actuals.total_revenue, visits: actuals.completed_visits, effective_calls: actuals.effective_calls, new_customers: actuals.new_customers, revenue_pct: revPct, visit_pct: visPct, weighted_pct: weightedPct, rating } });
      }

      // ═══════════════════════════════════════
      // INCENTIVE SCHEMES
      // ═══════════════════════════════════════
      case 'incentive-schemes': {
        const { limit: l3, offset: o3, page: p3p } = getPagination(req.query);
        const total3 = await qOne(`SELECT COUNT(*) as cnt FROM sfa_incentive_schemes WHERE tenant_id = :tid`, { tid });
        const rows = await q(`
          SELECT s.*, (SELECT COUNT(*) FROM sfa_incentive_tiers t WHERE t.scheme_id = s.id) as tier_count
          FROM sfa_incentive_schemes s WHERE s.tenant_id = :tid ORDER BY s.status, s.name
          LIMIT :limit OFFSET :offset
        `, { tid, limit: l3, offset: o3 });
        return ok(res, { rows, total: parseInt(total3?.cnt || '0'), page: p3p, limit: l3 });
      }
      case 'incentive-scheme-detail': {
        const { id } = req.query;
        const [scheme] = await q(`SELECT * FROM sfa_incentive_schemes WHERE id = :id AND tenant_id = :tid`, { id, tid });
        if (!scheme) return err(res, 'Scheme not found', 404);
        const tiers = await q(`SELECT * FROM sfa_incentive_tiers WHERE scheme_id = :id ORDER BY sort_order`, { id });
        return ok(res, { data: { ...scheme, tiers } });
      }
      case 'create-incentive-scheme': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const s = b;
        if (!s.code || !s.name) return err(res, 'code & name wajib');
        const [row] = await q(`INSERT INTO sfa_incentive_schemes (tenant_id,code,name,description,scheme_type,calculation_basis,applicable_roles,applicable_teams,period_type,base_amount,min_achievement_pct,max_cap,overachievement_multiplier,has_new_customer_bonus,new_customer_bonus_amount,has_visit_bonus,visit_bonus_amount,has_collection_bonus,collection_bonus_pct,status,effective_from,effective_to,notes,created_by)
          VALUES (:tid,:code,:name,:desc,:st,:cb,:ar,:at,:pt,:ba,:map,:mc,:om,:hncb,:ncba,:hvb,:vba,:hcb,:cbp,:status,:ef,:et,:notes,:uid) RETURNING id`,
          { tid, code: s.code, name: s.name, desc: s.description, st: s.scheme_type||'progressive', cb: s.calculation_basis||'achievement_pct', ar: JSON.stringify(s.applicable_roles||['sales_staff']), at: JSON.stringify(s.applicable_teams||[]), pt: s.period_type||'monthly', ba: s.base_amount||0, map: s.min_achievement_pct||0, mc: s.max_cap||0, om: s.overachievement_multiplier||1.5, hncb: s.has_new_customer_bonus||false, ncba: s.new_customer_bonus_amount||0, hvb: s.has_visit_bonus||false, vba: s.visit_bonus_amount||0, hcb: s.has_collection_bonus||false, cbp: s.collection_bonus_pct||0, status: s.status||'draft', ef: s.effective_from||null, et: s.effective_to||null, notes: s.notes, uid });
        return ok(res, { message: 'Skema insentif dibuat', data: { id: row.id } });
      }
      case 'update-incentive-scheme': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: sId, ...sf } = b;
        const allowed2 = ['name','description','base_amount','min_achievement_pct','max_cap','overachievement_multiplier','has_new_customer_bonus','new_customer_bonus_amount','has_visit_bonus','visit_bonus_amount','has_collection_bonus','collection_bonus_pct','status','effective_from','effective_to','notes'];
        const sets3 = Object.keys(sf).filter(k => allowed2.includes(k)).map(k => `${k}=:${k}`);
        if (sets3.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_incentive_schemes SET ${sets3.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...sf, id: sId, uid, tid });
        return ok(res, { message: 'Skema insentif diperbarui' });
      }
      case 'save-incentive-tiers': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { scheme_id, tiers: tierList } = b;
        if (!scheme_id || !tierList) return err(res, 'scheme_id & tiers wajib');
        await qExec(`DELETE FROM sfa_incentive_tiers WHERE scheme_id = :sid AND scheme_id IN (SELECT id FROM sfa_incentive_schemes WHERE tenant_id = :tid)`, { sid: scheme_id, tid });
        for (let i = 0; i < tierList.length; i++) {
          const t = tierList[i];
          await qExec(`INSERT INTO sfa_incentive_tiers (scheme_id,tier_name,min_achievement,max_achievement,incentive_type,incentive_value,flat_amount,bonus_amount,bonus_description,sort_order) VALUES (:sid,:tn,:mina,:maxa,:it,:iv,:fa,:ba,:bd,:so)`,
            { sid: scheme_id, tn: t.tier_name, mina: t.min_achievement||0, maxa: t.max_achievement||999, it: t.incentive_type||'percentage', iv: t.incentive_value||0, fa: t.flat_amount||0, ba: t.bonus_amount||0, bd: t.bonus_description||'', so: i+1 });
        }
        return ok(res, { message: 'Tier insentif disimpan' });
      }

      // ═══════════════════════════════════════
      // INCENTIVE CALCULATION
      // ═══════════════════════════════════════
      case 'calculate-incentive': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const { user_id: iUid, period: iPeriod, year: iYear, scheme_id: iScheme } = b;
        if (!iUid || !iPeriod || !iScheme) return err(res, 'user_id, period, scheme_id wajib');
        const iYr = iYear || new Date().getFullYear();

        // Get achievement
        const [ach] = await q(`SELECT * FROM sfa_achievements WHERE tenant_id = :tid AND user_id = :uid AND period = :period AND year = :year`, { tid, uid: iUid, period: iPeriod, year: iYr });
        if (!ach) return err(res, 'Achievement belum dihitung. Hitung achievement terlebih dahulu.');

        // Get scheme + tiers
        const [scheme] = await q(`SELECT * FROM sfa_incentive_schemes WHERE id = :sid AND tenant_id = :tid`, { sid: iScheme, tid });
        if (!scheme) return err(res, 'Skema insentif tidak ditemukan');
        const tiers = await q(`SELECT * FROM sfa_incentive_tiers WHERE scheme_id = :sid ORDER BY sort_order`, { sid: iScheme });

        const achPct = parseFloat(ach.weighted_pct) || 0;
        if (achPct < parseFloat(scheme.min_achievement_pct || 0)) {
          // Below minimum threshold
          await qExec(`INSERT INTO sfa_incentive_calculations (tenant_id,scheme_id,achievement_id,user_id,period,year,achievement_pct,tier_name,base_incentive,gross_incentive,net_incentive,status,calculated_at,calculation_detail,created_by)
            VALUES (:tid,:sid,:aid,:uid,:period,:year,:ap,'Below Minimum',0,0,0,'draft',NOW(),:detail,:cuid)
            ON CONFLICT (tenant_id,user_id,scheme_id,period,year) DO UPDATE SET achievement_pct=:ap,tier_name='Below Minimum',gross_incentive=0,net_incentive=0,calculated_at=NOW()`,
            { tid, sid: iScheme, aid: ach.id, uid: iUid, period: iPeriod, year: iYr, ap: achPct, detail: JSON.stringify({ reason: 'Below minimum achievement threshold' }), cuid: uid });
          return ok(res, { message: 'Insentif: di bawah minimum threshold', data: { net_incentive: 0, tier: 'Below Minimum', achievement_pct: achPct } });
        }

        // Find matching tier
        let matchedTier: any = null;
        for (const t of tiers) {
          if (achPct >= parseFloat(t.min_achievement) && achPct <= parseFloat(t.max_achievement)) { matchedTier = t; break; }
        }

        const baseAmount = parseFloat(scheme.base_amount) || 0;
        let achIncentive = 0;
        if (matchedTier) {
          if (matchedTier.incentive_type === 'percentage') achIncentive = baseAmount * (parseFloat(matchedTier.incentive_value) / 100);
          else if (matchedTier.incentive_type === 'flat') achIncentive = parseFloat(matchedTier.flat_amount) || 0;
          else achIncentive = baseAmount * (parseFloat(matchedTier.multiplier) || 1);
        }

        // Overachievement bonus
        let overBonus = 0;
        if (achPct > 100) {
          const overPct = achPct - 100;
          overBonus = (baseAmount * (overPct / 100)) * (parseFloat(scheme.overachievement_multiplier) || 1);
        }

        // Special bonuses
        let ncBonus = 0, visitBonus = 0, collBonus = 0;
        if (scheme.has_new_customer_bonus && ach.new_customers > 0) ncBonus = ach.new_customers * parseFloat(scheme.new_customer_bonus_amount || 0);
        if (scheme.has_visit_bonus && ach.completed_visits > 0) visitBonus = ach.completed_visits * parseFloat(scheme.visit_bonus_amount || 0);
        if (scheme.has_collection_bonus && ach.total_collections > 0) collBonus = ach.total_collections * (parseFloat(scheme.collection_bonus_pct || 0) / 100);

        const tierBonus = matchedTier ? parseFloat(matchedTier.bonus_amount) || 0 : 0;
        let gross = achIncentive + overBonus + ncBonus + visitBonus + collBonus + tierBonus;

        // Apply cap
        if (parseFloat(scheme.max_cap) > 0) gross = Math.min(gross, parseFloat(scheme.max_cap));

        const detail = { base_amount: baseAmount, tier: matchedTier?.tier_name, ach_incentive: achIncentive, over_bonus: overBonus, nc_bonus: ncBonus, visit_bonus: visitBonus, coll_bonus: collBonus, tier_bonus: tierBonus };

        await qExec(`INSERT INTO sfa_incentive_calculations (tenant_id,scheme_id,achievement_id,user_id,period,year,achievement_pct,tier_name,base_incentive,achievement_incentive,overachievement_bonus,new_customer_bonus,visit_bonus,collection_bonus,special_bonus,gross_incentive,net_incentive,status,calculated_at,calculation_detail,created_by)
          VALUES (:tid,:sid,:aid,:uid,:period,:year,:ap,:tn,:bi,:ai,:ob,:ncb,:vb,:cb,:sb,:gi,:ni,'draft',NOW(),:detail,:cuid)
          ON CONFLICT (tenant_id,user_id,scheme_id,period,year) DO UPDATE SET achievement_pct=:ap,tier_name=:tn,base_incentive=:bi,achievement_incentive=:ai,overachievement_bonus=:ob,new_customer_bonus=:ncb,visit_bonus=:vb,collection_bonus=:cb,special_bonus=:sb,gross_incentive=:gi,net_incentive=:ni,calculated_at=NOW()`,
          { tid, sid: iScheme, aid: ach.id, uid: iUid, period: iPeriod, year: iYr, ap: achPct, tn: matchedTier?.tier_name||'N/A', bi: baseAmount, ai: achIncentive, ob: overBonus, ncb: ncBonus, vb: visitBonus, cb: collBonus, sb: tierBonus, gi: gross, ni: gross, detail: JSON.stringify(detail), cuid: uid });

        return ok(res, { message: 'Insentif dihitung', data: { net_incentive: gross, tier: matchedTier?.tier_name, achievement_pct: achPct, breakdown: detail } });
      }
      case 'incentive-calculations': {
        const { period: icP, year: icY, status: icS } = req.query;
        let w3 = 'WHERE ic.tenant_id = :tid';
        const p3: any = { tid };
        if (icP) { w3 += ' AND ic.period = :period'; p3.period = icP; }
        if (icY) { w3 += ' AND ic.year = :year'; p3.year = icY; }
        if (icS) { w3 += ' AND ic.status = :status'; p3.status = icS; }
        const { limit: l3b, offset: o3b, page: p3bp } = getPagination(req.query);
        p3.limit = l3b; p3.offset = o3b;
        const total3b = await qOne(`SELECT COUNT(*) as cnt FROM sfa_incentive_calculations ic ${w3}`, p3);
        const rows = await q(`
          SELECT ic.*, u.name as user_name, s.name as scheme_name, t.name as team_name
          FROM sfa_incentive_calculations ic
          LEFT JOIN users u ON ic.user_id = u.id
          LEFT JOIN sfa_incentive_schemes s ON ic.scheme_id = s.id
          LEFT JOIN sfa_teams t ON ic.team_id = t.id
          ${w3} ORDER BY ic.net_incentive DESC
          LIMIT :limit OFFSET :offset
        `, p3);
        return ok(res, { rows, total: parseInt(total3b?.cnt || '0'), page: p3bp, limit: l3b });
      }
      case 'approve-incentive': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: apId, status: apStatus } = b;
        await qExec(`UPDATE sfa_incentive_calculations SET status=:status, approved_by=:uid, approved_at=NOW(), updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { status: apStatus||'approved', uid, id: apId, tid });
        return ok(res, { message: `Insentif ${apStatus === 'rejected' ? 'ditolak' : 'disetujui'}` });
      }

      // ═══════════════════════════════════════
      // PLAFON
      // ═══════════════════════════════════════
      case 'plafon-list': {
        const { plafon_type, status: plStatus } = req.query;
        let w4 = 'WHERE p.tenant_id = :tid';
        const p4: any = { tid };
        if (plafon_type) { w4 += ' AND p.plafon_type = :pt'; p4.pt = plafon_type; }
        if (plStatus) { w4 += ' AND p.status = :status'; p4.status = plStatus; }
        const { limit: l4, offset: o4, page: p4p } = getPagination(req.query);
        p4.limit = l4; p4.offset = o4;
        const total4 = await qOne(`SELECT COUNT(*) as cnt FROM sfa_plafon p ${w4}`, p4);
        const rows = await q(`
          SELECT p.*, u.name as user_name,
            (SELECT COUNT(*) FROM sfa_plafon_usage pu WHERE pu.plafon_id = p.id AND pu.is_overdue = true AND pu.paid_at IS NULL) as overdue_count
          FROM sfa_plafon p LEFT JOIN users u ON p.user_id = u.id
          ${w4} ORDER BY p.credit_limit DESC
          LIMIT :limit OFFSET :offset
        `, p4);
        return ok(res, { rows, total: parseInt(total4?.cnt || '0'), page: p4p, limit: l4 });
      }
      case 'create-plafon': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const pl = b;
        if (!pl.plafon_type) return err(res, 'plafon_type wajib');
        await qExec(`INSERT INTO sfa_plafon (tenant_id,plafon_type,customer_id,customer_name,user_id,team_id,territory_id,credit_limit,available_amount,payment_terms,max_overdue_days,risk_level,status,effective_from,effective_to,notes,created_by)
          VALUES (:tid,:pt,:cid,:cname,:uid2,:tmid,:terid,:cl,:cl,:pt2,:mod,:rl,:st,:ef,:et,:notes,:uid)`,
          { tid, pt: pl.plafon_type, cid: pl.customer_id||null, cname: pl.customer_name, uid2: pl.user_id||null, tmid: pl.team_id||null, terid: pl.territory_id||null, cl: pl.credit_limit||0, pt2: pl.payment_terms||30, mod: pl.max_overdue_days||0, rl: pl.risk_level||'low', st: pl.status||'active', ef: pl.effective_from||null, et: pl.effective_to||null, notes: pl.notes, uid });
        return ok(res, { message: 'Plafon dibuat' });
      }
      case 'update-plafon': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: plId, ...plf } = b;
        const plAllowed = ['credit_limit','payment_terms','max_overdue_days','risk_level','status','notes'];
        const plSets = Object.keys(plf).filter(k => plAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (plSets.length === 0) return err(res, 'Tidak ada perubahan');
        // Recalculate available_amount if credit_limit changes
        if (plf.credit_limit !== undefined) plSets.push('available_amount = :credit_limit - used_amount');
        await qExec(`UPDATE sfa_plafon SET ${plSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...plf, id: plId, uid, tid });
        return ok(res, { message: 'Plafon diperbarui' });
      }
      case 'plafon-usage': {
        const { plafon_id } = req.query;
        const rows = await q(`SELECT * FROM sfa_plafon_usage WHERE plafon_id = :pid ORDER BY transaction_date DESC`, { pid: plafon_id });
        return ok(res, { data: rows });
      }
      case 'check-plafon': {
        // Check if customer/salesperson has available credit
        const { customer_id: chkCid, amount: chkAmt } = req.query;
        const [pl] = await q(`SELECT * FROM sfa_plafon WHERE tenant_id = :tid AND customer_id = :cid AND status = 'active' LIMIT 1`, { tid, cid: chkCid });
        if (!pl) return ok(res, { data: { has_plafon: false, available: 0, can_proceed: true } });
        const avail = parseFloat(pl.available_amount) || 0;
        const amt = parseFloat(chkAmt as string) || 0;
        return ok(res, { data: { has_plafon: true, credit_limit: pl.credit_limit, used: pl.used_amount, available: avail, can_proceed: amt <= avail, risk_level: pl.risk_level } });
      }

      // ═══════════════════════════════════════
      // PARAMETERS
      // ═══════════════════════════════════════
      case 'parameters': {
        const { category: pCat } = req.query;
        let w5 = 'WHERE tenant_id = :tid';
        const p5: any = { tid };
        if (pCat) { w5 += ' AND category = :cat'; p5.cat = pCat; }
        const { limit: l5, offset: o5, page: p5p } = getPagination(req.query);
        p5.limit = l5; p5.offset = o5;
        const total5 = await qOne(`SELECT COUNT(*) as cnt FROM sfa_parameters ${w5}`, p5);
        const rows = await q(`SELECT * FROM sfa_parameters ${w5} ORDER BY category, display_order LIMIT :limit OFFSET :offset`, p5);
        // Group by category
        const grouped: any = {};
        rows.forEach((r: any) => { if (!grouped[r.category]) grouped[r.category] = []; grouped[r.category].push(r); });
        return ok(res, { rows: grouped, total: parseInt(total5?.cnt || '0'), page: p5p, limit: l5 });
      }
      case 'update-parameter': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: pId, param_value } = b;
        if (!pId) return err(res, 'id wajib');
        await qExec(`UPDATE sfa_parameters SET param_value = :val, updated_by = :uid, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { val: param_value, uid, id: pId, tid });
        return ok(res, { message: 'Parameter diperbarui' });
      }
      case 'update-parameters-bulk': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { updates } = b;
        if (!updates || !Array.isArray(updates)) return err(res, 'updates array wajib');
        for (const u of updates) {
          await qExec(`UPDATE sfa_parameters SET param_value = :val, updated_by = :uid, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { val: u.param_value, uid, id: u.id, tid });
        }
        return ok(res, { message: `${updates.length} parameter diperbarui` });
      }

      // ═══════════════════════════════════════
      // DASHBOARD ENHANCED
      // ═══════════════════════════════════════
      case 'enhanced-dashboard': {
        const currentMonth = new Date().toISOString().slice(5, 7);
        const currentYear = new Date().getFullYear();
        const [summary] = await q(`
          SELECT
            (SELECT COUNT(*) FROM sfa_teams WHERE tenant_id = :tid AND is_active = true) as total_teams,
            (SELECT COUNT(*) FROM sfa_team_members WHERE team_id IN (SELECT id FROM sfa_teams WHERE tenant_id = :tid) AND is_active = true) as total_ff,
            (SELECT COUNT(*) FROM sfa_target_groups WHERE tenant_id = :tid AND status = 'active' AND period = :month AND year = :year) as active_target_groups,
            (SELECT COALESCE(AVG(weighted_pct),0) FROM sfa_achievements WHERE tenant_id = :tid AND period = :month AND year = :year) as avg_achievement,
            (SELECT COUNT(*) FROM sfa_incentive_calculations WHERE tenant_id = :tid AND period = :month AND year = :year AND status = 'draft') as pending_incentives,
            (SELECT COALESCE(SUM(net_incentive),0) FROM sfa_incentive_calculations WHERE tenant_id = :tid AND period = :month AND year = :year) as total_incentive,
            (SELECT COUNT(*) FROM sfa_plafon WHERE tenant_id = :tid AND status = 'active') as active_plafon,
            (SELECT COUNT(*) FROM sfa_plafon WHERE tenant_id = :tid AND status = 'active' AND risk_level IN ('high','critical')) as high_risk_plafon
        `, { tid, month: currentMonth, year: currentYear });

        const topAchievers = await q(`
          SELECT a.*, u.name as user_name, t.name as team_name
          FROM sfa_achievements a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN sfa_teams t ON a.team_id = t.id
          WHERE a.tenant_id = :tid AND a.period = :month AND a.year = :year
          ORDER BY a.weighted_pct DESC LIMIT 5
        `, { tid, month: currentMonth, year: currentYear });

        const teamPerformance = await q(`
          SELECT t.id, t.name, t.code,
            COUNT(m.id) as members,
            COALESCE(AVG(a.weighted_pct),0) as avg_achievement,
            COALESCE(SUM(a.total_revenue),0) as total_revenue,
            COALESCE(SUM(a.completed_visits),0) as total_visits
          FROM sfa_teams t
          LEFT JOIN sfa_team_members m ON m.team_id = t.id AND m.is_active = true
          LEFT JOIN sfa_achievements a ON a.user_id = m.user_id AND a.period = :month AND a.year = :year
          WHERE t.tenant_id = :tid AND t.is_active = true
          GROUP BY t.id, t.name, t.code ORDER BY avg_achievement DESC
        `, { tid, month: currentMonth, year: currentYear });

        return ok(res, { data: { summary, topAchievers, teamPerformance } });
      }

      // ═══════════════════════════════════════
      // MULTI-CURRENCY
      // ═══════════════════════════════════════
      case 'currencies': {
        const { limit: lc, offset: oc, page: pc } = getPagination(req.query);
        const totalC = await qOne(`SELECT COUNT(*) as cnt FROM sfa_currencies WHERE tenant_id = :tid`, { tid });
        const rows = await q(`SELECT * FROM sfa_currencies WHERE tenant_id = :tid ORDER BY sort_order, code LIMIT :limit OFFSET :offset`, { tid, limit: lc, offset: oc });
        return ok(res, { rows, total: parseInt(totalC?.cnt || '0'), page: pc, limit: lc });
      }
      case 'create-currency': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const cc = b;
        if (!cc.code || !cc.name) return err(res, 'code dan name wajib');
        await qExec(`INSERT INTO sfa_currencies (id,tenant_id,code,name,symbol,decimal_places,thousand_separator,decimal_separator,symbol_position,is_default,sort_order,created_by) VALUES (gen_random_uuid(),:tid,:code,:name,:sym,:dp,:ts,:ds,:sp,:def,:so,:uid)`,
          { tid, code: cc.code.toUpperCase(), name: cc.name, sym: cc.symbol || '', dp: cc.decimal_places ?? 2, ts: cc.thousand_separator || '.', ds: cc.decimal_separator || ',', sp: cc.symbol_position || 'before', def: cc.is_default || false, so: cc.sort_order || 99, uid });
        if (cc.is_default) await qExec(`UPDATE sfa_currencies SET is_default = false WHERE tenant_id = :tid AND code != :code`, { tid, code: cc.code.toUpperCase() });
        return ok(res, { message: 'Currency ditambahkan' });
      }
      case 'update-currency': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: curId, ...curF } = b;
        const curAllowed = ['name', 'symbol', 'decimal_places', 'thousand_separator', 'decimal_separator', 'symbol_position', 'is_default', 'is_active', 'sort_order'];
        const curSets = Object.keys(curF).filter(k => curAllowed.includes(k)).map(k => `${k}=:${k}`);
        if (curSets.length === 0) return err(res, 'Tidak ada perubahan');
        await qExec(`UPDATE sfa_currencies SET ${curSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...curF, id: curId, uid, tid });
        if (curF.is_default) await qExec(`UPDATE sfa_currencies SET is_default = false WHERE tenant_id = :tid AND id != :id`, { tid, id: curId });
        return ok(res, { message: 'Currency diperbarui' });
      }
      case 'delete-currency': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        await qExec(`UPDATE sfa_currencies SET is_deleted = true, deleted_at = NOW() WHERE id = :id AND tenant_id = :tid AND is_default = false`, { id: req.query.id, tid });
        return ok(res, { message: 'Currency dihapus' });
      }

      // ── Exchange Rates ──
      case 'exchange-rates': {
        const { limit: ler, offset: oer, page: per } = getPagination(req.query);
        const totalEr = await qOne(`SELECT COUNT(*) as cnt FROM sfa_exchange_rates WHERE tenant_id = :tid AND is_active = true`, { tid });
        const rows = await q(`SELECT * FROM sfa_exchange_rates WHERE tenant_id = :tid AND is_active = true ORDER BY from_currency, to_currency, effective_date DESC LIMIT :limit OFFSET :offset`, { tid, limit: ler, offset: oer });
        return ok(res, { rows, total: parseInt(totalEr?.cnt || '0'), page: per, limit: ler });
      }
      case 'save-exchange-rate': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const er = b;
        if (!er.from_currency || !er.to_currency || !er.rate) return err(res, 'from_currency, to_currency, dan rate wajib');
        if (er.id) {
          await qExec(`UPDATE sfa_exchange_rates SET rate=:rate, effective_date=:ed, expiry_date=:exp, source=:src, notes=:notes, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { rate: er.rate, ed: er.effective_date || new Date().toISOString().slice(0, 10), exp: er.expiry_date || null, src: er.source || 'manual', notes: er.notes, id: er.id, tid });
        } else {
          await qExec(`INSERT INTO sfa_exchange_rates (id,tenant_id,from_currency,to_currency,rate,effective_date,expiry_date,source,notes,created_by) VALUES (gen_random_uuid(),:tid,:from,:to,:rate,:ed,:exp,:src,:notes,:uid)`,
            { tid, from: er.from_currency, to: er.to_currency, rate: er.rate, ed: er.effective_date || new Date().toISOString().slice(0, 10), exp: er.expiry_date || null, src: er.source || 'manual', notes: er.notes, uid });
        }
        return ok(res, { message: 'Exchange rate disimpan' });
      }
      case 'delete-exchange-rate': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        await qExec(`UPDATE sfa_exchange_rates SET is_deleted = true, deleted_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: req.query.id, tid });
        return ok(res, { message: 'Exchange rate dihapus' });
      }

      // ═══════════════════════════════════════
      // TAX SETTINGS
      // ═══════════════════════════════════════
      case 'tax-settings': {
        const { limit: ltx, offset: otx, page: ptx } = getPagination(req.query);
        const totalTx = await qOne(`SELECT COUNT(*) as cnt FROM sfa_tax_settings WHERE tenant_id = :tid`, { tid });
        const rows = await q(`SELECT * FROM sfa_tax_settings WHERE tenant_id = :tid ORDER BY sort_order, code LIMIT :limit OFFSET :offset`, { tid, limit: ltx, offset: otx });
        return ok(res, { rows, total: parseInt(totalTx?.cnt || '0'), page: ptx, limit: ltx });
      }
      case 'save-tax': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const tx = b;
        if (!tx.code || !tx.name) return err(res, 'code dan name wajib');
        if (tx.id) {
          const txAllowed = ['name', 'tax_type', 'rate', 'is_inclusive', 'is_compound', 'applies_to', 'effective_from', 'effective_to', 'is_default', 'is_active', 'sort_order'];
          const txSets = Object.keys(tx).filter(k => txAllowed.includes(k)).map(k => `${k}=:${k}`);
          if (txSets.length > 0) await qExec(`UPDATE sfa_tax_settings SET ${txSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...tx, uid, tid });
        } else {
          await qExec(`INSERT INTO sfa_tax_settings (id,tenant_id,code,name,tax_type,rate,is_inclusive,is_compound,applies_to,is_default,sort_order,created_by) VALUES (gen_random_uuid(),:tid,:code,:name,:tt,:rate,:incl,:comp,:ap,:def,:so,:uid)`,
            { tid, code: tx.code, name: tx.name, tt: tx.tax_type || 'vat', rate: tx.rate || 0, incl: tx.is_inclusive || false, comp: tx.is_compound || false, ap: tx.applies_to || 'all', def: tx.is_default || false, so: tx.sort_order || 99, uid });
        }
        return ok(res, { message: 'Tax setting disimpan' });
      }
      case 'delete-tax': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        await qExec(`UPDATE sfa_tax_settings SET is_deleted = true, deleted_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: req.query.id, tid });
        return ok(res, { message: 'Tax setting dihapus' });
      }

      // ═══════════════════════════════════════
      // NUMBERING FORMATS
      // ═══════════════════════════════════════
      case 'numbering-formats': {
        const { limit: lnf, offset: onf, page: pnf } = getPagination(req.query);
        const totalNf = await qOne(`SELECT COUNT(*) as cnt FROM sfa_numbering_formats WHERE tenant_id = :tid`, { tid });
        const rows = await q(`SELECT * FROM sfa_numbering_formats WHERE tenant_id = :tid ORDER BY entity_type LIMIT :limit OFFSET :offset`, { tid, limit: lnf, offset: onf });
        return ok(res, { rows, total: parseInt(totalNf?.cnt || '0'), page: pnf, limit: lnf });
      }
      case 'save-numbering-format': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const nf = b;
        if (!nf.entity_type) return err(res, 'entity_type wajib');
        const sample = `${nf.prefix || ''}${nf.separator || '-'}${nf.date_format === 'YYYYMM' ? '202603' : nf.date_format === 'YYMM' ? '2603' : nf.date_format === 'YYYY' ? '2026' : ''}${nf.separator || '-'}${'0'.repeat(Math.max(0, (nf.counter_length || 4) - 1))}1`;
        if (nf.id) {
          await qExec(`UPDATE sfa_numbering_formats SET prefix=:prefix, suffix=:suffix, separator=:sep, date_format=:df, counter_length=:cl, reset_period=:rp, sample_output=:sample, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`,
            { prefix: nf.prefix || '', suffix: nf.suffix || '', sep: nf.separator || '-', df: nf.date_format || 'YYYYMM', cl: nf.counter_length || 4, rp: nf.reset_period || 'monthly', sample, id: nf.id, uid, tid });
        } else {
          await qExec(`INSERT INTO sfa_numbering_formats (id,tenant_id,entity_type,prefix,suffix,separator,date_format,counter_length,reset_period,sample_output,created_by) VALUES (gen_random_uuid(),:tid,:et,:prefix,:suffix,:sep,:df,:cl,:rp,:sample,:uid)`,
            { tid, et: nf.entity_type, prefix: nf.prefix || '', suffix: nf.suffix || '', sep: nf.separator || '-', df: nf.date_format || 'YYYYMM', cl: nf.counter_length || 4, rp: nf.reset_period || 'monthly', sample, uid });
        }
        return ok(res, { message: 'Format nomor disimpan' });
      }

      // ═══════════════════════════════════════
      // PAYMENT TERMS
      // ═══════════════════════════════════════
      case 'payment-terms': {
        const { limit: lpt, offset: opt, page: ppt } = getPagination(req.query);
        const totalPt = await qOne(`SELECT COUNT(*) as cnt FROM sfa_payment_terms WHERE tenant_id = :tid`, { tid });
        const rows = await q(`SELECT * FROM sfa_payment_terms WHERE tenant_id = :tid ORDER BY sort_order, code LIMIT :limit OFFSET :offset`, { tid, limit: lpt, offset: opt });
        return ok(res, { rows, total: parseInt(totalPt?.cnt || '0'), page: ppt, limit: lpt });
      }
      case 'save-payment-term': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const pt = b;
        if (!pt.code || !pt.name) return err(res, 'code dan name wajib');
        if (pt.id) {
          const ptAllowed = ['name', 'description', 'days_due', 'discount_days', 'discount_percentage', 'late_fee_type', 'late_fee_value', 'is_default', 'is_active', 'sort_order'];
          const ptSets = Object.keys(pt).filter(k => ptAllowed.includes(k)).map(k => `${k}=:${k}`);
          if (ptSets.length > 0) await qExec(`UPDATE sfa_payment_terms SET ${ptSets.join(',')}, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { ...pt, uid, tid });
        } else {
          await qExec(`INSERT INTO sfa_payment_terms (id,tenant_id,code,name,description,days_due,discount_days,discount_percentage,late_fee_type,late_fee_value,is_default,sort_order,created_by) VALUES (gen_random_uuid(),:tid,:code,:name,:desc,:dd,:disc_d,:disc_p,:lft,:lfv,:def,:so,:uid)`,
            { tid, code: pt.code, name: pt.name, desc: pt.description || '', dd: pt.days_due || 0, disc_d: pt.discount_days || 0, disc_p: pt.discount_percentage || 0, lft: pt.late_fee_type || 'none', lfv: pt.late_fee_value || 0, def: pt.is_default || false, so: pt.sort_order || 99, uid });
        }
        if (pt.is_default) await qExec(`UPDATE sfa_payment_terms SET is_default = false WHERE tenant_id = :tid AND id != :id`, { tid, id: pt.id || 'none' });
        return ok(res, { message: 'Payment term disimpan' });
      }
      case 'delete-payment-term': {
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        await qExec(`UPDATE sfa_payment_terms SET is_deleted = true, deleted_at = NOW() WHERE id = :id AND tenant_id = :tid AND is_default = false`, { id: req.query.id, tid });
        return ok(res, { message: 'Payment term dihapus' });
      }

      // ═══════════════════════════════════════
      // BUSINESS SETTINGS (key-value)
      // ═══════════════════════════════════════
      case 'business-settings': {
        const { limit: lbs, offset: obs, page: pbs } = getPagination(req.query);
        const totalBs = await qOne(`SELECT COUNT(*) as cnt FROM sfa_business_settings WHERE tenant_id = :tid`, { tid });
        const rows = await q(`SELECT * FROM sfa_business_settings WHERE tenant_id = :tid ORDER BY category, setting_key LIMIT :limit OFFSET :offset`, { tid, limit: lbs, offset: obs });
        return ok(res, { rows, total: parseInt(totalBs?.cnt || '0'), page: pbs, limit: lbs });
      }
      case 'update-business-setting': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const { id: bsId, setting_value: bsVal } = b;
        if (!bsId) return err(res, 'id wajib');
        await qExec(`UPDATE sfa_business_settings SET setting_value=:val, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { val: bsVal, id: bsId, uid, tid });
        return ok(res, { message: 'Setting diperbarui' });
      }
      case 'bulk-update-business-settings': {
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        const settings = b.settings || [];
        for (const s of settings) {
          if (s.id && s.setting_value !== undefined) {
            await qExec(`UPDATE sfa_business_settings SET setting_value=:val, updated_by=:uid, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { val: String(s.setting_value), id: s.id, uid, tid });
          }
        }
        return ok(res, { message: `${settings.length} setting diperbarui` });
      }

      // ═══════════════════════════════════════
      // SETTINGS OVERVIEW
      // ═══════════════════════════════════════
      case 'settings-overview': {
        const [currencies] = await q(`SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM sfa_currencies WHERE tenant_id = :tid`, { tid });
        const [rates] = await q(`SELECT COUNT(*) as total FROM sfa_exchange_rates WHERE tenant_id = :tid AND is_active = true`, { tid });
        const [taxes] = await q(`SELECT COUNT(*) as total FROM sfa_tax_settings WHERE tenant_id = :tid AND is_active = true`, { tid });
        const [numFmt] = await q(`SELECT COUNT(*) as total FROM sfa_numbering_formats WHERE tenant_id = :tid AND is_active = true`, { tid });
        const [payTerms] = await q(`SELECT COUNT(*) as total FROM sfa_payment_terms WHERE tenant_id = :tid AND is_active = true`, { tid });
        const [bizSettings] = await q(`SELECT COUNT(*) as total FROM sfa_business_settings WHERE tenant_id = :tid`, { tid });
        const defCurrency = await q(`SELECT code, symbol, name FROM sfa_currencies WHERE tenant_id = :tid AND is_default = true LIMIT 1`, { tid });
        return ok(res, { data: { currencies, rates, taxes, numFmt, payTerms, bizSettings, defaultCurrency: defCurrency[0] || null } });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.warn('SFA Enhanced API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withModuleGuard('sfa', handler);
