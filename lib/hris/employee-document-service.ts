import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import {
  ACCEPTED_DOCUMENT_MIME,
  MAX_DOCUMENT_SIZE_MB,
  getExpiryState,
  isAcceptedFile,
} from './employee-document-types';

export const EMPLOYEE_DOC_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'employee-documents');

export function ensureDocUploadDir() {
  if (!fs.existsSync(EMPLOYEE_DOC_UPLOAD_DIR)) {
    fs.mkdirSync(EMPLOYEE_DOC_UPLOAD_DIR, { recursive: true });
  }
}

export function fieldVal(fields: formidable.Fields, key: string): string {
  const v = fields[key];
  if (Array.isArray(v)) return v[0] || '';
  return (v as string) || '';
}

export function resolveDocStatus(expiryDate: string | null, verificationStatus = 'pending'): string {
  if (getExpiryState(expiryDate) === 'expired') return 'expired';
  return verificationStatus;
}

export function deletePhysicalFile(fileUrl?: string | null) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
  const fullPath = path.join(process.cwd(), 'public', fileUrl);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      /* ignore */
    }
  }
}

export async function parseDocumentUpload(req: any): Promise<[formidable.Fields, formidable.Files]> {
  ensureDocUploadDir();
  const form = formidable({
    uploadDir: EMPLOYEE_DOC_UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: MAX_DOCUMENT_SIZE_MB * 1024 * 1024,
    filename: (_name, ext) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      return `emp-doc-${unique}${ext}`;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });
}

export async function verifyEmployeeTenant(
  sequelize: any,
  empId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!sequelize) return true;
  if (!tenantId) return true;
  try {
    const [rows] = await sequelize.query(
      `SELECT id FROM employees WHERE id = :empId AND tenant_id = :tenantId`,
      { replacements: { empId, tenantId } }
    );
    return rows && rows.length > 0;
  } catch {
    return false;
  }
}

