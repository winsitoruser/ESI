import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      startDate,
      endDate,
      reportType = 'overview',
      branchId = 'all',
      format = 'excel'
    } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // Build where clause
    const where: any = {
      createdAt: {
        [require('sequelize').Op.between]: [start, end]
      }
    };

    if (branchId !== 'all') {
      where.branchId = branchId;
    }

    const { Transaction, TransactionItem, Product, Category, Customer, Branch } = getDb();

    let data: any = {};

    switch (reportType) {
      case 'overview':
        const [totalRevenue, totalOrders, uniqueCustomers] = await Promise.all([
          Transaction.sum('totalAmount', { where }),
          Transaction.count({ where }),
          Transaction.count({ 
            where, 
            distinct: true, 
            col: 'customerId'
          })
        ]);

        data = {
          summary: {
            totalRevenue: totalRevenue || 0,
            totalOrders: totalOrders || 0,
            uniqueCustomers: uniqueCustomers || 0,
            period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
          }
        };
        break;

      case 'sales':
        const salesTransactions = await Transaction.findAll({
          where,
          include: [
            { model: Customer, as: 'customer' },
            { model: Branch, as: 'branch' }
          ],
          order: [['createdAt', 'DESC']]
        });

        data = {
          transactions: salesTransactions.map((t: any) => ({
            id: t.id,
            date: t.createdAt,
            customer: t.customer?.name || 'Walk-in Customer',
            branch: t.branch?.name || 'Main Branch',
            items: t.totalItems,
            subtotal: t.subtotal,
            tax: t.taxAmount,
            discount: t.discountAmount,
            total: t.totalAmount,
            paymentMethod: t.paymentMethod,
            status: t.status
          }))
        };
        break;

      case 'products':
        const productSales = await TransactionItem.findAll({
          attributes: [
            'productId',
            [getDb().sequelize.fn('SUM', getDb().sequelize.col('quantity')), 'totalSold'],
            [getDb().sequelize.fn('SUM', getDb().sequelize.col('subtotal')), 'totalRevenue']
          ],
          include: [{
            model: Product,
            as: 'product',
            attributes: ['name', 'sku', 'category'],
            include: [{
              model: Category,
              as: 'category',
              attributes: ['name']
            }]
          }],
          where: {
            '$transaction.createdAt$': {
              [require('sequelize').Op.between]: [start, end]
            }
          },
          group: ['productId', 'product.id', 'product.category.id'],
          order: [[getDb().sequelize.literal('totalSold'), 'DESC']]
        });

        data = {
          products: productSales.map((p: any) => ({
            name: p.product.name,
            sku: p.product.sku,
            category: p.product.category?.name || 'Uncategorized',
            totalSold: parseInt(p.dataValues.totalSold),
            totalRevenue: parseFloat(p.dataValues.totalRevenue)
          }))
        };
        break;

      case 'customers':
        const customerTransactions = await Transaction.findAll({
          attributes: [
            'customerId',
            [getDb().sequelize.fn('COUNT', getDb().sequelize.col('id')), 'transactionCount'],
            [getDb().sequelize.fn('SUM', getDb().sequelize.col('totalAmount')), 'totalSpent']
          ],
          include: [{
            model: Customer,
            as: 'customer',
            attributes: ['name', 'email', 'phone']
          }],
          where,
          group: ['customerId', 'customer.id'],
          order: [[getDb().sequelize.literal('totalSpent'), 'DESC']]
        });

        data = {
          customers: customerTransactions.map((c: any) => ({
            name: c.customer?.name || 'Walk-in Customer',
            email: c.customer?.email || '-',
            phone: c.customer?.phone || '-',
            transactionCount: parseInt(c.dataValues.transactionCount),
            totalSpent: parseFloat(c.dataValues.totalSpent),
            avgTransaction: parseFloat(c.dataValues.totalSpent) / parseInt(c.dataValues.transactionCount)
          }))
        };
        break;

      case 'payments':
        const paymentMethods = await Transaction.findAll({
          attributes: [
            'paymentMethod',
            [getDb().sequelize.fn('COUNT', getDb().sequelize.col('id')), 'count'],
            [getDb().sequelize.fn('SUM', getDb().sequelize.col('totalAmount')), 'total']
          ],
          where,
          group: ['paymentMethod'],
          order: [[getDb().sequelize.literal('total'), 'DESC']]
        });

        data = {
          paymentMethods: paymentMethods.map((p: any) => ({
            method: p.paymentMethod,
            count: parseInt(p.dataValues.count),
            total: parseFloat(p.dataValues.total),
            percentage: 0 // Will be calculated
          }))
        };

        // Calculate percentages
        const grandTotal = data.paymentMethods.reduce((sum: number, pm: any) => sum + pm.total, 0);
        data.paymentMethods.forEach((pm: any) => {
          pm.percentage = grandTotal > 0 ? (pm.total / grandTotal * 100).toFixed(2) : '0';
        });
        break;
    }

    // Generate file based on format
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(data, reportType as string);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csv);
    } else if (format === 'excel') {
      // Generate Excel (simplified CSV format for now)
      const csv = generateCSV(data, reportType as string);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
      return res.status(200).send(csv);
    } else if (format === 'pdf') {
      // For PDF, we'll need a library like puppeteer
      // For now, return JSON
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        data,
        message: 'PDF export not yet implemented'
      });
    }

  } catch (error: any) {
    console.error('Error exporting report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export report',
      details: error.message
    });
  }
}

function generateCSV(data: any, reportType: string): string {
  let csv = '';
  
  switch (reportType) {
    case 'overview':
      csv = 'Metric,Value\n';
      csv += `Total Revenue,${data.summary.totalRevenue}\n`;
      csv += `Total Orders,${data.summary.totalOrders}\n`;
      csv += `Unique Customers,${data.summary.uniqueCustomers}\n`;
      csv += `Period,${data.summary.period}\n`;
      break;
      
    case 'sales':
      csv = 'Date,Customer,Branch,Items,Subtotal,Tax,Discount,Total,Payment Method,Status\n';
      data.transactions.forEach((t: any) => {
        csv += `${t.date},${t.customer},${t.branch},${t.items},${t.subtotal},${t.tax},${t.discount},${t.total},${t.paymentMethod},${t.status}\n`;
      });
      break;
      
    case 'products':
      csv = 'Product Name,SKU,Category,Total Sold,Total Revenue\n';
      data.products.forEach((p: any) => {
        csv += `${p.name},${p.sku},${p.category},${p.totalSold},${p.totalRevenue}\n`;
      });
      break;
      
    case 'customers':
      csv = 'Customer Name,Email,Phone,Transaction Count,Total Spent,Avg Transaction\n';
      data.customers.forEach((c: any) => {
        csv += `${c.name},${c.email},${c.phone},${c.transactionCount},${c.totalSpent},${c.avgTransaction}\n`;
      });
      break;
      
    case 'payments':
      csv = 'Payment Method,Count,Total,Percentage\n';
      data.paymentMethods.forEach((pm: any) => {
        csv += `${pm.method},${pm.count},${pm.total},${pm.percentage}%\n`;
      });
      break;
  }
  
  return csv;
}
