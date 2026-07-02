const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTeam = sequelize.define('SfaTeam', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    teamType: { type: DataTypes.STRING(30), defaultValue: 'field_force', field: 'team_type' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    parentTeamId: { type: DataTypes.UUID, field: 'parent_team_id' },
    leaderId: { type: DataTypes.INTEGER, field: 'leader_id' },
    maxMembers: { type: DataTypes.INTEGER, defaultValue: 20, field: 'max_members' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_teams', timestamps: true, underscored: true });

  SfaTeam.associate = (models) => {
    SfaTeam.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaTeam.hasMany(models.SfaTeamMember, { foreignKey: 'team_id', as: 'members' });
    SfaTeam.belongsTo(SfaTeam, { foreignKey: 'parent_team_id', as: 'parentTeam' });
  };

  return SfaTeam;
};
