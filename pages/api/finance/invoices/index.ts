import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('../../../../models');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { FinanceInvoice, FinanceInvoiceItem, FinanceInvoicePayment } = db;

    if (req.method === 'GET') {
      // Get all invoices with items and payments
      const invoices = await FinanceInvoice.findAll({
        include: [
          {
            model: FinanceInvoiceItem,
            as: 'items'
          },
          {
            model: FinanceInvoicePayment,
            as: 'payments'
          }
        ],
        order: [['invoiceDate', 'DESC']]
      });

      // Transform data to match frontend interface
      const transformedInvoices = invoices.map((invoice: any) => ({
        id: invoice.invoiceNumber,
        supplier: invoice.type === 'supplier' ? invoice.supplierName : invoice.customerName,
        date: invoice.invoiceDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        amount: parseFloat(invoice.totalAmount),
        status: invoice.status,
        type: invoice.type,
        paymentStatus: invoice.paymentStatus,
        totalPaid: parseFloat(invoice.paidAmount),
        remainingAmount: parseFloat(invoice.remainingAmount),
        purchaseOrder: invoice.purchaseOrderNumber,
        paymentHistory: invoice.payments?.map((payment: any) => ({
          id: payment.id,
          date: payment.paymentDate.toISOString().split('T')[0],
          amount: parseFloat(payment.amount),
          method: payment.paymentMethod,
          receivedBy: payment.receivedBy || 'System',
          reference: payment.referenceNumber || ''
        })) || [],
        items: invoice.items?.map((item: any) => ({
          id: item.id,
          product: item.productName,
          quantity: item.quantity,
          price: parseFloat(item.unitPrice),
          total: parseFloat(item.totalPrice),
          received: item.receivedQuantity || 0
        })) || [],
        inventoryStatus: invoice.inventoryStatus,
        inventoryReceipts: [] // Will be populated from GoodsReceipt if needed
      }));

      return res.status(200).json({
        success: true,
        data: transformedInvoices
      });

    } else if (req.method === 'POST') {
      // Create new invoice
      const {
        type,
        supplierName,
        customerName,
        invoiceDate,
        dueDate,
        items,
        notes,
        purchaseOrderNumber
      } = req.body;

      // Validate required fields
      if (!type || !invoiceDate || !dueDate || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.price), 0
      );

      // Generate invoice number
      const lastInvoice = await FinanceInvoice.findOne({
        order: [['createdAt', 'DESC']]
      });

      let invoiceNumber = 'INV-001';
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
        invoiceNumber = `INV-${String(lastNumber + 1).padStart(3, '0')}`;
      }

      // Create invoice
      const invoice = await FinanceInvoice.create({
        invoiceNumber,
        type,
        supplierName: type === 'supplier' ? supplierName : null,
        customerName: type === 'customer' ? customerName : null,
        invoiceDate,
        dueDate,
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        paymentStatus: 'unpaid',
        inventoryStatus: 'pending',
        status: 'pending',
        notes,
        purchaseOrderNumber
      });

      // Create invoice items
      const invoiceItems = await Promise.all(
        items.map((item: any) => 
          FinanceInvoiceItem.create({
            invoiceId: invoice.id,
            productName: item.product,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.quantity * item.price,
            receivedQuantity: 0
          })
        )
      );

      return res.status(201).json({
        success: true,
        data: {
          id: invoice.invoiceNumber,
          ...invoice.toJSON(),
          items: invoiceItems
        }
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Invoice API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
