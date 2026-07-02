import { BaseAdapter, ApiResponse } from './base-adapter';
import { QueryTypes } from 'sequelize';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  reorderPoint: number;
  supplier: string;
  expiryDate?: string;
  batchNumber?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: string;
  createdBy: string;
  createdAt: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  receiptDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  items: GoodsReceiptItem[];
  totalAmount: number;
  createdBy: string;
  createdAt: string;
}

export interface GoodsReceiptItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string;
  expiryDate: string;
}

export class InventoryAdapter extends BaseAdapter {
  
  async getProducts(filters: {
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: Product[]; pagination: any }>> {
    const { search, category, lowStock, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += ' AND (p.name ILIKE :search OR p.sku ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    if (category) {
      whereClause += ' AND p.category = :category';
      replacements.category = category;
    }

    if (lowStock) {
      whereClause += ' AND p.stock <= p.reorder_point';
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category,
        p.unit,
        p.price,
        p.stock,
        p.reorder_point as "reorderPoint",
        s.name as supplier,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt"
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      ORDER BY p.name
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause.replace('LIMIT :limit OFFSET :offset', '')}
    `;

    return this.withFallback(
      async () => {
        const [items, countResult] = await Promise.all([
          this.executeQuery<Product>(query, replacements),
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
      'Get products'
    );
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category,
        p.unit,
        p.price,
        p.stock,
        p.reorder_point as "reorderPoint",
        s.name as supplier,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt"
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = :id
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<Product>(query, { id });
        if (results.length === 0) {
          throw new Error('Product not found');
        }
        return results[0];
      },
      {
        id,
        name: 'Unknown Product',
        sku: 'N/A',
        category: 'General',
        unit: 'PCS',
        price: 0,
        stock: 0,
        reorderPoint: 0,
        supplier: 'Unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      'Get product by ID'
    );
  }

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    return this.executeTransaction(async (transaction) => {
      const query = `
        INSERT INTO products (
          name, sku, category, unit, price, stock, reorder_point, supplier_id, created_at, updated_at
        ) VALUES (
          :name, :sku, :category, :unit, :price, :stock, :reorderPoint, 
          (SELECT id FROM suppliers WHERE name = :supplier LIMIT 1),
          NOW(), NOW()
        ) RETURNING *
      `;

      const results = await this.executeQuery<Product>(query, productData, { transaction });
      return this.createSuccessResponse(results[0], 'Product created successfully');
    });
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.executeTransaction(async (transaction) => {
      const setParts: string[] = [];
      const replacements: any = { id };

      Object.entries(productData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          const dbKey = key === 'reorderPoint' ? 'reorder_point' : 
                       key === 'isActive' ? 'is_active' : key;
          setParts.push(`${dbKey} = :${key}`);
          replacements[key] = value;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE products 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE id = :id
        RETURNING *
      `;

      const results = await this.executeQuery<Product>(query, replacements, { transaction });
      if (results.length === 0) {
        throw new Error('Product not found');
      }

      return this.createSuccessResponse(results[0], 'Product updated successfully');
    });
  }

  async getStockMovements(productId?: string, limit: number = 50): Promise<ApiResponse<StockMovement[]>> {
    let whereClause = '';
    const replacements: any = { limit };

    if (productId) {
      whereClause = 'WHERE sm.product_id = :productId';
      replacements.productId = productId;
    }

    const query = `
      SELECT 
        sm.id,
        sm.product_id as "productId",
        p.name as "productName",
        sm.type,
        sm.quantity,
        sm.previous_stock as "previousStock",
        sm.new_stock as "newStock",
        sm.reason,
        sm.reference,
        sm.created_by as "createdBy",
        sm.created_at as "createdAt"
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT :limit
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<StockMovement>(query, replacements);
        return results;
      },
      [],
      'Get stock movements'
    );
  }

  async createStockMovement(movementData: Omit<StockMovement, 'id' | 'createdAt'>): Promise<ApiResponse<StockMovement>> {
    return this.executeTransaction(async (transaction) => {
      // Update product stock
      const updateStockQuery = `
        UPDATE products 
        SET stock = :newStock, updated_at = NOW()
        WHERE id = :productId
      `;

      await this.executeQuery(updateStockQuery, {
        productId: movementData.productId,
        newStock: movementData.newStock
      }, { transaction });

      // Create movement record
      const insertQuery = `
        INSERT INTO stock_movements (
          product_id, type, quantity, previous_stock, new_stock, 
          reason, reference, created_by, created_at
        ) VALUES (
          :productId, :type, :quantity, :previousStock, :newStock,
          :reason, :reference, :createdBy, NOW()
        ) RETURNING *
      `;

      const results = await this.executeQuery<StockMovement>(insertQuery, movementData, { transaction });
      return this.createSuccessResponse(results[0], 'Stock movement created successfully');
    });
  }

  async getGoodsReceipts(filters: {
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: GoodsReceipt[]; pagination: any }>> {
    const { status, supplierId, dateFrom, dateTo, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (status) {
      whereClause += ' AND gr.status = :status';
      replacements.status = status;
    }

    if (supplierId) {
      whereClause += ' AND gr.supplier_id = :supplierId';
      replacements.supplierId = supplierId;
    }

    if (dateFrom) {
      whereClause += ' AND gr.receipt_date >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND gr.receipt_date <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        gr.id,
        gr.receipt_number as "receiptNumber",
        gr.supplier_id as "supplierId",
        s.name as "supplierName",
        gr.receipt_date as "receiptDate",
        gr.status,
        gr.total_amount as "totalAmount",
        gr.created_by as "createdBy",
        gr.created_at as "createdAt"
      FROM goods_receipts gr
      LEFT JOIN suppliers s ON gr.supplier_id = s.id
      ${whereClause}
      ORDER BY gr.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    return this.withFallback(
      async () => {
        const items = await this.executeQuery<GoodsReceipt>(query, replacements);
        
        // Get items for each receipt
        for (const receipt of items) {
          const itemsQuery = `
            SELECT 
              gri.id,
              gri.product_id as "productId",
              p.name as "productName",
              gri.quantity,
              gri.unit_price as "unitPrice",
              gri.total_price as "totalPrice",
              gri.batch_number as "batchNumber",
              gri.expiry_date as "expiryDate"
            FROM goods_receipt_items gri
            LEFT JOIN products p ON gri.product_id = p.id
            WHERE gri.goods_receipt_id = :receiptId
          `;
          
          receipt.items = await this.executeQuery<GoodsReceiptItem>(itemsQuery, { receiptId: receipt.id });
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
      'Get goods receipts'
    );
  }
}

export default InventoryAdapter;
