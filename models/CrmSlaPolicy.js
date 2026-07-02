const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmSlaPolicy = sequelize.define('CrmSlaPolicy', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    firstResponseCritical: { type: DataTypes.INTEGER, defaultValue: 30, field: 'first_response_critical' },
    firstResponseMajor: { type: DataTypes.INTEGER, defaultValue: 120, field: 'first_response_major' },
    firstResponseMinor: { type: DataTypes.INTEGER, defaultValue: 480, field: 'first_response_minor' },
    resolutionCritical: { type: DataTypes.INTEGER, defaultValue: 240, field: 'resolution_critical' },
    resolutionMajor: { type: DataTypes.INTEGER, defaultValue: 1440, field: 'resolution_major' },
    resolutionMinor: { type: DataTypes.INTEGER, defaultValue: 2880, field: 'resolution_minor' },
    escalationRules: { type: DataTypes.JSONB, defaultValue: [], field: 'escalation_rules' },
    businessHours: { type: DataTypes.JSONB, defaultValue: { start: '08:00', end: '17:00', days: [1,2,3,4,5] }, field: 'business_hours' },
    appliesToSegments: { type: DataTypes.JSONB, defaultValue: [], field: 'applies_to_segments' },
    appliesToCategories: { type: DataTypes.JSONB, defaultValue: [], field: 'applies_to_categories' },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_default' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
  }, {
    tableName: 'crm_sla_policies',
    timestamps: true,
    underscored: true
  });

  return CrmSlaPolicy;
};
