const Shift = require('../Shift');
const ShiftHandover = require('../ShiftHandover');
const PosTransaction = require('../PosTransaction');
const PosTransactionItem = require('../PosTransactionItem');
const Employee = require('../Employee');
const Customer = require('../Customer');
const Product = require('../Product');

// Shift associations
Shift.belongsTo(Employee, {
  foreignKey: 'openedBy',
  as: 'opener'
});

Shift.belongsTo(Employee, {
  foreignKey: 'closedBy',
  as: 'closer'
});

Shift.hasMany(ShiftHandover, {
  foreignKey: 'shiftId',
  as: 'handovers'
});

Shift.hasMany(PosTransaction, {
  foreignKey: 'shiftId',
  as: 'transactions'
});

// ShiftHandover associations
ShiftHandover.belongsTo(Shift, {
  foreignKey: 'shiftId',
  as: 'shift'
});

ShiftHandover.belongsTo(Employee, {
  foreignKey: 'handoverFrom',
  as: 'handoverFromEmployee'
});

ShiftHandover.belongsTo(Employee, {
  foreignKey: 'handoverTo',
  as: 'handoverToEmployee'
});

// PosTransaction associations
PosTransaction.belongsTo(Shift, {
  foreignKey: 'shiftId',
  as: 'shift'
});

PosTransaction.belongsTo(Employee, {
  foreignKey: 'cashierId',
  as: 'cashier'
});

PosTransaction.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});

PosTransaction.hasMany(PosTransactionItem, {
  foreignKey: 'transactionId',
  as: 'items'
});

// PosTransactionItem associations
PosTransactionItem.belongsTo(PosTransaction, {
  foreignKey: 'transactionId',
  as: 'transaction'
});

PosTransactionItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

module.exports = {
  Shift,
  ShiftHandover,
  PosTransaction,
  PosTransactionItem
};
