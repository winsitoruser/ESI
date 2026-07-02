const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmContact = sequelize.define('CrmContact', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
    lastName: { type: DataTypes.STRING(100), field: 'last_name' },
    title: { type: DataTypes.STRING(100) },
    department: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(200) },
    phone: { type: DataTypes.STRING(30) },
    mobile: { type: DataTypes.STRING(30) },
    whatsapp: { type: DataTypes.STRING(30) },
    isPrimary: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_primary' },
    isDecisionMaker: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_decision_maker' },
    roleInDeal: { type: DataTypes.STRING(50), field: 'role_in_deal' },
    communicationPreference: { type: DataTypes.STRING(30), defaultValue: 'email', field: 'communication_preference' },
    birthday: { type: DataTypes.DATEONLY },
    socialLinkedin: { type: DataTypes.STRING(200), field: 'social_linkedin' },
    notes: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
  }, {
    tableName: 'crm_contacts',
    timestamps: true,
    underscored: true
  });

  CrmContact.associate = (models) => {
    CrmContact.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
  };

  return CrmContact;
};
