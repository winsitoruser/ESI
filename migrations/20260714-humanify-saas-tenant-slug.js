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

    // Backfill from business_name / name / code
    const [rows] = await sequelize.query(`
      SELECT id, COALESCE(business_name, name, code, business_code, CAST(id AS TEXT)) AS label
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
