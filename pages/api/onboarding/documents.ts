import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const getDb = () => require('../../../models');

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'kyb');

// Ensure upload directory exists
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper: resolve tenantId from session or user/kyb record
async function resolveTenantId(db: any, userId: number, sessionTenantId: string | null): Promise<string | null> {
  if (sessionTenantId) return sessionTenantId;
  try {
    const user = await db.User.findByPk(userId, { attributes: ['id', 'tenantId'] });
    if (user?.tenantId) return user.tenantId;
  } catch (e) {}
  try {
    const kyb = await db.KybApplication.findOne({ where: { userId }, attributes: ['tenantId'] });
    if (kyb?.tenantId) return kyb.tenantId;
  } catch (e) {}
  try {
    const tenant = await db.Tenant.findOne({ attributes: ['id'] });
    if (tenant) return tenant.id;
  } catch (e) {}
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const db = getDb();
  const userId = parseInt(session.user.id);
  const tenantId = await resolveTenantId(db, userId, session.user.tenantId || null);
  
  console.log('[Documents API]', req.method, '- userId:', userId, 'tenantId:', tenantId);

  // GET - List documents for user's KYB application
  if (req.method === 'GET') {
    try {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      const documents = await db.KybDocument.findAll({
        where: { kybApplicationId: kyb.id },
        order: [['created_at', 'DESC']],
      });

      return res.status(200).json({ success: true, data: documents });
    } catch (error) {
      console.error('KYB documents fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch documents' });
    }
  }

  // POST - Upload document
  if (req.method === 'POST') {
    try {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      ensureDir(UPLOAD_DIR);

      const form = formidable({
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        filter: ({ mimetype }) => {
          const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
          return allowed.includes(mimetype || '');
        },
      });

      const [fields, files] = await form.parse(req);

      const documentType = (fields.documentType?.[0] || 'other') as string;
      const uploadedFile = files.file?.[0];

      if (!uploadedFile) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Generate a unique filename
      const ext = path.extname(uploadedFile.originalFilename || '.jpg');
      const uniqueName = `${tenantId}-${documentType}-${Date.now()}${ext}`;
      const finalPath = path.join(UPLOAD_DIR, uniqueName);

      // Rename temp file to final path
      fs.renameSync(uploadedFile.filepath, finalPath);

      const fileUrl = `/uploads/kyb/${uniqueName}`;

      // Check if document of this type already exists - replace it
      const existing = await db.KybDocument.findOne({
        where: { kybApplicationId: kyb.id, documentType },
      });

      let document;
      if (existing) {
        // Delete old file if it exists
        const oldPath = path.join(process.cwd(), 'public', existing.fileUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
        await existing.update({
          documentName: uploadedFile.originalFilename || uniqueName,
          fileUrl,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimetype,
          verificationStatus: 'pending',
        });
        document = existing;
      } else {
        document = await db.KybDocument.create({
          kybApplicationId: kyb.id,
          tenantId,
          documentType,
          documentName: uploadedFile.originalFilename || uniqueName,
          fileUrl,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimetype,
          verificationStatus: 'pending',
        });
      }

      return res.status(200).json({ success: true, data: document });
    } catch (error: any) {
      console.error('[Documents POST] Upload error:', error.message);
      console.error('[Documents POST] Stack:', error.stack);
      return res.status(500).json({ success: false, message: error.message || 'Failed to upload document' });
    }
  }

  // DELETE - Remove document
  if (req.method === 'DELETE') {
    try {
      // Parse documentId from query since bodyParser is disabled
      const documentId = req.query.documentId as string;

      if (!documentId) {
        return res.status(400).json({ message: 'Document ID required' });
      }

      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      const document = await db.KybDocument.findOne({
        where: { id: documentId, kybApplicationId: kyb.id },
      });

      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Delete file
      const filePath = path.join(process.cwd(), 'public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await document.destroy();

      return res.status(200).json({ success: true, message: 'Document deleted' });
    } catch (error) {
      console.error('KYB document delete error:', error);
      return res.status(500).json({ message: 'Failed to delete document' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
