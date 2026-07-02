const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaPlafonUsage = sequelize.define('SfaPlafonUsage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plafonId: { type: DataTypes.UUID, allowNull: false, field: 'plafon_id' },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    transactionType: { type: DataTypes.STRING(20), allowNull: false, field: 'transaction_type' },
    referenceId: { type: DataTypes.UUID, field: 'reference_id' },
    referenceNumber: { type: DataTypes.STRING(50), field: 'reference_number' },
    amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    runningBalance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'running_balance' },
    description: { type: DataTypes.TEXT },
    transactionDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'transaction_date' },
    dueDate: { type: DataTypes.DATEONLY, field: 'due_date' },
    isOverdue: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_overdue' },
    paidAt: { type: DataTypes.DATE, field: 'paid_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'sfa_plafon_usage', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaPlafonUsage.associate = (models) => {
    SfaPlafonUsage.belongsTo(models.SfaPlafon, { foreignKey: 'plafon_id', as: 'plafon' });
  };

  return SfaPlafonUsage;
};
