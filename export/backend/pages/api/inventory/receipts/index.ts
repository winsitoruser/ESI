import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { Op } from 'sequelize';

// Import database dari models
const db = require('../../../../models');

const apiLogger = logger.child({ service: 'receipts-api' });

// Mock data untuk fallback jika database tidak tersedia
const MOCK_RECEIPTS = [
  {
    id: 'rcpt-001',
    receiptNumber: 'RCV-2025040001',
    purchaseOrderId: 'po-001',
    poNumber: 'PO-2025040001',
    supplierId: 'sup-001',
    supplierName: 'PT Kimia Farma Trading & Distribution',
    invoiceNumber: 'INV-2025040001',
    date: new Date(),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    notes: 'Penerimaan batch april',
    status: 'complete',
    items: [
      {
        id: 'rcpti-001',
        productId: 'prod-001',
        productName: 'Paracetamol 500mg',
        productSku: 'PCT-500',
        batch: 'BATCH-001',
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 12)),
        quantity: 100,
        unit: 'pcs',
        unitPrice: 5000,
        subtotal: 500000,
        taxPercentage: 11,
        taxAmount: 55000,
        discountPercentage: 0,
        discountAmount: 0,
        total: 555000
      }
    ],
    subtotal: 500000,
    tax: 55000,
    discount: 0,
    shippingCost: 0,
    total: 555000,
    approvedBy: 'admin',
    approvedAt: new Date(),
    createdBy: 'admin',
    financeStatus: 'pending',
    branchId: 'branch-001',
    tenantId: 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isFromMock: true
  },
  {
    id: 'rcpt-002',
    receiptNumber: 'RCV-2025040002',
    purchaseOrderId: 'po-002',
    poNumber: 'PO-2025040002',
    supplierId: 'sup-002',
    supplierName: 'PT Enseval Putera Megatrading',
    invoiceNumber: 'INV-2025040002',
    date: new Date(new Date().setDate(new Date().getDate() - 5)),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 25)),
    notes: 'Penerimaan batch antibiotik',
    status: 'complete',
    items: [
      {
        id: 'rcpti-002',
        productId: 'prod-002',
        productName: 'Amoxicillin 500mg',
        productSku: 'AMX-500',
        batch: 'BATCH-003',
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 18)),
        quantity: 50,
        unit: 'pcs',
        unitPrice: 15000,
        subtotal: 750000,
        taxPercentage: 11,
        taxAmount: 82500,
        discountPercentage: 0,
        discountAmount: 0,
        total: 832500
      }
    ],
    subtotal: 750000,
    tax: 82500,
    discount: 0,
    shippingCost: 0,
    total: 832500,
    approvedBy: 'admin',
    approvedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    createdBy: 'admin',
    financeStatus: 'paid',
    branchId: 'branch-001',
    tenantId: 'default',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    deletedAt: null,
    isFromMock: true
  }
];

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
    
    // GET method - mengambil data penerimaan
    if (req.method === 'GET') {
      const { id, startDate, endDate, status, supplierId, page = '1', limit = '10', searchQuery } = req.query;
      const currentPage = parseInt(page as string) || 1;
      const itemsPerPage = parseInt(limit as string) || 10;
      const offset = (currentPage - 1) * itemsPerPage;
      
      const queryOptions: any = { 
        where: { tenantId },
        order: [['createdAt', 'desc']],
        limit: itemsPerPage,
        offset
      };
      
      // Include items jika mengambil detail
      if (id) {
        queryOptions.include = [
          {
            model: db.ReceiptItem,
            as: 'items'
          },
          {
            model: db.Document,
            as: 'documents'
          }
        ];
      }
      
      // Filter berdasarkan parameter query
      if (id) {
        queryOptions.where.id = String(id);
      }
      
      // Filter berdasarkan tanggal
      if (startDate && endDate) {
        queryOptions.where.date = {
          [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
        };
      } else if (startDate) {
        queryOptions.where.date = {
          [Op.gte]: new Date(String(startDate))
        };
      } else if (endDate) {
        queryOptions.where.date = {
          [Op.lte]: new Date(String(endDate))
        };
      }
      
      // Filter berdasarkan status
      if (status && status !== 'all') {
        queryOptions.where.status = String(status);
      }
      
      // Filter berdasarkan supplier
      if (supplierId && supplierId !== 'all') {
        queryOptions.where.supplierId = String(supplierId);
      }
      
      // Filter berdasarkan search query
      if (searchQuery) {
        queryOptions.where[Op.or] = [
          { receiptNumber: { [Op.like]: `%${searchQuery}%` } },
          { invoiceNumber: { [Op.like]: `%${searchQuery}%` } },
          { supplierName: { [Op.like]: `%${searchQuery}%` } }
        ];
      }
      
      try {
        // Hitung total data untuk pagination
        const count = await db.Receipt.count({
          where: queryOptions.where
        });
        
        // Ambil data sesuai query
        const receipts = await db.Receipt.findAll(queryOptions);
        
        return res.status(200).json({
          success: true,
          data: receipts,
          pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / itemsPerPage),
            currentPage,
            itemsPerPage
          }
        });
      } catch (dbError) {
        apiLogger.warn('Database error when fetching receipts, using mock data:', dbError);
        
        // Implementasi pola "Data Mock First" - kembalikan mock data jika database error
        let filteredMockData = [...MOCK_RECEIPTS];
        
        // Filter mock data sesuai dengan query
        if (id) {
          filteredMockData = filteredMockData.filter(item => item.id === String(id));
        }
        
        // Filter berdasarkan tanggal
        if (startDate && endDate) {
          const start = new Date(String(startDate)).getTime();
          const end = new Date(String(endDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() >= start && item.date.getTime() <= end
          );
        } else if (startDate) {
          const start = new Date(String(startDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() >= start
          );
        } else if (endDate) {
          const end = new Date(String(endDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() <= end
          );
        }
        
        // Filter berdasarkan status
        if (status && status !== 'all') {
          filteredMockData = filteredMockData.filter(
            item => item.status === String(status)
          );
        }
        
        // Filter berdasarkan supplier
        if (supplierId && supplierId !== 'all') {
          filteredMockData = filteredMockData.filter(
            item => item.supplierId === String(supplierId)
          );
        }
        
        // Filter berdasarkan search query
        if (searchQuery) {
          const query = String(searchQuery).toLowerCase();
          filteredMockData = filteredMockData.filter(item => 
            item.receiptNumber.toLowerCase().includes(query) ||
            (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(query)) ||
            item.supplierName.toLowerCase().includes(query)
          );
        }
        
        // Pagination pada mock data
        const totalItems = filteredMockData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginatedData = filteredMockData.slice(offset, offset + itemsPerPage);
        
        return res.status(200).json({
          success: true,
          data: paginatedData,
          pagination: {
            totalItems,
            totalPages,
            currentPage,
            itemsPerPage
          },
          isMockData: true,
          message: 'Menggunakan data mock karena database tidak tersedia'
        });
      }
    } 
    // POST method - membuat penerimaan baru
    else if (req.method === 'POST') {
      try {
        const receiptData = req.body;
        
        // Pastikan receiptNumber unik
        const existingReceipt = await db.Receipt.findOne({
          where: { receiptNumber: receiptData.receiptNumber }
        });
        
        if (existingReceipt) {
          return res.status(400).json({
            success: false,
            message: 'Nomor penerimaan sudah digunakan'
          });
        }
        
        // Set tenant ID
        receiptData.tenantId = tenantId;
        
        // Set createdBy jika session ada
        if (session?.user?.id) {
          receiptData.createdBy = session.user.id;
        }
        
        // Simpan penerimaan ke database
        const transaction = await db.sequelize.transaction();
        
        try {
          // Buat receipt
          const newReceipt = await db.Receipt.create(receiptData, { transaction });
          
          // Tambahkan items jika ada
          if (receiptData.items && Array.isArray(receiptData.items) && receiptData.items.length > 0) {
            // Set receiptId dan tenantId untuk setiap item
            const items = receiptData.items.map((item: any) => ({
              ...item,
              receiptId: newReceipt.id,
              tenantId
            }));
            
            // Buat receipt items
            await db.ReceiptItem.bulkCreate(items, { transaction });
          }
          
          // Commit transaction
          await transaction.commit();
          
          // Ambil receipt lengkap dengan items
          const createdReceipt = await db.Receipt.findOne({
            where: { id: newReceipt.id },
            include: [
              {
                model: db.ReceiptItem,
                as: 'items'
              }
            ]
          });
          
          return res.status(201).json({
            success: true,
            data: createdReceipt,
            message: 'Penerimaan berhasil dibuat'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error creating receipt:', error);
        
        // Implementasi pola "Data Mock First"
        if (error instanceof Error && error.message.includes('database')) {
          const mockReceipt = {
            ...MOCK_RECEIPTS[0],
            ...req.body,
            id: `mock-${Date.now()}`,
            receiptNumber: `RCV-MOCK-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            isFromMock: true
          };
          
          return res.status(201).json({
            success: true,
            data: mockReceipt,
            isMockData: true,
            message: 'Penerimaan berhasil dibuat (menggunakan data mock)'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error membuat penerimaan',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    // PUT method - memperbarui penerimaan
    else if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID penerimaan diperlukan'
        });
      }
      
      try {
        const receiptData = req.body;
        
        // Cari penerimaan yang akan diupdate
        const existingReceipt = await db.Receipt.findOne({
          where: { id: String(id), tenantId }
        });
        
        if (!existingReceipt) {
          return res.status(404).json({
            success: false,
            message: 'Penerimaan tidak ditemukan'
          });
        }
        
        // Update dengan transaction
        const transaction = await db.sequelize.transaction();
        
        try {
          // Update receipt
          await existingReceipt.update(receiptData, { transaction });
          
          // Update items jika ada
          if (receiptData.items && Array.isArray(receiptData.items) && receiptData.items.length > 0) {
            // Hapus items lama
            await db.ReceiptItem.destroy({
              where: { receiptId: existingReceipt.id },
              transaction
            });
            
            // Buat items baru
            const items = receiptData.items.map((item: any) => ({
              ...item,
              receiptId: existingReceipt.id,
              tenantId
            }));
            
            await db.ReceiptItem.bulkCreate(items, { transaction });
          }
          
          // Commit transaction
          await transaction.commit();
          
          // Ambil penerimaan yang diperbarui
          const updatedReceipt = await db.Receipt.findOne({
            where: { id: existingReceipt.id },
            include: [
              {
                model: db.ReceiptItem,
                as: 'items'
              }
            ]
          });
          
          return res.status(200).json({
            success: true,
            data: updatedReceipt,
            message: 'Penerimaan berhasil diperbarui'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error updating receipt:', error);
        
        // Implementasi pola "Data Mock First"
        if (error instanceof Error && error.message.includes('database')) {
          const mockReceipt = MOCK_RECEIPTS.find(item => item.id === id);
          
          if (mockReceipt) {
            const updatedMock = {
              ...mockReceipt,
              ...req.body,
              updatedAt: new Date(),
              isFromMock: true
            };
            
            return res.status(200).json({
              success: true,
              data: updatedMock,
              isMockData: true,
              message: 'Penerimaan berhasil diperbarui (menggunakan data mock)'
            });
          }
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error memperbarui penerimaan',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    // DELETE method - menghapus penerimaan
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID penerimaan diperlukan'
        });
      }
      
      try {
        // Cari penerimaan yang akan dihapus
        const existingReceipt = await db.Receipt.findOne({
          where: { id: String(id), tenantId }
        });
        
        if (!existingReceipt) {
          return res.status(404).json({
            success: false,
            message: 'Penerimaan tidak ditemukan'
          });
        }
        
        // Soft delete penerimaan dan items
        const transaction = await db.sequelize.transaction();
        
        try {
          // Soft delete penerimaan
          await existingReceipt.destroy({ transaction });
          
          // Hapus items yang terkait
          await db.ReceiptItem.destroy({
            where: { receiptId: existingReceipt.id },
            transaction
          });
          
          // Commit transaction
          await transaction.commit();
          
          return res.status(200).json({
            success: true,
            message: 'Penerimaan berhasil dihapus'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error deleting receipt:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Error menghapus penerimaan',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
  } catch (error) {
    apiLogger.error('Error in receipts API handler:', error);
    
    // Implementasi pola "Data Mock First" jika error serius
    const isDatabaseError = error instanceof Error && 
      (error.message.includes('database') || error.message.includes('sequelize') || error.message.includes('connection'));
    
    if (isDatabaseError && req.method === 'GET') {
      // Untuk GET request, kembalikan mock data lengkap
      return res.status(200).json({
        success: true,
        data: MOCK_RECEIPTS,
        isMockData: true,
        message: 'Menggunakan data mock karena database tidak tersedia'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
