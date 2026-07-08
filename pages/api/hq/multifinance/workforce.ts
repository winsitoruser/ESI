import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { calcCommission } from '../../../../lib/hris/multifinance-types';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const MF_CATEGORIES = ['account_officer', 'collector', 'surveyor', 'telemarketing', 'field_agent'];

function getTenantId(req: NextApiRequest): string | null {
  return (req as any).session?.user?.tenantId || null;
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function tenantFilter(tenantId: string | null, alias = '') {
  const p = alias ? `${alias}.` : '';
  return tenantId ? `AND ${p}tenant_id = :tenantId` : '';
}

/** verified_by / approved_by are UUID columns — users.id is integer */
function sessionActorUuid(session: any): string | null {
  const id = session?.user?.employeeId || session?.user?.id;
  return isUuid(id) ? id : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = getTenantId(req);
  const { action } = req.query;
  const session = (req as any).session;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'overview') return getOverview(req, res, tenantId);
        if (action === 'agents') return listAgents(req, res, tenantId);
        if (action === 'activities') return listActivities(req, res, tenantId);
        if (action === 'commission-rules') return listCommissionRules(req, res, tenantId);
        if (action === 'commissions') return listCommissions(req, res, tenantId);
        if (action === 'eligible-employees') return listEligibleEmployees(req, res, tenantId);
        if (action === 'portfolio') return listPortfolio(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'POST':
        if (action === 'agent') return createAgent(req, res, tenantId, session);
        if (action === 'activity') return createActivity(req, res, tenantId, session);
        if (action === 'commission-rule') return createCommissionRule(req, res, tenantId);
        if (action === 'verify-activity') return verifyActivity(req, res, tenantId, session);
        if (action === 'approve-commission') return approveCommission(req, res, tenantId, session);
        if (action === 'calc-commissions') return calcPeriodCommissions(req, res, tenantId, session);
        if (action === 'assign-contract') return assignContract(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'PUT':
        if (action === 'agent') return updateAgent(req, res, tenantId);
        if (action === 'activity') return updateActivity(req, res, tenantId);
        if (action === 'commission-rule') return updateCommissionRule(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'DELETE':
        if (action === 'agent') return deleteAgent(req, res, tenantId);
        if (action === 'activity') return deleteActivity(req, res, tenantId);
        if (action === 'commission-rule') return deleteCommissionRule(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.warn('Multifinance workforce API error:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
}

async function getOverview(_req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: { activeAgents: 0, todayActivities: 0, pendingCommissions: 0 } });

  const replacements: any = tenantId ? { tenantId } : {};
  const tf = tenantFilter(tenantId);

  const [agents] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM mf_agents WHERE status = 'active' ${tf}
  `, { replacements }).catch(() => [[{ c: 0 }]]);

  const today = new Date().toISOString().split('T')[0];
  const [acts] = await sequelize.query(`
    SELECT COUNT(*) AS c, COALESCE(SUM(amount_collected), 0) AS collected
    FROM mf_collection_activities WHERE activity_date = :today ${tf}
  `, { replacements: { ...replacements, today } }).catch(() => [[{ c: 0, collected: 0 }]]);

  const [pending] = await sequelize.query(`
    SELECT COUNT(*) AS c, COALESCE(SUM(commission_amount), 0) AS total
    FROM mf_agent_commissions WHERE status = 'pending' ${tf}
  `, { replacements }).catch(() => [[{ c: 0, total: 0 }]]);

  const [verified] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM mf_collection_activities
    WHERE status = 'pending' ${tf}
  `, { replacements }).catch(() => [[{ c: 0 }]]);

  const monthStart = today.slice(0, 7) + '-01';
  const [monthly] = await sequelize.query(`
    SELECT
      COALESCE(SUM(CASE WHEN activity_type = 'disbursement' THEN loan_amount ELSE 0 END), 0) AS disbursement,
      COALESCE(SUM(amount_collected), 0) AS collection
    FROM mf_collection_activities
    WHERE activity_date >= :monthStart AND status IN ('verified', 'approved') ${tf}
  `, { replacements: { ...replacements, monthStart } }).catch(() => [[{ disbursement: 0, collection: 0 }]]);

  return res.json({
    success: true,
    data: {
      activeAgents: parseInt(agents?.[0]?.c || '0'),
      todayActivities: parseInt(acts?.[0]?.c || '0'),
      todayCollection: parseFloat(acts?.[0]?.collected || '0'),
      pendingCommissions: parseInt(pending?.[0]?.c || '0'),
      pendingCommissionAmount: parseFloat(pending?.[0]?.total || '0'),
      pendingVerification: parseInt(verified?.[0]?.c || '0'),
      monthlyDisbursement: parseFloat(monthly?.[0]?.disbursement || '0'),
      monthlyCollection: parseFloat(monthly?.[0]?.collection || '0'),
    },
  });
}

async function listAgents(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const { agent_type, search, status } = req.query;
  const replacements: any = tenantId ? { tenantId } : {};
  let where = `WHERE 1=1 ${tenantFilter(tenantId, 'a')}`;

  if (agent_type) { where += ' AND a.agent_type = :agentType'; replacements.agentType = agent_type; }
  if (status) { where += ' AND a.status = :status'; replacements.status = status; }
  if (search) {
    where += ` AND (e.name ILIKE :search OR a.agent_code ILIKE :search OR a.territory ILIKE :search)`;
    replacements.search = `%${search}%`;
  }

  const [rows] = await sequelize.query(`
    SELECT a.*, e.name AS employee_name, e.position, e.department, e.employment_category,
      e.phone, e.email, sup.name AS supervisor_name,
      cr.name AS commission_scheme_name
    FROM mf_agents a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN employees sup ON sup.id = a.supervisor_id
    LEFT JOIN mf_commission_rules cr ON cr.id = a.commission_scheme_id
    ${where}
    ORDER BY e.name
    LIMIT 200
  `, { replacements }).catch(() => [[]]);

  return res.json({ success: true, data: rows });
}

async function listEligibleEmployees(_req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const cats = MF_CATEGORIES.map((c) => `'${c}'`).join(',');
  const replacements: any = tenantId ? { tenantId } : {};

  const [rows] = await sequelize.query(`
    SELECT e.id, e.name, e.position, e.department, e.employment_category, e.employee_code,
      e.phone, e.email, e.supervisor_id
    FROM employees e
    WHERE (
      e.employment_category IN (${cats})
      OR e.business_vertical = 'multifinance'
    )
    AND (LOWER(COALESCE(e.status, 'active')) = 'active' OR e.is_active = true)
    AND e.id NOT IN (SELECT employee_id FROM mf_agents WHERE status = 'active' ${tenantFilter(tenantId)})
    ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
    ORDER BY e.name
    LIMIT 100
  `, { replacements }).catch(() => [[]]);

  return res.json({ success: true, data: rows });
}

async function createAgent(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'DB unavailable' });

  const { employeeId, agentCode, agentType, territory, supervisorId, productFocus,
    targetMonthlyDisbursement, targetMonthlyCollection, targetVisitCount, commissionSchemeId, hireDate, notes } = req.body;

  if (!employeeId || !agentCode || !agentType) {
    return res.status(400).json({ success: false, error: 'employeeId, agentCode, agentType required' });
  }

  const [result] = await sequelize.query(`
    INSERT INTO mf_agents (id, tenant_id, employee_id, agent_code, agent_type, territory,
      supervisor_id, product_focus, target_monthly_disbursement, target_monthly_collection,
      target_visit_count, commission_scheme_id, hire_date, notes, status, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :employeeId, :agentCode, :agentType, :territory,
      :supervisorId, :productFocus::jsonb, :targetDisb, :targetColl, :targetVisit,
      :schemeId, :hireDate, :notes, 'active', NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId, employeeId, agentCode, agentType, territory: territory || null,
      supervisorId: isUuid(supervisorId) ? supervisorId : null,
      productFocus: JSON.stringify(productFocus || []),
      targetDisb: targetMonthlyDisbursement || 0, targetColl: targetMonthlyCollection || 0,
      targetVisit: targetVisitCount || 0,
      schemeId: isUuid(commissionSchemeId) ? commissionSchemeId : null,
      hireDate: hireDate || new Date().toISOString().split('T')[0], notes: notes || null,
    },
  });

  await sequelize.query(`
    UPDATE employees SET agent_code = :agentCode, agent_type = :agentType, territory = :territory,
      business_vertical = 'multifinance', employment_category = :agentType, updated_at = NOW()
    WHERE id = :employeeId
  `, { replacements: { employeeId, agentCode, agentType, territory: territory || null } }).catch(() => {});

  return res.json({ success: true, data: result?.[0] });
}

async function updateAgent(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'DB unavailable' });
  const { id, ...fields } = req.body;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });

  const allowed: Record<string, string> = {
    agentType: 'agent_type', territory: 'territory', supervisorId: 'supervisor_id',
    targetMonthlyDisbursement: 'target_monthly_disbursement',
    targetMonthlyCollection: 'target_monthly_collection', targetVisitCount: 'target_visit_count',
    commissionSchemeId: 'commission_scheme_id', status: 'status', notes: 'notes',
  };

  const sets: string[] = ['updated_at = NOW()'];
  const replacements: any = { id, tenantId };

  for (const [k, col] of Object.entries(allowed)) {
    if (fields[k] !== undefined) { sets.push(`${col} = :${k}`); replacements[k] = fields[k]; }
  }
  if (fields.productFocus) {
    sets.push('product_focus = :productFocus::jsonb');
    replacements.productFocus = JSON.stringify(fields.productFocus);
  }

  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';
  const [result] = await sequelize.query(`
    UPDATE mf_agents SET ${sets.join(', ')} WHERE id = :id ${tf} RETURNING *
  `, { replacements });

  return res.json({ success: true, data: result?.[0] });
}

async function deleteAgent(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });
  const tf = tenantFilter(tenantId);
  await sequelize.query(`UPDATE mf_agents SET status = 'inactive', updated_at = NOW() WHERE id = :id ${tf}`, {
    replacements: { id, tenantId },
  });
  return res.json({ success: true });
}

async function listActivities(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const { status, agent_id, date_from, date_to, activity_type } = req.query;
  const replacements: any = tenantId ? { tenantId } : {};
  let where = `WHERE 1=1 ${tenantFilter(tenantId, 'ca')}`;

  if (status) { where += ' AND ca.status = :status'; replacements.status = status; }
  if (agent_id && isUuid(agent_id)) { where += ' AND ca.agent_id = :agentId'; replacements.agentId = agent_id; }
  if (activity_type) { where += ' AND ca.activity_type = :activityType'; replacements.activityType = activity_type; }
  if (date_from) { where += ' AND ca.activity_date >= :dateFrom'; replacements.dateFrom = date_from; }
  if (date_to) { where += ' AND ca.activity_date <= :dateTo'; replacements.dateTo = date_to; }

  const [rows] = await sequelize.query(`
    SELECT ca.*, e.name AS agent_name, a.agent_code, a.agent_type
    FROM mf_collection_activities ca
    JOIN employees e ON e.id = ca.employee_id
    LEFT JOIN mf_agents a ON a.id = ca.agent_id
    ${where}
    ORDER BY ca.activity_date DESC, ca.created_at DESC
    LIMIT 300
  `, { replacements }).catch(() => [[]]);

  return res.json({ success: true, data: rows });
}

async function createActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'DB unavailable' });

  const b = req.body;
  if (!b.employeeId || !b.activityDate || !b.activityType) {
    return res.status(400).json({ success: false, error: 'employeeId, activityDate, activityType required' });
  }

  let agentId = b.agentId;
  if (!agentId) {
    const [ag] = await sequelize.query(`
      SELECT id FROM mf_agents WHERE employee_id = :employeeId AND status = 'active' LIMIT 1
    `, { replacements: { employeeId: b.employeeId } });
    agentId = ag?.[0]?.id || null;
  }

  const commissionAmt = await autoCalcCommission(sequelize, tenantId, {
    activityType: b.activityType, productType: b.productType,
    loanAmount: b.loanAmount, amountCollected: b.amountCollected,
    visitOutcome: b.visitOutcome, dpdDays: b.dpdDays,
  });

  const [result] = await sequelize.query(`
    INSERT INTO mf_collection_activities (
      id, tenant_id, agent_id, employee_id, activity_date, activity_type, product_type,
      customer_name, contract_number, loan_amount, installment_amount, amount_collected,
      dpd_days, visit_outcome, promise_date, location, gps_lat, gps_lng, notes,
      commission_amount, status, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), :tenantId, :agentId, :employeeId, :activityDate, :activityType, :productType,
      :customerName, :contractNumber, :loanAmount, :installmentAmount, :amountCollected,
      :dpdDays, :visitOutcome, :promiseDate, :location, :gpsLat, :gpsLng, :notes,
      :commissionAmount, 'pending', NOW(), NOW()
    ) RETURNING *
  `, {
    replacements: {
      tenantId, agentId, employeeId: b.employeeId, activityDate: b.activityDate,
      activityType: b.activityType, productType: b.productType || null,
      customerName: b.customerName || null, contractNumber: b.contractNumber || null,
      loanAmount: b.loanAmount || 0, installmentAmount: b.installmentAmount || 0,
      amountCollected: b.amountCollected || 0, dpdDays: b.dpdDays || 0,
      visitOutcome: b.visitOutcome || null, promiseDate: b.promiseDate || null,
      location: b.location || null, gpsLat: b.gpsLat || null, gpsLng: b.gpsLng || null,
      notes: b.notes || null, commissionAmount: commissionAmt,
    },
  });

  return res.json({ success: true, data: result?.[0] });
}

async function autoCalcCommission(db: any, tenantId: string | null, ctx: any): Promise<number> {
  let commissionType = 'visit';
  let baseAmount = 0;

  if (ctx.activityType === 'disbursement') {
    commissionType = 'disbursement';
    baseAmount = parseFloat(ctx.loanAmount) || 0;
  } else if (ctx.activityType === 'collection' || ctx.activityType === 'recovery') {
    commissionType = ctx.activityType === 'recovery' ? 'recovery' : 'collection';
    baseAmount = parseFloat(ctx.amountCollected) || 0;
    if (ctx.dpdDays >= 90) commissionType = 'recovery';
  } else if (ctx.activityType === 'prospect') {
    commissionType = 'prospect';
    baseAmount = parseFloat(ctx.loanAmount) || 0;
  } else if (['paid_full', 'paid_partial', 'promise_to_pay'].includes(ctx.visitOutcome)) {
    commissionType = 'visit';
    baseAmount = 0;
  }

  const tf = tenantFilter(tenantId);
  const [rules] = await db.query(`
    SELECT * FROM mf_commission_rules
    WHERE is_active = true AND commission_type = :commissionType ${tf}
    ORDER BY created_at DESC LIMIT 1
  `, { replacements: { tenantId, commissionType } }).catch(() => [[]]);

  const rule = rules?.[0];
  if (!rule) return commissionType === 'visit' ? 25000 : 0;

  if (rule.rate_type === 'fixed') return calcCommission(0, 'fixed', parseFloat(rule.rate_value));
  if (baseAmount <= 0 && commissionType !== 'visit') return 0;
  return calcCommission(baseAmount, 'percentage', parseFloat(rule.rate_value));
}

async function verifyActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { id, status } = req.body;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });

  const newStatus = status === 'rejected' ? 'rejected' : 'verified';
  const tf = tenantFilter(tenantId);

  const [result] = await sequelize.query(`
    UPDATE mf_collection_activities SET status = :newStatus, verified_by = :verifiedBy,
      verified_at = NOW(), updated_at = NOW()
    WHERE id = :id ${tf} RETURNING *
  `, {
    replacements: { id, newStatus, verifiedBy: sessionActorUuid(session), tenantId },
  });

  const act = result?.[0];
  if (act && newStatus === 'verified' && parseFloat(act.commission_amount) > 0) {
    const periodMonth = (act.activity_date || '').slice(0, 7);
    await sequelize.query(`
      INSERT INTO mf_agent_commissions (id, tenant_id, agent_id, employee_id, period_month,
        commission_type, source_activity_id, base_amount, commission_amount, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :agentId, :employeeId, :periodMonth,
        :commissionType, :activityId, :baseAmount, :commissionAmount, 'pending', NOW(), NOW())
    `, {
      replacements: {
        tenantId, agentId: act.agent_id, employeeId: act.employee_id, periodMonth,
        commissionType: act.activity_type, activityId: act.id,
        baseAmount: parseFloat(act.amount_collected) || parseFloat(act.loan_amount) || 0,
        commissionAmount: parseFloat(act.commission_amount),
      },
    }).catch(() => {});
  }

  return res.json({ success: true, data: act });
}

async function updateActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id, ...fields } = req.body;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });

  const allowed: Record<string, string> = {
    activityDate: 'activity_date', activityType: 'activity_type', productType: 'product_type',
    customerName: 'customer_name', contractNumber: 'contract_number',
    loanAmount: 'loan_amount', installmentAmount: 'installment_amount',
    amountCollected: 'amount_collected', dpdDays: 'dpd_days',
    visitOutcome: 'visit_outcome', promiseDate: 'promise_date', location: 'location', notes: 'notes',
  };

  const sets = ['updated_at = NOW()'];
  const replacements: any = { id, tenantId };
  for (const [k, col] of Object.entries(allowed)) {
    if (fields[k] !== undefined) { sets.push(`${col} = :${k}`); replacements[k] = fields[k]; }
  }

  const tf = tenantFilter(tenantId);
  const [result] = await sequelize.query(`
    UPDATE mf_collection_activities SET ${sets.join(', ')} WHERE id = :id ${tf} RETURNING *
  `, { replacements });

  return res.json({ success: true, data: result?.[0] });
}

async function deleteActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });
  const tf = tenantFilter(tenantId);
  await sequelize.query(`DELETE FROM mf_collection_activities WHERE id = :id AND status = 'pending' ${tf}`, {
    replacements: { id, tenantId },
  });
  return res.json({ success: true });
}

async function listCommissionRules(_req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tf = tenantFilter(tenantId);
  const [rows] = await sequelize.query(`
    SELECT * FROM mf_commission_rules WHERE 1=1 ${tf} ORDER BY commission_type, name
  `, { replacements: { tenantId } }).catch(() => [[]]);
  return res.json({ success: true, data: rows });
}

async function createCommissionRule(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const b = req.body;
  if (!b.code || !b.name || !b.commissionType) {
    return res.status(400).json({ success: false, error: 'code, name, commissionType required' });
  }

  const [result] = await sequelize.query(`
    INSERT INTO mf_commission_rules (id, tenant_id, code, name, commission_type, product_type,
      rate_type, rate_value, min_amount, max_amount, dpd_bucket, is_active, notes, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :code, :name, :commissionType, :productType,
      :rateType, :rateValue, :minAmount, :maxAmount, :dpdBucket, :isActive, :notes, NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId, code: b.code, name: b.name, commissionType: b.commissionType,
      productType: b.productType || null, rateType: b.rateType || 'percentage',
      rateValue: b.rateValue || 0, minAmount: b.minAmount || 0, maxAmount: b.maxAmount || 0,
      dpdBucket: b.dpdBucket || null, isActive: b.isActive !== false, notes: b.notes || null,
    },
  });

  return res.json({ success: true, data: result?.[0] });
}

