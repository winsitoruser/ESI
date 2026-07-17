/**
 * HR Analytics Hub — unified dashboard data (competitor-grade insights)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function safeQuery(sql: string, replacements: Record<string, unknown> = {}) {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch {
    return [];
  }
}

async function safeScalar(sql: string, replacements: Record<string, unknown> = {}, field = 'cnt') {
  const rows = await safeQuery(sql, replacements);
  return parseFloat(rows[0]?.[field] ?? rows[0]?.count ?? 0) || 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const tenantId = tenantIdFromSession(session);
  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';
  const etf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const r = { tenantId, period };

  // Recruitment counts: tenant-only (no OR NULL). Missing tenant → zeros.
  const recruitmentSql = tenantId
    ? `SELECT
        (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open' AND tenant_id = :tenantId) as open_positions,
        (SELECT COUNT(*)::int FROM hris_candidates WHERE tenant_id = :tenantId) as total_candidates,
        (SELECT COUNT(*)::int FROM hris_candidates WHERE current_stage = 'hired' AND tenant_id = :tenantId) as hired`
    : `SELECT 0::int as open_positions, 0::int as total_candidates, 0::int as hired`;

  const [
    totalEmployees,
    activeEmployees,
    newHires,
    terminations,
    attendance,
    overtime,
    kpi,
    performance,
    payroll,
    recruitment,
    reimbursement,
    leaveStats,
    attendanceTrend,
    kpiByDept,
    overtimeByDept,
  ] = await Promise.all([
    safeScalar(`SELECT COUNT(*)::float as cnt FROM employees WHERE 1=1 ${tf}`, r),
    safeScalar(`SELECT COUNT(*)::float as cnt FROM employees e WHERE (LOWER(COALESCE(status,'active')) = 'active' OR status IS NULL OR is_active = true) ${etf}`, r),
    safeScalar(`SELECT COUNT(*)::float as cnt FROM employees e WHERE created_at >= NOW() - INTERVAL '30 days' ${etf}`, r),
    safeScalar(`SELECT COUNT(*)::float as cnt FROM termination_requests WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '30 days' ${tf}`, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status IN ('present','late','hadir','terlambat','work_from_home'))::int as present,
        COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int as late,
        COUNT(*) FILTER (WHERE status IN ('absent','alpha','tidak_hadir'))::int as absent,
        COALESCE(AVG(work_hours) FILTER (WHERE work_hours > 0), 0)::float as avg_hours,
        COALESCE(AVG(late_minutes) FILTER (WHERE late_minutes > 0), 0)::float as avg_late_min
      FROM employee_attendance
      WHERE TO_CHAR(date, 'YYYY-MM') = :period ${tf}
    `, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as requests,
        COALESCE(SUM(hours), 0)::float as total_hours,
        COALESCE(SUM(COALESCE(approved_hours, hours) * COALESCE(hourly_rate, 0)), 0)::float as total_cost
      FROM employee_overtime
      WHERE TO_CHAR(overtime_date, 'YYYY-MM') = :period ${tf.replace('tenant_id', 'tenant_id')}
    `, r),
    safeQuery(`
      SELECT
        COUNT(DISTINCT ek.employee_id)::int as employees,
        ROUND(AVG(CASE WHEN ek.target > 0 THEN (ek.actual / ek.target * 100) ELSE 0 END)::numeric, 1)::float as avg_achievement,
        COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual / ek.target >= 1)::int as on_track,
        COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual / ek.target >= 0.7 AND ek.actual / ek.target < 1)::int as at_risk,
        COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual / ek.target < 0.7)::int as off_track
      FROM employee_kpis ek
      JOIN employees e ON ek.employee_id = e.id
      WHERE ek.period = :period ${etf.replace('e.', 'ek.')}
    `, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        ROUND(AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL)::numeric, 1)::float as avg_score
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.period LIKE :period || '%' ${etf.replace('e.', 'pr.')}
    `, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as runs,
        COALESCE(SUM(total_net), 0)::float as total_net,
        COALESCE(SUM(total_gross), 0)::float as total_gross,
        COALESCE(SUM(total_deductions), 0)::float as total_deductions
      FROM payroll_runs
      WHERE TO_CHAR(period_start, 'YYYY-MM') = :period ${tf}
    `, r),
    safeQuery(recruitmentSql, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'paid')::int as paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::float as pending_amount,
        COALESCE(SUM(COALESCE(approved_amount, amount)) FILTER (WHERE status IN ('approved','paid')), 0)::float as approved_amount
      FROM employee_claims WHERE 1=1 ${tf}
    `, r),
    safeQuery(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE TO_CHAR(lr.start_date, 'YYYY-MM') = :period ${etf.replace('e.', 'lr.')}
    `, r),
    safeQuery(`
      SELECT TO_CHAR(date, 'DD Mon') as day,
        COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::int as present,
        COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int as late,
        COUNT(*) FILTER (WHERE status IN ('absent','alpha'))::int as absent
      FROM employee_attendance
      WHERE date >= CURRENT_DATE - INTERVAL '14 days' ${tf}
      GROUP BY date ORDER BY date
    `, r),
    safeQuery(`
      SELECT e.department, ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual/ek.target*100 ELSE 0 END)::numeric,1)::float as achievement
      FROM employee_kpis ek
      JOIN employees e ON ek.employee_id = e.id
      WHERE ek.period = :period AND e.department IS NOT NULL ${etf}
      GROUP BY e.department ORDER BY achievement DESC LIMIT 8
    `, r),
    safeQuery(`
      SELECT e.department, COALESCE(SUM(COALESCE(o.approved_hours, o.hours)), 0)::float as hours
      FROM employee_overtime o
      JOIN employees e ON o.employee_id = e.id
      WHERE TO_CHAR(o.overtime_date, 'YYYY-MM') = :period ${etf.replace('e.', 'o.')}
      GROUP BY e.department ORDER BY hours DESC LIMIT 8
    `, r),
  ]);

  const att = attendance[0] || {};
  const ot = overtime[0] || {};
  const k = kpi[0] || {};
  const perf = performance[0] || {};
  const pay = payroll[0] || {};
  const rec = recruitment[0] || {};
  const reimb = reimbursement[0] || {};
  const leave = leaveStats[0] || {};

  const attTotal = parseInt(att.total || '0', 10);
  const attendanceRate = attTotal > 0 ? Number(((att.present / attTotal) * 100).toFixed(1)) : 0;
  const lateRate = attTotal > 0 ? Number(((att.late / attTotal) * 100).toFixed(1)) : 0;
  const absentRate = attTotal > 0 ? Number(((att.absent / attTotal) * 100).toFixed(1)) : 0;
  const turnoverRate = activeEmployees > 0 ? Number(((terminations / activeEmployees) * 100).toFixed(1)) : 0;

  return res.json({
    success: true,
    period,
    data: {
      overview: {
        totalEmployees,
        activeEmployees,
        newHires,
        terminations,
        turnoverRate,
        attendanceRate,
        lateRate,
        absentRate,
        avgWorkHours: Number(parseFloat(att.avg_hours || 0).toFixed(1)),
        avgLateMinutes: Number(parseFloat(att.avg_late_min || 0).toFixed(0)),
      },
      attendance: {
        total: attTotal,
        present: att.present || 0,
        late: att.late || 0,
        absent: att.absent || 0,
        rate: attendanceRate,
        lateRate,
        trend: attendanceTrend,
      },
      overtime: {
        requests: ot.requests || 0,
        totalHours: Number(parseFloat(ot.total_hours || 0).toFixed(1)),
        totalCost: parseFloat(ot.total_cost || 0),
        byDepartment: overtimeByDept,
      },
      performance: {
        total: perf.total || 0,
        completed: perf.completed || 0,
        avgScore: perf.avg_score || 0,
      },
      payroll: {
        runs: pay.runs || 0,
        totalGross: parseFloat(pay.total_gross || 0),
        totalNet: parseFloat(pay.total_net || 0),
        totalDeductions: parseFloat(pay.total_deductions || 0),
      },
      kpi: {
        employees: k.employees || 0,
        avgAchievement: k.avg_achievement || 0,
        onTrack: k.on_track || 0,
        atRisk: k.at_risk || 0,
        offTrack: k.off_track || 0,
        byDepartment: kpiByDept,
      },
      recruitment: {
        openPositions: rec.open_positions || 0,
        totalCandidates: rec.total_candidates || 0,
        hired: rec.hired || 0,
        acceptanceRate: rec.total_candidates > 0 ? Math.round((rec.hired / rec.total_candidates) * 100) : 0,
      },
      reimbursement: {
        total: reimb.total || 0,
        pending: reimb.pending || 0,
        approved: reimb.approved || 0,
        paid: reimb.paid || 0,
        pendingAmount: parseFloat(reimb.pending_amount || 0),
        approvedAmount: parseFloat(reimb.approved_amount || 0),
      },
      leave: {
        total: leave.total || 0,
        pending: leave.pending || 0,
        approved: leave.approved || 0,
      },
    },
  });
}
