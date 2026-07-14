/**
 * AIMAN data resolver — flexible Natural Language → Humanify HRIS live queries
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
  is_active?: boolean;
}

export interface AimanDataContext {
  period: string;
  year: number;
  intents: string[];
  identifiers: {
    employee_code?: string;
    nik?: string;
    metric_name?: string;
    name_hint?: string;
    department?: string;
  };
  workforce?: {
    total_active: number;
    total_all: number;
    inactive?: number;
    by_department?: { department: string; count: number }[];
    by_status?: { status: string; count: number }[];
  };
  onboarding?: {
    in_progress_count: number;
    employees: {
      name: string; uid: string; position?: string; department?: string;
      status: string; join_date?: string; progress_pct?: number;
    }[];
  };
  offboarding?: {
    in_progress_count: number;
    employees: { name: string; uid?: string; reason?: string; last_working_date?: string; status: string }[];
  };
  employee?: AimanEmployeeSnapshot | null;
  employee_matches?: AimanEmployeeSnapshot[];
  kpis?: {
    metric_name: string; category?: string; target: number; actual: number;
    unit?: string; weight?: number; status?: string; achievement_pct: number;
  }[];
  kpi_team?: {
    avg_achievement: number; employees_with_kpi: number; top: { name: string; code: string; avg: number }[];
    bottom: { name: string; code: string; avg: number }[];
  };
  performance?: {
    review_period: string; review_type?: string; overall_rating?: number;
    status?: string; manager_comments?: string;
  }[];
  performance_team?: {
    avg_rating: number; review_count: number;
    recent: { name: string; code: string; rating: number; period: string }[];
  };
  attendance?: {
    period_rate?: number; present_days?: number; late_days?: number; absent_days?: number;
  };
  attendance_team?: {
    period_rate: number; late_days: number; absent_days: number; present_days: number;
  };
  kpi_search?: {
    employee_name: string; employee_code: string; metric_name: string;
    actual: number; target: number; achievement_pct: number;
  }[];
  leave?: {
    pending_count?: number;
    approved_this_month?: number;
    on_leave_now?: { name: string; leave_type?: string; end_date?: string }[];
    pending_list?: { name: string; leave_type?: string; days?: number; start_date?: string }[];
    balances?: { leave_type: string; entitled: number; used: number; remaining: number }[];
  };
  recruitment?: {
    open_positions?: number;
    total_candidates?: number;
    by_stage?: { stage: string; count: number }[];
    open_jobs?: { title: string; department?: string; status: string }[];
  };
  claims?: {
    pending_count: number;
    pending_amount: number;
    approved_this_month?: number;
    recent?: { employee_name: string; claim_type: string; amount: number; status: string }[];
  };
  overtime?: {
    pending_count: number;
    pending_hours: number;
    recent?: { employee_name: string; date: string; hours: number; status: string }[];
  };
  payroll?: {
    latest_run?: {
      run_code?: string; status?: string; period_start?: string; period_end?: string;
      total_gross?: number; total_net?: number; employee_count?: number;
    };
    runs_this_period?: number;
  };
  contracts?: {
    expiring_soon: number;
    items?: {
      employee_name: string; employee_code?: string; contract_type: string;
      end_date?: string; status: string;
    }[];
  };
  training?: {
    active_enrollments: number;
    completed?: number;
    recent?: { employee_name?: string; program?: string; status: string; score?: number }[];
  };
  disciplinary?: {
    active_warnings: number;
    recent?: { employee_name?: string; warning_type?: string; status?: string }[];
  };
  overview?: boolean;
  errors?: string[];
}

const MONTHS: Record<string, string> = {
  januari: '01', jan: '01', februari: '02', feb: '02', maret: '03', mar: '03',
  april: '04', apr: '04', mei: '05', juni: '06', jun: '06', juli: '07', jul: '07',
  agustus: '08', ags: '08', agu: '08', september: '09', sep: '09',
  oktober: '10', okt: '10', november: '11', nov: '11', desember: '12', des: '12',
};

const INTENT_PATTERNS: { intent: string; re: RegExp }[] = [
  { intent: 'workforce', re: /jumlah (pegawai|karyawan)|berapa (pegawai|karyawan)|total (pegawai|karyawan)|headcount|workforce|daftar (pegawai|karyawan)|siapa saja (pegawai|karyawan)|staffing|sdm aktif/i },
  { intent: 'onboarding', re: /onboard|orientasi|baru bergabung|karyawan baru|proses bergabung/i },
  { intent: 'offboarding', re: /offboard|resign|keluar|terminasi|phk|pengunduran|attrition|turnover/i },
  { intent: 'kpi', re: /kpi|kinerja|target|pencapaian|metric|indikator kinerja/i },
  { intent: 'performance', re: /performance|penilaian (kinerja|performa)|review (kinerja|performa)|nilai (kinerja|performa)|rating (kinerja|performa)|nine.?box/i },
  { intent: 'attendance', re: /absen|kehadiran|telat|hadir|attendance|keterlambatan|bolos/i },
  { intent: 'leave', re: /cuti|leave|izin|sisa cuti|saldo cuti/i },
  { intent: 'recruitment', re: /rekrut|kandidat|hiring|lowongan|pelamar|pipeline|talent acquisition/i },
  { intent: 'payroll', re: /gaji|payroll|payslip|take.?home|slip gaji|payroll run|penggajian/i },
  { intent: 'claims', re: /klaim|reimburse|pengeluaran|klaim pengobatan|expense claim/i },
  { intent: 'overtime', re: /lembur|overtime|ot\b/i },
  { intent: 'contracts', re: /kontrak|pkwt|pkwtt|perjanjian kerja|masa kontrak|habis kontrak/i },
  { intent: 'training', re: /training|pelatihan|lms|kursus|sertifikasi|academy|enrollment/i },
  { intent: 'disciplinary', re: /sp\b|peringatan|disciplinary|hubungan industrial|ir case|surat peringatan/i },
  { intent: 'overview', re: /ringkasan|overview|dashboard|kondisi (hr|sdm)|status (hr|sdm)|apa saja yang|prioritas (hr|sdm)|tindak lanjut/i },
];

const STOP_NAME = new Set([
  'kpi', 'bulan', 'ini', 'saat', 'tahun', 'karyawan', 'pegawai', 'dengan', 'dari', 'untuk',
  'berapa', 'siapa', 'yang', 'sedang', 'aktif', 'total', 'jumlah', 'data', 'lihat', 'cek',
  'tolong', 'mohon', 'saya', 'anda', 'hari', 'minggu', 'periode', 'review', 'performance',
  'onboarding', 'cuti', 'absen', 'kehadiran', 'gaji', 'klaim', 'lembur', 'kontrak',
]);

function currentPeriod(): string {
  return new Date().toISOString().substring(0, 7);
}

function extractPeriod(message: string): string {
  const iso = message.match(/\b(20\d{2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;

  const named = message.match(
    /\b(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|ags|agu|september|sep|oktober|okt|november|nov|desember|des)\b(?:\s+(20\d{2}))?/i,
  );
  if (named) {
    const mon = MONTHS[named[1].toLowerCase()];
    const year = named[2] || String(new Date().getFullYear());
    if (mon) return `${year}-${mon}`;
  }

  if (/bulan lalu|periode lalu/i.test(message)) {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 7);
  }
  return currentPeriod();
}

function looksLikePersonName(s: string): boolean {
  const words = s.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(w => /^[A-Za-z][a-z.'-]+$/.test(w) && !STOP_NAME.has(w.toLowerCase()));
}

function extractIdentifiers(message: string) {
  const employee_code = message.match(/\b(EMP[-_]?\d+)\b/i)?.[1]?.toUpperCase().replace('_', '-');
  const nik = message.match(/\b(\d{16})\b/)?.[1];

  // Metric only when quoted, or explicitly "metric/indikator …" — never bare "KPI <Person Name>"
  const metricQuoted = message.match(/(?:kpi|metric|indikator)\s+(?:bernama\s+)?["']([^"']+)["']/i);
  const metricExplicit = message.match(/\b(?:metric|indikator(?:\s+kinerja)?)\s+([A-Za-z][A-Za-z0-9\s.%/-]{2,50}?)(?:\s+(?:bulan|periode|tahun|untuk|dari|di)|[,?]|$)/i);
  let metric_name = (metricQuoted?.[1] || metricExplicit?.[1])?.trim();
  if (metric_name && /^(karyawan|pegawai|emp|bulan|dari|untuk)/i.test(metric_name)) {
    metric_name = undefined;
  }

  const deptMatch = message.match(/(?:departemen|department|divisi|bagian)\s+["']?([A-Za-z][A-Za-z\s&/-]{1,40})["']?/i);
  const department = deptMatch?.[1]?.trim();

  let name_hint: string | undefined;
  const namePatterns = [
    /(?:karyawan|pegawai|nama|profil|data)\s+(?:dan\s+)?(?:kpi|performance|cuti|kehadiran)?\s*(?:dari|untuk|atas nama|bernama)?\s*["']?([A-Za-z][A-Za-z\s.'-]{2,40})["']?/i,
    /(?:kpi|kinerja|performance|cuti|kehadiran|absen|gaji|klaim|lembur|kontrak|training|profil)\s+(?:dari|untuk|atas nama)\s+["']?([A-Za-z][A-Za-z\s.'-]{2,40})["']?/i,
    /(?:kpi|kinerja|performance|profil|cuti|kehadiran)\s+([A-Za-z][A-Za-z\s.'-]{2,40}?)(?:\s+bulan|\s+periode|\s+tahun|,|\?|$)/i,
  ];
  for (const p of namePatterns) {
    const m = message.match(p);
    if (!m?.[1]) continue;
    let candidate = m[1].trim().replace(/\s+/g, ' ');
    // Strip trailing topic words: "Ahmad Wijaya bulan"
    candidate = candidate.replace(/\s+(bulan|periode|tahun|ini|saat)$/i, '').trim();
    const first = candidate.split(/\s+/)[0]?.toLowerCase() || '';
    if (STOP_NAME.has(first) || /^\d+$/.test(candidate)) continue;
    if (employee_code && candidate.toUpperCase().includes(employee_code)) continue;
    name_hint = candidate;
    break;
  }

  // Free-form proper name: "Ahmad Wijaya" anywhere
  if (!name_hint && !employee_code && !nik) {
    const free = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
    if (free) {
      const words = free[1].split(/\s+/);
      if (!words.some(w => STOP_NAME.has(w.toLowerCase()))) name_hint = free[1];
    }
  }

  return { employee_code, nik, metric_name, name_hint, department };
}

function detectIntents(message: string): string[] {
  const intents = INTENT_PATTERNS.filter(p => p.re.test(message)).map(p => p.intent);
  if (/\b(EMP[-_]?\d+|\d{16})\b/i.test(message) || /profil|info|detail|data (karyawan|pegawai)/i.test(message)) {
    intents.push('employee_dossier');
  }
  if (!intents.length) intents.push('overview');
  return [...new Set(intents)];
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

function tidFilter(alias = ''): string {
  const a = alias ? `${alias}.` : '';
  return `AND (${a}tenant_id = :tid OR :tid IS NULL OR ${a}tenant_id IS NULL)`;
}

async function findEmployees(
  tenantId: string | null,
  ids: ReturnType<typeof extractIdentifiers>,
): Promise<AimanEmployeeSnapshot[]> {
  const conditions: string[] = [];
  const repl: Record<string, unknown> = { tid: tenantId };

  if (ids.employee_code) {
    conditions.push('e.employee_code ILIKE :code');
    repl.code = ids.employee_code;
  }
  if (ids.nik) {
    conditions.push('(CAST(e.national_id AS TEXT) = :nik OR e.employee_code = :nik)');
    repl.nik = ids.nik;
  }
  if (ids.name_hint) {
    conditions.push('e.name ILIKE :name');
    repl.name = `%${ids.name_hint}%`;
  }
  if (ids.department && !conditions.length) {
    conditions.push('e.department ILIKE :dept');
    repl.dept = `%${ids.department}%`;
  }

  if (!conditions.length) return [];

  const rows = await safeQuery<any[]>(`
    SELECT e.id, e.employee_code, e.name, e.position, e.department, e.status,
      e.hire_date, e.email, e.is_active
    FROM employees e
    WHERE (${conditions.join(' OR ')}) ${tidFilter('e')}
    ORDER BY e.is_active DESC NULLS LAST, e.name ASC
    LIMIT 8
  `, repl, []);

  return rows;
}

async function fetchWorkforce(tenantId: string | null, department?: string) {
  const deptClause = department ? 'AND department ILIKE :dept' : '';
  const repl = { tid: tenantId, dept: department ? `%${department}%` : null };

  const summary = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS total_all,
      COUNT(*) FILTER (
        WHERE COALESCE(is_active, true) = true
          AND LOWER(COALESCE(status, 'active')) NOT IN ('inactive', 'terminated', 'resigned', 'offboarded')
      )::int AS total_active,
      COUNT(*) FILTER (
        WHERE COALESCE(is_active, true) = false
          OR LOWER(COALESCE(status, '')) IN ('inactive', 'terminated', 'resigned', 'offboarded')
      )::int AS inactive
    FROM employees
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL) ${deptClause}
  `, repl, [{}]);

  const byDept = await safeQuery<any[]>(`
    SELECT COALESCE(department, 'Tanpa Departemen') AS department, COUNT(*)::int AS count
    FROM employees
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL)
      AND COALESCE(is_active, true) = true
      ${deptClause}
    GROUP BY COALESCE(department, 'Tanpa Departemen')
    ORDER BY count DESC LIMIT 12
  `, repl, []);

  const byStatus = await safeQuery<any[]>(`
    SELECT COALESCE(status, CASE WHEN is_active = false THEN 'inactive' ELSE 'active' END) AS status,
      COUNT(*)::int AS count
    FROM employees
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL) ${deptClause}
    GROUP BY 1 ORDER BY count DESC LIMIT 8
  `, repl, []);

  return {
    total_active: summary[0]?.total_active || 0,
    total_all: summary[0]?.total_all || 0,
    inactive: summary[0]?.inactive || 0,
    by_department: byDept,
    by_status: byStatus,
  };
}

async function fetchOnboarding(tenantId: string | null) {
  const rows = await safeQuery<any[]>(`
    SELECT employee_name, employee_uid, position, department, status, join_date, tasks
    FROM employee_onboarding_processes
    WHERE status IN ('in_progress', 'pending', 'active') ${tidFilter()}
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

async function fetchOffboarding(tenantId: string | null) {
  const rows = await safeQuery<any[]>(`
    SELECT employee_name, employee_uid, reason, last_working_date, status, resign_date
    FROM employee_offboarding_processes
    WHERE status IN ('in_progress', 'pending', 'active') ${tidFilter()}
    ORDER BY last_working_date ASC NULLS LAST
    LIMIT 15
  `, { tid: tenantId }, []);

  return {
    in_progress_count: rows.length,
    employees: rows.map(r => ({
      name: r.employee_name,
      uid: r.employee_uid,
      reason: r.reason,
      last_working_date: r.last_working_date || r.resign_date,
      status: r.status,
    })),
  };
}

async function fetchEmployeeKpis(employeeId: number | string, period: string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT metric_name, category, target, actual, unit, weight, status,
      ROUND(CASE WHEN target > 0 THEN (actual::numeric / target * 100) ELSE 0 END, 1) AS achievement_pct
    FROM employee_kpis
    WHERE employee_id = :eid AND period = :period ${tidFilter()}
    ORDER BY category, metric_name
  `, { eid: employeeId, period, tid: tenantId }, []);
}

async function fetchTeamKpis(period: string, tenantId: string | null, department?: string) {
  const deptJoin = department
    ? 'AND e.department ILIKE :dept'
    : '';
  const rows = await safeQuery<any[]>(`
    SELECT e.name, e.employee_code,
      ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual::numeric / ek.target * 100 ELSE 0 END), 1) AS avg
    FROM employee_kpis ek
    JOIN employees e ON e.id = ek.employee_id
    WHERE ek.period = :period ${tidFilter('ek')} ${deptJoin}
    GROUP BY e.id, e.name, e.employee_code
    HAVING COUNT(*) > 0
    ORDER BY avg DESC
  `, { period, tid: tenantId, dept: department ? `%${department}%` : null }, []);

  if (!rows.length) return undefined;
  const avg = rows.reduce((s, r) => s + Number(r.avg || 0), 0) / rows.length;
  return {
    avg_achievement: Math.round(avg * 10) / 10,
    employees_with_kpi: rows.length,
    top: rows.slice(0, 5).map(r => ({ name: r.name, code: r.employee_code, avg: Number(r.avg) })),
    bottom: rows.slice(-3).reverse().map(r => ({ name: r.name, code: r.employee_code, avg: Number(r.avg) })),
  };
}

async function fetchEmployeePerformance(employeeId: number | string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT review_period, review_type, overall_rating, status, manager_comments
    FROM performance_reviews
    WHERE employee_id = :eid ${tidFilter()}
    ORDER BY created_at DESC NULLS LAST
    LIMIT 5
  `, { eid: employeeId, tid: tenantId }, []);
}

async function fetchTeamPerformance(tenantId: string | null) {
  const rows = await safeQuery<any[]>(`
    SELECT e.name, e.employee_code, pr.overall_rating AS rating, pr.review_period AS period
    FROM performance_reviews pr
    JOIN employees e ON e.id = pr.employee_id
    WHERE pr.overall_rating IS NOT NULL ${tidFilter('pr')}
    ORDER BY pr.created_at DESC NULLS LAST
    LIMIT 20
  `, { tid: tenantId }, []);

  if (!rows.length) return undefined;
  const avg = rows.reduce((s, r) => s + Number(r.rating || 0), 0) / rows.length;
  return {
    avg_rating: Math.round(avg * 10) / 10,
    review_count: rows.length,
    recent: rows.slice(0, 8).map(r => ({
      name: r.name, code: r.employee_code, rating: Number(r.rating), period: r.period,
    })),
  };
}

async function fetchEmployeeAttendance(employeeId: number | string, period: string) {
  const rows = await safeQuery<any[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home','wfh'))::int AS present_days,
      COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int AS late_days,
      COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_days,
      ROUND(
        COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home','wfh'))::numeric
        / NULLIF(COUNT(*),0) * 100, 1
      ) AS period_rate
    FROM employee_attendance
    WHERE employee_id = :eid AND TO_CHAR(date, 'YYYY-MM') = :period
  `, { eid: employeeId, period }, [{}]);
  return rows[0] || {};
}

async function fetchTeamAttendance(period: string) {
  const rows = await safeQuery<any[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home','wfh'))::int AS present_days,
      COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int AS late_days,
      COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_days,
      ROUND(
        COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home','wfh'))::numeric
        / NULLIF(COUNT(*),0) * 100, 1
      ) AS period_rate
    FROM employee_attendance
    WHERE TO_CHAR(date, 'YYYY-MM') = :period
  `, { period }, [{}]);
  const r = rows[0];
  if (!r || r.period_rate == null) return undefined;
  return {
    period_rate: Number(r.period_rate),
    late_days: r.late_days || 0,
    absent_days: r.absent_days || 0,
    present_days: r.present_days || 0,
  };
}

async function searchKpiByMetric(metricName: string, period: string, tenantId: string | null) {
  return safeQuery<any[]>(`
    SELECT e.name AS employee_name, e.employee_code, ek.metric_name, ek.actual, ek.target,
      ROUND(CASE WHEN ek.target > 0 THEN (ek.actual::numeric / ek.target * 100) ELSE 0 END, 1) AS achievement_pct
    FROM employee_kpis ek
    JOIN employees e ON e.id = ek.employee_id
    WHERE ek.metric_name ILIKE :metric AND ek.period = :period ${tidFilter('ek')}
    ORDER BY achievement_pct DESC
    LIMIT 15
  `, { metric: `%${metricName}%`, period, tid: tenantId }, []);
}

async function fetchLeave(tenantId: string | null, employeeId?: number | string, year?: number) {
  const pending = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS pending_count FROM leave_requests
    WHERE status = 'pending' ${tidFilter()}
  `, { tid: tenantId }, [{ pending_count: 0 }]);

  const approved = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS c FROM leave_requests
    WHERE status = 'approved'
      AND TO_CHAR(COALESCE(start_date, created_at::date), 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
      ${tidFilter()}
  `, { tid: tenantId }, [{ c: 0 }]);

  const onLeave = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, lr.employee_name, 'Karyawan') AS name,
      lr.leave_type, lr.end_date::text AS end_date
    FROM leave_requests lr
    LEFT JOIN employees e ON e.id = lr.employee_id
    WHERE lr.status = 'approved'
      AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
      ${tidFilter('lr')}
    LIMIT 10
  `, { tid: tenantId }, []);

  const pendingList = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS name, lr.leave_type,
      lr.total_days AS days, lr.start_date::text AS start_date
    FROM leave_requests lr
    LEFT JOIN employees e ON e.id = lr.employee_id
    WHERE lr.status = 'pending' ${tidFilter('lr')}
    ORDER BY lr.created_at DESC NULLS LAST
    LIMIT 8
  `, { tid: tenantId }, []);

  let balances: { leave_type: string; entitled: number; used: number; remaining: number }[] | undefined;

  if (employeeId) {
    balances = await safeQuery<any[]>(`
      SELECT COALESCE(lt.name, 'Cuti') AS leave_type,
        lb.entitled_days AS entitled, lb.used_days AS used,
        (COALESCE(lb.entitled_days,0) + COALESCE(lb.carry_forward_days,0) + COALESCE(lb.adjustment_days,0)
          - COALESCE(lb.used_days,0) - COALESCE(lb.pending_days,0)) AS remaining
      FROM leave_balances lb
      LEFT JOIN leave_types lt ON lt.id = lb.leave_type_id
      WHERE lb.employee_id = :eid AND lb.year = :year
      ORDER BY lt.name
    `, { eid: employeeId, year: year || new Date().getFullYear() }, []);
  }

  return {
    pending_count: pending[0]?.pending_count || 0,
    approved_this_month: approved[0]?.c || 0,
    on_leave_now: onLeave,
    pending_list: pendingList,
    balances,
  };
}

async function fetchRecruitment(_tenantId: string | null) {
  const open = await safeQuery<any[]>(
    `SELECT COUNT(*)::int AS c FROM hris_job_openings WHERE status IN ('open','published','active')`,
    {}, [{ c: 0 }],
  );
  const total = await safeQuery<any[]>(
    `SELECT COUNT(*)::int AS c FROM hris_candidates`,
    {}, [{ c: 0 }],
  );

  const byStage = await safeQuery<any[]>(`
    SELECT COALESCE(stage::text, 'unknown') AS stage, COUNT(*)::int AS count
    FROM hris_candidates
    GROUP BY stage ORDER BY count DESC LIMIT 10
  `, {}, []);

  const openJobs = await safeQuery<any[]>(`
    SELECT title, department, status FROM hris_job_openings
    WHERE status IN ('open','published','active')
    ORDER BY created_at DESC NULLS LAST LIMIT 8
  `, {}, []);

  return {
    open_positions: open[0]?.c || 0,
    total_candidates: total[0]?.c || 0,
    by_stage: byStage,
    open_jobs: openJobs,
  };
}

async function fetchClaims(tenantId: string | null, employeeId?: number | string) {
  const empClause = employeeId ? 'AND employee_id = :eid' : '';
  const summary = await safeQuery<any[]>(`
    SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::numeric AS pending_amount,
      COUNT(*) FILTER (
        WHERE status IN ('approved','paid')
          AND TO_CHAR(COALESCE(claim_date, created_at::date), 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
      )::int AS approved_this_month
    FROM employee_claims
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL) ${empClause}
  `, { tid: tenantId, eid: employeeId }, [{}]);

  const recent = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS employee_name, c.claim_type, c.amount, c.status
    FROM employee_claims c
    LEFT JOIN employees e ON e.id = c.employee_id
    WHERE (c.tenant_id = :tid OR :tid IS NULL OR c.tenant_id IS NULL) ${employeeId ? 'AND c.employee_id = :eid' : ''}
    ORDER BY c.created_at DESC NULLS LAST
    LIMIT 8
  `, { tid: tenantId, eid: employeeId }, []);

  return {
    pending_count: summary[0]?.pending_count || 0,
    pending_amount: Number(summary[0]?.pending_amount || 0),
    approved_this_month: summary[0]?.approved_this_month || 0,
    recent,
  };
}

async function fetchOvertime(tenantId: string | null, employeeId?: number | string) {
  const empClause = employeeId ? 'AND o.employee_id = :eid' : '';
  const summary = await safeQuery<any[]>(`
    SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
      COALESCE(SUM(total_hours) FILTER (WHERE status = 'pending'), 0)::numeric AS pending_hours
    FROM overtime_requests o
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL) ${empClause.replace('o.', '')}
  `, { tid: tenantId, eid: employeeId }, [{}]);

  const recent = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS employee_name,
      o.request_date::text AS date, o.total_hours AS hours, o.status
    FROM overtime_requests o
    LEFT JOIN employees e ON e.id = o.employee_id
    WHERE (o.tenant_id = :tid OR :tid IS NULL OR o.tenant_id IS NULL) ${empClause}
    ORDER BY o.request_date DESC NULLS LAST
    LIMIT 8
  `, { tid: tenantId, eid: employeeId }, []);

  return {
    pending_count: summary[0]?.pending_count || 0,
    pending_hours: Number(summary[0]?.pending_hours || 0),
    recent,
  };
}

async function fetchPayroll(tenantId: string | null, period: string) {
  const latest = await safeQuery<any[]>(`
    SELECT run_code, status, period_start::text, period_end::text,
      total_gross, total_net, employee_count
    FROM payroll_runs
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL)
    ORDER BY period_end DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, { tid: tenantId }, []);

  const periodRuns = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS c FROM payroll_runs
    WHERE TO_CHAR(period_start, 'YYYY-MM') = :period
       OR TO_CHAR(period_end, 'YYYY-MM') = :period
  `, { period }, [{ c: 0 }]);

  return {
    latest_run: latest[0] ? {
      run_code: latest[0].run_code,
      status: latest[0].status,
      period_start: latest[0].period_start,
      period_end: latest[0].period_end,
      total_gross: Number(latest[0].total_gross || 0),
      total_net: Number(latest[0].total_net || 0),
      employee_count: latest[0].employee_count,
    } : undefined,
    runs_this_period: periodRuns[0]?.c || 0,
  };
}

async function fetchContracts(tenantId: string | null) {
  const items = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS employee_name, e.employee_code,
      c.contract_type, c.end_date::text AS end_date, c.status
    FROM employee_contracts c
    LEFT JOIN employees e ON e.id = c.employee_id
    WHERE c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date <= (CURRENT_DATE + INTERVAL '90 days')
      AND (c.tenant_id = :tid OR :tid IS NULL OR c.tenant_id IS NULL)
    ORDER BY c.end_date ASC
    LIMIT 12
  `, { tid: tenantId }, []);

  return { expiring_soon: items.length, items };
}

async function fetchTraining(tenantId: string | null, employeeId?: number | string) {
  const empClause = employeeId ? 'AND te.employee_id = :eid' : '';
  const summary = await safeQuery<any[]>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('enrolled','in_progress','active'))::int AS active_enrollments,
      COUNT(*) FILTER (WHERE status IN ('completed','passed','graduated'))::int AS completed
    FROM hris_training_enrollments te
    WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL) ${empClause.replace('te.', '')}
  `, { tid: tenantId, eid: employeeId }, [{}]);

  const recent = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS employee_name,
      COALESCE(tp.title, tp.name, 'Program') AS program,
      te.status, te.score
    FROM hris_training_enrollments te
    LEFT JOIN employees e ON e.id = te.employee_id
    LEFT JOIN hris_training_programs tp ON tp.id = te.training_program_id
    WHERE (te.tenant_id = :tid OR :tid IS NULL OR te.tenant_id IS NULL) ${empClause}
    ORDER BY te.enrolled_at DESC NULLS LAST
    LIMIT 10
  `, { tid: tenantId, eid: employeeId }, []);

  return {
    active_enrollments: summary[0]?.active_enrollments || 0,
    completed: summary[0]?.completed || 0,
    recent,
  };
}

async function fetchDisciplinary(tenantId: string | null) {
  const active = await safeQuery<any[]>(`
    SELECT COUNT(*)::int AS c FROM warning_letters
    WHERE status IN ('active','issued') OR (status IS NULL AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE))
  `, {}, [{ c: 0 }]);

  const recent = await safeQuery<any[]>(`
    SELECT COALESCE(e.name, 'Karyawan') AS employee_name, w.warning_type, w.status
    FROM warning_letters w
    LEFT JOIN employees e ON e.id = w.employee_id
    ORDER BY w.created_at DESC NULLS LAST
    LIMIT 8
  `, {}, []);

  return { active_warnings: active[0]?.c || 0, recent };
}

export async function resolveAimanDataContext(
  message: string,
  tenantId: string | null,
): Promise<AimanDataContext> {
  const period = extractPeriod(message);
  const year = Number(period.slice(0, 4));
  const identifiers = extractIdentifiers(message);
  const intents = detectIntents(message);
  const hasEmployeeRef = !!(identifiers.employee_code || identifiers.nik || identifiers.name_hint);
  const wantsOverview = intents.includes('overview');
  const wantsDossier = intents.includes('employee_dossier') || (hasEmployeeRef && intents.length <= 1);

  const ctx: AimanDataContext = { period, year, intents, identifiers };

  if (!sequelize) {
    ctx.errors = ['Database tidak tersedia'];
    return ctx;
  }

  const need = (key: string) =>
    intents.includes(key) || wantsOverview || (wantsDossier && hasEmployeeRef && ['kpi', 'performance', 'attendance', 'leave'].includes(key));

  // Resolve employee first when referenced
  if (hasEmployeeRef || identifiers.department && /karyawan|pegawai di/i.test(message)) {
    const matches = await findEmployees(tenantId, identifiers);
    ctx.employee_matches = matches.length > 1 ? matches : undefined;
    ctx.employee = matches[0] || null;
    if (!ctx.employee && hasEmployeeRef) {
      ctx.errors = [...(ctx.errors || []), 'Karyawan tidak ditemukan — coba kode EMP-xxx, NIK 16 digit, atau nama lengkap.'];
    }
  }

  const eid = ctx.employee?.id;
  const tasks: Promise<void>[] = [];

  if (need('workforce') || wantsOverview) {
    tasks.push((async () => { ctx.workforce = await fetchWorkforce(tenantId, identifiers.department); })());
  }
  if (need('onboarding') || wantsOverview) {
    tasks.push((async () => { ctx.onboarding = await fetchOnboarding(tenantId); })());
  }
  if (need('offboarding') || wantsOverview) {
    tasks.push((async () => { ctx.offboarding = await fetchOffboarding(tenantId); })());
  }
  if (need('recruitment') || wantsOverview) {
    tasks.push((async () => { ctx.recruitment = await fetchRecruitment(tenantId); })());
  }
  if (need('leave') || wantsOverview || (eid && wantsDossier)) {
    tasks.push((async () => { ctx.leave = await fetchLeave(tenantId, eid, year); })());
  }
  if (need('claims') || wantsOverview || (eid && intents.includes('claims'))) {
    tasks.push((async () => { ctx.claims = await fetchClaims(tenantId, eid); })());
  }
  if (need('overtime') || wantsOverview || (eid && intents.includes('overtime'))) {
    tasks.push((async () => { ctx.overtime = await fetchOvertime(tenantId, eid); })());
  }
  if (need('payroll') || wantsOverview) {
    tasks.push((async () => { ctx.payroll = await fetchPayroll(tenantId, period); })());
  }
  if (need('contracts') || wantsOverview) {
    tasks.push((async () => { ctx.contracts = await fetchContracts(tenantId); })());
  }
  if (need('training') || wantsOverview || (eid && intents.includes('training'))) {
    tasks.push((async () => { ctx.training = await fetchTraining(tenantId, eid); })());
  }
  if (need('disciplinary') || wantsOverview) {
    tasks.push((async () => { ctx.disciplinary = await fetchDisciplinary(tenantId); })());
  }
  if ((need('attendance') || wantsOverview) && !eid) {
    tasks.push((async () => { ctx.attendance_team = await fetchTeamAttendance(period); })());
  }
  if ((need('kpi') || wantsOverview) && !eid && !identifiers.metric_name) {
    tasks.push((async () => { ctx.kpi_team = await fetchTeamKpis(period, tenantId, identifiers.department); })());
  }
  if ((need('performance') || wantsOverview) && !eid) {
    tasks.push((async () => { ctx.performance_team = await fetchTeamPerformance(tenantId); })());
  }

  await Promise.all(tasks);

  if (eid) {
    const empTasks: Promise<void>[] = [];
    if (need('kpi') || wantsDossier || /nilai|skor|kinerja/i.test(message)) {
      empTasks.push((async () => { ctx.kpis = await fetchEmployeeKpis(eid, period, tenantId); })());
    }
    if (need('performance') || wantsDossier) {
      empTasks.push((async () => { ctx.performance = await fetchEmployeePerformance(eid, tenantId); })());
    }
    if (need('attendance') || wantsDossier) {
      empTasks.push((async () => { ctx.attendance = await fetchEmployeeAttendance(eid, period); })());
    }
    if (need('leave') && !ctx.leave?.balances?.length) {
      empTasks.push((async () => {
        const leave = await fetchLeave(tenantId, eid, year);
        ctx.leave = { ...ctx.leave, ...leave };
      })());
    }
    await Promise.all(empTasks);
  }

  if (identifiers.metric_name && !ctx.kpis?.length) {
    ctx.kpi_search = await searchKpiByMetric(identifiers.metric_name, period, tenantId);
  }

  if (wantsOverview) ctx.overview = true;

  return ctx;
}

function idr(n?: number) {
  if (n == null || Number.isNaN(n)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function formatAimanDataReply(ctx: AimanDataContext): string {
  const lines: string[] = ['Saya AIMAN. Berikut data Humanify yang relevan:\n'];

  if (ctx.errors?.length) lines.push(`Catatan: ${ctx.errors.join(' ')}`);

  if (ctx.workforce) {
    lines.push(`**Workforce (${ctx.period})**`);
    lines.push(`— Aktif: **${ctx.workforce.total_active}** · Total terdaftar: ${ctx.workforce.total_all} · Nonaktif: ${ctx.workforce.inactive ?? 0}`);
    if (ctx.workforce.by_department?.length) {
      lines.push('— Departemen: ' + ctx.workforce.by_department.slice(0, 6).map(d => `${d.department} (${d.count})`).join(', '));
    }
    lines.push('');
  }

  if (ctx.onboarding) {
    lines.push(`**Onboarding aktif: ${ctx.onboarding.in_progress_count}**`);
    for (const o of ctx.onboarding.employees.slice(0, 6)) {
      const prog = o.progress_pct != null ? ` · progres ${o.progress_pct}%` : '';
      lines.push(`— ${o.name} (${o.uid || '-'}) · ${o.position || '-'}${prog}`);
    }
    if (!ctx.onboarding.in_progress_count) lines.push('— Tidak ada proses onboarding aktif.');
    lines.push('');
  }

  if (ctx.offboarding?.in_progress_count) {
    lines.push(`**Offboarding berjalan: ${ctx.offboarding.in_progress_count}**`);
    for (const o of ctx.offboarding.employees.slice(0, 5)) {
      lines.push(`— ${o.name} · ${o.last_working_date || '-'} · ${o.reason || '-'}`);
    }
    lines.push('');
  }

  if (ctx.employee_matches?.length) {
    lines.push('**Beberapa karyawan cocok — menampilkan yang pertama:**');
    for (const m of ctx.employee_matches.slice(0, 5)) {
      lines.push(`— ${m.name} (${m.employee_code}) · ${m.department || '-'}`);
    }
    lines.push('');
  }

  if (ctx.employee) {
    const e = ctx.employee;
    lines.push('**Profil Karyawan**');
    lines.push(`— ${e.name} · ${e.employee_code} · ${e.position || '-'} · ${e.department || '-'}`);
    lines.push(`— Status: ${e.status || (e.is_active === false ? 'inactive' : 'active')} · Bergabung: ${e.hire_date || '-'}`);
    lines.push('');
  }

  if (ctx.kpis?.length) {
    lines.push(`**KPI ${ctx.period}**`);
    for (const k of ctx.kpis) {
      lines.push(`— ${k.metric_name}: ${k.actual}/${k.target} ${k.unit || ''} (${k.achievement_pct}%)`);
    }
    const avg = ctx.kpis.reduce((s, k) => s + Number(k.achievement_pct || 0), 0) / ctx.kpis.length;
    lines.push(`— Rata-rata pencapaian: **${avg.toFixed(1)}%**`);
    lines.push('');
  } else if (ctx.employee && ctx.intents.includes('kpi')) {
    lines.push(`— Belum ada KPI untuk periode ${ctx.period}.`);
    lines.push('');
  }

  if (ctx.kpi_team) {
    lines.push(`**KPI Tim ${ctx.period}** — rata-rata **${ctx.kpi_team.avg_achievement}%** (${ctx.kpi_team.employees_with_kpi} karyawan)`);
    if (ctx.kpi_team.top.length) {
      lines.push('— Teratas: ' + ctx.kpi_team.top.map(t => `${t.name} ${t.avg}%`).join(', '));
    }
    lines.push('');
  }

  if (ctx.performance?.length) {
    lines.push('**Performance Review**');
    for (const p of ctx.performance) {
      lines.push(`— ${p.review_period}: rating ${p.overall_rating ?? '-'} · ${p.status || '-'}`);
    }
    lines.push('');
  }

  if (ctx.performance_team) {
    lines.push(`**Performance Tim** — rating rata-rata **${ctx.performance_team.avg_rating}** (${ctx.performance_team.review_count} review)`);
    for (const r of ctx.performance_team.recent.slice(0, 5)) {
      lines.push(`— ${r.name} (${r.code}): ${r.rating} · ${r.period}`);
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
    lines.push(`**Kehadiran ${ctx.period}** — ${ctx.attendance.period_rate}% · Hadir ${ctx.attendance.present_days} · Telat ${ctx.attendance.late_days} · Absen ${ctx.attendance.absent_days}`);
    lines.push('');
  }

  if (ctx.attendance_team) {
    lines.push(`**Kehadiran Tim ${ctx.period}** — ${ctx.attendance_team.period_rate}% · Telat ${ctx.attendance_team.late_days} hari · Absen ${ctx.attendance_team.absent_days}`);
    lines.push('');
  }

  if (ctx.leave) {
    lines.push(`**Cuti** — pending: **${ctx.leave.pending_count ?? 0}** · disetujui bulan ini: ${ctx.leave.approved_this_month ?? 0}`);
    if (ctx.leave.on_leave_now?.length) {
      lines.push('— Sedang cuti: ' + ctx.leave.on_leave_now.map(o => `${o.name} s/d ${o.end_date}`).join('; '));
    }
    if (ctx.leave.balances?.length) {
      for (const b of ctx.leave.balances) {
        lines.push(`— Saldo ${b.leave_type}: sisa **${b.remaining}** (entitled ${b.entitled}, terpakai ${b.used})`);
      }
    }
    if (ctx.leave.pending_list?.length) {
      for (const p of ctx.leave.pending_list.slice(0, 5)) {
        lines.push(`— Pending: ${p.name} · ${p.leave_type} · ${p.days ?? '-'} hari · ${p.start_date || ''}`);
      }
    }
    lines.push('');
  }

  if (ctx.recruitment) {
    lines.push(`**Rekrutmen** — ${ctx.recruitment.open_positions} lowongan · ${ctx.recruitment.total_candidates} kandidat`);
    if (ctx.recruitment.by_stage?.length) {
      lines.push('— Pipeline: ' + ctx.recruitment.by_stage.map(s => `${s.stage} (${s.count})`).join(', '));
    }
    lines.push('');
  }

  if (ctx.claims) {
    lines.push(`**Klaim** — pending: **${ctx.claims.pending_count}** (${idr(ctx.claims.pending_amount)}) · disetujui bulan ini: ${ctx.claims.approved_this_month ?? 0}`);
    for (const c of (ctx.claims.recent || []).filter(x => x.status === 'pending').slice(0, 4)) {
      lines.push(`— ${c.employee_name}: ${c.claim_type} ${idr(Number(c.amount))}`);
    }
    lines.push('');
  }

  if (ctx.overtime) {
    lines.push(`**Lembur** — pending: **${ctx.overtime.pending_count}** (${ctx.overtime.pending_hours} jam)`);
    lines.push('');
  }

  if (ctx.payroll?.latest_run) {
    const r = ctx.payroll.latest_run;
    lines.push(`**Payroll** — run ${r.run_code || '-'} · status ${r.status} · netto ${idr(r.total_net)} · ${r.employee_count || 0} karyawan`);
    lines.push('');
  }

  if (ctx.contracts) {
    lines.push(`**Kontrak habis ≤90 hari: ${ctx.contracts.expiring_soon}**`);
    for (const c of (ctx.contracts.items || []).slice(0, 5)) {
      lines.push(`— ${c.employee_name} (${c.employee_code || '-'}) · ${c.contract_type} · ${c.end_date}`);
    }
    lines.push('');
  }

  if (ctx.training) {
    lines.push(`**Training/LMS** — aktif: ${ctx.training.active_enrollments} · selesai: ${ctx.training.completed ?? 0}`);
    for (const t of (ctx.training.recent || []).slice(0, 4)) {
      lines.push(`— ${t.employee_name}: ${t.program} · ${t.status}`);
    }
    lines.push('');
  }

  if (ctx.disciplinary) {
    lines.push(`**Disiplin** — SP aktif: **${ctx.disciplinary.active_warnings}**`);
    lines.push('');
  }

  if (lines.length <= 1) {
    lines.push('Belum ada data spesifik. Coba: "ringkasan SDM", "jumlah pegawai", "sisa cuti EMP-001", "klaim pending", "kontrak habis", "pipeline rekrutmen", atau nama karyawan.');
  }

  return lines.join('\n').trim();
}

export function hasAimanLiveData(data: AimanDataContext): boolean {
  return !!(
    data.workforce || data.onboarding || data.offboarding?.in_progress_count ||
    data.employee || data.employee_matches?.length ||
    data.kpis?.length || data.kpi_team || data.kpi_search?.length ||
    data.performance?.length || data.performance_team ||
    data.attendance?.period_rate != null || data.attendance_team ||
    data.recruitment || data.leave || data.claims || data.overtime ||
    data.payroll?.latest_run || data.contracts || data.training || data.disciplinary
  );
}
