/**
 * Central certificate & credential registry across training, licenses, compliance
 */
import { allowHrMockFallback, type HrisDataSource } from '@/lib/hris/data-source';

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
}

export interface CertificateListResult {
  records: CertificateRecord[];
  dataSource: HrisDataSource;
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

function mapCert(row: any): CertificateRecord {
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
    status: deriveStatus(expiry),
    documentUrl: row.document_url,
    department: row.department,
    reminderSent: row.reminder_sent,
  };
}

function mapEmployeeCert(row: any): CertificateRecord {
  const expiry = row.expiry_date ? String(row.expiry_date).split('T')[0] : undefined;
  return {
    id: String(row.id),
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
      WHERE tenant_id = :tid
      ORDER BY expiry_date ASC NULLS LAST
    `, { replacements: { tid: tenantId } });
    return (rows || []).map(mapCert);
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
        ec.issue_date AS issued_date, ec.expiry_date, ec.document_url, e.department
      FROM employee_certifications ec
      JOIN employees e ON ec.employee_id = e.id
      WHERE ec.is_active IS DISTINCT FROM false
        AND e.tenant_id = :tid
      ORDER BY ec.expiry_date ASC NULLS LAST
    `, { replacements: { tid: tenantId } });
    return (rows || []).map(mapEmployeeCert);
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

function applyFilters(records: CertificateRecord[], filters?: { status?: CertStatus; source?: CertSource; employeeId?: string }) {
  return records.filter((c) => {
    if (filters?.status && c.status !== filters.status) return false;
    if (filters?.source && c.source !== filters.source) return false;
    if (filters?.employeeId && c.employeeId !== filters.employeeId) return false;
    return true;
  });
}

export async function listCertificates(
  filters?: { status?: CertStatus; source?: CertSource; employeeId?: string },
  tenantId?: string | null,
): Promise<CertificateListResult> {
  if (!sequelize) {
    const mock = getMockCertificates(filters);
    return {
      records: allowHrMockFallback() ? mock : [],
      dataSource: allowHrMockFallback() ? 'demo' : 'empty',
    };
  }

  if (!tenantId) {
    return { records: [], dataSource: 'empty' };
  }

  const merged = mergeCerts(
    mergeCerts(await fetchRegistryCerts(tenantId), await fetchEmployeeCerts(tenantId)),
    await fetchLegacyProgramCerts(tenantId),
  );
  if (merged.length) {
    return { records: applyFilters(merged, filters), dataSource: 'live' };
  }

  if (allowHrMockFallback()) {
    return { records: getMockCertificates(filters), dataSource: 'demo' };
  }
  return { records: [], dataSource: 'empty' };
}

export async function getCertificateAnalytics(tenantId?: string | null) {
  const { records, dataSource } = await listCertificates(undefined, tenantId);
  return {
    dataSource,
    total: records.length,
    valid: records.filter((c) => c.status === 'valid').length,
    expiringSoon: records.filter((c) => c.status === 'expiring_soon').length,
    expired: records.filter((c) => c.status === 'expired').length,
    bySource: {
      training: records.filter((c) => c.source === 'training').length,
      license: records.filter((c) => c.source === 'license').length,
      compliance: records.filter((c) => c.source === 'compliance').length,
    },
  };
}

function getMockCertificates(filters?: { status?: CertStatus }): CertificateRecord[] {
  const all: CertificateRecord[] = [
    { id: 'c1', employeeId: '1', employeeName: 'Andi Saputra', title: 'Leadership Excellence', issuer: 'Humanify Academy', source: 'training', certificateNumber: 'CERT-2025-001', issuedDate: '2025-06-15', expiryDate: '2027-06-15', status: 'valid', department: 'Sales' },
    { id: 'c2', employeeId: '2', employeeName: 'Maya Putri', title: 'Food Safety & Hygiene', issuer: 'BPOM Certified', source: 'compliance', certificateNumber: 'FSH-2024-088', issuedDate: '2024-03-01', expiryDate: '2026-03-01', status: 'expired', department: 'Operations' },
    { id: 'c3', employeeId: '3', employeeName: 'Budi Santoso', title: 'Sertifikat Kompetensi Akuntan', issuer: 'IAI', source: 'license', certificateNumber: 'IAI-12345', issuedDate: '2020-01-01', expiryDate: '2026-08-01', status: 'expiring_soon', department: 'Finance' },
    { id: 'c4', employeeId: '5', employeeName: 'Dimas Prasetyo', title: 'AWS Solutions Architect', issuer: 'Amazon Web Services', source: 'external', certificateNumber: 'AWS-SAA-2025', issuedDate: '2025-01-20', expiryDate: '2028-01-20', status: 'valid', department: 'IT' },
    { id: 'c5', employeeId: '4', employeeName: 'Siti Rahayu', title: 'HR Professional Certification', issuer: 'Humanify Internal', source: 'internal', certificateNumber: 'HRP-2025-012', issuedDate: '2025-09-01', expiryDate: '2026-09-01', status: 'valid', department: 'HR' },
  ];
  return filters?.status ? all.filter((c) => c.status === filters.status) : all;
}
