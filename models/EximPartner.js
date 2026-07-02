'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximPartner = sequelize.define('EximPartner', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    partnerCode: { type: DataTypes.STRING(50), allowNull: false, field: 'partner_code' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    partnerType: { type: DataTypes.STRING(50), allowNull: false, field: 'partner_type' }, // buyer, seller, forwarder, shipping_line, customs_broker, insurance, bank
    status: { type: DataTypes.STRING(30), defaultValue: 'active' },
    country: { type: DataTypes.STRING(100) },
    city: { type: DataTypes.STRING(100) },
    address: { type: DataTypes.TEXT },
    phone: { type: DataTypes.STRING(30) },
    email: { type: DataTypes.STRING(200) },
    contactPerson: { type: DataTypes.STRING(200), field: 'contact_person' },
    taxId: { type: DataTypes.STRING(50), field: 'tax_id' },
    bankDetails: { type: DataTypes.JSONB, defaultValue: {}, field: 'bank_details' },
    certifications: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_partners', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return EximPartner;
};
