const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id',
    comment: 'Tenant that owns this notification (nullable for system-wide)'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: 'User who receives this notification'
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'info',
    comment: 'info, warning, error, success, low_stock_alert, etc.'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'crm, sfa, crm_task, crm_ticket, crm_follow_up, sfa_lead, sfa_visit, sfa_target, sla_breach, project_management, inventory, etc.'
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional JSON payload for flexibility'
  },
  referenceType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'reference_type',
    comment: 'Type of referenced entity: crm_task, crm_followup, sla_warning, sfa_lead_assigned, etc.'
  },
  referenceId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'reference_id',
    comment: 'ID of the referenced entity'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'is_read'] },
    { fields: ['user_id', 'created_at'] },
    { fields: ['tenant_id'] },
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['reference_type', 'reference_id'] },
    { fields: ['created_at'] }
  ]
});

Notification.associate = (models) => {
  // Note: User.id is INTEGER, not UUID
  Notification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  Notification.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });
};

module.exports = Notification;
