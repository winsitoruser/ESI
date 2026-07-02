const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWoMaterial = sequelize.define('MfgWoMaterial', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workOrderId: { type: DataTypes.UUID, allowNull: false, field: 'work_order_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    bomItemId: { type: DataTypes.UUID, field: 'bom_item_id' },
    plannedQuantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false, field: 'planned_quantity' },
    issuedQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'issued_quantity' },
    consumedQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'consumed_quantity' },
    uom: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    costPerUnit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_unit' },
    warehouseId: { type: DataTypes.INTEGER, field: 'warehouse_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    issuedAt: { type: DataTypes.DATE, field: 'issued_at' }
  }, { tableName: 'mfg_wo_materials', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgWoMaterial.associate = (models) => {
    MfgWoMaterial.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgWoMaterial.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return MfgWoMaterial;
};
