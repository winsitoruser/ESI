'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximCustoms = sequelize.define('EximCustoms', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    shipmentId: { type: DataTypes.UUID, allowNull: false, field: 'shipment_id' },
    declarationType: { type: DataTypes.STRING(30), field: 'declaration_type' }, // PIB (import), PEB (export)
    declarationNumber: { type: DataTypes.STRING(50), field: 'declaration_number' },
    declarationDate: { type: DataTypes.DATEONLY, field: 'declaration_date' },
    customsOffice: { type: DataTypes.STRING(200), field: 'customs_office' },
    status: { type: DataTypes.STRING(30), defaultValue: 'pending' }, // pending, submitted, inspecting, red_lane, green_lane, yellow_lane, cleared, rejected
    hsItems: { type: DataTypes.JSONB, defaultValue: [], field: 'hs_items' }, // [{hsCode, description, quantity, value, duty, tax}]
    totalDuty: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_duty' },
    totalTax: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_tax' },
    totalExcise: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_excise' },
    totalCharges: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_charges' },
    inspectionResult: { type: DataTypes.TEXT, field: 'inspection_result' },
    clearanceDate: { type: DataTypes.DATE, field: 'clearance_date' },
    releaseDate: { type: DataTypes.DATE, field: 'release_date' },
    ppjkName: { type: DataTypes.STRING(200), field: 'ppjk_name' }, // Customs broker
    ppjkLicense: { type: DataTypes.STRING(50), field: 'ppjk_license' },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_customs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EximCustoms.associate = (models) => {
    EximCustoms.belongsTo(models.EximShipment, { foreignKey: 'shipmentId', as: 'shipment' });
  };

  return EximCustoms;
};
