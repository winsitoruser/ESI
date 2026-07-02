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
      format = 'csv',
      search = '',
      status = '',
      paymentMethod = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build where clause
    const whereClause: any = {};

    if (search) {
      whereClause[Op.or] = [
        { transactionNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      whereClause.paymentMethod = paymentMethod;
    }

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

    // Fetch all transactions matching criteria
    const transactions = await PosTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          attributes: ['productName', 'quantity', 'unitPrice', 'discount', 'subtotal']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'phone', 'membershipLevel'],
          required: false
        },
        {
          model: Employee,
          as: 'cashier',
          attributes: ['name'],
          required: false
        }
      ],
      order: [['transactionDate', 'DESC']]
    });

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [];
      
      // Header
      csvRows.push([
        'No Transaksi',
        'Tanggal',
        'Waktu',
        'Pelanggan',
        'Kasir',
        'Jumlah Item',
        'Subtotal',
        'Diskon',
        'Pajak',
        'Total',
        'Metode Pembayaran',
        'Dibayar',
        'Kembalian',
        'Status'
      ].join(','));

      // Data rows
      transactions.forEach((transaction: any) => {
        const date = new Date(transaction.transactionDate);
        csvRows.push([
          transaction.transactionNumber,
          date.toLocaleDateString('id-ID'),
          date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          transaction.customerName || 'Walk-in',
          transaction.cashier?.name || 'Unknown',
          transaction.items?.length || 0,
          transaction.subtotal,
          transaction.discount,
          transaction.tax,
          transaction.total,
          transaction.paymentMethod,
          transaction.paidAmount,
          transaction.changeAmount,
          transaction.status
        ].join(','));
      });

      const csv = csvRows.join('\n');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().split('T')[0]}.csv`);
      
      // Add BOM for Excel UTF-8 support
      return res.status(200).send('\uFEFF' + csv);
    } else if (format === 'json') {
      // Generate JSON
      const exportData = transactions.map((transaction: any) => ({
        transactionNumber: transaction.transactionNumber,
        date: transaction.transactionDate,
        customer: transaction.customerName || 'Walk-in',
        cashier: transaction.cashier?.name || 'Unknown',
        items: transaction.items?.map((item: any) => ({
          product: item.productName,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount),
          subtotal: parseFloat(item.subtotal)
        })) || [],
        subtotal: parseFloat(transaction.subtotal),
        discount: parseFloat(transaction.discount),
        tax: parseFloat(transaction.tax),
        total: parseFloat(transaction.total),
        paymentMethod: transaction.paymentMethod,
        paidAmount: parseFloat(transaction.paidAmount),
        changeAmount: parseFloat(transaction.changeAmount),
        status: transaction.status
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().split('T')[0]}.json`);
      
      return res.status(200).json({
        exportDate: new Date().toISOString(),
        totalRecords: exportData.length,
        data: exportData
      });
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

  } catch (error: any) {
    console.error('Error exporting transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export transactions',
      details: error.message
    });
  }
}