async function updateCommissionRule(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id, ...fields } = req.body;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });

  const allowed: Record<string, string> = {
    name: 'name', rateType: 'rate_type', rateValue: 'rate_value',
    minAmount: 'min_amount', maxAmount: 'max_amount', isActive: 'is_active', notes: 'notes',
  };
  const sets = ['updated_at = NOW()'];
  const replacements: any = { id, tenantId };
  for (const [k, col] of Object.entries(allowed)) {
    if (fields[k] !== undefined) { sets.push(`${col} = :${k}`); replacements[k] = fields[k]; }
  }

  const tf = tenantFilter(tenantId);
  const [result] = await sequelize.query(`
    UPDATE mf_commission_rules SET ${sets.join(', ')} WHERE id = :id ${tf} RETURNING *
  `, { replacements });

  return res.json({ success: true, data: result?.[0] });
}

async function deleteCommissionRule(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ success: false, error: 'id required' });
  const tf = tenantFilter(tenantId);
  await sequelize.query(`UPDATE mf_commission_rules SET is_active = false, updated_at = NOW() WHERE id = :id ${tf}`, {
    replacements: { id, tenantId },
  });
  return res.json({ success: true });
}

async function listCommissions(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const { period_month, status, employee_id } = req.query;
  const replacements: any = tenantId ? { tenantId } : {};
  let where = `WHERE 1=1 ${tenantFilter(tenantId, 'c')}`;

  if (period_month) { where += ' AND c.period_month = :periodMonth'; replacements.periodMonth = period_month; }
  if (status) { where += ' AND c.status = :status'; replacements.status = status; }
  if (employee_id && isUuid(employee_id)) { where += ' AND c.employee_id = :employeeId'; replacements.employeeId = employee_id; }

  const [rows] = await sequelize.query(`
    SELECT c.*, e.name AS employee_name, a.agent_code
    FROM mf_agent_commissions c
    JOIN employees e ON e.id = c.employee_id
    LEFT JOIN mf_agents a ON a.id = c.agent_id
    ${where}
    ORDER BY c.period_month DESC, e.name
    LIMIT 300
  `, { replacements }).catch(() => [[]]);

  return res.json({ success: true, data: rows });
}

