const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function seedKitchenStaff() {
  try {
    console.log('Seeding kitchen staff...');
    
    // Get a tenant ID (using a default one for now)
    const [tenantResult] = await sequelize.query(`
      SELECT id FROM tenants LIMIT 1
    `);
    
    const tenantId = tenantResult[0]?.id;
    
    if (!tenantId) {
      console.log('No tenant found, skipping kitchen staff seeding');
      return;
    }

    const staffData = [
      {
        name: 'Chef Ahmad Rizki',
        role: 'head_chef',
        shift: 'morning',
        status: 'active',
        performance: 95,
        orders_completed: 450,
        avg_prep_time: 15,
        phone: '08123456789',
        email: 'ahmad@bedagang.com'
      },
      {
        name: 'Siti Nurhaliza',
        role: 'sous_chef',
        shift: 'morning',
        status: 'active',
        performance: 92,
        orders_completed: 380,
        avg_prep_time: 17,
        phone: '08234567890',
        email: 'siti@bedagang.com'
      },
      {
        name: 'Budi Santoso',
        role: 'line_cook',
        shift: 'afternoon',
        status: 'active',
        performance: 88,
        orders_completed: 320,
        avg_prep_time: 18,
        phone: '08345678901',
        email: 'budi@bedagang.com'
      },
      {
        name: 'Dewi Lestari',
        role: 'line_cook',
        shift: 'night',
        status: 'active',
        performance: 85,
        orders_completed: 290,
        avg_prep_time: 19,
        phone: '08456789012',
        email: 'dewi@bedagang.com'
      },
      {
        name: 'Andi Wijaya',
        role: 'prep_cook',
        shift: 'morning',
        status: 'off',
        performance: 80,
        orders_completed: 250,
        avg_prep_time: 20,
        phone: '08567890123',
        email: 'andi@bedagang.com'
      }
    ];

    for (const staff of staffData) {
      await sequelize.query(`
        INSERT INTO kitchen_staff (
          id, tenant_id, user_id, name, role, shift, status,
          performance, orders_completed, avg_prep_time,
          join_date, phone, email, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), :tenantId, NULL, :name, :role, :shift, :status,
          :performance, :orders_completed, :avg_prep_time,
          :joinDate, :phone, :email, true, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          shift = EXCLUDED.shift,
          status = EXCLUDED.status,
          performance = EXCLUDED.performance,
          orders_completed = EXCLUDED.orders_completed,
          avg_prep_time = EXCLUDED.avg_prep_time,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          updated_at = NOW()
      `, {
        replacements: {
          tenantId,
          name: staff.name,
          role: staff.role,
          shift: staff.shift,
          status: staff.status,
          performance: staff.performance,
          orders_completed: staff.orders_completed,
          avg_prep_time: staff.avg_prep_time,
          joinDate: new Date('2023-01-15'),
          phone: staff.phone,
          email: staff.email
        }
      });
    }

    console.log('✅ Kitchen staff seeded successfully');
  } catch (error) {
    console.error('Error seeding kitchen staff:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

seedKitchenStaff();
