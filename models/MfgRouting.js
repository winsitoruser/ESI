const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgRouting = sequelize.define('MfgRouting', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    routingCode: { type: DataTypes.STRING(50), allowNull: false, field: 'routing_code' },
    routingName: { type: DataTypes.STRING(200), allowNull: false, field: 'routing_name' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    totalTimeMinutes: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'total_time_minutes' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_cost' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'mfg_routings', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgRouting.associate = (models) => {
    MfgRouting.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgRouting.hasMany(models.MfgRoutingOperation, { foreignKey: 'routingId', as: 'operations' });
  };

  return MfgRouting;
};
