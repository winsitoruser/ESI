const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktBudgetItem = sequelize.define('MktBudgetItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    budgetId: { type: DataTypes.UUID, allowNull: false, field: 'budget_id' },
    campaignId: { type: DataTypes.UUID, field: 'campaign_id' },
    category: { type: DataTypes.STRING(50) },
    description: { type: DataTypes.TEXT },
    allocatedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'allocated_amount' },
    spentAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'spent_amount' }
  }, {
    tableName: 'mkt_budget_items',
    timestamps: true,
    underscored: true
  });

  MktBudgetItem.associate = (models) => {
    MktBudgetItem.belongsTo(models.MktBudget, { foreignKey: 'budget_id', as: 'budget' });
    MktBudgetItem.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  };

  return MktBudgetItem;
};
