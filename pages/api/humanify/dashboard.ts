import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const tenantId = (req as any).session?.user?.tenantId as string | undefined;
  const { sequelize } = await import('@/lib/sequelizeClient');
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';
  const etf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const r: any = { tenantId };

  try {
    // Employee stats
    const [empStats] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true AND (status = 'active' OR status IS NULL))::int AS active,
        COUNT(*) FILTER (WHERE status = 'on_leave')::int AS on_leave,
        COUNT(*) FILTER (WHERE status IN ('inactive','terminated') OR is_active = false)::int AS inactive
      FROM employees e WHERE 1=1 ${etf}
    `, { replacements: r });

    const stats = empStats[0] || { total: 0, active: 0, on_leave: 0, inactive: 0 };

    // KPI average
    const period = new Date().toISOString().substring(0, 7);
    const [kpiAvg] = await sequelize.query(`
      SELECT COALESCE(AVG(CASE WHEN target > 0 THEN (actual / target) * 100 END), 0) AS avg_achievement
      FROM employee_kpis WHERE period = :period ${tf}
    `, { replacements: { ...r, period } });
    const avgKpi = Math.round(parseFloat(kpiAvg[0]?.avg_achievement || 0));

    // Performance average
    const [perfAvg] = await sequelize.query(`
      SELECT COALESCE(AVG(COALESCE(overall_rating, overall_score)), 0) AS avg_perf
      FROM performance_reviews WHERE 1=1 ${tf}
    `, { replacements: r });
    const avgPerf = Math.round(parseFloat(perfAvg[0]?.avg_perf || 0) * 20); // scale 5→100

    // Top performers (KPI >= 100%)
    const [topPerf] = await sequelize.query(`
      SELECT COUNT(DISTINCT employee_id)::int AS cnt FROM employee_kpis
      WHERE period = :period AND target > 0 AND actual >= target ${tf}
    `, { replacements: { ...r, period } });

    // Attendance today
    const today = new Date().toISOString().split('T')[0];
    const [attToday] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('present','late'))::int AS present
      FROM employee_attendance WHERE date = :today ${tf}
    `, { replacements: { ...r, today } });
    const attTotal = parseInt(attToday[0]?.total || 0);
    const attPresent = parseInt(attToday[0]?.present || 0);
    const attendanceToday = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : (stats.active > 0 ? 0 : 0);

    // Department breakdown
    const [deptRows] = await sequelize.query(`
      SELECT COALESCE(department, 'Other') AS department,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active
      FROM employees e WHERE 1=1 ${etf}
      GROUP BY department ORDER BY total DESC LIMIT 8
    `, { replacements: r });
    const colors = ['blue', 'green', 'yellow', 'purple', 'indigo', 'cyan', 'orange', 'pink'];
    const deptStats = deptRows.map((d: any, i: number) => ({
      department: d.department,
      total: d.total,
      active: d.active,
      perf: avgPerf || 80,
      attend: attendanceToday || 95,
      color: colors[i % colors.length],
    }));

    // Pending approvals
    const [pendingLeave] = await sequelize.query(`
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.status,
             e.name AS employee_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE lr.status = 'pending' ${tenantId ? 'AND lr.tenant_id = :tenantId' : ''}
      ORDER BY lr.created_at DESC LIMIT 8
    `, { replacements: r });

    const pendingApprovals = pendingLeave.map((l: any) => ({
      id: l.id,
      type: 'leave',
      title: `Cuti ${l.leave_type === 'annual' ? 'Tahunan' : l.leave_type === 'sick' ? 'Sakit' : 'Personal'} - ${l.employee_name || 'Karyawan'}`,
      subtitle: `${l.start_date} s/d ${l.end_date} (${l.total_days || '-'} hari)`,
      status: 'pending',
      date: l.start_date,
      color: l.leave_type === 'sick' ? 'red' : 'yellow',
    }));

    // Recent activities
    const [activities] = await sequelize.query(`
      SELECT id, activity_type AS type, title, description AS detail, created_at AS time, actor_name
      FROM hris_activities WHERE 1=1 ${tf}
      ORDER BY created_at DESC LIMIT 8
    `, { replacements: r });

    // Upcoming events (future leave + payroll)
    const [upcomingLeave] = await sequelize.query(`
      SELECT lr.id, e.name AS employee_name, lr.start_date AS date, lr.leave_type
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE lr.start_date >= CURRENT_DATE AND lr.status IN ('pending','approved')
      ${tenantId ? 'AND lr.tenant_id = :tenantId' : ''}
      ORDER BY lr.start_date LIMIT 5
    `, { replacements: r });

    const payrollDay = new Date();
    payrollDay.setDate(28);
    if (payrollDay < new Date()) payrollDay.setMonth(payrollDay.getMonth() + 1);
    const upcoming = [
      ...upcomingLeave.map((u: any) => ({
        id: u.id,
        title: `Cuti ${u.employee_name}`,
        date: u.date,
        color: 'yellow',
      })),
      {
        id: 'payroll',
        title: 'Proses Payroll Bulanan',
        date: payrollDay.toISOString().split('T')[0],
        color: 'blue',
      },
    ].slice(0, 6);

    return res.status(200).json({
      success: true,
      stats: {
        total: stats.total,
        active: stats.active,
        onLeave: stats.on_leave,
        inactive: stats.inactive,
        avgPerf: avgPerf || 0,
        avgKpi: avgKpi || 0,
        topPerformers: topPerf[0]?.cnt || 0,
        attendanceToday,
      },
      deptStats,
      pendingApprovals,
      recentActivities: activities,
      upcoming,
      period,
    });
  } catch (e: any) {
    console.warn('HRIS dashboard error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });
