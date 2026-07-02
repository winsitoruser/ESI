// Transaction item in a transaction
export interface TransactionItem {
  productName: string;
  productCode?: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  subtotal: number;
}

// Transaction filter for querying transactions
export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: string;
}

// Main transaction type
export interface Transaction {
  id: string;
  date: string;
  time?: string;
  invoiceNumber?: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  cashierName?: string;
  shiftId?: string;
  items?: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export default function useTransactionIntegration() {
  return {
    isIntegrated: false,
    syncStatus: 'unknown' as const,
    syncNow: async () => {},
    getTransactions: async (_filter?: TransactionFilter): Promise<{ transactions: Transaction[]; total: number }> => {
      return { transactions: [], total: 0 };
    },
    getTransactionById: async (_id: string): Promise<Transaction | null> => {
      return null;
    },
    printReceipt: async (_transaction: Transaction): Promise<void> => {},
    formatRupiah: (amount: number): string => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    },
    isLoading: false,
    error: null as string | null,
  };
}
