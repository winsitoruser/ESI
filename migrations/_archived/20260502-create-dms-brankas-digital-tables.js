'use strict';

/**
 * Brankas Digital Nasional — File Management System (Document Management).
 *
 * Tabel:
 *   1. dms_folders               — hierarki folder
 *   2. dms_files                 — metadata file (binary di object store)
 *   3. dms_mata_elang_shares     — share self-destruct (James Bond mode)
 *   4. dms_access_logs           — audit trail immutable
 *   5. dms_retention_policies    — kebijakan retensi & lifecycle
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ─────────────── 1. dms_folders ───────────────
    await queryInterface.createTable('dms_folders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      parent_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      path: { type: Sequelize.STRING(1024), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      classification: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'internal' },
      owner_id: { type: Sequelize.INTEGER, allowNull: true },
      branch_id: { type: Sequelize.UUID, allowNull: true },
      department: { type: Sequelize.STRING(120), allowNull: true },
      files_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_size_bytes: { type: Sequelize.BIGINT, defaultValue: 0 },
      is_locked: { type: Sequelize.BOOLEAN, defaultValue: false },
      permissions: { type: Sequelize.JSONB, defaultValue: { read: [], write: [], admin: [] } },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_folders', ['tenant_id']);
    await queryInterface.addIndex('dms_folders', ['parent_id']);

    // ─────────────── 2. dms_files ───────────────
    await queryInterface.createTable('dms_files', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      parent_folder_id: { type: Sequelize.UUID, allowNull: true },

      name: { type: Sequelize.STRING(500), allowNull: false },
      file_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'document' },
      mime_type: { type: Sequelize.STRING(150), allowNull: true },
      extension: { type: Sequelize.STRING(20), allowNull: true },
      size_bytes: { type: Sequelize.BIGINT, defaultValue: 0 },
      checksum_sha256: { type: Sequelize.STRING(64), allowNull: true },

      classification: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'internal',
        comment: 'public | internal | confidential | top_secret' },
      storage_tier: { type: Sequelize.STRING(20), defaultValue: 'hot',
        comment: 'hot | warm | cold | vault' },
      storage_region: { type: Sequelize.STRING(20), defaultValue: 'id-jk' },
      storage_key: { type: Sequelize.STRING(500), allowNull: true },
      replication_regions: { type: Sequelize.JSONB, defaultValue: [] },

      encryption_envelope: { type: Sequelize.JSONB, allowNull: true,
        comment: 'wrapped DEK + IV + tag + KEK version' },

      version_label: { type: Sequelize.STRING(20), defaultValue: 'v1' },
      is_current_version: { type: Sequelize.BOOLEAN, defaultValue: true },
      previous_version_id: { type: Sequelize.UUID, allowNull: true },

      owner_id: { type: Sequelize.INTEGER, allowNull: true },
      owner_name: { type: Sequelize.STRING(120), allowNull: true },
      branch_id: { type: Sequelize.UUID, allowNull: true },
      department: { type: Sequelize.STRING(120), allowNull: true },

      tags: { type: Sequelize.JSONB, defaultValue: [] },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      ocr_text: { type: Sequelize.TEXT, allowNull: true },
      ai_category: { type: Sequelize.STRING(80), allowNull: true },
      ai_confidence: { type: Sequelize.DECIMAL(5,2), defaultValue: 0 },

      retention_until: { type: Sequelize.DATE, allowNull: true },
      legal_hold: { type: Sequelize.BOOLEAN, defaultValue: false },

      status: { type: Sequelize.STRING(20), defaultValue: 'active',
        comment: 'active | archived | quarantined | destroyed' },
      destroyed_at: { type: Sequelize.DATE, allowNull: true },
      destroyed_reason: { type: Sequelize.STRING(40), allowNull: true },

      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_files', ['tenant_id']);
    await queryInterface.addIndex('dms_files', ['parent_folder_id']);
    await queryInterface.addIndex('dms_files', ['classification']);
    await queryInterface.addIndex('dms_files', ['storage_tier']);
    await queryInterface.addIndex('dms_files', ['status']);

    // ─────────────── 3. dms_mata_elang_shares ───────────────
    await queryInterface.createTable('dms_mata_elang_shares', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      file_id: { type: Sequelize.UUID, allowNull: false },
      share_code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      magic_link: { type: Sequelize.STRING(500), allowNull: true },

      sender_id: { type: Sequelize.INTEGER, allowNull: true },
      sender_name: { type: Sequelize.STRING(120), allowNull: true },

      recipient_type: { type: Sequelize.STRING(30), defaultValue: 'user',
        comment: 'user | external_email | role | group' },
      recipient_identifier: { type: Sequelize.STRING(255), allowNull: false },
      recipient_name: { type: Sequelize.STRING(200), allowNull: true },
      recipient_channel: { type: Sequelize.STRING(20), defaultValue: 'in-app' },

      destruct_mode: { type: Sequelize.STRING(20), defaultValue: 'cipher_burn',
        comment: 'cipher_burn | glitch | vapor | honeypot' },
      window_seconds: { type: Sequelize.INTEGER, defaultValue: 300 },
      max_opens: { type: Sequelize.INTEGER, defaultValue: 1 },

      geofence: { type: Sequelize.JSONB, defaultValue: [] },
      ip_allowlist: { type: Sequelize.JSONB, defaultValue: [] },
      require_mfa: { type: Sequelize.BOOLEAN, defaultValue: false },
      watermark: { type: Sequelize.BOOLEAN, defaultValue: true },
      bind_device_fingerprint: { type: Sequelize.BOOLEAN, defaultValue: false },
      bound_fingerprint: { type: Sequelize.STRING(120), allowNull: true },

      wrapped_dek: { type: Sequelize.TEXT, allowNull: true,
        comment: 'wrapped DEK; di-NULL-kan saat cipher_burn (crypto-shred)' },
      envelope_meta: { type: Sequelize.JSONB, allowNull: true },

      first_opened_at: { type: Sequelize.DATE, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      opens_count: { type: Sequelize.INTEGER, defaultValue: 0 },

      status: { type: Sequelize.STRING(20), defaultValue: 'pending',
        comment: 'pending | armed | active | destroyed | revoked' },
      destroyed_at: { type: Sequelize.DATE, allowNull: true },
      destroyed_reason: { type: Sequelize.STRING(40), allowNull: true },
      final_message: { type: Sequelize.TEXT, allowNull: true },

      last_ip: { type: Sequelize.STRING(64), allowNull: true },
      last_region: { type: Sequelize.STRING(20), allowNull: true },
      last_user_agent: { type: Sequelize.STRING(255), allowNull: true },
      last_opened_at: { type: Sequelize.DATE, allowNull: true },

      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_mata_elang_shares', ['tenant_id']);
    await queryInterface.addIndex('dms_mata_elang_shares', ['file_id']);
    await queryInterface.addIndex('dms_mata_elang_shares', ['recipient_identifier']);
    await queryInterface.addIndex('dms_mata_elang_shares', ['status']);
    await queryInterface.addIndex('dms_mata_elang_shares', ['expires_at']);

    // ─────────────── 4. dms_access_logs ───────────────
    await queryInterface.createTable('dms_access_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      file_id: { type: Sequelize.UUID, allowNull: true },
      share_id: { type: Sequelize.UUID, allowNull: true },

      action: { type: Sequelize.STRING(40), allowNull: false },
      actor_id: { type: Sequelize.INTEGER, allowNull: true },
      actor_name: { type: Sequelize.STRING(120), allowNull: true },
      actor_role: { type: Sequelize.STRING(40), allowNull: true },

      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      region: { type: Sequelize.STRING(20), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      device_fingerprint: { type: Sequelize.STRING(120), allowNull: true },

      result: { type: Sequelize.STRING(20), defaultValue: 'success' },
      reason: { type: Sequelize.STRING(40), allowNull: true },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },

      prev_hash: { type: Sequelize.STRING(64), allowNull: true },
      hash: { type: Sequelize.STRING(64), allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('dms_access_logs', ['tenant_id']);
    await queryInterface.addIndex('dms_access_logs', ['file_id']);
    await queryInterface.addIndex('dms_access_logs', ['share_id']);
    await queryInterface.addIndex('dms_access_logs', ['action']);
    await queryInterface.addIndex('dms_access_logs', ['actor_id']);
    await queryInterface.addIndex('dms_access_logs', ['created_at']);

    // ─────────────── 5. dms_retention_policies ───────────────
    await queryInterface.createTable('dms_retention_policies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      applies_to: { type: Sequelize.JSONB, defaultValue: { tags: [], categories: [], departments: [] } },
      hot_to_warm_days: { type: Sequelize.INTEGER, defaultValue: 30 },
      warm_to_cold_days: { type: Sequelize.INTEGER, defaultValue: 90 },
      destroy_after_days: { type: Sequelize.INTEGER, defaultValue: 0 },
      legal_basis: { type: Sequelize.STRING(80), allowNull: true },
      requires_approval_to_delete: { type: Sequelize.BOOLEAN, defaultValue: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dms_retention_policies');
    await queryInterface.dropTable('dms_access_logs');
    await queryInterface.dropTable('dms_mata_elang_shares');
    await queryInterface.dropTable('dms_files');
    await queryInterface.dropTable('dms_folders');
  },
};
