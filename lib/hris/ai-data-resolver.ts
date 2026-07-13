/**
 * AIMAN data resolver — query Humanify HRIS live data from natural language
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export interface AimanEmployeeSnapshot {
  id: number | string;
  employee_code: string;
  name: string;
  position?: string;
  department?: string;
  status?: string;
  hire_date?: string;
  email?: string;
}

export interface AimanDataContext {
  period: string;
  intents: string[];
  identifiers: { employee_code?: string; nik?: string; metric_name?: string; name_hint?: string };
  workforce?: {
    total_active: number;
    total_all: number;
    by_department?: { department: string; count: number }[];
  };
  onboarding?: {
    in_progress_count: number;
    employees: { name: string; uid: string; position?: string; department?: string; status: string; join_date?: string; progress_pct?: number }[];
  };
  employee?: AimanEmployeeSnapshot | null;
  kpis?: {
    metric_name: string; category?: string; target: number; actual: number;
    unit?: string; weight?: number; status?: string; achievement_pct: number;
  }[];
  performance?: {
    review_period: string; review_type?: string; overall_rating?: number;
    status?: string; manager_comments?: string;
  }[];
  attendance?: {
    period_rate?: number; present_days?: number; late_days?: number; absent_days?: number;
  };
  kpi_search?: { employee_name: string; employee_code: string; metric_name: string; actual: number; target: number; achievement_pct: number }[];
  leave?: { pending_count?: number };
  recruitment?: { open_positions?: number; total_candidates?: number };
  errors?: string[];
}

const ONBOARDING_RE = /onboard|orientasi|baru bergabung|karyawan baru/i;
const WORKFORCE_RE = /jumlah (pegawai|karyawan)|berapa (pegawai|karyawan)|total (pegawai|karyawan)|headcount|jumlah sdM/i;
const KPI_RE = /kpi|kinerja|target|pencapaian|metric/i;
const PERF_RE = /performance|penilaian kinerja|review kinerja|nilai kinerja/i;
const ATTENDANCE_RE = /absen|kehadiran|telat|hadir/i;
const LEAVE_RE = /cuti|leave/i;
const RECRUIT_RE = /rekrut|kandidat|hiring/i;

function currentPeriod(): string {
  return new Date().toISOString().substring(0, 7);
}

function extractPeriod(message: string): string {
  const m = message.match(/\b(20\d{2})[-/](\d{1,2})\b/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  if (/bulan ini|periode ini|saat ini/i.test(message)) return currentPeriod();
  return currentPeriod();
}

function extractIdentifiers(message: string) {
  const employee_code = message.match(/\b(EMP[-_]?\d+)\b/i)?.[1]?.toUpperCase().replace('_', '-');
  const nik = message.match(/\b(\d{16})\b/)?.[1];
  const metricMatch = message.match(/(?:kpi|metric)\s+["']?([^"'\n,?]+)["']?/i);
  const metric_name = metricMatch?.[1]?.trim();

  let name_hint: string | undefined;
  const namePatterns = [
    /(?:karyawan|pegawai|nama)\s+(?:bernama\s+)?["']?([A-Za-z][A-Za-z\s.'-]{2,40})["']?/i,
    /(?:kpi|kinerja|performance)\s+(?:dari|untuk)\s+["']?([A-Za-z][A-Za-z\s.'-]{2,40})["']?/i,
  ];
  for (const p of namePatterns) {
    const m = message.match(p);
    if (m?.[1]) { name_hint = m[1].trim(); break; }
  }

  return { employee_code, nik, metric_name, name_hint };
}

function detectIntents(message: string): string[] {
  const intents: string[] = [];
  if (WORKFORCE_RE.test(message)) intents.push('workforce');
  if (ONBOARDING_RE.test(message)) intents.push('onboarding');
  if (KPI_RE.test(message)) intents.push('kpi');
  if (PERF_RE.test(message)) intents.push('performance');
  if (ATTENDANCE_RE.test(message)) intents.push('attendance');
  if (LEAVE_RE.test(message)) intents.push('leave');
  if (RECRUIT_RE.test(message)) intents.push('recruitment');
  if (!intents.length) intents.push('general');
  return intents;
}

async function safeQuery<T>(sql: string, repl: object, fallback: T): Promise<T> {
  if (!sequelize) return fallback;
  try {
    const [rows] = await sequelize.query(sql, { replacements: repl });
    return rows as T;
  } catch {
    return fallback;
  }
}

async function findEmployee(
  tenantId: string | null,
  ids: ReturnType<typeof extractIdentifiers>,
): Promise<AimanEmployeeSnapshot | null> {
  const conditions: string[] = [];
  const repl: Record<string, unknown> = { tid: tenantId };

  if (ids.employee_code) {
    conditions.push('e.employee_code ILIKE :code');
    repl.code = ids.employee_code;
  }
  if (ids.nik) {
    conditions.push('(e.national_id = :nik OR e.employee_code = :nik)');
    repl.nik = ids.nik;
  }
  if (ids.name_hint) {
    conditions.push('e.name ILIKE :name');
    repl.name = `%${ids.name_hint}%`;
  }

  if (!conditions.length) return null;

  const tenantFilter = tenantId ? 'AND (e.tenant_id = :tid OR :tid IS NULL)' : '';
  const sql = `
    SELECT e.id, e.employee_code, e.name, e.position, e.department, e.status, e.hire_date, e.email
    FROM employees e
    WHERE (${conditions.join(' OR ')}) ${tenantFilter}
    ORDER BY e.is_active DESC NULLS LAST, e.name ASC
    LIMIT 1
  `;

  const rows = await safeQuery<any[]>(sql, repl, []);
  return rows[0] || null;
}

async function fetchWorkforce(tenantId: string | null) {
  const tenantFilter = tenantId ? 'WHERE (tenant_id = :tid OR :tid IS NULL)' : '';
  const [summary] = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS total_all,
      COUNT(*) FILTER (WHERE is_active IS NOT FALSE AND COALESCE(status, 'active') IN ('active', 'ACTIVE'))::int AS total_active
    FROM employees ${tenantFilter}
  `, { tid: tenantId }, [{}]);

  const byDept = await safeQuery<any[]>(`
    SELECT COALESCE(department, 'Tanpa Departemen') AS department, COUNT(*)::int AS count
    FROM employees
    ${tenantFilter}
    GROUP BY COALESCE(department, 'Tanpa Departemen')
    ORDER BY count DESC LIMIT 10
  `, { tid: tenantId }, []);

  return {
    total_active: summary[0]?.total_active || 0,
    total_all: summary[0]?.total_all || 0,
    by_department: byDept,
  };
}

async function fetchOnboarding(tenantId: string | null) {
  const tenantFilter = tenantId ? 'AND (tenant_id = :tid OR :tid IS NULL)' : '';
  const rows = await safeQuery<any[]>(`
    SELECT employee_name, employee_uid, position, department, status, join_date, tasks
    FROM employee_onboarding_processes
    WHERE status IN ('in_progress', 'pending', 'active') ${tenantFilter}
    ORDER BY join_date DESC NULLS LAST, created_at DESC
    LIMIT 20
  `, { tid: tenantId }, []);

  const employees = rows.map((r) => {
    let progress_pct: number | undefined;
    try {
      const tasks = typeof r.tasks === 'string' ? JSON.parse(r.tasks) : (r.tasks || []);
      if (Array.isArray(tasks) && tasks.length) {
        const done = tasks.filter((t: any) => t.done || t.completed || t.status === 'done').length;
        progress_pct = Math.round((done / tasks.length) * 100);
      }
    } catch { /* ignore */ }
    return {
      name: r.employee_name,
      uid: r.employee_uid,
      position: r.position,
      department: r.department,
      status: r.status,
      join_date: r.join_date,
      progress_pct,
    };
  });

  return { in_progress_count: employees.length, employees };
}