export async function verifyDocumentTenant(
  sequelize: any,
  docId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!sequelize) return true;
  if (!tenantId) return true;
  try {
    const [rows] = await sequelize.query(
      `SELECT id FROM employee_documents WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id: docId, tenantId } }
    );
    return rows && rows.length > 0;
  } catch {
    return false;
  }
}

export async function verifyDocumentBelongsToEmployee(
  sequelize: any,
  docId: string,
  employeeId: string | number,
  tenantId: string | null
): Promise<boolean> {
  if (!sequelize) return true;
  try {
    const [rows] = await sequelize.query(
      `SELECT id FROM employee_documents
       WHERE id = :id AND employee_id = :employeeId
       AND (:tenantId IS NULL OR tenant_id = :tenantId)`,
      { replacements: { id: docId, employeeId, tenantId } }
    );
    return rows && rows.length > 0;
  } catch {
    return false;
  }
}

export interface SaveDocumentInput {
  sequelize: any;
  tenantId: string | null;
  employeeId: string;
  documentType: string;
  title: string;
  documentNumber?: string | null;
  description?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  signedBy?: string | null;
  existingId?: string | null;
  uploadedFile?: formidable.File | null;
  createdBy?: string | null;
  replaceExisting?: boolean;
}

export async function saveEmployeeDocument(input: SaveDocumentInput) {
  const {
    sequelize,
    tenantId,
    employeeId,
    documentType,
    title,
    documentNumber = null,
    description = null,
    issueDate = null,
    expiryDate = null,
    signedBy = null,
    existingId = null,
    uploadedFile = null,
    createdBy = null,
    replaceExisting = false,
  } = input;

  const hasNewFile = Boolean(uploadedFile?.filepath);
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;

  if (hasNewFile && uploadedFile) {
    const originalName = uploadedFile.originalFilename || path.basename(uploadedFile.filepath);
    if (!isAcceptedFile({ name: originalName, type: uploadedFile.mimetype || '' })) {
      deletePhysicalFile(`/uploads/employee-documents/${path.basename(uploadedFile.filepath)}`);
      throw Object.assign(new Error('Format file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC/DOCX'), { code: 'INVALID_FILE' });
    }
    fileUrl = `/uploads/employee-documents/${path.basename(uploadedFile.filepath)}`;
    fileName = originalName;
    fileSize = uploadedFile.size || null;
    mimeType = uploadedFile.mimetype || null;
  }

  const docStatus = resolveDocStatus(expiryDate, 'pending');

  if (!sequelize) {
    return {
      id: existingId || `mock-${Date.now()}`,
      employee_id: employeeId,
      document_type: documentType,
      title,
      file_url: fileUrl,
      file_name: fileName,
      status: docStatus,
    };
  }

  if (!existingId && replaceExisting && hasNewFile) {
    const [oldDocs]: any = await sequelize.query(
      `SELECT id, file_url FROM employee_documents
       WHERE employee_id = :employeeId AND document_type = :documentType
       AND (:tenantId IS NULL OR tenant_id = :tenantId)`,
      { replacements: { employeeId, documentType, tenantId } }
    );
    for (const old of oldDocs || []) {
      deletePhysicalFile(old.file_url);
      await sequelize.query(`DELETE FROM employee_documents WHERE id = :id`, { replacements: { id: old.id } });
    }
  }

  if (existingId) {
    if (hasNewFile) {
      const [oldRows]: any = await sequelize.query(
        `SELECT file_url FROM employee_documents WHERE id = :id`,
        { replacements: { id: existingId } }
      );
      deletePhysicalFile(oldRows?.[0]?.file_url);
    }

    const setParts = [
      'document_type = :documentType',
      'title = :title',
      'document_number = :documentNumber',
      'description = :description',
      'issue_date = :issueDate',
      'expiry_date = :expiryDate',
      'signed_by = :signedBy',
      'status = :status',
      'updated_at = NOW()',
    ];
    const replacements: Record<string, any> = {
      id: existingId,
      documentType,
      title,
      documentNumber,
      description,
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      signedBy,
      status: hasNewFile ? docStatus : resolveDocStatus(expiryDate, 'pending'),
    };

    if (hasNewFile) {
      setParts.push('file_url = :fileUrl', 'file_name = :fileName', 'file_size = :fileSize', 'mime_type = :mimeType');
      replacements.fileUrl = fileUrl;
      replacements.fileName = fileName;
      replacements.fileSize = fileSize;
      replacements.mimeType = mimeType;
    }

    const whereClause = tenantId ? 'WHERE id = :id AND tenant_id = :tenantId' : 'WHERE id = :id';
    if (tenantId) replacements.tenantId = tenantId;

    await sequelize.query(`UPDATE employee_documents SET ${setParts.join(', ')} ${whereClause}`, { replacements });
    const [rows]: any = await sequelize.query(`SELECT * FROM employee_documents WHERE id = :id`, { replacements: { id: existingId } });
    return rows?.[0];
  }

  const [result]: any = await sequelize.query(
    `INSERT INTO employee_documents (
      tenant_id, employee_id, document_type, document_number, title, description,
      file_url, file_name, file_size, mime_type, issue_date, expiry_date,
      signed_by, status, is_active, created_by, created_at, updated_at
    ) VALUES (
      :tenantId, :employeeId, :documentType, :documentNumber, :title, :description,
      :fileUrl, :fileName, :fileSize, :mimeType, :issueDate, :expiryDate,
      :signedBy, :status, true, :createdBy, NOW(), NOW()
    ) RETURNING *`,
    {
      replacements: {
        tenantId,
        employeeId,
        documentType,
        documentNumber,
        title,
        description,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        signedBy,
        status: docStatus,
        createdBy,
      },
    }
  );

  return result?.[0] || result;
}

export async function listEmployeeDocuments(
  sequelize: any,
  employeeId: string | number,
  tenantId: string | null
) {
  if (!sequelize) return [];
  const [rows] = await sequelize.query(
    `SELECT * FROM employee_documents
     WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId)
     ORDER BY created_at DESC`,
    { replacements: { empId: employeeId, tenantId } }
  );
  return rows || [];
}

export async function deleteEmployeeDocumentRecord(
  sequelize: any,
  docId: string,
  tenantId: string | null,
  employeeId?: string | number | null
) {
  if (!sequelize) return;

  const replacements: any = { id: docId };
  let whereClause = 'WHERE id = :id';
  if (tenantId) {
    whereClause += ' AND tenant_id = :tenantId';
    replacements.tenantId = tenantId;
  }
  if (employeeId) {
    whereClause += ' AND employee_id = :employeeId';
    replacements.employeeId = employeeId;
  }

  const [rows]: any = await sequelize.query(
    `SELECT file_url FROM employee_documents ${whereClause}`,
    { replacements }
  );
  deletePhysicalFile(rows?.[0]?.file_url);
  await sequelize.query(`DELETE FROM employee_documents ${whereClause}`, { replacements });
}
