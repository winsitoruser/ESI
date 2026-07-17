/**
 * Lean leave list for public API v1
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export async function listTenantLeavesLean(
  tenantId: string,
  opts?: { limit?: number; status?: string },
): Promise<any[]> {
  if (!sequelize) return [];
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
  const status = opts?.status ? String(opts.status).toLowerCase() : null;

  try {
    const [rows] = await sequelize.query(`
      SELECT lr.id,
        lr.employee_id AS "employeeId",
        COALESCE(e.name, e.full_name, '') AS "employeeName",
        COALESCE(lr.leave_type, lr.type, 'cuti') AS "leaveType",
        lr.start_date AS "startDate",
        lr.end_date AS "endDate",
        COALESCE(lr.status::text, 'pending') AS status,
        lr.reason,
        lr.created_at AS "createdAt"
      FROM leave_requests lr
      LEFT JOIN employees e ON e.id = lr.employee_id
      WHERE (
          lr.tenant_id = :tid
          OR e.tenant_id = :tid
        )
        AND (:status::text IS NULL OR LOWER(COALESCE(lr.status::text, '')) = :status)
      ORDER BY lr.created_at DESC NULLS LAST
      LIMIT :lim
    `, { replacements: { tid: tenantId, status, lim: limit } });
    return rows || [];
  } catch {
    return [];
  }
}
