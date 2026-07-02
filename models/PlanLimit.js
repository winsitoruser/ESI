const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlanLimit = sequelize.define('PlanLimit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'plan_id',
      references: { model: 'plans', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    metricName: {
      // users | branches | products | transactions | storage_gb | api_calls | ...
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'metric_name'
    },
    maxValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'max_value'
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    isSoftLimit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_soft_limit'
    },
    overageRate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      field: 'overage_rate'
    }
  }, {
    tableName: 'plan_limits',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['plan_id'] },
      { fields: ['metric_name'] },
      { unique: true, fields: ['plan_id', 'metric_name'] }
    ]
  });

  PlanLimit.associate = (models) => {
    if (models.Plan) {
      PlanLimit.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
    }
  };

  return PlanLimit;
};
