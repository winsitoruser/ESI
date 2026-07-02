const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCustomDashboard = sequelize.define('CrmCustomDashboard', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    layout: { type: DataTypes.JSONB, defaultValue: [] },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_default' },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_public' },
    ownerId: { type: DataTypes.INTEGER, field: 'owner_id' }
  }, {
    tableName: 'crm_custom_dashboards',
    timestamps: true,
    underscored: true
  });

  return CrmCustomDashboard;
};
