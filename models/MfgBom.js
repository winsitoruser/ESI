const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgBom = sequelize.define('MfgBom', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
    bomCode: { type: DataTypes.STRING(50), allowNull: false, field: 'bom_code' },
    bomName: { type: DataTypes.STRING(200), allowNull: false, field: 'bom_name' },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    bomType: { type: DataTypes.STRING(20), defaultValue: 'standard', field: 'bom_type' },
    effectiveDate: { type: DataTypes.DATE, field: 'effective_date' },
    expiryDate: { type: DataTypes.DATE, field: 'expiry_date' },
    baseQuantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 1, field: 'base_quantity' },
    baseUom: { type: DataTypes.STRING(20), defaultValue: 'pcs', field: 'base_uom' },
    yieldPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'yield_percentage' },
    routingId: { type: DataTypes.UUID, field: 'routing_id' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' }
  }, { tableName: 'mfg_bom', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgBom.associate = (models) => {
    MfgBom.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgBom.belongsTo(models.MfgRouting, { foreignKey: 'routingId', as: 'routing' });
    MfgBom.hasMany(models.MfgBomItem, { foreignKey: 'bomId', as: 'items' });
  };

  return MfgBom;
};
