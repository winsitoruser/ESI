'use strict';

/**
 * Migration: Create Tables and Reservations
 * 
 * This migration creates:
 * 1. tables - For restaurant table management
 * 2. reservations - For customer reservations
 * 3. table_sessions - For tracking table occupancy
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Create ENUM types
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_tables_status AS ENUM('available', 'occupied', 'reserved', 'maintenance');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_reservations_status AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      // 2. Create tables table
      await queryInterface.createTable('tables', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        table_number: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        area: {
          type: Sequelize.STRING(50),
          comment: 'indoor, outdoor, vip, smoking, non-smoking'
        },
        floor: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        position_x: {
          type: Sequelize.INTEGER,
          comment: 'X coordinate for visual layout'
        },
        position_y: {
          type: Sequelize.INTEGER,
          comment: 'Y coordinate for visual layout'
        },
        status: {
          type: Sequelize.ENUM('available', 'occupied', 'reserved', 'maintenance'),
          allowNull: false,
          defaultValue: 'available'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create indexes for tables
      await queryInterface.addIndex('tables', ['status'], {
        name: 'idx_tables_status',
        transaction
      });

      await queryInterface.addIndex('tables', ['area'], {
        name: 'idx_tables_area',
        transaction
      });

      await queryInterface.addIndex('tables', ['is_active'], {
        name: 'idx_tables_active',
        transaction
      });

      // 3. Create reservations table
      await queryInterface.createTable('reservations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        reservation_number: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        
        // Customer Info
        customer_id: {
          type: Sequelize.UUID,
          references: {
            model: 'customers',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        customer_name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        customer_phone: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        customer_email: {
          type: Sequelize.STRING(255)
        },
        
        // Reservation Details
        reservation_date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        reservation_time: {
          type: Sequelize.TIME,
          allowNull: false
        },
        guest_count: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        duration_minutes: {
          type: Sequelize.INTEGER,
          defaultValue: 120,
          comment: 'Expected duration in minutes'
        },
        
        // Table Assignment
        table_id: {
          type: Sequelize.UUID,
          references: {
            model: 'tables',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        table_number: {
          type: Sequelize.STRING(20)
        },
        
        // Status & Payment
        status: {
          type: Sequelize.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'),
          allowNull: false,
          defaultValue: 'pending'
        },
        deposit_amount: {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 0
        },
        deposit_paid: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        
        // Additional Info
        special_requests: {
          type: Sequelize.TEXT
        },
        notes: {
          type: Sequelize.TEXT
        },
        cancellation_reason: {
          type: Sequelize.TEXT
        },
        
        // Staff Info (references will be added if employees table exists)
        created_by: {
          type: Sequelize.UUID
        },
        confirmed_by: {
          type: Sequelize.UUID
        },
        seated_by: {
          type: Sequelize.UUID
        },
        
        // Timestamps
        confirmed_at: {
          type: Sequelize.DATE
        },
        seated_at: {
          type: Sequelize.DATE
        },
        completed_at: {
          type: Sequelize.DATE
        },
        cancelled_at: {
          type: Sequelize.DATE
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create indexes for reservations
      await queryInterface.addIndex('reservations', ['reservation_date'], {
        name: 'idx_reservations_date',
        transaction
      });

      await queryInterface.addIndex('reservations', ['status'], {
        name: 'idx_reservations_status',
        transaction
      });

      await queryInterface.addIndex('reservations', ['customer_id'], {
        name: 'idx_reservations_customer',
        transaction
      });

      await queryInterface.addIndex('reservations', ['table_id'], {
        name: 'idx_reservations_table',
        transaction
      });

      await queryInterface.addIndex('reservations', ['reservation_number'], {
        name: 'idx_reservations_number',
        transaction
      });

      await queryInterface.addIndex('reservations', ['customer_phone'], {
        name: 'idx_reservations_phone',
        transaction
      });

      // 4. Create table_sessions table
      await queryInterface.createTable('table_sessions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        table_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'tables',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        reservation_id: {
          type: Sequelize.UUID,
          references: {
            model: 'reservations',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        pos_transaction_id: {
          type: Sequelize.UUID
        },
        guest_count: {
          type: Sequelize.INTEGER
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        ended_at: {
          type: Sequelize.DATE
        },
        duration_minutes: {
          type: Sequelize.INTEGER
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create indexes for table_sessions
      await queryInterface.addIndex('table_sessions', ['table_id'], {
        name: 'idx_table_sessions_table',
        transaction
      });

      await queryInterface.addIndex('table_sessions', ['reservation_id'], {
        name: 'idx_table_sessions_reservation',
        transaction
      });

      // Index for active sessions (where ended_at IS NULL)
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_table_sessions_active 
        ON table_sessions(table_id, ended_at) 
        WHERE ended_at IS NULL;
      `, { transaction });

      await transaction.commit();
      console.log('✅ Tables and Reservations migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables in reverse order
      await queryInterface.dropTable('table_sessions', { transaction });
      await queryInterface.dropTable('reservations', { transaction });
      await queryInterface.dropTable('tables', { transaction });

      // Drop ENUM types
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_tables_status;
        DROP TYPE IF EXISTS enum_reservations_status;
      `, { transaction });

      await transaction.commit();
      console.log('✅ Tables and Reservations rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
