/**
 * General Inventory Adapter
 * Aggregates all inventory-related adapters
 */

import productAdapter from './inventory-product-adapter';
import stockAdapter from './inventory-stock-adapter';
import movementAdapter from './inventory-movement-adapter';
import expiryAdapter from './inventory-expiry-adapter';
import categoryAdapter from './inventory-category-adapter';
import batchAdapter from './inventory-batch-adapter';

export default {
  ...productAdapter,
  ...stockAdapter,
  ...movementAdapter,
  ...expiryAdapter,
  ...categoryAdapter,
  ...batchAdapter
};

export {
  productAdapter,
  stockAdapter,
  movementAdapter,
  expiryAdapter,
  categoryAdapter,
  batchAdapter
};

// Standalone named exports for direct import by API endpoints
export async function getProducts(tenantId: string, limit: number, offset: number, filters?: any) {
  const adapter = { ...productAdapter, ...stockAdapter };
  return adapter.getProducts ? adapter.getProducts(filters) : [];
}

export async function getInventoryStatistics(tenantId: string) {
  return {
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    outOfStock: 0
  };
}

export async function getInventoryBatches(tenantId: string, limit: number, offset: number, filters?: any) {
  if (batchAdapter.getBatches) {
    return batchAdapter.getBatches(filters);
  }
  return [];
}

export async function getStockOpnameList(tenantId: string, limit: number, offset: number, filters?: any) {
  return [];
}
