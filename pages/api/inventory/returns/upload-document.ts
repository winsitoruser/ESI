import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Import database dari models
const db = require('../../../../models');

// Configuration
const uploadDir = path.join(process.cwd(), 'public/uploads/documents');

// Pastikan direktori upload ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi untuk formidable (parsing form data)
export const config = {
  api: {
    bodyParser: false,
  },
};

const apiLogger = logger.child({ service: 'return-document-upload-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authentikasi
    const session = await getServerSession(req, res, authOptions);
    
    // Skip auth check in development only
    if (!session && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const tenantId = session?.user?.tenantId || 'default-tenant';
    
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    
    // Parse form data dengan formidable
    const form = formidable({
      multiples: true,
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // Promise untuk parse form
    const formData: any = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    });
    
    const { fields, files } = formData;
    const returnId = fields.returnId?.[0];
    
    if (!returnId) {
      return res.status(400).json({
        success: false,
        message: 'ID Retur diperlukan'
      });
    }
    
    // Cek apakah retur ada
    try {
      const returnExists = await db.Return.findOne({
        where: { id: returnId, tenantId }
      });
      
      if (!returnExists) {
        return res.status(404).json({
          success: false,
          message: 'Retur tidak ditemukan'
        });
      }
    } catch (error) {
      apiLogger.warn('Error checking return exists:', error);
      // Lanjutkan proses, karena kita menggunakan pendekatan "Data Mock First"
    }
    
    const uploadedFiles = files.files;
    const uploadedDocuments = [];
    
    // Jika tidak ada file yang diunggah
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file yang diunggah'
      });
    }
    
    // Proses setiap file yang diunggah
    for (const file of Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles]) {
      const fileId = nanoid();
      const originalFilename = file.originalFilename || 'unnamed-file';
      const filename = `${fileId}-${originalFilename}`;
      const newPath = path.join(uploadDir, filename);
      
      // Pindahkan file ke lokasi baru dengan nama yang benar
      if (file.filepath !== newPath) {
        fs.renameSync(file.filepath, newPath);
      }
      
      // Data dokumen untuk disimpan ke database
      const documentData = {
        id: fileId,
        filename: originalFilename,
        path: `/uploads/documents/${filename}`,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        category: fields.category?.[0] || 'return',
        returnId: returnId,
        tenantId,
        createdBy: session?.user?.id,
        description: fields.description?.[0] || 'Dokumen Retur',
        tags: fields.tags ? JSON.parse(fields.tags[0]) : []
      };
      
      try {
        // Tambahkan dokumen ke database
        const document = await db.Document.create(documentData);
        uploadedDocuments.push(document);
      } catch (error) {
        apiLogger.error('Error saving document to database:', error);
        
        // Mock data jika database error
        uploadedDocuments.push({
          ...documentData,
          url: `/uploads/documents/${filename}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          isFromMock: true
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: uploadedDocuments,
      message: 'Dokumen berhasil diunggah'
    });
  } catch (error) {
    apiLogger.error('Error in return document upload API handler:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
