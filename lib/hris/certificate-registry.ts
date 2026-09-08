/**
 * Central certificate & credential registry across training, licenses, compliance
 */
import { allowHrMockFallback, type HrisDataSource } from '@/lib/hris/data-source';
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type CertSource = 'training' | 'license' | 'compliance' | 'external' | 'internal';
export type CertStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked';

export interface CertificateRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  issuer: string;
  source: CertSource;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: CertStatus;
  documentUrl?: string;
  department?: string;
  reminderSent?: boolean;
  daysToExpiry?: number | null;
  rarity?: 'common' | 'uncommon' | 'rare' | 'critical';
  holderCount?: number;
  notes?: string;
  writable?: boolean;
}

export interface CertificateListResult {
  records: CertificateRecord[];
  dataSource: HrisDataSource;
}

export interface RareCertificateInsight {
  title: string;
  holderCount: number;
  holders: Array<{ employeeId: string; employeeName: string; department?: string; status: CertStatus; expiryDate?: string }>;
  rarity: 'uncommon' | 'rare' | 'critical';
  risk: string;
}

async function addCol(sql: string) {
  try { await sequelize.query(sql); } catch { /* exists */ }
}

export async function ensureCertificateTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_certificates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      employee_name VARCHAR(200) NOT NULL,
      title VARCHAR(300) NOT NULL,
      issuer VARCHAR(200),
      source VARCHAR(30) DEFAULT 'training',
      certificate_number VARCHAR(100),
      issued_date DATE,
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'valid',
      document_url TEXT,
      department VARCHAR(50),
      reminder_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS notes TEXT`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS action_log JSONB DEFAULT '[]'::jsonb`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS previous_employee_id TEXT`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS previous_employee_name VARCHAR(200)`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS renewed_from UUID`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS verify_token TEXT`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS curriculum_id UUID`);
  await addCol(`ALTER TABLE hris_certificates ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`);
  return true;
}

export function deriveStatus(expiryDate?: string): CertStatus {
  if (!expiryDate) return 'valid';
  const exp = new Date(expiryDate);
  const now = new Date();
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring_soon';
  return 'valid';
}

export function daysToExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const now = new Date();
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function rarityFromCount(n: number): CertificateRecord['rarity'] {
  if (n <= 1) return 'critical';
  if (n <= 2) return 'rare';
  if (n <= 5) return 'uncommon';
  return 'common';
}

function mapCert(row: any, writable = true): CertificateRecord {
  const expiry = row.expiry_date ? String(row.expiry_date).split('T')[0] : undefined;
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    title: row.title,
    issuer: row.issuer || '',
    source: row.source || 'internal',
    certificateNumber: row.certificate_number,
    issuedDate: row.issued_date ? String(row.issued_date).split('T')[0] : undefined,
    expiryDate: expiry,
    status: row.status === 'revoked' ? 'revoked' : deriveStatus(expiry),
    documentUrl: row.document_url,
    department: row.department,
    reminderSent: row.reminder_sent,
    daysToExpiry: daysToExpiry(expiry),
    notes: row.notes || undefined,
    writable,
  };
}

function mapEmployeeCert(row: any): CertificateRecord {
  const expiry = row.expiry_date ? String(row.expiry_date).split('T')[0] : undefined;
  return {
    id: `emp-${row.id}`,
    employeeId: String(row.employee_id),
    employeeName: row.employee_name || 'Karyawan',
    title: row.title,
    issuer: row.issuer || '',
    source: 'internal',
    certificateNumber: row.certificate_number,
    issuedDate: row.issued_date ? String(row.issued_date).split('T')[0] : undefined,
    expiryDate: expiry,
    status: deriveStatus(expiry),
    documentUrl: row.document_url,
    department: row.department,
    daysToExpiry: daysToExpiry(expiry),
    writable: false,
  };
}

async function fetchLegacyProgramCerts(tenantId: string | null): Promise<CertificateRecord[]> {
  if (!sequelize || !tenantId) return [];
  try {
    const { fetchLegacyTrainingCerts } = await import('./lms/training-bridge');
    const rows = await fetchLegacyTrainingCerts(tenantId);
    return rows.map((row: any) => {
      const expiry = row.expiry_date ? String(row.expiry_date).split('T')[0] : undefined;
      return {
        id: `legacy-${row.id}`,
        employeeId: String(row.employee_id),
        employeeName: row.employee_name,
        title: row.title,
        issuer: row.issuer || 'Program Training',
        source: 'training' as CertSource,
        certificateNumber: row.certificate_number,
        issuedDate: row.issued_date ? String(row.issued_date).split('T')[0] : undefined,
        expiryDate: expiry,
        status: deriveStatus(expiry),
        daysToExpiry: daysToExpiry(expiry),
        writable: false,
      };
    });
  } catch { return []; }
}

async function fetchRegistryCerts(tenantId: string | null): Promise<CertificateRecord[]> {
  if (!sequelize || !tenantId) return [];
  await ensureCertificateTables();
  try {
    const [rows] = await sequelize.query(`
      SELECT * FROM hris_certificates
      WHERE tenant_id IS NOT NULL AND tenant_id = :tid
      ORDER BY expiry_date ASC NULLS LAST
    `, { replacements: { tid: tenantId } });
    return (rows || [])
      .filter((r: any) => r.tenant_id != null && String(r.tenant_id) === String(tenantId))
      .map((r: any) => mapCert(r, true));
  } catch {
    return [];
  }
}

async function fetchEmployeeCerts(tenantId: string | null): Promise<CertificateRecord[]> {
  if (!sequelize || !tenantId) return [];
  try {
    const [rows] = await sequelize.query(`
      SELECT ec.id, ec.employee_id, e.name AS employee_name, ec.name AS title,
        ec.issuing_organization AS issuer, ec.credential_id AS certificate_number,
        ec.issue_date AS issued_date, ec.expiry_date, ec.document_url, e.department,
        e.tenant_id
      FROM employee_certifications ec
      JOIN employees e ON ec.employee_id = e.id
      WHERE ec.is_active IS DISTINCT FROM false
        AND e.tenant_id IS NOT NULL
        AND e.tenant_id = :tid
      ORDER BY ec.expiry_date ASC NULLS LAST
    `, { replacements: { tid: tenantId } });
    return (rows || [])
      .filter((r: any) => r.tenant_id != null && String(r.tenant_id) === String(tenantId))
      .map(mapEmployeeCert);
  } catch {
    return [];
  }
}

function mergeCerts(registry: CertificateRecord[], employee: CertificateRecord[]): CertificateRecord[] {
  const map = new Map<string, CertificateRecord>();
  for (const c of registry) map.set(c.id, c);
  for (const c of employee) map.set(c.id, c);
  return Array.from(map.values()).sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });
}

function annotateRarity(records: CertificateRecord[]): CertificateRecord[] {
  const counts = new Map<string, number>();
  for (const c of records) {
    if (c.status === 'revoked') continue;
    const key = c.title.trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return records.map((c) => {
    const key = c.title.trim().toLowerCase();
    const n = counts.get(key) || 1;
    return { ...c, holderCount: n, rarity: rarityFromCount(n) };
  });
}

function applyFilters(records: CertificateRecord[], filters?: {
  status?: CertStatus; source?: CertSource; employeeId?: string; rarity?: string; window?: string;
}) {
  return records.filter((c) => {
    if (filters?.status && c.status !== filters.status) return false;
    if (filters?.source && c.source !== filters.source) return false;
    if (filters?.employeeId && c.employeeId !== filters.employeeId) return false;
    if (filters?.rarity && c.rarity !== filters.rarity) return false;
    if (filters?.window === 'd30' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30)) return false;
    if (filters?.window === 'd60' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 60)) return false;
    if (filters?.window === 'd90' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 90)) return false;
    if (filters?.window === 'expired' && c.status !== 'expired') return false;
    if (filters?.window === 'rare' && !(c.rarity === 'rare' || c.rarity === 'critical')) return false;
    return true;
  });
}

export async function listCertificates(
  filters?: { status?: CertStatus; source?: CertSource; employeeId?: string; rarity?: string; window?: string },
  tenantId?: string | null,
): Promise<CertificateListResult> {
  if (!sequelize) {
    const mock = annotateRarity(getMockCertificates(filters));
    return {
      records: allowHrMockFallback() ? applyFilters(mock, filters) : [],
      dataSource: allowHrMockFallback() ? 'demo' : 'empty',
    };
  }

  if (!tenantId) {
    return { records: [], dataSource: 'empty' };
  }

  const merged = annotateRarity(mergeCerts(
    mergeCerts(await fetchRegistryCerts(tenantId), await fetchEmployeeCerts(tenantId)),
    await fetchLegacyProgramCerts(tenantId),
  ));
  if (merged.length) {
    return { records: applyFilters(merged, filters), dataSource: 'live' };
  }

  if (allowHrMockFallback()) {
    return { records: applyFilters(annotateRarity(getMockCertificates(filters)), filters), dataSource: 'demo' };
  }
  return { records: [], dataSource: 'empty' };
}

export function buildRareInsights(records: CertificateRecord[]): RareCertificateInsight[] {
  const byTitle = new Map<string, CertificateRecord[]>();
  for (const c of records) {
    if (c.status === 'revoked') continue;
    const key = c.title.trim();
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push(c);
  }
  const out: RareCertificateInsight[] = [];
  for (const [title, holders] of byTitle) {
    const n = holders.length;
    if (n > 5) continue;
    const rarity = rarityFromCount(n) as RareCertificateInsight['rarity'];
    if (rarity === 'common') continue;
    const risk = n === 1
      ? 'Single point of failure — hanya 1 pemegang. Risiko tinggi jika resign/mutasi.'
      : n === 2
        ? 'Sangat langka — 2 pemegang. Jadwalkan knowledge transfer.'
        : 'Langka di organisasi — pertimbangkan batch training.';
    out.push({
      title,
      holderCount: n,
      rarity,
      risk,
      holders: holders.map((h) => ({
        employeeId: h.employeeId,
        employeeName: h.employeeName,
        department: h.department,
        status: h.status,
        expiryDate: h.expiryDate,
      })),
    });
  }
  return out.sort((a, b) => a.holderCount - b.holderCount || a.title.localeCompare(b.title));
}

export async function getCertificateAnalytics(tenantId?: string | null) {
  const { records, dataSource } = await listCertificates(undefined, tenantId);
  const rare = buildRareInsights(records);
  return {
    dataSource,
    total: records.length,
    valid: records.filter((c) => c.status === 'valid').length,
    expiringSoon: records.filter((c) => c.status === 'expiring_soon').length,
    expired: records.filter((c) => c.status === 'expired').length,
    revoked: records.filter((c) => c.status === 'revoked').length,
    critical30: records.filter((c) => c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30).length,
    warning60: records.filter((c) => c.daysToExpiry != null && c.daysToExpiry > 30 && c.daysToExpiry <= 60).length,
    rareCount: rare.length,
    criticalRare: rare.filter((r) => r.rarity === 'critical').length,
    bySource: {
      training: records.filter((c) => c.source === 'training').length,
      license: records.filter((c) => c.source === 'license').length,
      compliance: records.filter((c) => c.source === 'compliance').length,
      external: records.filter((c) => c.source === 'external').length,
      internal: records.filter((c) => c.source === 'internal').length,
    },
    rare,
    actionQueue: records
      .filter((c) => c.status === 'expired' || c.status === 'expiring_soon' || c.rarity === 'critical')
      .slice(0, 12)
      .map((c) => ({
        id: c.id,
        title: c.title,
        employeeName: c.employeeName,
        status: c.status,
        daysToExpiry: c.daysToExpiry,
        rarity: c.rarity,
        suggestedAction:
          c.status === 'expired' ? 'renew'
            : c.daysToExpiry != null && c.daysToExpiry <= 30 ? 'remind_or_renew'
              : c.rarity === 'critical' ? 'plan_backup' : 'monitor',
      })),
  };
}

async function appendActionLog(id: string, tenantId: string, entry: Record<string, any>) {
  await sequelize.query(`
    UPDATE hris_certificates
    SET action_log = COALESCE(action_log, '[]'::jsonb) || :entry::jsonb,
        updated_at = NOW()
    WHERE id = :id AND tenant_id = :tid
  `, {
    replacements: {
      id,
      tid: tenantId,
      entry: JSON.stringify([{ ...entry, at: new Date().toISOString() }]),
    },
  });
}

export async function remindCertificate(opts: {
  tenantId: string;
  id: string;
  actorId?: string | null;
  note?: string;
}) {
  await ensureCertificateTables();
  const [rows] = await sequelize.query(
    `UPDATE hris_certificates SET reminder_sent = true, reminder_sent_at = NOW(), updated_at = NOW()
     WHERE id = :id AND tenant_id = :tid RETURNING *`,
    { replacements: { id: opts.id, tid: opts.tenantId } },
  );
  if (!rows?.length) throw new Error('Sertifikat tidak ditemukan (hanya registry editable)');
  await appendActionLog(opts.id, opts.tenantId, {
    action: 'remind',
    actorId: opts.actorId || null,
    note: opts.note || 'Reminder kedaluwarsa dikirim ke karyawan/manager',
  });
  return mapCert(rows[0], true);
}

export async function renewCertificate(opts: {
  tenantId: string;
  id: string;
  newExpiryDate: string;
  actorId?: string | null;
  note?: string;
  issuedDate?: string;
}) {
  await ensureCertificateTables();
  const status = deriveStatus(opts.newExpiryDate);
  const [rows] = await sequelize.query(`
    UPDATE hris_certificates SET
      expiry_date = :exp,
      issued_date = COALESCE(:issued, issued_date),
      status = :st,
      reminder_sent = false,
      reminder_sent_at = NULL,
      updated_at = NOW()
    WHERE id = :id AND tenant_id = :tid
    RETURNING *
  `, {
    replacements: {
      id: opts.id,
      tid: opts.tenantId,
      exp: opts.newExpiryDate,
      issued: opts.issuedDate || null,
      st: status,
    },
  });
  if (!rows?.length) throw new Error('Sertifikat tidak ditemukan (hanya registry editable)');
  await appendActionLog(opts.id, opts.tenantId, {
    action: 'renew',
    actorId: opts.actorId || null,
    newExpiryDate: opts.newExpiryDate,
    note: opts.note || 'Diperpanjang oleh HR',
  });
  return mapCert(rows[0], true);
}

export async function transferCertificate(opts: {
  tenantId: string;
  id: string;
  toEmployeeId: string;
  toEmployeeName: string;
  toDepartment?: string;
  actorId?: string | null;
  note?: string;
}) {
  await ensureCertificateTables();
  const [cur] = await sequelize.query(
    `SELECT * FROM hris_certificates WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { replacements: { id: opts.id, tid: opts.tenantId } },
  );
  if (!cur?.length) throw new Error('Sertifikat tidak ditemukan (hanya registry editable)');
  const prev = cur[0];
  const [rows] = await sequelize.query(`
    UPDATE hris_certificates SET
      previous_employee_id = employee_id,
      previous_employee_name = employee_name,
      employee_id = :eid,
      employee_name = :ename,
      department = COALESCE(:dept, department),
      updated_at = NOW()
    WHERE id = :id AND tenant_id = :tid
    RETURNING *
  `, {
    replacements: {
      id: opts.id,
      tid: opts.tenantId,
      eid: opts.toEmployeeId,
      ename: opts.toEmployeeName,
      dept: opts.toDepartment || null,
    },
  });
  await appendActionLog(opts.id, opts.tenantId, {
    action: 'transfer',
    actorId: opts.actorId || null,
    from: { id: prev.employee_id, name: prev.employee_name },
    to: { id: opts.toEmployeeId, name: opts.toEmployeeName },
    note: opts.note || 'Dipindahkan / knowledge transfer credential',
  });
  return mapCert(rows[0], true);
}

