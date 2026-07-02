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
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    // Fetch receipt (transaction) with all details
    const receipt = await PosTransaction.findOne({
      where: { id: id as string },
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'category'],
              required: false
            }
          ]
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email', 'address', 'customerType', 'companyName', 'companyAddress', 'taxId'],
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

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const isInvoice = receipt.customer?.customerType === 'corporate' || receipt.total >= 1000000;

    // Format receipt data
    const formattedReceipt = {
      id: receipt.id,
      receiptNumber: receipt.transactionNumber,
      invoiceNumber: receipt.transactionNumber.replace('TRX', 'INV'),
      date: receipt.transactionDate,
      type: isInvoice ? 'Invoice' : 'Struk',
      customer: receipt.customer ? {
        id: receipt.customer.id,
        name: receipt.customer.name,
        phone: receipt.customer.phone,
        email: receipt.customer.email,
        address: receipt.customer.address,
        type: receipt.customer.customerType,
        companyName: receipt.customer.companyName,
        companyAddress: receipt.customer.companyAddress,
        taxId: receipt.customer.taxId
      } : {
        name: receipt.customerName || 'Walk-in Customer',
        type: 'individual'
      },
      cashier: {
        id: receipt.cashier?.id,
        name: receipt.cashier?.name || 'Unknown',
        email: receipt.cashier?.email,
        position: receipt.cashier?.position
      },
      items: receipt.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discount: parseFloat(item.discount),
        subtotal: parseFloat(item.subtotal),
        notes: item.notes
      })) || [],
      subtotal: parseFloat(receipt.subtotal),
      discount: parseFloat(receipt.discount),
      tax: parseFloat(receipt.tax),
      total: parseFloat(receipt.total),
      paymentMethod: receipt.paymentMethod,
      paidAmount: parseFloat(receipt.paidAmount),
      changeAmount: parseFloat(receipt.changeAmount),
      status: receipt.status,
      notes: receipt.notes,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt
    };

    return res.status(200).json({
      success: true,
      data: formattedReceipt
    });

  } catch (error: any) {
    console.error('Error fetching receipt detail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt detail',
      details: error.message
    });
  }
}
