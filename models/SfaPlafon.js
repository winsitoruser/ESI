const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaPlafon = sequelize.define('SfaPlafon', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    plafonType: { type: DataTypes.STRING(30), defaultValue: 'customer', field: 'plafon_type' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    userId: { type: DataTypes.INTEGER, field: 'user_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    creditLimit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'credit_limit' },
    usedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'used_amount' },
    availableAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'available_amount' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    paymentTerms: { type: DataTypes.INTEGER, defaultValue: 30, field: 'payment_terms' },
    maxOverdueDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'max_overdue_days' },
    maxOutstandingInvoices: { type: DataTypes.INTEGER, defaultValue: 0, field: 'max_outstanding_invoices' },
    riskLevel: { type: DataTypes.STRING(20), defaultValue: 'low', field: 'risk_level' },
    riskScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'risk_score' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    effectiveFrom: { type: DataTypes.DATEONLY, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
    lastReviewedAt: { type: DataTypes.DATE, field: 'last_reviewed_at' },
    reviewedBy: { type: DataTypes.INTEGER, field: 'reviewed_by' },
    autoAdjust: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_adjust' },
    autoAdjustConfig: { type: DataTypes.JSONB, defaultValue: {}, field: 'auto_adjust_config' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_plafon', timestamps: true, underscored: true });

  SfaPlafon.associate = (models) => {
    SfaPlafon.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaPlafon.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaPlafon.hasMany(models.SfaPlafonUsage, { foreignKey: 'plafon_id', as: 'usages' });
  };

  return SfaPlafon;
};
