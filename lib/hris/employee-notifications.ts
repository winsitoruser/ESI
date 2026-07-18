/**
 * Employee portal notifications — in-app alerts for ESS.
 */

export type NotificationPayload = {
  tenantId?: string | null;
  userId?: number | string | null;
  employeeId?: string | number | null;
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'success' | 'approval' | 'disciplinary';
  sourceType?: string;
  sourceId?: string | null;
};

export async function insertEmployeeNotification(sequelize: any, payload: NotificationPayload) {
  if (!sequelize) return null;
  const {
    tenantId, userId, employeeId, title, message = '',
    type = 'info', sourceType, sourceId,
  } = payload;
  if (!userId && !employeeId) return null;

  try {
    const [rows] = await sequelize.query(`
      INSERT INTO employee_notifications (
        tenant_id, user_id, employee_id, title, message, type, source_type, source_id, created_at
      ) VALUES (
        :tenantId, :userId, :employeeId, :title, :message, :type, :sourceType, :sourceId, NOW()
      ) RETURNING id
    `, {
      replacements: {
        tenantId: tenantId || null,
        userId: userId ? parseInt(String(userId), 10) : null,
        employeeId: employeeId || null,
        title,
        message,
        type,
        sourceType: sourceType || null,
        sourceId: sourceId || null,
      },
    });
    return rows?.[0]?.id || null;
  } catch (e) {
    console.warn('insertEmployeeNotification:', (e as Error)?.message);
    return null;
  }
}

export async function notifyEmployeeByEmployeeId(
  sequelize: any,
  employeeId: string | number,
  payload: Omit<NotificationPayload, 'employeeId' | 'userId'>,
) {
  if (!sequelize) return;
  try {
    const [rows] = await sequelize.query(`
      SELECT e.id, e.user_id, e.tenant_id FROM employees e WHERE e.id::text = :empId LIMIT 1
    `, { replacements: { empId: String(employeeId) } });
    const emp = rows?.[0];
    if (!emp) return;
    await insertEmployeeNotification(sequelize, {
      ...payload,
      tenantId: payload.tenantId ?? emp.tenant_id,
      userId: emp.user_id,
      employeeId: emp.id,
    });
  } catch (e) {
    console.warn('notifyEmployeeByEmployeeId:', (e as Error)?.message);
  }
}

/** Notify direct supervisor + branch manager + dept managers */
export async function notifyManagersForEmployee(
  sequelize: any,
  employeeId: string | number,
  payload: Omit<NotificationPayload, 'employeeId' | 'userId'>,
) {
  if (!sequelize) return;
  try {
    const [empRows] = await sequelize.query(`
      SELECT e.id, e.supervisor_id, e.branch_id, e.department, e.tenant_id, e.name
      FROM employees e WHERE e.id::text = :empId LIMIT 1
    `, { replacements: { empId: String(employeeId) } });
    const emp = empRows?.[0];
    if (!emp) return;

    const notified = new Set<string>();

    // Direct supervisor
    if (emp.supervisor_id) {
      const [supRows] = await sequelize.query(`
        SELECT user_id, id FROM employees WHERE id::text = :supId AND user_id IS NOT NULL LIMIT 1
      `, { replacements: { supId: String(emp.supervisor_id) } });
      const sup = supRows?.[0];
      if (sup?.user_id && !notified.has(String(sup.user_id))) {
        notified.add(String(sup.user_id));
        await insertEmployeeNotification(sequelize, {
          ...payload,
          tenantId: payload.tenantId ?? emp.tenant_id,
          userId: sup.user_id,
          employeeId: sup.id,
        });
      }
    }

    // Branch manager
    if (emp.branch_id) {
      const [bmRows] = await sequelize.query(`
        SELECT b.manager_id FROM branches b WHERE b.id = :branchId AND b.manager_id IS NOT NULL LIMIT 1
      `, { replacements: { branchId: emp.branch_id } });
      const bmUserId = bmRows?.[0]?.manager_id;
      if (bmUserId && !notified.has(String(bmUserId))) {
        notified.add(String(bmUserId));
        await insertEmployeeNotification(sequelize, {
          ...payload,
          tenantId: payload.tenantId ?? emp.tenant_id,
          userId: bmUserId,
        });
      }
    }

    // Department managers (role manager/branch_manager in same dept + same tenant)
    if (emp.department) {
      const tid = payload.tenantId ?? emp.tenant_id;
      const [mgrRows] = await sequelize.query(`
        SELECT DISTINCT u.id AS user_id
        FROM users u
        LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = COALESCE(:tid::uuid, u.tenant_id)
        WHERE u.role IN ('manager', 'branch_manager', 'super_admin')
          AND u.is_active = true
          AND (:tid::uuid IS NULL OR u.tenant_id = :tid::uuid)
          AND (e.department = :dept OR u.role = 'super_admin')
        LIMIT 10
      `, { replacements: { dept: emp.department, tid: tid || null } });
      for (const m of mgrRows || []) {
        if (m.user_id && !notified.has(String(m.user_id))) {
          notified.add(String(m.user_id));
          await insertEmployeeNotification(sequelize, {
            ...payload,
            tenantId: tid,
            userId: m.user_id,
          });
        }
      }
    }
  } catch (e) {
    console.warn('notifyManagersForEmployee:', (e as Error)?.message);
  }
}
