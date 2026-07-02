const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const HeldTransaction = sequelize.define('HeldTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  holdNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'hold_number'
  },
  cashierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    },
    field: 'cashier_id'
  },
  customerName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'customer_name'
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    },
    field: 'customer_id'
  },
  
  // Transaction Data (JSON)
  cartItems: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'cart_items'
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  tax: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  
  // Customer & Discount Info
  customerType: {
    type: DataTypes.STRING(20),
    defaultValue: 'walk-in',
    field: 'customer_type'
  },
  selectedMember: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'selected_member'
  },
  selectedVoucher: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'selected_voucher'
  },
  
  // Metadata
  holdReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'hold_reason'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Status & Timestamps
  status: {
    type: DataTypes.ENUM('held', 'resumed', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'held'
  },
  heldAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'held_at'
  },
  resumedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resumed_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  }
}, {
  tableName: 'held_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['cashier_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['held_at']
    },
    {
      fields: ['hold_number']
    }
  ]
});

// Static method to generate hold number
HeldTransaction.generateHoldNumber = async function() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of holds today
  const count = await HeldTransaction.count({
    where: {
      heldAt: {
        [sequelize.Sequelize.Op.gte]: new Date(today.setHours(0, 0, 0, 0))
      }
    }
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `HOLD-${dateStr}-${sequence}`;
};

// Define associations
HeldTransaction.associate = (models) => {
  HeldTransaction.belongsTo(models.Employee, {
    foreignKey: 'cashierId',
    as: 'cashier'
  });
  
  HeldTransaction.belongsTo(models.Customer, {
    foreignKey: 'customerId',
    as: 'customer'
  });
  
  HeldTransaction.hasOne(models.PosTransaction, {
    foreignKey: 'heldTransactionId',
    as: 'completedTransaction'
  });
};

module.exports = HeldTransaction;