async function fetchEmployeeKpis(employeeId: number | string, period: string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT metric_name, category, target, actual, unit, weight, status,
      ROUND(CASE WHEN target > 0 THEN (actual::numeric / target * 100) ELSE 0 END, 1) AS achievement_pct
    FROM employee_kpis
    WHERE employee_id = :eid AND period = :period
      AND (tenant_id = :tid OR :tid IS NULL)
    ORDER BY category, metric_name
  `, { eid: employeeId, period, tid: tenantId }, []);
}

async function fetchEmployeePerformance(employeeId: number | string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT review_period, review_type, overall_rating, status, manager_comments
    FROM performance_reviews
    WHERE employee_id = :eid AND (tenant_id = :tid OR :tid IS NULL)
    ORDER BY created_at DESC NULLS LAST
    LIMIT 5
  `, { eid: employeeId, tid: tenantId }, []);
}

async function fetchEmployeeAttendance(employeeId: number | string, period: string) {
  const [row] = await safeQuery<any[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::int AS present_days,
      COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int AS late_days,
      COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_days,
      ROUND(COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::numeric / NULLIF(COUNT(*),0) * 100, 1) AS period_rate
    FROM employee_attendance
    WHERE employee_id = :eid AND TO_CHAR(date, 'YYYY-MM') = :period
  `, { eid: employeeId, period }, [{}]);
  return row[0] || {};
}

async function searchKpiByMetric(metricName: string, period: string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT e.name AS employee_name, e.employee_code, ek.metric_name, ek.actual, ek.target,
      ROUND(CASE WHEN ek.target > 0 THEN (ek.actual::numeric / ek.target * 100) ELSE 0 END, 1) AS achievement_pct
    FROM employee_kpis ek
    JOIN employees e ON e.id = ek.employee_id
    WHERE ek.metric_name ILIKE :metric AND ek.period = :period
      AND (ek.tenant_id = :tid OR :tid IS NULL)
    ORDER BY achievement_pct DESC
    LIMIT 15
  `, { metric: `%${metricName}%`, period, tid: tenantId }, []);
}

