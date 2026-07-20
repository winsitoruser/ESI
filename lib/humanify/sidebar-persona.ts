/**
 * Humanify sidebar persona filter — shrink IA for staff / manager vs HR admin.
 * Applied after role+plan filters in HQLayout.
 */
import type { MenuGroup, MenuItem, SidebarConfig, UserRole } from '@/config/sidebar.config';

const PLATFORM_OPS = new Set(['super_admin', 'superadmin', 'platform_admin', 'owner', 'superhero']);

/** Item IDs safe for employee/staff (ESS-first). Marketing welcome hidden — use public `/`. */
const STAFF_ITEMS = new Set([
  'humanify-home',
  'humanify-calendar',
  'humanify-announcements',
  'humanify-ess',
  'humanify-leave',
  'humanify-attendance',
  'humanify-employee-portal',
  'humanify-security',
]);

/** Extra items for managers (MSS + team ops). */
const MANAGER_EXTRA = new Set([
  'humanify-mss',
  'humanify-employees',
  'humanify-attendance-mgmt',
  'humanify-attendance-daily',
  'humanify-kpi',
  'humanify-performance',
  'humanify-okr',
  'humanify-team',
  'humanify-activities',
  'humanify-mutations',
  'humanify-travel',
  'humanify-reimbursement',
]);

/** Items only HR/finance/admin should see. */
const ADMIN_ONLY = new Set([
  'humanify-employees-import',
  'humanify-org-settings',
  'humanify-billing',
  'humanify-enterprise',
  'humanify-sso',
  'humanify-users-team',
  'humanify-users-roles',
  'humanify-go-live',
  'humanify-payroll',
  'humanify-casual',
  'humanify-ai-hub',
  'humanify-ai-copilot',
  'humanify-ai-automation',
  'humanify-industrial-relations',
  'humanify-disciplinary',
]);

function normalizeRole(role?: string | null): string {
  return String(role || '').toLowerCase().trim();
}

export type HumanifyPersona = 'platform' | 'hr_admin' | 'manager' | 'staff';

export function resolveHumanifyPersona(role?: string | null): HumanifyPersona {
  const r = normalizeRole(role);
  if (PLATFORM_OPS.has(r)) return 'platform';
  if (['hq_admin', 'admin', 'hr_admin', 'hr_staff', 'finance_staff'].includes(r)) return 'hr_admin';
  if (['manager', 'branch_manager'].includes(r)) return 'manager';
  return 'staff'; // staff, viewer, employee, cashier, …
}

function filterItems(items: MenuItem[], allow: (id: string) => boolean): MenuItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = filterItems(item.children, allow);
        if (!allow(item.id) && children.length === 0) return null;
        if (!allow(item.id) && children.length > 0) {
          return { ...item, children };
        }
        return { ...item, children };
      }
      return allow(item.id) ? item : null;
    })
    .filter(Boolean) as MenuItem[];
}

export function filterHumanifySidebarByPersona(
  config: SidebarConfig,
  userRole?: UserRole | string | null
): SidebarConfig {
  const persona = resolveHumanifyPersona(userRole);
  if (persona === 'platform' || persona === 'hr_admin') {
    return config; // full IA (lab items labeled/hidden in sidebar config)
  }

  const allow = (id: string) => {
    if (persona === 'staff') return STAFF_ITEMS.has(id);
    // manager
    if (ADMIN_ONLY.has(id)) return false;
    if (STAFF_ITEMS.has(id) || MANAGER_EXTRA.has(id)) return true;
    // allow other non-admin people/attendance/performance items by default for manager
    if (id.startsWith('humanify-payroll')) return false;
    if (id.startsWith('humanify-lms')) return false;
    if (id.startsWith('humanify-ai')) return false;
    return !ADMIN_ONLY.has(id) && !id.includes('billing') && !id.includes('sso') && !id.includes('enterprise');
  };

  const groups: MenuGroup[] = config.groups
    .map((g) => ({ ...g, items: filterItems(g.items, allow) }))
    .filter((g) => g.items.length > 0);

  return { ...config, groups };
}
