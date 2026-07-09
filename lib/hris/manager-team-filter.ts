/**
 * Manager team scoping — direct reports via supervisor_id, branch manager, dept fallback.
 */

export type ManagerContext = {
  employee_id: string | number | null;
  department: string | null;
  branch_id: string | null;
  role?: string;
};

export async function resolveManagerContext(sequelize: any, userId: string): Promise<ManagerContext> {
  if (!sequelize) return { employee_id: null, department: null, branch_id: null };
  const [rows] = await sequelize.query(`
    SELECT e.id AS employee_id, e.department, e.branch_id, u.role
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id OR e.email = u.email
    WHERE u.id = :userId LIMIT 1
  `, { replacements: { userId } });
  return rows?.[0] || { employee_id: null, department: null, branch_id: null };
}

export function buildTeamEmployeeFilter(
  isSuperAdmin: boolean,
  ctx: ManagerContext,
  userId: string,
): { sql: string; replacements: Record<string, unknown> } {
  if (isSuperAdmin) return { sql: '', replacements: {} };

  const parts: string[] = [];
  const replacements: Record<string, unknown> = {
    mgrUserId: parseInt(userId, 10) || userId,
    mgrUserIdStr: String(userId),
  };

  if (ctx.employee_id) {
    parts.push('e.supervisor_id::text = :mgrEmpId');
    replacements.mgrEmpId = String(ctx.employee_id);
  }

  parts.push(`EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = e.branch_id AND b.manager_id = :mgrUserId
  )`);

  if (ctx.department) {
    parts.push('(e.department = :mgrDept AND COALESCE(e.user_id::text, \'\') != :mgrUserIdStr)');
    replacements.mgrDept = ctx.department;
  }

  if (!parts.length) return { sql: 'AND 1=0', replacements: {} };

  return {
    sql: `AND (${parts.join(' OR ')})`,
    replacements,
  };
}

/** SQL fragment: employee e is in manager's team */
export function teamJoinAlias(isSuperAdmin: boolean) {
  return isSuperAdmin ? '' : '';
}
