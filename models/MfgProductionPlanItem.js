const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgProductionPlanItem = sequelize.define('MfgProductionPlanItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    planId: { type: DataTypes.UUID, allowNull: false, field: 'plan_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    bomId: { type: DataTypes.UUID, field: 'bom_id' },
    plannedQuantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false, field: 'planned_quantity' },
    scheduledDate: { type: DataTypes.DATE, field: 'scheduled_date' },
    workCenterId: { type: DataTypes.UUID, field: 'work_center_id' },
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    workOrderId: { type: DataTypes.UUID, field: 'work_order_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_production_plan_items', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgProductionPlanItem.associate = (models) => {
    MfgProductionPlanItem.belongsTo(models.MfgProductionPlan, { foreignKey: 'planId', as: 'plan' });
    MfgProductionPlanItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgProductionPlanItem.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
  };

  return MfgProductionPlanItem;
};
