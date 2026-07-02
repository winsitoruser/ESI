const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaSurveyResponse = sequelize.define('SfaSurveyResponse', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    templateId: { type: DataTypes.UUID, field: 'template_id' },
    visitId: { type: DataTypes.UUID, field: 'visit_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    respondentId: { type: DataTypes.INTEGER, field: 'respondent_id' },
    responseDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'response_date' },
    answers: { type: DataTypes.JSONB, defaultValue: {} },
    score: { type: DataTypes.DECIMAL(5, 2) },
    completionPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'completion_pct' },
    durationSeconds: { type: DataTypes.INTEGER, field: 'duration_seconds' },
    status: { type: DataTypes.STRING(20), defaultValue: 'completed' },
    lat: { type: DataTypes.DECIMAL(10, 7) },
    lng: { type: DataTypes.DECIMAL(10, 7) },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'sfa_survey_responses', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaSurveyResponse.associate = (models) => {
    SfaSurveyResponse.belongsTo(models.SfaSurveyTemplate, { foreignKey: 'template_id', as: 'template' });
    SfaSurveyResponse.belongsTo(models.SfaVisit, { foreignKey: 'visit_id', as: 'visit' });
  };
  return SfaSurveyResponse;
};
