const bcrypt = require('bcryptjs');
const sequelize = require('../lib/sequelize');

async function setup() {
  try {
    // 1. Check table columns
    const [tmCols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_modules' ORDER BY ordinal_position"
    );
    console.log('tenant_modules columns:', tmCols.map(x => x.column_name).join(', '));

    const [userCols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('users columns:', userCols.map(x => x.column_name).join(', '));
    const uCols = userCols.map(x => x.column_name);

    // 2. Check if superadmin exists
    const [existing] = await sequelize.query(
      "SELECT id, email, role, tenant_id FROM users WHERE email = 'superadmin@bedagang.com'"
    );
    console.log('\nExisting superadmin:', existing.length ? existing[0] : 'NONE');

    // 3. Get or create tenant
    let tenantId;
    if (existing.length > 0 && existing[0].tenant_id) {
      tenantId = existing[0].tenant_id;
      console.log('\nUsing user existing tenant:', tenantId);
    } else {
      const [tenants] = await sequelize.query(
        "SELECT id, business_name FROM tenants LIMIT 1"
      );
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
        console.log('\nUsing first tenant:', tenants[0].business_name, tenantId);
      } else {
        const [bts] = await sequelize.query("SELECT id FROM business_types LIMIT 1");
        const btId = bts.length > 0 ? bts[0].id : null;
        const [newTenant] = await sequelize.query(
          `INSERT INTO tenants (business_type_id, business_name, business_address, business_phone, business_email, setup_completed, onboarding_step, kyb_status, is_active, status, created_at, updated_at)
           VALUES ($1, 'Super Admin Tenant', 'Admin Office', '08123456789', 'superadmin@bedagang.com', true, 'completed', 'approved', true, 'active', NOW(), NOW())
           RETURNING id`,
          { bind: [btId] }
        );
        tenantId = newTenant[0].id;
        console.log('\nCreated tenant:', tenantId);
      }
    }

    // 4. Create or update superadmin user
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    const hasUpdatedAt = uCols.includes('updated_at');
    const tsCol = hasUpdatedAt ? 'updated_at' : (uCols.includes('updatedAt') ? '"updatedAt"' : null);
    
    if (existing.length > 0) {
      const setClauses = [`password = $1`, `role = 'super_admin'`, `tenant_id = $2`, `is_active = true`];
      if (tsCol) setClauses.push(`${tsCol} = NOW()`);
      await sequelize.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE email = 'superadmin@bedagang.com'`,
        { bind: [hashedPassword, tenantId] }
      );
      console.log('\nUpdated existing superadmin user');
    } else {
      const cols = ['name', 'email', 'password', 'role', 'tenant_id', 'phone', 'business_name', 'is_active', 'created_at'];
      const vals = ["'Super Admin'", "'superadmin@bedagang.com'", '$1', "'super_admin'", '$2', "'08123456789'", "'Super Admin Tenant'", 'true', 'NOW()'];
      if (tsCol) { cols.push(tsCol.replace(/"/g, '')); vals.push('NOW()'); }
      await sequelize.query(
        `INSERT INTO users (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
        { bind: [hashedPassword, tenantId] }
      );
      console.log('\nCreated superadmin user');
    }

    // 5. Enable all modules for tenant
    const [modules] = await sequelize.query("SELECT id, code, name FROM modules");
    console.log(`\nFound ${modules.length} modules. Enabling all...`);

    // Determine the correct column name for tenant_modules
    const colNames = tmCols.map(x => x.column_name);
    const activeCol = colNames.includes('is_active') ? 'is_active' : colNames.includes('is_enabled') ? 'is_enabled' : null;
    const dateCol = colNames.includes('activated_at') ? 'activated_at' : colNames.includes('enabled_at') ? 'enabled_at' : null;

    console.log('Active column:', activeCol, '| Date column:', dateCol);

    for (const mod of modules) {
      try {
        const [existingTm] = await sequelize.query(
          "SELECT id FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2",
          { bind: [tenantId, mod.id] }
        );
        
        if (existingTm.length === 0) {
          const cols = ['tenant_id', 'module_id'];
          const vals = ['$1', '$2'];
          const binds = [tenantId, mod.id];
          
          if (activeCol) { cols.push(activeCol); vals.push('true'); }
          if (dateCol) { cols.push(dateCol); vals.push('NOW()'); }
          cols.push('created_at'); vals.push('NOW()');
          
          await sequelize.query(
            `INSERT INTO tenant_modules (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
            { bind: binds }
          );
          console.log(`  + ${mod.code}`);
        } else {
          if (activeCol) {
            await sequelize.query(
              `UPDATE tenant_modules SET ${activeCol} = true WHERE tenant_id = $1 AND module_id = $2`,
              { bind: [tenantId, mod.id] }
            );
          }
          console.log(`  ✓ ${mod.code} (exists)`);
        }
      } catch (e) {
        console.log(`  ✗ ${mod.code}: ${e.message}`);
      }
    }

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUPERADMIN ACCOUNT READY');
    console.log('='.repeat(50));
    console.log('Email:    superadmin@bedagang.com');
    console.log('Password: superadmin123');
    console.log('Role:     super_admin');
    console.log('Tenant:   ' + tenantId);
    console.log('Modules:  ' + modules.length + ' (ALL)');
    console.log('='.repeat(50));

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

setup();
