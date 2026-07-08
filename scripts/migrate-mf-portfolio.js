#!/usr/bin/env node
/**
 * Migrasi: portofolio kredit multifinance untuk tim lapangan mobile
 * Run: npm run db:mf-portfolio-migrate
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
  console.log('Connected — mf portfolio migration\n');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mf_loan_contracts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      contract_number VARCHAR(50) NOT NULL,
      customer_name VARCHAR(200) NOT NULL,
      customer_phone VARCHAR(30),
      customer_address TEXT,
      product_type VARCHAR(30) DEFAULT 'motor',
      loan_amount DECIMAL(15,2) DEFAULT 0,
      outstanding_amount DECIMAL(15,2) DEFAULT 0,
      installment_amount DECIMAL(15,2) DEFAULT 0,
      total_installments INTEGER DEFAULT 0,
      paid_installments INTEGER DEFAULT 0,
      next_due_date DATE,
      last_payment_date DATE,
      dpd_days INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      assigned_agent_id UUID,
      assigned_employee_id UUID,
      gps_lat DECIMAL(10,7),
      gps_lng DECIMAL(10,7),
      collateral_desc VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, contract_number)
    );
  `);
  console.log('  ✓ mf_loan_contracts');

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_contracts_agent ON mf_loan_contracts(assigned_employee_id)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_contracts_dpd ON mf_loan_contracts(dpd_days DESC)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_contracts_status ON mf_loan_contracts(status)`).catch(() => {});

  const [tenants] = await sequelize.query(`SELECT id FROM tenants ORDER BY created_at LIMIT 1`);
  const tenantId = tenants[0]?.id;
  if (tenantId) {
    const demos = [
      { num: 'MF-2024-00123', name: 'Budi Santoso', phone: '081234567890', addr: 'Jl. Melati No.5, Jakarta Selatan', product: 'motor', loan: 15000000, outstanding: 8500000, installment: 650000, dpd: 0, status: 'active' },
      { num: 'MF-2024-00456', name: 'Siti Aminah', phone: '082345678901', addr: 'Jl. Mawar No.12, Bekasi', product: 'motor', loan: 12000000, outstanding: 7200000, installment: 520000, dpd: 15, status: 'overdue' },
      { num: 'MF-2024-00789', name: 'Ahmad Rizki', phone: '083456789012', addr: 'Jl. Kenanga No.8, Tangerang', product: 'mobil', loan: 85000000, outstanding: 62000000, installment: 2800000, dpd: 45, status: 'overdue' },
      { num: 'MF-2023-00234', name: 'Dewi Lestari', phone: '084567890123', addr: 'Jl. Anggrek No.3, Depok', product: 'multiguna', loan: 25000000, outstanding: 18000000, installment: 950000, dpd: 95, status: 'npl' },
      { num: 'MF-2024-00567', name: 'Rudi Hartono', phone: '085678901234', addr: 'Jl. Dahlia No.20, Bogor', product: 'motor', loan: 18000000, outstanding: 12000000, installment: 750000, dpd: 0, status: 'active' },
    ];
    for (const d of demos) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (d.dpd > 0 ? -d.dpd : 7));
      await sequelize.query(`
        INSERT INTO mf_loan_contracts (id, tenant_id, contract_number, customer_name, customer_phone,
          customer_address, product_type, loan_amount, outstanding_amount, installment_amount,
          total_installments, paid_installments, next_due_date, dpd_days, status, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tenantId, :num, :name, :phone, :addr, :product, :loan, :outstanding,
          :installment, 36, 12, :dueDate, :dpd, :status, NOW(), NOW())
        ON CONFLICT (tenant_id, contract_number) DO NOTHING
      `, {
        replacements: {
          tenantId, num: d.num, name: d.name, phone: d.phone, addr: d.addr, product: d.product,
          loan: d.loan, outstanding: d.outstanding, installment: d.installment,
          dueDate: dueDate.toISOString().split('T')[0], dpd: d.dpd, status: d.status,
        },
      }).catch(() => {});
    }
    console.log('  ✓ demo contracts seeded');
  }

  console.log('\n✅ MF portfolio migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
