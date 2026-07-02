const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgSetting = sequelize.define('MfgSetting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    settingKey: { type: DataTypes.STRING(100), allowNull: false, field: 'setting_key' },
    settingValue: { type: DataTypes.JSONB, defaultValue: {}, field: 'setting_value' },
    description: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_settings', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return MfgSetting;
};
