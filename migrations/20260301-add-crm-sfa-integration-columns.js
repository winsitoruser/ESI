'use strict';

/**
 * Add cross-integration columns between CRM and SFA modules.
 * These columns enable linking SFA leads → CRM customers, 
 * SFA visits → CRM interactions, and SFA pipeline → CRM forecasts.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, column, type) => {
      try {
        await queryInterface.addColumn(table, column, type);
        console.log(`✅ Added ${table}.${column}`);
      } catch (e) {
        if (e.message?.includes('already exists') || e.original?.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  ${table}.${column} already exists`);
        } else {
          console.error(`❌ Failed ${table}.${column}:`, e.message);
        }
      }
    };

    // crm_customers: link back to SFA lead
    await addCol('crm_customers', 'source_lead_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: { model: 'sfa_leads', key: 'id' },
      comment: 'SFA lead that was converted to this customer'
    });

    // crm_interactions: link back to SFA visit
    await addCol('crm_interactions', 'source_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Source type: sfa_visit, sfa_lead, manual'
    });
    await addCol('crm_interactions', 'source_visit_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: { model: 'sfa_visits', key: 'id' },
      comment: 'SFA visit linked to this interaction'
    });

    // crm_forecasts: link back to SFA pipeline
    await addCol('crm_forecasts', 'source_pipeline_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      comment: 'SFA pipeline stage that generated this forecast'
    });

    // crm_forecast_items: link to SFA opportunity
    await addCol('crm_forecast_items', 'source_opportunity_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: { model: 'sfa_opportunities', key: 'id' },
      comment: 'SFA opportunity synced to this forecast item'
    });

    // sfa_leads: converted tracking
    await addCol('sfa_leads', 'converted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When lead was converted to CRM customer'
    });
    await addCol('sfa_leads', 'converted_by', {
      type: Sequelize.STRING(36),
      allowNull: true,
      comment: 'User who converted the lead'
    });

    // Add indexes for faster cross-module lookups
    const addIdx = async (table, columns, name) => {
      try {
        await queryInterface.addIndex(table, columns, { name });
        console.log(`✅ Index ${name}`);
      } catch (e) {
        console.log(`⏭️  Index ${name} already exists or failed`);
      }
    };

    await addIdx('crm_customers', ['source_lead_id'], 'idx_crm_cust_source_lead');
    await addIdx('crm_interactions', ['source_visit_id'], 'idx_crm_int_source_visit');
    await addIdx('crm_forecast_items', ['source_opportunity_id'], 'idx_crm_fi_source_opp');
  },

  async down(queryInterface) {
    const rmCol = async (table, column) => {
      try { await queryInterface.removeColumn(table, column); } catch (e) {}
    };
    await rmCol('crm_customers', 'source_lead_id');
    await rmCol('crm_interactions', 'source_type');
    await rmCol('crm_interactions', 'source_visit_id');
    await rmCol('crm_forecasts', 'source_pipeline_id');
    await rmCol('crm_forecast_items', 'source_opportunity_id');
    await rmCol('sfa_leads', 'converted_at');
    await rmCol('sfa_leads', 'converted_by');
  }
};
