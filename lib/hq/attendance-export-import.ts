import { utils, writeFile } from 'xlsx';

export const ATTENDANCE_IMPORT_HEADERS = [
  'kode_karyawan', 'tanggal', 'jam_masuk', 'jam_keluar', 'status', 'sumber', 'cabang', 'keterangan'
] as const;

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: 'Hadir',
  late: 'Terlambat',
  absent: 'Tidak Hadir',
  leave: 'Cuti',
  sick: 'Sakit',
  work_from_home: 'WFH',
  holiday: 'Libur',
};

export const ATTENDANCE_SOURCE_LABELS: Record<string, string> = {
  fingerprint: 'Sidik Jari',
  face_recognition: 'Wajah',
  gps_mobile: 'Ponsel/GPS',
  card: 'Kartu',
  manual: 'Manual',
  api: 'API',
};

const VALID_STATUSES = new Set(Object.keys(ATTENDANCE_STATUS_LABELS));
const VALID_SOURCES = new Set(Object.keys(ATTENDANCE_SOURCE_LABELS));

const TEMPLATE_EXAMPLE = [
  ['kode_karyawan', 'tanggal', 'jam_masuk', 'jam_keluar', 'status', 'sumber', 'cabang', 'keterangan'],
  ['EMP-001', '2026-03-12', '08:00', '17:00', 'present', 'fingerprint', 'Kantor Pusat Jakarta', ''],
  ['EMP-002', '2026-03-12', '08:22', '17:30', 'late', 'face_recognition', 'Cabang Bandung', 'Terlambat 22 menit'],
  ['EMP-004', '2026-03-12', '', '', 'absent', 'manual', 'Cabang Medan', 'Tanpa keterangan'],
  ['EMP-011', '2026-03-12', '', '', 'leave', 'manual', 'Cabang Bali', 'Cuti tahunan'],
];

export interface ParsedAttendanceRow {
  rowNum: number;
  employeeCode: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  source: string;
  branchName: string;
  notes: string;
}

