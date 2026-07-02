'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const returnsDesc = await queryInterface.describeTable('returns').catch(() => null);
    if (!returnsDesc) {
      console.log('⚠️ Table "returns" does not exist, skipping');
      return;
    }

    if (!returnsDesc.invoice_number) {
      await queryInterface.addColumn('returns', 'invoice_number', {
        type: Sequelize.STRING(100),
        comment: 'Nomor faktur/invoice dari distributor'
      });
    }

    if (!returnsDesc.invoice_date) {
      await queryInterface.addColumn('returns', 'invoice_date', {
        type: Sequelize.DATE,
        comment: 'Tanggal faktur/invoice'
      });
    }

    if (!returnsDesc.distributor_name) {
      await queryInterface.addColumn('returns', 'distributor_name', {
        type: Sequelize.STRING(255),
        comment: 'Nama distributor/supplier'
      });
    }

    if (!returnsDesc.distributor_phone) {
      await queryInterface.addColumn('returns', 'distributor_phone', {
        type: Sequelize.STRING(50),
        comment: 'No. telepon distributor'
      });
    }

    if (!returnsDesc.purchase_date) {
      await queryInterface.addColumn('returns', 'purchase_date', {
        type: Sequelize.DATE,
        comment: 'Tanggal pembelian dari distributor'
      });
    }

    await queryInterface.addIndex('returns', ['invoice_number'], { name: 'idx_returns_invoice_number' }).catch(() => {});
    await queryInterface.addIndex('returns', ['distributor_name'], { name: 'idx_returns_distributor_name' }).catch(() => {});

    console.log('✅ Added invoice columns to returns table');
  },

  down: async (queryInterface) => {
    const cols = ['invoice_number', 'invoice_date', 'distributor_name', 'distributor_phone', 'purchase_date'];
    for (const col of cols) {
      await queryInterface.removeColumn('returns', col).catch(() => {});
    }
  }
};
