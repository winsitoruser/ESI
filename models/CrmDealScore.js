const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmDealScore = sequelize.define('CrmDealScore', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    engagementScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'engagement_score' },
    fitScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'fit_score' },
    behaviorScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'behavior_score' },
    timingScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'timing_score' },
    overallScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'overall_score' },
    positiveSignals: { type: DataTypes.JSONB, defaultValue: [], field: 'positive_signals' },
    negativeSignals: { type: DataTypes.JSONB, defaultValue: [], field: 'negative_signals' },
    recommendations: { type: DataTypes.JSONB, defaultValue: [] },
    winProbability: { type: DataTypes.DECIMAL(5, 2), field: 'win_probability' },
    riskLevel: { type: DataTypes.STRING(10), field: 'risk_level' },
    riskFactors: { type: DataTypes.JSONB, defaultValue: [], field: 'risk_factors' },
    scoreDate: { type: DataTypes.DATE, field: 'score_date' }
  }, {
    tableName: 'crm_deal_scores',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  return CrmDealScore;
};
