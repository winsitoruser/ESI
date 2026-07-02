'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprSetting = sequelize.define('EprSetting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    settingKey: { type: DataTypes.STRING(100), allowNull: false, field: 'setting_key' },
    settingValue: { type: DataTypes.JSONB, defaultValue: {}, field: 'setting_value' },
    description: { type: DataTypes.STRING(300) }
  }, { tableName: 'epr_settings', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return EprSetting;
};
