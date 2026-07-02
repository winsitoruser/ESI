'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprRfqItem = sequelize.define('EprRfqItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    rfqId: { type: DataTypes.UUID, allowNull: false, field: 'rfq_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    itemName: { type: DataTypes.STRING(300), allowNull: false, field: 'item_name' },
    specification: { type: DataTypes.TEXT },
    quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    uom: { type: DataTypes.STRING(30), defaultValue: 'pcs' },
    estimatedPrice: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'estimated_price' },
    notes: { type: DataTypes.TEXT },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'epr_rfq_items', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprRfqItem.associate = (models) => {
    EprRfqItem.belongsTo(models.EprRfq, { foreignKey: 'rfqId', as: 'rfq' });
  };

  return EprRfqItem;
};
