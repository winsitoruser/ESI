import { PaymentTransaction, Invoice, PaymentMethod } from '../../types/models';
const db = require('../../../models');
import MidtransService from './providers/midtrans.service';
import StripeService from './providers/stripe.service';

/**
 * Provider Service
 * Handles payment provider integrations
 */
export class ProviderService {
  /**
   * Process payment using specified provider
   */
  static async processPayment(invoiceId: string, provider: 'midtrans' | 'stripe', paymentDetails: any) {
    const invoice = await db.Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'sent') {
      throw new Error('Invoice must be in sent status to process payment');
    }

    let result;
    switch (provider) {
      case 'midtrans':
        result = await MidtransService.createPayment(invoice, paymentDetails);
        break;
      case 'stripe':
        result = await StripeService.createPayment(invoice, paymentDetails);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // Create payment transaction record
    const transaction = await db.PaymentTransaction.create({
      invoiceId,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: result.status || 'pending',
      provider,
      providerTransactionId: result.transactionId,
      paymentMethod: paymentDetails.method,
      metadata: {
        ...result,
        paymentDetails
      }
    });

    // Update invoice status if payment successful
    if (result.status === 'success' || result.status === 'succeeded') {
      await db.Invoice.update(
        { 
          status: 'paid',
          paidDate: new Date(),
          paymentProvider: provider,
          paymentMethod: paymentDetails.method,
          externalId: result.transactionId
        },
        { where: { id: invoiceId } }
      );
    }

    return transaction;
  }

