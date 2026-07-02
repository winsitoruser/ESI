module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create loyalty_programs table
    await queryInterface.createTable('loyalty_programs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      programName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      pointsPerRupiah: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0
      },
      minimumPurchase: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      pointsExpiry: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365
      },
      autoEnroll: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create loyalty_tiers table
    await queryInterface.createTable('loyalty_tiers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      programId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'loyalty_programs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      tierName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      tierLevel: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      minSpending: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      pointMultiplier: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.0
      },
      discountPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      benefits: {
        type: Sequelize.JSON,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create loyalty_rewards table
    await queryInterface.createTable('loyalty_rewards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      programId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'loyalty_programs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      rewardName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pointsRequired: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      rewardType: {
        type: Sequelize.ENUM('discount', 'product', 'shipping', 'voucher', 'service'),
        allowNull: false
      },
      rewardValue: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      validityDays: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      maxRedemptions: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      currentRedemptions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create customer_loyalty table
    await queryInterface.createTable('customer_loyalty', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Customers',
          key: 'id'
        },
        unique: true
      },
      programId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'loyalty_programs',
          key: 'id'
        }
      },
      currentTierId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'loyalty_tiers',
          key: 'id'
        }
      },
      totalPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      availablePoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lifetimePoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalSpending: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      enrollmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      lastActivityDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create point_transactions table
    await queryInterface.createTable('point_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerLoyaltyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'customer_loyalty',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      transactionType: {
        type: Sequelize.ENUM('earn', 'redeem', 'expire', 'adjust', 'refund'),
        allowNull: false
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      referenceType: {
        type: Sequelize.ENUM('pos_transaction', 'reward_redemption', 'manual', 'expiry', 'refund'),
        allowNull: false
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      balanceBefore: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      balanceAfter: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      processedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create reward_redemptions table
    await queryInterface.createTable('reward_redemptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerLoyaltyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'customer_loyalty',
          key: 'id'
        }
      },
      rewardId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'loyalty_rewards',
          key: 'id'
        }
      },
      pointsUsed: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      redemptionCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'used', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      redemptionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      usedDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      usedInTransactionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'pos_transactions',
          key: 'id'
        }
      },
      processedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('loyalty_programs', ['isActive']);
    await queryInterface.addIndex('loyalty_tiers', ['programId', 'tierLevel']);
    await queryInterface.addIndex('loyalty_tiers', ['minSpending']);
    await queryInterface.addIndex('loyalty_rewards', ['programId', 'isActive']);
    await queryInterface.addIndex('loyalty_rewards', ['rewardType']);
    await queryInterface.addIndex('loyalty_rewards', ['pointsRequired']);
    await queryInterface.addIndex('customer_loyalty', ['customerId'], { unique: true });
    await queryInterface.addIndex('customer_loyalty', ['programId']);
    await queryInterface.addIndex('customer_loyalty', ['currentTierId']);
    await queryInterface.addIndex('customer_loyalty', ['totalPoints']);
    await queryInterface.addIndex('point_transactions', ['customerLoyaltyId', 'transactionDate']);
    await queryInterface.addIndex('point_transactions', ['transactionType']);
    await queryInterface.addIndex('point_transactions', ['referenceType', 'referenceId']);
    await queryInterface.addIndex('point_transactions', ['expiryDate']);
    await queryInterface.addIndex('reward_redemptions', ['customerLoyaltyId']);
    await queryInterface.addIndex('reward_redemptions', ['rewardId']);
    await queryInterface.addIndex('reward_redemptions', ['redemptionCode'], { unique: true });
    await queryInterface.addIndex('reward_redemptions', ['status']);
    await queryInterface.addIndex('reward_redemptions', ['expiryDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reward_redemptions');
    await queryInterface.dropTable('point_transactions');
    await queryInterface.dropTable('customer_loyalty');
    await queryInterface.dropTable('loyalty_rewards');
    await queryInterface.dropTable('loyalty_tiers');
    await queryInterface.dropTable('loyalty_programs');
  }
};
