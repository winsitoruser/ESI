'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add location fields to branches table
    await queryInterface.addColumn('branches', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Branch latitude for GPS attendance'
    });

    await queryInterface.addColumn('branches', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Branch longitude for GPS attendance'
    });

    await queryInterface.addColumn('branches', 'geo_fence_radius', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 100,
      comment: 'Geofence radius in meters for GPS attendance'
    });

    // Add location fields to employee_attendances table
    await queryInterface.addColumn('employee_attendances', 'check_in_location', {
      type: Sequelize.GEOMETRY('POINT'),
      allowNull: true,
      field: 'check_in_location',
      comment: 'GPS location when checking in'
    });

    await queryInterface.addColumn('employee_attendances', 'check_out_location', {
      type: Sequelize.GEOMETRY('POINT'),
      allowNull: true,
      field: 'check_out_location',
      comment: 'GPS location when checking out'
    });

    await queryInterface.addColumn('employee_attendances', 'check_in_accuracy', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      field: 'check_in_accuracy',
      comment: 'GPS accuracy in meters when checking in'
    });

    await queryInterface.addColumn('employee_attendances', 'check_out_accuracy', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      field: 'check_out_accuracy',
      comment: 'GPS accuracy in meters when checking out'
    });

    await queryInterface.addColumn('employee_attendances', 'is_within_geofence', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      field: 'is_within_geofence',
      comment: 'Whether check-in was within branch geofence'
    });

    await queryInterface.addColumn('employee_attendances', 'is_within_geofence_checkout', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      field: 'is_within_geofence_checkout',
      comment: 'Whether check-out was within branch geofence'
    });

    await queryInterface.addColumn('employee_attendances', 'check_in_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'check_in_notes',
      comment: 'Notes for check-in'
    });

    await queryInterface.addColumn('employee_attendances', 'check_out_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'check_out_notes',
      comment: 'Notes for check-out'
    });

    await queryInterface.addColumn('employee_attendances', 'check_in_photo', {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'check_in_photo',
      comment: 'Photo URL for check-in proof'
    });

    await queryInterface.addColumn('employee_attendances', 'check_out_photo', {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'check_out_photo',
      comment: 'Photo URL for check-out proof'
    });

    // Create attendance_location_history table
    await queryInterface.createTable('attendance_location_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      attendanceId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'attendance_id',
        references: {
          model: 'employee_attendances',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id',
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('check_in', 'check_out'),
        allowNull: false
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      accuracy: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        comment: 'GPS accuracy in meters'
      },
      isWithinGeofence: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        field: 'is_within_geofence'
      },
      distanceFromBranch: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        field: 'distance_from_branch',
        comment: 'Distance from branch in meters'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('attendance_location_history', ['attendance_id']);
    await queryInterface.addIndex('attendance_location_history', ['employee_id']);
    await queryInterface.addIndex('attendance_location_history', ['branch_id']);
    await queryInterface.addIndex('attendance_location_history', ['action']);
    await queryInterface.addIndex('attendance_location_history', ['created_at']);
    await queryInterface.addIndex('attendance_location_history', ['tenant_id']);

    // Add indexes for employee_attendances location fields
    await queryInterface.addIndex('employee_attendances', ['check_in_location']);
    await queryInterface.addIndex('employee_attendances', ['check_out_location']);
    await queryInterface.addIndex('employee_attendances', ['is_within_geofence']);
    await queryInterface.addIndex('employee_attendances', ['is_within_geofence_checkout']);

    // Add indexes for branches location fields
    await queryInterface.addIndex('branches', ['latitude', 'longitude']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('branches', ['latitude', 'longitude']);
    await queryInterface.removeIndex('employee_attendances', ['is_within_geofence_checkout']);
    await queryInterface.removeIndex('employee_attendances', ['is_within_geofence']);
    await queryInterface.removeIndex('employee_attendances', ['check_out_location']);
    await queryInterface.removeIndex('employee_attendances', ['check_in_location']);
    
    await queryInterface.removeIndex('attendance_location_history', ['tenant_id']);
    await queryInterface.removeIndex('attendance_location_history', ['created_at']);
    await queryInterface.removeIndex('attendance_location_history', ['action']);
    await queryInterface.removeIndex('attendance_location_history', ['branch_id']);
    await queryInterface.removeIndex('attendance_location_history', ['employee_id']);
    await queryInterface.removeIndex('attendance_location_history', ['attendance_id']);

    // Drop table
    await queryInterface.dropTable('attendance_location_history');

    // Remove columns from employee_attendances
    await queryInterface.removeColumn('employee_attendances', 'check_out_photo');
    await queryInterface.removeColumn('employee_attendances', 'check_in_photo');
    await queryInterface.removeColumn('employee_attendances', 'check_out_notes');
    await queryInterface.removeColumn('employee_attendances', 'check_in_notes');
    await queryInterface.removeColumn('employee_attendances', 'is_within_geofence_checkout');
    await queryInterface.removeColumn('employee_attendances', 'is_within_geofence');
    await queryInterface.removeColumn('employee_attendances', 'check_out_accuracy');
    await queryInterface.removeColumn('employee_attendances', 'check_in_accuracy');
    await queryInterface.removeColumn('employee_attendances', 'check_out_location');
    await queryInterface.removeColumn('employee_attendances', 'check_in_location');

    // Remove columns from branches
    await queryInterface.removeColumn('branches', 'geo_fence_radius');
    await queryInterface.removeColumn('branches', 'longitude');
    await queryInterface.removeColumn('branches', 'latitude');
  }
};
