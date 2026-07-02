import crypto from 'crypto';
import axios from 'axios';
import { Invoice } from '../../../../types/models';

/**
 * Midtrans Service
 * Handles all Midtrans payment operations
 */
export default class MidtransService {
  private static getServerKey() {
    return process.env.MIDTRANS_SERVER_KEY;
  }

  private static getClientKey() {
    return process.env.MIDTRANS_CLIENT_KEY;
  }

  private static isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  private static getBaseUrl() {
    return this.isProduction() 
      ? 'https://api.midtrans.com/v2' 
      : 'https://api.sandbox.midtrans.com/v2';
  }

  private static getSnapUrl() {
    return this.isProduction()
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  /**
   * Process payment using Midtrans
   */
  static async createPayment(invoice: Invoice, paymentDetails: any) {
    const { orderId, grossAmount, customerDetails, itemDetails } = this.formatPaymentDetails(invoice);

    try {
      if (paymentDetails.type === 'credit_card' && paymentDetails.tokenId) {
        // Direct charge for credit card
        return await this.createCharge({
          orderId,
          grossAmount,
          customerDetails,
          itemDetails,
          paymentMethod: {
            type: 'credit_card',
            tokenId: paymentDetails.tokenId,
            authentication: paymentDetails.authentication || '3ds',
            saveTokenId: paymentDetails.saveTokenId || false
          }
        });
      } else {
        // Create Snap token for redirect payment
        return await this.createSnapToken({
          orderId,
          grossAmount,
          customerDetails,
          itemDetails
        });
      }
    } catch (error: any) {
      console.error('Midtrans payment error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Payment failed');
    }
  }

  /**
   * Create charge
   */
  private static async createCharge(paymentDetails: any) {
    const response = await axios.post(
      `${this.getBaseUrl()}/charge`,
      paymentDetails,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
        }
      }
    );

    return response.data;
  }

  /**
   * Create Snap token
   */
  private static async createSnapToken(paymentDetails: any) {
    const response = await axios.post(
      `${this.getSnapUrl()}/transactions`,
      paymentDetails,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
        }
      }
    );

    return response.data;
  }

  /**
   * Get transaction status
   */
  static async getTransactionStatus(orderId: string) {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/${orderId}/status`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Midtrans status error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to get transaction status');
    }
  }

  /**
   * Approve transaction
   */
  static async approveTransaction(orderId: string) {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/${orderId}/approve`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Midtrans approve error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to approve transaction');
    }
  }

  /**
   * Cancel transaction
   */
  static async cancelTransaction(orderId: string) {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/${orderId}/cancel`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Midtrans cancel error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to cancel transaction');
    }
  }

  /**
   * Refund transaction
   */
  static async refundTransaction(orderId: string, amount: number, reason?: string) {
    try {
      const payload: any = {
        amount,
        reason
      };

      const response = await axios.post(
        `${this.getBaseUrl()}/${orderId}/refund`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.getServerKey() + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Midtrans refund error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to refund transaction');
    }
  }

  /**
   * Handle webhook notification
   */
  static async handleWebhook(notification: any) {
    try {
      const { order_id, transaction_status, gross_amount, signature_key, request_id } = notification;
      
      // Verify signature
      if (!this.verifyWebhookSignature(order_id, transaction_status, gross_amount, signature_key, request_id)) {
        throw new Error('Invalid webhook signature');
      }

      // Get full transaction details
      const transaction = await this.getTransactionStatus(order_id);

      // Map Midtrans status to our status
      const statusMap: Record<string, string> = {
        'capture': 'completed',
        'settlement': 'completed',
        'pending': 'pending',
        'deny': 'failed',
        'expire': 'expired',
        'cancel': 'cancelled'
      };

      const mappedStatus = statusMap[transaction.transaction_status] || 'pending';

      return {
        success: true,
        transactionId: order_id,
        status: mappedStatus,
        paymentType: transaction.payment_type,
        rawTransaction: transaction
      };
    } catch (error: any) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  private static verifyWebhookSignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string, requestId: string) {
    const rawSignature = orderId + statusCode + grossAmount + this.getServerKey();
    const calculatedSignature = crypto.createHash('sha512').update(rawSignature).digest('hex');
    
    return calculatedSignature === signatureKey;
  }

  /**
   * Format payment details for Midtrans
   */
  private static formatPaymentDetails(invoice: Invoice) {
    // Get tenant details
    const customerDetails = {
      first_name: invoice.customerName?.split(' ')[0] || 'Customer',
      last_name: invoice.customerName?.split(' ').slice(1).join(' ') || '',
      email: invoice.customerEmail || 'customer@example.com',
      phone: invoice.customerPhone || '',
      billing_address: {
        address: invoice.customerAddress || '',
        city: '',
        postal_code: '',
        country: 'Indonesia'
      }
    };

    // Format items (placeholder - should come from invoice items)
    const itemDetails = [
      {
        id: invoice.id,
        price: invoice.totalAmount,
        quantity: 1,
        name: `Invoice ${invoice.invoiceNumber}`,
        category: 'billing'
      }
    ];

    return {
      orderId: invoice.invoiceNumber,
      grossAmount: invoice.totalAmount,
      customerDetails,
      itemDetails
    };
  }

  /**
   * Get available payment methods
   */
  static getAvailablePaymentMethods() {
    return [
      {
        type: 'credit_card',
        name: 'Kartu Kredit/Debit',
        icon: 'credit-card',
        fees: { percentage: 2.5, fixed: 0 }
      },
      {
        type: 'bank_transfer',
        name: 'Transfer Bank',
        icon: 'bank',
        banks: ['bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb', 'other'],
        fees: { percentage: 0, fixed: 4500 }
      },
      {
        type: 'echannel',
        name: 'Mandiri Bill',
        icon: 'mandiri',
        fees: { percentage: 0, fixed: 2500 }
      },
      {
        type: 'gopay',
        name: 'GoPay',
        icon: 'gopay',
        fees: { percentage: 0, fixed: 0 }
      },
      {
        type: 'shopeepay',
        name: 'ShopeePay',
        icon: 'shopeepay',
        fees: { percentage: 0, fixed: 0 }
      },
      {
        type: 'qris',
        name: 'QRIS',
        icon: 'qris',
        fees: { percentage: 0.7, fixed: 0 }
      }
    ];
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(transactionId: string) {
    return await this.getTransactionStatus(transactionId);
  }

  /**
   * Refund payment
   */
  static async refundPayment(transactionId: string, amount: number, reason?: string) {
    return await this.refundTransaction(transactionId, amount, reason);
  }

  /**
   * Create payment method
   */
  static async createPaymentMethod(tenantId: string, methodData: any) {
    // Midtrans doesn't support storing payment methods directly
    // Return mock data for compatibility
    return {
      id: `midtrans_${Date.now()}`,
      last4: methodData.details.cardNumber?.slice(-4) || '****',
      expiryMonth: methodData.details.expiryMonth,
      expiryYear: methodData.details.expiryYear,
      brand: methodData.details.brand || 'unknown',
      metadata: methodData
    };
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(methodId: string) {
    // Midtrans doesn't support storing payment methods
    return true;
  }
}
