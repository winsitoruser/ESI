import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { logAudit } from '@/lib/audit/auditLogger';
import { safeQuery, safeQueryOne, tableExists } from '../../../../../lib/fleet/commandCenter';

let sequelize: any = null;
try { sequelize = require('../../../../../lib/sequelize'); } catch {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, data });
const err = (res: NextApiResponse, msg: string, code = 400) =>
  res.status(code).json({ success: false, error: msg });

/**
 * Finance Integration for Fleet
 *  GET  ?action=summary
 *  GET  ?action=journal-entries
 *  GET  ?action=payables         (biaya perawatan, vendor, sewa)
 *  GET  ?action=freight-invoices (revenue side)
 *  GET  ?action=cost-center-breakdown
 *  POST ?action=post-journal     (post ke finance_journal_entries)
 *  POST ?action=reconcile-expense
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const uname = (session.user as any).name || '';
    const action = (req.query.action as string) || 'summary';

    if (req.method === 'POST') {
      if (action === 'post-journal') {
        const b = req.body || {};
        const { referenceType, referenceId, amount, debitAccount, creditAccount, description } = b;
        if (!referenceType || !amount || !debitAccount || !creditAccount) {
          return err(res, 'Missing required fields');
        }
        if (!(await tableExists(sequelize, 'finance_journal_entries'))) {
          return err(res, 'Finance journal tidak tersedia', 412);
        }
        const entryNo = `FLEET-JRN-${Date.now()}`;
        const [entry]: any = await sequelize.query(
          `INSERT INTO finance_journal_entries
             (tenant_id, entry_number, entry_date, description, reference_type, reference_id, total_amount, status, created_by, created_at, updated_at)
           VALUES (:tid, :no, CURRENT_DATE, :desc, :rt, :rid, :amt, 'posted', :uid, NOW(), NOW())
           RETURNING id`,
          { replacements: { tid, no: entryNo, desc: description || `Fleet posting ${referenceType}`, rt: referenceType, rid: referenceId, amt: amount, uid } }
        );
        const entryId = entry?.[0]?.id;
        await sequelize.query(
          `INSERT INTO finance_journal_entry_lines
             (tenant_id, journal_entry_id, account_id, debit, credit, description, created_at)
           VALUES (:tid, :eid, :dr, :amt, 0, :d, NOW()),
                  (:tid, :eid, :cr, 0, :amt, :d, NOW())`,
          { replacements: { tid, eid: entryId, dr: debitAccount, cr: creditAccount, amt: amount, d: description || '' } }
        );
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any, entityType: 'finance_journal_entries', entityId: entryId, newValues: b, req }).catch(() => {});
        return ok(res, { id: entryId, entryNumber: entryNo });
      }
      if (action === 'reconcile-expense') {
        const { expenseId, approved } = req.body || {};
        if (!expenseId) return err(res, 'expenseId required');
        if (!(await tableExists(sequelize, 'fleet_driver_expenses'))) return err(res, 'Tabel tidak tersedia', 412);
        await sequelize.query(
          `UPDATE fleet_driver_expenses SET status = :s, reviewed_by = :uid, reviewed_at = NOW()
            WHERE id = :id AND tenant_id = :tid`,
          { replacements: { s: approved ? 'approved' : 'rejected', uid, id: expenseId, tid } }
        );
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'update' as any, entityType: 'fleet_driver_expenses', entityId: expenseId, newValues: { approved }, req }).catch(() => {});
        return ok(res, { success: true });
      }
      return err(res, `Unknown POST action: ${action}`);
    }

    switch (action) {
      case 'summary': {
        const hasCostRecords = await tableExists(sequelize, 'fms_cost_records');
        const hasPayables = await tableExists(sequelize, 'finance_payables');
        const hasFreightBills = await tableExists(sequelize, 'tms_freight_bills');
        const hasJournal = await tableExists(sequelize, 'finance_journal_entries');

        const opexMTD = hasCostRecords
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COALESCE(SUM(amount),0)::numeric s FROM fms_cost_records
                WHERE tenant_id = :tid AND cost_date >= date_trunc('month', CURRENT_DATE)`,
              { tid }, { s: 0 }))?.s || 0)
          : 0;
        const payablesOutstanding = hasPayables
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COALESCE(SUM(balance_due),0)::numeric s FROM finance_payables
                WHERE tenant_id = :tid AND status IN ('unpaid','partial','overdue')
                  AND LOWER(COALESCE(description,'')) ~ 'armada|fleet|kendaraan|bbm|service|perawatan|ban'`,
              { tid }, { s: 0 }))?.s || 0)
          : 0;
        const freightRevenueMTD = hasFreightBills
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COALESCE(SUM(total_amount),0)::numeric s FROM tms_freight_bills
                WHERE tenant_id = :tid AND bill_date >= date_trunc('month', CURRENT_DATE)`,
              { tid }, { s: 0 }))?.s || 0)
          : 0;
        const freightOutstanding = hasFreightBills
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COALESCE(SUM(balance_due),0)::numeric s FROM tms_freight_bills
                WHERE tenant_id = :tid AND payment_status IN ('unpaid','partial','overdue')`,
              { tid }, { s: 0 }))?.s || 0)
          : 0;
        const journalsPostedMTD = hasJournal
          ? Number((await safeQueryOne<any>(sequelize,
              `SELECT COUNT(*)::int c FROM finance_journal_entries
                WHERE tenant_id = :tid AND reference_type IN ('fms_fuel','fms_maintenance','fms_cost','tms_freight','fleet_expense')
                  AND entry_date >= date_trunc('month', CURRENT_DATE)`,
              { tid }, { c: 0 }))?.c || 0)
          : 0;

        return ok(res, {
          opexMTD, payablesOutstanding, freightRevenueMTD, freightOutstanding,
          journalsPostedMTD,
          marginMTD: freightRevenueMTD - opexMTD,
          hasJournal, hasPayables, hasFreightBills,
        });
      }

      case 'journal-entries': {
        if (!(await tableExists(sequelize, 'finance_journal_entries'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT id, entry_number, entry_date, description, reference_type, reference_id,
                  total_amount, status, created_at
             FROM finance_journal_entries
            WHERE tenant_id = :tid
              AND reference_type IN ('fms_fuel','fms_maintenance','fms_cost','tms_freight','fleet_expense','fms_incident','fms_rental')
            ORDER BY entry_date DESC, created_at DESC LIMIT 100`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'payables': {
        if (!(await tableExists(sequelize, 'finance_payables'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT id, payable_number, supplier_name, description, total_amount, balance_due,
                  due_date, status, created_at
             FROM finance_payables
            WHERE tenant_id = :tid
              AND LOWER(COALESCE(description,'') || ' ' || COALESCE(category,'')) ~
                  'armada|fleet|kendaraan|bbm|fuel|service|perawatan|ban|maintenance'
            ORDER BY due_date ASC LIMIT 100`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'freight-invoices': {
        if (!(await tableExists(sequelize, 'tms_freight_bills'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT fb.id, fb.bill_number, fb.bill_date, fb.total_amount, fb.balance_due,
                  fb.payment_status, fb.customer_name, c.carrier_name
             FROM tms_freight_bills fb
             LEFT JOIN tms_carriers c ON c.id = fb.carrier_id
            WHERE fb.tenant_id = :tid
            ORDER BY fb.bill_date DESC LIMIT 100`,
          { tid }, []);
        return ok(res, rows);
      }

      case 'cost-center-breakdown': {
        if (!(await tableExists(sequelize, 'fms_cost_records'))) return ok(res, []);
        const rows = await safeQuery<any[]>(sequelize,
          `SELECT v.license_plate, v.vehicle_code, v.vehicle_type,
                  SUM(c.amount)::numeric AS month_cost,
                  COUNT(c.id)::int AS transactions
             FROM fms_cost_records c
             JOIN fms_vehicles v ON v.id = c.vehicle_id
            WHERE c.tenant_id = :tid
              AND c.cost_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY v.id, v.license_plate, v.vehicle_code, v.vehicle_type
            ORDER BY month_cost DESC LIMIT 30`,
          { tid }, []);
        return ok(res, rows);
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (e: any) {
    console.error('[finance integration]', e);
    return err(res, e?.message || 'Internal error', 500);
  }
}
