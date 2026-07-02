'use strict';

/** Link CRM tasks to SFA visits — rencana (task) vs realisasi (status kunjungan). */

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    const qi = queryInterface;
    const t = 'crm_tasks';

    const desc = await qi.describeTable(t).catch(() => ({}));
    if (!desc.sfa_visit_id) {
      await qi.addColumn(t, 'sfa_visit_id', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Soft FK ke sfa_visits — task lapangan terkait kunjungan',
      });
      await qi.addIndex(t, ['tenant_id', 'sfa_visit_id'], {
        name: 'idx_crm_tasks_tenant_sfa_visit',
      });
    }
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const t = 'crm_tasks';
    try {
      await qi.removeIndex(t, 'idx_crm_tasks_tenant_sfa_visit');
    } catch (_) {}
    try {
      await qi.removeColumn(t, 'sfa_visit_id');
    } catch (_) {}
  },
};
