'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('customers')
    );

    if (!tableExists) {
      // Create table if it doesn't exist
      await queryInterface.createTable('customers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        phone: {
          type: Sequelize.STRING(50),
          unique: true
        },
        email: {
          type: Sequelize.STRING(255),
          unique: true
        },
        address: {
          type: Sequelize.TEXT
        },
        city: {
          type: Sequelize.STRING(100)
        },
        province: {
          type: Sequelize.STRING(100)
        },
        postalCode: {
          type: Sequelize.STRING(20)
        },
        type: {
          type: Sequelize.ENUM('walk-in', 'member', 'vip'),
          defaultValue: 'walk-in'
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'blocked'),
          defaultValue: 'active'
        },
        membershipLevel: {
          type: Sequelize.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
          defaultValue: 'Silver'
        },
        points: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        discount: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        },
        totalPurchases: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        totalSpent: {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 0
        },
        lastVisit: {
          type: Sequelize.DATE
        },
        birthDate: {
          type: Sequelize.DATEONLY
        },
        gender: {
          type: Sequelize.ENUM('male', 'female', 'other')
        },
        notes: {
          type: Sequelize.TEXT
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        partnerId: {
          type: Sequelize.UUID
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
      await queryInterface.addIndex('customers', ['phone']);
      await queryInterface.addIndex('customers', ['email']);
      await queryInterface.addIndex('customers', ['type']);
      await queryInterface.addIndex('customers', ['status']);
      await queryInterface.addIndex('customers', ['membershipLevel']);
    } else {
      // Table exists, add missing columns
      const tableDescription = await queryInterface.describeTable('customers');

      // Add city if not exists
      if (!tableDescription.city) {
        await queryInterface.addColumn('customers', 'city', {
          type: Sequelize.STRING(100)
        });
      }

      // Add province if not exists
      if (!tableDescription.province) {
        await queryInterface.addColumn('customers', 'province', {
          type: Sequelize.STRING(100)
        });
      }

      // Add postalCode if not exists
      if (!tableDescription.postalCode) {
        await queryInterface.addColumn('customers', 'postalCode', {
          type: Sequelize.STRING(20)
        });
      }

      // Add type if not exists
      if (!tableDescription.type) {
        await queryInterface.addColumn('customers', 'type', {
          type: Sequelize.ENUM('walk-in', 'member', 'vip'),
          defaultValue: 'walk-in'
        });
      }

      // Add status if not exists
      if (!tableDescription.status) {
        await queryInterface.addColumn('customers', 'status', {
          type: Sequelize.ENUM('active', 'inactive', 'blocked'),
          defaultValue: 'active'
        });
      }

      // Add membershipLevel if not exists
      if (!tableDescription.membershipLevel) {
        await queryInterface.addColumn('customers', 'membershipLevel', {
          type: Sequelize.ENUM('Bronze', 'Silver', 'Gold', 'Platinum'),
          defaultValue: 'Silver'
        });
      }

      // Add points if not exists
      if (!tableDescription.points) {
        await queryInterface.addColumn('customers', 'points', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
      }

      // Add discount if not exists
      if (!tableDescription.discount) {
        await queryInterface.addColumn('customers', 'discount', {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 0
        });
      }

      // Add totalPurchases if not exists
      if (!tableDescription.totalPurchases) {
        await queryInterface.addColumn('customers', 'totalPurchases', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
      }

      // Add totalSpent if not exists
      if (!tableDescription.totalSpent) {
        await queryInterface.addColumn('customers', 'totalSpent', {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 0
        });
      }

      // Add lastVisit if not exists
      if (!tableDescription.lastVisit) {
        await queryInterface.addColumn('customers', 'lastVisit', {
          type: Sequelize.DATE
        });
      }

      // Add birthDate if not exists
      if (!tableDescription.birthDate) {
        await queryInterface.addColumn('customers', 'birthDate', {
          type: Sequelize.DATEONLY
        });
      }

      // Add gender if not exists
      if (!tableDescription.gender) {
        await queryInterface.addColumn('customers', 'gender', {
          type: Sequelize.ENUM('male', 'female', 'other')
        });
      }

      // Add notes if not exists
      if (!tableDescription.notes) {
        await queryInterface.addColumn('customers', 'notes', {
          type: Sequelize.TEXT
        });
      }

      // Add isActive if not exists
      if (!tableDescription.isActive) {
        await queryInterface.addColumn('customers', 'isActive', {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('customers', 'city');
    await queryInterface.removeColumn('customers', 'province');
    await queryInterface.removeColumn('customers', 'postalCode');
    await queryInterface.removeColumn('customers', 'type');
    await queryInterface.removeColumn('customers', 'status');
    await queryInterface.removeColumn('customers', 'membershipLevel');
    await queryInterface.removeColumn('customers', 'points');
    await queryInterface.removeColumn('customers', 'discount');
    await queryInterface.removeColumn('customers', 'totalPurchases');
    await queryInterface.removeColumn('customers', 'totalSpent');
    await queryInterface.removeColumn('customers', 'lastVisit');
    await queryInterface.removeColumn('customers', 'birthDate');
    await queryInterface.removeColumn('customers', 'gender');
    await queryInterface.removeColumn('customers', 'notes');
    await queryInterface.removeColumn('customers', 'isActive');
  }
};
