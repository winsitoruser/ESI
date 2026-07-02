const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/sequelizeClient');

const KitchenStaff = sequelize.define('KitchenStaff', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('head_chef', 'sous_chef', 'line_cook', 'prep_cook'),
    allowNull: false,
    defaultValue: 'line_cook'
  },
  shift: {
    type: DataTypes.ENUM('morning', 'afternoon', 'night'),
    allowNull: false,
    defaultValue: 'morning'
  },
  status: {
    type: DataTypes.ENUM('active', 'off', 'leave'),
    allowNull: false,
    defaultValue: 'active'
  },
  performance: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Performance score 0-100'
  },
  ordersCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'orders_completed'
  },
  avgPrepTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'avg_prep_time',
    comment: 'Average preparation time in minutes'
  },
  joinDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'join_date'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'kitchen_staff',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['user_id'] },
    { fields: ['role'] },
    { fields: ['shift'] },
    { fields: ['status'] }
  ]
});

// Associations
KitchenStaff.associate = (models) => {
  if (models.User) {
    KitchenStaff.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }

  KitchenStaff.hasMany(models.KitchenOrder, {
    foreignKey: 'assigned_chef_id',
    as: 'assignedOrders'
  });
};

module.exports = KitchenStaff;
