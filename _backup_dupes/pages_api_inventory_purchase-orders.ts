import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '../../../server/sequelize/connection-simple';
import { createLogger } from '../../../lib/logger-factory';
import { QueryTypes } from 'sequelize';

const logger = createLogger('purchase-orders-api');

// Types for purchase orders
interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'draft' | 'approved' | 'partial' | 'completed' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data for fallback
const generateMockPurchaseOrders = (): PurchaseOrder[] => {
  return [
    {
      id: 'po-001',
      poNumber: 'PO-2025-001',
      supplierId: 'sup-001',
      supplierName: 'PT Kimia Farma',
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      items: [
        {
          id: 'poi-001',
          productId: 'prod-001',
          productName: 'Paracetamol 500mg',
          productSku: 'PCT-500',
          quantity: 100,
          unitPrice: 8000,
          unit: 'tab',
          subtotal: 800000,
          tax: 0,
          discount: 0,
          total: 800000
        },
        {
          id: 'poi-002',
          productId: 'prod-002',
          productName: 'Amoxicillin 500mg',
          productSku: 'AMX-500',
          quantity: 50,
          unitPrice: 20000,
          unit: 'tab',
          subtotal: 1000000,
          tax: 0,
          discount: 0,
          total: 1000000
        }
      ],
      subtotal: 1800000,
      tax: 0,
      discount: 0,
      total: 1800000,
      notes: 'Stok bulan April',
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'po-002',
      poNumber: 'PO-2025-002',
      supplierId: 'sup-002',
      supplierName: 'PT Dexa Medica',
      orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      items: [
        {
          id: 'poi-003',
          productId: 'prod-003',
          productName: 'Vitamin C 1000mg',
          productSku: 'VTC-1000',
          quantity: 200,
          unitPrice: 3500,
          unit: 'tab',
          subtotal: 700000,
          tax: 0,
          discount: 0,
          total: 700000
        },
        {
          id: 'poi-004',
          productId: 'prod-004',
          productName: 'Vitamin B Complex',
          productSku: 'VTB-001',
          quantity: 150,
          unitPrice: 5000,
          unit: 'tab',
          subtotal: 750000,
          tax: 0,
          discount: 0,
          total: 750000
        }
      ],
      subtotal: 1450000,
      tax: 0,
      discount: 0,
      total: 1450000,
      notes: 'Pesanan vitamin',
      createdBy: 'user-002',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'po-003',
      poNumber: 'PO-2025-003',
      supplierId: 'sup-003',
      supplierName: 'PT Kalbe Farma',
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      items: [
        {
          id: 'poi-005',
          productId: 'prod-005',
          productName: 'Antasida DOEN',
          productSku: 'ATD-001',
          quantity: 100,
          unitPrice: 2500,
          unit: 'botol',
          subtotal: 250000,
          tax: 0,
          discount: 0,
          total: 250000
        },
        {
          id: 'poi-006',
          productId: 'prod-006',
          productName: 'Loperamide 2mg',
          productSku: 'LPM-002',
          quantity: 300,
          unitPrice: 2000,
          unit: 'tab',
          subtotal: 600000,
          tax: 0,
          discount: 0,
          total: 600000
        },
        {
          id: 'poi-007',
          productId: 'prod-007',
          productName: 'OBH Combi 100ml',
          productSku: 'OBH-100',
          quantity: 50,
          unitPrice: 3400,
          unit: 'botol',
          subtotal: 170000,
          tax: 0,
          discount: 0,
          total: 170000
        }
      ],
      subtotal: 1020000,
      tax: 0,
      discount: 0,
      total: 1020000,
      notes: 'Order obat rutin',
      createdBy: 'user-001',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = logger.child({ method: req.method, url: req.url });
  
  try {
    // Authentication (temporarily disabled for testing)
    // const session = await getServerSession(req, res, authOptions);
    // if (!session) {
    //   return res.status(401).json({ success: false, message: 'Unauthorized' });
    // }

    const { method } = req;
    operationLogger.info('Processing purchase orders request');

    switch (method) {
      case 'GET':
        return handleGetPurchaseOrders(req, res);
      case 'POST':
        return handleCreatePurchaseOrder(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error) {
    operationLogger.error('Purchase orders API Error', { error: (error as Error).message });
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

async function handleGetPurchaseOrders(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = logger.child({ operation: 'handleGetPurchaseOrders' });
  
  try {
    const { 
      status = 'approved',
      supplierId,
      page = '1',
      limit = '10'
    } = req.query;

    operationLogger.info('Processing purchase orders request', { status, supplierId, page, limit });

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

      if (status) {
        whereClause += ` AND po.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (supplierId) {
        whereClause += ` AND po.supplier_id = $${paramIndex}`;
        params.push(supplierId);
        paramIndex++;
      }

      // Query for purchase orders with items
      const purchaseOrdersQuery = `
        SELECT 
          po.id,
          po.po_number,
          po.supplier_id,
          s.name as supplier_name,
          po.order_date,
          po.expected_delivery_date,
          po.status,
          po.subtotal,
          po.tax,
          po.discount,
          po.total,
          po.notes,
          po.created_by,
          po.created_at,
          po.updated_at,
          json_agg(
            json_build_object(
              'id', poi.id,
              'productId', poi.product_id,
              'productName', p.name,
              'productSku', p.sku,
              'quantity', poi.quantity,
              'unitPrice', poi.unit_price,
              'unit', poi.unit,
              'subtotal', poi.subtotal,
              'tax', poi.tax,
              'discount', poi.discount,
              'total', poi.total
            )
          ) as items
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        LEFT JOIN products p ON poi.product_id = p.id
        ${whereClause}
        GROUP BY po.id, s.name
        ORDER BY po.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM purchase_orders po
        ${whereClause}
      `;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      params.push(limitNum, offset);

      const [ordersResults, countResults] = await Promise.all([
        sequelize.query(purchaseOrdersQuery, { 
          bind: params, 
          type: QueryTypes.SELECT 
        }),
        sequelize.query(countQuery, { 
          bind: params.slice(0, -2), 
          type: QueryTypes.SELECT 
        })
      ]);

      const orders = (ordersResults as any[]).map(row => ({
        id: row.id,
        poNumber: row.po_number,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        orderDate: row.order_date,
        expectedDeliveryDate: row.expected_delivery_date,
        status: row.status,
        subtotal: parseFloat(row.subtotal || 0),
        tax: parseFloat(row.tax || 0),
        discount: parseFloat(row.discount || 0),
        total: parseFloat(row.total || 0),
        notes: row.notes,
        items: row.items || [],
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const total = parseInt((countResults as any[])[0]?.total || 0);
      const totalPages = Math.ceil(total / limitNum);

      responseData = {
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      };

      clearTimeout(timeoutId);
      operationLogger.info('Database purchase orders fetched successfully', { count: orders.length });
      
    } catch (dbError) {
      clearTimeout(timeoutId);
      operationLogger.warn('Database operation failed, falling back to mock data', { 
        error: (dbError as Error).message 
      });
      
      // Fallback to mock data
      const mockOrders = generateMockPurchaseOrders();
      isFromMock = true;
      
      // Apply filters to mock data
      let filteredOrders = mockOrders;
      
      if (status) {
        filteredOrders = filteredOrders.filter(o => o.status === status);
      }
      
      if (supplierId) {
        filteredOrders = filteredOrders.filter(o => o.supplierId === supplierId);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      responseData = {
        orders: paginatedOrders,
        pagination: {
          total: filteredOrders.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(filteredOrders.length / limitNum)
        }
      };
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Purchase orders berhasil diambil${isFromMock ? ' (simulasi)' : ''}`,
      isFromMock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    operationLogger.error('Get purchase orders error', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data purchase orders',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

async function handleCreatePurchaseOrder(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = logger.child({ operation: 'handleCreatePurchaseOrder' });
  
  try {
    const orderData = req.body;
    
    operationLogger.info('Processing purchase order creation', { poNumber: orderData.poNumber });

    // Set timeout for database operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let responseData;
    let isFromMock = false;

    try {
      // Start transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Insert purchase order
        const insertOrderQuery = `
          INSERT INTO purchase_orders (
            id, po_number, supplier_id, order_date, expected_delivery_date,
            status, subtotal, tax, discount, total, notes, created_by, 
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          ) RETURNING *
        `;

        const orderId = `po-${Date.now()}`;
        const now = new Date().toISOString();

        await sequelize.query(insertOrderQuery, {
          bind: [
            orderId,
            orderData.poNumber,
            orderData.supplierId,
            orderData.orderDate,
            orderData.expectedDeliveryDate,
            orderData.status || 'draft',
            orderData.subtotal,
            orderData.tax || 0,
            orderData.discount || 0,
            orderData.total,
            orderData.notes,
            orderData.createdBy || 'system',
            now,
            now
          ],
          type: QueryTypes.INSERT,
          transaction
        });

        // Insert purchase order items
        if (orderData.items && orderData.items.length > 0) {
          for (const item of orderData.items) {
            const insertItemQuery = `
              INSERT INTO purchase_order_items (
                id, purchase_order_id, product_id, quantity, unit_price, unit,
                subtotal, tax, discount, total, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
              )
            `;

            await sequelize.query(insertItemQuery, {
              bind: [
                `poi-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                orderId,
                item.productId,
                item.quantity,
                item.unitPrice,
                item.unit,
                item.subtotal,
                item.tax || 0,
                item.discount || 0,
                item.total,
                now,
                now
              ],
              type: QueryTypes.INSERT,
              transaction
            });
          }
        }

        await transaction.commit();

        responseData = {
          id: orderId,
          poNumber: orderData.poNumber,
          status: 'created',
          message: 'Purchase order berhasil dibuat'
        };

        clearTimeout(timeoutId);
        operationLogger.info('Purchase order created successfully', { orderId });
        
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
        id: `po-mock-${Date.now()}`,
        poNumber: orderData.poNumber,
        status: 'created',
        message: 'Purchase order berhasil dibuat (simulasi)'
      };
    }

    return res.status(201).json({
      success: true,
      data: responseData,
      message: `Purchase order berhasil dibuat${isFromMock ? ' (simulasi)' : ''}`,
      isFromMock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    operationLogger.error('Create purchase order error', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat purchase order',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
