/**
 * Prod `leave_types` was created by the slim HRIS core migrate (no description /
 * policy columns). ALTER must run in a SAVEPOINT so a permission failure cannot
 * abort the request-bound RLS transaction — writes then skip missing columns.
 */

import { withDbSavepoint } from '@/lib/saas/tenant-request-bound';

let ensured = false;

const COLUMNS: Array<[string, string]> = [
  ['description', 'TEXT'],
  ['category', "VARCHAR(30) DEFAULT 'regular'"],
  ['max_days_per_year', 'INTEGER DEFAULT 12'],
  ['min_days_per_request', 'INTEGER DEFAULT 1'],
  ['max_days_per_request', 'INTEGER DEFAULT 14'],
  ['carry_forward', 'BOOLEAN DEFAULT false'],
  ['max_carry_forward_days', 'INTEGER DEFAULT 0'],
  ['requires_attachment', 'BOOLEAN DEFAULT false'],
  ['requires_medical_cert', 'BOOLEAN DEFAULT false'],
  ['is_paid', 'BOOLEAN DEFAULT true'],
  ['salary_deduction_percent', 'DECIMAL(5,2) DEFAULT 0'],
  ['applicable_gender', 'VARCHAR(10)'],
  ['min_service_months', 'INTEGER DEFAULT 0'],
  ['applicable_departments', "JSONB DEFAULT '[]'::jsonb"],
  ['applicable_positions', "JSONB DEFAULT '[]'::jsonb"],
  ['color', "VARCHAR(20) DEFAULT '#3B82F6'"],
  ['icon', "VARCHAR(30) DEFAULT 'calendar'"],
  ['is_active', 'BOOLEAN DEFAULT true'],
  ['sort_order', 'INTEGER DEFAULT 0'],
];

export async function ensureLeaveTypesSchema(sequelize: any): Promise<void> {
  if (ensured || !sequelize) return;
  const ok = await withDbSavepoint(sequelize, async () => {
    const [tables]: any = await sequelize.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'leave_types' LIMIT 1`,
    );
    if (!tables?.length) return false;
    for (const [col, def] of COLUMNS) {
      await sequelize.query(`ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    }
    return true;
  }, 'leave_types_schema');

  if (ok) {
    try {
      const { invalidateLeaveTypeColumnCache } = require('./leave-type-store');
      invalidateLeaveTypeColumnCache();
    } catch { /* circular-safe */ }
    try {
      const [cols]: any = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'leave_types' AND column_name = 'description' LIMIT 1`,
      );
      if (cols?.length) ensured = true;
    } catch { /* retry next request */ }
  }
}
