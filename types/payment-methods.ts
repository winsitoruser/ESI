import { Currency } from './currency';

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  description?: string;
  fee: number;
  requiresVerification: boolean;
  isActive: boolean;
  integrationKey?: string;
  currencyId?: string;
  currency?: Currency;
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
