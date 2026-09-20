import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { resolveDataSource } from '@/lib/hris/data-source';
import { emptyMonthPresence, queryMonthPresenceMix } from '@/lib/hris/month-presence';

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
      workforceTrend: [],
      topPerformersList: [],
      newHiresThisMonth: [],
      resignationsThisMonth: [],
      disciplinarySpList: [],
      pendingApprovals: [],
      pendingSummary: { total: 0, overdue: 0, byType: { leave: 0, overtime: 0, claim: 0, travel: 0, mutation: 0 } },
      recentActivities: [],
      upcoming: [],
      period: new Date().toISOString().substring(0, 7),
      monthPresence: emptyMonthPresence(),
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

    // Department breakdown — headcount by status + KPI + kehadiran hari ini
    let deptRows: any[] = [];
    try {
      const [rows] = await sequelize.query(`
        SELECT
          COALESCE(NULLIF(TRIM(e.department), ''), 'Other') AS department,
          COUNT(DISTINCT e.id)::int AS total,
          COUNT(DISTINCT e.id) FILTER (
            WHERE COALESCE(e.is_active, true) = true
              AND UPPER(COALESCE(e.status, 'ACTIVE')) IN ('ACTIVE', 'AKTIF')
          )::int AS active,
          COUNT(DISTINCT e.id) FILTER (
            WHERE UPPER(COALESCE(e.status, '')) IN ('ON_LEAVE', 'LEAVE', 'CUTI')
          )::int AS on_leave,
          COUNT(DISTINCT e.id) FILTER (
            WHERE UPPER(COALESCE(e.status, '')) IN ('INACTIVE', 'TERMINATED', 'RESIGNED', 'EXITED', 'OFFBOARDED')
              OR e.is_active = false
          )::int AS inactive,
          COALESCE(ROUND(AVG(
            CASE WHEN k.target > 0 THEN LEAST(150, (k.actual / NULLIF(k.target, 0)) * 100) END
          )), 0)::int AS perf,
          COALESCE(ROUND(
            100.0 * COUNT(DISTINCT ea.employee_id) FILTER (WHERE ea.status IN ('present', 'late'))
            / NULLIF(
              COUNT(DISTINCT e.id) FILTER (
                WHERE COALESCE(e.is_active, true) = true
                  AND UPPER(COALESCE(e.status, 'ACTIVE')) IN ('ACTIVE', 'AKTIF', 'ON_LEAVE', 'LEAVE', 'CUTI')
              ),
              0
            )
          ), 0)::int AS attend
        FROM employees e
        LEFT JOIN employee_kpis k
          ON k.employee_id = e.id AND k.period = :period AND k.tenant_id = e.tenant_id
        LEFT JOIN employee_attendance ea
          ON ea.employee_id = e.id AND ea.date = :today AND ea.tenant_id = e.tenant_id
        WHERE e.tenant_id = :tenantId
        GROUP BY COALESCE(NULLIF(TRIM(e.department), ''), 'Other')
        ORDER BY total DESC
        LIMIT 8
      `, { replacements: { ...r, period, today } });
      deptRows = rows || [];
    } catch {
      const [rows] = await sequelize.query(`
        SELECT COALESCE(NULLIF(TRIM(department), ''), 'Other') AS department,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(is_active, true) = true)::int AS active,
          0::int AS on_leave,
          COUNT(*) FILTER (WHERE COALESCE(is_active, true) = false)::int AS inactive
        FROM employees e WHERE 1=1 ${etf}
        GROUP BY COALESCE(NULLIF(TRIM(department), ''), 'Other')
        ORDER BY total DESC LIMIT 8
      `, { replacements: r });
      deptRows = rows || [];
    }
    const colors = ['blue', 'green', 'yellow', 'purple', 'indigo', 'cyan', 'orange', 'pink'];
    const deptStats = deptRows.map((d: any, i: number) => ({
      department: d.department,
      total: Number(d.total || 0),
      active: Number(d.active || 0),
      onLeave: Number(d.on_leave || 0),
      inactive: Number(d.inactive || 0),
      perf: Number(d.perf || 0) || avgPerf || 0,
      attend: Number(d.attend || 0) || attendanceToday || 0,
      color: colors[i % colors.length],
    }));

    // Weekly attendance trend + monthly KPI history (mapped onto weeks)
    let workforceTrend: Array<{ week: string; Kehadiran: number; Kinerja: number }> = [];
    try {
      const [trendRows] = await sequelize.query(`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', CURRENT_DATE::timestamp) - INTERVAL '7 weeks',
            date_trunc('week', CURRENT_DATE::timestamp),
            INTERVAL '1 week'
          )::date AS week_start
        ),
        att AS (
          SELECT
            date_trunc('week', ea.date::timestamp)::date AS week_start,
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE ea.status IN ('present', 'late'))
              / NULLIF(COUNT(*), 0)
            )::int AS attend_pct
          FROM employee_attendance ea
          WHERE ea.tenant_id = :tenantId
            AND ea.date >= (CURRENT_DATE - INTERVAL '56 days')
          GROUP BY 1
        )
        SELECT
          to_char(w.week_start, 'DD Mon') AS week_label,
          to_char(w.week_start, 'YYYY-MM') AS month_key,
          COALESCE(a.attend_pct, 0)::int AS attend_pct
        FROM weeks w
        LEFT JOIN att a ON a.week_start = w.week_start
        ORDER BY w.week_start ASC
      `, { replacements: r });

      let kpiByMonth: Record<string, number> = {};
      try {
        const [kpiHist] = await sequelize.query(`
          SELECT period,
            ROUND(AVG(CASE WHEN target > 0 THEN LEAST(150, (actual / NULLIF(target, 0)) * 100) END))::int AS kpi_score
          FROM employee_kpis
          WHERE tenant_id = :tenantId AND target > 0
          GROUP BY period
          ORDER BY period DESC
          LIMIT 12
        `, { replacements: r });
        for (const row of kpiHist || []) {
          const key = String(row.period || '').slice(0, 7);
          if (key) kpiByMonth[key] = Number(row.kpi_score || 0);
        }
      } catch { /* optional */ }

      const fallbackKpi = avgKpi || avgPerf || 0;
      workforceTrend = (trendRows || []).map((row: any) => ({
        week: row.week_label,
        Kehadiran: Number(row.attend_pct || 0),
        Kinerja: kpiByMonth[String(row.month_key)] ?? fallbackKpi,
      }));
    } catch {
      workforceTrend = [];
    }

    // Top performers by KPI achievement (current period)
    let topPerformersList: any[] = [];
    try {
      const [topRows] = await sequelize.query(`
        SELECT
          e.id,
          e.name,
          e.employee_code,
          e.department,
          e.position,
          e.photo_url,
          ROUND(AVG(CASE WHEN k.target > 0 THEN LEAST(150, (k.actual / NULLIF(k.target, 0)) * 100) END))::int AS kpi_score,
          COUNT(k.id)::int AS kpi_count
        FROM employee_kpis k
        INNER JOIN employees e ON e.id = k.employee_id AND e.tenant_id = k.tenant_id
        WHERE k.tenant_id = :tenantId AND k.period = :period AND k.target > 0
        GROUP BY e.id, e.name, e.employee_code, e.department, e.position, e.photo_url
        ORDER BY kpi_score DESC NULLS LAST, e.name ASC
        LIMIT 50
      `, { replacements: { ...r, period } });
      topPerformersList = (topRows || []).map((row: any, i: number) => ({
        rank: i + 1,
        id: row.id,
        name: row.name,
        employeeCode: row.employee_code,
        department: row.department || '—',
        position: row.position || '—',
        photoUrl: row.photo_url || null,
        kpiScore: Number(row.kpi_score || 0),
        kpiCount: Number(row.kpi_count || 0),
      }));
    } catch {
      topPerformersList = [];
    }

    // Workforce movement lists (current calendar month, Asia/Jakarta)
    let newHiresThisMonth: any[] = [];
    try {
      const [hireRows] = await sequelize.query(`
        SELECT
          e.id,
          e.name,
          e.employee_code,
          e.department,
          e.position,
          e.photo_url,
          e.hire_date::text AS event_date
        FROM employees e
        WHERE e.tenant_id = :tenantId
          AND e.hire_date IS NOT NULL
          AND e.hire_date >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))::date
          AND e.hire_date < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')::date
        ORDER BY e.hire_date DESC NULLS LAST, e.name ASC
        LIMIT 50
      `, { replacements: r });
      newHiresThisMonth = (hireRows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        employeeCode: row.employee_code,
        department: row.department || '—',
        position: row.position || '—',
        photoUrl: row.photo_url || null,
        eventDate: row.event_date ? String(row.event_date).slice(0, 10) : null,
      }));
    } catch {
      newHiresThisMonth = [];
    }

    let resignationsThisMonth: any[] = [];
    try {
      const [resignRows] = await sequelize.query(`
        SELECT * FROM (
          SELECT
            COALESCE(e.id::text, ob.employee_uid) AS id,
            COALESCE(e.name, ob.employee_name) AS name,
            COALESCE(e.employee_code, ob.employee_uid) AS employee_code,
            COALESCE(e.department, ob.department_label, '—') AS department,
            COALESCE(e.position, '—') AS position,
            e.photo_url,
            COALESCE(ob.last_working_date, ob.resign_date)::text AS event_date,
            COALESCE(ob.reason, e.status, 'resign') AS detail
          FROM employee_offboarding_processes ob
          LEFT JOIN employees e
            ON (e.id::text = ob.employee_uid OR e.employee_code = ob.employee_uid)
            AND e.tenant_id = :tenantId
          WHERE ob.tenant_id = :tenantId
            AND COALESCE(ob.last_working_date, ob.resign_date) IS NOT NULL
            AND COALESCE(ob.last_working_date, ob.resign_date)
              >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))::date
            AND COALESCE(ob.last_working_date, ob.resign_date)
              < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')::date

          UNION ALL

          SELECT
            e.id::text AS id,
            e.name,
            e.employee_code,
            COALESCE(e.department, '—') AS department,
            COALESCE(e.position, '—') AS position,
            e.photo_url,
            COALESCE(e.updated_at::date, e.hire_date)::text AS event_date,
            COALESCE(e.status, 'resigned') AS detail
          FROM employees e
          WHERE e.tenant_id = :tenantId
            AND (
              LOWER(COALESCE(e.status, '')) IN ('resigned', 'terminated', 'exited', 'offboarded')
              OR e.is_active = false
            )
            AND e.updated_at >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))
            AND e.updated_at < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')
            AND NOT EXISTS (
              SELECT 1 FROM employee_offboarding_processes ob2
              WHERE ob2.tenant_id = :tenantId
                AND (ob2.employee_uid = e.id::text OR ob2.employee_uid = e.employee_code)
            )
        ) x
        ORDER BY event_date DESC NULLS LAST, name ASC
        LIMIT 50
      `, { replacements: r });
      resignationsThisMonth = (resignRows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        employeeCode: row.employee_code,
        department: row.department || '—',
        position: row.position || '—',
        photoUrl: row.photo_url || null,
        eventDate: row.event_date ? String(row.event_date).slice(0, 10) : null,
        detail: row.detail || null,
      }));
    } catch {
      try {
        const [fallbackResign] = await sequelize.query(`
          SELECT
            e.id,
            e.name,
            e.employee_code,
            e.department,
            e.position,
            e.photo_url,
            e.updated_at::date::text AS event_date,
            e.status AS detail
          FROM employees e
          WHERE e.tenant_id = :tenantId
            AND (
              LOWER(COALESCE(e.status, '')) IN ('resigned', 'terminated', 'exited', 'offboarded')
              OR e.is_active = false
            )
            AND e.updated_at >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))
            AND e.updated_at < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')
          ORDER BY e.updated_at DESC NULLS LAST
          LIMIT 50
        `, { replacements: r });
        resignationsThisMonth = (fallbackResign || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          employeeCode: row.employee_code,
          department: row.department || '—',
          position: row.position || '—',
          photoUrl: row.photo_url || null,
          eventDate: row.event_date ? String(row.event_date).slice(0, 10) : null,
          detail: row.detail || null,
        }));
      } catch {
        resignationsThisMonth = [];
      }
    }

    let disciplinarySpList: any[] = [];
    try {
      const [spRows] = await sequelize.query(`
        SELECT
          dl.id,
          e.id AS employee_id,
          e.name,
          e.employee_code,
          e.department,
          e.position,
          e.photo_url,
          dl.letter_type AS warning_type,
          COALESCE(dl.letter_number, dl.reference_number) AS letter_number,
          COALESCE(dl.effective_date, dl.created_at::date)::text AS event_date,
          dl.status
        FROM hr_disciplinary_letters dl
        LEFT JOIN employees e ON dl.employee_id::text = e.id::text AND e.tenant_id = :tenantId
        WHERE dl.tenant_id = :tenantId
          AND dl.letter_type IN ('SP1', 'SP2', 'SP3')
          AND dl.status IN ('issued', 'acknowledged', 'active')
        ORDER BY COALESCE(dl.effective_date, dl.created_at) DESC NULLS LAST
        LIMIT 50
      `, { replacements: r });
      disciplinarySpList = (spRows || []).map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        name: row.name || 'Karyawan',
        employeeCode: row.employee_code,
        department: row.department || '—',
        position: row.position || '—',
        photoUrl: row.photo_url || null,
        warningType: row.warning_type || 'SP',
        letterNumber: row.letter_number || null,
        eventDate: row.event_date ? String(row.event_date).slice(0, 10) : null,
        status: row.status || null,
      }));
    } catch {
      try {
        const [spFallback] = await sequelize.query(`
          SELECT
            w.id,
            e.id AS employee_id,
            e.name,
            e.employee_code,
            e.department,
            e.position,
            e.photo_url,
            w.warning_type,
            w.letter_number,
            COALESCE(w.issue_date, w.created_at::date)::text AS event_date,
            w.status
          FROM warning_letters w
          LEFT JOIN employees e ON e.id = w.employee_id AND e.tenant_id = :tenantId
          WHERE w.tenant_id = :tenantId
            AND (
              w.status IN ('active', 'issued', 'acknowledged')
              OR (w.status IS NULL AND (w.expiry_date IS NULL OR w.expiry_date >= CURRENT_DATE))
            )
          ORDER BY COALESCE(w.issue_date, w.created_at) DESC NULLS LAST
          LIMIT 50
        `, { replacements: r });
        disciplinarySpList = (spFallback || []).map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id,
          name: row.name || 'Karyawan',
          employeeCode: row.employee_code,
          department: row.department || '—',
          position: row.position || '—',
          photoUrl: row.photo_url || null,
          warningType: row.warning_type || 'SP',
          letterNumber: row.letter_number || null,
          eventDate: row.event_date ? String(row.event_date).slice(0, 10) : null,
          status: row.status || null,
        }));
      } catch {
        disciplinarySpList = [];
      }
    }

    // Pending approvals — unified inbox
    const pendingApprovals: any[] = [];

    const [pendingLeave] = await sequelize.query(`
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.status, lr.created_at,
             e.name AS employee_name, e.photo_url
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
      employee_name: l.employee_name,
      photo_url: l.photo_url || null,
    })));

    try {
      const [pendingOt] = await sequelize.query(`
        SELECT o.id, o.date, o.duration_hours, o.status, o.created_at, e.name AS employee_name, e.photo_url
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
        employee_name: o.employee_name,
        photo_url: o.photo_url || null,
      })));
    } catch { /* overtime_requests may not exist */ }

    try {
      const [pendingClaims] = await sequelize.query(`
        SELECT c.id, c.claim_type, c.amount, c.claim_date, c.status, c.created_at, e.name AS employee_name, e.photo_url
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
        employee_name: c.employee_name,
        photo_url: c.photo_url || null,
      })));
    } catch { /* claims table may not exist */ }

    try {
      const [pendingKasbon] = await sequelize.query(`
        SELECT id, employee_name, amount, reason, category, created_at
        FROM hris_payroll_inputs
        WHERE tenant_id = :tenantId AND type = 'cash_advance' AND status = 'pending'
        ORDER BY created_at ASC LIMIT 8
      `, { replacements: r });
      pendingApprovals.push(...(pendingKasbon as any[]).map((k) => ({
        id: k.id,
        type: 'kasbon',
        title: `Kasbon - ${k.employee_name || 'Karyawan'}`,
        subtitle: `${k.category || 'kasbon'} · Rp ${Number(k.amount || 0).toLocaleString('id-ID')}${k.reason ? ` · ${String(k.reason).slice(0, 60)}` : ''}`,
        status: 'pending',
        date: k.created_at,
        createdAt: k.created_at,
        href: '/humanify/payroll/cash-advance',
        color: 'amber',
        employee_name: k.employee_name,
        photo_url: null,
      })));
    } catch { /* hris_payroll_inputs optional */ }

    try {
      const [pendingTravel] = await sequelize.query(`
        SELECT tr.id, tr.destination, COALESCE(tr.departure_date, tr.start_date) AS departure_date,
               COALESCE(tr.return_date, tr.end_date) AS return_date,
               tr.estimated_budget, tr.status, tr.created_at,
               e.name AS employee_name, e.photo_url
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
        employee_name: t.employee_name,
        photo_url: t.photo_url || null,
      })));
    } catch { /* travel_requests may not exist */ }

    try {
      const [pendingMutations] = await sequelize.query(`
        SELECT m.id, m.mutation_type, m.effective_date, m.status, m.created_at, e.name AS employee_name, e.photo_url
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
        employee_name: m.employee_name,
        photo_url: m.photo_url || null,
      })));
    } catch { /* mutations table may not exist */ }

    // ── Action inbox extras: contracts / docs / attendance ──
    try {
      const [expiringContracts] = await sequelize.query(`
        SELECT ec.id, ec.end_date, ec.contract_type, e.name AS employee_name, e.photo_url, e.id AS employee_id
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
        employee_name: c.employee_name,
        photo_url: c.photo_url || null,
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

    const upcoming: Array<{ id: string; title: string; date: string; color: string }> = [
      ...upcomingLeave.map((u: any) => ({
        id: u.id,
        title: `Cuti ${u.employee_name}`,
        date: u.date,
        color: 'yellow',
      })),
    ];

    // Only show payroll reminder when tenant has active employees (avoid fake agenda on Day-1)
    if (stats.active > 0) {
      upcoming.push({
        id: 'payroll',
        title: 'Proses Payroll Bulanan',
        date: payrollDay.toISOString().split('T')[0],
        color: 'blue',
      });
    }

    const upcomingLimited = upcoming.slice(0, 6);

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

    let monthPresence = emptyMonthPresence();
    try {
      monthPresence = await queryMonthPresenceMix(sequelize, String(tenantId));
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
      workforceTrend,
      topPerformersList,
      newHiresThisMonth,
      resignationsThisMonth,
      disciplinarySpList,
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
      monthPresence,
      recentActivities: activities,
      upcoming: upcomingLimited,
      period,
    });
  } catch (e: any) {
    console.warn('HRIS dashboard error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });
