const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgShiftProduction = sequelize.define('MfgShiftProduction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    workOrderId: { type: DataTypes.UUID, field: 'work_order_id' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    machineId: { type: DataTypes.UUID, field: 'machine_id' },
    shiftDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'shift_date' },
    shiftName: { type: DataTypes.STRING(50), allowNull: false, field: 'shift_name' },
    operatorId: { type: DataTypes.INTEGER, field: 'operator_id' },
    startTime: { type: DataTypes.DATE, field: 'start_time' },
    endTime: { type: DataTypes.DATE, field: 'end_time' },
    plannedOutput: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'planned_output' },
    actualOutput: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'actual_output' },
    goodOutput: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'good_output' },
    rejectCount: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'reject_count' },
    downtimeMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'downtime_minutes' },
    downtimeReason: { type: DataTypes.TEXT, field: 'downtime_reason' },
    oeeAvailability: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'oee_availability' },
    oeePerformance: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'oee_performance' },
    oeeQuality: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'oee_quality' },
    oeeOverall: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'oee_overall' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_shift_productions', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgShiftProduction.associate = (models) => {
    MfgShiftProduction.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgShiftProduction.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
    MfgShiftProduction.belongsTo(models.MfgMachine, { foreignKey: 'machineId', as: 'machine' });
  };

  return MfgShiftProduction;
};
