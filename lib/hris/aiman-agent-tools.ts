/**
 * AIMAN Agent Tools — assisted workflow (read free, write needs confirm).
 */
import { batchScreen, DEFAULT_SCREENING_CRITERIA } from './ai-screening';
import { executeRule, listRules, scanAllRules } from './hr-automation';
import {
  AIMAN_AGENT_TOOLS,
  type AgentToolName,
} from './aiman-agent-catalog';

export type { AgentToolKind, AgentToolName, AgentToolDef } from './aiman-agent-catalog';
export { AIMAN_AGENT_TOOLS };

let sequelize: any;
try {
  sequelize = require('../../lib/sequelize');
} catch {
  sequelize = null;
}

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

  if (!tenantId) {
    return { ok: false, summary: 'AIMAN membutuhkan tenant aktif.', error: 'NO_TENANT' };
  }

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
      case 'payroll_create_draft_run':
        return await toolPayrollCreateDraft(tenantId);
      case 'recruitment_screen_preview':
        return await toolRecruitmentPreview(tenantId);
      case 'list_hr_backlog':
        return await toolHrBacklog(tenantId);
      case 'leave_pending_detail':
        return await toolLeavePendingDetail(tenantId);
      case 'run_leave_escalation': {
        const { escalateStaleLeaveForTenant } = await import('./leave-escalation');
        const out = await escalateStaleLeaveForTenant(tenantId);
        return {
          ok: true,
          summary: out.escalated
            ? `Eskalasi cuti: ${out.escalated} pengajuan overtime SLA dinotifikasi (dari ${out.checked} kandidat).`
            : `Tidak ada cuti yang perlu dieskalasi (${out.checked} dicek).`,
          data: out as any,
        };
      }
      case 'contract_expiry_check':
        return await toolContractExpiry(tenantId);
      case 'onboarding_status':
        return await toolOnboardingStatus(tenantId);
      case 'ir_pending_sp_list':
        return await toolIrPendingList(tenantId);
      case 'ir_phase_reminder':
        return await toolIrPhaseReminder(tenantId);
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
     WHERE is_active = true AND tenant_id IS NOT DISTINCT FROM :tid`,
    { tid },
  );
  const noSalary = await safeQuery(
    `SELECT e.id, e.full_name, e.employee_code
     FROM employees e
     LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
     WHERE e.is_active = true
       AND e.tenant_id IS NOT DISTINCT FROM :tid
       AND es.id IS NULL
     ORDER BY e.full_name NULLS LAST
     LIMIT 15`,
    { tid },
  );
  const openRuns = await safeQuery(
    `SELECT id, period, status, created_at
     FROM payroll_runs
     WHERE status IN ('draft', 'calculated', 'pending_approval', 'approved')
       AND tenant_id IS NOT DISTINCT FROM :tid
     ORDER BY created_at DESC
     LIMIT 5`,
    { tid },
  );
  const late = await safeQuery(
    `SELECT COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int AS late_c,
            COUNT(*)::int AS total
     FROM employee_attendance
     WHERE TO_CHAR(date, 'YYYY-MM') = :period
       AND tenant_id IS NOT DISTINCT FROM :tid`,
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
       AND tenant_id IS NOT DISTINCT FROM :tid
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
      nextLinks: [
        { href: '/humanify/recruitment', label: 'Buka Rekrutmen' },
        { href: '/humanify/recruitment?tab=candidates', label: 'Daftar Kandidat' },
      ],
    },
  };
}

async function toolHrBacklog(tenantId: string | null): Promise<AgentToolResult> {
  const leave = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM leave_requests
     WHERE status = 'pending' AND tenant_id IS NOT DISTINCT FROM :tid`,
    { tid: tenantId },
  );
  const claims = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM employee_claims
     WHERE status = 'pending' AND tenant_id IS NOT DISTINCT FROM :tid`,
    { tid: tenantId },
  );
  const ot = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM overtime_requests
     WHERE status = 'pending' AND tenant_id IS NOT DISTINCT FROM :tid`,
    { tid: tenantId },
  );

  const leaveC = Number(leave[0]?.c || 0);
  const claimC = Number(claims[0]?.c || 0);
  const otC = Number(ot[0]?.c || 0);

  return {
    ok: true,
    summary: `Backlog HR: cuti pending ${leaveC}, klaim ${claimC}, lembur ${otC}.`,
    data: {
      leavePending: leaveC,
      claimsPending: claimC,
      overtimePending: otC,
      nextLinks: [
        { href: '/humanify/mss', label: 'Action Inbox MSS' },
        { href: '/humanify/leave', label: 'Manajemen Cuti' },
        { href: '/humanify/reimbursement', label: 'Klaim' },
        { href: '/humanify/payroll/lembur', label: 'Lembur' },
      ],
    },
  };
}

