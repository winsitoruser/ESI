const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWoOutput = sequelize.define('MfgWoOutput', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workOrderId: { type: DataTypes.UUID, allowNull: false, field: 'work_order_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    qualityStatus: { type: DataTypes.STRING(20), defaultValue: 'pending', field: 'quality_status' },
    warehouseId: { type: DataTypes.INTEGER, field: 'warehouse_id' },
    batchNumber: { type: DataTypes.STRING(100), field: 'batch_number' },
    lotNumber: { type: DataTypes.STRING(100), field: 'lot_number' },
    expiryDate: { type: DataTypes.DATE, field: 'expiry_date' },
    receivedAt: { type: DataTypes.DATE, field: 'received_at' }
  }, { tableName: 'mfg_wo_outputs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgWoOutput.associate = (models) => {
    MfgWoOutput.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgWoOutput.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return MfgWoOutput;
};