export async function resolveAimanDataContext(
  message: string,
  tenantId: string | null,
): Promise<AimanDataContext> {
  const period = extractPeriod(message);
  const identifiers = extractIdentifiers(message);
  const intents = detectIntents(message);
  const hasEmployeeRef = !!(identifiers.employee_code || identifiers.nik || identifiers.name_hint);

  const ctx: AimanDataContext = { period, intents, identifiers };

  if (!sequelize) {
    ctx.errors = ['Database tidak tersedia'];
    return ctx;
  }

  const tasks: Promise<void>[] = [];

  if (intents.includes('workforce') || intents.includes('general')) {
    tasks.push((async () => { ctx.workforce = await fetchWorkforce(tenantId); })());
  }
  if (intents.includes('onboarding') || /onboard/i.test(message)) {
    tasks.push((async () => { ctx.onboarding = await fetchOnboarding(tenantId); })());
  }
  if (intents.includes('recruitment')) {
    tasks.push((async () => {
      const [row] = await safeQuery<any[]>(`
        SELECT (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open') AS open_positions,
          (SELECT COUNT(*)::int FROM hris_candidates) AS total_candidates
      `, {}, [{}]);
      ctx.recruitment = row;
    })());
  }
  if (intents.includes('leave')) {
    tasks.push((async () => {
      const [row] = await safeQuery<any[]>(
        `SELECT COUNT(*)::int AS pending_count FROM leave_requests WHERE status = 'pending'`,
        {}, [{ pending_count: 0 }],
      );
      ctx.leave = row;
    })());
  }

  await Promise.all(tasks);

  if (hasEmployeeRef || (intents.includes('kpi') && identifiers.name_hint) || (intents.includes('performance') && identifiers.name_hint)) {
    ctx.employee = await findEmployee(tenantId, identifiers);
    if (!ctx.employee && hasEmployeeRef) {
      ctx.errors = [...(ctx.errors || []), 'Karyawan tidak ditemukan — periksa NIK/kode/nama.'];
    } else if (ctx.employee) {
      const eid = ctx.employee.id;
      if (intents.includes('kpi') || KPI_RE.test(message)) {
        ctx.kpis = await fetchEmployeeKpis(eid, period, tenantId);
      }
      if (intents.includes('performance') || PERF_RE.test(message)) {
        ctx.performance = await fetchEmployeePerformance(eid, tenantId);
      }
      if (intents.includes('attendance') || ATTENDANCE_RE.test(message)) {
        ctx.attendance = await fetchEmployeeAttendance(eid, period);
      }
      if (!ctx.kpis?.length && (KPI_RE.test(message) || intents.includes('kpi'))) {
        ctx.kpis = await fetchEmployeeKpis(eid, period, tenantId);
      }
    }
  }

  if (identifiers.metric_name && !ctx.employee) {
    ctx.kpi_search = await searchKpiByMetric(identifiers.metric_name, period, tenantId);
  }

  // Auto-fetch KPI/performance when employee code/nik given even without explicit intent
  if (ctx.employee && hasEmployeeRef && !ctx.kpis?.length && !ctx.performance?.length) {
    if (KPI_RE.test(message) || /nilai|skor|performance|kinerja/i.test(message)) {
      ctx.kpis = await fetchEmployeeKpis(ctx.employee.id, period, tenantId);
      ctx.performance = await fetchEmployeePerformance(ctx.employee.id, tenantId);
    }
  }

  return ctx;
}

