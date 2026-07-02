const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaAchievement = sequelize.define('SfaAchievement', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    targetAssignmentId: { type: DataTypes.UUID, field: 'target_assignment_id' },
    targetGroupId: { type: DataTypes.UUID, field: 'target_group_id' },
    userId: { type: DataTypes.INTEGER, field: 'user_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    totalRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_revenue' },
    totalVolume: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_volume' },
    totalVisits: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_visits' },
    completedVisits: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_visits' },
    effectiveCalls: { type: DataTypes.INTEGER, defaultValue: 0, field: 'effective_calls' },
    newCustomers: { type: DataTypes.INTEGER, defaultValue: 0, field: 'new_customers' },
    totalOrders: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_orders' },
    totalCollections: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_collections' },
    revenuePct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'revenue_pct' },
    volumePct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'volume_pct' },
    visitPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'visit_pct' },
    newCustomerPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'new_customer_pct' },
    effectiveCallPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'effective_call_pct' },
    collectionPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'collection_pct' },
    weightedPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'weighted_pct' },
    rating: { type: DataTypes.STRING(10) },
    rankInTeam: { type: DataTypes.INTEGER, field: 'rank_in_team' },
    rankInCompany: { type: DataTypes.INTEGER, field: 'rank_in_company' },
    calculatedAt: { type: DataTypes.DATE, field: 'calculated_at' },
    locked: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'sfa_achievements', timestamps: true, underscored: true });

  SfaAchievement.associate = (models) => {
    SfaAchievement.belongsTo(models.SfaTargetAssignment, { foreignKey: 'target_assignment_id', as: 'targetAssignment' });
    SfaAchievement.belongsTo(models.SfaTargetGroup, { foreignKey: 'target_group_id', as: 'targetGroup' });
    SfaAchievement.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaAchievement.hasMany(models.SfaAchievementDetail, { foreignKey: 'achievement_id', as: 'details' });
  };

  return SfaAchievement;
};
