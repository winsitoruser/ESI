/**
 * Privy ID e-sign service — document workflow (sandbox-ready)
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type ESignStatus = 'draft' | 'pending' | 'partially_signed' | 'completed' | 'rejected' | 'expired';
export type ESignDocType = 'pkwt' | 'pkwtt' | 'offer_letter' | 'nda' | 'mutation' | 'paklaring' | 'sp';

export interface ESignDocument {
  id: string;
  docType: ESignDocType;
  title: string;
  employeeId?: string;
  employeeName?: string;
  status: ESignStatus;
  signers: { name: string; email: string; role: string; signed: boolean; signedAt?: string }[];
  privyDocToken?: string;
  createdAt?: string;
  completedAt?: string;
}

export async function ensureESignTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_esign_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      doc_type VARCHAR(30) NOT NULL,
      title VARCHAR(300) NOT NULL,
      employee_id TEXT,
      employee_name VARCHAR(200),
      status VARCHAR(30) DEFAULT 'draft',
      signers JSONB DEFAULT '[]',
      privy_doc_token VARCHAR(200),
      document_url TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  return true;
}

function mapDoc(row: any): ESignDocument {
  const signers = typeof row.signers === 'string' ? JSON.parse(row.signers) : (row.signers || []);
  return {
    id: row.id,
    docType: row.doc_type,
    title: row.title,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    status: row.status,
    signers,
    privyDocToken: row.privy_doc_token,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function listESignDocuments(status?: ESignStatus): Promise<ESignDocument[]> {
  if (!sequelize) return getMockDocuments();
  await ensureESignTables();
  let sql = 'SELECT * FROM hris_esign_documents ORDER BY created_at DESC LIMIT 100';
  const params: any[] = [];
  if (status) { sql = 'SELECT * FROM hris_esign_documents WHERE status = $1 ORDER BY created_at DESC LIMIT 100'; params.push(status); }
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return getMockDocuments();
  return rows.map(mapDoc);
}

export async function createESignDocument(data: {
  docType: ESignDocType; title: string; employeeId?: string; employeeName?: string;
  signers: { name: string; email: string; role: string }[];
}): Promise<ESignDocument | null> {
  if (!sequelize) {
    return {
      id: `mock-${Date.now()}`, docType: data.docType, title: data.title,
      employeeId: data.employeeId, employeeName: data.employeeName,
      status: 'pending', signers: data.signers.map(s => ({ ...s, signed: false })),
      privyDocToken: `PRIVY-SANDBOX-${Date.now()}`,
    };
  }
  await ensureESignTables();
  const signers = data.signers.map(s => ({ ...s, signed: false }));
  const token = `PRIVY-${Date.now().toString(36).toUpperCase()}`;
  const [rows] = await sequelize.query(`
    INSERT INTO hris_esign_documents (doc_type, title, employee_id, employee_name, status, signers, privy_doc_token)
    VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *
  `, { bind: [data.docType, data.title, data.employeeId || null, data.employeeName || null, JSON.stringify(signers), token] });
  return rows?.[0] ? mapDoc(rows[0]) : null;
}

export async function simulateSignDocument(id: string, signerEmail: string): Promise<ESignDocument | null> {
  const docs = await listESignDocuments();
  const doc = docs.find(d => d.id === id);
  if (!doc) return null;

  const signers = doc.signers.map(s =>
    s.email === signerEmail ? { ...s, signed: true, signedAt: new Date().toISOString() } : s
  );
  const allSigned = signers.every(s => s.signed);
  const status: ESignStatus = allSigned ? 'completed' : 'partially_signed';

  if (sequelize) {
    await ensureESignTables();
    const [rows] = await sequelize.query(`
      UPDATE hris_esign_documents SET signers = $2, status = $3,
        completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, { bind: [id, JSON.stringify(signers), status] });
    return rows?.[0] ? mapDoc(rows[0]) : null;
  }

  return { ...doc, signers, status, completedAt: allSigned ? new Date().toISOString() : undefined };
}

function getMockDocuments(): ESignDocument[] {
  return [
    {
      id: 'es1', docType: 'pkwt', title: 'PKWT - Maya Putri (Operations)', employeeId: '2', employeeName: 'Maya Putri',
      status: 'completed', privyDocToken: 'PRIVY-ABC123',
      signers: [
        { name: 'Maya Putri', email: 'maya@company.com', role: 'Karyawan', signed: true, signedAt: '2026-06-01' },
        { name: 'HR Manager', email: 'hr@company.com', role: 'HR', signed: true, signedAt: '2026-06-01' },
      ],
    },
    {
      id: 'es2', docType: 'offer_letter', title: 'Offer Letter - Dimas Prasetyo', employeeId: '5', employeeName: 'Dimas Prasetyo',
      status: 'partially_signed', privyDocToken: 'PRIVY-DEF456',
      signers: [
        { name: 'Dimas Prasetyo', email: 'dimas@company.com', role: 'Kandidat', signed: true, signedAt: '2026-07-05' },
        { name: 'HR Manager', email: 'hr@company.com', role: 'HR', signed: false },
      ],
    },
    {
      id: 'es3', docType: 'mutation', title: 'Surat Mutasi - Budi Santoso', employeeId: '3', employeeName: 'Budi Santoso',
      status: 'pending', privyDocToken: 'PRIVY-GHI789',
      signers: [
        { name: 'Budi Santoso', email: 'budi@company.com', role: 'Karyawan', signed: false },
        { name: 'Director', email: 'dir@company.com', role: 'Approver', signed: false },
      ],
    },
  ];
}
