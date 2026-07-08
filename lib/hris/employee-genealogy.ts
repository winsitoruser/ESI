/**
 * Employee genealogy — pohon rantai komando & hierarki atasan/bawahan.
 */

import { getDepartmentLabel } from './master-data';

export type WorkRole = 'EXECUTIVE' | 'MANAGER' | 'SUPERVISOR' | 'STAFF';

export const WORK_ROLE_LABELS: Record<WorkRole, string> = {
  EXECUTIVE: 'Eksekutif',
  MANAGER: 'Manajer',
  SUPERVISOR: 'Supervisor',
  STAFF: 'Staf',
};

export const WORK_ROLE_COLORS: Record<WorkRole, string> = {
  EXECUTIVE: 'bg-purple-100 text-purple-700 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
  SUPERVISOR: 'bg-amber-100 text-amber-700 border-amber-200',
  STAFF: 'bg-gray-100 text-gray-700 border-gray-200',
};

export interface GenealogyEmployee {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: string;
  departmentLabel: string;
  branchName: string;
  branchId: string | null;
  workRole: WorkRole;
  workRoleLabel: string;
  status: string;
  supervisorId: string | null;
  supervisorName: string | null;
  directReportCount: number;
}

export interface GenealogyNode extends GenealogyEmployee {
  children: GenealogyNode[];
}

export interface GenealogyChain {
  employee: GenealogyEmployee;
  managers: GenealogyEmployee[];
  directReports: GenealogyEmployee[];
  totalReportsCount: number;
}

export interface GenealogyStats {
  totalEmployees: number;
  roots: number;
  withSupervisor: number;
  withoutSupervisor: number;
  byRole: Record<WorkRole, number>;
}

/** Infer work role from position title */
export function inferWorkRole(position?: string | null): WorkRole {
  const p = (position || '').toLowerCase();
  if (/super\s*admin|ceo|direktur|presiden|chief|founder/i.test(p)) return 'EXECUTIVE';
  if (/manager|manajer|kepala\s*divisi|head\s*of/i.test(p)) return 'MANAGER';
  if (/supervisor|supervis|lead|senior|kepala\s*chef|head\s*chef|kasir\s*senior/i.test(p)) return 'SUPERVISOR';
  return 'STAFF';
}

export function getWorkRoleLabel(role?: string | null): string {
  if (!role) return WORK_ROLE_LABELS.STAFF;
  return WORK_ROLE_LABELS[role as WorkRole] || role;
}

function mapRow(row: Record<string, unknown>): GenealogyEmployee {
  const workRole = (row.work_role as WorkRole) || inferWorkRole(row.position as string);
  return {
    id: String(row.id),
    employeeId: String(row.employee_id || row.employee_code || ''),
    name: String(row.name || ''),
    position: String(row.position || ''),
    department: String(row.department || ''),
    departmentLabel: getDepartmentLabel(row.department as string),
    branchName: String(row.branch_name || ''),
    branchId: row.branch_id ? String(row.branch_id) : null,
    workRole,
    workRoleLabel: getWorkRoleLabel(workRole),
    status: String(row.status || 'ACTIVE'),
    supervisorId: row.supervisor_id ? String(row.supervisor_id) : null,
    supervisorName: row.supervisor_name ? String(row.supervisor_name) : null,
    directReportCount: parseInt(String(row.direct_report_count || 0), 10),
  };
}

/** Build forest of genealogy trees from flat employee list */
export function buildGenealogyTree(rows: Record<string, unknown>[]): GenealogyNode[] {
  const employees = rows.map(mapRow);
  const byId = new Map<string, GenealogyNode>();

  employees.forEach((emp) => {
    byId.set(emp.id, { ...emp, children: [] });
  });

  const roots: GenealogyNode[] = [];

  employees.forEach((emp) => {
    const node = byId.get(emp.id)!;
    if (emp.supervisorId && byId.has(emp.supervisorId)) {
      byId.get(emp.supervisorId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: GenealogyNode[]) => {
    nodes.sort((a, b) => {
      const roleOrder: Record<WorkRole, number> = { EXECUTIVE: 0, MANAGER: 1, SUPERVISOR: 2, STAFF: 3 };
      const rd = roleOrder[a.workRole] - roleOrder[b.workRole];
      if (rd !== 0) return rd;
      return a.name.localeCompare(b.name, 'id');
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

/** Walk manager chain from employee up to root */
export function buildManagerChain(
  employeeId: string,
  rows: Record<string, unknown>[]
): GenealogyEmployee[] {
  const employees = rows.map(mapRow);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const chain: GenealogyEmployee[] = [];
  const emp = byId.get(employeeId);
  if (!emp) return chain;

  let currentId = emp.supervisorId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const manager = byId.get(currentId);
    if (!manager) break;
    chain.push(manager);
    currentId = manager.supervisorId;
  }

  return chain;
}

/** Get direct reports and total descendant count */
export function getDirectReports(
  employeeId: string,
  rows: Record<string, unknown>[]
): { directReports: GenealogyEmployee[]; totalReportsCount: number } {
  const employees = rows.map(mapRow);
  const directReports = employees.filter((e) => e.supervisorId === employeeId);

  const countDescendants = (id: string): number => {
    const children = employees.filter((e) => e.supervisorId === id);
    return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
  };

  return {
    directReports,
    totalReportsCount: countDescendants(employeeId),
  };
}

export function buildGenealogyChain(
  employeeId: string,
  rows: Record<string, unknown>[]
): GenealogyChain | null {
  const employees = rows.map(mapRow);
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return null;

  const managers = buildManagerChain(employeeId, rows);
  const { directReports, totalReportsCount } = getDirectReports(employeeId, rows);

  return { employee: emp, managers, directReports, totalReportsCount };
}

export function computeGenealogyStats(rows: Record<string, unknown>[]): GenealogyStats {
  const employees = rows.map(mapRow);
  const byRole: Record<WorkRole, number> = { EXECUTIVE: 0, MANAGER: 0, SUPERVISOR: 0, STAFF: 0 };

  employees.forEach((e) => {
    byRole[e.workRole] = (byRole[e.workRole] || 0) + 1;
  });

  const withSupervisor = employees.filter((e) => e.supervisorId).length;
  const roots = employees.filter((e) => !e.supervisorId).length;

  return {
    totalEmployees: employees.length,
    roots,
    withSupervisor,
    withoutSupervisor: employees.length - withSupervisor,
    byRole,
  };
}

/** Prevent circular supervisor assignment */
export function wouldCreateCycle(
  employeeId: string,
  newSupervisorId: string | null,
  rows: Record<string, unknown>[]
): boolean {
  if (!newSupervisorId || employeeId === newSupervisorId) return employeeId === newSupervisorId;

  const employees = rows.map(mapRow);
  const byId = new Map(employees.map((e) => [e.id, e]));

  let currentId: string | null = newSupervisorId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = byId.get(currentId)?.supervisorId || null;
  }

  return false;
}
