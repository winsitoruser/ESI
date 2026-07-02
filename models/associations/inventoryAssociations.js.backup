const Stock = require('../Stock');
const StockMovement = require('../StockMovement');
const PurchaseOrder = require('../PurchaseOrder');
const PurchaseOrderItem = require('../PurchaseOrderItem');
const GoodsReceipt = require('../GoodsReceipt');
const GoodsReceiptItem = require('../GoodsReceiptItem');
const SalesOrder = require('../SalesOrder');
const SalesOrderItem = require('../SalesOrderItem');
const StockAdjustment = require('../StockAdjustment');
const StockAdjustmentItem = require('../StockAdjustmentItem');
const Product = require('../Product');
const Customer = require('../Customer');
const Employee = require('../Employee');

// Stock associations
Stock.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Product.hasMany(Stock, {
  foreignKey: 'productId',
  as: 'stocks'
});

// StockMovement associations
StockMovement.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

StockMovement.belongsTo(Employee, {
  foreignKey: 'performedBy',
  as: 'performer',
  required: false
});

StockMovement.belongsTo(Employee, {
  foreignKey: 'approvedBy',
  as: 'approver',
  required: false
});

Product.hasMany(StockMovement, {
  foreignKey: 'productId',
  as: 'stockMovements'
});

// PurchaseOrder associations
PurchaseOrder.hasMany(PurchaseOrderItem, {
  foreignKey: 'purchaseOrderId',
  as: 'items'
});

PurchaseOrder.belongsTo(Employee, {
  foreignKey: 'createdBy',
  as: 'creator',
  required: false
});

PurchaseOrder.belongsTo(Employee, {
  foreignKey: 'approvedBy',
  as: 'approver',
  required: false
});

PurchaseOrder.hasMany(GoodsReceipt, {
  foreignKey: 'purchaseOrderId',
  as: 'receipts'
});

// PurchaseOrderItem associations
PurchaseOrderItem.belongsTo(PurchaseOrder, {
  foreignKey: 'purchaseOrderId',
  as: 'purchaseOrder'
});

PurchaseOrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Product.hasMany(PurchaseOrderItem, {
  foreignKey: 'productId',
  as: 'purchaseOrderItems'
});

PurchaseOrderItem.hasMany(GoodsReceiptItem, {
  foreignKey: 'purchaseOrderItemId',
  as: 'receiptItems'
});

// GoodsReceipt associations
GoodsReceipt.belongsTo(PurchaseOrder, {
  foreignKey: 'purchaseOrderId',
  as: 'purchaseOrder'
});

GoodsReceipt.belongsTo(Employee, {
  foreignKey: 'receivedBy',
  as: 'receiver'
});

GoodsReceipt.hasMany(GoodsReceiptItem, {
  foreignKey: 'goodsReceiptId',
  as: 'items'
});

// GoodsReceiptItem associations
GoodsReceiptItem.belongsTo(GoodsReceipt, {
  foreignKey: 'goodsReceiptId',
  as: 'goodsReceipt'
});

GoodsReceiptItem.belongsTo(PurchaseOrderItem, {
  foreignKey: 'purchaseOrderItemId',
  as: 'purchaseOrderItem'
});

GoodsReceiptItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

// SalesOrder associations
SalesOrder.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});

SalesOrder.hasMany(SalesOrderItem, {
  foreignKey: 'salesOrderId',
  as: 'items'
});

SalesOrder.belongsTo(Employee, {
  foreignKey: 'createdBy',
  as: 'creator',
  required: false
});

SalesOrder.belongsTo(Employee, {
  foreignKey: 'approvedBy',
  as: 'approver',
  required: false
});

Customer.hasMany(SalesOrder, {
  foreignKey: 'customerId',
  as: 'salesOrders'
});

// SalesOrderItem associations
SalesOrderItem.belongsTo(SalesOrder, {
  foreignKey: 'salesOrderId',
  as: 'salesOrder'
});

SalesOrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Product.hasMany(SalesOrderItem, {
  foreignKey: 'productId',
  as: 'salesOrderItems'
});

// StockAdjustment associations
StockAdjustment.hasMany(StockAdjustmentItem, {
  foreignKey: 'stockAdjustmentId',
  as: 'items'
});

StockAdjustment.belongsTo(Employee, {
  foreignKey: 'createdBy',
  as: 'creator'
});

StockAdjustment.belongsTo(Employee, {
  foreignKey: 'approvedBy',
  as: 'approver',
  required: false
});

// StockAdjustmentItem associations
StockAdjustmentItem.belongsTo(StockAdjustment, {
  foreignKey: 'stockAdjustmentId',
  as: 'stockAdjustment'
});

StockAdjustmentItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Product.hasMany(StockAdjustmentItem, {
  foreignKey: 'productId',
  as: 'adjustmentItems'
});

module.exports = {
  Stock,
  StockMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  SalesOrder,
  SalesOrderItem,
  StockAdjustment,
  StockAdjustmentItem
};
