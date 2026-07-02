const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgQcResult = sequelize.define('MfgQcResult', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    inspectionId: { type: DataTypes.UUID, allowNull: false, field: 'inspection_id' },
    parameterName: { type: DataTypes.STRING(200), allowNull: false, field: 'parameter_name' },
    parameterType: { type: DataTypes.STRING(20), defaultValue: 'numeric', field: 'parameter_type' },
    expectedValue: { type: DataTypes.STRING(200), field: 'expected_value' },
    actualValue: { type: DataTypes.STRING(200), field: 'actual_value' },
    uom: { type: DataTypes.STRING(20) },
    minValue: { type: DataTypes.DECIMAL(15, 4), field: 'min_value' },
    maxValue: { type: DataTypes.DECIMAL(15, 4), field: 'max_value' },
    result: { type: DataTypes.STRING(20) },
    severity: { type: DataTypes.STRING(20), defaultValue: 'minor' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_qc_results', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgQcResult.associate = (models) => {
    MfgQcResult.belongsTo(models.MfgQcInspection, { foreignKey: 'inspectionId', as: 'inspection' });
  };

  return MfgQcResult;
};
