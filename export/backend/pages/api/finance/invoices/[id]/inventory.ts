import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const db = require('../../../../../models');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { items, receiptDate, notes } = req.body;

    const { FinanceInvoice, FinanceInvoiceItem } = db;

    // Find invoice by invoice number
    const invoice = await FinanceInvoice.findOne({
      where: { invoiceNumber: id },
      include: [{
        model: FinanceInvoiceItem,
        as: 'items'
      }]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Update received quantities for each item
    let allItemsReceived = true;
    let anyItemReceived = false;

    for (const receivedItem of items) {
      const invoiceItem = invoice.items.find((item: any) => item.id === receivedItem.id);
      
      if (invoiceItem) {
        const newReceivedQty = (invoiceItem.receivedQuantity || 0) + receivedItem.receivedQuantity;
        
        await invoiceItem.update({
          receivedQuantity: newReceivedQty
        });

        if (newReceivedQty < invoiceItem.quantity) {
          allItemsReceived = false;
        }
        if (newReceivedQty > 0) {
          anyItemReceived = true;
        }
      }
    }

    // Update invoice inventory status
    let inventoryStatus = 'pending';
    if (allItemsReceived) {
      inventoryStatus = 'complete';
    } else if (anyItemReceived) {
      inventoryStatus = 'partial';
    }

    await invoice.update({
      inventoryStatus,
      status: allItemsReceived ? 'received' : invoice.status
    });

    return res.status(200).json({
      success: true,
      data: {
        inventoryStatus,
        message: 'Inventory receipt recorded successfully'
      }
    });

  } catch (error) {
    console.error('Inventory receipt API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
