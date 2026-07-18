const { Sequelize } = require('sequelize');
const config = require('../config/database');

// CLS so request-bound transactions attach to all queries in the async chain
try {
  const cls = require('cls-hooked');
  const ns = cls.createNamespace('humanify-tenant');
  Sequelize.useCLS(ns);
} catch (e) {
  console.warn('[sequelize] cls-hooked unavailable — HUMANIFY_RLS_REQUEST_BOUND will be limited');
}

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions || {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
