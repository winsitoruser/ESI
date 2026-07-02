const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTerritory = sequelize.define('SfaTerritory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id', references: { model: 'tenants', key: 'id' } },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    region: { type: DataTypes.STRING(100) },
    city: { type: DataTypes.STRING(100) },
    province: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    parentTerritoryId: { type: DataTypes.UUID, field: 'parent_territory_id' },
    managerId: { type: DataTypes.INTEGER, field: 'manager_id' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
  }, {
    tableName: 'sfa_territories',
    timestamps: true,
    underscored: true
  });

  SfaTerritory.associate = (models) => {
    SfaTerritory.hasMany(models.SfaLead, { foreignKey: 'territory_id', as: 'leads' });
    SfaTerritory.hasMany(models.SfaOpportunity, { foreignKey: 'territory_id', as: 'opportunities' });
    SfaTerritory.hasMany(models.SfaTarget, { foreignKey: 'territory_id', as: 'targets' });
  };

  return SfaTerritory;
};