  /**
   * Get payment status from provider
   */
  static async getPaymentStatus(transactionId: string, provider: 'midtrans' | 'stripe') {
    const transaction = await db.PaymentTransaction.findByPk(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    let status;
    switch (provider) {
      case 'midtrans':
        status = await MidtransService.getPaymentStatus(transaction.providerTransactionId);
        break;
      case 'stripe':
        status = await StripeService.getPaymentStatus(transaction.providerTransactionId);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // Update transaction status
    await transaction.update({
      status: status.status,
      metadata: {
        ...transaction.metadata,
        ...status
      }
    });

    // Update invoice if payment successful
    if (status.status === 'success' || status.status === 'succeeded') {
      await db.Invoice.update(
        { 
          status: 'paid',
          paidDate: new Date()
        },
        { where: { id: transaction.invoiceId } }
      );
    }

    return status;
  }

  /**
   * Refund payment
   */
  static async refundPayment(transactionId: string, amount?: number, reason?: string) {
    const transaction = await db.PaymentTransaction.findByPk(transactionId, {
      include: [{ model: db.Invoice, as: 'invoice' }]
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'success' && transaction.status !== 'succeeded') {
      throw new Error('Cannot refund unsuccessful transaction');
    }

    let result;
    switch (transaction.provider) {
      case 'midtrans':
        result = await MidtransService.refundPayment(
          transaction.providerTransactionId,
          amount || transaction.amount,
          reason
        );
        break;
      case 'stripe':
        result = await StripeService.refundPayment(
          transaction.providerTransactionId,
          amount || transaction.amount,
          reason
        );
        break;
      default:
        throw new Error(`Unsupported payment provider: ${transaction.provider}`);
    }

    // Create refund transaction
    const refundTransaction = await db.PaymentTransaction.create({
      invoiceId: transaction.invoiceId,
      amount: amount || transaction.amount,
      currency: transaction.currency,
      status: result.status || 'pending',
      provider: transaction.provider,
      providerTransactionId: result.refundId,
      paymentMethod: transaction.paymentMethod,
      type: 'refund',
      parentTransactionId: transactionId,
      metadata: {
        ...result,
        reason
      }
    });

    // Update invoice status if fully refunded
    const totalRefunded = await db.PaymentTransaction.sum('amount', {
      where: {
        invoiceId: transaction.invoiceId,
        type: 'refund',
        status: ['success', 'succeeded']
      }
    });

    if (totalRefunded >= transaction.invoice.totalAmount) {
      await db.Invoice.update(
        { status: 'refunded' },
        { where: { id: transaction.invoiceId } }
      );
    }

    return refundTransaction;
  }

  /**
   * Get payment methods for tenant
   */
  static async getPaymentMethods(tenantId: string) {
    const methods = await db.PaymentMethod.findAll({
      where: { tenantId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    return methods.map((method: any) => ({
      id: method.id,
      type: method.type,
      provider: method.provider,
      last4: method.last4,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      brand: method.brand,
      isDefault: method.isDefault,
      metadata: method.metadata || {}
    }));
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(tenantId: string, methodData: {
    type: 'card' | 'bank_account';
    provider: 'stripe' | 'midtrans';
    token?: string;
    details: any;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (methodData.isDefault) {
      await db.PaymentMethod.update(
        { isDefault: false },
        { where: { tenantId } }
      );
    }

    let paymentMethod;
    switch (methodData.provider) {
      case 'stripe':
        paymentMethod = await StripeService.createPaymentMethod(tenantId, methodData);
        break;
      case 'midtrans':
        paymentMethod = await MidtransService.createPaymentMethod(tenantId, methodData);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${methodData.provider}`);
    }

    // Save to database
    const savedMethod = await db.PaymentMethod.create({
      tenantId,
      type: methodData.type,
      provider: methodData.provider,
      providerMethodId: paymentMethod.id,
      last4: paymentMethod.last4,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      brand: paymentMethod.brand,
      isDefault: methodData.isDefault || false,
      metadata: paymentMethod.metadata || {}
    });

    return savedMethod;
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(tenantId: string, methodId: string) {
    const method = await db.PaymentMethod.findOne({
      where: { id: methodId, tenantId }
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Check if method is being used by any active subscriptions
    const activeSubscriptions = await db.Subscription.count({
      where: {
        tenantId,
        status: ['trial', 'active'],
        defaultPaymentMethodId: methodId
      }
    });

    if (activeSubscriptions > 0) {
      throw new Error('Cannot remove payment method used by active subscriptions');
    }

    // Delete from provider
    switch (method.provider) {
      case 'stripe':
        await StripeService.deletePaymentMethod(method.providerMethodId);
        break;
      case 'midtrans':
        await MidtransService.deletePaymentMethod(method.providerMethodId);
        break;
    }

    // Delete from database
    await method.destroy();

    return { success: true };
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(tenantId: string, methodId: string) {
    const method = await db.PaymentMethod.findOne({
      where: { id: methodId, tenantId }
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Unset all other defaults
    await db.PaymentMethod.update(
      { isDefault: false },
      { where: { tenantId } }
    );

    // Set new default
    await method.update({ isDefault: true });

    // Update subscriptions to use new default
    await db.Subscription.update(
      { defaultPaymentMethodId: methodId },
      { where: { tenantId, status: ['trial', 'active'] } }
    );

    return method;
  }

  /**
   * Get payment transactions for tenant
   */
  static async getPaymentTransactions(tenantId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}) {
    const { status, limit, offset, dateFrom, dateTo } = options;

    const whereClause: any = {
      '$invoice.tenantId$': tenantId
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[db.Sequelize.Op.gte] = dateFrom;
      if (dateTo) whereClause.createdAt[db.Sequelize.Op.lte] = dateTo;
    }

    const transactions = await db.PaymentTransaction.findAndCountAll({
      where: whereClause,
      include: [
        { model: db.Invoice, as: 'invoice' }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      transactions: transactions.rows.map((tx: any) => ({
        id: tx.id,
        invoiceId: tx.invoiceId,
        invoiceNumber: tx.invoice?.invoiceNumber,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        provider: tx.provider,
        providerTransactionId: tx.providerTransactionId,
        paymentMethod: tx.paymentMethod,
        type: tx.type || 'payment',
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        metadata: tx.metadata || {}
      })),
      total: transactions.count,
      hasMore: limit ? (offset || 0) + transactions.rows.length < transactions.count : false
    };
  }

  /**
   * Handle webhook from provider
   */
  static async handleWebhook(provider: 'midtrans' | 'stripe', payload: any, signature?: string) {
    let event;
    
    switch (provider) {
      case 'midtrans':
        event = await MidtransService.handleWebhook(payload, signature);
        break;
      case 'stripe':
        event = await StripeService.handleWebhook(payload, signature);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // Process the event
    switch (event.type) {
      case 'payment.success':
      case 'payment.succeeded':
        await this.updatePaymentStatus(event.data.transactionId, 'success', event.data);
        break;
      case 'payment.failed':
        await this.updatePaymentStatus(event.data.transactionId, 'failed', event.data);
        break;
      case 'payment.refunded':
        await this.handleRefund(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Update payment status from webhook
   */
  private static async updatePaymentStatus(transactionId: string, status: string, data: any) {
    const transaction = await db.PaymentTransaction.findOne({
      where: { providerTransactionId: transactionId }
    });

    if (!transaction) {
      console.log(`Transaction not found: ${transactionId}`);
      return;
    }

    await transaction.update({
      status,
      metadata: {
        ...transaction.metadata,
        ...data
      }
    });

    // Update invoice if payment successful
    if (status === 'success' || status === 'succeeded') {
      await db.Invoice.update(
        { 
          status: 'paid',
          paidDate: new Date()
        },
        { where: { id: transaction.invoiceId } }
      );
    }
  }

  /**
   * Handle refund from webhook
   */
  private static async handleRefund(data: any) {
    // Create refund transaction record
    await db.PaymentTransaction.create({
      invoiceId: data.invoiceId,
      amount: data.amount,
      currency: data.currency,
      status: 'success',
      provider: data.provider,
      providerTransactionId: data.refundId,
      type: 'refund',
      parentTransactionId: data.transactionId,
      metadata: data
    });

    // Update invoice status if fully refunded
    const totalRefunded = await db.PaymentTransaction.sum('amount', {
      where: {
        invoiceId: data.invoiceId,
        type: 'refund',
        status: ['success', 'succeeded']
      }
    });

    const invoice = await db.Invoice.findByPk(data.invoiceId);
    if (invoice && totalRefunded >= invoice.totalAmount) {
      await invoice.update({ status: 'refunded' });
    }
  }
}
