const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmSavedReport = sequelize.define('CrmSavedReport', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    reportType: { type: DataTypes.STRING(30), field: 'report_type' },
    description: { type: DataTypes.TEXT },
    config: { type: DataTypes.JSONB, defaultValue: {} },
    schedule: { type: DataTypes.JSONB },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_public' },
    isFavorite: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_favorite' },
    lastRunAt: { type: DataTypes.DATE, field: 'last_run_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_saved_reports',
    timestamps: true,
    underscored: true
  });

  return CrmSavedReport;
};
