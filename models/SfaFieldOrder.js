const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaFieldOrder = sequelize.define('SfaFieldOrder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    orderNumber: { type: DataTypes.STRING(30), allowNull: false, field: 'order_number' },
    visitId: { type: DataTypes.UUID, field: 'visit_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), allowNull: false, field: 'customer_name' },
    customerAddress: { type: DataTypes.TEXT, field: 'customer_address' },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    orderDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'order_date' },
    deliveryDate: { type: DataTypes.DATEONLY, field: 'delivery_date' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    paymentMethod: { type: DataTypes.STRING(30), defaultValue: 'credit', field: 'payment_method' },
    paymentTerms: { type: DataTypes.INTEGER, defaultValue: 30, field: 'payment_terms' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    discountType: { type: DataTypes.STRING(20), defaultValue: 'amount', field: 'discount_type' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_value' },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_amount' },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'tax_amount' },
    total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
    signatureUrl: { type: DataTypes.TEXT, field: 'signature_url' },
    photoUrl: { type: DataTypes.TEXT, field: 'photo_url' },
    lat: { type: DataTypes.DECIMAL(10, 7) },
    lng: { type: DataTypes.DECIMAL(10, 7) },
    syncedToSo: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'synced_to_so' },
    soReference: { type: DataTypes.STRING(30), field: 'so_reference' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    rejectedReason: { type: DataTypes.TEXT, field: 'rejected_reason' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_field_orders', timestamps: true, underscored: true });

  SfaFieldOrder.associate = (models) => {
    SfaFieldOrder.belongsTo(models.SfaVisit, { foreignKey: 'visit_id', as: 'visit' });
    SfaFieldOrder.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaFieldOrder.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaFieldOrder.hasMany(models.SfaFieldOrderItem, { foreignKey: 'field_order_id', as: 'items' });
  };
  return SfaFieldOrder;
};
