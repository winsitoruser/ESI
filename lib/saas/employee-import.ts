/**
 * Phase 20 — mass employee import (CSV/rows) with validation, dedup and
 * plan seat guardrail. Supports a dry-run preview before committing.
 */
import crypto from 'crypto';
import { getSeatUsage } from './seat-metering';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Header aliases (id/en) → canonical field
const HEADER_MAP: Record<string, string> = {
  name: 'name', nama: 'name', 'full name': 'name', 'nama lengkap': 'name',
  email: 'email', 'e-mail': 'email', surel: 'email',
  phone: 'phone', telepon: 'phone', hp: 'phone', 'no hp': 'phone', 'nomor hp': 'phone', telp: 'phone',
  position: 'position', jabatan: 'position', posisi: 'position', title: 'position',
  department: 'department', departemen: 'department', divisi: 'department', dept: 'department',
  worklocation: 'workLocation', 'work location': 'workLocation', lokasi: 'workLocation', 'lokasi kerja': 'workLocation',
  employmentcategory: 'employmentCategory', 'employment category': 'employmentCategory', kategori: 'employmentCategory', 'status kepegawaian': 'employmentCategory',
  joindate: 'joinDate', 'join date': 'joinDate', 'tanggal masuk': 'joinDate', 'tgl masuk': 'joinDate',
  basesalary: 'baseSalary', 'base salary': 'baseSalary', gaji: 'baseSalary', 'gaji pokok': 'baseSalary',
};

const VALID_CATEGORIES = new Set(['permanent', 'contract', 'daily_casual', 'labor', 'outsource', 'intern']);

export interface ParsedRow {
  __line: number;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  workLocation?: string;
  employmentCategory?: string;
  joinDate?: string;
  baseSalary?: string;
}

/** Minimal RFC-4180-ish CSV parser (quotes, embedded commas/newlines, CRLF). */
export function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const src = String(text || '').replace(/^\uFEFF/, ''); // strip BOM
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) records.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v.trim() !== '')) records.push(row); }

  if (!records.length) return { headers: [], rows: [] };

  const rawHeaders = records[0].map((h) => h.trim());
  const canonical = rawHeaders.map((h) => HEADER_MAP[h.toLowerCase()] || h.toLowerCase());
  const rows: ParsedRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const obj: any = { __line: r + 1 };
    canonical.forEach((key, idx) => {
      const val = (rec[idx] ?? '').trim();
      if (val !== '' && ['name', 'email', 'phone', 'position', 'department', 'workLocation', 'employmentCategory', 'joinDate', 'baseSalary'].includes(key)) {
        obj[key] = val;
      }
    });
    rows.push(obj);
  }
  return { headers: canonical, rows };
}

export interface ImportRowResult {
  line: number;
  email?: string;
  name?: string;
  status: 'ok' | 'invalid' | 'duplicate_file' | 'exists' | 'seat_limit';
  reason?: string;
}

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  dryRun: boolean;
  seat?: { employees: number; maxEmployees: number; remaining: number; planId: string };
  results: ImportRowResult[];
}

function validateRow(r: ParsedRow): { ok: true; clean: Required<Pick<ParsedRow, 'name' | 'email' | 'position'>> & ParsedRow } | { ok: false; reason: string } {
  if (!r.name) return { ok: false, reason: 'Nama wajib diisi' };
  if (!r.email) return { ok: false, reason: 'Email wajib diisi' };
  if (!EMAIL_RE.test(r.email)) return { ok: false, reason: 'Format email tidak valid' };
  if (!r.position) return { ok: false, reason: 'Jabatan (position) wajib diisi' };
  if (r.employmentCategory && !VALID_CATEGORIES.has(r.employmentCategory.toLowerCase())) {
    return { ok: false, reason: `Kategori tidak valid (${[...VALID_CATEGORIES].join(', ')})` };
  }
  if (r.baseSalary && Number.isNaN(Number(String(r.baseSalary).replace(/[^\d.]/g, '')))) {
    return { ok: false, reason: 'Gaji harus angka' };
  }
  return { ok: true, clean: { ...r, name: r.name, email: r.email.toLowerCase(), position: r.position } as any };
}

