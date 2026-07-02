const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTeamMember = sequelize.define('SfaTeamMember', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    teamId: { type: DataTypes.UUID, allowNull: false, field: 'team_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    role: { type: DataTypes.STRING(30), defaultValue: 'member' },
    position: { type: DataTypes.STRING(100) },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    joinDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'join_date' },
    leaveDate: { type: DataTypes.DATEONLY, field: 'leave_date' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    dailyVisitTarget: { type: DataTypes.INTEGER, defaultValue: 8, field: 'daily_visit_target' },
    monthlyRevenueTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'monthly_revenue_target' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'sfa_team_members', timestamps: true, underscored: true });

  SfaTeamMember.associate = (models) => {
    SfaTeamMember.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
  };

  return SfaTeamMember;
};
