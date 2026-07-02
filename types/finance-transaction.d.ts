import { Model, Optional } from 'sequelize';

export interface FinanceTransactionAttributes {
  id: string;
  tenantId: string;
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description: string;
  referenceNumber?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  paymentMethodId?: string | null;
  isRecurring: boolean;
  recurringInterval?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  recurringEndDate?: Date | null;
  isTaxIncluded: boolean;
  taxAmount?: number | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  metadata?: Record<string, any> | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceTransactionCreationAttributes 
  extends Optional<FinanceTransactionAttributes, 
    'id' | 'referenceNumber' | 'notes' | 'categoryId' | 'accountId' | 
    'paymentMethodId' | 'recurringInterval' | 'recurringEndDate' | 
    'taxAmount' | 'createdBy' | 'updatedBy' | 'approvedBy' | 'approvedAt' |
    'metadata' | 'deletedAt' | 'deletedBy' | 'createdAt' | 'updatedAt'
  > {}

export interface FinanceTransactionInstance 
  extends Model<FinanceTransactionAttributes, FinanceTransactionCreationAttributes>,
    FinanceTransactionAttributes {
  // Instance methods can be defined here
  getCategory?: () => Promise<TransactionCategoryInstance>;
  getAccount?: () => Promise<BankAccountInstance>;
  getPaymentMethod?: () => Promise<PaymentMethodInstance>;
  getAttachments?: (options?: any) => Promise<TransactionAttachmentInstance[]>;
  getTaxes?: (options?: any) => Promise<TransactionTaxInstance[]>;
}
