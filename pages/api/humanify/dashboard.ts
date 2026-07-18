import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { resolveDataSource } from '@/lib/hris/data-source';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const tenantId = (req as any).session?.user?.tenantId as string | undefined;
  const { sequelize } = await import('@/lib/sequelizeClient');

  // Tenant customers must never see platform-wide rows. No tenant → empty module data.
  if (!tenantId) {
    return res.status(200).json({
      success: true,
      dataSource: 'empty',
      stats: { total: 0, active: 0, onLeave: 0, inactive: 0, avgPerf: 0, avgKpi: 0, topPerformers: 0, attendanceToday: 0 },
      deptStats: [],
      pendingApprovals: [],
      pendingSummary: { total: 0, overdue: 0, byType: { leave: 0, overtime: 0, claim: 0, travel: 0, mutation: 0 } },
      recentActivities: [],
      upcoming: [],
      period: new Date().toISOString().substring(0, 7),
    });
  }

  const tf = 'AND tenant_id = :tenantId';
  const etf = 'AND e.tenant_id = :tenantId';
  const r: any = { tenantId };

  try {
    // Employee stats
    const [empStats] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true AND LOWER(COALESCE(status, 'active')) IN ('active'))::int AS active,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('on_leave', 'leave'))::int AS on_leave,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) IN ('inactive','terminated','resigned','exited','offboarded') OR is_active = false)::int AS inactive
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

    // Pending approvals — unified inbox
    const pendingApprovals: any[] = [];

    const [pendingLeave] = await sequelize.query(`
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.status, lr.created_at,
             e.name AS employee_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE lr.status = 'pending' AND lr.tenant_id = :tenantId
      ORDER BY lr.created_at DESC LIMIT 8
    `, { replacements: r });

    pendingApprovals.push(...pendingLeave.map((l: any) => ({
      id: l.id,
      type: 'leave',
      title: `Cuti ${l.leave_type === 'annual' ? 'Tahunan' : l.leave_type === 'sick' ? 'Sakit' : 'Personal'} - ${l.employee_name || 'Karyawan'}`,
      subtitle: `${l.start_date} s/d ${l.end_date} (${l.total_days || '-'} hari)`,
      status: 'pending',
      date: l.start_date,
      createdAt: l.created_at,
      href: '/humanify/leave',
      color: l.leave_type === 'sick' ? 'red' : 'yellow',
    })));

    try {
      const [pendingOt] = await sequelize.query(`
        SELECT o.id, o.date, o.duration_hours, o.status, o.created_at, e.name AS employee_name
        FROM overtime_requests o
        LEFT JOIN employees e ON o.employee_id = e.id
        WHERE o.status = 'pending' AND o.tenant_id = :tenantId
        ORDER BY o.created_at DESC LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(pendingOt as any[]).map((o) => ({
        id: o.id,
        type: 'overtime',
        title: `Lembur - ${o.employee_name || 'Karyawan'}`,
        subtitle: `${o.date} (${o.duration_hours || '-'} jam)`,
        status: 'pending',
        date: o.date,
        createdAt: o.created_at,
        href: '/humanify/payroll/lembur',
        color: 'blue',
      })));
    } catch { /* overtime_requests may not exist */ }

    try {
      const [pendingClaims] = await sequelize.query(`
        SELECT c.id, c.claim_type, c.amount, c.claim_date, c.status, c.created_at, e.name AS employee_name
        FROM employee_claims c
        LEFT JOIN employees e ON c.employee_id::text = e.id::text
        WHERE c.status = 'pending' AND c.tenant_id = :tenantId
        ORDER BY c.created_at DESC LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(pendingClaims as any[]).map((c) => ({
        id: c.id,
        type: 'claim',
        title: `Klaim ${c.claim_type || 'Biaya'} - ${c.employee_name || 'Karyawan'}`,
        subtitle: `${c.claim_date} · Rp ${Number(c.amount || 0).toLocaleString('id-ID')}`,
        status: 'pending',
        date: c.claim_date,
        createdAt: c.created_at,
        href: '/humanify/reimbursement',
        color: 'green',
      })));
    } catch { /* claims table may not exist */ }

    try {
      const [pendingTravel] = await sequelize.query(`
        SELECT tr.id, tr.destination, COALESCE(tr.departure_date, tr.start_date) AS departure_date,
               COALESCE(tr.return_date, tr.end_date) AS return_date,
               tr.estimated_budget, tr.status, tr.created_at,
               e.name AS employee_name
        FROM travel_requests tr
        LEFT JOIN employees e ON tr.employee_id::text = e.id::text
        WHERE tr.status = 'pending' AND tr.tenant_id = :tenantId
        ORDER BY tr.created_at DESC LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(pendingTravel as any[]).map((t) => ({
        id: t.id,
        type: 'travel',
        title: `Perjalanan Dinas - ${t.employee_name || 'Karyawan'}`,
        subtitle: `${t.destination || '-'} · ${t.departure_date || '-'} s/d ${t.return_date || '-'}`,
        status: 'pending',
        date: t.departure_date,
        createdAt: t.created_at,
        href: '/humanify/travel-expense',
        color: 'cyan',
      })));
    } catch { /* travel_requests may not exist */ }

    try {
      const [pendingMutations] = await sequelize.query(`
        SELECT m.id, m.mutation_type, m.effective_date, m.status, m.created_at, e.name AS employee_name
        FROM employee_mutations m
        LEFT JOIN employees e ON m.employee_id::text = e.id::text
        WHERE m.status = 'pending' AND m.tenant_id = :tenantId
        ORDER BY m.created_at DESC LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(pendingMutations as any[]).map((m) => ({
        id: m.id,
        type: 'mutation',
        title: `Mutasi ${m.mutation_type || ''} - ${m.employee_name || 'Karyawan'}`,
        subtitle: `Efektif ${m.effective_date || '-'}`,
        status: 'pending',
        date: m.effective_date,
        createdAt: m.created_at,
        href: '/humanify/mutations',
        color: 'purple',
      })));
    } catch { /* mutations table may not exist */ }

    // ── Action inbox extras: contracts / docs / attendance ──
    try {
      const [expiringContracts] = await sequelize.query(`
        SELECT ec.id, ec.end_date, ec.contract_type, e.name AS employee_name, e.id AS employee_id
        FROM employee_contracts ec
        LEFT JOIN employees e ON ec.employee_id::text = e.id::text
        WHERE ec.tenant_id = :tenantId
          AND LOWER(COALESCE(ec.status, 'active')) IN ('active', 'expiring_soon')
          AND ec.end_date IS NOT NULL
          AND ec.end_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY ec.end_date ASC LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(expiringContracts as any[]).map((c) => ({
        id: `contract-${c.id}`,
        type: 'contract',
        title: `Kontrak segera berakhir - ${c.employee_name || 'Karyawan'}`,
        subtitle: `${c.contract_type || 'Kontrak'} · berakhir ${c.end_date}`,
        status: 'action',
        date: c.end_date,
        createdAt: c.end_date,
        href: '/humanify/contracts',
        color: 'orange',
        actionable: false,
      })));
    } catch { /* contracts may not exist */ }

    try {
      const [incompleteDocs] = await sequelize.query(`
        SELECT e.id, e.name,
          COUNT(ed.id) FILTER (WHERE UPPER(ed.document_type) IN ('KTP','NPWP','CONTRACT','KK'))::int AS have_core,
          COUNT(DISTINCT UPPER(ed.document_type)) FILTER (WHERE UPPER(ed.document_type) IN ('KTP','NPWP','CONTRACT','KK'))::int AS distinct_core
        FROM employees e
        LEFT JOIN employee_documents ed ON ed.employee_id = e.id AND ed.tenant_id = e.tenant_id AND COALESCE(ed.is_active, true) = true
        WHERE e.tenant_id = :tenantId AND COALESCE(e.is_active, true) = true
        GROUP BY e.id, e.name
        HAVING COUNT(DISTINCT UPPER(ed.document_type)) FILTER (WHERE UPPER(ed.document_type) IN ('KTP','NPWP','CONTRACT','KK')) < 3
        ORDER BY distinct_core ASC, e.name ASC
        LIMIT 5
      `, { replacements: r });
      pendingApprovals.push(...(incompleteDocs as any[]).map((e) => ({
        id: `docs-${e.id}`,
        type: 'documents',
        title: `Dokumen belum lengkap - ${e.name}`,
        subtitle: `${e.distinct_core || 0}/3 dokumen inti (KTP/NPWP/Kontrak)`,
        status: 'action',
        date: today,
        createdAt: new Date().toISOString(),
        href: `/humanify/employees?id=${e.id}`,
        color: 'amber',
        actionable: false,
      })));
    } catch { /* employee_documents may not exist */ }

    try {
      const [absentToday] = await sequelize.query(`
        SELECT e.id, e.name, ea.status
        FROM employees e
        LEFT JOIN employee_attendance ea ON ea.employee_id = e.id AND ea.date = :today AND ea.tenant_id = e.tenant_id
        LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.tenant_id = e.tenant_id
          AND lr.status = 'approved' AND :today::date BETWEEN lr.start_date AND lr.end_date
        WHERE e.tenant_id = :tenantId
          AND COALESCE(e.is_active, true) = true
          AND LOWER(COALESCE(e.status, 'active')) IN ('active', 'ACTIVE')
          AND lr.id IS NULL
          AND (ea.id IS NULL OR LOWER(COALESCE(ea.status, '')) IN ('absent', 'alpha', 'tidak_hadir'))
        ORDER BY e.name ASC
        LIMIT 5
      `, { replacements: { ...r, today } });
      pendingApprovals.push(...(absentToday as any[]).map((a) => ({
        id: `att-${a.id}`,
        type: 'attendance',
        title: `Belum absen hari ini - ${a.name}`,
        subtitle: a.status ? `Status: ${a.status}` : 'Belum ada clock-in',
        status: 'action',
        date: today,
        createdAt: new Date().toISOString(),
        href: '/humanify/attendance',
        color: 'red',
        actionable: false,
      })));
    } catch { /* attendance may not exist */ }

    pendingApprovals.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    const overdueCount = pendingApprovals.filter((p) => {
      const d = new Date(p.createdAt || p.date);
      return Date.now() - d.getTime() > 48 * 60 * 60 * 1000;
    }).length;

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
      AND lr.tenant_id = :tenantId
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

    // Filter snoozed inbox items
    let visibleApprovals = pendingApprovals;
    try {
      const { listActiveSnoozeKeys, inboxItemKey } = await import('@/lib/hris/action-inbox-snooze');
      const snoozed = await listActiveSnoozeKeys({ tenantId: String(tenantId), db: sequelize });
      if (snoozed.size) {
        visibleApprovals = pendingApprovals.filter(
          (p) => !snoozed.has(inboxItemKey(p.type || 'item', p.id)),
        );
      }
    } catch { /* snooze optional */ }

    let documentCompliance = null;
    try {
      const { getTenantDocumentComplianceSummary } = await import('@/lib/hris/document-compliance-summary');
      documentCompliance = await getTenantDocumentComplianceSummary(sequelize, String(tenantId));
    } catch { /* optional */ }

    return res.status(200).json({
      success: true,
      dataSource: resolveDataSource(stats.total > 0, false),
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
      pendingApprovals: visibleApprovals.slice(0, 16),
      pendingSummary: {
        total: visibleApprovals.length,
        overdue: overdueCount,
        byType: {
          leave: visibleApprovals.filter((p) => p.type === 'leave').length,
          overtime: visibleApprovals.filter((p) => p.type === 'overtime').length,
          claim: visibleApprovals.filter((p) => p.type === 'claim').length,
          travel: visibleApprovals.filter((p) => p.type === 'travel').length,
          mutation: visibleApprovals.filter((p) => p.type === 'mutation').length,
          contract: visibleApprovals.filter((p) => p.type === 'contract').length,
          documents: visibleApprovals.filter((p) => p.type === 'documents').length,
          attendance: visibleApprovals.filter((p) => p.type === 'attendance').length,
        },
      },
      documentCompliance,
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
