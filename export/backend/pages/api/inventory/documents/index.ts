import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { Document, DocumentCategory } from '@/types/Document';
import documentAdapter from '@/server/sequelize/adapters/inventory-document-adapter';

// Create a logger specifically for this API endpoint
const apiLogger = logger.child({ 
  service: 'documents-api', 
  endpoint: '/api/inventory/documents' 
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();
  
  try {
    // Authentikasi
    const session = await getServerSession(req, res, authOptions);
    
    // Skip auth check in development only
    if (!session && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const tenantId = session?.user?.tenantId || 'default-tenant';
    
    apiLogger.info('Processing request', { 
      method: req.method, 
      tenantId, 
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    });
    
    // GET method - mengambil dokumen
    if (req.method === 'GET') {
      const { id, receiptId, returnId, category, tag } = req.query;
      
      // Create filter object for adapter
      const filters = {
        ...(id ? { id: String(id) } : {}),
        ...(receiptId ? { receiptId: String(receiptId) } : {}),
        ...(returnId ? { returnId: String(returnId) } : {}),
        ...(category ? { category: String(category) } : {}),
        ...(tag ? { tag: String(tag) } : {})
      };
      
      // Use adapter to get documents with filters
      const { documents, isMock } = await documentAdapter.getDocuments(filters, tenantId);
      
      const responseTime = Date.now() - startTime;
      apiLogger.info(`Successfully retrieved documents`, {
        count: documents.length,
        responseTime,
        isMock,
        tenantId
      });
      
      return res.status(200).json({
        success: true,
        data: documents,
        isMockData: isMock,
        ...(isMock ? { message: 'Menggunakan data mock karena database tidak tersedia' } : {}),
        meta: {
          responseTime,
          count: documents.length
        }
      });
    } 
    // DELETE method - menghapus dokumen
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID dokumen diperlukan untuk menghapus' 
        });
      }
      
      // Check if document exists first
      const { document, isMock } = await documentAdapter.getDocumentById(String(id), tenantId);
      
      if (!document) {
        apiLogger.warn('Document not found for deletion', { id, tenantId });
        return res.status(404).json({ 
          success: false, 
          message: 'Dokumen tidak ditemukan' 
        });
      }
      
      // Delete document using adapter
      const deleteResult = await documentAdapter.deleteDocument(String(id), tenantId);
      
      const responseTime = Date.now() - startTime;
      apiLogger.info(`Document deletion result`, {
        id,
        success: deleteResult.success,
        isMock: deleteResult.isMock,
        responseTime,
        tenantId
      });
      
      if (deleteResult.success) {
        return res.status(200).json({
          success: true,
          message: 'Dokumen berhasil dihapus',
          isMockData: deleteResult.isMock,
          meta: { responseTime }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Gagal menghapus dokumen',
          error: deleteResult.error,
          isMockData: deleteResult.isMock,
          meta: { responseTime }
        });
      }
    } 
    // PATCH method - memperbarui dokumen
    else if (req.method === 'PATCH') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID dokumen diperlukan untuk memperbarui' 
        });
      }
      
      // Extract update data from request body
      const { description, category, tags } = req.body;
      const updateData: Partial<Document> = {};
      
      // Only include fields that are provided
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (category !== undefined) {
        updateData.category = category as DocumentCategory;
      }
      
      if (tags !== undefined) {
        // Ensure tags are always in array format
        if (Array.isArray(tags)) {
          updateData.tags = tags;
        } else if (typeof tags === 'string') {
          // If string, split by comma
          updateData.tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }
      }
      
      // Update document using adapter
      const { document, isMock } = await documentAdapter.updateDocument(
        String(id), 
        updateData, 
        tenantId
      );
      
      const responseTime = Date.now() - startTime;
      
      if (!document) {
        apiLogger.warn('Document not found for update', { id, tenantId });
        return res.status(404).json({
          success: false,
          message: 'Dokumen tidak ditemukan',
          meta: { responseTime }
        });
      }
      
      apiLogger.info(`Document updated successfully`, {
        id,
        isMock,
        updatedFields: Object.keys(updateData),
        responseTime,
        tenantId
      });
      
      return res.status(200).json({
        success: true,
        data: document,
        isMockData: isMock,
        ...(isMock ? { message: 'Menggunakan data mock karena database tidak tersedia' } : {}),
        meta: { responseTime }
      });
    }
    // POST method - membuat dokumen baru
    else if (req.method === 'POST') {
      const { filename, originalName, fileType, size, url, thumbnailUrl, description, category, tags } = req.body;
      
      // Validate required fields
      if (!filename || !fileType || !url) {
        return res.status(400).json({ 
          success: false, 
          message: 'filename, fileType, dan url diperlukan untuk membuat dokumen baru' 
        });
      }
      
      // Prepare document data
      const documentData: Partial<Document> = {
        filename,
        originalName: originalName || filename,
        fileType,
        size: size || 0,
        url,
        thumbnailUrl,
        description,
        category: category as DocumentCategory,
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [])
      };
      
      // Create document using adapter
      const { document, isMock } = await documentAdapter.createDocument(documentData, tenantId);
      
      const responseTime = Date.now() - startTime;
      apiLogger.info(`Document created`, {
        id: document.id,
        filename: document.filename,
        isMock,
        responseTime,
        tenantId
      });
      
      return res.status(201).json({
        success: true,
        data: document,
        isMockData: isMock,
        ...(isMock ? { message: 'Menggunakan data mock karena database tidak tersedia' } : {}),
        meta: { responseTime }
      });
    }
    else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH', 'POST']);
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    apiLogger.error('Error in documents API handler:', { 
      error, 
      method: req.method,
      responseTime
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error',
      meta: { responseTime }
    });
  }
}
