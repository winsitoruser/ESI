'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. exim_partners
    await queryInterface.createTable('exim_partners', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      partner_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      partner_type: { type: Sequelize.STRING(30) },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      country: { type: Sequelize.STRING(100) },
      city: { type: Sequelize.STRING(100) },
      address: { type: Sequelize.TEXT },
      phone: { type: Sequelize.STRING(50) },
      email: { type: Sequelize.STRING(100) },
      website: { type: Sequelize.STRING(200) },
      contact_person: { type: Sequelize.STRING(100) },
      tax_id: { type: Sequelize.STRING(50) },
      certifications: { type: Sequelize.JSONB, defaultValue: [] },
      bank_details: { type: Sequelize.JSONB, defaultValue: {} },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 2. exim_shipments
    await queryInterface.createTable('exim_shipments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      trade_type: { type: Sequelize.STRING(10), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      incoterm: { type: Sequelize.STRING(10) },
      transport_mode: { type: Sequelize.STRING(20), defaultValue: 'sea' },
      partner_id: { type: Sequelize.UUID },
      partner_name: { type: Sequelize.STRING(200) },
      partner_country: { type: Sequelize.STRING(100) },
      forwarder_id: { type: Sequelize.UUID },
      forwarder_name: { type: Sequelize.STRING(200) },
      shipping_line: { type: Sequelize.STRING(100) },
      vessel_name: { type: Sequelize.STRING(100) },
      voyage_number: { type: Sequelize.STRING(50) },
      flight_number: { type: Sequelize.STRING(50) },
      booking_number: { type: Sequelize.STRING(50) },
      bl_number: { type: Sequelize.STRING(50) },
      origin_port: { type: Sequelize.STRING(100) },
      origin_country: { type: Sequelize.STRING(100) },
      destination_port: { type: Sequelize.STRING(100) },
      destination_country: { type: Sequelize.STRING(100) },
      etd: { type: Sequelize.DATE },
      eta: { type: Sequelize.DATE },
      atd: { type: Sequelize.DATE },
      ata: { type: Sequelize.DATE },
      total_weight: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      total_volume: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      total_packages: { type: Sequelize.INTEGER, defaultValue: 0 },
      goods_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      insurance_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      freight_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'USD' },
      exchange_rate: { type: Sequelize.DECIMAL(15, 4), defaultValue: 1 },
      customs_status: { type: Sequelize.STRING(30) },
      po_reference: { type: Sequelize.STRING(100) },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 3. exim_documents
    await queryInterface.createTable('exim_documents', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_id: { type: Sequelize.UUID, references: { model: 'exim_shipments', key: 'id' }, onDelete: 'CASCADE' },
      document_type: { type: Sequelize.STRING(50), allowNull: false },
      document_number: { type: Sequelize.STRING(100) },
      title: { type: Sequelize.STRING(200) },
      issuer: { type: Sequelize.STRING(200) },
      issue_date: { type: Sequelize.DATEONLY },
      expiry_date: { type: Sequelize.DATEONLY },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      file_url: { type: Sequelize.TEXT },
      file_name: { type: Sequelize.STRING(200) },
      file_size: { type: Sequelize.INTEGER },
      is_original: { type: Sequelize.BOOLEAN, defaultValue: false },
      copies_count: { type: Sequelize.INTEGER, defaultValue: 1 },
      notes: { type: Sequelize.TEXT },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 4. exim_customs
    await queryInterface.createTable('exim_customs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_id: { type: Sequelize.UUID, references: { model: 'exim_shipments', key: 'id' }, onDelete: 'CASCADE' },
      declaration_type: { type: Sequelize.STRING(10), allowNull: false },
      declaration_number: { type: Sequelize.STRING(50) },
      declaration_date: { type: Sequelize.DATEONLY },
      customs_office: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      hs_items: { type: Sequelize.JSONB, defaultValue: [] },
      total_duty: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_tax: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_excise: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_charges: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      inspection_type: { type: Sequelize.STRING(20) },
      inspection_result: { type: Sequelize.TEXT },
      clearance_date: { type: Sequelize.DATEONLY },
      release_date: { type: Sequelize.DATEONLY },
      ppjk_name: { type: Sequelize.STRING(100) },
      ppjk_license: { type: Sequelize.STRING(50) },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 5. exim_lcs
    await queryInterface.createTable('exim_lcs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_id: { type: Sequelize.UUID },
      lc_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      lc_type: { type: Sequelize.STRING(30), defaultValue: 'irrevocable' },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      applicant_name: { type: Sequelize.STRING(200) },
      beneficiary_name: { type: Sequelize.STRING(200) },
      issuing_bank: { type: Sequelize.STRING(200) },
      advising_bank: { type: Sequelize.STRING(200) },
      confirming_bank: { type: Sequelize.STRING(200) },
      amount: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'USD' },
      tolerance: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      issue_date: { type: Sequelize.DATEONLY },
      expiry_date: { type: Sequelize.DATEONLY },
      latest_ship_date: { type: Sequelize.DATEONLY },
      presentation_days: { type: Sequelize.INTEGER, defaultValue: 21 },
      payment_terms: { type: Sequelize.STRING(50), defaultValue: 'at sight' },
      tenor_days: { type: Sequelize.INTEGER },
      partial_shipment: { type: Sequelize.BOOLEAN, defaultValue: true },
      transhipment: { type: Sequelize.BOOLEAN, defaultValue: true },
      goods_description: { type: Sequelize.TEXT },
      required_documents: { type: Sequelize.JSONB, defaultValue: [] },
      special_conditions: { type: Sequelize.TEXT },
      amendments: { type: Sequelize.JSONB, defaultValue: [] },
      discrepancies: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 6. exim_containers
    await queryInterface.createTable('exim_containers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_id: { type: Sequelize.UUID, references: { model: 'exim_shipments', key: 'id' }, onDelete: 'CASCADE' },
      container_number: { type: Sequelize.STRING(20), allowNull: false },
      container_type: { type: Sequelize.STRING(10), defaultValue: '20GP' },
      seal_number: { type: Sequelize.STRING(50) },
      status: { type: Sequelize.STRING(30), defaultValue: 'empty' },
      gross_weight: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      tare_weight: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      net_weight: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      volume: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      packages: { type: Sequelize.INTEGER, defaultValue: 0 },
      goods_description: { type: Sequelize.TEXT },
      temperature: { type: Sequelize.DECIMAL(5, 2) },
      humidity: { type: Sequelize.DECIMAL(5, 2) },
      is_hazardous: { type: Sequelize.BOOLEAN, defaultValue: false },
      hazard_class: { type: Sequelize.STRING(20) },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 7. exim_costs
    await queryInterface.createTable('exim_costs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      shipment_id: { type: Sequelize.UUID, references: { model: 'exim_shipments', key: 'id' }, onDelete: 'CASCADE' },
      cost_category: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.TEXT },
      vendor_name: { type: Sequelize.STRING(200) },
      invoice_number: { type: Sequelize.STRING(50) },
      amount: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      exchange_rate: { type: Sequelize.DECIMAL(15, 4), defaultValue: 1 },
      amount_idr: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      due_date: { type: Sequelize.DATEONLY },
      paid_date: { type: Sequelize.DATEONLY },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 8. exim_hs_codes
    await queryInterface.createTable('exim_hs_codes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      hs_code: { type: Sequelize.STRING(20), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      description_id: { type: Sequelize.TEXT },
      chapter: { type: Sequelize.STRING(10) },
      section: { type: Sequelize.STRING(10) },
      duty_rate: { type: Sequelize.DECIMAL(10, 4), defaultValue: 0 },
      vat_rate: { type: Sequelize.DECIMAL(10, 4), defaultValue: 11 },
      excise_rate: { type: Sequelize.DECIMAL(10, 4), defaultValue: 0 },
      pph_rate: { type: Sequelize.DECIMAL(10, 4), defaultValue: 0 },
      unit: { type: Sequelize.STRING(20) },
      restrictions: { type: Sequelize.JSONB, defaultValue: [] },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 9. exim_settings
    await queryInterface.createTable('exim_settings', {
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
    await queryInterface.dropTable('exim_settings');
    await queryInterface.dropTable('exim_hs_codes');
    await queryInterface.dropTable('exim_costs');
    await queryInterface.dropTable('exim_containers');
    await queryInterface.dropTable('exim_lcs');
    await queryInterface.dropTable('exim_customs');
    await queryInterface.dropTable('exim_documents');
    await queryInterface.dropTable('exim_shipments');
    await queryInterface.dropTable('exim_partners');
  }
};
