'use strict';

/**
 * Migration: Create lookup_options table for managing all dropdown/enum data
 * in CRM & SFA forms (priorities, sources, types, segments, etc.)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('lookup_options')) return;

    await queryInterface.createTable('lookup_options', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
      category: { type: Sequelize.STRING(80), allowNull: false },   // e.g. 'lead_source', 'priority', 'visit_type'
      value: { type: Sequelize.STRING(100), allowNull: false },      // stored value e.g. 'cold_call'
      label: { type: Sequelize.STRING(150), allowNull: false },      // display label e.g. 'Cold Call'
      color: { type: Sequelize.STRING(30) },                         // optional color for badges
      icon: { type: Sequelize.STRING(50) },                          // optional icon name
      description: { type: Sequelize.STRING(255) },                  // optional description
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },  // default selection
      is_system: { type: Sequelize.BOOLEAN, defaultValue: false },   // system-provided, cannot delete
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      metadata: { type: Sequelize.JSONB, defaultValue: '{}' },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('lookup_options', ['tenant_id', 'category'], { name: 'idx_lookup_tenant_cat' });
    await queryInterface.addIndex('lookup_options', ['category', 'is_active'], { name: 'idx_lookup_cat_active' });
    await queryInterface.addConstraint('lookup_options', {
      fields: ['tenant_id', 'category', 'value'],
      type: 'unique',
      name: 'uq_lookup_tenant_cat_val',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lookup_options').catch(() => {});
  }
};
