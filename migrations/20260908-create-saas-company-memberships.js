'use strict';

/** Humanify multi-company memberships — user ↔ tenant (owner/admin switcher). */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS saas_company_memberships (
        id UUID PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        tenant_id UUID NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'owner',
        is_default BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_switched_at TIMESTAMPTZ
      )
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_co_mem_user_tenant
      ON saas_company_memberships (user_id, tenant_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_saas_co_mem_user
      ON saas_company_memberships (user_id, status)
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM saas_company_memberships m
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m.tenant_id)
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE saas_company_memberships
          ADD CONSTRAINT fk_saas_co_mem_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO saas_company_memberships
        (id, user_id, tenant_id, role, is_default, status, created_at, updated_at)
      SELECT gen_random_uuid(), CAST(u.id AS TEXT), u.tenant_id,
        CASE
          WHEN lower(u.role::text) IN ('owner', 'super_admin', 'superadmin', 'platform_admin') THEN 'owner'
          WHEN lower(u.role::text) IN ('admin', 'hq_admin', 'hr_admin') THEN 'admin'
          ELSE 'member'
        END,
        true, 'active', NOW(), NOW()
      FROM users u
      WHERE u.tenant_id IS NOT NULL
        AND lower(COALESCE(u.role::text, '')) NOT IN ('super_admin', 'superadmin', 'platform_admin')
        AND NOT EXISTS (
          SELECT 1 FROM saas_company_memberships m
          WHERE m.user_id = CAST(u.id AS TEXT) AND m.tenant_id = u.tenant_id
        )
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS saas_company_memberships');
  },
};
