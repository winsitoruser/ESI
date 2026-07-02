import axios from 'axios';

// Interfaces
export interface Invoice {
  id: string;
  partner: string;
  plan: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'canceled';
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  period: string;
  paymentMethod: string | null;
}

export interface FreeTrialPharmacy {
  id: string;
  name: string;
  contactPerson: string;
  phoneNumber: string;
  location: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
  planType: string;
  modules: string[];
}

export interface BillingStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countPaid: number;
  countPending: number;
  countOverdue: number;
  countCanceled: number;
}

// Fallback data jika API gagal
export const fallbackInvoices: Invoice[] = [
  {
    id: "INV-202504-1001",
    partner: "Apotek Sehat Sentosa",
    plan: "Basic",
    amount: 149000,
    status: "paid",
    issueDate: "2025-04-01",
    dueDate: "2025-04-15",
    paidDate: "2025-04-10",
    period: "1 Bulan",
    paymentMethod: "bank_transfer"
  },
  {
    id: "INV-202504-1002",
    partner: "Apotek Sejahtera",
    plan: "Pro",
    amount: 299000,
    status: "pending",
    issueDate: "2025-04-05",
    dueDate: "2025-04-19",
    paidDate: null,
    period: "1 Bulan",
    paymentMethod: null
  },
  {
    id: "INV-202504-1003",
    partner: "Apotek Keluarga",
    plan: "Premium",
    amount: 499000,
    status: "overdue",
    issueDate: "2025-03-20",
    dueDate: "2025-04-03",
    paidDate: null,
    period: "1 Bulan",
    paymentMethod: null
  }
];

export const fallbackTrials: FreeTrialPharmacy[] = [
  {
    id: "FT-001",
    name: "Apotek Sehat Sentosa",
    contactPerson: "Budi Santoso",
    phoneNumber: "081234567890",
    location: "Jakarta Selatan",
    startDate: "2025-04-15",
    endDate: "2025-05-15",
    daysLeft: 7,
    planType: "Basic",
    modules: ["POS", "Inventory", "Finance"]
  },
  {
    id: "FT-002",
    name: "Apotek Bahagia",
    contactPerson: "Dewi Suryani",
    phoneNumber: "085678901234",
    location: "Bandung",
    startDate: "2025-04-20",
    endDate: "2025-05-20",
    daysLeft: 12,
    planType: "Pro",
    modules: ["POS", "Inventory", "Finance", "Analytics"]
  }
];

export const fallbackStats: BillingStats = {
  totalPaid: 2985000,
  totalPending: 747000,
  totalOverdue: 449000,
  countPaid: 12,
  countPending: 5,
  countOverdue: 3,
  countCanceled: 1
};

// Format Rupiah
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// API calls
export const fetchInvoices = async (page = 1, limit = 50, status?: string, searchTerm?: string, period?: string) => {
  try {
    const params: any = { page, limit };
    if (status && status !== 'all') params.status = status;
    if (searchTerm) params.searchTerm = searchTerm;
    if (period && period !== 'all') params.period = period;
    
    const response = await axios.get('/api/billing/invoices', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    // Fallback to mock data
    return {
      invoices: fallbackInvoices,
      total: fallbackInvoices.length,
      page: 1,
      limit: 50,
      totalPages: 1,
      stats: fallbackStats
    };
  }
};

export const fetchFreeTrials = async (page = 1, limit = 50, searchTerm?: string) => {
  try {
    const params: any = { page, limit };
    if (searchTerm) params.search = searchTerm;
    
    const response = await axios.get('/api/billing/free-trials', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching free trials:', error);
    // Fallback to mock data
    return {
      freeTrials: fallbackTrials,
      total: fallbackTrials.length,
      page: 1,
      limit: 50,
      totalPages: 1
    };
  }
};

export const convertTrialToPaid = async (id: string, packageId: string, period: string) => {
  try {
    const response = await axios.post('/api/billing/free-trials/convert', {
      id,
      packageId,
      period
    });
    return response.data;
  } catch (error) {
    console.error('Error converting trial to paid:', error);
    throw error;
  }
};

export const extendFreeTrial = async (id: string, extendDays: number) => {
  try {
    const response = await axios.post('/api/billing/free-trials/extend', {
      id,
      extendDays
    });
    return response.data;
  } catch (error) {
    console.error('Error extending free trial:', error);
    throw error;
  }
};

export const processPayment = async (invoiceId: string, paymentMethod: string) => {
  try {
    const response = await axios.post('/api/billing/invoices/pay', {
      invoiceId,
      paymentMethod
    });
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};
