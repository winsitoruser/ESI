import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

/**
 * API endpoint for invoices management
 * GET - Get all invoices
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const tenantId = session.user.tenantId;
    const { Invoice, InvoiceItem, PaymentTransaction } = db;

    // Get invoices
    const invoices = await Invoice.findAll({
      where: { tenantId },
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        },
        {
          model: PaymentTransaction,
          as: 'paymentTransactions'
        }
      ],
      order: [['issuedDate', 'DESC']]
    });

    // Format response
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      subtotal: parseFloat(invoice.subtotal),
      taxAmount: parseFloat(invoice.taxAmount),
      discountAmount: parseFloat(invoice.discountAmount),
      totalAmount: parseFloat(invoice.totalAmount),
      currency: invoice.currency,
      paymentProvider: invoice.paymentProvider,
      paymentMethod: invoice.paymentMethod,
      externalId: invoice.externalId,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      notes: invoice.notes,
      items: invoice.items?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        amount: parseFloat(item.amount),
        type: item.type,
        referenceType: item.referenceType,
        referenceId: item.referenceId
      })) || [],
      paymentTransactions: invoice.paymentTransactions?.map(tx => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        status: tx.status,
        provider: tx.provider,
        providerTransactionId: tx.providerTransactionId,
        paymentMethod: tx.paymentMethod,
        processedAt: tx.processedAt
      })) || [],
      metadata: invoice.metadata
    }));

    return res.status(200).json({
      success: true,
      data: formattedInvoices
    });

  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