export async function revokeCertificate(opts: {
  tenantId: string;
  id: string;
  actorId?: string | null;
  note?: string;
}) {
  await ensureCertificateTables();
  const [rows] = await sequelize.query(`
    UPDATE hris_certificates SET status = 'revoked', updated_at = NOW()
    WHERE id = :id AND tenant_id = :tid RETURNING *
  `, { replacements: { id: opts.id, tid: opts.tenantId } });
  if (!rows?.length) throw new Error('Sertifikat tidak ditemukan (hanya registry editable)');
  await appendActionLog(opts.id, opts.tenantId, {
    action: 'revoke',
    actorId: opts.actorId || null,
    note: opts.note || 'Dicabut oleh HR',
  });
  return mapCert(rows[0], true);
}

export async function createManualCertificate(opts: {
  tenantId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  issuer?: string;
  source?: CertSource;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  department?: string;
  notes?: string;
  actorId?: string | null;
}) {
  await ensureCertificateTables();
  const id = crypto.randomUUID();
  const status = opts.expiryDate ? deriveStatus(opts.expiryDate) : 'valid';
  const [rows] = await sequelize.query(`
    INSERT INTO hris_certificates (
      id, tenant_id, employee_id, employee_name, title, issuer, source,
      certificate_number, issued_date, expiry_date, status, department, notes, action_log
    ) VALUES (
      :id, :tid, :eid, :ename, :title, :issuer, :source,
      :num, :issued, :expiry, :st, :dept, :notes, :log::jsonb
    ) RETURNING *
  `, {
    replacements: {
      id,
      tid: opts.tenantId,
      eid: opts.employeeId,
      ename: opts.employeeName,
      title: opts.title,
      issuer: opts.issuer || 'Manual HR',
      source: opts.source || 'external',
      num: opts.certificateNumber || `HR-${Date.now().toString(36).toUpperCase()}`,
      issued: opts.issuedDate || new Date().toISOString().slice(0, 10),
      expiry: opts.expiryDate || null,
      st: status,
      dept: opts.department || null,
      notes: opts.notes || null,
      log: JSON.stringify([{ action: 'create', actorId: opts.actorId || null, at: new Date().toISOString() }]),
    },
  });
  return mapCert(rows[0], true);
}

