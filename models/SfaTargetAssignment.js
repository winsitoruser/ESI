const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTargetAssignment = sequelize.define('SfaTargetAssignment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    targetGroupId: { type: DataTypes.UUID, allowNull: false, field: 'target_group_id' },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    assignmentType: { type: DataTypes.STRING(20), defaultValue: 'individual', field: 'assignment_type' },
    revenueTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_target' },
    revenueAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_achieved' },
    revenueAchievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'revenue_achievement_pct' },
    volumeTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'volume_target' },
    volumeAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'volume_achieved' },
    volumeUnit: { type: DataTypes.STRING(20), defaultValue: 'pcs', field: 'volume_unit' },
    volumeAchievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'volume_achievement_pct' },
    visitTarget: { type: DataTypes.INTEGER, defaultValue: 0, field: 'visit_target' },
    visitAchieved: { type: DataTypes.INTEGER, defaultValue: 0, field: 'visit_achieved' },
    visitAchievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'visit_achievement_pct' },
    newCustomerTarget: { type: DataTypes.INTEGER, defaultValue: 0, field: 'new_customer_target' },
    newCustomerAchieved: { type: DataTypes.INTEGER, defaultValue: 0, field: 'new_customer_achieved' },
    effectiveCallTarget: { type: DataTypes.INTEGER, defaultValue: 0, field: 'effective_call_target' },
    effectiveCallAchieved: { type: DataTypes.INTEGER, defaultValue: 0, field: 'effective_call_achieved' },
    collectionTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'collection_target' },
    collectionAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'collection_achieved' },
    weightedAchievement: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'weighted_achievement' },
    weightConfig: { type: DataTypes.JSONB, defaultValue: {}, field: 'weight_config' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_target_assignments', timestamps: true, underscored: true });

  SfaTargetAssignment.associate = (models) => {
    SfaTargetAssignment.belongsTo(models.SfaTargetGroup, { foreignKey: 'target_group_id', as: 'targetGroup' });
    SfaTargetAssignment.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaTargetAssignment.hasMany(models.SfaTargetProduct, { foreignKey: 'target_assignment_id', as: 'productTargets' });
  };

  return SfaTargetAssignment;
};
