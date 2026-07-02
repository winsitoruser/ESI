import axios from 'axios';

// Types for reports
export interface StockValueSummary {
  totalValue: number;
  previousTotalValue: number;
  categories: CategoryValue[];
}

export interface CategoryValue {
  id: string;
  name: string;
  itemCount: number;
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface StockMovement {
  id: string;
  date: Date;
  type: 'in' | 'out' | 'adjustment';
  reference: string;
  productName: string;
  productId: string;
  sku: string;
  quantity: number;
  fromTo: string;
  notes: string;
  staff: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface LowStockProduct {
  id: string;
  productName: string;
  sku: string;
  categoryName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  price: number;
  supplier: string;
  location: string;
  lastRestockDate: string;
  status: 'critical' | 'warning';
}

export interface ProductAnalysis {
  topSellingProducts: TopSellingProduct[];
  slowMovingProducts: SlowMovingProduct[];
}

export interface TopSellingProduct {
  id: string;
  productName: string;
  sku: string;
  totalSold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SlowMovingProduct {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  lastSaleDate: string;
  daysSinceLastSale: number;
  value: number;
  recommendation: string;
}

export interface ReportsFilter {
  reportType?: 'stock-value' | 'stock-movement' | 'low-stock' | 'product-analysis';
  period?: string;
  branch?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Fetch stock value reports
export async function fetchStockValueReport(filter?: ReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/inventory/reports', {
      signal: controller.signal,
      params: {
        reportType: 'stock-value',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data laporan nilai stok',
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
    console.error('Error fetching stock value report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal mengambil data laporan, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch stock movement reports
export async function fetchStockMovementReport(filter?: ReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/inventory/reports', {
      signal: controller.signal,
      params: {
        reportType: 'stock-movement',
        page: filter?.page || 1,
        limit: filter?.limit || 10,
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      // Process dates
      const processedMovements = response.data.data.movements.map((movement: any) => ({
        ...movement,
        date: new Date(movement.date)
      }));

      return {
        data: {
          ...response.data.data,
          movements: processedMovements
        },
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data pergerakan stok',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: { movements: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching stock movement report:', error);
    return {
      data: { movements: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      isFromMock: true,
      message: 'Gagal mengambil data pergerakan stok, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch low stock reports
export async function fetchLowStockReport(filter?: ReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/inventory/reports', {
      signal: controller.signal,
      params: {
        reportType: 'low-stock',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data stok minimum',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: { products: [], summary: { totalLowStock: 0, criticalCount: 0, warningCount: 0, totalValue: 0 } },
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching low stock report:', error);
    return {
      data: { products: [], summary: { totalLowStock: 0, criticalCount: 0, warningCount: 0, totalValue: 0 } },
      isFromMock: true,
      message: 'Gagal mengambil data stok minimum, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch product analysis reports
export async function fetchProductAnalysisReport(filter?: ReportsFilter) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get('/api/inventory/reports', {
      signal: controller.signal,
      params: {
        reportType: 'product-analysis',
        ...filter
      }
    });

    clearTimeout(timeoutId);

    if (response.data.success) {
      return {
        data: response.data.data,
        isFromMock: response.data.isFromMock || false,
        message: response.data.message || 'Data analisis produk',
        success: true
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: { topSellingProducts: [], slowMovingProducts: [] },
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching product analysis report:', error);
    return {
      data: { topSellingProducts: [], slowMovingProducts: [] },
      isFromMock: true,
      message: 'Gagal mengambil data analisis produk, menggunakan data sementara',
      success: false
    };
  }
}

// Generate report (create/export)
export async function generateReport(reportType: string, parameters: any, format: string = 'pdf') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.post('/api/inventory/reports', {
      reportType,
      parameters,
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
    console.error('Error generating report:', error);
    return {
      data: null,
      isFromMock: true,
      message: 'Gagal membuat laporan, silakan coba lagi',
      success: false
    };
  }
}
