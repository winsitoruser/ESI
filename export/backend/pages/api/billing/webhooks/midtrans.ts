import { NextApiRequest, NextApiResponse } from 'next';
const db = require('../../../models');
const MidtransService = require('../../../services/payment/MidtransService');

/**
 * Midtrans Webhook Handler
 * Handles payment notifications from Midtrans
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get webhook notification
    const notification = req.body;
    
    // Log raw notification for debugging
    console.log('Midtrans webhook received:', JSON.stringify(notification, null, 2));

    // Initialize Midtrans service
    const midtransService = new MidtransService();

    // Verify and process webhook
    const result = await midtransService.handleWebhook(notification);

    if (!result.success) {
      console.error('Webhook verification failed:', result.error);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Find the payment transaction
    const { PaymentTransaction, Invoice, Subscription, BillingCycle } = db;
    
    let paymentTransaction = await PaymentTransaction.findOne({
      where: {
        providerTransactionId: result.transactionId,
        provider: 'midtrans'
      },
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Subscription,
              as: 'subscription'
            },
            {
              model: BillingCycle,
              as: 'billingCycle'
            }
          ]
        }
      ]
    });

    if (!paymentTransaction) {
      console.error('Payment transaction not found:', result.transactionId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update payment transaction status
    await paymentTransaction.update({
      status: result.status,
      processedAt: new Date(),
      metadata: {
        ...paymentTransaction.metadata,
        rawResponse: result.rawTransaction,
        paymentType: result.paymentType
      }
    });

    // Handle different payment statuses
    switch (result.status) {
      case 'completed':
        await handleSuccessfulPayment(paymentTransaction, result);
        break;
        
      case 'failed':
        await handleFailedPayment(paymentTransaction, result);
        break;
        
      case 'expired':
        await handleExpiredPayment(paymentTransaction, result);
        break;
        
      case 'cancelled':
        await handleCancelledPayment(paymentTransaction, result);
        break;
        
      case 'pending':
        await handlePendingPayment(paymentTransaction, result);
        break;
    }

    // Return success response
    res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function handleSuccessfulPayment(paymentTransaction: any, result: any) {
  const { Invoice, Subscription, BillingCycle, UsageMetric } = db;
  const invoice = paymentTransaction.invoice;

  // Update invoice status
  await invoice.update({
    status: 'paid',
    paidDate: new Date(),
    metadata: {
      ...invoice.metadata,
      paymentCompletedAt: new Date(),
      paymentType: result.paymentType
    }
  });

  // Update billing cycle
  if (invoice.billingCycle) {
    await invoice.billingCycle.update({
      status: 'paid',
      processedAt: new Date()
    });
  }

  // Update subscription if needed
  if (invoice.subscription) {
    const subscription = invoice.subscription;
    
    // Check if there's a pending plan change
    if (subscription.metadata?.pendingPlanChange) {
      await subscription.update({
        planId: subscription.metadata.pendingPlanChange,
        metadata: {
          ...subscription.metadata,
          pendingPlanChange: null,
          planChangedAt: new Date()
        }
      });
    }

    // Reactivate subscription if it was past due
    if (subscription.status === 'past_due') {
      await subscription.update({
        status: 'active'
      });
    }
  }

  // Send payment confirmation email
  // await sendPaymentConfirmationEmail(invoice);

  console.log(`Payment completed for invoice ${invoice.invoiceNumber}`);
}

async function handleFailedPayment(paymentTransaction: any, result: any) {
  const { Invoice, Subscription } = db;
  const invoice = paymentTransaction.invoice;

  // Update invoice status
  await invoice.update({
    status: 'overdue',
    metadata: {
      ...invoice.metadata,
      paymentFailedAt: new Date(),
      failureReason: result.rawTransaction?.status_message || 'Payment failed'
    }
  });

  // Update subscription status
  if (invoice.subscription) {
    await invoice.subscription.update({
      status: 'past_due'
    });
  }

  // Send payment failed notification
  // await sendPaymentFailedEmail(invoice);

  console.log(`Payment failed for invoice ${invoice.invoiceNumber}`);
}

async function handleExpiredPayment(paymentTransaction: any, result: any) {
  const { Invoice, Subscription } = db;
  const invoice = paymentTransaction.invoice;

  // Update invoice status
  await invoice.update({
    status: 'overdue',
    metadata: {
      ...invoice.metadata,
      paymentExpiredAt: new Date()
    }
  });

  // Update subscription status
  if (invoice.subscription) {
    await invoice.subscription.update({
      status: 'past_due'
    });
  }

  console.log(`Payment expired for invoice ${invoice.invoiceNumber}`);
}

async function handleCancelledPayment(paymentTransaction: any, result: any) {
  const { Invoice } = db;
  const invoice = paymentTransaction.invoice;

  // Update invoice status
  await invoice.update({
    status: 'cancelled',
    metadata: {
      ...invoice.metadata,
      paymentCancelledAt: new Date()
    }
  });

  console.log(`Payment cancelled for invoice ${invoice.invoiceNumber}`);
}

async function handlePendingPayment(paymentTransaction: any, result: any) {
  const { Invoice } = db;
  const invoice = paymentTransaction.invoice;

  // Update invoice status if still draft
  if (invoice.status === 'draft') {
    await invoice.update({
      status: 'sent',
      metadata: {
        ...invoice.metadata,
        paymentPendingAt: new Date(),
        paymentType: result.paymentType
      }
    });
  }

  console.log(`Payment pending for invoice ${invoice.invoiceNumber}`);
}
