'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns for customer type and corporate fields
    await queryInterface.addColumn('customers', 'customerType', {
      type: Sequelize.ENUM('individual', 'corporate'),
      defaultValue: 'individual',
      allowNull: false,
      after: 'type'
    });

    await queryInterface.addColumn('customers', 'companyName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'customerType'
    });

    await queryInterface.addColumn('customers', 'picName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Person In Charge Name',
      after: 'companyName'
    });

    await queryInterface.addColumn('customers', 'picPosition', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Person In Charge Position',
      after: 'picName'
    });

    await queryInterface.addColumn('customers', 'contact1', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Primary Contact Number',
      after: 'picPosition'
    });

    await queryInterface.addColumn('customers', 'contact2', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Secondary Contact Number',
      after: 'contact1'
    });

    await queryInterface.addColumn('customers', 'companyEmail', {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      after: 'contact2'
    });

    await queryInterface.addColumn('customers', 'companyAddress', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'companyEmail'
    });

    await queryInterface.addColumn('customers', 'taxId', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'NPWP or Tax ID',
      after: 'companyAddress'
    });

    // Add index for customerType
    await queryInterface.addIndex('Customers', ['customerType'], {
      name: 'idx_customers_customer_type'
    });

    // Add index for companyName
    await queryInterface.addIndex('Customers', ['companyName'], {
      name: 'idx_customers_company_name'
    });

    console.log('✅ Customer table updated with corporate fields');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('Customers', 'idx_customers_customer_type');
    await queryInterface.removeIndex('Customers', 'idx_customers_company_name');

    // Remove columns
    await queryInterface.removeColumn('customers', 'taxId');
    await queryInterface.removeColumn('customers', 'companyAddress');
    await queryInterface.removeColumn('customers', 'companyEmail');
    await queryInterface.removeColumn('customers', 'contact2');
    await queryInterface.removeColumn('customers', 'contact1');
    await queryInterface.removeColumn('customers', 'picPosition');
    await queryInterface.removeColumn('customers', 'picName');
    await queryInterface.removeColumn('customers', 'companyName');
    await queryInterface.removeColumn('customers', 'customerType');

    console.log('✅ Customer corporate fields removed');
  }
};
