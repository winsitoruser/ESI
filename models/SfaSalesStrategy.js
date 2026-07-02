const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaSalesStrategy = sequelize.define('SfaSalesStrategy', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30) },
    name: { type: DataTypes.STRING(200) },
    description: { type: DataTypes.TEXT },
    strategyType: { type: DataTypes.STRING(30), defaultValue: 'balanced', field: 'strategy_type' }, // revenue_focus, volume_focus, coverage, penetration, retention, balanced
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    period: { type: DataTypes.STRING(10) },
    year: { type: DataTypes.INTEGER },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' }, // draft, active, completed, archived
    totalWeight: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'total_weight' },
    overallTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'overall_target' },
    overallAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'overall_achieved' },
    overallScore: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0, field: 'overall_score' },
    kpiCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'kpi_count' },
    assignedTeams: { type: DataTypes.JSONB, defaultValue: [], field: 'assigned_teams' },
    assignedUsers: { type: DataTypes.JSONB, defaultValue: [], field: 'assigned_users' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_sales_strategies', timestamps: true, underscored: true });

  return SfaSalesStrategy;
};
