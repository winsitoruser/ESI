const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgProductionPlan = sequelize.define('MfgProductionPlan', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    planCode: { type: DataTypes.STRING(50), allowNull: false, field: 'plan_code' },
    planName: { type: DataTypes.STRING(200), allowNull: false, field: 'plan_name' },
    planType: { type: DataTypes.STRING(20), defaultValue: 'weekly', field: 'plan_type' },
    periodStart: { type: DataTypes.DATE, allowNull: false, field: 'period_start' },
    periodEnd: { type: DataTypes.DATE, allowNull: false, field: 'period_end' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    totalPlannedQty: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'total_planned_qty' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' }
  }, { tableName: 'mfg_production_plans', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgProductionPlan.associate = (models) => {
    MfgProductionPlan.hasMany(models.MfgProductionPlanItem, { foreignKey: 'planId', as: 'items' });
  };

  return MfgProductionPlan;
};
