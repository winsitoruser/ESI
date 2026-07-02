import axios from 'axios';

// Types for POS reports
export interface SalesSummary {
  summary: {
    totalTransactions: number;
    totalSales: number;
    netSales: number;
    averageTransaction: number;
    totalItemsSold: number;
    totalProfit: number;
  };
  timeBreakdown: TimeBreakdown[];
  paymentBreakdown: PaymentBreakdown[];
}

export interface TimeBreakdown {
  period: string;
  transactions: number;
  sales: number;
}

export interface PaymentBreakdown {
  paymentMethod: string;
  transactions: number;
  totalAmount: number;
}

export interface TopProduct {
  rank: number;
  id: string;
  productName: string;
  sku: string;
  categoryName: string;
  totalSold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  transactionCount: number;
}

export interface CashierPerformance {
  cashierId: string;
  cashierName: string;
  totalTransactions: number;
  totalSales: number;
  averageTransaction: number;
  totalItemsSold: number;
  firstTransaction: Date;
  lastTransaction: Date;
}

export interface DailySalesTrend {
  date: Date;
  transactions: number;
  sales: number;
  itemsSold: number;
  averageTransaction: number;
}

export interface CategorySales {
  id: string;
  categoryName: string;
  productCount: number;
  totalSold: number;
  revenue: number;
  percentage: number;
  transactionCount: number;
}

export interface POSReportsFilter {
  reportType?: 'sales-summary' | 'top-products' | 'cashier-performance' | 'daily-sales-trend' | 'category-sales';
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  cashierId?: string;
  limit?: number;
}

// Fetch sales summary report
export async function fetchSalesSummaryReport(filter?: POSReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/pos/reports', {
      signal: controller.signal,
      params: {
        reportType: 'sales-summary',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as SalesSummary,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data ringkasan penjualan',
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
    console.error('Error fetching sales summary report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data ringkasan penjualan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch top products report
export async function fetchTopProductsReport(filter?: POSReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/pos/reports', {
      signal: controller.signal,
      params: {
        reportType: 'top-products',
        limit: filter?.limit || 10,
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as TopProduct[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data produk terlaris',
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
    console.error('Error fetching top products report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data produk terlaris, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch cashier performance report
export async function fetchCashierPerformanceReport(filter?: POSReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/pos/reports', {
      signal: controller.signal,
      params: {
        reportType: 'cashier-performance',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates
      const processedData = response.data.data.map((cashier: any) => ({
        ...cashier,
        firstTransaction: new Date(cashier.firstTransaction),
        lastTransaction: new Date(cashier.lastTransaction)
      }));

      return {
        data: processedData as CashierPerformance[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data performa kasir',
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
    console.error('Error fetching cashier performance report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data performa kasir, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch daily sales trend report
export async function fetchDailySalesTrendReport(filter?: POSReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/pos/reports', {
      signal: controller.signal,
      params: {
        reportType: 'daily-sales-trend',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates
      const processedData = response.data.data.map((trend: any) => ({
        ...trend,
        date: new Date(trend.date)
      }));

      return {
        data: processedData as DailySalesTrend[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data tren penjualan harian',
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
    console.error('Error fetching daily sales trend report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data tren penjualan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch category sales report
export async function fetchCategorySalesReport(filter?: POSReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/pos/reports', {
      signal: controller.signal,
      params: {
        reportType: 'category-sales',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data as CategorySales[],
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data penjualan per kategori',
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
    console.error('Error fetching category sales report:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal mengambil data penjualan per kategori, menggunakan data sementara',
      success: false
    };
  }
}

// Generate/export report
export async function generatePOSReport(reportType: string, parameters: any, format: string = 'pdf') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.post('/api/pos/reports', {
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
    console.error('Error generating POS report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal membuat laporan, silakan coba lagi',
      success: false
    };
  }
}
