'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create fleet_routes table
    await queryInterface.createTable('fleet_routes', {
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
      route_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      route_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      route_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'delivery, pickup, round_trip, multi_stop'
      },
      start_location: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      end_location: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      total_distance_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      estimated_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      stops: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of stop locations with details'
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        comment: 'active, inactive, archived'
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

    // 2. Create fleet_route_assignments table
    await queryInterface.createTable('fleet_route_assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      route_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fleet_routes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fleet_vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      driver_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fleet_drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      shipment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'requisition_shipments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      scheduled_start_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      actual_start_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'scheduled',
        comment: 'scheduled, in_progress, completed, cancelled'
      },
      total_distance_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      fuel_consumed_liters: {
        type: Sequelize.DECIMAL(10, 2),
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

    // 3. Create fleet_gps_locations table
    await queryInterface.createTable('fleet_gps_locations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fleet_vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      driver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'fleet_drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      altitude: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      speed_kmh: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true
      },
      heading: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Direction in degrees (0-360)'
      },
      accuracy_meters: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      is_moving: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_idle: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      idle_duration_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. Create fleet_maintenance_schedules table
    await queryInterface.createTable('fleet_maintenance_schedules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fleet_vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      maintenance_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'routine_service, oil_change, tire_rotation, brake_check, inspection, custom'
      },
      interval_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'kilometers, months, both'
      },
      interval_kilometers: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      interval_months: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      last_service_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_service_odometer: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      next_service_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      next_service_odometer: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        comment: 'active, completed, overdue'
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

    // Add indexes
    await queryInterface.addIndex('fleet_routes', ['tenant_id'], {
      name: 'idx_routes_tenant'
    });
    await queryInterface.addIndex('fleet_routes', ['status'], {
      name: 'idx_routes_status'
    });
    await queryInterface.addIndex('fleet_route_assignments', ['route_id'], {
      name: 'idx_assignments_route'
    });
    await queryInterface.addIndex('fleet_route_assignments', ['vehicle_id'], {
      name: 'idx_assignments_vehicle'
    });
    await queryInterface.addIndex('fleet_route_assignments', ['driver_id'], {
      name: 'idx_assignments_driver'
    });
    await queryInterface.addIndex('fleet_route_assignments', ['scheduled_date'], {
      name: 'idx_assignments_date'
    });
    await queryInterface.addIndex('fleet_gps_locations', ['vehicle_id', 'timestamp'], {
      name: 'idx_gps_vehicle_time'
    });
    await queryInterface.addIndex('fleet_maintenance_schedules', ['vehicle_id'], {
      name: 'idx_maintenance_vehicle'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('fleet_maintenance_schedules');
    await queryInterface.dropTable('fleet_gps_locations');
    await queryInterface.dropTable('fleet_route_assignments');
    await queryInterface.dropTable('fleet_routes');
  }
};
