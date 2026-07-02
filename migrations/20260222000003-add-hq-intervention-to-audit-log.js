'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add HQ intervention tracking columns to audit_logs
    await queryInterface.addColumn('audit_logs', 'is_hq_intervention', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'True jika aksi dilakukan oleh Admin Pusat ke data cabang'
    });

    await queryInterface.addColumn('audit_logs', 'target_branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID cabang yang datanya diintervensi oleh Pusat'
    });

    await queryInterface.addColumn('audit_logs', 'user_role', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Role user yang melakukan aksi'
    });

    await queryInterface.addColumn('audit_logs', 'old_values', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Nilai sebelum perubahan'
    });

    await queryInterface.addColumn('audit_logs', 'new_values', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Nilai setelah perubahan'
    });

    await queryInterface.addColumn('audit_logs', 'intervention_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Alasan intervensi dari Pusat'
    });

    await queryInterface.addColumn('audit_logs', 'affected_records', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      comment: 'Jumlah record yang terpengaruh'
    });

    // Create indexes for efficient querying
    await queryInterface.addIndex('audit_logs', ['is_hq_intervention']);
    await queryInterface.addIndex('audit_logs', ['target_branch_id']);
    await queryInterface.addIndex('audit_logs', ['user_role']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('audit_logs', ['created_at']);
    await queryInterface.removeIndex('audit_logs', ['user_role']);
    await queryInterface.removeIndex('audit_logs', ['target_branch_id']);
    await queryInterface.removeIndex('audit_logs', ['is_hq_intervention']);

    // Remove columns
    await queryInterface.removeColumn('audit_logs', 'affected_records');
    await queryInterface.removeColumn('audit_logs', 'intervention_reason');
    await queryInterface.removeColumn('audit_logs', 'new_values');
    await queryInterface.removeColumn('audit_logs', 'old_values');
    await queryInterface.removeColumn('audit_logs', 'user_role');
    await queryInterface.removeColumn('audit_logs', 'target_branch_id');
    await queryInterface.removeColumn('audit_logs', 'is_hq_intervention');
  }
};
