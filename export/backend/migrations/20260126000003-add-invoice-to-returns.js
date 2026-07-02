'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('returns', 'invoice_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Nomor faktur/invoice dari distributor'
    });

    await queryInterface.addColumn('returns', 'invoice_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tanggal faktur/invoice'
    });

    await queryInterface.addColumn('returns', 'distributor_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama distributor/supplier'
    });

    await queryInterface.addColumn('returns', 'distributor_phone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'No. telepon distributor'
    });

    await queryInterface.addColumn('returns', 'purchase_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Tanggal pembelian dari distributor'
    });

    // Add index for invoice_number for faster search
    await queryInterface.addIndex('returns', ['invoice_number'], {
      name: 'idx_returns_invoice_number'
    });

    // Add index for distributor_name
    await queryInterface.addIndex('returns', ['distributor_name'], {
      name: 'idx_returns_distributor_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('returns', 'idx_returns_invoice_number');
    await queryInterface.removeIndex('returns', 'idx_returns_distributor_name');
    await queryInterface.removeColumn('returns', 'invoice_number');
    await queryInterface.removeColumn('returns', 'invoice_date');
    await queryInterface.removeColumn('returns', 'distributor_name');
    await queryInterface.removeColumn('returns', 'distributor_phone');
    await queryInterface.removeColumn('returns', 'purchase_date');
  }
};
