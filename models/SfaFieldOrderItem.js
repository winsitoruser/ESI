const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaFieldOrderItem = sequelize.define('SfaFieldOrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fieldOrderId: { type: DataTypes.UUID, allowNull: false, field: 'field_order_id' },
    productId: { type: DataTypes.UUID, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), allowNull: false, field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    categoryName: { type: DataTypes.STRING(100), field: 'category_name' },
    quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
    unit: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    unitPrice: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'unit_price' },
    discountPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'discount_pct' },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_amount' },
    taxPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'tax_pct' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'commission_rate' },
    commissionAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'commission_amount' },
    notes: { type: DataTypes.TEXT },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_field_order_items', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaFieldOrderItem.associate = (models) => {
    SfaFieldOrderItem.belongsTo(models.SfaFieldOrder, { foreignKey: 'field_order_id', as: 'order' });
  };
  return SfaFieldOrderItem;
};
