const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaRoutePlan = sequelize.define('SfaRoutePlan', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    dayOfWeek: { type: DataTypes.INTEGER, field: 'day_of_week' },
    stops: { type: DataTypes.JSONB, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
  }, {
    tableName: 'sfa_route_plans',
    timestamps: true,
    underscored: true
  });

  SfaRoutePlan.associate = (models) => {
    SfaRoutePlan.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
  };

  return SfaRoutePlan;
};
