import { PaymentGateway, PaymentProvider } from './PaymentGateway';
import { MidtransAdapter } from './MidtransAdapter';
import { XenditAdapter } from './XenditAdapter';
import { ManualAdapter } from './ManualAdapter';

export * from './PaymentGateway';
export { MidtransAdapter } from './MidtransAdapter';
export { XenditAdapter } from './XenditAdapter';
export { ManualAdapter } from './ManualAdapter';

export interface PaymentGatewayFactoryOptions {
  credentials?: Record<string, any>;
}

/**
 * Resolve the adapter for the given provider. Credentials can be passed in
 * explicitly (e.g. loaded from integration_configs) or fallback to env vars.
 */
export function getPaymentGateway(
  provider: PaymentProvider,
  options?: PaymentGatewayFactoryOptions
): PaymentGateway {
  const creds = options?.credentials || {};
  switch (provider) {
    case 'midtrans':
      return new MidtransAdapter({
        serverKey: creds.serverKey || creds.server_key,
        isProduction: creds.isProduction ?? creds.is_production
      });
    case 'xendit':
      return new XenditAdapter({
        secretKey: creds.secretKey || creds.secret_key,
        webhookToken: creds.webhookToken || creds.webhook_token
      });
    case 'manual':
      return new ManualAdapter();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
