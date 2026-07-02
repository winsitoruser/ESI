const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWorkOrder = sequelize.define('MfgWorkOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    woNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'wo_number' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    bomId: { type: DataTypes.UUID, field: 'bom_id' },
    routingId: { type: DataTypes.UUID, field: 'routing_id' },
    plannedQuantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false, field: 'planned_quantity' },
    actualQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'actual_quantity' },
    rejectedQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'rejected_quantity' },
    uom: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    plannedStart: { type: DataTypes.DATE, field: 'planned_start' },
    plannedEnd: { type: DataTypes.DATE, field: 'planned_end' },
    actualStart: { type: DataTypes.DATE, field: 'actual_start' },
    actualEnd: { type: DataTypes.DATE, field: 'actual_end' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    parentWoId: { type: DataTypes.UUID, field: 'parent_wo_id' },
    sourceType: { type: DataTypes.STRING(20), defaultValue: 'manual', field: 'source_type' },
    sourceId: { type: DataTypes.UUID, field: 'source_id' },
    batchNumber: { type: DataTypes.STRING(100), field: 'batch_number' },
    lotNumber: { type: DataTypes.STRING(100), field: 'lot_number' },
    estimatedCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'estimated_cost' },
    actualCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_cost' },
    yieldPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'yield_percentage' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    completedBy: { type: DataTypes.INTEGER, field: 'completed_by' },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' }
  }, { tableName: 'mfg_work_orders', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgWorkOrder.associate = (models) => {
    MfgWorkOrder.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgWorkOrder.belongsTo(models.MfgBom, { foreignKey: 'bomId', as: 'bom' });
    MfgWorkOrder.belongsTo(models.MfgRouting, { foreignKey: 'routingId', as: 'routing' });
    MfgWorkOrder.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
    MfgWorkOrder.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    MfgWorkOrder.hasMany(models.MfgWoMaterial, { foreignKey: 'workOrderId', as: 'materials' });
    MfgWorkOrder.hasMany(models.MfgWoOperation, { foreignKey: 'workOrderId', as: 'operations' });
    MfgWorkOrder.hasMany(models.MfgWoOutput, { foreignKey: 'workOrderId', as: 'outputs' });
  };

  return MfgWorkOrder;
};
