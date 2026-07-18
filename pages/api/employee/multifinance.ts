/**
 * Employee Mobile API — Multifinance / Tim Lapangan
 * GET  ?action=profile       — profil agen & flag isMfAgent
 * GET  ?action=overview      — ringkasan kinerja vs target
 * GET  ?action=portfolio     — kontrak ditugaskan (koleksi)
 * GET  ?action=activities    — aktivitas saya hari ini / bulan ini
 * GET  ?action=commissions   — komisi bulan berjalan
 * POST ?action=activity      — catat aktivitas lapangan + GPS
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { resolveEmployeeContext } from '../../../lib/employee-portal';
import { calcCommission } from '../../../lib/hris/multifinance-types';
import { allowHrMockFallback } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

const MF_CATEGORIES = ['account_officer', 'collector', 'surveyor', 'telemarketing', 'field_agent'];

const q = async (sql: string, params: any = {}) => {
  if (!sequelize) return [];
  const [rows] = await sequelize.query(sql, { replacements: params });
  return rows as any[];
};

async function resolveAgent(userId: string, tenantId: string | null) {
  const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
  if (!ctx.employeeId) return { ...ctx, agent: null, isMfAgent: false };
  if (!tenantId) return { ...ctx, agent: null, isMfAgent: false };

  const [agent] = await q(`
    SELECT a.*, e.name AS employee_name, e.position, e.phone, e.email
    FROM mf_agents a
    JOIN employees e ON e.id = a.employee_id
    WHERE a.employee_id = :employeeId AND a.status = 'active'
      AND a.tenant_id = :tenantId
    LIMIT 1
  `, { employeeId: ctx.employeeId, tenantId });

  const [emp] = await q(`
    SELECT id, name, employment_category, business_vertical, agent_type, territory
    FROM employees WHERE id = :employeeId AND tenant_id = :tenantId LIMIT 1
  `, { employeeId: ctx.employeeId, tenantId });

  const isMfAgent = !!agent || emp?.business_vertical === 'multifinance'
    || MF_CATEGORIES.includes(emp?.employment_category || '')
    || MF_CATEGORIES.includes(emp?.agent_type || '');

  return {
    ...ctx,
    agent: agent || null,
    employeeMeta: emp,
    employeeName: agent?.employee_name || emp?.name || ctx.employeeName,
    isMfAgent,
  };
}

async function autoCalcCommission(tenantId: string | null, ctx: any): Promise<number> {
  let commissionType = 'visit';
  let baseAmount = 0;

  if (ctx.activityType === 'disbursement') {
    commissionType = 'disbursement';
    baseAmount = parseFloat(ctx.loanAmount) || 0;
  } else if (ctx.activityType === 'collection' || ctx.activityType === 'recovery') {
    commissionType = ctx.activityType === 'recovery' ? 'recovery' : 'collection';
    baseAmount = parseFloat(ctx.amountCollected) || 0;
    if ((ctx.dpdDays || 0) >= 90) commissionType = 'recovery';
  } else if (ctx.activityType === 'prospect') {
    commissionType = 'prospect';
    baseAmount = parseFloat(ctx.loanAmount) || 0;
  }

  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';
  const [rules] = await q(`
    SELECT * FROM mf_commission_rules
    WHERE is_active = true AND commission_type = :commissionType ${tf}
    ORDER BY created_at DESC LIMIT 1
  `, { tenantId, commissionType });

  const rule = rules;
  if (!rule) return commissionType === 'visit' ? 25000 : 0;
  if (rule.rate_type === 'fixed') return calcCommission(0, 'fixed', parseFloat(rule.rate_value));
  if (baseAmount <= 0 && commissionType !== 'visit') return 0;
  return calcCommission(baseAmount, 'percentage', parseFloat(rule.rate_value));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userId = String(session.user.id || '');
    const tenantId = String((session.user as any).tenantId || '') || null;
    const action = String(req.query.action || '');

    if (!sequelize) {
      return res.json({
        success: true,
        data: allowHrMockFallback() ? mockData(action) : (action === 'profile' ? { isMfAgent: false, agent: null } : []),
      });
    }

    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'Tenant context required' });
    }

    const agentCtx = await resolveAgent(userId, tenantId);

    if (req.method === 'GET') {
      switch (action) {
        case 'profile': return getProfile(res, agentCtx);
        case 'overview': return getOverview(res, agentCtx, tenantId);
        case 'portfolio': return getPortfolio(res, agentCtx, tenantId, req);
        case 'activities': return getActivities(res, agentCtx, tenantId, req);
        case 'commissions': return getCommissions(res, agentCtx, tenantId, req);
        case 'contract': return getContract(res, tenantId, req);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    if (req.method === 'POST' && action === 'activity') {
      return createActivity(req, res, agentCtx, tenantId);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.warn('[employee/multifinance]', e.message);
    return res.status(500).json({ success: false, error: e.message || 'Internal error' });
  }
}

function mockData(action: string) {
  const today = new Date().toISOString().split('T')[0];
  if (action === 'profile') return { isMfAgent: true, agent: { agent_type: 'collector', agent_code: 'AG-DEMO', territory: 'Jakarta Selatan' }, employeeName: 'Demo Kolektor' };
  if (action === 'overview') return { todayActivities: 2, todayCollection: 1170000, monthlyCollection: 8500000, monthlyDisbursement: 0, targetCollection: 50000000, targetDisbursement: 0, targetVisits: 20, visitCount: 8, pendingVerification: 1, pendingCommission: 125000, portfolioOverdue: 3, portfolioNpl: 1 };
  if (action === 'portfolio') return [{ id: '1', contract_number: 'MF-2024-00123', customer_name: 'Budi Santoso', installment_amount: 650000, dpd_days: 0, status: 'active' }];
  if (action === 'activities') return [{ id: '1', activity_date: today, activity_type: 'collection', customer_name: 'Budi Santoso', amount_collected: 650000, status: 'pending' }];
  if (action === 'commissions') return [{ id: '1', commission_amount: 125000, status: 'pending', period_month: today.slice(0, 7) }];
  return null;
}

async function getProfile(res: NextApiResponse, ctx: any) {
  const agentType = ctx.agent?.agent_type || ctx.employeeMeta?.agent_type
    || ctx.employeeMeta?.employment_category || null;

  return res.json({
    success: true,
    data: {
      isMfAgent: ctx.isMfAgent,
      employeeId: ctx.employeeId,
      employeeName: ctx.employeeName || null,
      agent: ctx.agent ? {
        id: ctx.agent.id,
        agentCode: ctx.agent.agent_code,
        agentType: ctx.agent.agent_type,
        territory: ctx.agent.territory,
        targetMonthlyDisbursement: parseFloat(ctx.agent.target_monthly_disbursement) || 0,
        targetMonthlyCollection: parseFloat(ctx.agent.target_monthly_collection) || 0,
        targetVisitCount: parseInt(ctx.agent.target_visit_count) || 0,
      } : agentType ? {
        agentType,
        territory: ctx.employeeMeta?.territory || null,
        targetMonthlyCollection: 0,
        targetMonthlyDisbursement: 0,
        targetVisitCount: 20,
      } : null,
      employmentCategory: ctx.employeeMeta?.employment_category,
      businessVertical: ctx.employeeMeta?.business_vertical,
    },
  });
}

async function getOverview(res: NextApiResponse, ctx: any, tenantId: string | null) {
  if (!ctx.employeeId) return res.json({ success: true, data: {} });

  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';

  const [todayActs] = await q(`
    SELECT COUNT(*)::int AS c, COALESCE(SUM(amount_collected), 0) AS collected
    FROM mf_collection_activities
    WHERE employee_id = :employeeId AND activity_date = :today ${tf}
  `, { employeeId: ctx.employeeId, today, tenantId }).catch(() => [{ c: 0, collected: 0 }]);

  const [monthly] = await q(`
    SELECT
      COALESCE(SUM(CASE WHEN activity_type = 'disbursement' THEN loan_amount ELSE 0 END), 0) AS disbursement,
      COALESCE(SUM(amount_collected), 0) AS collection,
      COUNT(*)::int AS visit_count
    FROM mf_collection_activities
    WHERE employee_id = :employeeId AND activity_date >= :monthStart
      AND status IN ('pending', 'verified', 'approved') ${tf}
  `, { employeeId: ctx.employeeId, monthStart, tenantId }).catch(() => [{ disbursement: 0, collection: 0, visit_count: 0 }]);

  const [pending] = await q(`
    SELECT COUNT(*)::int AS c FROM mf_collection_activities
    WHERE employee_id = :employeeId AND status = 'pending' ${tf}
  `, { employeeId: ctx.employeeId, tenantId }).catch(() => [{ c: 0 }]);

  const [comm] = await q(`
    SELECT COALESCE(SUM(commission_amount), 0) AS total
    FROM mf_agent_commissions
    WHERE employee_id = :employeeId AND period_month = :periodMonth AND status = 'pending' ${tf}
  `, { employeeId: ctx.employeeId, periodMonth: today.slice(0, 7), tenantId }).catch(() => [{ total: 0 }]);

  const [portfolio] = await q(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue,
      COUNT(*) FILTER (WHERE status = 'npl')::int AS npl,
      COUNT(*)::int AS total
    FROM mf_loan_contracts
    WHERE assigned_employee_id = :employeeId AND tenant_id = :tenantId
  `, { employeeId: ctx.employeeId, tenantId }).catch(() => [{ overdue: 0, npl: 0, total: 0 }]);

  const agent = ctx.agent;
  const agentType = agent?.agent_type || ctx.employeeMeta?.employment_category;
  const defaultTargetColl = agentType === 'collector' ? 50000000 : 0;
  const defaultTargetDisb = agentType === 'account_officer' ? 100000000 : 0;

  return res.json({
    success: true,
    data: {
      todayActivities: todayActs?.c || 0,
      todayCollection: parseFloat(todayActs?.collected || '0'),
      monthlyCollection: parseFloat(monthly?.collection || '0'),
      monthlyDisbursement: parseFloat(monthly?.disbursement || '0'),
      visitCount: monthly?.visit_count || 0,
      targetCollection: parseFloat(agent?.target_monthly_collection) || defaultTargetColl,
      targetDisbursement: parseFloat(agent?.target_monthly_disbursement) || defaultTargetDisb,
      targetVisits: parseInt(agent?.target_visit_count) || 20,
      pendingVerification: pending?.c || 0,
      pendingCommission: parseFloat(comm?.total || '0'),
      portfolioTotal: portfolio?.total || 0,
      portfolioOverdue: portfolio?.overdue || 0,
      portfolioNpl: portfolio?.npl || 0,
    },
  });
}

async function getPortfolio(res: NextApiResponse, ctx: any, tenantId: string | null, req: NextApiRequest) {
  const { status, search, dpd_min } = req.query;
  if (!ctx.employeeId) return res.json({ success: true, data: [] });

  const replacements: any = { employeeId: ctx.employeeId, tenantId };
  let where = `WHERE c.assigned_employee_id = :employeeId AND c.tenant_id = :tenantId`;
  if (status) { where += ' AND c.status = :status'; replacements.status = status; }
  if (dpd_min) { where += ' AND c.dpd_days >= :dpdMin'; replacements.dpdMin = parseInt(dpd_min as string); }
  if (search) {
    where += ` AND (c.contract_number ILIKE :search OR c.customer_name ILIKE :search OR c.customer_phone ILIKE :search)`;
    replacements.search = `%${search}%`;
  }

  const rows = await q(`
    SELECT c.* FROM mf_loan_contracts c
    ${where}
    ORDER BY c.dpd_days DESC, c.next_due_date ASC
    LIMIT 100
  `, replacements).catch(() => []);

  return res.json({ success: true, data: rows });
}

async function getContract(res: NextApiResponse, tenantId: string | null, req: NextApiRequest) {
  const num = req.query.contract_number || req.query.q;
  if (!num) return res.status(400).json({ success: false, error: 'contract_number required' });

  const tf = 'AND tenant_id = :tenantId';
  const [row] = await q(`
    SELECT * FROM mf_loan_contracts
    WHERE contract_number ILIKE :num ${tf} LIMIT 1
  `, { num: String(num).trim(), tenantId }).catch(() => []);

  return res.json({ success: true, data: row || null });
}

async function getActivities(res: NextApiResponse, ctx: any, tenantId: string | null, req: NextApiRequest) {
  if (!ctx.employeeId) return res.json({ success: true, data: [] });

  const { date_from, date_to } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const replacements: any = {
    employeeId: ctx.employeeId, tenantId,
    dateFrom: date_from || today,
    dateTo: date_to || today,
  };
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';

  const rows = await q(`
    SELECT * FROM mf_collection_activities
    WHERE employee_id = :employeeId
      AND activity_date BETWEEN :dateFrom AND :dateTo ${tf}
    ORDER BY activity_date DESC, created_at DESC
    LIMIT 50
  `, replacements).catch(() => []);

  return res.json({ success: true, data: rows });
}

async function getCommissions(res: NextApiResponse, ctx: any, tenantId: string | null, req: NextApiRequest) {
  if (!ctx.employeeId) return res.json({ success: true, data: [] });

  const periodMonth = (req.query.period_month as string) || new Date().toISOString().slice(0, 7);
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';

  const rows = await q(`
    SELECT * FROM mf_agent_commissions
    WHERE employee_id = :employeeId AND period_month = :periodMonth ${tf}
    ORDER BY created_at DESC
  `, { employeeId: ctx.employeeId, periodMonth, tenantId }).catch(() => []);

  return res.json({ success: true, data: rows });
}

async function createActivity(req: NextApiRequest, res: NextApiResponse, ctx: any, tenantId: string | null) {
  if (!ctx.employeeId) return res.status(403).json({ success: false, error: 'Profil karyawan tidak ditemukan' });
  if (!ctx.isMfAgent) return res.status(403).json({ success: false, error: 'Akun bukan tim lapangan pembiayaan' });

  const b = req.body;
  if (!b.activityDate || !b.activityType) {
    return res.status(400).json({ success: false, error: 'activityDate dan activityType wajib' });
  }

  let agentId = ctx.agent?.id || null;
  if (!agentId) {
    const [ag] = await q(
    `SELECT id FROM mf_agents WHERE employee_id = :employeeId AND status = 'active' AND tenant_id = :tenantId LIMIT 1`,
    { employeeId: ctx.employeeId, tenantId },
  );
    agentId = ag?.id || null;
  }

  const commissionAmt = await autoCalcCommission(tenantId, {
    activityType: b.activityType,
    productType: b.productType,
    loanAmount: b.loanAmount,
    amountCollected: b.amountCollected,
    dpdDays: b.dpdDays,
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
      tenantId, agentId, employeeId: ctx.employeeId,
      activityDate: b.activityDate,
      activityType: b.activityType,
      productType: b.productType || null,
      customerName: b.customerName || null,
      contractNumber: b.contractNumber || null,
      loanAmount: b.loanAmount || 0,
      installmentAmount: b.installmentAmount || 0,
      amountCollected: b.amountCollected || 0,
      dpdDays: b.dpdDays || 0,
      visitOutcome: b.visitOutcome || null,
      promiseDate: b.promiseDate || null,
      location: b.location || b.address || null,
      gpsLat: b.gpsLat ?? b.latitude ?? null,
      gpsLng: b.gpsLng ?? b.longitude ?? null,
      notes: b.notes || null,
      commissionAmount: commissionAmt,
    },
  });

  const act = Array.isArray(result) ? result[0] : result;

  if (b.contractNumber && b.visitOutcome && ['paid_full', 'paid_partial'].includes(b.visitOutcome)) {
    await q(`
      UPDATE mf_loan_contracts SET
        dpd_days = CASE WHEN :visitOutcome = 'paid_full' THEN 0 ELSE dpd_days END,
        last_payment_date = :activityDate,
        outstanding_amount = GREATEST(0, outstanding_amount - :amountCollected),
        updated_at = NOW()
      WHERE contract_number = :contractNumber AND tenant_id = :tenantId
    `, {
      visitOutcome: b.visitOutcome,
      activityDate: b.activityDate,
      amountCollected: b.amountCollected || 0,
      contractNumber: b.contractNumber,
      tenantId,
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: 'Aktivitas lapangan tercatat. Menunggu verifikasi HR.',
    data: act,
  });
}
