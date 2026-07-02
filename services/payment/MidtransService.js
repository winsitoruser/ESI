const crypto = require('crypto');
const axios = require('axios');

class MidtransService {
  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY;
    this.clientKey = process.env.MIDTRANS_CLIENT_KEY;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.baseUrl = this.isProduction 
      ? 'https://api.midtrans.com/v2' 
      : 'https://api.sandbox.midtrans.com/v2';
    this.snapUrl = this.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  /**
   * Create payment charge
   */
  async createCharge(paymentDetails) {
    try {
      const { orderId, grossAmount, customerDetails, itemDetails, paymentMethod } = paymentDetails;

      // Create transaction details
      const transactionDetails = {
        order_id: orderId,
        gross_amount: grossAmount
      };

      // Build request payload
      const payload = {
        transaction_details: transactionDetails,
        customer_details: customerDetails,
        item_details: itemDetails
      };

      // Add specific payment method if provided
      if (paymentMethod) {
        payload.payment_type = paymentMethod.type;
        
        // Handle different payment types
        switch (paymentMethod.type) {
          case 'credit_card':
            payload.credit_card = {
              token_id: paymentMethod.tokenId,
              authentication: paymentMethod.authentication || '3ds',
              save_token_id: paymentMethod.saveTokenId || false
            };
            break;
            
          case 'bank_transfer':
            payload.bank_transfer = {
              bank: paymentMethod.bank || 'bca'
            };
            break;
            
          case 'echannel':
            payload.echannel = {
              bill_info1: paymentMethod.billInfo1,
              bill_info2: paymentMethod.billInfo2
            };
            break;
            
          case 'gopay':
            payload.gopay = {
              enable_callback: true,
              callback_url: paymentMethod.callbackUrl
            };
            break;
            
          case 'shopeepay':
            payload.shopeepay = {
              callback_url: paymentMethod.callbackUrl
            };
            break;
        }
      }

      // Make request to Midtrans
      const response = await axios.post(
        `${this.baseUrl}/charge`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans charge error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Payment failed');
    }
  }

  /**
   * Create Snap token for redirect payment
   */
  async createSnapToken(paymentDetails) {
    try {
      const { orderId, grossAmount, customerDetails, itemDetails } = paymentDetails;

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount
        },
        customer_details: customerDetails,
        item_details: itemDetails
      };

      const response = await axios.post(
        `${this.snapUrl}/transactions`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans Snap error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to create payment token');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(orderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${orderId}/status`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans status error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to get transaction status');
    }
  }

  /**
   * Approve transaction
   */
  async approveTransaction(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${orderId}/approve`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans approve error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to approve transaction');
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${orderId}/cancel`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans cancel error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to cancel transaction');
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(orderId, amount, reason) {
    try {
      const payload = {
        amount,
        reason
      };

      const response = await axios.post(
        `${this.baseUrl}/${orderId}/refund`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Midtrans refund error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_messages || 'Failed to refund transaction');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(orderId, statusCode, grossAmount, signatureKey, requestId) {
    const rawSignature = orderId + statusCode + grossAmount + this.serverKey;
    const calculatedSignature = crypto.createHash('sha512').update(rawSignature).digest('hex');
    
    return calculatedSignature === signatureKey;
  }

  /**
   * Handle webhook notification
   */
  async handleWebhook(notification) {
    try {
      const { order_id, transaction_status, gross_amount, signature_key, request_id } = notification;
      
      // Verify signature
      if (!this.verifyWebhookSignature(order_id, transaction_status, gross_amount, signature_key, request_id)) {
        throw new Error('Invalid webhook signature');
      }

      // Get full transaction details
      const transaction = await this.getTransactionStatus(order_id);

      // Map Midtrans status to our status
      const statusMap = {
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
    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format payment details for Midtrans
   */
  formatPaymentDetails(invoice, customer, paymentMethod) {
    return {
      orderId: invoice.invoiceNumber,
      grossAmount: invoice.totalAmount,
      customerDetails: {
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' '),
        email: customer.email,
        phone: customer.phone,
        billing_address: {
          address: customer.address,
          city: customer.city,
          postal_code: customer.postalCode,
          country: customer.country || 'Indonesia'
        }
      },
      itemDetails: invoice.items.map(item => ({
        id: item.id,
        price: item.unitPrice,
        quantity: item.quantity,
        name: item.description,
        category: 'billing'
      })),
      paymentMethod: paymentMethod
    };
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods() {
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
}

module.exports = MidtransService;
