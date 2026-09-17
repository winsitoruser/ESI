/**
 * shift_schedules.employee_id was created as INTEGER; Humanify employees.id is UUID.
 * DDL must not run on the request-bound RLS transaction (25P02 / clock-in abort).
 */
import { withAutocommitQuery } from '@/lib/saas/tenant-request-bound';

let ensured = false;

export async function ensureShiftScheduleEmployeeIdText(sequelize: any): Promise<void> {
  if (ensured || !sequelize) return;
  const ok = await withAutocommitQuery(sequelize, async (query) => {
    await query(`
      DO $shift$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'shift_schedules'
            AND column_name = 'employee_id'
            AND data_type IN ('integer', 'bigint', 'smallint')
        ) THEN
          ALTER TABLE shift_schedules
            ALTER COLUMN employee_id TYPE VARCHAR(64) USING employee_id::text;
          ALTER TABLE shift_schedules
            ALTER COLUMN swap_requested_with TYPE VARCHAR(64) USING swap_requested_with::text;
        END IF;
      END
      $shift$;
    `);
    return true;
  }, 'shift_emp_id_text');
  if (ok) ensured = true;
}
