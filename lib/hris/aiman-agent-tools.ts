/**
 * AIMAN Agent Tools — assisted workflow (read free, write needs confirm).
 */
import { batchScreen, DEFAULT_SCREENING_CRITERIA } from './ai-screening';
import { executeRule, listRules, scanAllRules } from './hr-automation';

let sequelize: any;
try {
  sequelize = require('../../lib/sequelize');
} catch {
  sequelize = null;
}

export type AgentToolKind = 'read' | 'write';

export type AgentToolName =
  | 'payroll_prep_checklist'
  | 'recruitment_screen_preview'
  | 'list_hr_backlog'
  | 'leave_pending_detail'
  | 'contract_expiry_check'
  | 'onboarding_status'
  | 'run_automation_scan'
  | 'execute_recruitment_screening'
  | 'execute_contract_expiry_alert'
  | 'execute_leave_backlog_alert';

export type AgentToolDef = {
  name: AgentToolName;
  kind: AgentToolKind;
  label: string;
  description: string;
};

export const AIMAN_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'payroll_prep_checklist',
    kind: 'read',
    label: 'Checklist persiapan payroll',
    description: 'Cek karyawan tanpa gaji, run payroll terbuka, dan sinyal absensi.',
  },
  {
    name: 'recruitment_screen_preview',
    kind: 'read',
    label: 'Pratinjau screening kandidat',
    description: 'Hitung skor kandidat applied tanpa mengubah stage.',
  },
  {
    name: 'list_hr_backlog',
    kind: 'read',
    label: 'Backlog HR',
    description: 'Ringkas cuti, klaim, dan lembur pending.',
  },
  {
    name: 'leave_pending_detail',
    kind: 'read',
    label: 'Detail cuti pending',
    description: 'Daftar singkat pengajuan cuti yang menunggu approval.',
  },
  {
    name: 'contract_expiry_check',
    kind: 'read',
    label: 'Cek kontrak hampir habis',
    description: 'Kontrak aktif yang berakhir dalam 30 hari.',
  },
  {
    name: 'onboarding_status',
    kind: 'read',
    label: 'Status onboarding',
    description: 'Proses onboarding karyawan baru yang masih berjalan.',
  },
  {
    name: 'run_automation_scan',
    kind: 'write',
    label: 'Jalankan scan otomasi',
    description: 'Scan semua aturan otomasi aktif (bisa memicu aksi).',
  },
  {
    name: 'execute_recruitment_screening',
    kind: 'write',
    label: 'Advance kandidat lolos screening',
    description: 'Naikkan stage kandidat skor tinggi (applied → screening).',
  },
  {
    name: 'execute_contract_expiry_alert',
    kind: 'write',
    label: 'Jalankan alert kontrak',
    description: 'Evaluasi & catat alert kontrak hampir habis.',
  },
  {
    name: 'execute_leave_backlog_alert',
    kind: 'write',
    label: 'Jalankan alert backlog cuti',
    description: 'Evaluasi & catat alert jika cuti pending menumpuk.',
  },
];

export type AgentToolResult = {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
};

function periodMonth() {
  return new Date().toISOString().substring(0, 7);
}

async function safeQuery(sql: string, replacements: Record<string, unknown> = {}) {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch {
    return [];
  }
}

export async function executeAgentTool(
  name: AgentToolName,
  tenantId: string | null,
  opts?: { confirm?: boolean },
): Promise<AgentToolResult> {
  const def = AIMAN_AGENT_TOOLS.find((t) => t.name === name);
  if (!def) return { ok: false, summary: 'Tool tidak dikenal', error: 'UNKNOWN_TOOL' };

  if (def.kind === 'write' && !opts?.confirm) {
    return {
      ok: false,
      summary: `Aksi "${def.label}" membutuhkan konfirmasi HR.`,
      error: 'CONFIRM_REQUIRED',
      data: { tool: name, label: def.label, kind: 'write' },
    };
  }

  try {
    switch (name) {
      case 'payroll_prep_checklist':
        return await toolPayrollPrep(tenantId);
      case 'recruitment_screen_preview':
        return await toolRecruitmentPreview(tenantId);
      case 'list_hr_backlog':
        return await toolHrBacklog(tenantId);
      case 'leave_pending_detail':
        return await toolLeavePendingDetail(tenantId);
      case 'contract_expiry_check':
        return await toolContractExpiry(tenantId);
      case 'onboarding_status':
        return await toolOnboardingStatus(tenantId);
      case 'run_automation_scan': {
        const result = await scanAllRules(tenantId);
        return {
          ok: true,
          summary: `Scan otomasi selesai: ${result?.scanned ?? 0} aturan diproses, ${result?.triggered ?? 0} terpicu.`,
          data: result as any,
        };
      }
      case 'execute_recruitment_screening':
        return await runRuleByType(tenantId, 'recruitment_screening', 'Screening kandidat dijalankan.');
      case 'execute_contract_expiry_alert':
        return await runRuleByType(tenantId, 'contract_expiry_alert', 'Alert kontrak dievaluasi.');
      case 'execute_leave_backlog_alert':
        return await runRuleByType(tenantId, 'leave_backlog_alert', 'Alert backlog cuti dievaluasi.');
      default:
        return { ok: false, summary: 'Tool belum diimplementasi', error: 'NOT_IMPLEMENTED' };
    }
  } catch (e: any) {
    return { ok: false, summary: e?.message || 'Gagal menjalankan tool', error: 'EXEC_ERROR' };
  }
}

