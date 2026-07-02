const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWasteRecord = sequelize.define('MfgWasteRecord', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    workOrderId: { type: DataTypes.UUID, field: 'work_order_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    wasteType: { type: DataTypes.STRING(20), allowNull: false, field: 'waste_type' },
    quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    uom: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    reason: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING(50) },
    costImpact: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_impact' },
    disposalMethod: { type: DataTypes.STRING(50), field: 'disposal_method' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    operationId: { type: DataTypes.UUID, field: 'operation_id' },
    recordedBy: { type: DataTypes.INTEGER, field: 'recorded_by' },
    recordedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'recorded_at' }
  }, { tableName: 'mfg_waste_records', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgWasteRecord.associate = (models) => {
    MfgWasteRecord.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgWasteRecord.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgWasteRecord.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
  };

  return MfgWasteRecord;
};
