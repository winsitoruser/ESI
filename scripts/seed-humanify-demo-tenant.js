#!/usr/bin/env node
/**
 * Seed / refresh the Humanify sales demo tenant + login (slug `demo`).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-humanify-demo-tenant.js
 *   npm run seed:demo-tenant
 */
process.env.DEMO_TENANT_SLUG = process.env.DEMO_TENANT_SLUG || 'demo';
process.env.DEMO_TENANT_COMPANY =
  process.env.DEMO_TENANT_COMPANY || 'PT Nusantara Karya Demo';
process.env.DEMO_TENANT_EMAIL = process.env.DEMO_TENANT_EMAIL || 'demo@humanify.id';
process.env.DEMO_TENANT_PASSWORD = process.env.DEMO_TENANT_PASSWORD || 'DemoHumanify1!';

require('./seed-humanify-sales-demo-account.js');