async function toolLeavePendingDetail(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT lr.id, lr.start_date::text, lr.end_date::text, lr.leave_type, lr.status,
            COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name, e.employee_code
     FROM leave_requests lr
     LEFT JOIN employees e ON e.id = lr.employee_id
     WHERE lr.status = 'pending'
       AND lr.tenant_id IS NOT DISTINCT FROM :tid
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
       AND c.tenant_id IS NOT DISTINCT FROM :tid
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
       AND tenant_id IS NOT DISTINCT FROM :tid
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

function monthBounds(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return {
    periodStart: fmt(start),
    periodEnd: fmt(end),
    label: `${y}-${String(m + 1).padStart(2, '0')}`,
  };
}

async function toolPayrollCreateDraft(tenantId: string | null): Promise<AgentToolResult> {
  if (!sequelize || !tenantId) {
    return { ok: false, summary: 'Database/tenant tidak tersedia', error: 'NO_DB' };
  }
  const { periodStart, periodEnd, label } = monthBounds();

  const existing = await safeQuery(
    `SELECT id, run_code, status FROM payroll_runs
     WHERE tenant_id = :tid
       AND period_start::date = :ps::date
       AND period_end::date = :pe::date
       AND status IN ('draft','calculated','pending_approval','approved')
     ORDER BY created_at DESC LIMIT 1`,
    { tid: tenantId, ps: periodStart, pe: periodEnd },
  );
  if (existing.length) {
    return {
      ok: true,
      summary: `Draft/run payroll ${label} sudah ada (${existing[0].run_code || existing[0].id}, status ${existing[0].status}). Tidak membuat duplikat.`,
      data: {
        created: false,
        existing: existing[0],
        period: label,
        nextLinks: [{ href: '/humanify/payroll/main', label: 'Proses Gaji' }],
      },
    };
  }

  const runCode = `PR-${label.replace('-', '')}-${Date.now().toString(36).toUpperCase()}`;
  try {
    const [result] = await sequelize.query(`
      INSERT INTO payroll_runs (id, tenant_id, run_code, name, period_start, period_end, pay_date,
        pay_type, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :runCode, :name, :periodStart, :periodEnd, :periodEnd,
        'monthly', 'draft', NOW(), NOW())
      RETURNING id, run_code, status, period_start, period_end
    `, {
      replacements: {
        tid: tenantId,
        runCode,
        name: `Payroll ${label} (AIMAN draft)`,
        periodStart,
        periodEnd,
      },
    });
    const row = result?.[0];
    return {
      ok: true,
      summary: `Draft payroll ${label} dibuat (${row?.run_code || runCode}). Hitung & approve tetap manual — bukan transfer bank.`,
      data: {
        created: true,
        run: row,
        period: label,
        nextLinks: [{ href: '/humanify/payroll/main', label: 'Proses Gaji' }],
      },
    };
  } catch (e: any) {
    return { ok: false, summary: e?.message || 'Gagal buat draft payroll', error: 'INSERT_FAIL' };
  }
}

async function toolIrPendingList(tenantId: string | null): Promise<AgentToolResult> {
  const rows = await safeQuery(
    `SELECT l.id, l.letter_type, l.status, l.current_phase, l.reference_number,
            COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name,
            l.created_at
     FROM hr_disciplinary_letters l
     LEFT JOIN employees e ON e.id::text = l.employee_id::text
     WHERE l.tenant_id IS NOT DISTINCT FROM :tid
       AND LOWER(COALESCE(l.status,'')) IN (
         'draft','submitted','investigating','drafting','review','pending_approval'
       )
     ORDER BY l.created_at ASC NULLS LAST
     LIMIT 15`,
    { tid: tenantId },
  );
  return {
    ok: true,
    summary: rows.length
      ? `${rows.length} surat disiplin/SP masih dalam pipeline.`
      : 'Tidak ada SP/IR pending di pipeline aktif.',
    data: {
      count: rows.length,
      items: rows.map((r: any) => ({
        id: r.id,
        type: r.letter_type,
        status: r.status,
        phase: r.current_phase,
        ref: r.reference_number,
        employee: r.employee_name,
      })),
      confirmTool: 'ir_phase_reminder' as AgentToolName,
      nextLinks: [
        { href: '/humanify/disciplinary-letters', label: 'Surat Disiplin' },
        { href: '/humanify/industrial-relations', label: 'Hubungan Industrial' },
      ],
    },
  };
}

async function toolIrPhaseReminder(tenantId: string | null): Promise<AgentToolResult> {
  if (!sequelize || !tenantId) {
    return { ok: false, summary: 'Database/tenant tidak tersedia', error: 'NO_DB' };
  }
  const rows = await safeQuery(
    `SELECT l.id, l.letter_type, l.status, l.current_phase, l.reference_number,
            COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name
     FROM hr_disciplinary_letters l
     LEFT JOIN employees e ON e.id::text = l.employee_id::text
     WHERE l.tenant_id = :tid
       AND LOWER(COALESCE(l.status,'')) IN (
         'submitted','investigating','drafting','review','pending_approval'
       )
     ORDER BY l.updated_at ASC NULLS LAST, l.created_at ASC NULLS LAST
     LIMIT 20`,
    { tid: tenantId },
  );
  if (!rows.length) {
    return {
      ok: true,
      summary: 'Tidak ada SP aktif yang perlu diingatkan.',
      data: { notified: 0, count: 0 },
    };
  }

  const { notifyHRStaff } = await import('./disciplinary-notifications');
  await notifyHRStaff(sequelize, tenantId, {
    tenantId,
    title: `Reminder IR: ${rows.length} SP menunggu tindak lanjut`,
    message:
      `Ada ${rows.length} surat disiplin di pipeline aktif. ` +
      `Contoh: ${rows.slice(0, 3).map((r: any) => `${r.employee_name} (${r.letter_type}/${r.status})`).join('; ')}. ` +
      `Buka modul Surat Disiplin untuk menindaklanjuti.`,
    type: 'warning',
    sourceType: 'aiman_ir_reminder',
    sourceId: rows[0]?.id || null,
  });

  return {
    ok: true,
    summary: `Reminder dikirim ke HR untuk ${rows.length} SP/IR pending.`,
    data: {
      notified: rows.length,
      sample: rows.slice(0, 5).map((r: any) => ({
        id: r.id,
        employee: r.employee_name,
        type: r.letter_type,
        status: r.status,
        phase: r.current_phase,
      })),
      nextLinks: [{ href: '/humanify/disciplinary-letters', label: 'Surat Disiplin' }],
    },
  };
}
