/**
 * PaymentGateway interface for subscription/ERP billing.
 *
 * Adapters implement this interface. The SubscriptionService
 * calls createCheckout() to obtain a redirect URL / token which
 * is returned to the frontend. Webhooks use verifyWebhook() to
 * validate and return a normalized PaymentEvent.
 */

export type PaymentProvider = 'midtrans' | 'xendit' | 'manual';

export interface CheckoutInput {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  successUrl?: string;
  failureUrl?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutResult {
  provider: PaymentProvider;
  providerTransactionId?: string;
  redirectUrl?: string;
  token?: string;
  qrCode?: string;
  rawResponse?: any;
}

export type PaymentEventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface PaymentEvent {
  provider: PaymentProvider;
  providerTransactionId: string;
  externalReference: string;
  status: PaymentEventStatus;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  raw?: any;
}

export interface WebhookInput {
  headers: Record<string, any>;
  body: any;
  rawBody?: string;
}

export interface PaymentGateway {
  provider: PaymentProvider;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(input: WebhookInput): Promise<PaymentEvent | null>;
}
