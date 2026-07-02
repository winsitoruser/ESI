const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgMaintenanceRecord = sequelize.define('MfgMaintenanceRecord', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    machineId: { type: DataTypes.UUID, allowNull: false, field: 'machine_id' },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    maintenanceType: { type: DataTypes.STRING(20), defaultValue: 'preventive', field: 'maintenance_type' },
    maintenanceNumber: { type: DataTypes.STRING(50), field: 'maintenance_number' },
    description: { type: DataTypes.TEXT, allowNull: false },
    scheduledDate: { type: DataTypes.DATE, field: 'scheduled_date' },
    startedAt: { type: DataTypes.DATE, field: 'started_at' },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' },
    status: { type: DataTypes.STRING(20), defaultValue: 'scheduled' },
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    performedBy: { type: DataTypes.INTEGER, field: 'performed_by' },
    cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    partsUsed: { type: DataTypes.JSONB, defaultValue: [], field: 'parts_used' },
    partsCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'parts_cost' },
    laborCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'labor_cost' },
    downtimeHours: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'downtime_hours' },
    rootCause: { type: DataTypes.TEXT, field: 'root_cause' },
    findings: { type: DataTypes.TEXT },
    recommendations: { type: DataTypes.TEXT },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_maintenance_records', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgMaintenanceRecord.associate = (models) => {
    MfgMaintenanceRecord.belongsTo(models.MfgMachine, { foreignKey: 'machineId', as: 'machine' });
  };

  return MfgMaintenanceRecord;
};
