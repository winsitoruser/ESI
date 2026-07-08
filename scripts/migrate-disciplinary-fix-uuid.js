/**
 * Fix hr_disciplinary_letters.employee_id → UUID (match employees.id)
 * Run: npm run db:disciplinary-fix-uuid
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected\n');

  const [cols] = await sequelize.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'hr_disciplinary_letters' AND column_name = 'employee_id'
  `);

  if (cols[0]?.data_type === 'uuid') {
    console.log('  ✓ employee_id already UUID');
  } else {
    await sequelize.query(`ALTER TABLE hr_disciplinary_letters DROP CONSTRAINT IF EXISTS hr_disciplinary_letters_employee_id_fkey`);
    await sequelize.query(`DELETE FROM hr_disciplinary_approval_steps WHERE letter_id IN (SELECT id FROM hr_disciplinary_letters)`);
    await sequelize.query(`DELETE FROM hr_disciplinary_letters`);
    await sequelize.query(`ALTER TABLE hr_disciplinary_letters ALTER COLUMN employee_id TYPE UUID USING NULL`);
    await sequelize.query(`ALTER TABLE hr_disciplinary_letters ALTER COLUMN employee_id SET NOT NULL`);
    console.log('  ✓ employee_id converted to UUID');
  }

  // approver_id should also be flexible — keep integer for user ids, but fix join to use users if needed
  console.log('\n✅ Disciplinary UUID fix complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
