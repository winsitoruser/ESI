const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaCoveragePlan = sequelize.define('SfaCoveragePlan', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    customerClass: { type: DataTypes.STRING(30), defaultValue: 'general', field: 'customer_class' },
    visitFrequency: { type: DataTypes.STRING(20), defaultValue: 'weekly', field: 'visit_frequency' },
    visitsPerPeriod: { type: DataTypes.INTEGER, defaultValue: 4, field: 'visits_per_period' },
    minVisitDuration: { type: DataTypes.INTEGER, defaultValue: 15, field: 'min_visit_duration' },
    requiredActivities: { type: DataTypes.JSONB, defaultValue: ['order_taking'], field: 'required_activities' },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_coverage_plans', timestamps: true, underscored: true });

  SfaCoveragePlan.associate = (models) => {
    SfaCoveragePlan.hasMany(models.SfaCoverageAssignment, { foreignKey: 'coverage_plan_id', as: 'assignments' });
  };
  return SfaCoveragePlan;
};
