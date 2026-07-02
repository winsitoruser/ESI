const db = require('../models');

async function grantAllModules() {
  try {
    // Get user
    const user = await db.User.findOne({
      where: { email: 'winsitoruser@gmail.com' },
      include: [{ model: db.Tenant, as: 'tenant' }]
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    if (!user.tenant) {
      console.log('❌ User has no tenant');
      return;
    }

    // Get all modules
    const modules = await db.Module.findAll();
    console.log(`Found ${modules.length} modules`);

    // Grant access to all modules for this tenant
    for (const module of modules) {
      await db.TenantModule.findOrCreate({
        where: {
          tenantId: user.tenantId,
          moduleId: module.id
        },
        defaults: {
          isActive: true,
          grantedBy: 'system',
          grantedAt: new Date()
        }
      });
    }

    console.log('✅ All modules have been granted to tenant');

    // Verify
    const grantedModules = await db.TenantModule.findAll({
      where: { tenantId: user.tenantId },
      include: [{ model: db.Module, as: 'module' }]
    });

    console.log(`\nUser ${user.email} now has access to ${grantedModules.length} modules:`);
    grantedModules.forEach(tm => {
      console.log(`  - ${tm.module.name} (${tm.module.code})`);
    });

  } catch (error) {
    console.error('Error granting modules:', error);
  } finally {
    process.exit();
  }
}

grantAllModules();
