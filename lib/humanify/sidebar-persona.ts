/**
 * Humanify sidebar persona filter — shrink IA for staff / manager vs HR admin.
 * Applied after role+plan filters in HQLayout.
 */
import type { MenuGroup, MenuItem, SidebarConfig, UserRole } from '@/config/sidebar.config';

const PLATFORM_OPS = new Set(['super_admin', 'superadmin', 'platform_admin', 'owner', 'superhero']);

/** Strict platform control-plane roles (not tenant owner). */
const STRICT_PLATFORM_OPS = new Set(['super_admin', 'superadmin', 'platform_admin']);

/** Sidebar items only for Humanify platform operators. */
export const PLATFORM_CONTROL_ITEMS = new Set([
  'platform-ops-hub',
  'platform-ops-clients',
  'platform-ops-partners',
  'platform-ops-observability',
]);

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
  'humanify-knowledge-base',
  'humanify-support',
]);

/** Extra items for managers (MSS + team ops). */
const MANAGER_EXTRA = new Set([
  'humanify-mss',
  'humanify-employees',
  'humanify-attendance-group',
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
  'humanify-knowledge-base',
  'humanify-support',
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
  'humanify-ir',
  'humanify-industrial-relations',
  'humanify-disciplinary',
]);

function normalizeRole(role?: string | null): string {
  return String(role || '').toLowerCase().trim();
}

export function isStrictPlatformOperator(role?: string | null): boolean {
  return STRICT_PLATFORM_OPS.has(normalizeRole(role));
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
  // Platform control plane: only strict ops (super_admin / platform_admin), not tenant owner
  let working = config;
  if (!isStrictPlatformOperator(userRole)) {
    working = {
      ...config,
      groups: config.groups
        .map((g) => ({
          ...g,
          items: filterItems(g.items, (id) => !PLATFORM_CONTROL_ITEMS.has(id)),
        }))
        .filter((g) => g.items.length > 0),
    };
  }

  const persona = resolveHumanifyPersona(userRole);
  if (persona === 'platform' || persona === 'hr_admin') {
    return working;
  }

  const allow = (id: string) => {
    if (PLATFORM_CONTROL_ITEMS.has(id)) return false;
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

  const groups: MenuGroup[] = working.groups
    .map((g) => ({ ...g, items: filterItems(g.items, allow) }))
    .filter((g) => g.items.length > 0);

  return { ...working, groups };
}
