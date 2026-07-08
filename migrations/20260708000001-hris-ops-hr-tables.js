'use strict';

/** HRIS Operasional HR — missing tables (employee_claims, claim_approval_steps) + UUID alignment */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employee_claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id UUID NOT NULL,
        claim_number VARCHAR(50),
        claim_type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        approved_amount DECIMAL(15,2),
        currency VARCHAR(5) DEFAULT 'IDR',
        claim_date DATE NOT NULL,
        description TEXT,
        receipt_url TEXT,
        receipt_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        current_approval_step INTEGER DEFAULT 0,
        paid_date DATE,
        paid_by UUID,
        payment_ref VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS claim_approval_steps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        claim_id UUID NOT NULL REFERENCES employee_claims(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL DEFAULT 1,
        approver_id UUID,
        approver_role VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        approved_amount DECIMAL(15,2),
        comments TEXT,
        acted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const table of ['pjm_resources', 'pjm_timesheets']) {
      const [[{ exists }]] = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = :table
        ) AS exists`,
        { replacements: { table } }
      );
      if (!exists) continue;
      const [[{ cnt }]] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM "${table}"`);
      const [cols] = await sequelize.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = :table AND column_name = 'employee_id'`,
        { replacements: { table } }
      );
      if (cols[0]?.data_type === 'integer' && cnt === 0) {
        await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN employee_id TYPE UUID USING NULL`);
      }
    }

    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_empid ON employee_claims(employee_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_status ON employee_claims(status)`);
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.query('DROP TABLE IF EXISTS claim_approval_steps CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS employee_claims CASCADE');
  },
};