function formatTimeExport(t: string | null) {
  if (!t) return '-';
  try { return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
}

export function mapDailyToExportRows(
  records: Array<{
    employeeId: string; employeeName: string; position: string; branchName: string;
    clockIn: string | null; clockOut: string | null; workHours: number; status: string;
    source: string; lateMinutes?: number; overtimeMinutes?: number; earlyLeaveMinutes?: number;
  }>,
  date: string
) {
  return records.map(r => ({
    'Kode Karyawan': r.employeeId,
    'Nama': r.employeeName,
    'Jabatan': r.position,
    'Cabang': r.branchName,
    'Tanggal': date,
    'Jam Masuk': formatTimeExport(r.clockIn),
    'Jam Keluar': formatTimeExport(r.clockOut),
    'Jam Kerja': r.workHours > 0 ? `${r.workHours.toFixed(1)} jam` : '-',
    'Status': ATTENDANCE_STATUS_LABELS[r.status] || r.status,
    'Sumber': ATTENDANCE_SOURCE_LABELS[r.source] || r.source,
    'Telat (menit)': r.lateMinutes || 0,
    'Lembur (menit)': r.overtimeMinutes || 0,
    'Pulang Awal (menit)': r.earlyLeaveMinutes || 0,
  }));
}

export function mapMonthlyToExportRows(
  records: Array<{
    employeeId: string; employeeName: string; position: string; branchName: string;
    present: number; late: number; absent: number; leave: number; workFromHome?: number;
    totalDays: number; attendanceRate: number;
  }>,
  month: string
) {
  return records.map(r => ({
    'Periode': month,
    'Kode Karyawan': r.employeeId,
    'Nama': r.employeeName,
    'Jabatan': r.position,
    'Cabang': r.branchName,
    'Hadir': r.present,
    'Terlambat': r.late,
    'Tidak Hadir': r.absent,
    'Cuti': r.leave,
    'WFH': r.workFromHome || 0,
    'Total Hari': r.totalDays,
    'Tingkat Kehadiran (%)': r.attendanceRate,
  }));
}

export function mapLiveToExportRows(
  records: Array<{
    employee_name?: string; employee_id?: string; position?: string; department?: string;
    clock_in?: string; clock_out?: string; status?: string; clock_in_method?: string; work_hours?: number;
  }>
) {
  const today = new Date().toISOString().split('T')[0];
  return records.map(r => ({
    'Tanggal': today,
    'Kode Karyawan': r.employee_id || '-',
    'Nama': r.employee_name || '-',
    'Jabatan': r.position || '-',
    'Departemen': r.department || '-',
    'Jam Masuk': r.clock_in ? formatTimeExport(r.clock_in) : '-',
    'Jam Keluar': r.clock_out ? formatTimeExport(r.clock_out) : '-',
    'Status': ATTENDANCE_STATUS_LABELS[r.status || ''] || r.status || '-',
    'Metode': r.clock_in_method || 'manual',
    'Jam Kerja': r.work_hours ? `${r.work_hours} jam` : '-',
  }));
}

export function downloadAttendanceTemplate(format: 'csv' | 'xlsx') {
  if (format === 'csv') {
    const lines = TEMPLATE_EXAMPLE.map(row =>
      row.map(cell => cell.includes(',') ? `"${cell}"` : cell).join(',')
    );
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-absensi.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const ws = utils.aoa_to_sheet(TEMPLATE_EXAMPLE);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Template Absensi');
  writeFile(wb, 'template-import-absensi.xlsx');
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseDate(val: string): string | null {
  const v = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return null;
}

function parseTime(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return v.length === 5 ? `${v}:00` : v;
  return null;
}

export function parseAttendanceCsv(text: string): { rows: ParsedAttendanceRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['File kosong atau hanya berisi header'] };

  const headerCells = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const headerMap: Record<string, number> = {};
  headerCells.forEach((h, i) => { headerMap[normalizeHeader(h)] = i; });

  const idx = (names: string[]) => {
    for (const n of names) {
      const key = normalizeHeader(n);
      if (headerMap[key] !== undefined) return headerMap[key];
    }
    return -1;
  };

  const codeIdx = idx(['kode_karyawan', 'employee_code', 'kode', 'id_karyawan']);
  const dateIdx = idx(['tanggal', 'date', 'attendance_date']);
  const inIdx = idx(['jam_masuk', 'clock_in', 'check_in']);
  const outIdx = idx(['jam_keluar', 'clock_out', 'check_out']);
  const statusIdx = idx(['status']);
  const sourceIdx = idx(['sumber', 'source', 'metode']);
  const branchIdx = idx(['cabang', 'branch']);
  const notesIdx = idx(['keterangan', 'notes', 'catatan']);

  if (codeIdx < 0) errors.push('Kolom wajib tidak ditemukan: kode_karyawan');
  if (dateIdx < 0) errors.push('Kolom wajib tidak ditemukan: tanggal');
  if (statusIdx < 0) errors.push('Kolom wajib tidak ditemukan: status');
  if (errors.length) return { rows: [], errors };

  const rows: ParsedAttendanceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
    if (!cells.some(c => c)) continue;

    const rowNum = i + 1;
    const employeeCode = cells[codeIdx] || '';
    const dateRaw = cells[dateIdx] || '';
    const status = (cells[statusIdx] || '').toLowerCase();

    if (!employeeCode) { errors.push(`Baris ${rowNum}: kode_karyawan wajib diisi`); continue; }
    const date = parseDate(dateRaw);
    if (!date) { errors.push(`Baris ${rowNum}: format tanggal tidak valid (${dateRaw})`); continue; }
    if (!VALID_STATUSES.has(status)) {
      errors.push(`Baris ${rowNum}: status tidak valid (${status}). Gunakan: ${[...VALID_STATUSES].join(', ')}`);
      continue;
    }

    const source = (cells[sourceIdx] || 'manual').toLowerCase();
    if (source && !VALID_SOURCES.has(source)) {
      errors.push(`Baris ${rowNum}: sumber tidak valid (${source})`);
      continue;
    }

    const clockIn = parseTime(cells[inIdx] || '');
    const clockOut = parseTime(cells[outIdx] || '');

    rows.push({
      rowNum,
      employeeCode,
      date,
      clockIn,
      clockOut,
      status,
      source: source || 'manual',
      branchName: cells[branchIdx] || '',
      notes: cells[notesIdx] || '',
    });
  }

  return { rows, errors };
}

export function parseAttendanceXlsx(buffer: ArrayBuffer): { rows: ParsedAttendanceRow[]; errors: string[] } {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!data.length) return { rows: [], errors: ['Sheet kosong'] };
  const csvLike = data.map(row => (row as string[]).map(c => String(c ?? '')).join(',')).join('\n');
  return parseAttendanceCsv(csvLike);
}

export const DAILY_PDF_COLUMNS = [
  { header: 'Kode', accessorKey: 'Kode Karyawan' },
  { header: 'Nama', accessorKey: 'Nama' },
  { header: 'Cabang', accessorKey: 'Cabang' },
  { header: 'Masuk', accessorKey: 'Jam Masuk' },
  { header: 'Keluar', accessorKey: 'Jam Keluar' },
  { header: 'Status', accessorKey: 'Status' },
  { header: 'Sumber', accessorKey: 'Sumber' },
];

export const MONTHLY_PDF_COLUMNS = [
  { header: 'Kode', accessorKey: 'Kode Karyawan' },
  { header: 'Nama', accessorKey: 'Nama' },
  { header: 'Cabang', accessorKey: 'Cabang' },
  { header: 'Hadir', accessorKey: 'Hadir' },
  { header: 'Telat', accessorKey: 'Terlambat' },
  { header: 'Absen', accessorKey: 'Tidak Hadir' },
  { header: 'Cuti', accessorKey: 'Cuti' },
  { header: 'Rate %', accessorKey: 'Tingkat Kehadiran (%)' },
];
