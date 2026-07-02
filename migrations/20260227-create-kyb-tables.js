'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create kyb_applications table
    await queryInterface.createTable('kyb_applications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
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
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // Step 1: Business Identity
      business_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      business_category: {
        type: Sequelize.STRING(100)
      },
      business_subcategory: {
        type: Sequelize.STRING(100)
      },
      business_duration: {
        type: Sequelize.STRING(50)
      },
      business_description: {
        type: Sequelize.TEXT
      },
      employee_count: {
        type: Sequelize.STRING(50)
      },
      annual_revenue: {
        type: Sequelize.STRING(50)
      },

      // Step 2: Legal Status
      legal_entity_type: {
        type: Sequelize.STRING(50)
      },
      legal_entity_name: {
        type: Sequelize.STRING(255)
      },
      nib_number: {
        type: Sequelize.STRING(100)
      },
      siup_number: {
        type: Sequelize.STRING(100)
      },
      npwp_number: {
        type: Sequelize.STRING(100)
      },
      ktp_number: {
        type: Sequelize.STRING(50)
      },
      ktp_name: {
        type: Sequelize.STRING(255)
      },

      // Step 4: PIC & Address
      pic_name: {
        type: Sequelize.STRING(255)
      },
      pic_phone: {
        type: Sequelize.STRING(50)
      },
      pic_email: {
        type: Sequelize.STRING(255)
      },
      pic_position: {
        type: Sequelize.STRING(100)
      },
      business_address: {
        type: Sequelize.TEXT
      },
      business_city: {
        type: Sequelize.STRING(100)
      },
      business_province: {
        type: Sequelize.STRING(100)
      },
      business_postal_code: {
        type: Sequelize.STRING(20)
      },
      business_district: {
        type: Sequelize.STRING(100)
      },
      business_coordinates: {
        type: Sequelize.JSON
      },

      // Step 5: Business Structure
      business_structure: {
        type: Sequelize.STRING(20),
        defaultValue: 'single'
      },
      planned_branch_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      branch_locations: {
        type: Sequelize.JSON
      },

      // Step 6: Additional
      additional_notes: {
        type: Sequelize.TEXT
      },
      referral_source: {
        type: Sequelize.STRING(100)
      },
      expected_start_date: {
        type: Sequelize.DATEONLY
      },

      // KYB Status
      status: {
        type: Sequelize.STRING(30),
        defaultValue: 'draft'
      },
      submitted_at: {
        type: Sequelize.DATE
      },
      current_step: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      completion_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },

      // Review
      reviewed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      reviewed_at: {
        type: Sequelize.DATE
      },
      review_notes: {
        type: Sequelize.TEXT
      },
      rejection_reason: {
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
    });

    // Create kyb_documents table
    await queryInterface.createTable('kyb_documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      kyb_application_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'kyb_applications',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      document_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      document_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER
      },
      mime_type: {
        type: Sequelize.STRING(100)
      },
      uploaded_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verified_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verified_at: {
        type: Sequelize.DATE
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
    });

    // Add indexes
    await queryInterface.addIndex('kyb_applications', ['tenant_id']);
    await queryInterface.addIndex('kyb_applications', ['user_id']);
    await queryInterface.addIndex('kyb_applications', ['status']);
    await queryInterface.addIndex('kyb_documents', ['kyb_application_id']);
    await queryInterface.addIndex('kyb_documents', ['document_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kyb_documents');
    await queryInterface.dropTable('kyb_applications');
  }
};
