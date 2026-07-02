import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { safeQuery, safeQueryOne, tableExists } from '../../../../../lib/fleet/commandCenter';

let sequelize: any = null;
try { sequelize = require('../../../../../lib/sequelize'); } catch {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, data });
const err = (res: NextApiResponse, msg: string, code = 400) =>
  res.status(code).json({ success: false, error: msg });

/**
 * HRIS Integration for Fleet
 *  - summary
 *  - employees-drivers: mapping fms_drivers <-> employees
 *  - attendance-today: kehadiran driver hari ini
 *  - payroll-impact: komponen payroll driver (base + overtime + tunjangan supir)
 *  - kpi-link: KPI driver yang terhubung ke HRIS performance review
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;
    const action = (req.query.action as string) || 'summary';

    switch (action) {
      case 'summary': {
        const hasEmp = await tableExists(sequelize, 'employees');
        const hasDrivers = await tableExists(sequelize, 'fms_drivers');
        const hasAttendance = await tableExists(sequelize, 'employee_attendance');

        let totalDriverEmployees = 0;
        let linkedDrivers = 0;
        let unlinkedDrivers = 0;
        if (hasEmp && hasDrivers) {
          totalDriverEmployees = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(*)::int c FROM employees
              WHERE tenant_id = :tid AND LOWER(COALESCE(position,'')) ~ 'driver|supir|pengemudi|kurir'`,
            { tid }, { c: 0 }))?.c || 0);
          linkedDrivers = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(*)::int c FROM fms_drivers
              WHERE tenant_id = :tid AND employee_id IS NOT NULL`,
            { tid }, { c: 0 }))?.c || 0);
          unlinkedDrivers = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(*)::int c FROM fms_drivers
              WHERE tenant_id = :tid AND employee_id IS NULL AND is_active = true`,
            { tid }, { c: 0 }))?.c || 0);
        }

        let presentToday = 0;
        let absentToday = 0;
        if (hasAttendance && hasEmp) {
          presentToday = Number((await safeQueryOne<any>(sequelize,
            `SELECT COUNT(DISTINCT a.employee_id)::int c FROM employee_attendance a
              JOIN employees e ON e.id = a.employee_id
             WHERE a.tenant_id = :tid AND a.date = CURRENT_DATE
               AND a.status = 'present'
               AND LOWER(COALESCE(e.position,'')) ~ 'driver|supir|pengemudi|kurir'`,
            { tid }, { c: 0 }))?.c || 0);
          absentToday = Math.max(0, totalDriverEmployees - presentToday);
        }

        return ok(res, {
          totalDriverEmployees, linkedDrivers, unlinkedDrivers,
          presentToday, absentToday, hasIntegration: hasEmp && hasDrivers,
        });
      }

      case 'employees-drivers': {
        if (!(await tableExists(sequelize, 'fms_drivers'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT d.id AS driver_id, d.driver_code, d.full_name, d.phone, d.license_type,
                  d.employment_type, d.status, d.employee_id,
                  e.employee_code, e.position, e.department, e.hire_date, e.base_salary
             FROM fms_drivers d
             LEFT JOIN employees e ON e.id = d.employee_id
            WHERE d.tenant_id = :tid AND d.is_active = true
            ORDER BY d.full_name`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'attendance-today': {
        if (!(await tableExists(sequelize, 'employee_attendance'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT a.id, a.employee_id, a.date, a.check_in_time, a.check_out_time, a.status,
                  a.work_hours, a.overtime_hours,
                  e.full_name, e.position, d.driver_code, d.id AS driver_id,
                  v.license_plate AS assigned_vehicle
             FROM employee_attendance a
             JOIN employees e ON e.id = a.employee_id
             LEFT JOIN fms_drivers d ON d.employee_id = e.id
             LEFT JOIN fms_vehicles v ON v.assigned_driver_id = d.id
            WHERE a.tenant_id = :tid AND a.date = CURRENT_DATE
              AND LOWER(COALESCE(e.position,'')) ~ 'driver|supir|pengemudi|kurir'
            ORDER BY a.check_in_time DESC`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'payroll-impact': {
        if (!(await tableExists(sequelize, 'fms_drivers'))) {
          return ok(res, { drivers: [], totals: { base: 0, overtime: 0, allowance: 0, total: 0 } });
        }
        const drivers = await safeQuery<any[]>(sequelize,
          `SELECT d.driver_code, d.full_name,
                  COALESCE(e.base_salary, 0)::numeric AS base_salary,
                  COALESCE(d.monthly_allowance, 0)::numeric AS allowance,
                  COALESCE(d.total_trips_month, 0)::int AS trips_month
             FROM fms_drivers d
             LEFT JOIN employees e ON e.id = d.employee_id
            WHERE d.tenant_id = :tid AND d.is_active = true
            ORDER BY d.full_name LIMIT 200`,
          { tid }, []);
        const totals = drivers.reduce((acc, d) => {
          acc.base += Number(d.base_salary || 0);
          acc.allowance += Number(d.allowance || 0);
          return acc;
        }, { base: 0, overtime: 0, allowance: 0, total: 0 });
        totals.total = totals.base + totals.overtime + totals.allowance;
        return ok(res, { drivers, totals });
      }

      case 'kpi-link': {
        if (!(await tableExists(sequelize, 'employee_kpis')) ||
            !(await tableExists(sequelize, 'fms_drivers'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT d.driver_code, d.full_name, d.safety_score AS fleet_score,
                  d.total_trips, d.on_time_trips,
                  k.kpi_name, k.target_value, k.actual_value, k.score AS hris_score, k.period
             FROM fms_drivers d
             LEFT JOIN employee_kpis k ON k.employee_id = d.employee_id
                                      AND k.period = to_char(CURRENT_DATE,'YYYY-MM')
            WHERE d.tenant_id = :tid AND d.is_active = true
            ORDER BY d.safety_score DESC NULLS LAST LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[hris integration]', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}
