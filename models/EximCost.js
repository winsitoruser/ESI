'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximCost = sequelize.define('EximCost', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    shipmentId: { type: DataTypes.UUID, allowNull: false, field: 'shipment_id' },
    costCategory: { type: DataTypes.STRING(50), allowNull: false, field: 'cost_category' }, // freight, insurance, customs_duty, tax, port_charges, trucking, warehousing, documentation, inspection, other
    description: { type: DataTypes.STRING(300) },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    invoiceNumber: { type: DataTypes.STRING(50), field: 'invoice_number' },
    amount: { type: DataTypes.DECIMAL(19, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    exchangeRate: { type: DataTypes.DECIMAL(15, 4), defaultValue: 1, field: 'exchange_rate' },
    amountIdr: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'amount_idr' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending, approved, paid
    paidDate: { type: DataTypes.DATEONLY, field: 'paid_date' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_costs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EximCost.associate = (models) => {
    EximCost.belongsTo(models.EximShipment, { foreignKey: 'shipmentId', as: 'shipment' });
  };

  return EximCost;
};
