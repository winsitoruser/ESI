import Stripe from 'stripe';
import { Invoice } from '../../../../types/models';

/**
 * Stripe Service
 * Handles all Stripe payment operations
 */
export default class StripeService {
  private static stripe: Stripe;

  private static getStripe() {
    if (!this.stripe) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      });
    }
    return this.stripe;
  }

  /**
   * Create payment using Stripe
   */
  static async createPayment(invoice: Invoice, paymentDetails: any) {
    const stripe = this.getStripe();

    try {
      if (paymentDetails.type === 'card' && paymentDetails.paymentMethodId) {
        // Payment with saved card
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(invoice.totalAmount * 100), // Convert to cents
          currency: invoice.currency.toLowerCase(),
          payment_method: paymentDetails.paymentMethodId,
          confirmation_method: paymentDetails.confirmationMethod || 'manual',
          confirm: true,
          customer: paymentDetails.customerId,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber
          }
        });

        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
          nextAction: paymentIntent.next_action
        };
      } else if (paymentDetails.type === 'card' && paymentDetails.card) {
        // Payment with new card
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(invoice.totalAmount * 100),
          currency: invoice.currency.toLowerCase(),
          payment_method_types: ['card'],
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber
          }
        });

        return {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        };
      } else {
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: invoice.currency.toLowerCase(),
                product_data: {
                  name: `Invoice ${invoice.invoiceNumber}`,
                  description: invoice.notes || 'Payment for services'
                },
                unit_amount: Math.round(invoice.totalAmount * 100)
              },
              quantity: 1
            }
          ],
          mode: 'payment',
          success_url: `${process.env.NEXTAUTH_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/billing/cancel`,
          customer_email: invoice.customerEmail,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber
          }
        });

        return {
          sessionId: session.id,
          url: session.url
        };
      }
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      throw new Error(error.message || 'Payment failed');
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentIntentId: string) {
    const stripe = this.getStripe();

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        payment_method: paymentIntent.payment_method,
        created: paymentIntent.created
      };
    } catch (error: any) {
      console.error('Stripe status error:', error);
      throw new Error(error.message || 'Failed to get payment status');
    }
  }

  /**
   * Handle webhook
   */
  static async handleWebhook(payload: string, sig: string) {
    const stripe = this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error);
      return {
        success: false,
        error: 'Invalid signature'
      };
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, handled: false };
      }
    } catch (error: any) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    return {
      success: true,
      transactionId: paymentIntent.id,
      status: 'completed',
      paymentType: 'card',
      rawTransaction: paymentIntent,
      metadata: {
        invoiceId: paymentIntent.metadata.invoiceId,
        invoiceNumber: paymentIntent.metadata.invoiceNumber
      }
    };
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    return {
      success: true,
      transactionId: paymentIntent.id,
      status: 'failed',
      paymentType: 'card',
      rawTransaction: paymentIntent,
      metadata: {
        invoiceId: paymentIntent.metadata.invoiceId,
        invoiceNumber: paymentIntent.metadata.invoiceNumber,
        lastPaymentError: paymentIntent.last_payment_error
      }
    };
  }

  /**
   * Handle canceled payment
   */
  private static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    return {
      success: true,
      transactionId: paymentIntent.id,
      status: 'cancelled',
      paymentType: 'card',
      rawTransaction: paymentIntent,
      metadata: {
        invoiceId: paymentIntent.metadata.invoiceId,
        invoiceNumber: paymentIntent.metadata.invoiceNumber
      }
    };
  }

  /**
   * Handle invoice payment succeeded (for subscriptions)
   */
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    return {
      success: true,
      transactionId: invoice.id,
      status: 'completed',
      paymentType: 'subscription',
      rawTransaction: invoice,
      metadata: {
        subscriptionId: invoice.subscription,
        customer: invoice.customer
      }
    };
  }

  /**
   * Handle invoice payment failed (for subscriptions)
   */
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    return {
      success: true,
      transactionId: invoice.id,
      status: 'failed',
      paymentType: 'subscription',
      rawTransaction: invoice,
      metadata: {
        subscriptionId: invoice.subscription,
        customer: invoice.customer,
        attemptCount: invoice.attempt_count
      }
    };
  }

  /**
   * Refund payment
   */
  static async refundPayment(paymentIntentId: string, amount?: number, reason?: string) {
    const stripe = this.getStripe();

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: {
          refundReason: reason
        }
      });

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency
      };
    } catch (error: any) {
      console.error('Stripe refund error:', error);
      throw new Error(error.message || 'Refund failed');
    }
  }

  /**
   * Create customer
   */
  static async createCustomer(customerData: {
    email: string;
    name: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  }) {
    const stripe = this.getStripe();

    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        metadata: {
          source: 'bedagang-pos'
        }
      });

      return {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error: any) {
      console.error('Stripe customer creation error:', error);
      throw new Error(error.message || 'Failed to create customer');
    }
  }

  /**
   * Attach payment method to customer
   */
  static async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    const stripe = this.getStripe();

    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      return paymentMethod;
    } catch (error: any) {
      console.error('Stripe payment method attachment error:', error);
      throw new Error(error.message || 'Failed to attach payment method');
    }
  }

  /**
   * Get customer payment methods
   */
  static async getCustomerPaymentMethods(customerId: string, type: string = 'card') {
    const stripe = this.getStripe();

    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: type as Stripe.PaymentMethodListParams.Type
      });

      return paymentMethods.data.map((pm: any) => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year
        },
        created: pm.created
      }));
    } catch (error: any) {
      console.error('Stripe payment methods error:', error);
      throw new Error(error.message || 'Failed to get payment methods');
    }
  }

  /**
   * Get available payment methods
   */
  static getAvailablePaymentMethods() {
    return [
      {
        type: 'card',
        name: 'Credit/Debit Card',
        icon: 'credit-card',
        fees: { percentage: 2.9, fixed: 0.35 }
      },
      {
        type: 'apple_pay',
        name: 'Apple Pay',
        icon: 'apple',
        fees: { percentage: 2.9, fixed: 0.35 }
      },
      {
        type: 'google_pay',
        name: 'Google Pay',
        icon: 'google',
        fees: { percentage: 2.9, fixed: 0.35 }
      }
    ];
  }

  /**
   * Create payment method
   */
  static async createPaymentMethod(tenantId: string, methodData: any) {
    const stripe = this.getStripe();
    
    try {
      if (methodData.type === 'card' && methodData.token) {
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: { token: methodData.token },
          metadata: { tenantId }
        });

        return {
          id: paymentMethod.id,
          last4: paymentMethod.card?.last4 || '****',
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year,
          brand: paymentMethod.card?.brand,
          metadata: { paymentMethodId: paymentMethod.id }
        };
      }
      
      throw new Error('Invalid payment method data');
    } catch (error: any) {
      console.error('Stripe create payment method error:', error);
      throw new Error(error.message || 'Failed to create payment method');
    }
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(methodId: string) {
    const stripe = this.getStripe();
    
    try {
      await stripe.paymentMethods.detach(methodId);
      return true;
    } catch (error: any) {
      console.error('Stripe delete payment method error:', error);
      throw new Error(error.message || 'Failed to delete payment method');
    }
  }
}
