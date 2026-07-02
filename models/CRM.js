const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  companyName: { type: DataTypes.STRING(200), field: 'company_name', allowNull: false },
  partnerType: { type: DataTypes.ENUM('vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'), field: 'partner_type', allowNull: false },
  picName: { type: DataTypes.STRING(100), field: 'pic_name' },
  picPhone: { type: DataTypes.STRING(20), field: 'pic_phone' },
  email: { type: DataTypes.STRING(100) },
  phone: { type: DataTypes.STRING(20) },
  city: { type: DataTypes.STRING(100) },
  source: { type: DataTypes.ENUM('referral', 'website', 'direct', 'event', 'cold_call', 'social_media', 'other'), defaultValue: 'direct' },
  stage: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
    defaultValue: 'new',
  },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  expectedValue: { type: DataTypes.DECIMAL(12, 2), field: 'expected_value', defaultValue: 0 },
  probability: { type: DataTypes.INTEGER, defaultValue: 10, validate: { min: 0, max: 100 } },
  assignedTo: { type: DataTypes.UUID, field: 'assigned_to' },
  notes: { type: DataTypes.TEXT },
  lostReason: { type: DataTypes.TEXT, field: 'lost_reason' },
  convertedToPartner: { type: DataTypes.BOOLEAN, field: 'converted_to_partner', defaultValue: false },
  partnerId: { type: DataTypes.UUID, field: 'partner_id' },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
  updatedBy: { type: DataTypes.UUID, field: 'updated_by' },
}, {
  tableName: 'leads', timestamps: true, underscored: true,
  indexes: [{ fields: ['stage'] }, { fields: ['partner_type'] }, { fields: ['assigned_to'] }, { fields: ['tenant_id'] }],
});

const Activity = sequelize.define('Activity', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('call', 'email', 'meeting', 'follow_up', 'note', 'demo', 'site_visit'), allowNull: false },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  relatedTo: { type: DataTypes.STRING(50), field: 'related_to' }, // 'lead' or 'partner'
  relatedId: { type: DataTypes.UUID, field: 'related_id' },
  scheduledAt: { type: DataTypes.DATE, field: 'scheduled_at' },
  completedAt: { type: DataTypes.DATE, field: 'completed_at' },
  isCompleted: { type: DataTypes.BOOLEAN, field: 'is_completed', defaultValue: false },
  assignedTo: { type: DataTypes.UUID, field: 'assigned_to' },
  outcome: { type: DataTypes.TEXT },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
}, {
  tableName: 'activities', timestamps: true, underscored: true,
  indexes: [{ fields: ['related_to', 'related_id'] }, { fields: ['assigned_to'] }, { fields: ['scheduled_at'] }, { fields: ['is_completed'] }, { fields: ['tenant_id'] }],
});

module.exports = { Lead, Activity };
