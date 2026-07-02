const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgBomItem = sequelize.define('MfgBomItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bomId: { type: DataTypes.UUID, allowNull: false, field: 'bom_id' },
    itemType: { type: DataTypes.STRING(20), defaultValue: 'raw_material', field: 'item_type' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    subBomId: { type: DataTypes.UUID, field: 'sub_bom_id' },
    quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    uom: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    wastePercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'waste_percentage' },
    scrapPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'scrap_percentage' },
    isCritical: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_critical' },
    costPerUnit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_unit' },
    leadTimeDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'lead_time_days' },
    notes: { type: DataTypes.TEXT },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'mfg_bom_items', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgBomItem.associate = (models) => {
    MfgBomItem.belongsTo(models.MfgBom, { foreignKey: 'bomId', as: 'bom' });
    MfgBomItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return MfgBomItem;
};
