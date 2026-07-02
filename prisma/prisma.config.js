// ============================================================
// PRISMA CONFIGURATION (Prisma 7+)
// ============================================================
//
// This file configures the database connection for Prisma CLI.
// For runtime PrismaClient usage, pass the url directly to the constructor.
//
// IMPORTANT: Prisma is READ-ONLY in this project.
// - Sequelize remains the single source of truth for schema and migrations
// - Prisma is only used for read operations, reports, and aggregation
// ============================================================

const path = require('path');

// Load environment variables - same order as Sequelize config
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.development') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please check your .env.development or .env file.'
  );
}

module.exports = {
  datasource: {
    url: databaseUrl,
  },
};
