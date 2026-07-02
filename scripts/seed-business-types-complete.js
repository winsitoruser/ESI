/**
 * Comprehensive Business Types Seed Script
 * 
 * Aligns business_types with KYB onboarding categories (10 types)
 * and maps default/optional modules per business type.
 * 
 * Usage: node scripts/seed-business-types-complete.js
 */
require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

const BUSINESS_TYPES = [
  {
    code: 'fnb',
    name: 'F&B / Restoran',
    description: 'Restoran, kafe, warung makan, catering, cloud kitchen, dan bisnis makanan & minuman lainnya',
    icon: 'UtensilsCrossed',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite', 'kitchen', 'tables'],
    optional_modules: ['finance_pro', 'hris', 'reservations', 'loyalty', 'promo', 'whatsapp_business', 'supply_chain', 'audit', 'integrations'],
  },
  {
    code: 'retail',
    name: 'Retail / Toko',
    description: 'Toko ritel, minimarket, toko kelontong, department store, dan usaha penjualan barang langsung ke konsumen',
    icon: 'ShoppingBag',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'loyalty', 'promo', 'supply_chain', 'whatsapp_business', 'marketplace_integration', 'audit', 'integrations'],
  },
  {
    code: 'fashion',
    name: 'Fashion & Apparel',
    description: 'Toko pakaian, sepatu, aksesoris, butik, distro, dan bisnis fashion lainnya',
    icon: 'Shirt',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'loyalty', 'promo', 'supply_chain', 'whatsapp_business', 'marketplace_integration', 'audit', 'integrations'],
  },
  {
    code: 'beauty',
    name: 'Beauty & Salon',
    description: 'Salon kecantikan, barbershop, spa, klinik kecantikan, dan jasa perawatan tubuh',
    icon: 'Sparkles',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'reservations', 'tables', 'loyalty', 'promo', 'whatsapp_business', 'audit', 'integrations'],
  },
  {
    code: 'grocery',
    name: 'Grocery / Supermarket',
    description: 'Supermarket, minimarket, toko bahan pokok, dan bisnis kebutuhan sehari-hari',
    icon: 'ShoppingCart',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite', 'supply_chain'],
    optional_modules: ['finance_pro', 'hris', 'loyalty', 'promo', 'whatsapp_business', 'marketplace_integration', 'fleet', 'audit', 'integrations'],
  },
  {
    code: 'pharmacy',
    name: 'Apotek / Farmasi',
    description: 'Apotek, toko obat, distributor farmasi, dan bisnis kesehatan',
    icon: 'Pill',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite', 'supply_chain'],
    optional_modules: ['finance_pro', 'hris', 'loyalty', 'whatsapp_business', 'audit', 'integrations'],
  },
  {
    code: 'electronics',
    name: 'Elektronik',
    description: 'Toko elektronik, gadget, komputer, servis elektronik, dan bisnis teknologi',
    icon: 'Smartphone',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'loyalty', 'promo', 'supply_chain', 'whatsapp_business', 'marketplace_integration', 'audit', 'integrations'],
  },
  {
    code: 'automotive',
    name: 'Otomotif',
    description: 'Bengkel, dealer kendaraan, toko sparepart, car wash, dan bisnis otomotif lainnya',
    icon: 'Car',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'supply_chain', 'fleet', 'whatsapp_business', 'loyalty', 'audit', 'integrations'],
  },
  {
    code: 'services',
    name: 'Jasa / Layanan',
    description: 'Jasa profesional, konsultan, laundry, cleaning service, dan bisnis layanan lainnya',
    icon: 'Wrench',
    default_modules: ['dashboard', 'settings', 'pos', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'inventory', 'products', 'reservations', 'tables', 'loyalty', 'promo', 'whatsapp_business', 'audit', 'integrations'],
  },
  {
    code: 'other',
    name: 'Lainnya',
    description: 'Jenis bisnis lainnya yang tidak termasuk kategori di atas',
    icon: 'Package',
    default_modules: ['dashboard', 'settings', 'pos', 'inventory', 'products', 'branches', 'users', 'customers', 'employees', 'reports', 'finance_lite'],
    optional_modules: ['finance_pro', 'hris', 'kitchen', 'tables', 'reservations', 'loyalty', 'promo', 'supply_chain', 'whatsapp_business', 'marketplace_integration', 'audit', 'integrations'],
  },
];

