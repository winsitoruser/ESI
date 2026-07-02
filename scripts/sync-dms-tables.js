'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  { host: config.development.host, port: config.development.port, dialect: config.development.dialect, logging: false }
);

async function main() {
  const models = {
    DmsFile: require('../models/DmsFile'),
    DmsFolder: require('../models/DmsFolder'),
    DmsMataElangShare: require('../models/DmsMataElangShare'),
    DmsLetter: require('../models/DmsLetter'),
    DmsSignature: require('../models/DmsSignature'),
    DmsPpidRequest: require('../models/DmsPpidRequest'),
    DmsDisposalBatch: require('../models/DmsDisposalBatch'),
    DmsDisposition: require('../models/DmsDisposition'),
    DmsAccessLog: require('../models/DmsAccessLog'),
    DmsHierarchyNode: require('../models/DmsHierarchyNode'),
    DmsKnowledgeEdge: require('../models/DmsKnowledgeEdge'),
    DmsOpenDataset: require('../models/DmsOpenDataset'),
    DmsRecordsClassification: require('../models/DmsRecordsClassification'),
    DmsRetentionPolicy: require('../models/DmsRetentionPolicy'),
  };

  for (const [name, model] of Object.entries(models)) {
    try {
      await model.sync({ alter: false, force: false });
      console.log('OK: ' + name + ' -> ' + model.tableName);
    } catch (e) {
      console.log('FAIL: ' + name + ' - ' + e.message.substring(0, 120));
    }
  }

  // Blockchain models
  const bcModels = {
    TransactionBlock: require('../models/TransactionBlock'),
    AuditReceipt: require('../models/AuditReceipt'),
    ChainVerificationLog: require('../models/ChainVerificationLog'),
  };
  for (const [name, model] of Object.entries(bcModels)) {
    try {
      await model.sync({ alter: false, force: false });
      console.log('OK: ' + name + ' -> ' + (model.tableName || '(auto)'));
    } catch (e) {
      console.log('FAIL: ' + name + ' - ' + e.message.substring(0, 120));
    }
  }

  // Verify
  const [tables] = await sequelize.query(
    "SELECT tablename::text FROM pg_catalog.pg_tables WHERE schemaname='public' AND (tablename LIKE 'dms_%' OR tablename LIKE 'transaction_%' OR tablename LIKE 'chain_%' OR tablename LIKE 'audit_%') ORDER BY tablename"
  );
  console.log('\n=== CREATED TABLES ===');
  for (const t of tables) console.log('  ' + t.tablename);
  console.log('Total: ' + tables.length);

  await sequelize.close();
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
