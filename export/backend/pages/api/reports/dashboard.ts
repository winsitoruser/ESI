import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = session.user.id;
    const tenantId = session.user.tenantId;

    // Get current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get previous month for comparison
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Sales Statistics
    const salesStats = await sequelize.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as current_month_sales,
        COUNT(*) as current_month_transactions,
        COALESCE(AVG(total_amount), 0) as avg_transaction_value
      FROM pos_transactions
      WHERE tenant_id = :tenantId
        AND transaction_date >= :firstDayOfMonth
        AND transaction_date <= :lastDayOfMonth
        AND status = 'completed'
    `, {
      replacements: { 
        tenantId, 
        firstDayOfMonth: firstDayOfMonth.toISOString(),
        lastDayOfMonth: lastDayOfMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    const prevSalesStats = await sequelize.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as prev_month_sales,
        COUNT(*) as prev_month_transactions
      FROM pos_transactions
      WHERE tenant_id = :tenantId
        AND transaction_date >= :firstDayOfPrevMonth
        AND transaction_date <= :lastDayOfPrevMonth
        AND status = 'completed'
    `, {
      replacements: { 
        tenantId, 
        firstDayOfPrevMonth: firstDayOfPrevMonth.toISOString(),
        lastDayOfPrevMonth: lastDayOfPrevMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    // 2. Inventory Statistics
    const inventoryStats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(ps.quantity), 0) as total_stock_quantity,
        COALESCE(SUM(ps.quantity * p.cost_price), 0) as total_inventory_value
      FROM products p
      LEFT JOIN product_stocks ps ON p.id = ps.product_id
      WHERE p.tenant_id = :tenantId
        AND p.is_active = true
    `, {
      replacements: { tenantId },
      type: QueryTypes.SELECT
    });

    const prevInventoryStats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT p.id) as prev_total_products
      FROM products p
      WHERE p.tenant_id = :tenantId
        AND p.is_active = true
        AND p.created_at < :firstDayOfMonth
    `, {
      replacements: { 
        tenantId,
        firstDayOfMonth: firstDayOfMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    // 3. Products Sold Statistics
    const productsSold = await sequelize.query(`
      SELECT 
        COALESCE(SUM(pti.quantity), 0) as total_products_sold
      FROM pos_transaction_items pti
      JOIN pos_transactions pt ON pti.transaction_id = pt.id
      WHERE pt.tenant_id = :tenantId
        AND pt.transaction_date >= :firstDayOfMonth
        AND pt.transaction_date <= :lastDayOfMonth
        AND pt.status = 'closed'
    `, {
      replacements: { 
        tenantId,
        firstDayOfMonth: firstDayOfMonth.toISOString(),
        lastDayOfMonth: lastDayOfMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    const prevProductsSold = await sequelize.query(`
      SELECT 
        COALESCE(SUM(pti.quantity), 0) as prev_products_sold
      FROM pos_transaction_items pti
      JOIN pos_transactions pt ON pti.transaction_id = pt.id
      WHERE pt.tenant_id = :tenantId
        AND pt.transaction_date >= :firstDayOfPrevMonth
        AND pt.transaction_date <= :lastDayOfPrevMonth
        AND pt.status = 'closed'
    `, {
      replacements: { 
        tenantId,
        firstDayOfPrevMonth: firstDayOfPrevMonth.toISOString(),
        lastDayOfPrevMonth: lastDayOfPrevMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    // 4. Customer Statistics
    const customerStats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT id) as total_customers
      FROM customers
      WHERE tenant_id = :tenantId
        AND is_active = true
    `, {
      replacements: { tenantId },
      type: QueryTypes.SELECT
    });

    const prevCustomerStats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT id) as prev_total_customers
      FROM customers
      WHERE tenant_id = :tenantId
        AND is_active = true
        AND created_at < :firstDayOfMonth
    `, {
      replacements: { 
        tenantId,
        firstDayOfMonth: firstDayOfMonth.toISOString()
      },
      type: QueryTypes.SELECT
    });

    // 5. Recent Reports (from a reports table if exists, or generate from transactions)
    const recentReports = await sequelize.query(`
      SELECT 
        'Laporan Penjualan Harian' as name,
        DATE(transaction_date) as date,
        'Penjualan' as type,
        'Selesai' as status,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_amount
      FROM pos_transactions
      WHERE tenant_id = :tenantId
        AND status = 'completed'
        AND transaction_date >= :lastWeek
      GROUP BY DATE(transaction_date)
      ORDER BY DATE(transaction_date) DESC
      LIMIT 4
    `, {
      replacements: { 
        tenantId,
        lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      type: QueryTypes.SELECT
    });

    // Calculate percentage changes
    const currentSales = parseFloat((salesStats[0] as any)?.current_month_sales || '0');
    const prevSales = parseFloat((prevSalesStats[0] as any)?.prev_month_sales || '0');
    const salesChange = prevSales > 0 ? ((currentSales - prevSales) / prevSales * 100).toFixed(1) : '0';

    const currentTransactions = parseInt((salesStats[0] as any)?.current_month_transactions || '0');
    const prevTransactions = parseInt((prevSalesStats[0] as any)?.prev_month_transactions || '0');
    const transactionsChange = prevTransactions > 0 ? ((currentTransactions - prevTransactions) / prevTransactions * 100).toFixed(1) : '0';

    const avgTransaction = parseFloat((salesStats[0] as any)?.avg_transaction_value || '0');
    const avgTransactionChange = '0'; // Can calculate if needed

    const currentProductsSold = parseInt((productsSold[0] as any)?.total_products_sold || '0');
    const prevProductsSoldCount = parseInt((prevProductsSold[0] as any)?.prev_products_sold || '0');
    const productsSoldChange = prevProductsSoldCount > 0 ? ((currentProductsSold - prevProductsSoldCount) / prevProductsSoldCount * 100).toFixed(1) : '0';

    const currentProducts = parseInt((inventoryStats[0] as any)?.total_products || '0');
    const prevProducts = parseInt((prevInventoryStats[0] as any)?.prev_total_products || '0');
    const productsChange = prevProducts > 0 ? ((currentProducts - prevProducts) / prevProducts * 100).toFixed(1) : '0';

    const currentCustomers = parseInt((customerStats[0] as any)?.total_customers || '0');
    const prevCustomers = parseInt((prevCustomerStats[0] as any)?.prev_total_customers || '0');
    const customersChange = prevCustomers > 0 ? ((currentCustomers - prevCustomers) / prevCustomers * 100).toFixed(1) : '0';

    // Format response
    const response = {
      success: true,
      data: {
        quickStats: [
          {
            label: 'Total Penjualan Bulan Ini',
            value: currentSales,
            valueFormatted: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(currentSales),
            change: `${salesChange >= 0 ? '+' : ''}${salesChange}%`,
            isPositive: parseFloat(salesChange) >= 0
          },
          {
            label: 'Total Transaksi',
            value: currentTransactions,
            valueFormatted: currentTransactions.toLocaleString('id-ID'),
            change: `${transactionsChange >= 0 ? '+' : ''}${transactionsChange}%`,
            isPositive: parseFloat(transactionsChange) >= 0
          },
          {
            label: 'Rata-rata Transaksi',
            value: avgTransaction,
            valueFormatted: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(avgTransaction),
            change: `${avgTransactionChange >= 0 ? '+' : ''}${avgTransactionChange}%`,
            isPositive: parseFloat(avgTransactionChange) >= 0
          },
          {
            label: 'Produk Terjual',
            value: currentProductsSold,
            valueFormatted: currentProductsSold.toLocaleString('id-ID'),
            change: `${productsSoldChange >= 0 ? '+' : ''}${productsSoldChange}%`,
            isPositive: parseFloat(productsSoldChange) >= 0
          }
        ],
        reportCategories: [
          {
            title: 'Laporan Penjualan',
            description: 'Analisis penjualan dan transaksi POS',
            href: '/pos/reports',
            stats: {
              total: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(currentSales),
              change: `${salesChange >= 0 ? '+' : ''}${salesChange}%`,
              trend: parseFloat(salesChange) >= 0 ? 'up' : 'down'
            }
          },
          {
            title: 'Laporan Inventory',
            description: 'Stok, pergerakan, dan nilai inventory',
            href: '/inventory/reports',
            stats: {
              total: `${currentProducts} Produk`,
              change: `${productsChange >= 0 ? '+' : ''}${productsChange}%`,
              trend: parseFloat(productsChange) >= 0 ? 'up' : 'down'
            }
          },
          {
            title: 'Laporan Keuangan',
            description: 'Pendapatan, pengeluaran, dan profit',
            href: '/finance/reports',
            stats: {
              total: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(currentSales * 0.35), // Assuming 35% profit margin
              change: `${salesChange >= 0 ? '+' : ''}${salesChange}%`,
              trend: parseFloat(salesChange) >= 0 ? 'up' : 'down'
            }
          },
          {
            title: 'Laporan Pelanggan',
            description: 'Analisis pelanggan dan CRM',
            href: '/customers/reports',
            stats: {
              total: currentCustomers.toLocaleString('id-ID'),
              change: `${customersChange >= 0 ? '+' : ''}${customersChange}%`,
              trend: parseFloat(customersChange) >= 0 ? 'up' : 'down'
            }
          }
        ],
        recentReports: recentReports.map((report: any) => ({
          name: report.name,
          date: new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: report.type,
          status: report.status,
          transactionCount: report.transaction_count,
          totalAmount: parseFloat(report.total_amount || '0')
        }))
      }
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('Error fetching reports dashboard:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch reports dashboard',
      error: error.message 
    });
  }
}
