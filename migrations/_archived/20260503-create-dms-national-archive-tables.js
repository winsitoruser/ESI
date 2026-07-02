'use strict';

/**
 * Brankas Digital Nasional — ekstensi tabel untuk standar arsip nasional:
 *   1. dms_records_classifications  — Pola Klasifikasi Arsip + JRA (ANRI)
 *   2. dms_letters                  — Persuratan / e-Office
 *   3. dms_dispositions             — Disposisi berjenjang
 *   4. dms_signatures               — Tanda Tangan Digital PSrE/eMaterai
 *   5. dms_ppid_requests            — Permintaan Informasi Publik (UU KIP)
 *   6. dms_knowledge_edges          — Edge graph dokumen ↔ regulasi
 *   7. dms_disposal_batches         — Pemusnahan & berita acara (UU 43/2009)
 *   8. dms_hierarchy_nodes          — Struktur Pusat → Provinsi → Desa
 *   9. dms_open_datasets            — Katalog SPBE / Satu Data Indonesia
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. dms_records_classifications
    await queryInterface.createTable('dms_records_classifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      code: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      full_path: { type: Sequelize.STRING(500), allowNull: true },
      active_period_years: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 2 },
      inactive_period_years: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 },
      final_disposition: { type: Sequelize.STRING(20), defaultValue: 'review' },
      legal_basis: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_records_classifications', ['tenant_id']);
    await queryInterface.addIndex('dms_records_classifications', ['code']);
    await queryInterface.addIndex('dms_records_classifications', ['parent_id']);
    await queryInterface.addIndex('dms_records_classifications', ['level']);

    // 2. dms_letters
    await queryInterface.createTable('dms_letters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      letter_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'incoming' },
      agenda_number: { type: Sequelize.STRING(60), allowNull: true },
      letter_number: { type: Sequelize.STRING(120), allowNull: true },
      letter_date: { type: Sequelize.DATEONLY, allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: true },
      classification_id: { type: Sequelize.UUID, allowNull: true },
      classification_code: { type: Sequelize.STRING(20), allowNull: true },
      subject: { type: Sequelize.TEXT, allowNull: false },
      summary: { type: Sequelize.TEXT, allowNull: true },
      sender_name: { type: Sequelize.STRING(200), allowNull: true },
      sender_unit: { type: Sequelize.STRING(200), allowNull: true },
      sender_address: { type: Sequelize.TEXT, allowNull: true },
      recipient_name: { type: Sequelize.STRING(200), allowNull: true },
      recipient_unit: { type: Sequelize.STRING(200), allowNull: true },
      cc: { type: Sequelize.JSONB, defaultValue: [] },
      urgency: { type: Sequelize.STRING(20), defaultValue: 'biasa' },
      security: { type: Sequelize.STRING(20), defaultValue: 'biasa' },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      file_id: { type: Sequelize.UUID, allowNull: true },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      registered_by: { type: Sequelize.INTEGER, allowNull: true },
      registered_at: { type: Sequelize.DATE, allowNull: true },
      auto_number_config: { type: Sequelize.JSONB, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_letters', ['tenant_id']);
    await queryInterface.addIndex('dms_letters', ['letter_type']);
    await queryInterface.addIndex('dms_letters', ['agenda_number']);
    await queryInterface.addIndex('dms_letters', ['letter_date']);
    await queryInterface.addIndex('dms_letters', ['status']);
    await queryInterface.addIndex('dms_letters', ['classification_code']);

    // 3. dms_dispositions
    await queryInterface.createTable('dms_dispositions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      letter_id: { type: Sequelize.UUID, allowNull: false },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      from_user_id: { type: Sequelize.INTEGER, allowNull: true },
      from_name: { type: Sequelize.STRING(200), allowNull: true },
      from_title: { type: Sequelize.STRING(150), allowNull: true },
      to_user_id: { type: Sequelize.INTEGER, allowNull: true },
      to_name: { type: Sequelize.STRING(200), allowNull: true },
      to_title: { type: Sequelize.STRING(150), allowNull: true },
      instructions: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT, allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'open' },
      answered_at: { type: Sequelize.DATE, allowNull: true },
      answer_note: { type: Sequelize.TEXT, allowNull: true },
      answer_file_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_dispositions', ['tenant_id']);
    await queryInterface.addIndex('dms_dispositions', ['letter_id']);
    await queryInterface.addIndex('dms_dispositions', ['parent_id']);
    await queryInterface.addIndex('dms_dispositions', ['to_user_id']);
    await queryInterface.addIndex('dms_dispositions', ['status']);

    // 4. dms_signatures
    await queryInterface.createTable('dms_signatures', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      file_id: { type: Sequelize.UUID, allowNull: false },
      provider: { type: Sequelize.STRING(20), defaultValue: 'bsre' },
      workflow_mode: { type: Sequelize.STRING(20), defaultValue: 'sequential' },
      signers: { type: Sequelize.JSONB, defaultValue: [] },
      ematerai_required: { type: Sequelize.BOOLEAN, defaultValue: false },
      ematerai_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      signed_file_id: { type: Sequelize.UUID, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'draft' },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      hash_algo: { type: Sequelize.STRING(20), defaultValue: 'SHA-256' },
      document_hash: { type: Sequelize.STRING(128), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_signatures', ['tenant_id']);
    await queryInterface.addIndex('dms_signatures', ['file_id']);
    await queryInterface.addIndex('dms_signatures', ['status']);
    await queryInterface.addIndex('dms_signatures', ['provider']);

    // 5. dms_ppid_requests
    await queryInterface.createTable('dms_ppid_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      ticket_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      requester_name: { type: Sequelize.STRING(200), allowNull: false },
      requester_nik: { type: Sequelize.STRING(30), allowNull: true },
      requester_address: { type: Sequelize.TEXT, allowNull: true },
      requester_phone: { type: Sequelize.STRING(30), allowNull: true },
      requester_email: { type: Sequelize.STRING(120), allowNull: true },
      requester_purpose: { type: Sequelize.TEXT, allowNull: true },
      category: { type: Sequelize.STRING(20), defaultValue: 'IPSB' },
      subject: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      channel: { type: Sequelize.STRING(20), defaultValue: 'online' },
      received_at: { type: Sequelize.DATE, allowNull: false },
      due_at: { type: Sequelize.DATE, allowNull: true },
      responded_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      ppid_officer_id: { type: Sequelize.INTEGER, allowNull: true },
      ppid_officer_name: { type: Sequelize.STRING(200), allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'received' },
      response_summary: { type: Sequelize.TEXT, allowNull: true },
      response_file_ids: { type: Sequelize.JSONB, defaultValue: [] },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      fee_amount_rp: { type: Sequelize.DECIMAL(12,2), defaultValue: 0 },
      fee_status: { type: Sequelize.STRING(20), defaultValue: 'free' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_ppid_requests', ['tenant_id']);
    await queryInterface.addIndex('dms_ppid_requests', ['status']);
    await queryInterface.addIndex('dms_ppid_requests', ['category']);
    await queryInterface.addIndex('dms_ppid_requests', ['received_at']);

    // 6. dms_knowledge_edges
    await queryInterface.createTable('dms_knowledge_edges', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      from_type: { type: Sequelize.STRING(30), allowNull: false },
      from_id: { type: Sequelize.STRING(60), allowNull: false },
      from_label: { type: Sequelize.STRING(255), allowNull: true },
      to_type: { type: Sequelize.STRING(30), allowNull: false },
      to_id: { type: Sequelize.STRING(60), allowNull: false },
      to_label: { type: Sequelize.STRING(255), allowNull: true },
      relation: { type: Sequelize.STRING(40), allowNull: false },
      weight: { type: Sequelize.DECIMAL(5,2), defaultValue: 1.0 },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      source: { type: Sequelize.STRING(30), defaultValue: 'manual' },
      confidence: { type: Sequelize.DECIMAL(5,2), defaultValue: 100 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_knowledge_edges', ['tenant_id']);
    await queryInterface.addIndex('dms_knowledge_edges', ['from_type', 'from_id']);
    await queryInterface.addIndex('dms_knowledge_edges', ['to_type', 'to_id']);
    await queryInterface.addIndex('dms_knowledge_edges', ['relation']);

    // 7. dms_disposal_batches
    await queryInterface.createTable('dms_disposal_batches', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      batch_number: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      disposal_type: { type: Sequelize.STRING(20), defaultValue: 'destroy' },
      initiated_by: { type: Sequelize.INTEGER, allowNull: true },
      initiated_at: { type: Sequelize.DATE, allowNull: true },
      proposal_date: { type: Sequelize.DATEONLY, allowNull: true },
      approved_date: { type: Sequelize.DATEONLY, allowNull: true },
      executed_date: { type: Sequelize.DATEONLY, allowNull: true },
      approver_chain: { type: Sequelize.JSONB, defaultValue: [] },
      file_ids: { type: Sequelize.JSONB, defaultValue: [] },
      letter_ids: { type: Sequelize.JSONB, defaultValue: [] },
      total_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_size_bytes: { type: Sequelize.BIGINT, defaultValue: 0 },
      legal_basis: { type: Sequelize.STRING(255), allowNull: true },
      destruction_method: { type: Sequelize.STRING(40), allowNull: true },
      berita_acara_file_id: { type: Sequelize.UUID, allowNull: true },
      witnesses: { type: Sequelize.JSONB, defaultValue: [] },
      status: { type: Sequelize.STRING(20), defaultValue: 'proposed' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_disposal_batches', ['tenant_id']);
    await queryInterface.addIndex('dms_disposal_batches', ['status']);
    await queryInterface.addIndex('dms_disposal_batches', ['disposal_type']);

    // 8. dms_hierarchy_nodes
    await queryInterface.createTable('dms_hierarchy_nodes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      level: { type: Sequelize.STRING(20), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      region: { type: Sequelize.STRING(20), allowNull: true },
      ipd_address: { type: Sequelize.STRING(255), allowNull: true },
      ppid_url: { type: Sequelize.STRING(255), allowNull: true },
      storage_quota_tb: { type: Sequelize.DECIMAL(10,2), defaultValue: 1 },
      storage_used_gb: { type: Sequelize.DECIMAL(15,2), defaultValue: 0 },
      files_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      letters_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      retention_policy_id: { type: Sequelize.UUID, allowNull: true },
      contact_name: { type: Sequelize.STRING(200), allowNull: true },
      contact_email: { type: Sequelize.STRING(120), allowNull: true },
      contact_phone: { type: Sequelize.STRING(40), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_hierarchy_nodes', ['tenant_id']);
    await queryInterface.addIndex('dms_hierarchy_nodes', ['parent_id']);
    await queryInterface.addIndex('dms_hierarchy_nodes', ['level']);
    await queryInterface.addIndex('dms_hierarchy_nodes', ['code']);

    // 9. dms_open_datasets
    await queryInterface.createTable('dms_open_datasets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      slug: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      publisher: { type: Sequelize.STRING(200), allowNull: true },
      contact: { type: Sequelize.STRING(200), allowNull: true },
      category: { type: Sequelize.STRING(80), allowNull: true },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      format: { type: Sequelize.STRING(20), allowNull: true },
      schema_json: { type: Sequelize.JSONB, defaultValue: {} },
      file_id: { type: Sequelize.UUID, allowNull: true },
      api_path: { type: Sequelize.STRING(255), allowNull: true },
      license: { type: Sequelize.STRING(60), defaultValue: 'CC-BY-4.0' },
      access_level: { type: Sequelize.STRING(20), defaultValue: 'public' },
      refresh_frequency: { type: Sequelize.STRING(20), defaultValue: 'monthly' },
      last_refreshed_at: { type: Sequelize.DATE, allowNull: true },
      download_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      api_hits_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_published: { type: Sequelize.BOOLEAN, defaultValue: false },
      published_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_open_datasets', ['tenant_id']);
    await queryInterface.addIndex('dms_open_datasets', ['category']);
    await queryInterface.addIndex('dms_open_datasets', ['is_published']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dms_open_datasets');
    await queryInterface.dropTable('dms_hierarchy_nodes');
    await queryInterface.dropTable('dms_disposal_batches');
    await queryInterface.dropTable('dms_knowledge_edges');
    await queryInterface.dropTable('dms_ppid_requests');
    await queryInterface.dropTable('dms_signatures');
    await queryInterface.dropTable('dms_dispositions');
    await queryInterface.dropTable('dms_letters');
    await queryInterface.dropTable('dms_records_classifications');
  },
};
