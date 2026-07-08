import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { MAX_DOCUMENT_SIZE_MB } from '../../../lib/hris/employee-document-types';
import {
  parseDocumentUpload,
  fieldVal,
  asUuidOrNull,
  saveEmployeeDocument,
  deleteEmployeeDocumentRecord,
  verifyEmployeeTenant,
  verifyDocumentTenant,
  listEmployeeDocuments,
  resolveEmployeeDocumentFile,
} from '../../../lib/hris/employee-document-service';
import { computeDocumentCompleteness } from '../../../lib/hris/employee-document-types';
import { ensureEmployeeDocumentsTable } from '../../../lib/hris/ensure-employee-documents-table';

export const config = {
  api: { bodyParser: false },
};

let sequelize: any;
try {
  sequelize = require('../../../lib/sequelize');
} catch {
  /* dev fallback */
}

function getTenantId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.tenantId || null;
}

function getUserId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.id || null;
}

async function readJsonBody(req: NextApiRequest): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, any>;
  }
  const raw = await new Promise<string>((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureEmployeeDocumentsTable(sequelize);
  const tenantId = getTenantId(req);
  const { action } = req.query;

  if (req.method === 'GET' && action === 'completeness') {
    const employeeId = req.query.employee_id as string;
    if (!employeeId) return res.status(400).json({ success: false, error: 'employee_id wajib diisi' });
    const isAllowed = await verifyEmployeeTenant(sequelize, employeeId, tenantId);
    if (!isAllowed) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });
    const documents = await listEmployeeDocuments(sequelize, employeeId, tenantId);
    return res.json({ success: true, data: { documents, completeness: computeDocumentCompleteness(documents) } });
  }

  if (req.method === 'GET' && action === 'download') {
    return handleDownload(req, res, tenantId);
  }

  if (req.method === 'POST') {
    return handleUpload(req, res, tenantId);
  }

  if (req.method === 'PATCH' && action === 'verify') {
    return handleVerify(req, res, tenantId);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res, tenantId);
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleDownload(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const docId = req.query.id as string;
  if (!docId) return res.status(400).json({ success: false, error: 'id dokumen wajib diisi' });

  try {
    const file = await resolveEmployeeDocumentFile(sequelize, docId, tenantId);
    if (!file) return res.status(404).json({ success: false, error: 'File dokumen tidak ditemukan' });

    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.fileName)}"`);
    fs.createReadStream(file.fullPath).pipe(res);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Gagal mengunduh dokumen' });
  }
}

async function handleUpload(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  try {
    const [fields, files] = await parseDocumentUpload(req);

    const employeeId = fieldVal(fields, 'employee_id');
    const documentType = fieldVal(fields, 'document_type');
    const title = fieldVal(fields, 'title');
    const existingId = fieldVal(fields, 'id') || null;

    if (!employeeId) return res.status(400).json({ success: false, error: 'employee_id wajib diisi' });
    if (!documentType) return res.status(400).json({ success: false, error: 'Tipe dokumen wajib dipilih' });
    if (!title) return res.status(400).json({ success: false, error: 'Judul dokumen wajib diisi' });

    const isEmployeeAllowed = await verifyEmployeeTenant(sequelize, employeeId, tenantId);
    if (!isEmployeeAllowed) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!existingId && !uploadedFile?.filepath) {
      return res.status(400).json({ success: false, error: 'File dokumen wajib diunggah' });
    }

    if (existingId) {
      const isDocAllowed = await verifyDocumentTenant(sequelize, existingId, tenantId);
      if (!isDocAllowed) return res.status(404).json({ success: false, error: 'Dokumen tidak ditemukan' });
    }

    const data = await saveEmployeeDocument({
      sequelize,
      tenantId,
      employeeId,
      documentType,
      title,
      documentNumber: fieldVal(fields, 'document_number') || null,
      description: fieldVal(fields, 'description') || null,
      issueDate: fieldVal(fields, 'issue_date') || null,
      expiryDate: fieldVal(fields, 'expiry_date') || null,
      signedBy: fieldVal(fields, 'signed_by') || null,
      existingId,
      uploadedFile: uploadedFile || null,
      createdBy: getUserId(req),
      replaceExisting: fieldVal(fields, 'replace_existing') === 'true',
    });

    return res.status(existingId ? 200 : 201).json({
      success: true,
      data,
      message: existingId ? 'Dokumen berhasil diperbarui' : 'Dokumen berhasil diunggah',
    });
  } catch (error: any) {
    if (error?.code === 'INVALID_FILE') {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: `Ukuran file melebihi ${MAX_DOCUMENT_SIZE_MB}MB` });
    }
    return res.status(500).json({ success: false, error: error?.message || 'Gagal mengunggah dokumen' });
  }
}

async function handleVerify(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id, status, rejection_reason } = await readJsonBody(req);
  if (!id || !status) return res.status(400).json({ success: false, error: 'id dan status wajib diisi' });
  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status tidak valid' });
  }

  const isAllowed = await verifyDocumentTenant(sequelize, String(id), tenantId);
  if (!isAllowed) return res.status(404).json({ success: false, error: 'Dokumen tidak ditemukan' });

  try {
    const { getExpiryState } = require('../../../lib/hris/employee-document-types');
    const [existing]: any = await sequelize.query(
      `SELECT expiry_date, metadata FROM employee_documents WHERE id = :id`,
      { replacements: { id } }
    );
    const expiryDate = existing?.[0]?.expiry_date;
    const prevMeta = existing?.[0]?.metadata || {};
    const newStatus = status === 'verified' && getExpiryState(expiryDate) === 'expired' ? 'expired' : status;
    const metadata = {
      ...prevMeta,
      verification_status: newStatus,
      verified_by: asUuidOrNull(getUserId(req)),
      verified_at: new Date().toISOString(),
      ...(rejection_reason ? { rejection_reason } : {}),
    };

    const replacements: any = { id, status: newStatus, metadata: JSON.stringify(metadata) };
    const whereClause = tenantId ? 'WHERE id = :id AND tenant_id = :tenantId' : 'WHERE id = :id';
    if (tenantId) replacements.tenantId = asUuidOrNull(tenantId);

    await sequelize.query(
      `UPDATE employee_documents SET status = :status, metadata = :metadata::jsonb, updated_at = NOW() ${whereClause}`,
      { replacements }
    );

    return res.json({ success: true, message: status === 'verified' ? 'Dokumen diverifikasi' : 'Status dokumen diperbarui' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Gagal memverifikasi' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const docId = (req.query.id as string) || (req.body?.id as string);
  if (!docId) return res.status(400).json({ success: false, error: 'id dokumen wajib diisi' });

  const isAllowed = await verifyDocumentTenant(sequelize, docId, tenantId);
  if (!isAllowed) return res.status(404).json({ success: false, error: 'Dokumen tidak ditemukan' });

  try {
    await deleteEmployeeDocumentRecord(sequelize, docId, tenantId);
    return res.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Gagal menghapus dokumen' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
