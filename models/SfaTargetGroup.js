const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTargetGroup = sequelize.define('SfaTargetGroup', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    groupType: { type: DataTypes.STRING(30), defaultValue: 'general', field: 'group_type' },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    year: { type: DataTypes.INTEGER },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    totalTargetValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_target_value' },
    totalAchievedValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_achieved_value' },
    overallAchievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'overall_achievement_pct' },
    targetMetrics: { type: DataTypes.JSONB, defaultValue: {}, field: 'target_metrics' },
    distributionMethod: { type: DataTypes.STRING(30), defaultValue: 'manual', field: 'distribution_method' },
    autoDistributeConfig: { type: DataTypes.JSONB, defaultValue: {}, field: 'auto_distribute_config' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_target_groups', timestamps: true, underscored: true });

  SfaTargetGroup.associate = (models) => {
    SfaTargetGroup.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaTargetGroup.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaTargetGroup.hasMany(models.SfaTargetAssignment, { foreignKey: 'target_group_id', as: 'assignments' });
    SfaTargetGroup.hasMany(models.SfaTargetProduct, { foreignKey: 'target_group_id', as: 'productTargets' });
  };

  return SfaTargetGroup;
};
