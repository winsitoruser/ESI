'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprEvaluation = sequelize.define('EprEvaluation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    evaluationPeriod: { type: DataTypes.STRING(20), field: 'evaluation_period' }, // Q1-2025, H1-2025, 2025
    qualityScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'quality_score' },
    deliveryScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'delivery_score' },
    priceScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'price_score' },
    serviceScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'service_score' },
    complianceScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'compliance_score' },
    overallScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'overall_score' },
    grade: { type: DataTypes.STRING(5) }, // A, B, C, D, F
    strengths: { type: DataTypes.TEXT },
    weaknesses: { type: DataTypes.TEXT },
    recommendations: { type: DataTypes.TEXT },
    actionItems: { type: DataTypes.JSONB, defaultValue: [], field: 'action_items' },
    evaluatedBy: { type: DataTypes.INTEGER, field: 'evaluated_by' },
    evaluatedByName: { type: DataTypes.STRING(100), field: 'evaluated_by_name' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'epr_evaluations', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprEvaluation.associate = (models) => {
    EprEvaluation.belongsTo(models.EprVendor, { foreignKey: 'vendorId', as: 'vendor' });
  };

  return EprEvaluation;
};
