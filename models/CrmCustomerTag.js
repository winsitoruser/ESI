const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCustomerTag = sequelize.define('CrmCustomerTag', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(50), allowNull: false },
    color: { type: DataTypes.STRING(10), defaultValue: '#6366f1' },
    category: { type: DataTypes.STRING(50) },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_count' }
  }, {
    tableName: 'crm_customer_tags',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  return CrmCustomerTag;
};
