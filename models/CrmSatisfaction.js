const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmSatisfaction = sequelize.define('CrmSatisfaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    surveyType: { type: DataTypes.STRING(10), allowNull: false, field: 'survey_type' },
    score: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT },
    triggerEvent: { type: DataTypes.STRING(30), field: 'trigger_event' },
    relatedTicketId: { type: DataTypes.UUID, field: 'related_ticket_id' },
    relatedOrderId: { type: DataTypes.UUID, field: 'related_order_id' },
    channel: { type: DataTypes.STRING(20) },
    responseDate: { type: DataTypes.DATE, field: 'response_date' }
  }, {
    tableName: 'crm_satisfaction',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  CrmSatisfaction.associate = (models) => {
    CrmSatisfaction.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
  };

  return CrmSatisfaction;
};