async function run() {
  try {
    console.log('=== SEEDING BUSINESS TYPES (10 types aligned with KYB) ===\n');

    // Step 1: Upsert business types
    for (const bt of BUSINESS_TYPES) {
      await sequelize.query(`
        INSERT INTO business_types (id, code, name, description, icon, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), :code, :name, :description, :icon, true, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          is_active = true,
          updated_at = NOW()
      `, {
        replacements: { code: bt.code, name: bt.name, description: bt.description, icon: bt.icon }
      });
      console.log(`  [OK] Business Type: ${bt.code} - ${bt.name}`);
    }

    // Step 2: Map modules to business types
    // First get all module IDs
    const [modules] = await sequelize.query(`SELECT id, code FROM modules WHERE is_active = true`);
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.code] = m.id; });
    console.log(`\n  Found ${modules.length} active modules`);

    // Get all business type IDs
    const [businessTypes] = await sequelize.query(`SELECT id, code FROM business_types`);
    const btMap = {};
    businessTypes.forEach(bt => { btMap[bt.code] = bt.id; });

    // Clear existing business_type_modules
    await sequelize.query(`DELETE FROM business_type_modules`);
    console.log('  Cleared existing business_type_modules');

    let totalMappings = 0;

    for (const bt of BUSINESS_TYPES) {
      const btId = btMap[bt.code];
      if (!btId) {
        console.warn(`  [SKIP] Business type ${bt.code} not found in DB`);
        continue;
      }

      // Insert default modules
      for (const modCode of bt.default_modules) {
        const modId = moduleMap[modCode];
        if (!modId) {
          console.warn(`  [SKIP] Module ${modCode} not found for ${bt.code}`);
          continue;
        }
        await sequelize.query(`
          INSERT INTO business_type_modules (id, business_type_id, module_id, is_default, is_optional, created_at)
          VALUES (gen_random_uuid(), :btId, :modId, true, false, NOW())
          ON CONFLICT DO NOTHING
        `, { replacements: { btId, modId } });
        totalMappings++;
      }

      // Insert optional modules
      for (const modCode of bt.optional_modules) {
        const modId = moduleMap[modCode];
        if (!modId) {
          console.warn(`  [SKIP] Module ${modCode} not found for ${bt.code}`);
          continue;
        }
        await sequelize.query(`
          INSERT INTO business_type_modules (id, business_type_id, module_id, is_default, is_optional, created_at)
          VALUES (gen_random_uuid(), :btId, :modId, false, true, NOW())
          ON CONFLICT DO NOTHING
        `, { replacements: { btId, modId } });
        totalMappings++;
      }

      console.log(`  [OK] ${bt.code}: ${bt.default_modules.length} default + ${bt.optional_modules.length} optional modules`);
    }

    console.log(`\n  Total module mappings: ${totalMappings}`);

    // Step 3: Verification
    const [verify] = await sequelize.query(`
      SELECT bt.code, bt.name,
        COUNT(btm.id) as total_modules,
        COUNT(CASE WHEN btm.is_default THEN 1 END) as default_modules,
        COUNT(CASE WHEN btm.is_optional THEN 1 END) as optional_modules,
        (SELECT COUNT(*) FROM tenants t WHERE t.business_type_id = bt.id) as tenant_count
      FROM business_types bt
      LEFT JOIN business_type_modules btm ON btm.business_type_id = bt.id
      GROUP BY bt.id ORDER BY bt.code
    `);

    console.log('\n=== VERIFICATION ===');
    console.log('Code            | Name                    | Default | Optional | Total | Tenants');
    console.log('----------------|-------------------------|---------|----------|-------|--------');
    verify.forEach(r => {
      console.log(`${r.code.padEnd(16)}| ${r.name.padEnd(24)}| ${String(r.default_modules).padEnd(8)}| ${String(r.optional_modules).padEnd(9)}| ${String(r.total_modules).padEnd(6)}| ${r.tenant_count}`);
    });

    console.log('\n=== SEED COMPLETE ===');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

run();
