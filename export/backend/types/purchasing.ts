// Purchasing Module Types

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  orderDate: Date;
  expectedDelivery?: Date;
  totalAmount: number;
  status: PurchaseOrderStatus;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  paymentTerms?: string;
  paymentStatus: PaymentStatus;
  currency: string;
  discountType?: DiscountType;
  discountValue: number;
  taxIncluded: boolean;
  taxRate: number;
  shippingCost: number;
  attachments?: string[]; // Array of file paths or URLs
  receivedBy?: string;
  receivedAt?: Date;
  items?: PurchaseItem[];
  statuses?: PurchaseStatus[];
  defectaSource: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseOrderId: string;
  productId?: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  tax?: number;
  discount?: number;
  status: ItemStatus;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefectaItem {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  suggestedOrder: number;
  priority: DefectaPriority;
  status: DefectaStatus;
  lastOrderDate?: Date;
  notes?: string;
  addedToPO: boolean;
  purchaseOrderRef?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseStatus {
  id: string;
  purchaseOrderId: string;
  status: string;
  notes?: string;
  changedBy?: string;
  tenantId?: string;
  createdAt: Date;
}

export interface SupplierAnalysis {
  id: string;
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalAmount: number;
  onTimeDelivery: number;
  lateDelivery: number;
  qualityIssues: number;
  averageResponseTime?: number;
  lastOrder?: Date;
  performanceScore?: number;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request and Response Types
export interface CreatePurchaseOrderRequest {
  supplierId: string;
  expectedDelivery?: Date;
  notes?: string;
  paymentTerms?: string;
  currency: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxIncluded?: boolean;
  taxRate?: number;
  shippingCost?: number;
  items: CreatePurchaseItemRequest[];
  defectaSource?: boolean;
}

export interface CreatePurchaseItemRequest {
  productId?: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tax?: number;
  discount?: number;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

export interface UpdatePurchaseOrderRequest {
  expectedDelivery?: Date;
  status?: PurchaseOrderStatus;
  notes?: string;
  paymentTerms?: string;
  paymentStatus?: PaymentStatus;
  discountType?: DiscountType;
  discountValue?: number;
  taxIncluded?: boolean;
  taxRate?: number;
  shippingCost?: number;
  attachments?: string[];
}

export interface ApprovePurchaseOrderRequest {
  approvedBy: string;
  notes?: string;
}

export interface ReceivePurchaseOrderRequest {
  receivedBy: string;
  receivedAt: Date;
  items: ReceivePurchaseItemRequest[];
  notes?: string;
}

export interface ReceivePurchaseItemRequest {
  id: string;
  receivedQuantity: number;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

export interface CreateDefectaItemRequest {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  suggestedOrder: number;
  priority?: DefectaPriority;
  notes?: string;
}

// Enums
export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'completed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DiscountType = 'percentage' | 'fixed';
export type ItemStatus = 'pending' | 'partial' | 'received' | 'rejected';
export type DefectaPriority = 'low' | 'medium' | 'high';
export type DefectaStatus = 'pending' | 'ordered' | 'received';
