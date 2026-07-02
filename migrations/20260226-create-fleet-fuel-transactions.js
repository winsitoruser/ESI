'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('fleet_fuel_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'fleet_vehicles', key: 'id' }
      },
      driver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'fleet_drivers', key: 'id' }
      },
      transaction_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'refill'
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      fuel_station: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      fuel_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'diesel'
      },
      quantity_liters: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      price_per_liter: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      odometer_reading: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      receipt_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('fleet_fuel_transactions', ['vehicle_id']);
    await queryInterface.addIndex('fleet_fuel_transactions', ['driver_id']);
    await queryInterface.addIndex('fleet_fuel_transactions', ['transaction_date']);
    await queryInterface.addIndex('fleet_fuel_transactions', ['tenant_id']);
    await queryInterface.addIndex('fleet_fuel_transactions', ['fuel_type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fleet_fuel_transactions');
  }
};
