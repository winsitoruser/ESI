export class IntegratedReceiptService {
  async createReceipt(data: any) {
    return { success: true, data };
  }

  async updateReceipt(id: string, data: any) {
    return { success: true, data };
  }

  async getReceipt(id: string) {
    return { success: true, data: null };
  }

  async deleteReceipt(id: string) {
    return { success: true };
  }

  async getPendingPurchaseOrders() {
    try {
      const response = await fetch('/api/inventory/purchase-orders?status=approved');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Handle both data.data.orders (nested) and data.data (direct array)
        const orders = data.data.orders || data.data;
        
        if (!Array.isArray(orders)) {
          console.error('Expected orders to be an array, got:', typeof orders);
          return [];
        }
        
        return orders.map((po: any) => ({
          id: po.id.toString(),
          poNumber: po.po_number || po.poNumber,
          orderDate: po.order_date || po.orderDate,
          status: po.status,
          supplierId: po.supplier_id?.toString() || po.supplierId,
          supplierName: po.supplier?.name || po.supplierName || 'Unknown Supplier',
          items: (po.items || []).map((item: any) => ({
            id: item.id.toString(),
            productId: item.product_id?.toString() || item.productId,
            productName: item.product?.name || item.productName,
            productSku: item.product?.sku || item.productSku,
            orderedQuantity: parseFloat(item.quantity) || 0,
            receivedQuantity: parseFloat(item.received_quantity || item.receivedQuantity || 0),
            unit: item.unit || 'pcs',
            unitPrice: parseFloat(item.unit_price || item.unitPrice || 0),
            taxPercentage: parseFloat(item.tax_percentage || item.taxPercentage || 11),
            discountPercentage: parseFloat(item.discount_percentage || item.discountPercentage || 0),
            subtotal: parseFloat(item.subtotal || 0),
            total: parseFloat(item.total || 0)
          })),
          subtotal: parseFloat(po.subtotal || 0),
          tax: parseFloat(po.tax || 0),
          discount: parseFloat(po.discount || 0),
          total: parseFloat(po.total || 0)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching pending purchase orders:', error);
      return [];
    }
  }

  async getPurchaseOrderById(id: string) {
    try {
      const response = await fetch(`/api/inventory/purchase-orders/${id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const po = data.data;
        return {
          id: po.id.toString(),
          poNumber: po.po_number || po.poNumber,
          orderDate: po.order_date || po.orderDate,
          status: po.status,
          supplierId: po.supplier_id?.toString() || po.supplierId,
          supplierName: po.supplier?.name || po.supplierName,
          items: (po.items || []).map((item: any) => ({
            id: item.id.toString(),
            productId: item.product_id?.toString() || item.productId,
            productName: item.product?.name || item.productName,
            productSku: item.product?.sku || item.productSku,
            quantity: parseFloat(item.quantity) || 0,
            receivedQuantity: parseFloat(item.received_quantity || 0),
            unit: item.unit || 'pcs',
            unitPrice: parseFloat(item.unit_price || item.unitPrice || 0)
          }))
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return null;
    }
  }

  async getReceiptById(id: string) {
    return { success: true, data: null };
  }

  async getAllReceipts() {
    return [];
  }

  async getSuppliers(filters?: { status?: string; limit?: number }) {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await fetch(`/api/inventory/suppliers?${params}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          suppliers: data.data.map((s: any) => ({
            id: s.id.toString(),
            name: s.name,
            code: s.code || s.supplier_code,
            status: s.status || 'active',
            contact: s.phone || s.contact,
            email: s.email,
            address: s.address
          })),
          pagination: data.pagination || {},
          isFallback: false
        };
      }
      
      return {
        suppliers: [
          { id: '1', name: 'PT Supplier Utama', code: 'SUP-001', status: 'active', contact: '08123456789', email: 'supplier1@example.com' },
          { id: '2', name: 'CV Distributor Jaya', code: 'SUP-002', status: 'active', contact: '08234567890', email: 'supplier2@example.com' },
          { id: '3', name: 'PT Grosir Sejahtera', code: 'SUP-003', status: 'active', contact: '08345678901', email: 'supplier3@example.com' },
        ],
        pagination: {},
        isFallback: true
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return {
        suppliers: [
          { id: '1', name: 'PT Supplier Utama', code: 'SUP-001', status: 'active', contact: '08123456789', email: 'supplier1@example.com' },
          { id: '2', name: 'CV Distributor Jaya', code: 'SUP-002', status: 'active', contact: '08234567890', email: 'supplier2@example.com' },
          { id: '3', name: 'PT Grosir Sejahtera', code: 'SUP-003', status: 'active', contact: '08345678901', email: 'supplier3@example.com' },
        ],
        pagination: {},
        isFallback: true
      };
    }
  }

  async searchProducts(filters?: { search?: string; limit?: number; page?: number }) {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          products: data.data.map((p: any) => ({
            id: p.id.toString(),
            sku: p.sku,
            name: p.name,
            price: parseFloat(p.price || p.sell_price || 0),
            stock: parseFloat(p.stock || 0),
            unit: p.unit || 'pcs',
            description: p.description,
            category: p.category?.name || p.category,
            purchasePrice: parseFloat(p.cost || p.buy_price || p.purchase_price || 0)
          })),
          pagination: data.pagination || {},
          isFallback: false
        };
      }
      
      return { products: [], pagination: {}, isFallback: true };
    } catch (error) {
      console.error('Error searching products:', error);
      return { products: [], pagination: {}, isFallback: true };
    }
  }

  async processCompleteGoodsReceipt(receipt: any) {
    try {
      console.log('Processing goods receipt:', receipt);
      
      const response = await fetch('/api/inventory/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseOrderId: receipt.purchaseOrderId,
          invoiceNumber: receipt.invoiceNumber,
          deliveryNote: receipt.receiptNumber,
          receivedBy: receipt.createdBy || 'system',
          notes: receipt.notes,
          items: receipt.items.map((item: any) => ({
            purchaseOrderItemId: item.poItemId || item.id,
            productId: item.productId,
            receivedQuantity: item.quantity,
            acceptedQuantity: item.quantity,
            rejectedQuantity: 0,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            manufacturingDate: null,
            notes: item.notes || ''
          }))
        })
      });

      const result = await response.json();
      
      if (response.ok && result.message) {
        return {
          success: true,
          receiptId: result.goodsReceipt?.grNumber || receipt.receiptNumber,
          invoiceId: receipt.invoiceNumber,
          messages: [
            '✅ Penerimaan barang berhasil disimpan',
            '✅ Stok produk berhasil diperbarui',
            '✅ Stock movements tercatat',
            '✅ Status PO diperbarui'
          ]
        };
      }
      
      throw new Error(result.error || 'Failed to process goods receipt');
    } catch (error: any) {
      console.error('Error processing goods receipt:', error);
      return {
        success: false,
        error: error.message || 'Gagal memproses penerimaan barang',
        messages: [
          '❌ Gagal menyimpan penerimaan barang: ' + (error.message || 'Unknown error')
        ]
      };
    }
  }

  validateReceiptForm() {
    return [];
  }

  validatePurchaseOrder(order: any) {
    const errors: string[] = [];
    
    if (!order) {
      errors.push("Purchase order tidak ditemukan");
      return errors;
    }
    
    if (!order.items || order.items.length === 0) {
      errors.push("Purchase order tidak memiliki item");
    }
    
    if (order.status !== 'approved' && order.status !== 'ordered') {
      errors.push(`Purchase order belum disetujui (status: ${order.status})`);
    }
    
    return errors;
  }
}

export const integratedReceiptService = new IntegratedReceiptService();
