const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModulePricing = sequelize.define('ModulePricing', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'module_id',
      references: { model: 'modules', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    billingInterval: {
      type: DataTypes.ENUM('monthly', 'yearly', 'one_time'),
      allowNull: false,
      defaultValue: 'monthly',
      field: 'billing_interval'
    },
    perUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'per_user',
      comment: 'If true price charged per user'
    },
    perBranch: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'per_branch'
    },
    includedInPlans: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'included_in_plans',
      comment: 'Array of plan codes where this module is included for free'
    },
    trialDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'trial_days'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    yearlyDiscountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'yearly_discount_percent'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'module_pricing',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['module_id'] },
      { fields: ['is_active'] }
    ]
  });

  ModulePricing.associate = (models) => {
    if (models.Module) {
      ModulePricing.belongsTo(models.Module, { foreignKey: 'moduleId', as: 'module' });
    }
  };

  return ModulePricing;
};
