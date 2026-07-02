const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTarget = sequelize.define('SfaTarget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    targetType: { type: DataTypes.STRING(30), allowNull: false, field: 'target_type' },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    targetValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'target_value' },
    actualValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_value' },
    achievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'achievement_pct' },
    unit: { type: DataTypes.STRING(20), defaultValue: 'IDR' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    productCategory: { type: DataTypes.STRING(100), field: 'product_category' },
    customerSegment: { type: DataTypes.STRING(100), field: 'customer_segment' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'sfa_targets',
    timestamps: true,
    underscored: true
  });

  SfaTarget.associate = (models) => {
    SfaTarget.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
  };

  return SfaTarget;
};
