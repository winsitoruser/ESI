const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgQcTemplate = sequelize.define('MfgQcTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    templateCode: { type: DataTypes.STRING(50), allowNull: false, field: 'template_code' },
    templateName: { type: DataTypes.STRING(200), allowNull: false, field: 'template_name' },
    inspectionType: { type: DataTypes.STRING(20), defaultValue: 'in_process', field: 'inspection_type' },
    productCategory: { type: DataTypes.STRING(100), field: 'product_category' },
    parameters: { type: DataTypes.JSONB, defaultValue: [] },
    samplingMethod: { type: DataTypes.STRING(50), defaultValue: 'random', field: 'sampling_method' },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' }
  }, { tableName: 'mfg_qc_templates', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgQcTemplate.associate = (models) => {
    MfgQcTemplate.hasMany(models.MfgQcInspection, { foreignKey: 'templateId', as: 'inspections' });
  };

  return MfgQcTemplate;
};
