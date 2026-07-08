/**
 * Central certificate & credential registry across training, licenses, compliance
 */
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

function deriveStatus(expiryDate?: string): CertStatus {
  if (!expiryDate) return 'valid';
  const exp = new Date(expiryDate);
  const now = new Date();
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring_soon';
  return 'valid';
}

function mapCert(row: any): CertificateRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    title: row.title,
    issuer: row.issuer,
    source: row.source,
    certificateNumber: row.certificate_number,
    issuedDate: row.issued_date,
    expiryDate: row.expiry_date,
    status: row.status || deriveStatus(row.expiry_date),
    documentUrl: row.document_url,
    department: row.department,
    reminderSent: row.reminder_sent,
  };
}

export async function listCertificates(filters?: { status?: CertStatus; source?: CertSource; employeeId?: string }): Promise<CertificateRecord[]> {
  if (!sequelize) return getMockCertificates(filters);
  await ensureCertificateTables();
  let sql = 'SELECT * FROM hris_certificates WHERE 1=1';
  const params: any[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.source) { params.push(filters.source); sql += ` AND source = $${params.length}`; }
  if (filters?.employeeId) { params.push(filters.employeeId); sql += ` AND employee_id = $${params.length}`; }
  sql += ' ORDER BY expiry_date ASC NULLS LAST';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return getMockCertificates(filters);
  return rows.map(mapCert);
}

export async function getCertificateAnalytics() {
  const certs = await listCertificates();
  return {
    total: certs.length,
    valid: certs.filter(c => c.status === 'valid').length,
    expiringSoon: certs.filter(c => c.status === 'expiring_soon').length,
    expired: certs.filter(c => c.status === 'expired').length,
    bySource: {
      training: certs.filter(c => c.source === 'training').length,
      license: certs.filter(c => c.source === 'license').length,
      compliance: certs.filter(c => c.source === 'compliance').length,
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
  return filters?.status ? all.filter(c => c.status === filters.status) : all;
}
