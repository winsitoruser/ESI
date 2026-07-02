'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create fleet_vehicles table
    await queryInterface.createTable('fleet_vehicles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      
      // Basic Info
      vehicle_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      license_plate: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      vehicle_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'truck, van, motorcycle, car'
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      
      // Ownership
      ownership_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'owned, leased, rental'
      },
      purchase_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      purchase_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      lease_start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lease_end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lease_monthly_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      
      // Capacity
      max_weight_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      max_volume_m3: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      fuel_tank_capacity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      
      // Documentation
      registration_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'STNK'
      },
      ownership_document: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'BPKB'
      },
      registration_expiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      insurance_policy_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      insurance_provider: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      insurance_expiry: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // GPS Device
      gps_device_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      gps_device_imei: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      
      // Status
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        comment: 'active, maintenance, retired, sold'
      },
      current_location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      current_odometer_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      last_service_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      next_service_due_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      
      // Assignment
      assigned_branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assigned_driver_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for fleet_vehicles
    await queryInterface.addIndex('fleet_vehicles', ['tenant_id'], {
      name: 'idx_vehicles_tenant'
    });
    await queryInterface.addIndex('fleet_vehicles', ['status'], {
      name: 'idx_vehicles_status'
    });
    await queryInterface.addIndex('fleet_vehicles', ['vehicle_type'], {
      name: 'idx_vehicles_type'
    });
    await queryInterface.addIndex('fleet_vehicles', ['assigned_branch_id'], {
      name: 'idx_vehicles_branch'
    });
    await queryInterface.addIndex('fleet_vehicles', ['license_plate'], {
      name: 'idx_vehicles_plate'
    });

    // 2. Create fleet_drivers table
    await queryInterface.createTable('fleet_drivers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      // Personal Info
      driver_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      date_of_birth: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // License Info
      license_number: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      license_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'SIM A, B, C'
      },
      license_issue_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      license_expiry_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Employment
      employment_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'permanent, contract, freelance'
      },
      hire_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      assigned_branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      // Performance
      total_deliveries: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      on_time_deliveries: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_distance_km: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      safety_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 100
      },
      customer_rating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      
      // Status
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        comment: 'active, on_leave, suspended, terminated'
      },
      availability_status: {
        type: Sequelize.STRING(50),
        defaultValue: 'available',
        comment: 'available, on_duty, off_duty'
      },
      
      // Documents
      photo_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      license_photo_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for fleet_drivers
    await queryInterface.addIndex('fleet_drivers', ['tenant_id'], {
      name: 'idx_drivers_tenant'
    });
    await queryInterface.addIndex('fleet_drivers', ['status'], {
      name: 'idx_drivers_status'
    });
    await queryInterface.addIndex('fleet_drivers', ['assigned_branch_id'], {
      name: 'idx_drivers_branch'
    });
    await queryInterface.addIndex('fleet_drivers', ['availability_status'], {
      name: 'idx_drivers_availability'
    });

    // 3. Update fleet_vehicles to add FK to fleet_drivers
    await queryInterface.addConstraint('fleet_vehicles', {
      fields: ['assigned_driver_id'],
      type: 'foreign key',
      name: 'fk_vehicles_driver',
      references: {
        table: 'fleet_drivers',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove FK constraint first
    await queryInterface.removeConstraint('fleet_vehicles', 'fk_vehicles_driver');
    
    // Drop tables in reverse order
    await queryInterface.dropTable('fleet_drivers');
    await queryInterface.dropTable('fleet_vehicles');
  }
};
