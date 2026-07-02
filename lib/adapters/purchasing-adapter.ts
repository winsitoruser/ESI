import { BaseAdapter, ApiResponse } from './base-adapter';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  status: 'PENDING' | 'PARTIAL' | 'RECEIVED';
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  requestedBy: string;
  requestedByName: string;
  requestDate: string;
  requiredDate: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  items: PurchaseRequestItem[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface PurchaseRequestItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  requestedQuantity: number;
  currentStock: number;
  reorderPoint: number;
  estimatedPrice: number;
  justification?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
}

export class PurchasingAdapter extends BaseAdapter {

  async getPurchaseOrders(filters: {
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: PurchaseOrder[]; pagination: any }>> {
    const { status, supplierId, dateFrom, dateTo, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (status) {
      whereClause += ' AND po.status = :status';
      replacements.status = status;
    }

    if (supplierId) {
      whereClause += ' AND po.supplier_id = :supplierId';
      replacements.supplierId = supplierId;
    }

    if (dateFrom) {
      whereClause += ' AND po.order_date >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND po.order_date <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        po.id,
        po.order_number as "orderNumber",
        po.supplier_id as "supplierId",
        s.name as "supplierName",
        po.order_date as "orderDate",
        po.expected_date as "expectedDate",
        po.status,
        po.subtotal,
        po.tax,
        po.discount,
        po.total,
        po.notes,
        po.created_by as "createdBy",
        po.approved_by as "approvedBy",
        po.created_at as "createdAt",
        po.approved_at as "approvedAt"
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchase_orders po
      ${whereClause.replace('ORDER BY po.created_at DESC LIMIT :limit OFFSET :offset', '')}
    `;

    return this.withFallback(
      async () => {
        const [items, countResult] = await Promise.all([
          this.executeQuery<PurchaseOrder>(query, replacements),
          this.executeQuery<{ total: string }>(countQuery, replacements)
        ]);

        // Get items for each purchase order
        for (const order of items) {
          const itemsQuery = `
            SELECT 
              poi.id,
              poi.product_id as "productId",
              p.name as "productName",
              p.sku,
              poi.quantity,
              poi.unit_price as "unitPrice",
              poi.total_price as "totalPrice",
              poi.received_quantity as "receivedQuantity",
              poi.status
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.purchase_order_id = :orderId
          `;
          
          order.items = await this.executeQuery<PurchaseOrderItem>(itemsQuery, { orderId: order.id });
        }

        const total = parseInt(countResult[0]?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        };
      },
      {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      'Get purchase orders'
    );
  }

  async createPurchaseOrder(orderData: {
    supplierId: string;
    expectedDate: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
    createdBy: string;
  }): Promise<ApiResponse<PurchaseOrder>> {
    return this.executeTransaction(async (transaction) => {
      // Calculate totals
      let subtotal = 0;
      const processedItems = [];

      for (const item of orderData.items) {
        const totalPrice = item.quantity * item.unitPrice;
        subtotal += totalPrice;
        
        processedItems.push({
          ...item,
          totalPrice
        });
      }

      const tax = subtotal * 0.11; // 11% PPN
      const total = subtotal + tax;

      // Generate order number
      const numberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1 as next_number
        FROM purchase_orders 
        WHERE order_number LIKE 'PO%'
      `;
      
      const numberResult = await this.executeQuery<{ next_number: number }>(numberQuery, {}, { transaction });
      const orderNumber = `PO${String(numberResult[0].next_number).padStart(8, '0')}`;

      // Create purchase order
      const orderQuery = `
        INSERT INTO purchase_orders (
          order_number, supplier_id, order_date, expected_date, status,
          subtotal, tax, discount, total, notes, created_by, created_at
        ) VALUES (
          :orderNumber, :supplierId, CURRENT_DATE, :expectedDate, 'DRAFT',
          :subtotal, :tax, 0, :total, :notes, :createdBy, NOW()
        ) RETURNING *
      `;

      const orderResult = await this.executeQuery<PurchaseOrder>(orderQuery, {
        orderNumber,
        supplierId: orderData.supplierId,
        expectedDate: orderData.expectedDate,
        subtotal,
        tax,
        total,
        notes: orderData.notes,
        createdBy: orderData.createdBy
      }, { transaction });

      const purchaseOrderId = orderResult[0].id;

      // Create purchase order items
      for (const item of processedItems) {
        const itemQuery = `
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_price, total_price, 
            received_quantity, status
          ) VALUES (
            :purchaseOrderId, :productId, :quantity, :unitPrice, :totalPrice, 0, 'PENDING'
          )
        `;

        await this.executeQuery(itemQuery, {
          purchaseOrderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }, { transaction });
      }

      // Get complete purchase order with items
      const completePO = await this.getPurchaseOrderById(purchaseOrderId);
      return this.createSuccessResponse(completePO.data!, 'Purchase order created successfully');
    });
  }

  async getPurchaseOrderById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    const query = `
      SELECT 
        po.id,
        po.order_number as "orderNumber",
        po.supplier_id as "supplierId",
        s.name as "supplierName",
        po.order_date as "orderDate",
        po.expected_date as "expectedDate",
        po.status,
        po.subtotal,
        po.tax,
        po.discount,
        po.total,
        po.notes,
        po.created_by as "createdBy",
        po.approved_by as "approvedBy",
        po.created_at as "createdAt",
        po.approved_at as "approvedAt"
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = :id
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<PurchaseOrder>(query, { id });
        if (results.length === 0) {
          throw new Error('Purchase order not found');
        }

        const order = results[0];

        // Get purchase order items
        const itemsQuery = `
          SELECT 
            poi.id,
            poi.product_id as "productId",
            p.name as "productName",
            p.sku,
            poi.quantity,
            poi.unit_price as "unitPrice",
            poi.total_price as "totalPrice",
            poi.received_quantity as "receivedQuantity",
            poi.status
          FROM purchase_order_items poi
          LEFT JOIN products p ON poi.product_id = p.id
          WHERE poi.purchase_order_id = :orderId
        `;
        
        order.items = await this.executeQuery<PurchaseOrderItem>(itemsQuery, { orderId: order.id });

        return order;
      },
      {
        id,
        orderNumber: 'PO00000000',
        supplierId: 'unknown',
        supplierName: 'Unknown Supplier',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        createdBy: 'system',
        createdAt: new Date().toISOString()
      },
      'Get purchase order by ID'
    );
  }

  async approvePurchaseOrder(id: string, approvedBy: string): Promise<ApiResponse<PurchaseOrder>> {
    return this.executeTransaction(async (transaction) => {
      const updateQuery = `
        UPDATE purchase_orders 
        SET status = 'APPROVED', approved_by = :approvedBy, approved_at = NOW()
        WHERE id = :id AND status = 'PENDING'
        RETURNING *
      `;

      const results = await this.executeQuery<PurchaseOrder>(updateQuery, { id, approvedBy }, { transaction });
      
      if (results.length === 0) {
        throw new Error('Purchase order not found or cannot be approved');
      }

      return this.createSuccessResponse(results[0], 'Purchase order approved successfully');
    });
  }

  async getPurchaseRequests(filters: {
    status?: string;
    requestedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: PurchaseRequest[]; pagination: any }>> {
    const { status, requestedBy, dateFrom, dateTo, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (status) {
      whereClause += ' AND pr.status = :status';
      replacements.status = status;
    }

    if (requestedBy) {
      whereClause += ' AND pr.requested_by = :requestedBy';
      replacements.requestedBy = requestedBy;
    }

    if (dateFrom) {
      whereClause += ' AND pr.request_date >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND pr.request_date <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        pr.id,
        pr.request_number as "requestNumber",
        pr.requested_by as "requestedBy",
        u.name as "requestedByName",
        pr.request_date as "requestDate",
        pr.required_date as "requiredDate",
        pr.status,
        pr.notes,
        pr.approved_by as "approvedBy",
        pr.approved_at as "approvedAt",
        pr.rejection_reason as "rejectionReason"
      FROM purchase_requests pr
      LEFT JOIN users u ON pr.requested_by = u.id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    return this.withFallback(
      async () => {
        const items = await this.executeQuery<PurchaseRequest>(query, replacements);
        
        // Get items for each request
        for (const request of items) {
          const itemsQuery = `
            SELECT 
              pri.id,
              pri.product_id as "productId",
              p.name as "productName",
              p.sku,
              pri.requested_quantity as "requestedQuantity",
              pri.current_stock as "currentStock",
              pri.reorder_point as "reorderPoint",
              pri.estimated_price as "estimatedPrice",
              pri.justification
            FROM purchase_request_items pri
            LEFT JOIN products p ON pri.product_id = p.id
            WHERE pri.purchase_request_id = :requestId
          `;
          
          request.items = await this.executeQuery<PurchaseRequestItem>(itemsQuery, { requestId: request.id });
        }

        return {
          items,
          pagination: {
            page,
            limit,
            total: items.length,
            totalPages: Math.ceil(items.length / limit),
            hasNext: false,
            hasPrev: false
          }
        };
      },
      {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      'Get purchase requests'
    );
  }

  async getSuppliers(filters: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: Supplier[]; pagination: any }>> {
    const { search, isActive, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += ' AND (s.name ILIKE :search OR s.code ILIKE :search OR s.email ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    if (isActive !== undefined) {
      whereClause += ' AND s.is_active = :isActive';
      replacements.isActive = isActive;
    }

    const query = `
      SELECT 
        s.id,
        s.code,
        s.name,
        s.contact_person as "contactPerson",
        s.email,
        s.phone,
        s.address,
        s.city,
        s.country,
        s.payment_terms as "paymentTerms",
        s.credit_limit as "creditLimit",
        s.is_active as "isActive",
        s.created_at as "createdAt"
      FROM suppliers s
      ${whereClause}
      ORDER BY s.name
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM suppliers s
      ${whereClause.replace('ORDER BY s.name LIMIT :limit OFFSET :offset', '')}
    `;

    return this.withFallback(
      async () => {
        const [items, countResult] = await Promise.all([
          this.executeQuery<Supplier>(query, replacements),
          this.executeQuery<{ total: string }>(countQuery, replacements)
        ]);

        const total = parseInt(countResult[0]?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        };
      },
      {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      'Get suppliers'
    );
  }

  async createSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt'>): Promise<ApiResponse<Supplier>> {
    return this.executeTransaction(async (transaction) => {
      const query = `
        INSERT INTO suppliers (
          code, name, contact_person, email, phone, address, city, country,
          payment_terms, credit_limit, is_active, created_at
        ) VALUES (
          :code, :name, :contactPerson, :email, :phone, :address, :city, :country,
          :paymentTerms, :creditLimit, :isActive, NOW()
        ) RETURNING *
      `;

      const results = await this.executeQuery<Supplier>(query, supplierData, { transaction });
      return this.createSuccessResponse(results[0], 'Supplier created successfully');
    });
  }

  async updateSupplier(id: string, supplierData: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return this.executeTransaction(async (transaction) => {
      const setParts: string[] = [];
      const replacements: any = { id };

      Object.entries(supplierData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          const dbKey = key === 'contactPerson' ? 'contact_person' : 
                       key === 'paymentTerms' ? 'payment_terms' :
                       key === 'creditLimit' ? 'credit_limit' :
                       key === 'isActive' ? 'is_active' : key;
          setParts.push(`${dbKey} = :${key}`);
          replacements[key] = value;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE suppliers 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE id = :id
        RETURNING *
      `;

      const results = await this.executeQuery<Supplier>(query, replacements, { transaction });
      if (results.length === 0) {
        throw new Error('Supplier not found');
      }

      return this.createSuccessResponse(results[0], 'Supplier updated successfully');
    });
  }

  async getPurchasingSummary(period: { from: string; to: string }): Promise<ApiResponse<any>> {
    const query = `
      SELECT 
        COUNT(CASE WHEN po.status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN po.status = 'APPROVED' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN po.status = 'RECEIVED' THEN 1 END) as received_orders,
        COALESCE(SUM(CASE WHEN po.status = 'RECEIVED' THEN po.total ELSE 0 END), 0) as total_received_value,
        COALESCE(SUM(CASE WHEN po.status IN ('APPROVED', 'RECEIVED') THEN po.total ELSE 0 END), 0) as total_committed_value
      FROM purchase_orders po
      WHERE po.order_date BETWEEN :dateFrom AND :dateTo
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery(query, {
          dateFrom: period.from,
          dateTo: period.to
        });

        const summary = results[0] || {};

        return {
          period,
          pendingOrders: parseInt(summary.pending_orders || '0'),
          approvedOrders: parseInt(summary.approved_orders || '0'),
          receivedOrders: parseInt(summary.received_orders || '0'),
          totalReceivedValue: parseFloat(summary.total_received_value || '0'),
          totalCommittedValue: parseFloat(summary.total_committed_value || '0'),
          generatedAt: new Date().toISOString()
        };
      },
      {
        period,
        pendingOrders: 0,
        approvedOrders: 0,
        receivedOrders: 0,
        totalReceivedValue: 0,
        totalCommittedValue: 0,
        generatedAt: new Date().toISOString()
      },
      'Get purchasing summary'
    );
  }
}

export default PurchasingAdapter;