export async function importEmployees(opts: {
  tenantId: string | null | undefined;
  role?: string | null;
  rows: ParsedRow[];
  dryRun?: boolean;
}): Promise<ImportSummary> {
  const { tenantId, role, rows } = opts;
  const dryRun = Boolean(opts.dryRun);
  const results: ImportRowResult[] = [];
  const isPlatform = ['super_admin', 'superadmin', 'platform_admin'].includes(String(role || '').toLowerCase());

  // 1. Per-row validation + in-file dedup
  const seenEmails = new Set<string>();
  const candidates: Array<{ row: ParsedRow; email: string; name: string; position: string }> = [];
  for (const r of rows) {
    const v = validateRow(r);
    if (!v.ok) {
      results.push({ line: r.__line, email: r.email, name: r.name, status: 'invalid', reason: v.reason });
      continue;
    }
    const email = v.clean.email;
    if (seenEmails.has(email)) {
      results.push({ line: r.__line, email, name: r.name, status: 'duplicate_file', reason: 'Email duplikat dalam file' });
      continue;
    }
    seenEmails.add(email);
    candidates.push({ row: r, email, name: v.clean.name, position: v.clean.position });
  }

  // 2. Existing-email check (email is globally unique)
  let existing = new Set<string>();
  if (sequelize && candidates.length) {
    try {
      const [ex] = await sequelize.query(
        `SELECT LOWER(email) AS email FROM employees WHERE LOWER(email) IN (:emails)`,
        { replacements: { emails: candidates.map((c) => c.email) } },
      );
      existing = new Set((ex || []).map((x: any) => x.email));
    } catch { /* table may not exist — treat as none */ }
  }

  // 3. Seat guardrail
  let remaining = Infinity;
  let seatInfo: ImportSummary['seat'];
  if (!isPlatform && tenantId) {
    try {
      const usage = await getSeatUsage(tenantId);
      if (usage) {
        remaining = Math.max(0, usage.maxEmployees - usage.employees);
        seatInfo = { employees: usage.employees, maxEmployees: usage.maxEmployees, remaining, planId: usage.planId };
      }
    } catch { /* fail-open: no seat cap */ }
  }

  // 4. Decide per-candidate outcome
  const toInsert: Array<{ email: string; name: string; position: string; row: ParsedRow }> = [];
  for (const c of candidates) {
    if (existing.has(c.email)) {
      results.push({ line: c.row.__line, email: c.email, name: c.name, status: 'exists', reason: 'Email sudah terdaftar' });
      continue;
    }
    if (toInsert.length >= remaining) {
      results.push({ line: c.row.__line, email: c.email, name: c.name, status: 'seat_limit', reason: 'Melebihi kuota seat paket' });
      continue;
    }
    toInsert.push({ email: c.email, name: c.name, position: c.position, row: c.row });
  }

  // 5. Insert (unless dry-run) — raw, schema-safe INSERT so we only ever write
  // columns that actually exist (the employees table schema varies by env).
  let imported = 0;
  if (!dryRun && toInsert.length && sequelize) {
    const cols = new Set<string>();
    try {
      const [rows] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'employees'`,
      );
      (rows || []).forEach((r: any) => cols.add(r.column_name));
    } catch { /* */ }

    let baseCount = 0;
    try {
      const [c] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM employees ${tenantId ? 'WHERE tenant_id = :tid' : ''}`,
        { replacements: { tid: tenantId } },
      );
      baseCount = c?.[0]?.c || 0;
    } catch { baseCount = 0; }

    // employee_code is GLOBALLY unique in DB — namespace it per-tenant so two
    // tenants' sequences never collide while staying sequential within a tenant.
    const tenantToken = String(tenantId || 'gbl').replace(/-/g, '').slice(0, 6).toUpperCase();

    for (const item of toInsert) {
      const r = item.row;
      try {
        baseCount += 1;
        const now = new Date();
        const fields: Array<[string, any]> = [];
        const add = (col: string, val: any) => { if (cols.has(col)) fields.push([col, val]); };
        add('id', crypto.randomUUID());
        add('employee_code', `EMP-${tenantToken}-${String(baseCount).padStart(3, '0')}`);
        add('name', item.name);
        add('email', item.email);
        add('phone', r.phone || null);
        add('position', item.position);
        add('department', r.department || 'GENERAL');
        add('work_location', r.workLocation || null);
        add('status', 'active');
        add('hire_date', r.joinDate ? new Date(r.joinDate) : now);
        add('employment_category', (r.employmentCategory || 'permanent').toLowerCase());
        if (r.baseSalary) add('base_salary', Number(String(r.baseSalary).replace(/[^\d.]/g, '')));
        add('tenant_id', tenantId || null);
        add('created_at', now);
        add('updated_at', now);

        const colNames = fields.map((f) => `"${f[0]}"`).join(', ');
        const placeholders = fields.map((_, i) => `:v${i}`).join(', ');
        const repl: Record<string, any> = {};
        fields.forEach((f, i) => { repl[`v${i}`] = f[1]; });

        await sequelize.query(
          `INSERT INTO employees (${colNames}) VALUES (${placeholders})`,
          { replacements: repl },
        );
        imported += 1;
        results.push({ line: r.__line, email: item.email, name: item.name, status: 'ok' });
      } catch (e: any) {
        const msg = String(e?.message || '');
        const isEmailDupe = /emp_email_unique|\bemail\b/i.test(msg);
        results.push({
          line: r.__line,
          email: item.email,
          name: item.name,
          status: isEmailDupe ? 'exists' : 'invalid',
          reason: isEmailDupe ? 'Email sudah terdaftar' : (msg || 'Gagal simpan'),
        });
      }
    }
  } else if (dryRun) {
    // Mark would-insert rows as ok (preview)
    for (const item of toInsert) {
      results.push({ line: item.row.__line, email: item.email, name: item.name, status: 'ok' });
    }
  }

  results.sort((a, b) => a.line - b.line);
  const skipped = results.filter((r) => ['exists', 'seat_limit', 'duplicate_file'].includes(r.status)).length;
  const invalid = results.filter((r) => r.status === 'invalid').length;

  return {
    total: rows.length,
    imported: dryRun ? 0 : imported,
    skipped,
    invalid,
    dryRun,
    seat: seatInfo,
    results,
  };
}
