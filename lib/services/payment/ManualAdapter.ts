import {
  PaymentGateway,
  CheckoutInput,
  CheckoutResult,
  WebhookInput,
  PaymentEvent
} from './PaymentGateway';

/**
 * ManualAdapter - for offline / bank-transfer payments where the admin
 * confirms payment manually. createCheckout() returns the invoice URL and
 * verifyWebhook() is a no-op because admins trigger /api/hq/billing/invoices/[id]/confirm.
 */
export class ManualAdapter implements PaymentGateway {
  provider = 'manual' as const;

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return {
      provider: 'manual',
      providerTransactionId: input.invoiceNumber,
      redirectUrl: `/hq/billing-info?invoice=${input.invoiceId}&method=manual`
    };
  }

  async verifyWebhook(_input: WebhookInput): Promise<PaymentEvent | null> {
    return null;
  }
}
