'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // epr_rfq_items: add sort_order (used by API but missing from original migration)
    await queryInterface.addColumn('epr_rfq_items', 'sort_order', {
      type: Sequelize.INTEGER, defaultValue: 0
    }).catch(() => {});

    // epr_rfq_items: add item_name alias used by rfq-items POST
    await queryInterface.addColumn('epr_rfq_items', 'item_name', {
      type: Sequelize.STRING(200)
    }).catch(() => {});

    // epr_rfq_items: add specification text used by rfq-items POST
    await queryInterface.addColumn('epr_rfq_items', 'specification', {
      type: Sequelize.TEXT
    }).catch(() => {});

    // epr_rfq_items: add estimated_price used by rfq-items POST
    await queryInterface.addColumn('epr_rfq_items', 'estimated_price', {
      type: Sequelize.DECIMAL(19, 4), defaultValue: 0
    }).catch(() => {});

    // epr_rfq_responses: add vendor_name for denormalized display
    await queryInterface.addColumn('epr_rfq_responses', 'vendor_name', {
      type: Sequelize.STRING(200)
    }).catch(() => {});

    // epr_rfq_responses: add total_price used by rfq-responses POST
    await queryInterface.addColumn('epr_rfq_responses', 'total_price', {
      type: Sequelize.DECIMAL(19, 4), defaultValue: 0
    }).catch(() => {});

    // epr_rfq_responses: add delivery_days
    await queryInterface.addColumn('epr_rfq_responses', 'delivery_days', {
      type: Sequelize.INTEGER
    }).catch(() => {});

    // epr_rfq_responses: add warranty
    await queryInterface.addColumn('epr_rfq_responses', 'warranty', {
      type: Sequelize.STRING(100)
    }).catch(() => {});

    // epr_rfq_responses: add remarks
    await queryInterface.addColumn('epr_rfq_responses', 'remarks', {
      type: Sequelize.TEXT
    }).catch(() => {});

    // epr_rfq_responses: add total_score
    await queryInterface.addColumn('epr_rfq_responses', 'total_score', {
      type: Sequelize.DECIMAL(5, 2)
    }).catch(() => {});

    // epr_tender_bids: add vendor_name for denormalized display
    await queryInterface.addColumn('epr_tender_bids', 'vendor_name', {
      type: Sequelize.STRING(200)
    }).catch(() => {});

    // epr_tender_bids: add technical_proposal
    await queryInterface.addColumn('epr_tender_bids', 'technical_proposal', {
      type: Sequelize.TEXT
    }).catch(() => {});

    // epr_tender_bids: add documents JSONB
    await queryInterface.addColumn('epr_tender_bids', 'documents', {
      type: Sequelize.JSONB, defaultValue: []
    }).catch(() => {});

    // epr_tender_bids: add evaluation_notes
    await queryInterface.addColumn('epr_tender_bids', 'evaluation_notes', {
      type: Sequelize.TEXT
    }).catch(() => {});

    // epr_tender_bids: add total_score
    await queryInterface.addColumn('epr_tender_bids', 'total_score', {
      type: Sequelize.DECIMAL(5, 2)
    }).catch(() => {});

    // epr_rfqs: add delivery_date used by rfqs POST
    await queryInterface.addColumn('epr_rfqs', 'delivery_date', {
      type: Sequelize.DATE
    }).catch(() => {});
  },

  down: async (queryInterface) => {
    const cols = [
      ['epr_rfq_items', 'sort_order'],
      ['epr_rfq_items', 'item_name'],
      ['epr_rfq_items', 'specification'],
      ['epr_rfq_items', 'estimated_price'],
      ['epr_rfq_responses', 'vendor_name'],
      ['epr_rfq_responses', 'total_price'],
      ['epr_rfq_responses', 'delivery_days'],
      ['epr_rfq_responses', 'warranty'],
      ['epr_rfq_responses', 'remarks'],
      ['epr_rfq_responses', 'total_score'],
      ['epr_tender_bids', 'vendor_name'],
      ['epr_tender_bids', 'technical_proposal'],
      ['epr_tender_bids', 'documents'],
      ['epr_tender_bids', 'evaluation_notes'],
      ['epr_tender_bids', 'total_score'],
      ['epr_rfqs', 'delivery_date'],
    ];
    for (const [table, col] of cols) {
      await queryInterface.removeColumn(table, col).catch(() => {});
    }
  }
};
