const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaSurveyTemplate = sequelize.define('SfaSurveyTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    surveyType: { type: DataTypes.STRING(30), defaultValue: 'general', field: 'survey_type' },
    targetAudience: { type: DataTypes.STRING(30), defaultValue: 'customer', field: 'target_audience' },
    isRequired: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_required' },
    triggerEvent: { type: DataTypes.STRING(30), field: 'trigger_event' },
    questionCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'question_count' },
    estimatedMinutes: { type: DataTypes.INTEGER, defaultValue: 5, field: 'estimated_minutes' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    validFrom: { type: DataTypes.DATEONLY, field: 'valid_from' },
    validTo: { type: DataTypes.DATEONLY, field: 'valid_to' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_survey_templates', timestamps: true, underscored: true });

  SfaSurveyTemplate.associate = (models) => {
    SfaSurveyTemplate.hasMany(models.SfaSurveyQuestion, { foreignKey: 'template_id', as: 'questions' });
    SfaSurveyTemplate.hasMany(models.SfaSurveyResponse, { foreignKey: 'template_id', as: 'responses' });
  };
  return SfaSurveyTemplate;
};
