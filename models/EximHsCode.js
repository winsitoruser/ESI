'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximHsCode = sequelize.define('EximHsCode', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    hsCode: { type: DataTypes.STRING(20), allowNull: false, field: 'hs_code' },
    description: { type: DataTypes.TEXT, allowNull: false },
    descriptionId: { type: DataTypes.TEXT, field: 'description_id' }, // Indonesian description
    chapter: { type: DataTypes.STRING(10) },
    section: { type: DataTypes.STRING(10) },
    dutyRate: { type: DataTypes.DECIMAL(8, 4), defaultValue: 0, field: 'duty_rate' },
    vatRate: { type: DataTypes.DECIMAL(8, 4), defaultValue: 11, field: 'vat_rate' },
    exciseRate: { type: DataTypes.DECIMAL(8, 4), defaultValue: 0, field: 'excise_rate' },
    pphRate: { type: DataTypes.DECIMAL(8, 4), defaultValue: 0, field: 'pph_rate' },
    unit: { type: DataTypes.STRING(20) },
    restrictions: { type: DataTypes.JSONB, defaultValue: [] }, // licenses required, quotas, etc.
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
  }, { tableName: 'exim_hs_codes', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return EximHsCode;
};
