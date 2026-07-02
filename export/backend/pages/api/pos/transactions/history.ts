import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

/**
 * POS Transaction History API
 * Provides comprehensive transaction history with filters, pagination, and export
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;
    const branchId = session.user.branchId;

    switch (req.method) {
      case 'GET':
        return getTransactionHistory(req, res, tenantId, branchId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Transaction History API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTransactionHistory(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | undefined,
  branchId: string | undefined
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  
  const {
    startDate,
    endDate,
    status = 'all',
    paymentMethod = 'all',
    cashierId,
    customerId,
    search,
    page = '1',
    limit = '25',
    sortBy = 'transaction_date',
    sortOrder = 'DESC'
  } = req.query;

  // Build filters
  let whereClause = `WHERE pt.tenant_id = :tenantId`;
  const replacements: any = { tenantId: tenantId || 'default' };

  if (branchId) {
    whereClause += ` AND pt.branch_id = :branchId`;
    replacements.branchId = branchId;
  }

  if (startDate) {
    whereClause += ` AND DATE(pt.transaction_date) >= :startDate`;
    replacements.startDate = startDate;
  }

  if (endDate) {
    whereClause += ` AND DATE(pt.transaction_date) <= :endDate`;
    replacements.endDate = endDate;
  }

  if (status && status !== 'all') {
    whereClause += ` AND pt.status = :status`;
    replacements.status = status;
  }

  if (paymentMethod && paymentMethod !== 'all') {
    whereClause += ` AND pt.payment_method = :paymentMethod`;
    replacements.paymentMethod = paymentMethod;
  }

  if (cashierId) {
    whereClause += ` AND pt.cashier_id = :cashierId`;
    replacements.cashierId = cashierId;
  }

  if (customerId) {
    whereClause += ` AND pt.customer_id = :customerId`;
    replacements.customerId = customerId;
  }

  if (search) {
    whereClause += ` AND (pt.transaction_number ILIKE :search OR c.name ILIKE :search OR u.name ILIKE :search)`;
    replacements.search = `%${search}%`;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const [countResult] = await sequelize.query(`
    SELECT COUNT(*) as total
    FROM pos_transactions pt
    LEFT JOIN customers c ON pt.customer_id = c.id
    LEFT JOIN users u ON pt.cashier_id = u.id
    ${whereClause}
  `, {
    replacements,
    type: QueryTypes.SELECT
  });

  const total = parseInt((countResult as any)?.total || 0);

  // Get transactions with details
  const transactions = await sequelize.query(`
    SELECT 
      pt.id,
      pt.transaction_number,
      pt.transaction_date,
      pt.subtotal,
      pt.discount_amount,
      pt.tax_amount,
      pt.total_amount,
      pt.payment_method,
      pt.payment_amount,
      pt.change_amount,
      pt.status,
      pt.notes,
      pt.created_at,
      c.id as customer_id,
      c.name as customer_name,
      c.phone as customer_phone,
      u.id as cashier_id,
      u.name as cashier_name,
      b.name as branch_name,
      (SELECT COUNT(*) FROM pos_transaction_items WHERE transaction_id = pt.id) as item_count,
      (SELECT SUM(quantity) FROM pos_transaction_items WHERE transaction_id = pt.id) as total_items
    FROM pos_transactions pt
    LEFT JOIN customers c ON pt.customer_id = c.id
    LEFT JOIN users u ON pt.cashier_id = u.id
    LEFT JOIN branches b ON pt.branch_id = b.id
    ${whereClause}
    ORDER BY ${sortBy === 'transaction_date' ? 'pt.transaction_date' : 'pt.' + sortBy} ${sortOrder}
    LIMIT :limit OFFSET :offset
  `, {
    replacements: { ...replacements, limit: limitNum, offset },
    type: QueryTypes.SELECT
  });

  // Get summary stats
  const [stats] = await sequelize.query(`
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(AVG(total_amount), 0) as avg_transaction,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as completed_sales,
      COUNT(CASE WHEN status = 'voided' THEN 1 END) as voided_count,
      COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_count
    FROM pos_transactions pt
    LEFT JOIN customers c ON pt.customer_id = c.id
    LEFT JOIN users u ON pt.cashier_id = u.id
    ${whereClause}
  `, {
    replacements,
    type: QueryTypes.SELECT
  });

  // Payment method breakdown
  const paymentBreakdown = await sequelize.query(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(total_amount) as total
    FROM pos_transactions pt
    LEFT JOIN customers c ON pt.customer_id = c.id
    LEFT JOIN users u ON pt.cashier_id = u.id
    ${whereClause}
    GROUP BY payment_method
  `, {
    replacements,
    type: QueryTypes.SELECT
  });

  return res.status(200).json({
    success: true,
    data: {
      transactions: transactions.map((t: any) => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        transactionDate: t.transaction_date,
        subtotal: parseFloat(t.subtotal || 0),
        discountAmount: parseFloat(t.discount_amount || 0),
        taxAmount: parseFloat(t.tax_amount || 0),
        totalAmount: parseFloat(t.total_amount || 0),
        paymentMethod: t.payment_method,
        paymentAmount: parseFloat(t.payment_amount || 0),
        changeAmount: parseFloat(t.change_amount || 0),
        status: t.status,
        notes: t.notes,
        customer: t.customer_id ? {
          id: t.customer_id,
          name: t.customer_name,
          phone: t.customer_phone
        } : null,
        cashier: {
          id: t.cashier_id,
          name: t.cashier_name
        },
        branch: t.branch_name,
        itemCount: parseInt(t.item_count || 0),
        totalItems: parseInt(t.total_items || 0),
        createdAt: t.created_at
      })),
      stats: {
        totalTransactions: parseInt((stats as any)?.total_transactions || 0),
        totalSales: parseFloat((stats as any)?.total_sales || 0),
        avgTransaction: parseFloat((stats as any)?.avg_transaction || 0),
        completedSales: parseFloat((stats as any)?.completed_sales || 0),
        voidedCount: parseInt((stats as any)?.voided_count || 0),
        refundedCount: parseInt((stats as any)?.refunded_count || 0)
      },
      paymentBreakdown: paymentBreakdown.map((p: any) => ({
        method: p.payment_method,
        count: parseInt(p.count),
        total: parseFloat(p.total)
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  });
}
