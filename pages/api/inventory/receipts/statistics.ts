import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { Op } from 'sequelize';

// Import database dari models
const db = require('../../../../models');

const apiLogger = logger.child({ service: 'receipts-statistics-api' });

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
    status: 'complete',
    total: 555000,
    financeStatus: 'pending',
    tenantId: 'default',
    createdAt: new Date(),
    updatedAt: new Date()
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
    status: 'complete',
    total: 832500,
    financeStatus: 'paid',
    tenantId: 'default',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 5))
  },
  {
    id: 'rcpt-003',
    receiptNumber: 'RCV-2025040003',
    purchaseOrderId: 'po-003',
    poNumber: 'PO-2025040003',
    supplierId: 'sup-003',
    supplierName: 'PT Merck Indonesia',
    invoiceNumber: 'INV-2025040003',
    date: new Date(new Date().setDate(new Date().getDate() - 10)),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 20)),
    status: 'pending',
    total: 1250000,
    financeStatus: 'pending',
    tenantId: 'default',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 10)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 10))
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
    
    // GET method - mengambil statistik penerimaan
    if (req.method === 'GET') {
      const { fromDate, toDate, branchId } = req.query;
      
      const queryOptions: any = { 
        where: { tenantId }
      };
      
      // Filter berdasarkan parameter query
      if (branchId) {
        queryOptions.where.branchId = String(branchId);
      }
      
      // Filter berdasarkan tanggal
      if (fromDate && toDate) {
        queryOptions.where.date = {
          [Op.between]: [new Date(String(fromDate)), new Date(String(toDate))]
        };
      } else if (fromDate) {
        queryOptions.where.date = {
          [Op.gte]: new Date(String(fromDate))
        };
      } else if (toDate) {
        queryOptions.where.date = {
          [Op.lte]: new Date(String(toDate))
        };
      }
      
      try {
        // Statistik penerimaan
        const totalReceipts = await db.Receipt.count(queryOptions);
        
        // Total nilai penerimaan
        const totalValueResult = await db.Receipt.sum('total', queryOptions);
        const totalValue = totalValueResult || 0;
        
        // Jumlah penerimaan berdasarkan status
        const completedReceipts = await db.Receipt.count({
          ...queryOptions,
          where: {
            ...queryOptions.where,
            status: 'complete'
          }
        });
        
        const pendingReceipts = await db.Receipt.count({
          ...queryOptions,
          where: {
            ...queryOptions.where,
            status: 'pending'
          }
        });
        
        // Recent receipts (5 terakhir)
        const recentReceipts = await db.Receipt.findAll({
          ...queryOptions,
          order: [['date', 'DESC']],
          limit: 5
        });
        
        return res.status(200).json({
          success: true,
          data: {
            totalReceipts,
            totalValue,
            completedReceipts,
            pendingReceipts,
            recentReceipts
          }
        });
      } catch (dbError) {
        apiLogger.warn('Database error when fetching receipt statistics, using mock data:', dbError);
        
        // Implementasi pola "Data Mock First" - kembalikan mock data jika database error
        let filteredMockData = [...MOCK_RECEIPTS];
        
        // Filter berdasarkan branch
        if (branchId) {
          filteredMockData = filteredMockData.filter(
            item => item.branchId === String(branchId)
          );
        }
        
        // Filter berdasarkan tanggal
        if (fromDate && toDate) {
          const start = new Date(String(fromDate)).getTime();
          const end = new Date(String(toDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() >= start && item.date.getTime() <= end
          );
        } else if (fromDate) {
          const start = new Date(String(fromDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() >= start
          );
        } else if (toDate) {
          const end = new Date(String(toDate)).getTime();
          filteredMockData = filteredMockData.filter(
            item => item.date.getTime() <= end
          );
        }
        
        // Hitung statistik dari mock data
        const totalReceipts = filteredMockData.length;
        const totalValue = filteredMockData.reduce((sum, item) => sum + item.total, 0);
        const completedReceipts = filteredMockData.filter(item => item.status === 'complete').length;
        const pendingReceipts = filteredMockData.filter(item => item.status === 'pending').length;
        
        // Recent receipts (5 terakhir), sort by date desc
        const recentReceipts = [...filteredMockData]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);
        
        return res.status(200).json({
          success: true,
          data: {
            totalReceipts,
            totalValue,
            completedReceipts,
            pendingReceipts,
            recentReceipts
          },
          isMockData: true,
          message: 'Menggunakan data mock karena database tidak tersedia'
        });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
  } catch (error) {
    apiLogger.error('Error in receipts statistics API handler:', error);
    
    // Implementasi pola "Data Mock First" jika error serius
    const isDatabaseError = error instanceof Error && 
      (error.message.includes('database') || error.message.includes('sequelize') || error.message.includes('connection'));
    
    if (isDatabaseError && req.method === 'GET') {
      // Hitung statistik dari mock data
      const totalReceipts = MOCK_RECEIPTS.length;
      const totalValue = MOCK_RECEIPTS.reduce((sum, item) => sum + item.total, 0);
      const completedReceipts = MOCK_RECEIPTS.filter(item => item.status === 'complete').length;
      const pendingReceipts = MOCK_RECEIPTS.filter(item => item.status === 'pending').length;
      
      // Recent receipts (5 terakhir)
      const recentReceipts = [...MOCK_RECEIPTS]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);
      
      return res.status(200).json({
        success: true,
        data: {
          totalReceipts,
          totalValue,
          completedReceipts,
          pendingReceipts,
          recentReceipts
        },
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
