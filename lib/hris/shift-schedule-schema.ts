/**
 * shift_schedules.employee_id was created as INTEGER; Humanify employees.id is UUID.
 */
let ensured = false;

export async function ensureShiftScheduleEmployeeIdText(sequelize: any): Promise<void> {
  if (ensured || !sequelize) return;
  try {
    await sequelize.query(`
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
    ensured = true;
  } catch (err: any) {
    console.warn('[shift-schedules] employee_id migrate skipped', err?.message);
  }
}
