const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaParameter = sequelize.define('SfaParameter', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    category: { type: DataTypes.STRING(50), allowNull: false },
    paramKey: { type: DataTypes.STRING(100), allowNull: false, field: 'param_key' },
    paramValue: { type: DataTypes.TEXT, field: 'param_value' },
    valueType: { type: DataTypes.STRING(20), defaultValue: 'string', field: 'value_type' },
    label: { type: DataTypes.STRING(200) },
    description: { type: DataTypes.TEXT },
    isEditable: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_editable' },
    displayOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'display_order' },
    options: { type: DataTypes.JSONB, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_parameters', timestamps: true, underscored: true });

  return SfaParameter;
};
