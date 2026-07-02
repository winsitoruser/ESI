'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add KYB status columns to tenants table
    const tenantsDesc = await queryInterface.describeTable('tenants');

    if (!tenantsDesc.kyb_status) {
      await queryInterface.addColumn('tenants', 'kyb_status', {
        type: Sequelize.STRING(30),
        defaultValue: 'pending_kyb',
        comment: 'pending_kyb, in_review, approved, rejected, active'
      });
    }
    if (!tenantsDesc.business_structure) {
      await queryInterface.addColumn('tenants', 'business_structure', {
        type: Sequelize.STRING(20),
        defaultValue: 'single',
        comment: 'single, multi_branch'
      });
    }
    if (!tenantsDesc.parent_tenant_id) {
      await queryInterface.addColumn('tenants', 'parent_tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'For sub-branches, references the HQ tenant'
      });
    }
    if (!tenantsDesc.is_hq) {
      await queryInterface.addColumn('tenants', 'is_hq', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'True if this tenant is an HQ (multi-branch master)'
      });
    }
    if (!tenantsDesc.activated_at) {
      await queryInterface.addColumn('tenants', 'activated_at', { type: Sequelize.DATE, allowNull: true });
    }
    if (!tenantsDesc.activated_by) {
      await queryInterface.addColumn('tenants', 'activated_by', { type: Sequelize.UUID, allowNull: true });
    }

    // Create kyb_applications table (skip if already exists from 20260227-create-kyb-tables.js)
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('kyb_applications')) {
      await queryInterface.createTable('kyb_applications', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        business_name: { type: Sequelize.STRING(255), allowNull: false },
        business_category: { type: Sequelize.STRING(100) },
        business_subcategory: { type: Sequelize.STRING(100) },
        business_duration: { type: Sequelize.STRING(50) },
        business_description: { type: Sequelize.TEXT },
        employee_count: { type: Sequelize.STRING(50) },
        annual_revenue: { type: Sequelize.STRING(50) },
        legal_entity_type: { type: Sequelize.STRING(50) },
        legal_entity_name: { type: Sequelize.STRING(255) },
        nib_number: { type: Sequelize.STRING(100) },
        siup_number: { type: Sequelize.STRING(100) },
        npwp_number: { type: Sequelize.STRING(100) },
        ktp_number: { type: Sequelize.STRING(50) },
        ktp_name: { type: Sequelize.STRING(255) },
        pic_name: { type: Sequelize.STRING(255) },
        pic_phone: { type: Sequelize.STRING(50) },
        pic_email: { type: Sequelize.STRING(255) },
        pic_position: { type: Sequelize.STRING(100) },
        business_address: { type: Sequelize.TEXT },
        business_city: { type: Sequelize.STRING(100) },
        business_province: { type: Sequelize.STRING(100) },
        business_postal_code: { type: Sequelize.STRING(20) },
        business_district: { type: Sequelize.STRING(100) },
        business_coordinates: { type: Sequelize.JSON },
        business_structure: { type: Sequelize.STRING(20), defaultValue: 'single' },
        planned_branch_count: { type: Sequelize.INTEGER, defaultValue: 1 },
        branch_locations: { type: Sequelize.JSON },
        additional_notes: { type: Sequelize.TEXT },
        referral_source: { type: Sequelize.STRING(100) },
        expected_start_date: { type: Sequelize.DATEONLY },
        status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
        submitted_at: { type: Sequelize.DATE },
        current_step: { type: Sequelize.INTEGER, defaultValue: 1 },
        completion_percentage: { type: Sequelize.INTEGER, defaultValue: 0 },
        reviewed_by: { type: Sequelize.UUID },
        reviewed_at: { type: Sequelize.DATE },
        review_notes: { type: Sequelize.TEXT },
        rejection_reason: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    if (!tables.includes('kyb_documents')) {
      await queryInterface.createTable('kyb_documents', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        kyb_application_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'kyb_applications', key: 'id' }, onDelete: 'CASCADE' },
        tenant_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        document_type: { type: Sequelize.STRING(50), allowNull: false },
        document_name: { type: Sequelize.STRING(255), allowNull: false },
        file_url: { type: Sequelize.TEXT, allowNull: false },
        file_size: { type: Sequelize.INTEGER },
        mime_type: { type: Sequelize.STRING(100) },
        verification_status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
        verified_by: { type: Sequelize.UUID },
        verified_at: { type: Sequelize.DATE },
        verification_notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Add indexes (catch duplicates)
    await queryInterface.addIndex('kyb_applications', ['tenant_id'], { name: 'idx_kyb_applications_tenant' }).catch(() => {});
    await queryInterface.addIndex('kyb_applications', ['user_id'], { name: 'idx_kyb_applications_user' }).catch(() => {});
    await queryInterface.addIndex('kyb_applications', ['status'], { name: 'idx_kyb_applications_status' }).catch(() => {});
    await queryInterface.addIndex('kyb_documents', ['kyb_application_id'], { name: 'idx_kyb_documents_application' }).catch(() => {});
    await queryInterface.addIndex('kyb_documents', ['tenant_id'], { name: 'idx_kyb_documents_tenant' }).catch(() => {});
    await queryInterface.addIndex('tenants', ['kyb_status'], { name: 'idx_tenants_kyb_status' }).catch(() => {});
    await queryInterface.addIndex('tenants', ['parent_tenant_id'], { name: 'idx_tenants_parent' }).catch(() => {});

    console.log('✅ KYB system tables created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kyb_documents').catch(() => {});
    await queryInterface.dropTable('kyb_applications').catch(() => {});
    await queryInterface.removeColumn('tenants', 'kyb_status').catch(() => {});
    await queryInterface.removeColumn('tenants', 'business_structure').catch(() => {});
    await queryInterface.removeColumn('tenants', 'parent_tenant_id').catch(() => {});
    await queryInterface.removeColumn('tenants', 'is_hq').catch(() => {});
    await queryInterface.removeColumn('tenants', 'activated_at').catch(() => {});
    await queryInterface.removeColumn('tenants', 'activated_by').catch(() => {});
  }
};
