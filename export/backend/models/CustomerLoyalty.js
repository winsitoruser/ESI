const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const CustomerLoyalty = sequelize.define('CustomerLoyalty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },
  programId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'loyalty_programs',
      key: 'id'
    }
  },
  currentTierId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'loyalty_tiers',
      key: 'id'
    }
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  availablePoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lifetimePoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total points earned throughout lifetime'
  },
  totalSpending: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total spending amount for tier calculation'
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastActivityDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'customer_loyalty',
  timestamps: true,
  indexes: [
    {
      fields: ['customerId'],
      unique: true
    },
    {
      fields: ['programId']
    },
    {
      fields: ['currentTierId']
    },
    {
      fields: ['totalPoints']
    }
  ]
});

module.exports = CustomerLoyalty;
