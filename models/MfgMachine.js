const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgMachine = sequelize.define('MfgMachine', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    machineCode: { type: DataTypes.STRING(50), allowNull: false, field: 'machine_code' },
    machineName: { type: DataTypes.STRING(200), allowNull: false, field: 'machine_name' },
    type: { type: DataTypes.STRING(50) },
    manufacturer: { type: DataTypes.STRING(100) },
    model: { type: DataTypes.STRING(100) },
    serialNumber: { type: DataTypes.STRING(100), field: 'serial_number' },
    purchaseDate: { type: DataTypes.DATE, field: 'purchase_date' },
    warrantyExpiry: { type: DataTypes.DATE, field: 'warranty_expiry' },
    location: { type: DataTypes.STRING(200) },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'operational' },
    operatingHours: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'operating_hours' },
    maintenanceIntervalHours: { type: DataTypes.INTEGER, defaultValue: 500, field: 'maintenance_interval_hours' },
    lastMaintenanceDate: { type: DataTypes.DATE, field: 'last_maintenance_date' },
    nextMaintenanceDate: { type: DataTypes.DATE, field: 'next_maintenance_date' },
    costPerHour: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_hour' },
    purchaseCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'purchase_cost' },
    depreciationRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'depreciation_rate' },
    powerConsumptionKw: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'power_consumption_kw' },
    specifications: { type: DataTypes.JSONB, defaultValue: {} },
    notes: { type: DataTypes.TEXT },
    imageUrl: { type: DataTypes.TEXT, field: 'image_url' }
  }, { tableName: 'mfg_machines', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgMachine.associate = (models) => {
    MfgMachine.belongsTo(models.MfgWorkCenter, { foreignKey: 'workCenterId', as: 'workCenter' });
    MfgMachine.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    MfgMachine.hasMany(models.MfgMaintenanceRecord, { foreignKey: 'machineId', as: 'maintenanceRecords' });
  };

  return MfgMachine;
};
