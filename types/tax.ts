import { Currency } from './currency';
import { PaymentMethod } from './payment-methods';

export interface TaxTransaction {
  id: string;
  transactionId: string;
  date: string | Date;
  type: string;
  description?: string;
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  status: string;
  reportedIn?: string;
  currencyId?: string;
  currency?: Currency;
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TaxEmployee {
  id: string;
  employeeId: string;
  name: string;
  taxId: string;
  position?: string;
  department?: string;
  salary: number;
  allowances: number;
  deductions: number;
  taxableIncome: number;
  annualTax: number;
  monthlyTax: number;
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  payments?: TaxPayment[];
}

export interface TaxPayment {
  id: string;
  paymentId: string;
  type: string;
  description?: string;
  amount: number;
  date: string | Date;
  period: string;
  paymentMethodId?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  status: string;
  employeeId?: string;
  employee?: {
    id: string;
    name: string;
    taxId: string;
    position?: string;
    department?: string;
  };
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TaxSummary {
  period: {
    startDate: string | Date;
    endDate: string | Date;
    year: number;
    month: number;
    quarter: number;
  };
  summary: {
    totalTaxable: number;
    totalTax: number;
    totalPaid: number;
    outstandingTax: number;
    transactionCount: number;
    paymentCount: number;
  };
  distributions: {
    status: Record<string, number>;
    types: Record<string, number>;
  };
  latest: {
    transactions: TaxTransaction[];
    payments: TaxPayment[];
  };
}