export function formatAimanDataReply(ctx: AimanDataContext): string {
  const lines: string[] = ['Saya AIMAN. Berikut data Humanify yang saya temukan:\n'];

  if (ctx.errors?.length) {
    lines.push(`⚠ ${ctx.errors.join(' ')}`);
  }

  if (ctx.workforce) {
    lines.push(`**Workforce (periode ${ctx.period})**`);
    lines.push(`— Karyawan aktif: **${ctx.workforce.total_active}** dari ${ctx.workforce.total_all} total`);
    if (ctx.workforce.by_department?.length) {
      lines.push('— Per departemen: ' + ctx.workforce.by_department.slice(0, 5).map(d => `${d.department} (${d.count})`).join(', '));
    }
    lines.push('');
  }

  if (ctx.onboarding) {
    lines.push(`**Onboarding berjalan: ${ctx.onboarding.in_progress_count} karyawan**`);
    for (const o of ctx.onboarding.employees.slice(0, 8)) {
      const prog = o.progress_pct != null ? `, progres ${o.progress_pct}%` : '';
      lines.push(`— ${o.name} (${o.uid || '-'}) · ${o.position || '-'} · ${o.department || '-'}${prog}`);
    }
    if (!ctx.onboarding.in_progress_count) lines.push('— Tidak ada proses onboarding aktif saat ini.');
    lines.push('');
  }

  if (ctx.employee) {
    const e = ctx.employee;
    lines.push(`**Profil Karyawan**`);
    lines.push(`— ${e.name} · Kode: ${e.employee_code} · ${e.position || '-'} · ${e.department || '-'}`);
    lines.push(`— Status: ${e.status || 'active'} · Bergabung: ${e.hire_date || '-'}`);
    lines.push('');
  }

  if (ctx.kpis?.length) {
    lines.push(`**KPI periode ${ctx.period}**`);
    for (const k of ctx.kpis) {
      lines.push(`— ${k.metric_name}: ${k.actual}/${k.target} ${k.unit || ''} (${k.achievement_pct}% · ${k.status || '-'})`);
    }
    const avg = ctx.kpis.reduce((s, k) => s + Number(k.achievement_pct || 0), 0) / ctx.kpis.length;
    lines.push(`— Rata-rata pencapaian: **${avg.toFixed(1)}%**`);
    lines.push('');
  } else if (ctx.employee && ctx.intents.includes('kpi')) {
    lines.push(`— Belum ada data KPI untuk periode ${ctx.period}.`);
    lines.push('');
  }

  if (ctx.performance?.length) {
    lines.push('**Penilaian Kinerja (Performance Review)**');
    for (const p of ctx.performance) {
      lines.push(`— ${p.review_period}: rating ${p.overall_rating ?? '-'} · status ${p.status || '-'}`);
    }
    lines.push('');
  }

  if (ctx.kpi_search?.length) {
    lines.push(`**Pencarian KPI "${ctx.identifiers.metric_name}"**`);
    for (const k of ctx.kpi_search.slice(0, 8)) {
      lines.push(`— ${k.employee_name} (${k.employee_code}): ${k.actual}/${k.target} (${k.achievement_pct}%)`);
    }
    lines.push('');
  }

  if (ctx.attendance?.period_rate != null) {
    lines.push(`**Kehadiran ${ctx.period}**`);
    lines.push(`— Tingkat kehadiran: ${ctx.attendance.period_rate}% · Hadir: ${ctx.attendance.present_days} · Telat: ${ctx.attendance.late_days} · Absen: ${ctx.attendance.absent_days}`);
    lines.push('');
  }

  if (ctx.recruitment) {
    lines.push(`**Rekrutmen**: ${ctx.recruitment.open_positions} posisi terbuka · ${ctx.recruitment.total_candidates} kandidat`);
    lines.push('');
  }

  if (ctx.leave?.pending_count != null) {
    lines.push(`**Cuti pending**: ${ctx.leave.pending_count} permintaan`);
    lines.push('');
  }

  if (lines.length <= 1) {
    lines.push('Belum ada data spesifik. Coba sertakan NIK/kode karyawan (mis. EMP-001), nama, atau kata kunci seperti "jumlah pegawai", "onboarding", "KPI".');
  }

  return lines.join('\n').trim();
}
