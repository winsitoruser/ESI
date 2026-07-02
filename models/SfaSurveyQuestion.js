const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaSurveyQuestion = sequelize.define('SfaSurveyQuestion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    templateId: { type: DataTypes.UUID, allowNull: false, field: 'template_id' },
    questionText: { type: DataTypes.TEXT, allowNull: false, field: 'question_text' },
    questionType: { type: DataTypes.STRING(20), defaultValue: 'text', field: 'question_type' },
    isRequired: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_required' },
    options: { type: DataTypes.JSONB, defaultValue: [] },
    minValue: { type: DataTypes.DECIMAL(10, 2), field: 'min_value' },
    maxValue: { type: DataTypes.DECIMAL(10, 2), field: 'max_value' },
    placeholder: { type: DataTypes.TEXT },
    helpText: { type: DataTypes.TEXT, field: 'help_text' },
    validationRule: { type: DataTypes.TEXT, field: 'validation_rule' },
    conditionalOn: { type: DataTypes.UUID, field: 'conditional_on' },
    conditionalValue: { type: DataTypes.TEXT, field: 'conditional_value' },
    section: { type: DataTypes.STRING(100) },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_survey_questions', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaSurveyQuestion.associate = (models) => {
    SfaSurveyQuestion.belongsTo(models.SfaSurveyTemplate, { foreignKey: 'template_id', as: 'template' });
  };
  return SfaSurveyQuestion;
};
