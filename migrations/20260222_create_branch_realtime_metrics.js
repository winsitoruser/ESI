'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('branch_realtime_metrics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      branch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Kitchen Metrics
      kitchen_status: {
        type: Sequelize.ENUM('idle', 'normal', 'busy', 'overloaded'),
        defaultValue: 'idle'
      },
      kitchen_active_orders: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      kitchen_pending_orders: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      kitchen_avg_prep_time: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      kitchen_sla_compliance: {
        type: Sequelize.FLOAT,
        defaultValue: 100
      },
      // Queue Metrics
      queue_length: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      queue_avg_wait_time: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      queue_served_today: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Order Metrics
      orders_online: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      orders_offline: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      orders_dine_in: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      orders_takeaway: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      orders_delivery: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_orders_today: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Occupancy Metrics
      table_occupancy: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      tables_total: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      tables_occupied: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      tables_available: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      tables_reserved: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Employee Metrics
      employees_present: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      employees_total: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      employees_on_break: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      kitchen_staff_active: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cashiers_active: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      waiters_active: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Sales Metrics
      sales_today: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      sales_this_hour: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      avg_transaction_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      transactions_today: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Timestamps
      last_updated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add index for faster branch lookups
    await queryInterface.addIndex('branch_realtime_metrics', ['branch_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('branch_realtime_metrics');
  }
};
