import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { Op } from 'sequelize';

// Import database dari models dengan pola yang digunakan di aplikasi
const db = require('../../../../models');

const apiLogger = logger.child({ service: 'returns-api' });

// Mock data untuk fallback jika database tidak tersedia
const MOCK_RETURNS = [
  {
    id: 'mock-return-1',
    returnNumber: 'RET-2025-0001',
    receiptId: 'receipt-123',
    receiptNumber: 'RC-2025-0123',
    returnDate: new Date(Date.now() - 86400000),
    returnType: 'supplier',
    supplierId: 'supplier-1',
    supplierName: 'PT Farmasi Utama',
    status: 'completed',
    notes: 'Retur obat kadaluarsa',
    subtotal: 500000,
    taxAmount: 55000,
    taxRate: 11,
    taxIncluded: false,
    discountAmount: 0,
    total: 555000,
    createdBy: 'user-1',
    financeStatus: 'completed',
    inventoryStatus: 'completed',
    tenantId: 'default',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    deletedAt: null,
    isFromMock: true,
    items: [
      {
        id: 'mock-return-item-1',
        returnId: 'mock-return-1',
        productId: 'product-1',
        sku: 'MED-001',
        productName: 'Paracetamol 500mg',
        quantity: 5,
        unit: 'strip',
        unitPrice: 10000,
        subtotal: 50000,
        batchNumber: 'BATCH-001',
        expiryDate: new Date(Date.now() + 30 * 86400000), // 30 hari dari sekarang
        reason: 'Kemasan rusak',
        returnType: 'supplier',
        status: 'completed',
        tenantId: 'default',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: 'mock-return-item-2',
        returnId: 'mock-return-1',
        productId: 'product-2',
        sku: 'MED-002',
        productName: 'Amoxicillin 500mg',
        quantity: 10,
        unit: 'strip',
        unitPrice: 45000,
        subtotal: 450000,
        batchNumber: 'BATCH-002',
        expiryDate: new Date(Date.now() + 60 * 86400000), // 60 hari dari sekarang
        reason: 'Kelebihan stok',
        returnType: 'supplier',
        status: 'completed',
        tenantId: 'default',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      }
    ]
  },
  {
    id: 'mock-return-2',
    returnNumber: 'RET-2025-0002',
    receiptId: 'receipt-124',
    receiptNumber: 'RC-2025-0124',
    returnDate: new Date(Date.now() - 172800000), // 2 hari yang lalu
    returnType: 'damaged',
    supplierId: 'supplier-2',
    supplierName: 'PT Apotek Sehat',
    status: 'completed',
    notes: 'Barang rusak saat pengiriman',
    subtotal: 300000,
    taxAmount: 33000,
    taxRate: 11,
    taxIncluded: false,
    discountAmount: 0,
    total: 333000,
    createdBy: 'user-1',
    financeStatus: 'completed',
    inventoryStatus: 'completed',
    tenantId: 'default',
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
    deletedAt: null,
    isFromMock: true,
    items: [
      {
        id: 'mock-return-item-3',
        returnId: 'mock-return-2',
        productId: 'product-3',
        sku: 'MED-003',
        productName: 'Vitamin C 1000mg',
        quantity: 6,
        unit: 'box',
        unitPrice: 50000,
        subtotal: 300000,
        batchNumber: 'BATCH-003',
        expiryDate: new Date(Date.now() + 90 * 86400000), // 90 hari dari sekarang
        reason: 'Kemasan rusak saat pengiriman',
        returnType: 'damaged',
        status: 'completed',
        tenantId: 'default',
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000)
      }
    ]
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
    
    // GET method - mengambil data retur
    if (req.method === 'GET') {
      const { id, startDate, endDate, status, returnType, supplierId } = req.query;
      const queryOptions: any = { 
        where: { tenantId },
        order: [['createdAt', 'desc']]
      };
      
      // Include items jika mengambil detail
      if (id) {
        queryOptions.include = [
          {
            model: db.ReturnItem,
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
        queryOptions.where.returnDate = {
          [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
        };
      } else if (startDate) {
        queryOptions.where.returnDate = {
          [Op.gte]: new Date(String(startDate))
        };
      } else if (endDate) {
        queryOptions.where.returnDate = {
          [Op.lte]: new Date(String(endDate))
        };
      }
      
      // Filter berdasarkan status
      if (status) {
        queryOptions.where.status = String(status);
      }
      
      // Filter berdasarkan tipe retur
      if (returnType) {
        queryOptions.where.returnType = String(returnType);
      }
      
      // Filter berdasarkan supplier
      if (supplierId) {
        queryOptions.where.supplierId = String(supplierId);
      }
      
      try {
        const returns = await db.Return.findAll(queryOptions);
        
        return res.status(200).json({
          success: true,
          data: returns
        });
      } catch (dbError) {
        apiLogger.warn('Database error when fetching returns, using mock data:', dbError);
        
        // Implementasi pola "Data Mock First" - kembalikan mock data jika database error
        let filteredMockData = [...MOCK_RETURNS];
        
        // Filter mock data sesuai dengan query
        if (id) {
          filteredMockData = filteredMockData.filter(item => item.id === String(id));
        }
        
        // Filter berdasarkan tanggal
        if (startDate && endDate) {
          const start = new Date(String(startDate)).getTime();
          const end = new Date(String(endDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.returnDate.getTime() >= start && item.returnDate.getTime() <= end
          );
        } else if (startDate) {
          const start = new Date(String(startDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.returnDate.getTime() >= start
          );
        } else if (endDate) {
          const end = new Date(String(endDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.returnDate.getTime() <= end
          );
        }
        
        // Filter berdasarkan status
        if (status) {
          filteredMockData = filteredMockData.filter(
            item => item.status === String(status)
          );
        }
        
        // Filter berdasarkan tipe retur
        if (returnType) {
          filteredMockData = filteredMockData.filter(
            item => item.returnType === String(returnType)
          );
        }
        
        // Filter berdasarkan supplier
        if (supplierId) {
          filteredMockData = filteredMockData.filter(
            item => item.supplierId === String(supplierId)
          );
        }
        
        return res.status(200).json({
          success: true,
          data: filteredMockData,
          isMockData: true,
          message: 'Menggunakan data mock karena database tidak tersedia'
        });
      }
    } 
    // POST method - membuat retur baru
    else if (req.method === 'POST') {
      try {
        const returnData = req.body;
        
        // Pastikan returnNumber unik
        const existingReturn = await db.Return.findOne({
          where: { returnNumber: returnData.returnNumber }
        });
        
        if (existingReturn) {
          return res.status(400).json({
            success: false,
            message: 'Nomor retur sudah digunakan'
          });
        }
        
        // Set tenant ID
        returnData.tenantId = tenantId;
        
        // Set createdBy jika session ada
        if (session?.user?.id) {
          returnData.createdBy = session.user.id;
        }
        
        // Simpan retur ke database
        const transaction = await db.sequelize.transaction();
        
        try {
          // Buat retur
          const newReturn = await db.Return.create(returnData, { transaction });
          
          // Tambahkan items jika ada
          if (returnData.items && Array.isArray(returnData.items) && returnData.items.length > 0) {
            // Set returnId dan tenantId untuk setiap item
            const items = returnData.items.map((item: any) => ({
              ...item,
              returnId: newReturn.id,
              tenantId
            }));
            
            // Buat return items
            await db.ReturnItem.bulkCreate(items, { transaction });
          }
          
          // Commit transaction
          await transaction.commit();
          
          // Ambil retur lengkap dengan items
          const createdReturn = await db.Return.findOne({
            where: { id: newReturn.id },
            include: [
              {
                model: db.ReturnItem,
                as: 'items'
              }
            ]
          });
          
          return res.status(201).json({
            success: true,
            data: createdReturn,
            message: 'Retur berhasil dibuat'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error creating return:', error);
        
        // Implementasi pola "Data Mock First"
        if (error instanceof Error && error.message.includes('database')) {
          const mockReturn = {
            ...MOCK_RETURNS[0],
            ...req.body,
            id: `mock-${Date.now()}`,
            returnNumber: `RET-MOCK-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            isFromMock: true
          };
          
          return res.status(201).json({
            success: true,
            data: mockReturn,
            isMockData: true,
            message: 'Retur berhasil dibuat (menggunakan data mock)'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error membuat retur',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    // PUT method - memperbarui retur
    else if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID retur diperlukan'
        });
      }
      
      try {
        const returnData = req.body;
        
        // Cari retur yang akan diupdate
        const existingReturn = await db.Return.findOne({
          where: { id: String(id), tenantId }
        });
        
        if (!existingReturn) {
          return res.status(404).json({
            success: false,
            message: 'Retur tidak ditemukan'
          });
        }
        
        // Update dengan transaction
        const transaction = await db.sequelize.transaction();
        
        try {
          // Update retur
          await existingReturn.update(returnData, { transaction });
          
          // Update items jika ada
          if (returnData.items && Array.isArray(returnData.items) && returnData.items.length > 0) {
            // Hapus items lama
            await db.ReturnItem.destroy({
              where: { returnId: existingReturn.id },
              transaction
            });
            
            // Buat items baru
            const items = returnData.items.map((item: any) => ({
              ...item,
              returnId: existingReturn.id,
              tenantId
            }));
            
            await db.ReturnItem.bulkCreate(items, { transaction });
          }
          
          // Commit transaction
          await transaction.commit();
          
          // Ambil retur yang diperbarui
          const updatedReturn = await db.Return.findOne({
            where: { id: existingReturn.id },
            include: [
              {
                model: db.ReturnItem,
                as: 'items'
              }
            ]
          });
          
          return res.status(200).json({
            success: true,
            data: updatedReturn,
            message: 'Retur berhasil diperbarui'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error updating return:', error);
        
        // Implementasi pola "Data Mock First"
        if (error instanceof Error && error.message.includes('database')) {
          const mockReturn = MOCK_RETURNS.find(item => item.id === id);
          
          if (mockReturn) {
            const updatedMock = {
              ...mockReturn,
              ...req.body,
              updatedAt: new Date(),
              isFromMock: true
            };
            
            return res.status(200).json({
              success: true,
              data: updatedMock,
              isMockData: true,
              message: 'Retur berhasil diperbarui (menggunakan data mock)'
            });
          }
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error memperbarui retur',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    // DELETE method - menghapus retur
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID retur diperlukan'
        });
      }
      
      try {
        // Cari retur yang akan dihapus
        const existingReturn = await db.Return.findOne({
          where: { id: String(id), tenantId }
        });
        
        if (!existingReturn) {
          return res.status(404).json({
            success: false,
            message: 'Retur tidak ditemukan'
          });
        }
        
        // Soft delete retur dan items
        const transaction = await db.sequelize.transaction();
        
        try {
          // Soft delete retur
          await existingReturn.destroy({ transaction });
          
          // Hapus items yang terkait
          await db.ReturnItem.destroy({
            where: { returnId: existingReturn.id },
            transaction
          });
          
          // Commit transaction
          await transaction.commit();
          
          return res.status(200).json({
            success: true,
            message: 'Retur berhasil dihapus'
          });
        } catch (error) {
          // Rollback transaction jika error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        apiLogger.error('Error deleting return:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Error menghapus retur',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
  } catch (error) {
    apiLogger.error('Error in returns API handler:', error);
    
    // Implementasi pola "Data Mock First" jika error serius
    const isDatabaseError = error instanceof Error && 
      (error.message.includes('database') || error.message.includes('sequelize') || error.message.includes('connection'));
    
    if (isDatabaseError && req.method === 'GET') {
      // Untuk GET request, kembalikan mock data lengkap
      return res.status(200).json({
        success: true,
        data: MOCK_RETURNS,
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
