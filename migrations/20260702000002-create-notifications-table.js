'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenant_id',
        comment: 'Tenant that owns this notification (nullable for system-wide)'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'user_id',
        comment: 'User who receives this notification (users.id is INTEGER)'
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'info'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      referenceType: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'reference_type'
      },
      referenceId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: 'reference_id'
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'read_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
      name: 'notifications_user_id_is_read_idx'
    });
    await queryInterface.addIndex('notifications', ['user_id', 'created_at'], {
      name: 'notifications_user_id_created_at_idx'
    });
    await queryInterface.addIndex('notifications', ['tenant_id'], {
      name: 'notifications_tenant_id_idx'
    });
    await queryInterface.addIndex('notifications', ['category'], {
      name: 'notifications_category_idx'
    });
    await queryInterface.addIndex('notifications', ['reference_type', 'reference_id'], {
      name: 'notifications_ref_idx'
    });
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'notifications_created_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
  }
};
