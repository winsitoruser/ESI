import crypto from 'crypto';
import {
  PaymentGateway,
  CheckoutInput,
  CheckoutResult,
  WebhookInput,
  PaymentEvent,
  PaymentEventStatus
} from './PaymentGateway';

const MIDTRANS_SANDBOX_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_PRODUCTION_URL = 'https://app.midtrans.com/snap/v1/transactions';

/**
 * Midtrans SNAP adapter.
 *
 * Requires env:
 *   MIDTRANS_SERVER_KEY   - SB- or Mid- prefixed key
 *   MIDTRANS_CLIENT_KEY   - optional (for frontend SNAP.js)
 *   MIDTRANS_IS_PRODUCTION - 'true' | 'false'
 */
export class MidtransAdapter implements PaymentGateway {
  provider = 'midtrans' as const;
  private serverKey: string;
  private isProduction: boolean;

  constructor(config?: { serverKey?: string; isProduction?: boolean }) {
    this.serverKey = config?.serverKey || process.env.MIDTRANS_SERVER_KEY || '';
    this.isProduction = config?.isProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === 'true');
  }

  private getEndpoint() {
    return this.isProduction ? MIDTRANS_PRODUCTION_URL : MIDTRANS_SANDBOX_URL;
  }

  private getAuthHeader() {
    return 'Basic ' + Buffer.from(`${this.serverKey}:`).toString('base64');
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.serverKey) {
      throw new Error('Midtrans server key is not configured');
    }

    const payload = {
      transaction_details: {
        order_id: input.invoiceNumber,
        gross_amount: Math.round(input.amount)
      },
      item_details: [
        {
          id: input.invoiceId,
          price: Math.round(input.amount),
          quantity: 1,
          name: (input.description || input.invoiceNumber).slice(0, 50)
        }
      ],
      customer_details: {
        first_name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone
      },
      callbacks: input.successUrl ? { finish: input.successUrl } : undefined,
      custom_field1: input.invoiceId,
      custom_field2: input.metadata?.tenantId,
      metadata: input.metadata
    };

    const res = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Midtrans checkout failed: ${JSON.stringify(json)}`);
    }

    return {
      provider: 'midtrans',
      providerTransactionId: input.invoiceNumber,
      redirectUrl: json.redirect_url,
      token: json.token,
      rawResponse: json
    };
  }

  async verifyWebhook(input: WebhookInput): Promise<PaymentEvent | null> {
    const body = input.body || {};
    const orderId = body.order_id;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;
    const signatureKey = body.signature_key;

    if (!orderId || !statusCode || !grossAmount) return null;

    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
      .digest('hex');

    if (signatureKey && signatureKey !== expected) {
      throw new Error('Invalid Midtrans webhook signature');
    }

    const status = this.mapStatus(body.transaction_status, body.fraud_status);

    return {
      provider: 'midtrans',
      providerTransactionId: body.transaction_id || body.order_id,
      externalReference: body.order_id,
      status,
      amount: parseFloat(body.gross_amount),
      currency: body.currency || 'IDR',
      paymentMethod: body.payment_type,
      raw: body
    };
  }

  private mapStatus(txStatus: string, fraudStatus?: string): PaymentEventStatus {
    if (txStatus === 'capture') {
      if (fraudStatus === 'challenge') return 'processing';
      if (fraudStatus === 'accept') return 'completed';
    }
    if (txStatus === 'settlement') return 'completed';
    if (txStatus === 'pending') return 'pending';
    if (txStatus === 'deny' || txStatus === 'cancel' || txStatus === 'expire' || txStatus === 'failure') {
      return 'failed';
    }
    if (txStatus === 'refund' || txStatus === 'partial_refund') return 'refunded';
    return 'pending';
  }
}
