import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const MidtransService = require('../../../../services/payment/MidtransService');

/**
 * API endpoint for invoice payment
 * POST - Process payment for an invoice
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { id } = req.query;
    const { paymentMethod, returnUrl } = req.body;
    const tenantId = session.user.tenantId;

    // Get invoice
    const { Invoice, Tenant, PaymentTransaction } = db;
    const invoice = await Invoice.findOne({
      where: { 
        id, 
        tenantId,
        status: ['sent', 'draft'] // Only allow payment for sent or draft invoices
      },
      include: [{
        model: Tenant,
        as: 'tenant'
      }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found or cannot be paid'
      });
    }

    // Initialize payment service
    const midtransService = new MidtransService();

    // Prepare payment details
    const paymentDetails = midtransService.formatPaymentDetails(
      invoice,
      {
        name: invoice.customerName || invoice.tenant.businessName,
        email: invoice.customerEmail || invoice.tenant.businessEmail,
        phone: invoice.customerPhone || invoice.tenant.businessPhone,
        address: invoice.customerAddress || invoice.tenant.businessAddress
      },
      paymentMethod
    );

    // Create payment transaction record
    const paymentTransaction = await PaymentTransaction.create({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: 'pending',
      provider: 'midtrans',
      paymentMethod: paymentMethod?.type || 'mixed'
    });

    try {
      let paymentResult;

      // Create payment based on method
      if (paymentMethod?.type === 'credit_card' && paymentMethod.tokenId) {
        // Direct charge for credit card
        paymentResult = await midtransService.createCharge({
          ...paymentDetails,
          paymentMethod: {
            type: 'credit_card',
            tokenId: paymentMethod.tokenId,
            authentication: paymentMethod.authentication || '3ds'
          }
        });
      } else {
        // Create Snap token for redirect payment
        paymentResult = await midtransService.createSnapToken(paymentDetails);
      }

      // Update payment transaction
      await paymentTransaction.update({
        providerTransactionId: paymentResult.transaction_id || paymentResult.token,
        metadata: {
          ...paymentTransaction.metadata,
          paymentResponse: paymentResult
        }
      });

      // Update invoice status
      if (invoice.status === 'draft') {
        await invoice.update({
          status: 'sent',
          issuedDate: new Date()
        });
      }

      // Return appropriate response
      if (paymentResult.redirect_url) {
        // Snap token - return redirect URL
        return res.status(200).json({
          success: true,
          data: {
            paymentUrl: paymentResult.redirect_url,
            tokenId: paymentResult.token,
            transactionId: paymentResult.transaction_id
          }
        });
      } else {
        // Direct charge result
        return res.status(200).json({
          success: true,
          data: {
            transactionId: paymentResult.transaction_id,
            status: paymentResult.transaction_status,
            paymentType: paymentResult.payment_type
          }
        });
      }

    } catch (paymentError: any) {
      // Update payment transaction as failed
      await paymentTransaction.update({
        status: 'failed',
        failureReason: paymentError.message,
        processedAt: new Date()
      });

      throw paymentError;
    }

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: error.message
    });
  }
}
