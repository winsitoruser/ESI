import { z } from 'zod'

const BatchInSchema = z.object({
  id: z.string(),
  qty: z.number(),
  expire_date: z.string(),
  unit: z.string(),
  return_status: z.boolean(),
  ph_stock_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const BuyerSchema = z.object({
  id: z.string(),
  code: z.string(),
  buyer_name: z.string(),
  phone: z.string(),
  buyer_expenditure: z.number(),
  prescription: z.boolean(),
  prescription_id: z.null(),
  prescription_code: z.null(),
  payment_method: z.string(),
  tax: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const GoodsOutSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  code: z.string(),
  qty: z.number(),
  sales_unit: z.string(),
  price: z.number(),
  disc: z.string(),
  total_price: z.number(),
  div_area: z.string(),
  buyer_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  buyer: BuyerSchema
});

export type DrugsDataBatch = z.infer<typeof BatchInSchema>
export type GoodsOut = z.infer<typeof GoodsOutSchema>

// Warehouse and Rack Types
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  capacity?: number;
  usedCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Rack {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  warehouseName?: string;
  floor: number;
  capacity: number;
  usedCapacity?: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Form Types
export interface WarehouseFormData {
  code: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  capacity: number;
}

export interface RackFormData {
  code: string;
  name: string;
  warehouseId: string;
  floor: number;
  capacity: number;
  description: string;
  isActive: boolean;
}

// Validation Schemas
export const warehouseFormSchema = z.object({
  code: z.string().min(1, 'Kode gudang harus diisi'),
  name: z.string().min(1, 'Nama gudang harus diisi'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  capacity: z.number().min(1, 'Kapasitas harus diisi').default(0)
});

export const rackFormSchema = z.object({
  code: z.string().min(1, 'Kode rak harus diisi'),
  name: z.string().min(1, 'Nama rak harus diisi'),
  warehouseId: z.string().min(1, 'Gudang harus dipilih'),
  floor: z.number().min(1, 'Lantai harus diisi'),
  capacity: z.number().min(1, 'Kapasitas harus diisi'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;
export type RackFormValues = z.infer<typeof rackFormSchema>;

// Product Types
export interface ProductWithSKU {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  costPrice: number;
  stock?: number;
  minimumStock?: number;
  unit: string;
  unitsPerPack?: number;
  isActive: boolean;
  expiryDate?: string;
  manufacturer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilterParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export interface ProductSearchResult {
  products: ProductWithSKU[];
  pagination: PaginatedResponse;
  isFallback?: boolean;
}

// Supplier Types
export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'PBF' | 'PRINCIPAL' | 'DISTRIBUTOR';
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  taxId?: string;
  rating?: number;
  status: 'active' | 'inactive';
  paymentTerms?: string;
  bankAccount?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}