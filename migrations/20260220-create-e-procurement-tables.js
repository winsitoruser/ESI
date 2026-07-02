'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. epr_vendors
    await queryInterface.createTable('epr_vendors', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      vendor_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      vendor_type: { type: Sequelize.STRING(30), defaultValue: 'supplier' },
      category: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      address: { type: Sequelize.TEXT },
      city: { type: Sequelize.STRING(100) },
      province: { type: Sequelize.STRING(100) },
      postal_code: { type: Sequelize.STRING(20) },
      country: { type: Sequelize.STRING(100), defaultValue: 'Indonesia' },
      phone: { type: Sequelize.STRING(50) },
      email: { type: Sequelize.STRING(100) },
      website: { type: Sequelize.STRING(200) },
      contact_person: { type: Sequelize.STRING(100) },
      contact_phone: { type: Sequelize.STRING(50) },
      npwp: { type: Sequelize.STRING(50) },
      bank_name: { type: Sequelize.STRING(100) },
      bank_account: { type: Sequelize.STRING(50) },
      bank_holder: { type: Sequelize.STRING(100) },
      rating: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0 },
      total_orders: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_spend: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      payment_terms: { type: Sequelize.STRING(50) },
      lead_time_days: { type: Sequelize.INTEGER, defaultValue: 0 },
      certifications: { type: Sequelize.JSONB, defaultValue: [] },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 2. epr_rfqs
    await queryInterface.createTable('epr_rfqs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      rfq_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      category: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      publish_date: { type: Sequelize.DATE },
      closing_date: { type: Sequelize.DATE },
      estimated_budget: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      payment_terms: { type: Sequelize.STRING(100) },
      delivery_terms: { type: Sequelize.STRING(100) },
      delivery_address: { type: Sequelize.TEXT },
      invited_vendors: { type: Sequelize.JSONB, defaultValue: [] },
      evaluation_criteria: { type: Sequelize.JSONB, defaultValue: [] },
      terms_conditions: { type: Sequelize.TEXT },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      requested_by: { type: Sequelize.INTEGER },
      requested_by_name: { type: Sequelize.STRING(100) },
      approved_by: { type: Sequelize.INTEGER },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 3. epr_rfq_items
    await queryInterface.createTable('epr_rfq_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      rfq_id: { type: Sequelize.UUID, references: { model: 'epr_rfqs', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.INTEGER },
      product_name: { type: Sequelize.STRING(200) },
      description: { type: Sequelize.TEXT },
      quantity: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      uom: { type: Sequelize.STRING(20), defaultValue: 'pcs' },
      target_price: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      specifications: { type: Sequelize.JSONB, defaultValue: {} },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 4. epr_rfq_responses
    await queryInterface.createTable('epr_rfq_responses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      rfq_id: { type: Sequelize.UUID, references: { model: 'epr_rfqs', key: 'id' }, onDelete: 'CASCADE' },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      status: { type: Sequelize.STRING(30), defaultValue: 'submitted' },
      total_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      delivery_time_days: { type: Sequelize.INTEGER },
      warranty_months: { type: Sequelize.INTEGER },
      payment_terms: { type: Sequelize.STRING(100) },
      technical_score: { type: Sequelize.DECIMAL(5, 2) },
      price_score: { type: Sequelize.DECIMAL(5, 2) },
      overall_score: { type: Sequelize.DECIMAL(5, 2) },
      item_prices: { type: Sequelize.JSONB, defaultValue: [] },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      submitted_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 5. epr_tenders
    await queryInterface.createTable('epr_tenders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      tender_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      tender_type: { type: Sequelize.STRING(30), defaultValue: 'open' },
      category: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      announcement_date: { type: Sequelize.DATE },
      registration_deadline: { type: Sequelize.DATE },
      submission_deadline: { type: Sequelize.DATE },
      evaluation_date: { type: Sequelize.DATE },
      award_date: { type: Sequelize.DATE },
      estimated_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      evaluation_criteria: { type: Sequelize.JSONB, defaultValue: [] },
      committee_members: { type: Sequelize.JSONB, defaultValue: [] },
      requirements: { type: Sequelize.JSONB, defaultValue: [] },
      terms_conditions: { type: Sequelize.TEXT },
      winner_vendor_id: { type: Sequelize.UUID },
      winner_name: { type: Sequelize.STRING(200) },
      winner_bid_amount: { type: Sequelize.DECIMAL(19, 4) },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 6. epr_tender_bids
    await queryInterface.createTable('epr_tender_bids', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      tender_id: { type: Sequelize.UUID, references: { model: 'epr_tenders', key: 'id' }, onDelete: 'CASCADE' },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      bid_number: { type: Sequelize.STRING(50) },
      bid_amount: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      status: { type: Sequelize.STRING(30), defaultValue: 'submitted' },
      technical_score: { type: Sequelize.DECIMAL(5, 2) },
      price_score: { type: Sequelize.DECIMAL(5, 2) },
      overall_score: { type: Sequelize.DECIMAL(5, 2) },
      ranking: { type: Sequelize.INTEGER },
      technical_documents: { type: Sequelize.JSONB, defaultValue: [] },
      price_documents: { type: Sequelize.JSONB, defaultValue: [] },
      delivery_schedule: { type: Sequelize.TEXT },
      warranty_terms: { type: Sequelize.TEXT },
      notes: { type: Sequelize.TEXT },
      submitted_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 7. epr_procurement_requests
    await queryInterface.createTable('epr_procurement_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      request_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      department: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      estimated_budget: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      needed_date: { type: Sequelize.DATEONLY },
      justification: { type: Sequelize.TEXT },
      items: { type: Sequelize.JSONB, defaultValue: [] },
      approval_flow: { type: Sequelize.JSONB, defaultValue: [] },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      requested_by: { type: Sequelize.INTEGER },
      requested_by_name: { type: Sequelize.STRING(100) },
      approved_by: { type: Sequelize.INTEGER },
      approved_at: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 8. epr_contracts
    await queryInterface.createTable('epr_contracts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      vendor_name: { type: Sequelize.STRING(200) },
      contract_type: { type: Sequelize.STRING(30), defaultValue: 'purchase' },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      payment_terms: { type: Sequelize.STRING(100) },
      delivery_terms: { type: Sequelize.STRING(100) },
      penalty_terms: { type: Sequelize.TEXT },
      scope_of_work: { type: Sequelize.TEXT },
      terms_conditions: { type: Sequelize.TEXT },
      auto_renew: { type: Sequelize.BOOLEAN, defaultValue: false },
      renewal_notice_days: { type: Sequelize.INTEGER, defaultValue: 30 },
      signed_date: { type: Sequelize.DATEONLY },
      signed_by: { type: Sequelize.STRING(100) },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 9. epr_evaluations
    await queryInterface.createTable('epr_evaluations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      vendor_name: { type: Sequelize.STRING(200) },
      evaluation_period: { type: Sequelize.STRING(20) },
      quality_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      delivery_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      price_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      service_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      compliance_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      overall_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      grade: { type: Sequelize.STRING(5) },
      strengths: { type: Sequelize.JSONB, defaultValue: [] },
      weaknesses: { type: Sequelize.JSONB, defaultValue: [] },
      recommendations: { type: Sequelize.TEXT },
      evaluated_by: { type: Sequelize.INTEGER },
      evaluated_by_name: { type: Sequelize.STRING(100) },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 10. epr_settings
    await queryInterface.createTable('epr_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      setting_key: { type: Sequelize.STRING(100), allowNull: false },
      setting_value: { type: Sequelize.JSONB },
      description: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('epr_settings');
    await queryInterface.dropTable('epr_evaluations');
    await queryInterface.dropTable('epr_contracts');
    await queryInterface.dropTable('epr_procurement_requests');
    await queryInterface.dropTable('epr_tender_bids');
    await queryInterface.dropTable('epr_tenders');
    await queryInterface.dropTable('epr_rfq_responses');
    await queryInterface.dropTable('epr_rfq_items');
    await queryInterface.dropTable('epr_rfqs');
    await queryInterface.dropTable('epr_vendors');
  }
};
