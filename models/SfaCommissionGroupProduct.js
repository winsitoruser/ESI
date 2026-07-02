const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaCommissionGroupProduct = sequelize.define('SfaCommissionGroupProduct', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    groupId: { type: DataTypes.UUID, field: 'group_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    minQuantity: { type: DataTypes.INTEGER, defaultValue: 1, field: 'min_quantity' },
    weight: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1, field: 'weight' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_commission_group_products', timestamps: true, underscored: true });

  SfaCommissionGroupProduct.associate = (models) => {
    SfaCommissionGroupProduct.belongsTo(models.SfaCommissionGroup, { foreignKey: 'group_id', as: 'group' });
  };

  return SfaCommissionGroupProduct;
};
