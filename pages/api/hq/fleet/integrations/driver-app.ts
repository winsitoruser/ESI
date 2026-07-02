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
 * Driver App Integration
 *  - summary: Ringkasan driver akun app + device + sessions
 *  - linked-drivers: Drivers yg sudah link ke akun app
 *  - pending-expenses: Expense/reimbursement yg belum di-approve
 *  - recent-deliveries: POD & delivery dari driver app
 *  - live-sessions: Sesi login driver app aktif
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;
    const action = (req.query.action as string) || 'summary';

    switch (action) {
      case 'summary': {
        const hasAccounts = await tableExists(sequelize, 'driver_accounts');
        const hasDrivers = await tableExists(sequelize, 'fms_drivers') ||
                           await tableExists(sequelize, 'fleet_drivers');
        const hasExpenses = await tableExists(sequelize, 'fleet_driver_expenses');
        const hasPOD = await tableExists(sequelize, 'fleet_delivery_proofs');

        const accounts = hasAccounts
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM driver_accounts WHERE tenant_id = :tid`, { tid }, { c: 0 }))?.c || 0)
          : 0;
        const activeSessions = hasAccounts
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM driver_accounts WHERE tenant_id = :tid AND last_login_at >= NOW() - INTERVAL '24 hours'`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;
        const pendingExpenses = hasExpenses
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM fleet_driver_expenses WHERE tenant_id = :tid AND status = 'pending'`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;
        const pendingAmount = hasExpenses
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COALESCE(SUM(amount),0)::numeric s FROM fleet_driver_expenses WHERE tenant_id = :tid AND status = 'pending'`,
              { tid }, { s: 0 }))?.s || 0)
          : 0;
        const podToday = hasPOD
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM fleet_delivery_proofs WHERE tenant_id = :tid AND submitted_at::date = CURRENT_DATE`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;

        return ok(res, {
          accounts, activeSessions, pendingExpenses, pendingAmount, podToday,
          hasDrivers, hasAccounts,
        });
      }

      case 'linked-drivers': {
        if (!(await tableExists(sequelize, 'fms_drivers'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT d.id, d.driver_code, d.full_name, d.phone, d.status, d.availability, d.safety_score,
                  da.id AS account_id, da.last_login_at, da.device_info
             FROM fms_drivers d
             LEFT JOIN driver_accounts da ON da.driver_id = d.id
            WHERE d.tenant_id = :tid AND d.is_active = true
            ORDER BY d.full_name LIMIT 100`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'pending-expenses': {
        if (!(await tableExists(sequelize, 'fleet_driver_expenses'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT e.id, e.expense_number, e.expense_type, e.amount, e.description, e.receipt_url,
                  e.submitted_at, e.status, d.full_name AS driver_name, v.license_plate
             FROM fleet_driver_expenses e
             LEFT JOIN fms_drivers d ON d.id = e.driver_id
             LEFT JOIN fms_vehicles v ON v.id = e.vehicle_id
            WHERE e.tenant_id = :tid AND e.status = 'pending'
            ORDER BY e.submitted_at DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'recent-deliveries': {
        if (!(await tableExists(sequelize, 'fleet_delivery_proofs'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT p.id, p.order_reference, p.customer_name, p.signature_url, p.photo_url,
                  p.recipient_name, p.notes, p.submitted_at, p.status, d.full_name AS driver_name
             FROM fleet_delivery_proofs p
             LEFT JOIN fms_drivers d ON d.id = p.driver_id
            WHERE p.tenant_id = :tid
            ORDER BY p.submitted_at DESC LIMIT 50`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'live-sessions': {
        if (!(await tableExists(sequelize, 'driver_accounts'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT da.id, da.last_login_at, da.device_info, da.app_version,
                  d.full_name AS driver_name, d.driver_code,
                  v.license_plate AS assigned_plate
             FROM driver_accounts da
             LEFT JOIN fms_drivers d ON d.id = da.driver_id
             LEFT JOIN fms_vehicles v ON v.assigned_driver_id = d.id
            WHERE da.tenant_id = :tid AND da.last_login_at >= NOW() - INTERVAL '24 hours'
            ORDER BY da.last_login_at DESC`,
          { tid }, []);
        return ok(res, rows);
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[driver-app integration]', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}
