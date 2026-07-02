const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWoOperation = sequelize.define('MfgWoOperation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workOrderId: { type: DataTypes.UUID, allowNull: false, field: 'work_order_id' },
    routingOperationId: { type: DataTypes.UUID, field: 'routing_operation_id' },
    operationNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'operation_number' },
    operationName: { type: DataTypes.STRING(200), allowNull: false, field: 'operation_name' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    operatorId: { type: DataTypes.INTEGER, field: 'operator_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    plannedStart: { type: DataTypes.DATE, field: 'planned_start' },
    plannedEnd: { type: DataTypes.DATE, field: 'planned_end' },
    actualStart: { type: DataTypes.DATE, field: 'actual_start' },
    actualEnd: { type: DataTypes.DATE, field: 'actual_end' },
    setupTime: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'setup_time' },
    runTime: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'run_time' },
    outputQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'output_quantity' },
    rejectQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'reject_quantity' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_wo_operations', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgWoOperation.associate = (models) => {
    MfgWoOperation.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgWoOperation.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
  };

  return MfgWoOperation;
};
