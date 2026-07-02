const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgRoutingOperation = sequelize.define('MfgRoutingOperation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    routingId: { type: DataTypes.UUID, allowNull: false, field: 'routing_id' },
    operationNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'operation_number' },
    operationName: { type: DataTypes.STRING(200), allowNull: false, field: 'operation_name' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    setupTimeMinutes: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'setup_time_minutes' },
    runTimePerUnit: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0, field: 'run_time_per_unit' },
    description: { type: DataTypes.TEXT },
    qualityCheckRequired: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'quality_check_required' },
    toolsRequired: { type: DataTypes.JSONB, defaultValue: [], field: 'tools_required' },
    skillRequired: { type: DataTypes.STRING(100), field: 'skill_required' },
    costPerUnit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_unit' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'mfg_routing_operations', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgRoutingOperation.associate = (models) => {
    MfgRoutingOperation.belongsTo(models.MfgRouting, { foreignKey: 'routingId', as: 'routing' });
    MfgRoutingOperation.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
  };

  return MfgRoutingOperation;
};
