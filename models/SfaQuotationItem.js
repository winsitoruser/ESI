const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaQuotationItem = sequelize.define('SfaQuotationItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    quotationId: { type: DataTypes.UUID, allowNull: false, field: 'quotation_id' },
    productId: { type: DataTypes.UUID, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    description: { type: DataTypes.TEXT },
    quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
    unit: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    unitPrice: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'unit_price' },
    discountPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'discount_pct' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, {
    tableName: 'sfa_quotation_items',
    timestamps: true,
    underscored: true
  });

  SfaQuotationItem.associate = (models) => {
    SfaQuotationItem.belongsTo(models.SfaQuotation, { foreignKey: 'quotation_id', as: 'quotation' });
  };

  return SfaQuotationItem;
};
