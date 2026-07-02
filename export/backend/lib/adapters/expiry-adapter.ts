import axios from 'axios';

// Types
export interface ExpiryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: Date;
  daysRemaining: number;
  currentStock: number;
  value: number;
  status: "expired" | "critical" | "warning" | "good";
  category: string;
  quantity: number;
  location: string;
  supplier: string;
  costPrice: number;
}

export interface OrderHistory {
  id: string;
  orderDate: Date;
  orderNumber: string;
  quantity: number;
  staff: {
    id: string;
    name: string;
    avatar: string;
    position: string;
  };
}

// Calculate days between two dates
export function getDaysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  return diffDays;
}

// Types for filtering and sorting expiry data
export interface ExpiryFilter {
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Fetch expiry data from API with optional filtering
export async function fetchExpiryData(filter?: ExpiryFilter) {
  try {
    // Set up AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout for potential larger datasets
    
    // Build query parameters for filtering
    const params: Record<string, string | number> = {};
    
    if (filter) {
      if (filter.status) params.status = filter.status;
      if (filter.category) params.category = filter.category;
      if (filter.search) params.search = filter.search;
      // Add sorting parameters
      if (filter.sortBy) params.sortBy = filter.sortBy;
      if (filter.sortDirection) params.sortDirection = filter.sortDirection;
      // Add pagination parameters
      if (filter.page !== undefined) params.page = filter.page;
      if (filter.limit !== undefined) params.limit = filter.limit;
    }
    
    // Call API to get expiry data with filters
    const response = await axios.get('/api/inventory/expiry', {
      signal: controller.signal,
      params
    });
    
    clearTimeout(timeoutId);
    
    if (response.data.success) {
      // Handle nested response structure
      const responseData = response.data.data || response.data;
      const dataArray = Array.isArray(responseData.data) ? responseData.data : 
                       Array.isArray(responseData) ? responseData : [];
      
      // Process dates (convert string dates to Date objects)
      const processedData = dataArray.map((item: any) => ({
        ...item,
        expiryDate: new Date(item.expiryDate),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        actionDate: item.actionDate ? new Date(item.actionDate) : null
      }));
      
      return {
        data: processedData,
        isFromMock: responseData.isFromMock || response.data.isFromMock || false,
        message: responseData.message || response.data.message || 'Data produk kadaluarsa',
        success: true,
        pagination: responseData.pagination || response.data.pagination || {
          total: processedData.length,
          page: filter?.page || 1,
          limit: filter?.limit || processedData.length,
          totalPages: Math.ceil(processedData.length / (filter?.limit || 10))
        }
      };
    } else {
      console.warn('API returned success=false:', response.data);
      return {
        data: [],
        isFromMock: true,
        message: response.data.message || 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching expiry data:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal terhubung ke server, menggunakan data sementara',
      success: false
    };
  }
}

// Fetch order history from API
export async function fetchOrderHistory(productId: string) {
  try {
    // Set up AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Call API to get order history
    const response = await axios.get('/api/inventory/expiry', {
      signal: controller.signal,
      params: {
        dataType: 'orderHistory',
        productId
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.data.success) {
      // Handle nested response structure
      const responseData = response.data.data || response.data;
      const dataArray = Array.isArray(responseData.data) ? responseData.data : 
                       Array.isArray(responseData) ? responseData : [];
      
      // Process dates (convert string dates to Date objects)
      const processedData = dataArray.map((item: any) => ({
        ...item,
        orderDate: new Date(item.orderDate)
      }));
      
      return {
        data: processedData,
        isFromMock: responseData.isFromMock || response.data.isFromMock || false,
        message: responseData.message || response.data.message || 'Riwayat pemesanan produk',
        success: true
      };
    } else {
      console.warn('API returned success=false for order history:', response.data);
      return {
        data: [],
        isFromMock: true,
        message: 'Respons API tidak sukses, menggunakan data sementara',
        success: false
      };
    }
  } catch (error) {
    console.error('Error fetching order history:', error);
    return {
      data: [],
      isFromMock: true,
      message: 'Gagal terhubung ke server, menggunakan data sementara',
      success: false
    };
  }
}

// Process expiry action (discard, defecta, sales promotion)
export async function processExpiryAction(action: string, items: ExpiryItem[], notes?: string) {
  try {
    // Set up AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout for potential bulk operations
    
    // Call API to process action
    const response = await axios.post('/api/inventory/expiry', {
      action,
      items,
      notes: notes || ''
    }, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Aksi berhasil diproses',
        data: response.data.data || [],
        isFromMock: response.data.isFromMock || false
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Terjadi kesalahan saat memproses aksi',
        data: [],
        isFromMock: true
      };
    }
  } catch (error: any) {
    console.error(`Error processing ${action} action:`, error);
    return {
      success: false,
      message: error?.response?.data?.message || 'Terjadi kesalahan saat menghubungi server',
      data: [],
      isFromMock: true
    };
  }
}
