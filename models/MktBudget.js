const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktBudget = sequelize.define('MktBudget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    totalBudget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_budget' },
    allocated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    remaining: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'mkt_budgets',
    timestamps: true,
    underscored: true
  });

  MktBudget.associate = (models) => {
    MktBudget.hasMany(models.MktBudgetItem, { foreignKey: 'budget_id', as: 'items' });
  };

  return MktBudget;
};
