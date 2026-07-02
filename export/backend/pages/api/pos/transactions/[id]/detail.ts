import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');
const Customer = require('@/models/Customer');
const Employee = require('@/models/Employee');
const Product = require('@/models/Product');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Fetch transaction with all details
    const transaction = await PosTransaction.findOne({
      where: { id: id as string },
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'category', 'image'],
              required: false
            }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email', 'membershipLevel', 'points', 'customerType', 'companyName'],
          required: false
        },
        {
          model: Employee,
          as: 'cashier',
          attributes: ['id', 'name', 'email', 'position'],
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Format response
    const formattedTransaction = {
      id: transaction.id,
      transactionNumber: transaction.transactionNumber,
      date: transaction.transactionDate,
      customer: transaction.customer ? {
        id: transaction.customer.id,
        name: transaction.customer.name,
        phone: transaction.customer.phone,
        email: transaction.customer.email,
        membershipLevel: transaction.customer.membershipLevel,
        points: transaction.customer.points,
        type: transaction.customer.customerType,
        companyName: transaction.customer.companyName
      } : {
        name: transaction.customerName || 'Walk-in Customer'
      },
      cashier: {
        id: transaction.cashier?.id,
        name: transaction.cashier?.name || 'Unknown',
        email: transaction.cashier?.email,
        position: transaction.cashier?.position
      },
      items: transaction.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discount: parseFloat(item.discount),
        subtotal: parseFloat(item.subtotal),
        notes: item.notes,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          category: item.product.category,
          image: item.product.image
        } : null
      })) || [],
      subtotal: parseFloat(transaction.subtotal),
      discount: parseFloat(transaction.discount),
      tax: parseFloat(transaction.tax),
      total: parseFloat(transaction.total),
      paymentMethod: transaction.paymentMethod,
      paidAmount: parseFloat(transaction.paidAmount),
      changeAmount: parseFloat(transaction.changeAmount),
      status: transaction.status,
      notes: transaction.notes,
      shiftId: transaction.shiftId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };

    return res.status(200).json({
      success: true,
      data: formattedTransaction
    });

  } catch (error: any) {
    console.error('Error fetching transaction detail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction detail',
      details: error.message
    });
  }
}
