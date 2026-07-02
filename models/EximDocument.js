'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximDocument = sequelize.define('EximDocument', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    shipmentId: { type: DataTypes.UUID, allowNull: false, field: 'shipment_id' },
    documentType: { type: DataTypes.STRING(50), allowNull: false, field: 'document_type' }, // bill_of_lading, airway_bill, commercial_invoice, packing_list, certificate_of_origin, insurance, phytosanitary, fumigation, inspection, customs_declaration, letter_of_credit
    documentNumber: { type: DataTypes.STRING(100), field: 'document_number' },
    title: { type: DataTypes.STRING(300) },
    issuer: { type: DataTypes.STRING(200) },
    issueDate: { type: DataTypes.DATEONLY, field: 'issue_date' },
    expiryDate: { type: DataTypes.DATEONLY, field: 'expiry_date' },
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, issued, submitted, verified, rejected, expired
    fileUrl: { type: DataTypes.TEXT, field: 'file_url' },
    fileName: { type: DataTypes.STRING(300), field: 'file_name' },
    fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
    notes: { type: DataTypes.TEXT },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_documents', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EximDocument.associate = (models) => {
    EximDocument.belongsTo(models.EximShipment, { foreignKey: 'shipmentId', as: 'shipment' });
  };

  return EximDocument;
};
