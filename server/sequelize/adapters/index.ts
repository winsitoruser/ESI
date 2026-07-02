/**
 * Sequelize Adapters Index
 * Exports all adapters for easy importing
 */

export { default as inventoryAdapter } from './inventory-adapter';
export { default as productAdapter } from './inventory-product-adapter';
export { default as stockAdapter } from './inventory-stock-adapter';
export { default as movementAdapter } from './inventory-movement-adapter';
export { default as expiryAdapter } from './inventory-expiry-adapter';
export { default as categoryAdapter } from './inventory-category-adapter';
export { default as dosageAdapter } from './inventory-dosage-adapter';
export { default as batchAdapter } from './inventory-batch-adapter';
export { default as stocktakeAdapter } from './inventory-stocktake-adapter';
export { default as prescriptionAdapter } from './inventory-prescription-adapter';
export { default as documentAdapter } from './inventory-document-adapter';
export { default as invoiceAdapter } from './pos-invoice-adapter';
export { default as posPrescriptionAdapter } from './pos-prescription-adapter';
export { default as shiftAdapter } from './pos-shift-adapter';
export { default as customersAdapter } from './customers-adapter';
export { InventoryAdjustmentAdapter } from './inventory-adjustment-adapter';
