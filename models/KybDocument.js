const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KybDocument = sequelize.define('KybDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  kybApplicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'kyb_application_id',
    references: { model: 'kyb_applications', key: 'id' }
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' }
  },
  documentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'document_type'
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'document_name'
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'file_url'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    field: 'file_size'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    field: 'mime_type'
  },
  verificationStatus: {
    type: DataTypes.STRING(30),
    defaultValue: 'pending',
    field: 'verification_status'
  },
  verifiedBy: {
    type: DataTypes.UUID,
    field: 'verified_by'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    field: 'verified_at'
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    field: 'verification_notes'
  }
}, {
  tableName: 'kyb_documents',
  timestamps: true,
  underscored: true
});

KybDocument.associate = function(models) {
  KybDocument.belongsTo(models.KybApplication, {
    foreignKey: 'kyb_application_id',
    as: 'application'
  });
  KybDocument.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });
};

module.exports = KybDocument;
