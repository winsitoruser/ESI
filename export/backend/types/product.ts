/**
 * Product related type definitions
 */

export interface Product {
  id: string;
  name: string;
  category?: string;
  categoryId?: string;
  categoryColor?: string;
  description?: string;
  uom?: string; // Unit of measure
  stock: number;
  reorderLevel: number;
  price?: number;
  costPrice?: number;
  barcode?: string;
  sku?: string;
  supplierId?: string;
  supplierName?: string;
  isToling?: boolean;
  composition?: string;
  expiryDate?: Date | string;
  batchNumber?: string;
  locationId?: string;
  locationName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  tenantId?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  tenantId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isFromMock: boolean;
}

export interface ProductResponse {
  product: Product;
  isFromMock: boolean;
}

export interface ProductFilter {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isToling?: boolean;
}

export interface LowStockProductsResponse {
  products: Product[];
  isFromMock: boolean;
}