async function runRuleByType(
  tenantId: string | null,
  ruleType: string,
  okSummary: string,
): Promise<AgentToolResult> {
  const rules = await listRules(tenantId);
  const rule = rules.find((r) => r.rule_type === ruleType && r.is_active)
    || rules.find((r) => r.rule_type === ruleType);
  if (!rule) {
    return { ok: false, summary: `Aturan ${ruleType} tidak ditemukan.`, error: 'NO_RULE' };
  }
  const result = await executeRule(rule.id, tenantId);
  return { ok: true, summary: okSummary, data: result as any };
}

async function toolPayrollPrep(tenantId: string | null): Promise<AgentToolResult> {
  const period = periodMonth();
  const tid = tenantId;

  const activeEmp = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM employees
     WHERE is_active = true AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)`,
    { tid },
  );
  const noSalary = await safeQuery(
    `SELECT e.id, e.full_name, e.employee_code
     FROM employees e
     LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
     WHERE e.is_active = true
       AND (e.tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)
       AND es.id IS NULL
     ORDER BY e.full_name NULLS LAST
     LIMIT 15`,
    { tid },
  );
  const openRuns = await safeQuery(
    `SELECT id, period, status, created_at
     FROM payroll_runs
     WHERE status IN ('draft', 'calculated', 'pending_approval', 'approved')
       AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)
     ORDER BY created_at DESC
     LIMIT 5`,
    { tid },
  );
  const late = await safeQuery(
    `SELECT COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int AS late_c,
            COUNT(*)::int AS total
     FROM employee_attendance
     WHERE TO_CHAR(date, 'YYYY-MM') = :period
       AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)`,
    { period, tid },
  );

  const activeCount = Number(activeEmp[0]?.c || 0);
  const missingSalary = noSalary.length;
  const lateRate = late[0]?.total
    ? Math.round((Number(late[0].late_c || 0) / Number(late[0].total)) * 1000) / 10
    : 0;

  const blockers: string[] = [];
  if (missingSalary > 0) blockers.push(`${missingSalary} karyawan aktif belum punya komponen gaji`);
  if (openRuns.length > 0) blockers.push(`${openRuns.length} payroll run masih terbuka`);
  if (lateRate > 15) blockers.push(`Tingkat keterlambatan ${lateRate}% bulan ${period}`);

  const summary = blockers.length
    ? `Persiapan payroll ${period}: ${activeCount} karyawan aktif. Perhatian: ${blockers.join('; ')}.`
    : `Persiapan payroll ${period}: ${activeCount} karyawan aktif. Belum ada blocker kritis.`;

  return {
    ok: true,
    summary,
    data: {
      period,
      activeEmployees: activeCount,
      missingSalaryCount: missingSalary,
      missingSalarySample: noSalary.map((r: any) => ({
        id: r.id,
        name: r.full_name,
        code: r.employee_code,
      })),
      openRuns: openRuns.map((r: any) => ({
        id: r.id,
        period: r.period,
        status: r.status,
      })),
      lateRate,
      blockers,
      ready: blockers.length === 0,
      nextLinks: [
        { href: '/humanify/payroll/main', label: 'Proses Gaji' },
        { href: '/humanify/employees', label: 'Database Karyawan' },
        { href: '/humanify/attendance/daily', label: 'Rekap Absensi' },
      ],
    },
  };
}

async function toolRecruitmentPreview(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT id, COALESCE(full_name, name) AS name, experience_summary, education_level,
            source, rating, notes, current_stage
     FROM hris_candidates
     WHERE current_stage = 'applied'
       AND (tenant_id IS NOT DISTINCT FROM :tid OR tenant_id IS NULL OR :tid IS NULL)
     ORDER BY created_at DESC
     LIMIT 50`,
    { tid: tenantId },
  );

  const parseExpYears = (summary: string | null) => {
    if (!summary) return 0;
    const m = summary.match(/(\d+)\s*(tahun|thn|year)/i);
    return m ? parseInt(m[1], 10) : 0;
  };

  const candidates = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    experienceYears: parseExpYears(r.experience_summary),
    education: r.education_level || '',
    source: r.source,
    rating: r.rating,
    skills: [] as string[],
    resumeText: r.notes || r.experience_summary || '',
  }));

  const results = batchScreen(candidates, DEFAULT_SCREENING_CRITERIA);
  const wouldAdvance = results.filter((r) => r.overallScore >= 70 && r.flags.length === 0);
  const top = results
    .slice()
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 8)
    .map((r) => ({
      id: r.candidateId,
      name: r.candidateName,
      score: r.overallScore,
      flags: r.flags,
      wouldAdvance: r.overallScore >= 70 && r.flags.length === 0,
    }));

  return {
    ok: true,
    summary: `Pratinjau screening: ${rows.length} kandidat applied; ${wouldAdvance.length} lolos ambang skor ≥70 tanpa flag.`,
    data: {
      appliedCount: rows.length,
      wouldAdvanceCount: wouldAdvance.length,
      top,
      confirmTool: 'execute_recruitment_screening' as AgentToolName,
    },
  };
}

