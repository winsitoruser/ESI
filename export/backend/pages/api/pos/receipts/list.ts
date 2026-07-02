import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Op } from 'sequelize';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');
const Customer = require('@/models/Customer');
const Employee = require('@/models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = '1',
      limit = '20',
      search = '',
      type = '',
      status = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = {
      status: { [Op.ne]: 'cancelled' } // Only show non-cancelled transactions
    };

    // Search by transaction number or customer name
    if (search) {
      whereClause[Op.or] = [
        { transactionNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.transactionDate = {};
      if (startDate) {
        whereClause.transactionDate[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.transactionDate[Op.lte] = endDateTime;
      }
    }

    // Fetch receipts (transactions)
    const { rows: receipts, count: totalReceipts } = await PosTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          attributes: ['id', 'productName', 'quantity', 'unitPrice', 'subtotal']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email', 'customerType', 'companyName'],
          required: false
        },
        {
          model: Employee,
          as: 'cashier',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayStats = await PosTransaction.count({
      where: {
        transactionDate: {
          [Op.between]: [today, endOfDay]
        },
        status: 'completed'
      }
    });

    // Format response
    const formattedReceipts = receipts.map((receipt: any) => {
      const isInvoice = receipt.customer?.customerType === 'corporate' || receipt.total >= 1000000;
      
      return {
        id: receipt.id,
        receiptNumber: receipt.transactionNumber,
        invoiceNumber: receipt.transactionNumber.replace('TRX', 'INV'),
        date: receipt.transactionDate,
        customer: {
          id: receipt.customerId,
          name: receipt.customerName || 'Walk-in Customer',
          phone: receipt.customer?.phone || null,
          email: receipt.customer?.email || null,
          type: receipt.customer?.customerType || 'individual',
          companyName: receipt.customer?.companyName || null
        },
        cashier: {
          id: receipt.cashierId,
          name: receipt.cashier?.name || 'Unknown'
        },
        items: receipt.items?.length || 0,
        itemsList: receipt.items || [],
        total: parseFloat(receipt.total),
        type: isInvoice ? 'Invoice' : 'Struk',
        status: receipt.status === 'completed' ? 'Tercetak' : 'Draft',
        printed: true,
        emailed: receipt.customer?.email ? true : false,
        createdAt: receipt.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        receipts: formattedReceipts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalReceipts,
          totalPages: Math.ceil(totalReceipts / limitNum)
        },
        stats: {
          totalReceipts: totalReceipts,
          todayReceipts: todayStats,
          totalInvoices: formattedReceipts.filter((r: any) => r.type === 'Invoice').length,
          todayInvoices: formattedReceipts.filter((r: any) => r.type === 'Invoice' && new Date(r.date) >= today).length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching receipts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts',
      details: error.message
    });
  }
}
