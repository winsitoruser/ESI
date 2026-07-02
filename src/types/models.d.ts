// Type definitions for models to avoid import issues

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingInterval: 'monthly' | 'yearly';
  currency: string;
  trialDays: number;
  features: Record<string, boolean>;
  metadata: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  planLimits?: PlanLimit[];
  getFormattedPrice(): string;
  getIntervalDisplay(): string;
}

export interface PlanLimit {
  id: string;
  planId: string;
  metricName: string;
  maxValue: number;
  unit?: string;
  isSoftLimit: boolean;
  overageRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt?: Date;
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  plan?: Plan;
  billingCycles?: BillingCycle[];
  isInTrial(): boolean;
  getTrialDaysLeft(): number;
  getDaysUntilRenewal(): number;
  cancel(atPeriodEnd?: boolean): void;
}

export interface BillingCycle {
  id: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  baseAmount: number;
  overageAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  dueDate: Date;
  status: 'pending' | 'processing' | 'paid' | 'overdue' | 'cancelled';
  processedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  subscription?: Subscription;
  isOverdue(): boolean;
}

export interface Invoice {
  id: string;
  tenantId: string;
  billingCycleId?: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issuedDate: Date;
  dueDate: Date;
  paidDate?: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paymentProvider?: string;
  paymentMethod?: string;
  externalId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItem[];
  paymentTransactions?: PaymentTransaction[];
  billingCycle?: BillingCycle;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled' | 'refunded';
  provider: string;
  providerTransactionId?: string;
  paymentMethod?: string;
  failureReason?: string;
  processedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  invoice?: Invoice;
}

export interface UsageMetric {
  id: string;
  tenantId: string;
  metricName: string;
  metricValue: number;
  periodStart: Date;
  periodEnd: Date;
  source: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: string;
  provider: string;
  name: string;
  description?: string;
  details: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  businessAddress?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
