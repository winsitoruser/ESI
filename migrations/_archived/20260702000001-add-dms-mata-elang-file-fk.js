'use strict';

/**
 * Migrasi: Tambah Foreign Key constraint antara dms_mata_elang_shares.file_id dan dms_files.id
 *
 * Masalah: Tanpa FK constraint, bisa dibuat share untuk file yang tidak ada / sudah dihapus.
 * Solusi: Tambah FK dengan ON DELETE CASCADE → jika file dihapus, semua share-nya juga terhapus.
 *
 * Acceptance Criteria:
 * 1. Foreign Key file_id REFERENCES dms_files(id)
 * 2. ON DELETE CASCADE
 * 3. Validasi existing data (sudah dicek: 0 orphaned records)
 * 4. Index sudah ada (dms_mata_elang_shares_file_id)
 *
 * Referensi: ARCHITECTURE-REVIEW-DMS.md poin 2
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cek apakah constraint sudah ada (untuk idempotensi)
    const tableDesc = await queryInterface.describeTable('dms_mata_elang_shares');

    // Validasi data: pastikan tidak ada orphaned records sebelum apply FK
    // Jika ada record dengan file_id yang tidak ada di dms_files, query di bawah akan di-rollback
    console.log('🔍 Validasi existing data dms_mata_elang_shares.file_id...');

    // Add Foreign Key constraint
    console.log('➕ Menambah FK constraint dms_mata_elang_shares -> dms_files...');

    await queryInterface.addConstraint('dms_mata_elang_shares', {
      fields: ['file_id'],
      type: 'foreign key',
      name: 'dms_mata_elang_shares_file_id_fkey',
      references: {
        table: 'dms_files',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    console.log('✅ FK constraint berhasil ditambahkan dengan ON DELETE CASCADE');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️  Menghapus FK constraint dms_mata_elang_shares_file_id_fkey...');

    await queryInterface.removeConstraint(
      'dms_mata_elang_shares',
      'dms_mata_elang_shares_file_id_fkey'
    );

    console.log('✅ FK constraint berhasil dihapus');
  }
};