async function approveCommission(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ success: false, error: 'ids array required' });
  }

  const tf = tenantFilter(tenantId);
  await sequelize.query(`
    UPDATE mf_agent_commissions SET status = 'approved', approved_by = :approvedBy,
      approved_at = NOW(), updated_at = NOW()
    WHERE id = ANY(:ids::uuid[]) AND status = 'pending' ${tf}
  `, { replacements: { ids, approvedBy: sessionActorUuid(session), tenantId } });

  return res.json({ success: true, message: `${ids.length} komisi disetujui` });
}

async function calcPeriodCommissions(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { periodMonth } = req.body;
  if (!periodMonth) return res.status(400).json({ success: false, error: 'periodMonth required (YYYY-MM)' });

  const tf = tenantFilter(tenantId, 'ca');
  const [activities] = await sequelize.query(`
    SELECT ca.* FROM mf_collection_activities ca
    WHERE ca.status = 'verified'
      AND to_char(ca.activity_date, 'YYYY-MM') = :periodMonth
      AND ca.id NOT IN (
        SELECT source_activity_id FROM mf_agent_commissions
        WHERE source_activity_id IS NOT NULL AND period_month = :periodMonth ${tenantFilter(tenantId)}
      )
      ${tf}
  `, { replacements: { periodMonth, tenantId } }).catch(() => [[]]);

  let created = 0;
  for (const act of activities || []) {
    const amt = parseFloat(act.commission_amount) || 0;
    if (amt <= 0) continue;
    await sequelize.query(`
      INSERT INTO mf_agent_commissions (id, tenant_id, agent_id, employee_id, period_month,
        commission_type, source_activity_id, base_amount, commission_amount, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :agentId, :employeeId, :periodMonth,
        :commissionType, :activityId, :baseAmount, :commissionAmount, 'pending', NOW(), NOW())
    `, {
      replacements: {
        tenantId, agentId: act.agent_id, employeeId: act.employee_id, periodMonth,
        commissionType: act.activity_type, activityId: act.id,
        baseAmount: parseFloat(act.amount_collected) || parseFloat(act.loan_amount) || 0,
        commissionAmount: amt,
      },
    }).catch(() => {});
    created++;
  }

  return res.json({ success: true, message: `${created} komisi dihitung untuk ${periodMonth}` });
}

