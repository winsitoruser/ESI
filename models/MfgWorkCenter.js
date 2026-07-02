const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgWorkCenter = sequelize.define('MfgWorkCenter', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: { type: DataTypes.STRING(50), defaultValue: 'production' },
    capacityPerHour: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'capacity_per_hour' },
    operatingCostPerHour: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'operating_cost_per_hour' },
    setupTimeMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'setup_time_minutes' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    location: { type: DataTypes.STRING(200) },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    managerId: { type: DataTypes.INTEGER, field: 'manager_id' },
    shiftCount: { type: DataTypes.INTEGER, defaultValue: 1, field: 'shift_count' },
    efficiencyTarget: { type: DataTypes.DECIMAL(5, 2), defaultValue: 85, field: 'efficiency_target' },
    notes: { type: DataTypes.TEXT }
  }, {
    tableName: 'mfg_work_centers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MfgWorkCenter.associate = (models) => {
    MfgWorkCenter.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    MfgWorkCenter.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    MfgWorkCenter.hasMany(models.MfgMachine, { foreignKey: 'workCenterId', as: 'machines' });
    MfgWorkCenter.hasMany(models.MfgWorkOrder, { foreignKey: 'workCenterId', as: 'workOrders' });
  };

  return MfgWorkCenter;
};
