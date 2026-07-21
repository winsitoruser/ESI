/**
 * Shared tenant DB context for Humanify cron/job scripts (plain JS).
 * Mirrors lib/saas/run-with-tenant-db-context.ts for Sequelize cron runners.
 */
async function setTenantContext(sequelize, tenantId, opts = {}) {
  const isSuper = Boolean(opts.isSuperAdmin);
  try {
    await sequelize.query(`SELECT set_config('app.is_super_admin', :flag, true)`, {
      replacements: { flag: isSuper ? 'true' : 'false' },
    });
    if (tenantId) {
      await sequelize.query(`SELECT set_config('app.current_tenant', :tid, true)`, {
        replacements: { tid: String(tenantId) },
      });
    } else {
      await sequelize.query(`SELECT set_config('app.current_tenant', '', true)`);
    }
  } catch {
    /* older PG / no permission — soft mode still works */
  }
}

async function clearTenantContext(sequelize) {
  await setTenantContext(sequelize, null, { isSuperAdmin: false });
}

async function withTenantContext(sequelize, tenantId, fn, opts = {}) {
  await setTenantContext(sequelize, tenantId, opts);
  try {
    return await fn(tenantId);
  } finally {
    await clearTenantContext(sequelize);
  }
}

/** Platform maintenance: bypass RLS via is_super_admin (use sparingly). */
async function withSuperAdminContext(sequelize, fn) {
  await setTenantContext(sequelize, null, { isSuperAdmin: true });
  try {
    return await fn();
  } finally {
    await clearTenantContext(sequelize);
  }
}

module.exports = {
  setTenantContext,
  clearTenantContext,
  withTenantContext,
  withSuperAdminContext,
};