async function listPortfolio(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const { status, search, agent_id, unassigned } = req.query;
  const replacements: any = { tenantId };
  let where = 'WHERE 1=1';
  if (tenantId) where += ' AND (c.tenant_id = :tenantId OR c.tenant_id IS NULL)';
  if (status) { where += ' AND c.status = :status'; replacements.status = status; }
  if (agent_id && isUuid(agent_id)) { where += ' AND c.assigned_agent_id = :agentId'; replacements.agentId = agent_id; }
  if (unassigned === 'true') where += ' AND c.assigned_employee_id IS NULL';
  if (search) {
    where += ` AND (c.contract_number ILIKE :search OR c.customer_name ILIKE :search)`;
    replacements.search = `%${search}%`;
  }

  const [rows] = await sequelize.query(`
    SELECT c.*, e.name AS agent_name, a.agent_code
    FROM mf_loan_contracts c
    LEFT JOIN mf_agents a ON a.id = c.assigned_agent_id
    LEFT JOIN employees e ON e.id = c.assigned_employee_id
    ${where}
    ORDER BY c.dpd_days DESC, c.contract_number
    LIMIT 200
  `, { replacements }).catch(() => [[]]);

  return res.json({ success: true, data: rows });
}

async function assignContract(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { contractIds, employeeId, agentId } = req.body;
  if (!Array.isArray(contractIds) || !contractIds.length) {
    return res.status(400).json({ success: false, error: 'contractIds array required' });
  }
  if (!isUuid(employeeId) && !isUuid(agentId)) {
    return res.status(400).json({ success: false, error: 'employeeId or agentId required' });
  }

  let resolvedAgentId = agentId;
  let resolvedEmployeeId = employeeId;
  if (!resolvedEmployeeId && resolvedAgentId) {
    const [ag] = await sequelize.query(`SELECT employee_id FROM mf_agents WHERE id = :agentId LIMIT 1`, {
      replacements: { agentId: resolvedAgentId },
    });
    resolvedEmployeeId = ag?.[0]?.employee_id;
  }
  if (!resolvedAgentId && resolvedEmployeeId) {
    const [ag] = await sequelize.query(`SELECT id FROM mf_agents WHERE employee_id = :employeeId AND status = 'active' LIMIT 1`, {
      replacements: { employeeId: resolvedEmployeeId },
    });
    resolvedAgentId = ag?.[0]?.id || null;
  }

  const tf = tenantFilter(tenantId);
  await sequelize.query(`
    UPDATE mf_loan_contracts SET
      assigned_employee_id = :employeeId,
      assigned_agent_id = :agentId,
      updated_at = NOW()
    WHERE id = ANY(:contractIds::uuid[]) ${tf}
  `, { replacements: { employeeId: resolvedEmployeeId, agentId: resolvedAgentId, contractIds, tenantId } });

  return res.json({ success: true, message: `${contractIds.length} kontrak ditugaskan ke agen` });
}

export default withHQAuth(handler);
