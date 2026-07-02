const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgProductionCost = sequelize.define('MfgProductionCost', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workOrderId: { type: DataTypes.UUID, allowNull: false, field: 'work_order_id' },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    costType: { type: DataTypes.STRING(20), allowNull: false, field: 'cost_type' },
    description: { type: DataTypes.TEXT },
    plannedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'planned_amount' },
    actualAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_amount' },
    variance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    referenceType: { type: DataTypes.STRING(50), field: 'reference_type' },
    referenceId: { type: DataTypes.UUID, field: 'reference_id' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_production_costs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgProductionCost.associate = (models) => {
    MfgProductionCost.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
  };

  return MfgProductionCost;
};
