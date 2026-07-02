/**
 * Initialize Sequelize models and associations
 * This file should be imported before using any models
 */

const FinanceAccount = require('../models/FinanceAccount');
const FinanceTransaction = require('../models/FinanceTransaction');
const FinanceBudget = require('../models/FinanceBudget');
const FinanceReceivable = require('../models/FinanceReceivable');
const FinancePayable = require('../models/FinancePayable');
const FinanceInvoice = require('../models/FinanceInvoice');
const FinanceInvoiceItem = require('../models/FinanceInvoiceItem');
const FinanceInvoicePayment = require('../models/FinanceInvoicePayment');
const FinanceReceivablePayment = require('../models/FinanceReceivablePayment');
const FinancePayablePayment = require('../models/FinancePayablePayment');

// Initialize associations if they have associate method
const models = {
  FinanceAccount,
  FinanceTransaction,
  FinanceBudget,
  FinanceReceivable,
  FinancePayable,
  FinanceInvoice,
  FinanceInvoiceItem,
  FinanceInvoicePayment,
  FinanceReceivablePayment,
  FinancePayablePayment
};

// Call associate methods if they exist
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
