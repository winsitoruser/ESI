const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmDocumentTemplate = sequelize.define('CrmDocumentTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    documentType: { type: DataTypes.STRING(30), field: 'document_type' },
    contentHtml: { type: DataTypes.TEXT, field: 'content_html' },
    variables: { type: DataTypes.JSONB, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_count' }
  }, {
    tableName: 'crm_document_templates',
    timestamps: true,
    underscored: true
  });

  return CrmDocumentTemplate;
};
