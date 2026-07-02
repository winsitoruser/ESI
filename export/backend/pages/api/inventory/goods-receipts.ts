import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import InventoryAdapter from '../../../lib/adapters/inventory-adapter';
import { sequelize } from '../../../server/sequelize/connection-simple';
import { QueryTypes } from 'sequelize';

// Simple console logger fallback
const logger = {
  info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta || ''),
  error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta || ''),
  warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta || ''),
  debug: (msg: string, meta?: any) => console.debug('[DEBUG]', msg, meta || '')
};

const inventoryAdapter = new InventoryAdapter();

// Simple auth options for session handling
const authOptions = {
  callbacks: {
    session: ({ session, token }: any) => ({
      ...session,
      user: {
        ...session.user,
        id: token?.sub,
        tenantId: 'default-tenant'
      }
    })
  }
};

// Types for goods receipts
interface GoodsReceiptItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  financeStatus: 'pending' | 'paid' | 'overdue';
  notes: string;
  items: GoodsReceiptItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for fallback
const generateMockGoodsReceipts = (): GoodsReceipt[] => {
  return [
    {
      id: 'gr-001',
      receiptNumber: 'GR-2025-001',
      purchaseOrderId: 'po-001',
      supplierId: 'sup-001',
      supplierName: 'PT Kimia Farma',
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'complete',
      subtotal: 1800000,
      tax: 180000,
      discount: 0,
      total: 1980000,
      financeStatus: 'pending',
      notes: 'Penerimaan barang rutin',
      items: [
        {
          id: 'gri-001',
          productId: 'prod-001',
          productName: 'Paracetamol 500mg',
          batchNumber: 'BTH-001-2025',
          expiryDate: '2026-12-31',
          quantity: 100,
          unitPrice: 8000,
          subtotal: 800000,
          taxAmount: 80000,
          discountAmount: 0,
          total: 880000
        },
        {
          id: 'gri-002',
          productId: 'prod-002',
          productName: 'Amoxicillin 500mg',
          batchNumber: 'BTH-002-2025',
          expiryDate: '2026-06-30',
          quantity: 50,
          unitPrice: 20000,
          subtotal: 1000000,
          taxAmount: 100000,
          discountAmount: 0,
          total: 1100000
        }
      ],
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'gr-002',
      receiptNumber: 'GR-2025-002',
      purchaseOrderId: 'po-002',
      supplierId: 'sup-002',
      supplierName: 'PT Dexa Medica',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      subtotal: 1450000,
      tax: 145000,
      discount: 50000,
      total: 1545000,
      financeStatus: 'pending',
      notes: 'Pesanan vitamin dan suplemen',
      items: [
        {
          id: 'gri-003',
          productId: 'prod-003',
          productName: 'Vitamin C 1000mg',
          batchNumber: 'BTH-003-2025',
          expiryDate: '2027-03-31',
          quantity: 200,
          unitPrice: 3500,
          subtotal: 700000,
          taxAmount: 70000,
          discountAmount: 25000,
          total: 745000
        },
        {
          id: 'gri-004',
          productId: 'prod-004',
          productName: 'Vitamin B Complex',
          batchNumber: 'BTH-004-2025',
          expiryDate: '2026-09-30',
          quantity: 150,
          unitPrice: 5000,
          subtotal: 750000,
          taxAmount: 75000,
          discountAmount: 25000,
          total: 800000
        }
      ],
      createdBy: 'user-002',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = {
    info: (msg: string, data?: any) => logger.info(`${req.method} ${req.url} - ${msg}`, data),
    warn: (msg: string, data?: any) => logger.warn(`${req.method} ${req.url} - ${msg}`, data),
    error: (msg: string, data?: any) => logger.error(`${req.method} ${req.url} - ${msg}`, data)
  };
  
  try {
    // Authentication (temporarily disabled for testing)
    // const session = await getServerSession(req, res, authOptions);
    // if (!session) {
    //   return res.status(401).json({ success: false, message: 'Unauthorized' });
    // }

    const { method } = req;
    operationLogger.info('Processing goods receipts request');

    switch (method) {
      case 'GET':
        return handleGetGoodsReceipts(req, res);
      case 'POST':
        return handleCreateGoodsReceipt(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    operationLogger.error('Goods receipts API Error', { error: (error as Error).message });
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

async function handleGetGoodsReceipts(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = {
    info: (msg: string, data?: any) => logger.info(`GET goods-receipts - ${msg}`, data),
    warn: (msg: string, data?: any) => logger.warn(`GET goods-receipts - ${msg}`, data),
    error: (msg: string, data?: any) => logger.error(`GET goods-receipts - ${msg}`, data)
  };
  
  try {
    const { 
      page = '1',
      limit = '10',
      supplierId,
      status,
      startDate,
      endDate
    } = req.query;

    operationLogger.info('Processing goods receipts request', { page, limit, supplierId, status });

    // Set timeout for database operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let responseData;
    let isFromMock = false;

    try {
      // Build filters
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (supplierId) {
        whereClause += ` AND gr.supplier_id = $${paramIndex}`;
        params.push(supplierId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND gr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (startDate && endDate) {
        whereClause += ` AND gr.receipt_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      // Query for goods receipts with items
      const goodsReceiptsQuery = `
        SELECT 
          gr.id,
          gr.receipt_number,
          gr.purchase_order_id,
          gr.supplier_id,
          s.name as supplier_name,
          gr.receipt_date as date,
          gr.due_date,
          gr.status,
          gr.subtotal,
          gr.tax,
          gr.discount,
          gr.total,
          gr.finance_status,
          gr.notes,
          gr.created_by,
          gr.created_at,
          gr.updated_at,
          json_agg(
            json_build_object(
              'id', gri.id,
              'productId', gri.product_id,
              'productName', p.name,
              'batchNumber', gri.batch_number,
              'expiryDate', gri.expiry_date,
              'quantity', gri.quantity,
              'unitPrice', gri.unit_price,
              'subtotal', gri.subtotal,
              'taxAmount', gri.tax_amount,
              'discountAmount', gri.discount_amount,
              'total', gri.total
            )
          ) as items
        FROM goods_receipts gr
        LEFT JOIN suppliers s ON gr.supplier_id = s.id
        LEFT JOIN goods_receipt_items gri ON gr.id = gri.goods_receipt_id
        LEFT JOIN products p ON gri.product_id = p.id
        ${whereClause}
        GROUP BY gr.id, s.name
        ORDER BY gr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM goods_receipts gr
        ${whereClause}
      `;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const [receiptsResults, countResults] = await Promise.all([
        sequelize.query(goodsReceiptsQuery, { 
          bind: params, 
          type: QueryTypes.SELECT 
        }),
        sequelize.query(countQuery, { 
          bind: params.slice(0, -2), 
          type: QueryTypes.SELECT 
        })
      ]);

      const receipts = (receiptsResults as any[]).map(row => ({
        id: row.id,
        receiptNumber: row.receipt_number,
        purchaseOrderId: row.purchase_order_id,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        date: row.date,
        dueDate: row.due_date,
        status: row.status,
        subtotal: parseFloat(row.subtotal || 0),
        tax: parseFloat(row.tax || 0),
        discount: parseFloat(row.discount || 0),
        total: parseFloat(row.total || 0),
        financeStatus: row.finance_status,
        notes: row.notes,
        items: row.items || [],
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const total = parseInt((countResults as any[])[0]?.total || 0);
      const totalPages = Math.ceil(total / limitNum);

      responseData = {
        receipts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      };

      clearTimeout(timeoutId);
      operationLogger.info('Database goods receipts fetched successfully', { count: receipts.length });
      
    } catch (dbError) {
      clearTimeout(timeoutId);
      operationLogger.warn('Database operation failed, falling back to mock data', { 
        error: (dbError as Error).message 
      });
      
      // Fallback to mock data
      const mockReceipts = generateMockGoodsReceipts();
      isFromMock = true;
      
      // Apply filters to mock data
      let filteredReceipts = mockReceipts;
      
      if (supplierId) {
        filteredReceipts = filteredReceipts.filter(r => r.supplierId === supplierId);
      }
      
      if (status) {
        filteredReceipts = filteredReceipts.filter(r => r.status === status);
      }
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredReceipts = filteredReceipts.filter(r => {
          const receiptDate = new Date(r.date);
          return receiptDate >= start && receiptDate <= end;
        });
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex);

      responseData = {
        receipts: paginatedReceipts,
        pagination: {
          total: filteredReceipts.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(filteredReceipts.length / limitNum)
        }
      };
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Goods receipts berhasil diambil${isFromMock ? ' (simulasi)' : ''}`,
      isFromMock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    operationLogger.error('Get goods receipts error', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data penerimaan barang',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

async function handleCreateGoodsReceipt(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = {
    info: (msg: string, data?: any) => logger.info(`POST goods-receipts - ${msg}`, data),
    warn: (msg: string, data?: any) => logger.warn(`POST goods-receipts - ${msg}`, data),
    error: (msg: string, data?: any) => logger.error(`POST goods-receipts - ${msg}`, data)
  };
  
  try {
    const receiptData = req.body;
    
    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!receiptData.receiptNumber?.trim()) {
      validationErrors.push('Receipt number is required');
    } else if (receiptData.receiptNumber.length < 3) {
      validationErrors.push('Receipt number must be at least 3 characters');
    }
    
    if (!receiptData.supplierId?.trim()) {
      validationErrors.push('Supplier ID is required');
    }
    
    if (!receiptData.supplierName?.trim()) {
      validationErrors.push('Supplier name is required');
    }
    
    if (!receiptData.date) {
      validationErrors.push('Receipt date is required');
    } else {
      const receiptDate = new Date(receiptData.date);
      const today = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setDate(today.getDate() + 7);
      const minPastDate = new Date();
      minPastDate.setFullYear(today.getFullYear() - 1);
      
      if (receiptDate > maxFutureDate) {
        validationErrors.push('Receipt date cannot be more than 7 days in the future');
      }
      if (receiptDate < minPastDate) {
        validationErrors.push('Receipt date cannot be more than 1 year in the past');
      }
    }
    
    if (!receiptData.items || !Array.isArray(receiptData.items) || receiptData.items.length === 0) {
      validationErrors.push('At least one receipt item is required');
    } else {
      receiptData.items.forEach((item: any, index: number) => {
        const itemPrefix = `Item ${index + 1}`;
        
        if (!item.productId?.trim()) {
          validationErrors.push(`${itemPrefix}: Product ID is required`);
        }
        
        if (!item.productName?.trim()) {
          validationErrors.push(`${itemPrefix}: Product name is required`);
        }
        
        if (!item.batchNumber?.trim()) {
          validationErrors.push(`${itemPrefix}: Batch number is required`);
        } else if (item.batchNumber.length < 2) {
          validationErrors.push(`${itemPrefix}: Batch number must be at least 2 characters`);
        }
        
        if (!item.expiryDate) {
          validationErrors.push(`${itemPrefix}: Expiry date is required`);
        } else {
          const expiryDate = new Date(item.expiryDate);
          const today = new Date();
          const minExpiryDate = new Date();
          minExpiryDate.setMonth(today.getMonth() + 1);
          
          if (expiryDate <= today) {
            validationErrors.push(`${itemPrefix}: Expiry date must be in the future`);
          } else if (expiryDate < minExpiryDate) {
            validationErrors.push(`${itemPrefix}: Expiry date must be at least 1 month from now`);
          }
        }
        
        if (!item.quantity || item.quantity <= 0) {
          validationErrors.push(`${itemPrefix}: Quantity must be greater than 0`);
        } else if (item.quantity > 10000) {
          validationErrors.push(`${itemPrefix}: Quantity cannot exceed 10,000`);
        }
        
        if (!item.unitPrice || item.unitPrice <= 0) {
          validationErrors.push(`${itemPrefix}: Unit price must be greater than 0`);
        } else if (item.unitPrice > 10000000) {
          validationErrors.push(`${itemPrefix}: Unit price cannot exceed Rp 10,000,000`);
        }
      });
      
      // Check for duplicate batch numbers for same product
      const batchMap = new Map();
      receiptData.items.forEach((item: any, index: number) => {
        const key = `${item.productId}-${item.batchNumber}`;
        if (batchMap.has(key)) {
          validationErrors.push(`Item ${index + 1}: Duplicate batch number ${item.batchNumber} for the same product`);
        } else {
          batchMap.set(key, true);
        }
      });
    }
    
    // Check total amount limits
    if (receiptData.items && Array.isArray(receiptData.items)) {
      const totalAmount = receiptData.items.reduce((sum: number, item: any) => 
        sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0
      );
      if (totalAmount > 1000000000) {
        validationErrors.push('Total receipt value cannot exceed Rp 1,000,000,000');
      }
    }
    
    if (validationErrors.length > 0) {
      operationLogger.warn('Validation failed for goods receipt creation', { 
        errors: validationErrors,
        receiptNumber: receiptData.receiptNumber 
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        timestamp: new Date().toISOString()
      });
    }
    
    operationLogger.info('Processing goods receipt creation', { receiptNumber: receiptData.receiptNumber });

    // Set timeout for database operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let responseData;
    let isFromMock = false;

    try {
      // Start transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Insert goods receipt
        const insertReceiptQuery = `
          INSERT INTO goods_receipts (
            id, receipt_number, purchase_order_id, supplier_id, receipt_date, 
            due_date, status, subtotal, tax, discount, total, finance_status, 
            notes, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          ) RETURNING *
        `;

        const receiptId = `gr-${Date.now()}`;
        const now = new Date().toISOString();

        const [receiptResult] = await sequelize.query(insertReceiptQuery, {
          bind: [
            receiptId,
            receiptData.receiptNumber,
            receiptData.purchaseOrderId,
            receiptData.supplierId,
            receiptData.date,
            receiptData.dueDate,
            receiptData.status || 'pending',
            receiptData.subtotal,
            receiptData.tax || 0,
            receiptData.discount || 0,
            receiptData.total,
            receiptData.financeStatus || 'pending',
            receiptData.notes,
            receiptData.createdBy || 'system',
            now,
            now
          ],
          type: QueryTypes.INSERT,
          transaction
        });

        // Insert goods receipt items
        if (receiptData.items && receiptData.items.length > 0) {
          for (const item of receiptData.items) {
            const insertItemQuery = `
              INSERT INTO goods_receipt_items (
                id, goods_receipt_id, product_id, batch_number, expiry_date,
                quantity, unit_price, subtotal, tax_amount, discount_amount, total,
                created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
              )
            `;

            await sequelize.query(insertItemQuery, {
              bind: [
                `gri-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                receiptId,
                item.productId,
                item.batchNumber,
                item.expiryDate,
                item.quantity,
                item.unitPrice,
                item.subtotal,
                item.taxAmount || 0,
                item.discountAmount || 0,
                item.total,
                now,
                now
              ],
              type: QueryTypes.INSERT,
              transaction
            });

            // Update product stock
            const updateStockQuery = `
              UPDATE products 
              SET current_stock = current_stock + $1, updated_at = $2
              WHERE id = $3
            `;

            await sequelize.query(updateStockQuery, {
              bind: [item.quantity, now, item.productId],
              type: QueryTypes.UPDATE,
              transaction
            });

            // Create stock movement record
            const insertMovementQuery = `
              INSERT INTO stock_movements (
                id, product_id, movement_type, quantity, reference_type, 
                reference_id, notes, created_by, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
              )
            `;

            await sequelize.query(insertMovementQuery, {
              bind: [
                `sm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                item.productId,
                'in',
                item.quantity,
                'goods_receipt',
                receiptId,
                `Penerimaan barang: ${receiptData.receiptNumber}`,
                receiptData.createdBy || 'system',
                now
              ],
              type: QueryTypes.INSERT,
              transaction
            });
          }
        }

        await transaction.commit();

        responseData = {
          id: receiptId,
          receiptNumber: receiptData.receiptNumber,
          status: 'created',
          message: 'Penerimaan barang berhasil dibuat dan stok diperbarui'
        };

        clearTimeout(timeoutId);
        operationLogger.info('Goods receipt created successfully', { receiptId });
        
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
      
    } catch (dbError) {
      clearTimeout(timeoutId);
      operationLogger.warn('Database operation failed, using mock response', { 
        error: (dbError as Error).message 
      });
      
      // Fallback to mock response
      isFromMock = true;
      responseData = {
        id: `gr-mock-${Date.now()}`,
        receiptNumber: receiptData.receiptNumber,
        status: 'created',
        message: 'Penerimaan barang berhasil dibuat (simulasi)'
      };
    }

    return res.status(201).json({
      success: true,
      data: responseData,
      message: `Penerimaan barang berhasil dibuat${isFromMock ? ' (simulasi)' : ''}`,
      isFromMock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    operationLogger.error('Create goods receipt error', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat penerimaan barang',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
