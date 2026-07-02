const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmDocument = sequelize.define('CrmDocument', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    documentNumber: { type: DataTypes.STRING(30), field: 'document_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    documentType: { type: DataTypes.STRING(30), field: 'document_type' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    fileUrl: { type: DataTypes.STRING(500), field: 'file_url' },
    fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
    fileType: { type: DataTypes.STRING(20), field: 'file_type' },
    contentHtml: { type: DataTypes.TEXT, field: 'content_html' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    templateId: { type: DataTypes.UUID, field: 'template_id' },
    sentAt: { type: DataTypes.DATE, field: 'sent_at' },
    viewedAt: { type: DataTypes.DATE, field: 'viewed_at' },
    signedAt: { type: DataTypes.DATE, field: 'signed_at' },
    expiresAt: { type: DataTypes.DATE, field: 'expires_at' },
    viewCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'view_count' },
    totalValue: { type: DataTypes.DECIMAL(15, 2), field: 'total_value' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_documents',
    timestamps: true,
    underscored: true
  });

  CrmDocument.associate = (models) => {
    CrmDocument.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
  };

  return CrmDocument;
};