function getMockCertificates(filters?: { status?: CertStatus }): CertificateRecord[] {
  const all: CertificateRecord[] = [
    { id: 'c1', employeeId: '1', employeeName: 'Andi Saputra', title: 'Leadership Excellence', issuer: 'Humanify Academy', source: 'training', certificateNumber: 'CERT-2025-001', issuedDate: '2025-06-15', expiryDate: '2027-06-15', status: 'valid', department: 'Sales', daysToExpiry: 400, writable: true },
    { id: 'c2', employeeId: '2', employeeName: 'Maya Putri', title: 'Food Safety & Hygiene', issuer: 'BPOM Certified', source: 'compliance', certificateNumber: 'FSH-2024-088', issuedDate: '2024-03-01', expiryDate: '2026-03-01', status: 'expired', department: 'Operations', daysToExpiry: -20, writable: true },
    { id: 'c3', employeeId: '3', employeeName: 'Budi Santoso', title: 'Sertifikat Kompetensi Akuntan', issuer: 'IAI', source: 'license', certificateNumber: 'IAI-12345', issuedDate: '2020-01-01', expiryDate: '2026-08-20', status: 'expiring_soon', department: 'Finance', daysToExpiry: 15, writable: true },
    { id: 'c4', employeeId: '5', employeeName: 'Dimas Prasetyo', title: 'AWS Solutions Architect', issuer: 'Amazon Web Services', source: 'external', certificateNumber: 'AWS-SAA-2025', issuedDate: '2025-01-20', expiryDate: '2028-01-20', status: 'valid', department: 'IT', daysToExpiry: 500, writable: true },
    { id: 'c5', employeeId: '4', employeeName: 'Siti Rahayu', title: 'HR Professional Certification', issuer: 'Humanify Internal', source: 'internal', certificateNumber: 'HRP-2025-012', issuedDate: '2025-09-01', expiryDate: '2026-09-01', status: 'valid', department: 'HR', daysToExpiry: 40, writable: true },
    { id: 'c6', employeeId: '6', employeeName: 'Rina Wijaya', title: 'ISO 27001 Lead Auditor', issuer: 'BSI', source: 'license', certificateNumber: 'ISO-LA-01', issuedDate: '2024-01-01', expiryDate: '2026-09-15', status: 'expiring_soon', department: 'IT', daysToExpiry: 50, writable: true },
  ];
  return filters?.status ? all.filter((c) => c.status === filters.status) : all;
}