async function toolHrBacklog(tenantId: string | null): Promise<AgentToolResult> {
  const leave = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM leave_requests
     WHERE status = 'pending' AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)`,
    { tid: tenantId },
  );
  const claims = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM employee_claims
     WHERE status = 'pending' AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)`,
    { tid: tenantId },
  );
  const ot = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM overtime_requests
     WHERE status = 'pending' AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)`,
    { tid: tenantId },
  );

  const leaveC = Number(leave[0]?.c || 0);
  const claimC = Number(claims[0]?.c || 0);
  const otC = Number(ot[0]?.c || 0);

  return {
    ok: true,
    summary: `Backlog HR: cuti pending ${leaveC}, klaim ${claimC}, lembur ${otC}.`,
    data: { leavePending: leaveC, claimsPending: claimC, overtimePending: otC },
  };
}

async function toolLeavePendingDetail(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT lr.id, lr.start_date::text, lr.end_date::text, lr.leave_type, lr.status,
            COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name, e.employee_code
     FROM leave_requests lr
     LEFT JOIN employees e ON e.id = lr.employee_id
     WHERE lr.status = 'pending'
       AND (lr.tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)
     ORDER BY lr.created_at ASC NULLS LAST
     LIMIT 12`,
    { tid: tenantId },
  );
  return {
    ok: true,
    summary: rows.length
      ? `${rows.length} pengajuan cuti pending (menampilkan hingga 12).`
      : 'Tidak ada cuti pending.',
    data: {
      count: rows.length,
      items: rows.map((r: any) => ({
        id: r.id,
        employee: r.employee_name,
        code: r.employee_code,
        type: r.leave_type,
        start: r.start_date,
        end: r.end_date,
      })),
      nextLinks: [{ href: '/humanify/leave', label: 'Manajemen Cuti' }],
    },
  };
}

async function toolContractExpiry(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT c.id, c.end_date::text, c.status,
            COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name, e.employee_code
     FROM employee_contracts c
     LEFT JOIN employees e ON e.id = c.employee_id
     WHERE c.status = 'active'
       AND c.end_date IS NOT NULL
       AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       AND (c.tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)
     ORDER BY c.end_date ASC
     LIMIT 15`,
    { tid: tenantId },
  );
  return {
    ok: true,
    summary: rows.length
      ? `${rows.length} kontrak berakhir dalam 30 hari.`
      : 'Tidak ada kontrak yang berakhir dalam 30 hari.',
    data: {
      count: rows.length,
      items: rows.map((r: any) => ({
        id: r.id,
        employee: r.employee_name,
        code: r.employee_code,
        endDate: r.end_date,
      })),
      confirmTool: 'execute_contract_expiry_alert' as AgentToolName,
      nextLinks: [{ href: '/humanify/contracts', label: 'Kontrak & Reminder' }],
    },
  };
}

async function toolOnboardingStatus(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT id, employee_name, employee_uid, position, department, status, join_date::text, tasks
     FROM employee_onboarding_processes
     WHERE status IN ('in_progress','pending','active')
       AND (tenant_id IS NOT DISTINCT FROM :tid OR :tid IS NULL)
     ORDER BY join_date DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 10`,
    { tid: tenantId },
  );
  const items = rows.map((r: any) => {
    let progress: number | undefined;
    try {
      const tasks = typeof r.tasks === 'string' ? JSON.parse(r.tasks) : (r.tasks || []);
      if (Array.isArray(tasks) && tasks.length) {
        const done = tasks.filter((t: any) => t.done || t.completed || t.status === 'done').length;
        progress = Math.round((done / tasks.length) * 100);
      }
    } catch { /* ignore */ }
    return {
      id: r.id,
      employee: r.employee_name,
      code: r.employee_uid,
      position: r.position,
      department: r.department,
      status: r.status,
      joinDate: r.join_date,
      progress,
    };
  });
  return {
    ok: true,
    summary: items.length
      ? `${items.length} proses onboarding masih berjalan.`
      : 'Tidak ada onboarding aktif.',
    data: {
      activeCount: items.length,
      items,
      nextLinks: [{ href: '/humanify/onboarding', label: 'Onboarding' }],
    },
  };
}
