const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KitchenOrder = sequelize.define('KitchenOrder', {
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
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  posTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'pos_transaction_id',
    references: {
      model: 'pos_transactions',
      key: 'id'
    }
  },
  tableNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'table_number'
  },
  orderType: {
    type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
    allowNull: false,
    defaultValue: 'dine-in',
    field: 'order_type'
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'customer_name'
  },
  status: {
    type: DataTypes.ENUM('new', 'preparing', 'ready', 'served', 'cancelled'),
    allowNull: false,
    defaultValue: 'new'
  },
  priority: {
    type: DataTypes.ENUM('normal', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'received_at'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  servedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'served_at'
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated preparation time in minutes',
    field: 'estimated_time'
  },
  actualPrepTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual preparation time in minutes',
    field: 'actual_prep_time'
  },
  assignedChefId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_chef_id',
    references: {
      model: 'kitchen_staff',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'total_amount'
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
  tableName: 'kitchen_orders',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['order_number'] },
    { fields: ['status'] },
    { fields: ['order_type'] },
    { fields: ['received_at'] },
    { fields: ['pos_transaction_id'] }
  ]
});

// Associations
KitchenOrder.associate = (models) => {
  KitchenOrder.hasMany(models.KitchenOrderItem, {
    foreignKey: 'kitchen_order_id',
    as: 'items'
  });
  
  KitchenOrder.belongsTo(models.KitchenStaff, {
    foreignKey: 'assigned_chef_id',
    as: 'assignedChef'
  });

  if (models.POSTransaction) {
    KitchenOrder.belongsTo(models.POSTransaction, {
      foreignKey: 'pos_transaction_id',
      as: 'posTransaction'
    });
  }
};

module.exports = KitchenOrder;
