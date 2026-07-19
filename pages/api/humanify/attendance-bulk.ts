/**
 * Attendance bulk import + correction with 24h undo.
 *   POST ?action=import   { records: [...] }
 *   POST ?action=correct  { ids: string[], patch: { status?, clockIn?, clockOut?, notes? } }
 *   POST ?action=undo     { batchId: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  bulkCorrectAttendance,
  undoAttendanceBulkCorrect,
} from '@/lib/hris/attendance-bulk-correct';

interface ImportRow {
  employeeCode: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: string;
  source?: string;
  branchName?: string;
  notes?: string;
}

function buildTimestamp(date: string, time: string | null | undefined): string | null {
  if (!time) return null;
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}+07:00`;
}

function calcWorkHours(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

async function bulkImport(req: NextApiRequest, res: NextApiResponse, tenantId?: string) {
  const { records } = req.body as { records?: ImportRow[] };
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'records array wajib diisi' });
  }

  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = await import('sequelize');

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const label = `Baris ${i + 1} (${row.employeeCode || '?'})`;
    try {
      const emps = await sequelize.query(
        tenantId
          ? `SELECT id, branch_id FROM employees WHERE (employee_code = :code OR id::text = :code) AND tenant_id = :tenantId LIMIT 1`
          : `SELECT id, branch_id FROM employees WHERE employee_code = :code OR id::text = :code LIMIT 1`,
        { replacements: { code: row.employeeCode, tenantId }, type: QueryTypes.SELECT },
      ) as Array<{ id: string; branch_id: string | null }>;
      const emp = emps[0];
      if (!emp?.id) {
        failed++;
        errors.push(`${label}: karyawan ${row.employeeCode} tidak ditemukan`);
        continue;
      }

      let branchId = emp.branch_id;
      if (row.branchName) {
        const branches = await sequelize.query(
          `SELECT id FROM branches WHERE name ILIKE :name LIMIT 1`,
          { replacements: { name: row.branchName }, type: QueryTypes.SELECT },
        ) as Array<{ id: string }>;
        const br = branches[0];
        if (br?.id) branchId = br.id;
      }

      const clockIn = buildTimestamp(row.date, row.clockIn);
      const clockOut = buildTimestamp(row.date, row.clockOut);
      const workHours = calcWorkHours(clockIn, clockOut);
      const notes = [row.source ? `sumber:${row.source}` : '', row.notes || ''].filter(Boolean).join(' | ') || null;

      await sequelize.query(`
        INSERT INTO employee_attendance (
          id, tenant_id, employee_id, branch_id, date, clock_in, clock_out,
          status, work_hours, notes, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), :tenantId, :employeeId, :branchId, :date, :clockIn, :clockOut,
          :status, :workHours, :notes, NOW(), NOW()
        )
        ON CONFLICT (employee_id, date) DO UPDATE SET
          clock_in = COALESCE(EXCLUDED.clock_in, employee_attendance.clock_in),
          clock_out = COALESCE(EXCLUDED.clock_out, employee_attendance.clock_out),
          status = EXCLUDED.status,
          work_hours = EXCLUDED.work_hours,
          branch_id = COALESCE(EXCLUDED.branch_id, employee_attendance.branch_id),
          notes = COALESCE(EXCLUDED.notes, employee_attendance.notes),
          updated_at = NOW()
      `, {
        replacements: {
          tenantId: tenantId || null,
          employeeId: emp.id,
          branchId: branchId || null,
          date: row.date,
          clockIn,
          clockOut,
          status: row.status,
          workHours,
          notes,
        },
      });

      success++;
    } catch (e: any) {
      failed++;
      errors.push(`${label}: ${e.message || 'gagal menyimpan'}`);
    }
  }

  return res.status(200).json({
    success: true,
    imported: success,
    failed,
    errors: errors.slice(0, 20),
    message: `Import selesai: ${success} berhasil, ${failed} gagal`,
  });
}

async function bulkCorrect(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session?.user?.tenantId || null;
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const patch = req.body?.patch || {};
  try {
    const result = await bulkCorrectAttendance({
      tenantId,
      ids,
      patch,
      actorId: session?.user?.id != null ? String(session.user.id) : null,
      actorEmail: session?.user?.email || null,
    });
    return res.json({
      success: true,
      data: result,
      message: `${result.updated} absensi dikoreksi${result.batchId ? ' (undo 24 jam tersedia)' : ''}`,
    });
  } catch (e: any) {
    const msg = e?.message || 'Koreksi gagal';
    const status = /tidak ditemukan|wajib|Maksimal|Tidak ada field|sudah|habis|Pilih/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

async function bulkUndo(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session?.user?.tenantId || null;
  const batchId = String(req.body?.batchId || '');
  if (!batchId) return res.status(400).json({ success: false, error: 'batchId wajib' });
  try {
    const result = await undoAttendanceBulkCorrect({ tenantId, batchId });
    return res.json({ success: true, data: result, message: `${result.restored} baris dikembalikan` });
  } catch (e: any) {
    const msg = e?.message || 'Undo gagal';
    const status = /tidak ditemukan|sudah|habis|Snapshot/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { action } = req.query;
  const session = (req as any).session;
  const tenantId = session?.user?.tenantId as string | undefined;

  if (action === 'import') return bulkImport(req, res, tenantId);
  if (action === 'correct') return bulkCorrect(req, res, session);
  if (action === 'undo') return bulkUndo(req, res, session);

  return res.status(400).json({
    success: false,
    error: 'Unknown action. Use ?action=import|correct|undo',
  });
}

export default withHQAuth(handler, { module: 'hris' });
