const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmEmailTemplate = sequelize.define('CrmEmailTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    category: { type: DataTypes.STRING(50) },
    subject: { type: DataTypes.STRING(300) },
    bodyHtml: { type: DataTypes.TEXT, field: 'body_html' },
    bodyText: { type: DataTypes.TEXT, field: 'body_text' },
    variables: { type: DataTypes.JSONB, defaultValue: [] },
    channel: { type: DataTypes.STRING(20), defaultValue: 'email' },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_count' },
    openRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'open_rate' },
    clickRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'click_rate' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_email_templates',
    timestamps: true,
    underscored: true
  });

  return CrmEmailTemplate;
};
