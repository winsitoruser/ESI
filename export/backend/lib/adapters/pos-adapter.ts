import { BaseAdapter, ApiResponse } from './base-adapter';

export interface POSTransaction {
  id: string;
  transactionNumber: string;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  items: POSTransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'QRIS' | 'EWALLET';
  paymentAmount: number;
  changeAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface POSTransactionItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Shift {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  totalTransactions: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface PaymentSummary {
  cash: number;
  card: number;
  qris: number;
  ewallet: number;
  total: number;
}

export class POSAdapter extends BaseAdapter {

  async getTransactions(filters: {
    cashierId?: string;
    customerId?: string;
    status?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: POSTransaction[]; pagination: any }>> {
    const { cashierId, customerId, status, paymentMethod, dateFrom, dateTo, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (cashierId) {
      whereClause += ' AND t.cashier_id = :cashierId';
      replacements.cashierId = cashierId;
    }

    if (customerId) {
      whereClause += ' AND t.customer_id = :customerId';
      replacements.customerId = customerId;
    }

    if (status) {
      whereClause += ' AND t.status = :status';
      replacements.status = status;
    }

    if (paymentMethod) {
      whereClause += ' AND t.payment_method = :paymentMethod';
      replacements.paymentMethod = paymentMethod;
    }

    if (dateFrom) {
      whereClause += ' AND DATE(t.created_at) >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND DATE(t.created_at) <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        t.id,
        t.transaction_number as "transactionNumber",
        t.customer_id as "customerId",
        c.name as "customerName",
        t.cashier_id as "cashierId",
        u.name as "cashierName",
        t.subtotal,
        t.tax,
        t.discount,
        t.total,
        t.payment_method as "paymentMethod",
        t.payment_amount as "paymentAmount",
        t.change_amount as "changeAmount",
        t.status,
        t.notes,
        t.created_at as "createdAt",
        t.completed_at as "completedAt"
      FROM pos_transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.cashier_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM pos_transactions t
      ${whereClause.replace('ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset', '')}
    `;

    return this.withFallback(
      async () => {
        const [items, countResult] = await Promise.all([
          this.executeQuery<POSTransaction>(query, replacements),
          this.executeQuery<{ total: string }>(countQuery, replacements)
        ]);

        // Get items for each transaction
        for (const transaction of items) {
          const itemsQuery = `
            SELECT 
              pti.id,
              pti.product_id as "productId",
              p.name as "productName",
              p.sku,
              pti.quantity,
              pti.unit_price as "unitPrice",
              pti.discount,
              pti.total_price as "totalPrice",
              pti.batch_number as "batchNumber",
              pti.expiry_date as "expiryDate"
            FROM pos_transaction_items pti
            LEFT JOIN products p ON pti.product_id = p.id
            WHERE pti.transaction_id = :transactionId
          `;
          
          transaction.items = await this.executeQuery<POSTransactionItem>(itemsQuery, { transactionId: transaction.id });
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
      'Get POS transactions'
    );
  }

  async createTransaction(transactionData: {
    customerId?: string;
    cashierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      batchNumber?: string;
    }>;
    paymentMethod: string;
    paymentAmount: number;
    notes?: string;
  }): Promise<ApiResponse<POSTransaction>> {
    return this.executeTransaction(async (transaction) => {
      // Calculate totals
      let subtotal = 0;
      const processedItems = [];

      for (const item of transactionData.items) {
        const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
        subtotal += itemTotal;
        
        processedItems.push({
          ...item,
          discount: item.discount || 0,
          totalPrice: itemTotal
        });
      }

      const tax = subtotal * 0.11; // 11% PPN
      const total = subtotal + tax;
      const changeAmount = transactionData.paymentAmount - total;

      // Generate transaction number
      const numberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS INTEGER)), 0) + 1 as next_number
        FROM pos_transactions 
        WHERE transaction_number LIKE 'TXN%'
      `;
      
      const numberResult = await this.executeQuery<{ next_number: number }>(numberQuery, {}, { transaction });
      const transactionNumber = `TXN${String(numberResult[0].next_number).padStart(8, '0')}`;

      // Create transaction
      const transactionQuery = `
        INSERT INTO pos_transactions (
          transaction_number, customer_id, cashier_id, subtotal, tax, discount,
          total, payment_method, payment_amount, change_amount, status, notes, created_at
        ) VALUES (
          :transactionNumber, :customerId, :cashierId, :subtotal, :tax, 0,
          :total, :paymentMethod, :paymentAmount, :changeAmount, 'COMPLETED', :notes, NOW()
        ) RETURNING *
      `;

      const transactionResult = await this.executeQuery<POSTransaction>(transactionQuery, {
        transactionNumber,
        customerId: transactionData.customerId,
        cashierId: transactionData.cashierId,
        subtotal,
        tax,
        total,
        paymentMethod: transactionData.paymentMethod,
        paymentAmount: transactionData.paymentAmount,
        changeAmount,
        notes: transactionData.notes
      }, { transaction });

      const newTransactionId = transactionResult[0].id;

      // Create transaction items and update stock
      for (const item of processedItems) {
        // Insert transaction item
        const itemQuery = `
          INSERT INTO pos_transaction_items (
            transaction_id, product_id, quantity, unit_price, discount, total_price, batch_number
          ) VALUES (
            :transactionId, :productId, :quantity, :unitPrice, :discount, :totalPrice, :batchNumber
          )
        `;

        await this.executeQuery(itemQuery, {
          transactionId: newTransactionId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.totalPrice,
          batchNumber: item.batchNumber
        }, { transaction });

        // Update product stock
        const stockQuery = `
          UPDATE products 
          SET stock = stock - :quantity, updated_at = NOW()
          WHERE id = :productId
        `;

        await this.executeQuery(stockQuery, {
          productId: item.productId,
          quantity: item.quantity
        }, { transaction });

        // Create stock movement record
        const movementQuery = `
          INSERT INTO stock_movements (
            product_id, type, quantity, previous_stock, new_stock, reason, reference, created_by, created_at
          ) VALUES (
            :productId, 'OUT', :quantity, 
            (SELECT stock + :quantity FROM products WHERE id = :productId),
            (SELECT stock FROM products WHERE id = :productId),
            'POS Sale', :transactionNumber, :cashierId, NOW()
          )
        `;

        await this.executeQuery(movementQuery, {
          productId: item.productId,
          quantity: item.quantity,
          transactionNumber,
          cashierId: transactionData.cashierId
        }, { transaction });
      }

      // Get complete transaction with items
      const completeTransaction = await this.getTransactionById(newTransactionId);
      return this.createSuccessResponse(completeTransaction.data!, 'Transaction created successfully');
    });
  }

  async getTransactionById(id: string): Promise<ApiResponse<POSTransaction>> {
    const query = `
      SELECT 
        t.id,
        t.transaction_number as "transactionNumber",
        t.customer_id as "customerId",
        c.name as "customerName",
        t.cashier_id as "cashierId",
        u.name as "cashierName",
        t.subtotal,
        t.tax,
        t.discount,
        t.total,
        t.payment_method as "paymentMethod",
        t.payment_amount as "paymentAmount",
        t.change_amount as "changeAmount",
        t.status,
        t.notes,
        t.created_at as "createdAt",
        t.completed_at as "completedAt"
      FROM pos_transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.cashier_id = u.id
      WHERE t.id = :id
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<POSTransaction>(query, { id });
        if (results.length === 0) {
          throw new Error('Transaction not found');
        }

        const transaction = results[0];

        // Get transaction items
        const itemsQuery = `
          SELECT 
            pti.id,
            pti.product_id as "productId",
            p.name as "productName",
            p.sku,
            pti.quantity,
            pti.unit_price as "unitPrice",
            pti.discount,
            pti.total_price as "totalPrice",
            pti.batch_number as "batchNumber",
            pti.expiry_date as "expiryDate"
          FROM pos_transaction_items pti
          LEFT JOIN products p ON pti.product_id = p.id
          WHERE pti.transaction_id = :transactionId
        `;
        
        transaction.items = await this.executeQuery<POSTransactionItem>(itemsQuery, { transactionId: transaction.id });

        return transaction;
      },
      {
        id,
        transactionNumber: 'TXN00000000',
        cashierId: 'unknown',
        cashierName: 'Unknown Cashier',
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paymentMethod: 'CASH',
        paymentAmount: 0,
        changeAmount: 0,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      'Get transaction by ID'
    );
  }

  async getCurrentShift(cashierId: string): Promise<ApiResponse<Shift | null>> {
    const query = `
      SELECT 
        s.id,
        s.shift_number as "shiftNumber",
        s.cashier_id as "cashierId",
        u.name as "cashierName",
        s.start_time as "startTime",
        s.end_time as "endTime",
        s.opening_cash as "openingCash",
        s.closing_cash as "closingCash",
        s.total_sales as "totalSales",
        s.total_transactions as "totalTransactions",
        s.status,
        s.notes
      FROM pos_shifts s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.cashier_id = :cashierId AND s.status = 'OPEN'
      ORDER BY s.start_time DESC
      LIMIT 1
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<Shift>(query, { cashierId });
        return results.length > 0 ? results[0] : null;
      },
      null,
      'Get current shift'
    );
  }

  async startShift(cashierId: string, openingCash: number): Promise<ApiResponse<Shift>> {
    return this.executeTransaction(async (transaction) => {
      // Check if there's already an open shift
      const existingShift = await this.getCurrentShift(cashierId);
      if (existingShift.data) {
        throw new Error('There is already an open shift for this cashier');
      }

      // Generate shift number
      const numberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(shift_number FROM 6) AS INTEGER)), 0) + 1 as next_number
        FROM pos_shifts 
        WHERE shift_number LIKE 'SHIFT%'
      `;
      
      const numberResult = await this.executeQuery<{ next_number: number }>(numberQuery, {}, { transaction });
      const shiftNumber = `SHIFT${String(numberResult[0].next_number).padStart(6, '0')}`;

      const insertQuery = `
        INSERT INTO pos_shifts (
          shift_number, cashier_id, start_time, opening_cash, total_sales, 
          total_transactions, status
        ) VALUES (
          :shiftNumber, :cashierId, NOW(), :openingCash, 0, 0, 'OPEN'
        ) RETURNING *
      `;

      const results = await this.executeQuery<Shift>(insertQuery, {
        shiftNumber,
        cashierId,
        openingCash
      }, { transaction });

      return this.createSuccessResponse(results[0], 'Shift started successfully');
    });
  }

  async endShift(shiftId: string, closingCash: number, notes?: string): Promise<ApiResponse<Shift>> {
    return this.executeTransaction(async (transaction) => {
      // Calculate shift totals
      const totalsQuery = `
        SELECT 
          COALESCE(SUM(total), 0) as total_sales,
          COUNT(*) as total_transactions
        FROM pos_transactions
        WHERE cashier_id = (SELECT cashier_id FROM pos_shifts WHERE id = :shiftId)
          AND created_at >= (SELECT start_time FROM pos_shifts WHERE id = :shiftId)
          AND status = 'COMPLETED'
      `;

      const totalsResult = await this.executeQuery<{ total_sales: number; total_transactions: number }>(
        totalsQuery, 
        { shiftId }, 
        { transaction }
      );

      const { total_sales, total_transactions } = totalsResult[0] || { total_sales: 0, total_transactions: 0 };

      // Update shift
      const updateQuery = `
        UPDATE pos_shifts 
        SET 
          end_time = NOW(),
          closing_cash = :closingCash,
          total_sales = :totalSales,
          total_transactions = :totalTransactions,
          status = 'CLOSED',
          notes = :notes
        WHERE id = :shiftId
        RETURNING *
      `;

      const results = await this.executeQuery<Shift>(updateQuery, {
        shiftId,
        closingCash,
        totalSales: total_sales,
        totalTransactions: total_transactions,
        notes
      }, { transaction });

      if (results.length === 0) {
        throw new Error('Shift not found');
      }

      return this.createSuccessResponse(results[0], 'Shift ended successfully');
    });
  }

  async getSalesReport(filters: {
    cashierId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<ApiResponse<{
    totalSales: number;
    totalTransactions: number;
    paymentSummary: PaymentSummary;
    topProducts: Array<{ productName: string; quantity: number; revenue: number }>;
  }>> {
    const { cashierId, dateFrom, dateTo } = filters;

    let whereClause = 'WHERE t.status = \'COMPLETED\'';
    const replacements: any = {};

    if (cashierId) {
      whereClause += ' AND t.cashier_id = :cashierId';
      replacements.cashierId = cashierId;
    }

    if (dateFrom) {
      whereClause += ' AND DATE(t.created_at) >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND DATE(t.created_at) <= :dateTo';
      replacements.dateTo = dateTo;
    }

    return this.withFallback(
      async () => {
        // Get sales summary
        const summaryQuery = `
          SELECT 
            COALESCE(SUM(total), 0) as total_sales,
            COUNT(*) as total_transactions,
            COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total ELSE 0 END), 0) as card_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'QRIS' THEN total ELSE 0 END), 0) as qris_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'EWALLET' THEN total ELSE 0 END), 0) as ewallet_sales
          FROM pos_transactions t
          ${whereClause}
        `;

        const summaryResult = await this.executeQuery(summaryQuery, replacements);
        const summary = summaryResult[0] || {};

        // Get top products
        const topProductsQuery = `
          SELECT 
            p.name as product_name,
            SUM(pti.quantity) as quantity,
            SUM(pti.total_price) as revenue
          FROM pos_transaction_items pti
          JOIN pos_transactions t ON pti.transaction_id = t.id
          JOIN products p ON pti.product_id = p.id
          ${whereClause}
          GROUP BY p.id, p.name
          ORDER BY revenue DESC
          LIMIT 10
        `;

        const topProducts = await this.executeQuery<{ product_name: string; quantity: number; revenue: number }>(
          topProductsQuery, 
          replacements
        );

        const totalSales = parseFloat(summary.total_sales || '0');
        const paymentSummary: PaymentSummary = {
          cash: parseFloat(summary.cash_sales || '0'),
          card: parseFloat(summary.card_sales || '0'),
          qris: parseFloat(summary.qris_sales || '0'),
          ewallet: parseFloat(summary.ewallet_sales || '0'),
          total: totalSales
        };

        return {
          totalSales,
          totalTransactions: parseInt(summary.total_transactions || '0'),
          paymentSummary,
          topProducts: topProducts.map(p => ({
            productName: p.product_name,
            quantity: parseInt(p.quantity.toString()),
            revenue: parseFloat(p.revenue.toString())
          }))
        };
      },
      {
        totalSales: 0,
        totalTransactions: 0,
        paymentSummary: { cash: 0, card: 0, qris: 0, ewallet: 0, total: 0 },
        topProducts: []
      },
      'Get sales report'
    );
  }
}

export default POSAdapter;
