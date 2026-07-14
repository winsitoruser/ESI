/**
 * Migration: Humanify SaaS Phase 0 — tenant slug for multi-company public portals
 */
'use strict';

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(64)`);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_unique
      ON tenants (slug) WHERE slug IS NOT NULL
    `);

    // Detect available name columns (schemas differ across envs)
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tenants' AND table_schema = 'public'
    `);
    const names = new Set((cols || []).map((c) => c.column_name));
    const labelExpr = [
      names.has('business_name') ? 'business_name' : null,
      names.has('name') ? 'name' : null,
      names.has('code') ? 'code' : null,
      names.has('business_code') ? 'business_code' : null,
      'CAST(id AS TEXT)',
    ].filter(Boolean).join(', ');

    const [rows] = await sequelize.query(`
      SELECT id, COALESCE(${labelExpr}) AS label
      FROM tenants
      WHERE slug IS NULL OR TRIM(slug) = ''
    `);

    const slugify = (input) => {
      const base = String(input || 'tenant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
      return base || 'tenant';
    };

    for (const row of rows || []) {
      let candidate = slugify(row.label);
      let slug = candidate;
      for (let i = 0; i < 30; i++) {
        const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`;
        const [exists] = await sequelize.query(
          `SELECT 1 FROM tenants WHERE slug = :s LIMIT 1`,
          { replacements: { s: trySlug } },
        );
        if (!exists?.length) {
          slug = trySlug;
          break;
        }
      }
      await sequelize.query(`UPDATE tenants SET slug = :slug WHERE id = :id`, {
        replacements: { slug, id: row.id },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_tenants_slug_unique`);
    await queryInterface.sequelize.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS slug`);
  },
};
