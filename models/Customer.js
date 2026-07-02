'use strict';

module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(50),
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      validate: {
        isEmail: true
      }
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING(100)
    },
    province: {
      type: DataTypes.STRING(100)
    },
    postalCode: {
      type: DataTypes.STRING(20)
    },
    type: {
      type: DataTypes.ENUM('walk-in', 'member', 'vip'),
      defaultValue: 'walk-in'
    },
    customerType: {
      type: DataTypes.ENUM('individual', 'corporate'),
      defaultValue: 'individual',
      allowNull: false
    },
    companyName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    picName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Person In Charge Name'
    },
    picPosition: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Person In Charge Position'
    },
    contact1: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Primary Contact Number'
    },
    contact2: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Secondary Contact Number'
    },
    companyEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    companyAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    taxId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'NPWP or Tax ID'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'blocked'),
      defaultValue: 'active'
    },
    membershipLevel: {
      type: DataTypes.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
      defaultValue: 'Silver'
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    totalPurchases: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalSpent: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    lastVisit: {
      type: DataTypes.DATE
    },
    birthDate: {
      type: DataTypes.DATEONLY
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other')
    },
    notes: {
      type: DataTypes.TEXT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    partnerId: {
      type: DataTypes.UUID
    }
  }, {
    tableName: 'customers',
    timestamps: true,
    indexes: [
      {
        fields: ['phone']
      },
      {
        fields: ['email']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['membershipLevel']
      }
    ]
  });

  Customer.associate = function(models) {
    // Association with PosTransaction
    Customer.hasMany(models.PosTransaction, {
      foreignKey: 'customerId',
      as: 'transactions'
    });
  };

  return Customer;
};
