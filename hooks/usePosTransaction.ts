import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface TransactionItem {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  shiftId?: string;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  transactionDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'QRIS' | 'E-Wallet';
  paidAmount: number;
  changeAmount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  cashier?: {
    id: string;
    name: string;
    position: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  items?: TransactionItem[];
}

export const usePosTransaction = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get transactions with filters
  const fetchTransactions = async (filters?: {
    shiftId?: string;
    cashierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.shiftId) params.append('shiftId', filters.shiftId);
      if (filters?.cashierId) params.append('cashierId', filters.cashierId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`/api/pos/transactions?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions);
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get single transaction by ID
  const fetchTransactionById = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pos/transactions/${id}`);
      const data = await response.json();

      if (response.ok) {
        return data.transaction;
      } else {
        throw new Error(data.error || 'Failed to fetch transaction');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create new transaction
  const createTransaction = async (transactionData: {
    shiftId?: string;
    customerId?: string;
    customerName?: string;
    cashierId: string;
    items: TransactionItem[];
    paymentMethod: string;
    paidAmount: number;
    discount?: number;
    tax?: number;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Transaksi Berhasil',
          description: `Transaksi ${data.transaction.transactionNumber} berhasil dibuat`
        });
        return data.transaction;
      } else {
        throw new Error(data.error || 'Failed to create transaction');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    fetchTransactionById,
    createTransaction
  };
};
