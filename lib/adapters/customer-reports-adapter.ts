import axios from 'axios';

// Types for Customer reports
export interface CustomerOverview {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalRevenue: number;
    averageTransaction: number;
    totalTransactions: number;
  };
}

export interface TopCustomer {
  rank: number;
  id: string;
  customerName: string;
  email: string;
  phone: string;
  customerType: string;
  totalTransactions: number;
  totalSpent: number;
  averageTransaction: number;
  lastPurchaseDate: Date;
  totalItemsPurchased: number;
}

export interface CustomerSegmentation {
  byType: TypeSegment[];
  bySpending: SpendingSegment[];
}

export interface TypeSegment {
  customerType: string;
  customerCount: number;
  totalRevenue: number;
  averageTransaction: number;
  transactionCount: number;
  revenuePercentage: number;
}

export interface SpendingSegment {
  segment: string;
  customerCount: number;
  totalRevenue: number;
  averageSpent: number;
  revenuePercentage: number;
}

export interface CustomerRetention {
  monthlyRetention: MonthlyRetention[];
  churnAnalysis: {
    atRiskCustomers: number;
  };
}

export interface MonthlyRetention {
  month: string;
  monthLabel: string;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
}

export interface PurchaseBehavior {
  purchaseFrequency: FrequencyDistribution[];
  basketAnalysis: {
    avgItemsPerTransaction: number;
    avgTransactionValue: number;
    maxTransactionValue: number;
    minTransactionValue: number;
  };
  purchaseTimeDistribution: TimeDistribution[];
}

export interface FrequencyDistribution {
  frequencyRange: string;
  customerCount: number;
}

export interface TimeDistribution {
  hour: number;
  transactionCount: number;
  uniqueCustomers: number;
}

export interface CustomerReportsFilter {
  reportType?: 'overview' | 'top-customers' | 'segmentation' | 'retention' | 'purchase-behavior';
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  months?: number;
}

// Fetch customer overview report
export async function fetchCustomerOverviewReport(filter?: CustomerReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/customers/reports', {
      signal: controller.signal,
      params: {
        reportType: 'overview',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as CustomerOverview,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data overview pelanggan',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching customer overview report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data overview pelanggan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch top customers report
export async function fetchTopCustomersReport(filter?: CustomerReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/customers/reports', {
      signal: controller.signal,
      params: {
        reportType: 'top-customers',
        limit: filter?.limit || 10,
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates
      const processedData = response.data.data.map((customer: any) => ({
        ...customer,
        lastPurchaseDate: new Date(customer.lastPurchaseDate)
      }));

      return {
        data: processedData as TopCustomer[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data pelanggan terbaik',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: [],
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching top customers report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data pelanggan terbaik, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch customer segmentation report
export async function fetchCustomerSegmentationReport(filter?: CustomerReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/customers/reports', {
      signal: controller.signal,
      params: {
        reportType: 'segmentation',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as CustomerSegmentation,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data segmentasi pelanggan',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching customer segmentation report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data segmentasi pelanggan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch customer retention report
export async function fetchCustomerRetentionReport(filter?: CustomerReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/customers/reports', {
      signal: controller.signal,
      params: {
        reportType: 'retention',
        months: filter?.months || 6,
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as CustomerRetention,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data retensi pelanggan',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching customer retention report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data retensi pelanggan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch purchase behavior report
export async function fetchPurchaseBehaviorReport(filter?: CustomerReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/customers/reports', {
      signal: controller.signal,
      params: {
        reportType: 'purchase-behavior',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as PurchaseBehavior,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data perilaku pembelian',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching purchase behavior report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data perilaku pembelian, menggunakan data sementara',
      success: false
    };
  }
}

// Generate/export customer report
export async function generateCustomerReport(reportType: string, parameters: any, format: string = 'pdf') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.post('/api/customers/reports', {
      reportType,
      ...parameters,
      format
    }, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Laporan berhasil dibuat',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: null,
        isFromMock: true,
        message: 'Gagal membuat laporan',
        success: false
      };
    }
  } catch (error) {
    console.error('Error generating Customer report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal membuat laporan, silakan coba lagi',
      success: false
    };
  }
}
