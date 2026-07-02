'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmDocument = sequelize.define('PjmDocument', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    documentType: { type: DataTypes.STRING(50), field: 'document_type' }, // proposal, contract, report, minutes, specification
    fileUrl: { type: DataTypes.TEXT, field: 'file_url' },
    fileName: { type: DataTypes.STRING(300), field: 'file_name' },
    fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
    mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
    version: { type: DataTypes.STRING(20), defaultValue: '1.0' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    uploadedBy: { type: DataTypes.INTEGER, field: 'uploaded_by' },
    uploadedByName: { type: DataTypes.STRING(100), field: 'uploaded_by_name' }
  }, { tableName: 'pjm_documents', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmDocument.associate = (models) => {
    PjmDocument.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmDocument;
};
