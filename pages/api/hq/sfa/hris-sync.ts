import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) { console.error('HRIS-Sync Q:', e.message); return []; }
}
async function qOne(sql: string, replacements?: any): Promise<any> {
  const rows = await q(sql, replacements); return rows[0] || null;
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, replacements ? { replacements } : undefined); return true; }
  catch (e: any) { console.error('HRIS-Sync Exec:', e.message); return false; }
}

// ════════════════════════════════════════════════════════════
// HRIS ↔ SFA Field Force Sync API
// Bridges HRIS employee data with SFA team management
// ════════════════════════════════════════════════════════════
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);
    const { action } = req.query;

    // ═══════════════════════════════════════
    // GET endpoints
    // ═══════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // List all HRIS employees available for SFA assignment
        case 'hris-employees': {
          const { department, status, search, unassigned } = req.query;
          let where = `WHERE he."tenantId" = :tid`;
          const params: any = { tid: tenantId };

          if (department) { where += ` AND he.department = :dept`; params.dept = department; }
          if (status) { where += ` AND he.status = :st`; params.st = status; }
          else { where += ` AND he.status = 'active'`; }
          if (search) { where += ` AND (he.name ILIKE :s OR he.email ILIKE :s OR he."employeeNumber" ILIKE :s)`; params.s = `%${search}%`; }

          // Only show employees not yet assigned to any SFA team
          if (unassigned === 'true') {
            where += ` AND NOT EXISTS (
              SELECT 1 FROM sfa_team_members stm
              JOIN users u ON u.id = stm.user_id
              WHERE u.email = he.email AND stm.is_active = true
            )`;
          }

          const employees = await q(`
            SELECT he.id, he."employeeNumber", he.name, he.email, he.phone,
              he.position, he.department, he."employmentType", he.status,
              he."branchId", he."joinDate",
              b.name as branch_name,
              he."managerId",
              mgr.name as manager_name,
              -- Check if already synced to SFA
              (SELECT stm.id FROM sfa_team_members stm JOIN users u ON u.id = stm.user_id WHERE u.email = he.email AND stm.is_active = true LIMIT 1) as sfa_member_id,
              (SELECT st.name FROM sfa_team_members stm JOIN users u ON u.id = stm.user_id JOIN sfa_teams st ON st.id = stm.team_id WHERE u.email = he.email AND stm.is_active = true LIMIT 1) as sfa_team_name
            FROM hris_employees he
            LEFT JOIN branches b ON b.id = he."branchId"
            LEFT JOIN hris_employees mgr ON mgr.id = he."managerId"
            ${where}
            ORDER BY he.department, he.name
          `, params);

          return res.json({ success: true, data: employees });
        }

        // List departments from HRIS (distinct values)
        case 'departments': {
          const depts = await q(`
            SELECT DISTINCT he.department, COUNT(*) as employee_count,
              COUNT(*) FILTER (WHERE he.status = 'active') as active_count
            FROM hris_employees he
            WHERE he."tenantId" = :tid AND he.department IS NOT NULL
            GROUP BY he.department
            ORDER BY he.department
          `, { tid: tenantId });
          return res.json({ success: true, data: depts });
        }

        // Sync overview — what's synced, what's not
        case 'sync-status': {
          const [totalHris, activeHris, syncedToSfa, sfaTeams, sfaMembers] = await Promise.all([
            qOne(`SELECT COUNT(*) as c FROM hris_employees WHERE "tenantId" = :tid`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM hris_employees WHERE "tenantId" = :tid AND status = 'active'`, { tid: tenantId }),
            qOne(`SELECT COUNT(DISTINCT u.email) as c FROM sfa_team_members stm JOIN users u ON u.id = stm.user_id WHERE stm.is_active = true AND EXISTS (SELECT 1 FROM hris_employees he WHERE he.email = u.email AND he."tenantId" = :tid)`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM sfa_teams WHERE tenant_id = :tid AND is_active = true`, { tid: tenantId }),
            qOne(`SELECT COUNT(*) as c FROM sfa_team_members stm JOIN sfa_teams st ON st.id = stm.team_id WHERE stm.is_active = true AND st.tenant_id = :tid`, { tid: tenantId }),
          ]);

          return res.json({
            success: true,
            data: {
              totalHrisEmployees: parseInt(totalHris?.c || 0),
              activeHrisEmployees: parseInt(activeHris?.c || 0),
              syncedToSfa: parseInt(syncedToSfa?.c || 0),
              sfaTeams: parseInt(sfaTeams?.c || 0),
              sfaMembers: parseInt(sfaMembers?.c || 0),
              unsyncedCount: parseInt(activeHris?.c || 0) - parseInt(syncedToSfa?.c || 0),
            }
          });
        }

        // List users available for SFA (from users table, with HRIS enrichment)
        case 'available-users': {
          const { search: srch } = req.query;
          let uw = `WHERE u."tenantId" = :tid AND u."isActive" = true`;
          const up: any = { tid: tenantId };
          if (srch) { uw += ` AND (u.name ILIKE :s OR u.email ILIKE :s)`; up.s = `%${srch}%`; }

          const users = await q(`
            SELECT u.id, u.name, u.email, u.role, u.phone,
              he.department as hris_department, he.position as hris_position,
              he."employeeNumber" as hris_number, he."employmentType" as hris_type,
              (SELECT stm.id FROM sfa_team_members stm WHERE stm.user_id = u.id AND stm.is_active = true LIMIT 1) as current_member_id,
              (SELECT st.name FROM sfa_team_members stm JOIN sfa_teams st ON st.id = stm.team_id WHERE stm.user_id = u.id AND stm.is_active = true LIMIT 1) as current_team
            FROM users u
            LEFT JOIN hris_employees he ON he.email = u.email AND he."tenantId" = :tid
            ${uw}
            ORDER BY u.name
          `, up);

          return res.json({ success: true, data: users });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ═══════════════════════════════════════
    // POST endpoints (manager-only)
    // ═══════════════════════════════════════
    if (req.method === 'POST') {
      if (!isManager) return res.status(403).json({ success: false, error: 'Akses ditolak' });

      switch (action) {

        // Sync a single HRIS employee to SFA team
        case 'sync-employee': {
          const { hris_employee_id, team_id, role, position, daily_visit_target, monthly_revenue_target } = req.body;
          if (!hris_employee_id || !team_id) return res.status(400).json({ success: false, error: 'hris_employee_id & team_id required' });

          // Get HRIS employee
          const emp = await qOne(`SELECT * FROM hris_employees WHERE id = :id AND "tenantId" = :tid`, { id: hris_employee_id, tid: tenantId });
          if (!emp) return res.status(404).json({ success: false, error: 'HRIS employee not found' });

          // Find or create user account for this employee
          let user = await qOne(`SELECT id, name, email, role FROM users WHERE email = :email AND "tenantId" = :tid`, { email: emp.email, tid: tenantId });

          if (!user) {
            // Create user from HRIS data with 'staff' role by default
            const [newUser] = await q(`
              INSERT INTO users (name, email, phone, role, "tenantId", "isActive", "createdAt", "updatedAt")
              VALUES (:name, :email, :phone, :role, :tid, true, NOW(), NOW())
              RETURNING id, name, email, role
            `, {
              name: emp.name, email: emp.email, phone: emp.phone,
              role: role === 'leader' ? 'manager' : 'staff', tid: tenantId
            });
            user = newUser;
          }

          if (!user) return res.status(500).json({ success: false, error: 'Failed to resolve user account' });

          // Add to SFA team
          await qExec(`
            INSERT INTO sfa_team_members (team_id, user_id, role, position, daily_visit_target, monthly_revenue_target)
            VALUES (:teamId, :userId, :role, :pos, :dvt, :mrt)
            ON CONFLICT (team_id, user_id) DO UPDATE SET
              role = :role, position = :pos, is_active = true,
              daily_visit_target = :dvt, monthly_revenue_target = :mrt, updated_at = NOW()
          `, {
            teamId: team_id, userId: user.id,
            role: role || 'member',
            pos: position || emp.position || 'Sales Executive',
            dvt: daily_visit_target || 8,
            mrt: monthly_revenue_target || 0,
          });

          return res.json({
            success: true,
            message: `${emp.name} ditambahkan ke tim sebagai ${role || 'member'}`,
            data: { userId: user.id, employeeName: emp.name }
          });
        }

        // Bulk sync: entire department to a team
        case 'sync-department': {
          const { department, team_id, default_role, default_position } = req.body;
          if (!department || !team_id) return res.status(400).json({ success: false, error: 'department & team_id required' });

          const employees = await q(`
            SELECT * FROM hris_employees
            WHERE "tenantId" = :tid AND department = :dept AND status = 'active'
          `, { tid: tenantId, dept: department });

          let synced = 0;
          let skipped = 0;
          for (const emp of employees) {
            // Find or create user
            let user = await qOne(`SELECT id FROM users WHERE email = :email AND "tenantId" = :tid`, { email: emp.email, tid: tenantId });
            if (!user) {
              const [u] = await q(`
                INSERT INTO users (name, email, phone, role, "tenantId", "isActive", "createdAt", "updatedAt")
                VALUES (:name, :email, :phone, 'staff', :tid, true, NOW(), NOW()) RETURNING id
              `, { name: emp.name, email: emp.email, phone: emp.phone, tid: tenantId });
              user = u;
            }
            if (!user) { skipped++; continue; }

            const ok = await qExec(`
              INSERT INTO sfa_team_members (team_id, user_id, role, position, daily_visit_target, monthly_revenue_target)
              VALUES (:teamId, :userId, :role, :pos, 8, 0)
              ON CONFLICT (team_id, user_id) DO UPDATE SET is_active = true, updated_at = NOW()
            `, { teamId: team_id, userId: user.id, role: default_role || 'member', pos: default_position || emp.position || 'Sales Executive' });

            if (ok) synced++; else skipped++;
          }

          return res.json({
            success: true,
            message: `${synced} karyawan disinkronkan, ${skipped} dilewati`,
            data: { synced, skipped, total: employees.length }
          });
        }

        // Create SFA team from HRIS department
        case 'create-team-from-dept': {
          const { department, territory_id, team_type, auto_sync_members } = req.body;
          if (!department) return res.status(400).json({ success: false, error: 'department required' });

          const code = `DEPT-${department.replace(/\s+/g, '-').toUpperCase().slice(0, 15)}`;
          const name = `Tim ${department}`;

          // Check if team already exists
          const existing = await qOne(`SELECT id FROM sfa_teams WHERE tenant_id = :tid AND code = :code`, { tid: tenantId, code });
          if (existing) return res.status(400).json({ success: false, error: `Tim untuk department "${department}" sudah ada` });

          const [team] = await q(`
            INSERT INTO sfa_teams (tenant_id, code, name, description, team_type, territory_id, created_by)
            VALUES (:tid, :code, :name, :desc, :tt, :ter, :uid)
            RETURNING id
          `, {
            tid: tenantId, code, name,
            desc: `Auto-created from HRIS department: ${department}`,
            tt: team_type || 'field_force',
            ter: territory_id || null, uid: userId
          });

          let syncResult = null;
          if (auto_sync_members && team) {
            // Sync all active employees from that department
            const employees = await q(`
              SELECT * FROM hris_employees WHERE "tenantId" = :tid AND department = :dept AND status = 'active'
            `, { tid: tenantId, dept: department });

            let synced = 0;
            for (const emp of employees) {
              let user = await qOne(`SELECT id FROM users WHERE email = :email AND "tenantId" = :tid`, { email: emp.email, tid: tenantId });
              if (!user) {
                const [u] = await q(`
                  INSERT INTO users (name, email, phone, role, "tenantId", "isActive", "createdAt", "updatedAt")
                  VALUES (:name, :email, :phone, 'staff', :tid, true, NOW(), NOW()) RETURNING id
                `, { name: emp.name, email: emp.email, phone: emp.phone, tid: tenantId });
                user = u;
              }
              if (user) {
                await qExec(`
                  INSERT INTO sfa_team_members (team_id, user_id, role, position) VALUES (:teamId, :userId, 'member', :pos)
                  ON CONFLICT (team_id, user_id) DO UPDATE SET is_active = true
                `, { teamId: team.id, userId: user.id, pos: emp.position || 'Sales Executive' });
                synced++;
              }
            }
            syncResult = { membersSynced: synced, totalEmployees: employees.length };
          }

          return res.json({
            success: true,
            message: `Tim "${name}" berhasil dibuat`,
            data: { teamId: team?.id, syncResult }
          });
        }

        // Update CRM/SFA role for a user (HRIS-driven)
        case 'assign-sfa-role': {
          const { user_id, sfa_role } = req.body;
          if (!user_id || !sfa_role) return res.status(400).json({ success: false, error: 'user_id & sfa_role required' });

          // Update the user's role
          const validRoles = ['staff', 'manager', 'admin', 'supervisor'];
          if (!validRoles.includes(sfa_role)) return res.status(400).json({ success: false, error: 'Invalid role' });

          await qExec(`UPDATE users SET role = :role, "updatedAt" = NOW() WHERE id = :uid AND "tenantId" = :tid`, { role: sfa_role, uid: user_id, tid: tenantId });

          return res.json({ success: true, message: `Role diubah ke ${sfa_role}` });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('HRIS-Sync Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
