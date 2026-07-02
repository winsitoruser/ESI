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
