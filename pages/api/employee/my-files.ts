import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { resolveEmployeeContext } from '../../../lib/employee-portal';
import { computeDocumentCompleteness, MAX_DOCUMENT_SIZE_MB } from '../../../lib/hris/employee-document-types';
import {
  parseDocumentUpload,
  fieldVal,
  saveEmployeeDocument,
  listEmployeeDocuments,
  deleteEmployeeDocumentRecord,
  verifyEmployeeTenant,
  verifyDocumentBelongsToEmployee,
} from '../../../lib/hris/employee-document-service';

export const config = {
  api: { bodyParser: false },
};

let sequelize: any;
try {
  sequelize = require('../../../lib/sequelize');
} catch {
  /* dev */
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = String(session.user.id || '');
    const sessionTenantId = String((session.user as any).tenantId || '') || null;
    const ctx = await resolveEmployeeContext(sequelize, userId, sessionTenantId);

    if (!ctx.employeeId) {
      return res.status(404).json({
        success: false,
        error: 'Data karyawan tidak ditemukan. Hubungi HR untuk menghubungkan akun Anda.',
      });
    }

    const employeeId = String(ctx.employeeId);
    const tenantId = sessionTenantId || (ctx.tenantId ? String(ctx.tenantId) : null);

    if (req.method === 'GET') {
      const documents = await listEmployeeDocuments(sequelize, employeeId, tenantId);
      return res.json({
        success: true,
        data: {
          documents,
          completeness: computeDocumentCompleteness(documents),
          employee_id: employeeId,
        },
      });
    }

    if (req.method === 'POST') {
      const [fields, files] = await parseDocumentUpload(req);

      const documentType = fieldVal(fields, 'document_type');
      const title = fieldVal(fields, 'title');
      const existingId = fieldVal(fields, 'id') || null;

      if (!documentType) {
        return res.status(400).json({ success: false, error: 'Pilih tipe dokumen' });
      }
      if (!title) {
        return res.status(400).json({ success: false, error: 'Judul dokumen wajib diisi' });
      }

      if (existingId) {
        const allowed = await verifyDocumentBelongsToEmployee(sequelize, existingId, employeeId, tenantId);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Dokumen tidak ditemukan' });
        }
      }

      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!existingId && !uploadedFile?.filepath) {
        return res.status(400).json({ success: false, error: 'File dokumen wajib diunggah' });
      }

      const isEmployeeAllowed = await verifyEmployeeTenant(sequelize, employeeId, tenantId);
      if (!isEmployeeAllowed && sequelize) {
        return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });
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
        existingId,
        uploadedFile: uploadedFile || null,
        createdBy: userId,
        replaceExisting: fieldVal(fields, 'replace_existing') === 'true' || !existingId,
      });

      return res.status(existingId ? 200 : 201).json({
        success: true,
        data,
        message: existingId
          ? 'Dokumen berhasil diperbarui — menunggu verifikasi HR'
          : 'Dokumen berhasil diunggah — menunggu verifikasi HR',
      });
    }

    if (req.method === 'DELETE') {
      const docId = (req.query.id as string) || req.body?.id;
      if (!docId) {
        return res.status(400).json({ success: false, error: 'id dokumen wajib diisi' });
      }

      const allowed = await verifyDocumentBelongsToEmployee(sequelize, docId, employeeId, tenantId);
      if (!allowed) {
        return res.status(403).json({ success: false, error: 'Dokumen tidak ditemukan' });
      }

      await deleteEmployeeDocumentRecord(sequelize, docId, tenantId, employeeId);
      return res.json({ success: true, message: 'Dokumen dihapus' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    if (error?.code === 'INVALID_FILE') {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: `Ukuran file melebihi ${MAX_DOCUMENT_SIZE_MB}MB` });
    }
    console.warn('Employee my-files error:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Gagal memproses dokumen' });
  }
}
