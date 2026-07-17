#!/usr/bin/env node
/**
 * Soft-purge tenants whose offboarding grace window has elapsed.
 * Usage:
 *   node scripts/purge-offboarded-tenants.js
 *
 * Cron: installed by scripts/ensure-humanify-crons.sh (daily soft-purge).
 */
require('./_load-env')();
const { Sequelize } = require('sequelize');

function buildSequelize() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) return new Sequelize(url, { logging: false, dialect: 'postgres' });
  return new Sequelize(
    process.env.DB_NAME || 'humanify',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
    },
  );
}

async function main() {
  const sequelize = buildSequelize();
  try {
    try {
      await sequelize.query(`ALTER TYPE enum_tenants_status ADD VALUE IF NOT EXISTS 'archived'`);
    } catch { /* */ }

    const [rows] = await sequelize.query(`
      SELECT id, slug, settings
      FROM tenants
      WHERE COALESCE(status::text, '') NOT IN ('archived')
        AND settings IS NOT NULL
        AND COALESCE((settings::jsonb)->'offboarding'->>'status', '') = 'requested'
        AND NULLIF((settings::jsonb)->'offboarding'->>'graceUntil', '') IS NOT NULL
        AND ((settings::jsonb)->'offboarding'->>'graceUntil')::timestamptz < NOW()
      ORDER BY ((settings::jsonb)->'offboarding'->>'graceUntil')::timestamptz ASC
      LIMIT 100
    `);

    const slugs = [];
    for (const row of rows || []) {
      const settings = typeof row.settings === 'string'
        ? JSON.parse(row.settings || '{}')
        : (row.settings || {});
      settings.offboarding = {
        ...(settings.offboarding || {}),
        status: 'purged',
        purgedAt: new Date().toISOString(),
      };
      await sequelize.query(
        `UPDATE tenants
         SET status = 'archived',
             settings = CAST(:settings AS jsonb),
             updated_at = NOW()
         WHERE id = :id`,
        { replacements: { id: row.id, settings: JSON.stringify(settings) } },
      );
      if (row.slug) slugs.push(row.slug);
    }

    console.log(JSON.stringify({
      ok: true,
      at: new Date().toISOString(),
      matched: (rows || []).length,
      purged: (rows || []).length,
      slugs,
    }));
  } finally {
    await sequelize.close();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e?.message || String(e) }));
  process.exit(1);
});
