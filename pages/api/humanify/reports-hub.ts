import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const tenantId = (req as any).session?.user?.tenantId as string | undefined;
  const { period } = req.query;
  const currentPeriod = (period as string) || new Date().toISOString().substring(0, 7);

  const { sequelize } = await import('@/lib/sequelizeClient');
  const tf = tenantId ? 'AND tenant_id = :tenantId' : '';
  const etf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const r: any = { tenantId, period: currentPeriod };

  const reports: any[] = [];
  const summary: Record<string, any> = {};

  // Employees
  try {
    const [emp] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active,
        COUNT(*) FILTER (WHERE status = 'on_leave')::int AS on_leave
      FROM employees e WHERE 1=1 ${etf}
    `, { replacements: r });
    summary.employees = emp[0];
    reports.push({
      id: 'emp-master', category: 'kepegawaian', title: 'Data Karyawan',
      description: 'Daftar lengkap karyawan aktif & nonaktif',
      exportType: 'employees', count: emp[0]?.total || 0,
      formats: ['csv', 'xlsx', 'pdf'],
    });
  } catch { summary.employees = { total: 0, active: 0, on_leave: 0 }; }

  // Attendance
  try {
    const [att] = await sequelize.query(`
      SELECT COUNT(DISTINCT employee_id)::int AS recorded,
        COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::int AS present,
        COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
        COUNT(*) FILTER (WHERE status = 'late')::int AS late
      FROM employee_attendance
      WHERE TO_CHAR(date, 'YYYY-MM') = :period ${tf}
    `, { replacements: r });
    summary.attendance = att[0];
    reports.push({
      id: 'att-monthly', category: 'kehadiran', title: 'Rekap Absensi Bulanan',
      description: `Kehadiran periode ${currentPeriod}`,
      exportType: 'attendance', count: att[0]?.recorded || 0,
      formats: ['csv', 'xlsx', 'pdf'], period: currentPeriod,
    });
  } catch { summary.attendance = { recorded: 0, present: 0, absent: 0, late: 0 }; }

  // KPI
  try {
    const [kpi] = await sequelize.query(`
      SELECT COUNT(DISTINCT ek.employee_id)::int AS employees,
        ROUND(AVG(CASE WHEN ek.target > 0 THEN (ek.actual / ek.target * 100) ELSE 0 END)::numeric, 1) AS avg_achievement,
        COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual / ek.target >= 1)::int AS achieved
      FROM employee_kpis ek
      JOIN employees e ON ek.employee_id = e.id
      WHERE ek.period = :period ${etf.replace('e.', 'ek.')}
    `, { replacements: r });
    summary.kpi = kpi[0];
    reports.push({
      id: 'kpi-monthly', category: 'kinerja', title: 'Laporan KPI Karyawan',
      description: `Pencapaian KPI periode ${currentPeriod}`,
      exportType: 'kpi', count: kpi[0]?.employees || 0,
      formats: ['csv', 'xlsx', 'pdf'], period: currentPeriod,
    });
  } catch { summary.kpi = { employees: 0, avg_achievement: 0, achieved: 0 }; }

  // Performance reviews
  try {
    const [perf] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        ROUND(AVG(overall_score)::numeric, 1) AS avg_score
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.period LIKE :period || '%' ${etf.replace('e.', 'pr.')}
    `, { replacements: r });
    summary.performance = perf[0];
    reports.push({
      id: 'perf-review', category: 'kinerja', title: 'Evaluasi Kinerja',
      description: 'Review kinerja karyawan per periode',
      exportType: 'performance', count: perf[0]?.total || 0,
      formats: ['csv', 'xlsx', 'pdf'], period: currentPeriod,
    });
  } catch { summary.performance = { total: 0, completed: 0, avg_score: 0 }; }

  // Leave
  try {
    const [leave] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE TO_CHAR(lr.start_date, 'YYYY-MM') = :period ${etf.replace('e.', 'lr.')}
    `, { replacements: r });
    summary.leave = leave[0];
    reports.push({
      id: 'leave-summary', category: 'cuti', title: 'Laporan Cuti',
      description: 'Pengajuan dan persetujuan cuti',
      href: '/humanify/leave', count: leave[0]?.total || 0,
      formats: ['csv', 'xlsx'],
    });
  } catch { summary.leave = { total: 0, pending: 0, approved: 0 }; }

  // Payroll
  try {
    const [pay] = await sequelize.query(`
      SELECT COUNT(*)::int AS runs,
        COALESCE(SUM(total_net), 0) AS total_net,
        COALESCE(SUM(total_employees), 0)::int AS total_employees
      FROM payroll_runs
      WHERE period = :period ${tf}
    `, { replacements: r });
    summary.payroll = pay[0];
    reports.push({
      id: 'payroll-summary', category: 'payroll', title: 'Laporan Payroll',
      description: `Gaji & tunjangan periode ${currentPeriod}`,
      exportType: 'payroll', href: '/humanify/payroll/laporan',
      count: pay[0]?.total_employees || 0,
      formats: ['csv', 'xlsx', 'pdf'], period: currentPeriod,
    });
  } catch { summary.payroll = { runs: 0, total_net: 0, total_employees: 0 }; }

  // Headcount by department
  try {
    const [depts] = await sequelize.query(`
      SELECT department, COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active
      FROM employees e WHERE department IS NOT NULL ${etf}
      GROUP BY department ORDER BY count DESC
    `, { replacements: r });
    summary.headcountByDept = depts;
    reports.push({
      id: 'headcount-dept', category: 'kepegawaian', title: 'Headcount per Departemen',
      description: 'Distribusi karyawan per unit kerja',
      count: depts.length, formats: ['csv', 'xlsx'],
      data: depts,
    });
  } catch { summary.headcountByDept = []; }

  // Team members
  try {
    const [tm] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active
      FROM team_members WHERE 1=1 ${tf}
    `, { replacements: r });
    summary.teamMembers = tm[0];
    reports.push({
      id: 'team-members', category: 'kepegawaian', title: 'Tim Marketing & Sales',
      description: 'Anggota tim internal',
      href: '/humanify/team-members', count: tm[0]?.total || 0,
      formats: ['csv', 'xlsx'],
    });
  } catch { summary.teamMembers = { total: 0, active: 0 }; }

  return res.status(200).json({
    success: true,
    period: currentPeriod,
    summary,
    reports,
    generatedAt: new Date().toISOString(),
  });
}

export default withHQAuth(handler, { module: 'hris' });
