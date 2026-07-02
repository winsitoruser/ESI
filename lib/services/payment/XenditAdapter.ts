import {
  PaymentGateway,
  CheckoutInput,
  CheckoutResult,
  WebhookInput,
  PaymentEvent,
  PaymentEventStatus
} from './PaymentGateway';

const XENDIT_BASE_URL = 'https://api.xendit.co';

/**
 * Xendit Invoice API adapter.
 *
 * Requires env:
 *   XENDIT_SECRET_KEY    - xnd_development_... or xnd_production_...
 *   XENDIT_WEBHOOK_TOKEN - X-Callback-Token verification
 */
export class XenditAdapter implements PaymentGateway {
  provider = 'xendit' as const;
  private secretKey: string;
  private webhookToken: string;

  constructor(config?: { secretKey?: string; webhookToken?: string }) {
    this.secretKey = config?.secretKey || process.env.XENDIT_SECRET_KEY || '';
    this.webhookToken = config?.webhookToken || process.env.XENDIT_WEBHOOK_TOKEN || '';
  }

  private getAuthHeader() {
    return 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.secretKey) {
      throw new Error('Xendit secret key is not configured');
    }

    const payload: any = {
      external_id: input.invoiceNumber,
      amount: Math.round(input.amount),
      currency: input.currency || 'IDR',
      description: input.description || input.invoiceNumber,
      customer: {
        given_names: input.customerName,
        email: input.customerEmail,
        mobile_number: input.customerPhone
      },
      success_redirect_url: input.successUrl,
      failure_redirect_url: input.failureUrl,
      items: [
        {
          name: (input.description || input.invoiceNumber).slice(0, 50),
          quantity: 1,
          price: Math.round(input.amount)
        }
      ],
      metadata: input.metadata
    };

    const res = await fetch(`${XENDIT_BASE_URL}/v2/invoices`, {
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
      throw new Error(`Xendit checkout failed: ${JSON.stringify(json)}`);
    }

    return {
      provider: 'xendit',
      providerTransactionId: json.id,
      redirectUrl: json.invoice_url,
      rawResponse: json
    };
  }

  async verifyWebhook(input: WebhookInput): Promise<PaymentEvent | null> {
    const token = input.headers['x-callback-token'] || input.headers['X-CALLBACK-TOKEN'] || input.headers['X-Callback-Token'];
    if (this.webhookToken && token !== this.webhookToken) {
      throw new Error('Invalid Xendit webhook token');
    }

    const body = input.body || {};
    if (!body.external_id && !body.id) return null;

    return {
      provider: 'xendit',
      providerTransactionId: body.id,
      externalReference: body.external_id,
      status: this.mapStatus(body.status),
      amount: body.paid_amount || body.amount,
      currency: body.currency || 'IDR',
      paymentMethod: body.payment_method || body.payment_channel,
      raw: body
    };
  }

  private mapStatus(status?: string): PaymentEventStatus {
    switch ((status || '').toUpperCase()) {
      case 'PAID':
      case 'SETTLED':
        return 'completed';
      case 'PENDING':
        return 'pending';
      case 'EXPIRED':
      case 'FAILED':
        return 'failed';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
