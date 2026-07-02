import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface Stock {
  id: string;
  productId: string;
  branchId?: string;
  warehouseLocation?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  lastStockCount?: string;
  lastRestockDate?: string;
  averageCost?: number;
  totalValue: number;
  product?: any;
}

export interface StockMovement {
  id: string;
  productId: string;
  branchId?: string;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment' | 'return' | 'damage' | 'expired' | 'sale' | 'purchase';
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType: string;
  referenceId?: string;
  referenceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
  movementDate: string;
  balanceBefore?: number;
  balanceAfter?: number;
  product?: any;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentTerms?: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  items?: any[];
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  branchId?: string;
  orderDate: string;
  requiredDate?: string;
  shippedDate?: string;
  status: 'draft' | 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  shippingAddress?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  notes?: string;
  items?: any[];
}

export const useInventory = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Stock Management
  const fetchStock = async (params?: { branchId?: string; productId?: string; lowStock?: boolean; search?: string; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append('branchId', params.branchId);
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.lowStock) queryParams.append('lowStock', 'true');
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`/api/inventory/stock?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch stock');
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

  const updateStock = async (stockData: Partial<Stock> & { id: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Stock berhasil diperbarui'
        });
        return data.stock;
      } else {
        throw new Error(data.error || 'Failed to update stock');
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

  // Stock Movement
  const fetchStockMovements = async (params?: { productId?: string; branchId?: string; movementType?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.branchId) queryParams.append('branchId', params.branchId);
      if (params?.movementType) queryParams.append('movementType', params.movementType);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`/api/inventory/stock/movements?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch stock movements');
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

  const createStockMovement = async (movementData: Partial<StockMovement>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Stock movement berhasil dicatat. Saldo baru: ${data.newBalance}`
        });
        return data;
      } else {
        throw new Error(data.error || 'Failed to create stock movement');
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

  // Purchase Order Management
  const fetchPurchaseOrders = async (params?: { supplierId?: string; status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`/api/inventory/purchase-orders?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch purchase orders');
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

  const createPurchaseOrder = async (poData: Partial<PurchaseOrder>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Purchase Order ${data.purchaseOrder.poNumber} berhasil dibuat`
        });
        return data.purchaseOrder;
      } else {
        throw new Error(data.error || 'Failed to create purchase order');
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

  const approvePurchaseOrder = async (poId: string, approvedBy: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/purchase-orders/${poId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Purchase Order berhasil disetujui'
        });
        return data.purchaseOrder;
      } else {
        throw new Error(data.error || 'Failed to approve purchase order');
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

  // Goods Receipt
  const createGoodsReceipt = async (grData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/goods-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Goods Receipt ${data.goodsReceipt.grNumber} berhasil dibuat dan stock telah diperbarui`
        });
        return data.goodsReceipt;
      } else {
        throw new Error(data.error || 'Failed to create goods receipt');
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

  // Sales Order Management
  const fetchSalesOrders = async (params?: { customerId?: string; status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`/api/inventory/sales-orders?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to fetch sales orders');
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

  const createSalesOrder = async (soData: Partial<SalesOrder>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Sales Order ${data.salesOrder.soNumber} berhasil dibuat dan stock telah direserve`
        });
        return data.salesOrder;
      } else {
        throw new Error(data.error || 'Failed to create sales order');
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

  // Stock Adjustment
  const createStockAdjustment = async (adjustmentData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Stock Adjustment ${data.adjustment.adjustmentNumber} berhasil dibuat`
        });
        return data.adjustment;
      } else {
        throw new Error(data.error || 'Failed to create stock adjustment');
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
    loading,
    // Stock
    fetchStock,
    updateStock,
    // Stock Movement
    fetchStockMovements,
    createStockMovement,
    // Purchase Order
    fetchPurchaseOrders,
    createPurchaseOrder,
    approvePurchaseOrder,
    // Goods Receipt
    createGoodsReceipt,
    // Sales Order
    fetchSalesOrders,
    createSalesOrder,
    // Stock Adjustment
    createStockAdjustment
  };
};
