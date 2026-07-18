#!/usr/bin/env node
/**
 * Seed / refresh a Humanify demo tenant for sales demos.
 * Defaults to slug `demo` — override with DEMO_TENANT_SLUG.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-humanify-demo-tenant.js
 *   npm run seed:demo-tenant
 */
process.env.QA_GOLDEN_SLUG = process.env.DEMO_TENANT_SLUG || process.env.QA_GOLDEN_SLUG || 'demo';
process.env.QA_GOLDEN_COMPANY = process.env.DEMO_TENANT_COMPANY || process.env.QA_GOLDEN_COMPANY || 'Humanify Demo Co';
process.env.QA_GOLDEN_EMAIL = process.env.DEMO_TENANT_EMAIL || process.env.QA_GOLDEN_EMAIL || 'demo@humanify.test';

require('./seed-humanify-qa-golden.js');
