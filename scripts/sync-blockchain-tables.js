'use strict';
const { Sequelize } = require('sequelize');
const config = require('../config/database');
const sq = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  { host: config.development.host, port: config.development.port, dialect: config.development.dialect, logging: false }
);

async function main() {
  // Drop simplified tables created earlier
  await sq.query('DROP TABLE IF EXISTS "transaction_blocks" CASCADE');
  await sq.query('DROP TABLE IF EXISTS "audit_receipts" CASCADE');
  await sq.query('DROP TABLE IF EXISTS "chain_verification_logs" CASCADE');
  console.log('Old tables dropped');

  // Re-sync with full model definitions
  const TransactionBlock = require('../models/TransactionBlock');
  const AuditReceipt = require('../models/AuditReceipt');
  const ChainVerificationLog = require('../models/ChainVerificationLog');

  await TransactionBlock.sync({ force: false });
  console.log('OK: TransactionBlock');

  await AuditReceipt.sync({ force: false });
  console.log('OK: AuditReceipt');

  await ChainVerificationLog.sync({ force: false });
  console.log('OK: ChainVerificationLog');

  // Verify
  const [rows] = await sq.query(
    "SELECT tablename::text FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename LIKE 'transaction_%' OR tablename LIKE 'chain_%' OR tablename LIKE 'audit_%'"
  );
  for (const t of rows) console.log('Table:', t.tablename);

  await sq.close();
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
