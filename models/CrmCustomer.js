const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCustomer = sequelize.define('CrmCustomer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    customerNumber: { type: DataTypes.STRING(30), unique: true, field: 'customer_number' },
    companyName: { type: DataTypes.STRING(300), field: 'company_name' },
    displayName: { type: DataTypes.STRING(300), allowNull: false, field: 'display_name' },
    customerType: { type: DataTypes.STRING(30), defaultValue: 'company', field: 'customer_type' },
    industry: { type: DataTypes.STRING(100) },
    companySize: { type: DataTypes.STRING(30), field: 'company_size' },
    website: { type: DataTypes.STRING(300) },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    province: { type: DataTypes.STRING(100) },
    postalCode: { type: DataTypes.STRING(10), field: 'postal_code' },
    country: { type: DataTypes.STRING(60), defaultValue: 'Indonesia' },
    latitude: { type: DataTypes.DECIMAL(10, 7) },
    longitude: { type: DataTypes.DECIMAL(10, 7) },
    lifecycleStage: { type: DataTypes.STRING(30), defaultValue: 'prospect', field: 'lifecycle_stage' },
    customerStatus: { type: DataTypes.STRING(20), defaultValue: 'active', field: 'customer_status' },
    acquisitionSource: { type: DataTypes.STRING(50), field: 'acquisition_source' },
    acquisitionDate: { type: DataTypes.DATEONLY, field: 'acquisition_date' },
    healthScore: { type: DataTypes.INTEGER, defaultValue: 50, field: 'health_score' },
    engagementScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'engagement_score' },
    ltv: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    segment: { type: DataTypes.STRING(50) },
    tier: { type: DataTypes.STRING(30) },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    customFields: { type: DataTypes.JSONB, defaultValue: {}, field: 'custom_fields' },
    creditLimit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'credit_limit' },
    paymentTerms: { type: DataTypes.STRING(50), field: 'payment_terms' },
    taxId: { type: DataTypes.STRING(30), field: 'tax_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    totalRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_revenue' },
    totalOrders: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_orders' },
    lastOrderDate: { type: DataTypes.DATEONLY, field: 'last_order_date' },
    lastInteractionDate: { type: DataTypes.DATE, field: 'last_interaction_date' },
    avgOrderValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'avg_order_value' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'crm_customers',
    timestamps: true,
    underscored: true
  });

  CrmCustomer.associate = (models) => {
    CrmCustomer.hasMany(models.CrmContact, { foreignKey: 'customer_id', as: 'contacts' });
    CrmCustomer.hasMany(models.CrmInteraction, { foreignKey: 'customer_id', as: 'interactions' });
    CrmCustomer.hasMany(models.CrmCommunication, { foreignKey: 'customer_id', as: 'communications' });
    CrmCustomer.hasMany(models.CrmFollowUp, { foreignKey: 'customer_id', as: 'followUps' });
    CrmCustomer.hasMany(models.CrmTask, { foreignKey: 'customer_id', as: 'tasks' });
    CrmCustomer.hasMany(models.CrmTicket, { foreignKey: 'customer_id', as: 'tickets' });
    CrmCustomer.hasMany(models.CrmDocument, { foreignKey: 'customer_id', as: 'documents' });
    if (models.SfaTerritory) CrmCustomer.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    if (models.SfaTeam) CrmCustomer.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    if (models.SfaLead) CrmCustomer.belongsTo(models.SfaLead, { foreignKey: 'lead_id', as: 'lead' });
  };

  return CrmCustomer;
};
