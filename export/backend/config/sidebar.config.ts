import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  FileText,
  Settings,
  ShoppingCart,
  TrendingUp,
  Bell,
  Shield,
  ClipboardList,
  Truck,
  BarChart3,
  History,
  Globe,
  DollarSign,
  Layers,
  Store,
  UserCog,
  FileBarChart,
  AlertCircle,
  UserCheck,
  Target,
  CalendarCheck,
  Award,
  Wallet,
  Banknote,
  PiggyBank,
  Receipt,
  CreditCard,
  Calculator,
  ArrowRightLeft,
  FileSpreadsheet,
  Plug,
  Utensils,
  Calendar,
  ChefHat,
  Ticket,
  CalendarDays,
  type LucideIcon
} from 'lucide-react';

// Types
export type UserRole = 
  | 'super_admin' 
  | 'owner' 
  | 'hq_admin' 
  | 'branch_manager' 
  | 'cashier' 
  | 'inventory_staff'
  | 'kitchen_staff'
  | 'finance_staff'
  | 'hr_staff';

export type ModuleCode = 
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'loyalty'
  | 'tables'
  | 'reservations'
  | 'kitchen'
  | 'promo'
  | 'finance'
  | 'reports'
  | 'settings'
  | 'hris'
  | 'branches'
  | 'supply_chain'
  | 'products'
  | 'users'
  | 'audit'
  | 'integrations';

export type LayoutType = 'hq' | 'branch' | 'admin';

export interface MenuItem {
  id: string;
  name: string;
  href?: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: string;
  children?: MenuItem[];
  // Access control
  roles?: UserRole[];
  modules?: ModuleCode[];
  permissions?: string[];
  // Visibility
  hidden?: boolean;
  comingSoon?: boolean;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
  roles?: UserRole[];
  collapsed?: boolean;
}

export interface SidebarConfig {
  layout: LayoutType;
  groups: MenuGroup[];
  logo: {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    href: string;
  };
}

// ============================================
// HQ SIDEBAR CONFIGURATION
// ============================================
export const hqSidebarConfig: SidebarConfig = {
  layout: 'hq',
  logo: {
    icon: Building2,
    title: 'Bedagang',
    subtitle: 'HQ Platform',
    href: '/hq/dashboard'
  },
  groups: [
    {
      id: 'main',
      title: 'Utama',
      items: [
        { 
          id: 'dashboard',
          name: 'Dashboard', 
          href: '/hq/dashboard', 
          icon: LayoutDashboard,
          modules: ['dashboard']
        }
      ]
    },
    {
      id: 'operations',
      title: 'Operasional',
      items: [
        { 
          id: 'branches',
          name: 'Cabang', 
          icon: Building2,
          modules: ['branches'],
          children: [
            { id: 'branch-list', name: 'Daftar Cabang', href: '/hq/branches', icon: Store },
            { id: 'branch-performance', name: 'Performa Cabang', href: '/hq/branches/performance', icon: TrendingUp },
            { id: 'branch-settings', name: 'Pengaturan Cabang', href: '/hq/branches/settings', icon: Settings },
          ]
        },
        { 
          id: 'inventory',
          name: 'Inventory', 
          icon: Package,
          modules: ['inventory'],
          children: [
            { id: 'inv-dashboard', name: 'Dashboard', href: '/hq/inventory', icon: LayoutDashboard },
            { id: 'inv-stock', name: 'Stok Global', href: '/hq/inventory/stock', icon: Package },
            { id: 'inv-categories', name: 'Kategori Produk', href: '/hq/inventory/categories', icon: Layers },
            { id: 'inv-pricing', name: 'Harga & Pricing', href: '/hq/inventory/pricing', icon: DollarSign },
            { id: 'inv-transfers', name: 'Transfer Stok', href: '/hq/inventory/transfers', icon: ArrowRightLeft },
            { id: 'inv-alerts', name: 'Alerts', href: '/hq/inventory/alerts', icon: AlertCircle },
            { id: 'inv-stocktake', name: 'Stock Opname', href: '/hq/inventory/stocktake', icon: ClipboardList },
            { id: 'inv-receipts', name: 'Penerimaan Barang', href: '/hq/inventory/receipts', icon: FileText },
          ]
        },
        { 
          id: 'supply-chain',
          name: 'Supply Chain', 
          icon: Truck,
          modules: ['supply_chain'],
          children: [
            { id: 'sc-requisitions', name: 'Internal Requisition', href: '/hq/requisitions', icon: ClipboardList },
            { id: 'sc-po', name: 'Purchase Order', href: '/hq/purchase-orders', icon: ShoppingCart },
            { id: 'sc-suppliers', name: 'Supplier', href: '/hq/suppliers', icon: Truck },
          ]
        },
        { 
          id: 'products',
          name: 'Produk & Menu', 
          icon: Package,
          modules: ['products'],
          children: [
            { id: 'prod-master', name: 'Master Produk', href: '/hq/products', icon: Package },
          ]
        }
      ]
    },
    {
      id: 'hr',
      title: 'SDM & HRIS',
      items: [
        { 
          id: 'users',
          name: 'Pengguna', 
          icon: Users,
          modules: ['users'],
          roles: ['super_admin', 'owner', 'hq_admin'],
          children: [
            { id: 'user-all', name: 'Semua Pengguna', href: '/hq/users', icon: Users },
            { id: 'user-roles', name: 'Role & Akses', href: '/hq/users/roles', icon: Shield },
            { id: 'user-managers', name: 'Branch Manager', href: '/hq/users/managers', icon: UserCog },
          ]
        },
        { 
          id: 'hris',
          name: 'HRIS', 
          icon: UserCheck,
          modules: ['hris'],
          roles: ['super_admin', 'owner', 'hq_admin', 'hr_staff'],
          children: [
            { id: 'hris-dashboard', name: 'Dashboard HRIS', href: '/hq/hris', icon: LayoutDashboard },
            { id: 'hris-kpi', name: 'KPI Karyawan', href: '/hq/hris/kpi', icon: Target },
            { id: 'hris-kpi-settings', name: 'KPI Settings', href: '/hq/hris/kpi-settings', icon: Settings },
            { id: 'hris-attendance', name: 'Kehadiran', href: '/hq/hris/attendance', icon: CalendarCheck },
            { id: 'hris-performance', name: 'Performance Review', href: '/hq/hris/performance', icon: Award },
          ]
        }
      ]
    },
    {
      id: 'finance',
      title: 'Keuangan',
      items: [
        { 
          id: 'finance',
          name: 'Keuangan', 
          icon: Wallet,
          modules: ['finance'],
          roles: ['super_admin', 'owner', 'hq_admin', 'finance_staff'],
          children: [
            { id: 'fin-dashboard', name: 'Dashboard Keuangan', href: '/hq/finance', icon: LayoutDashboard },
            { id: 'fin-revenue', name: 'Analisis Revenue', href: '/hq/finance/revenue', icon: TrendingUp },
            { id: 'fin-expenses', name: 'Pengeluaran', href: '/hq/finance/expenses', icon: CreditCard },
            { id: 'fin-pl', name: 'Laba Rugi', href: '/hq/finance/profit-loss', icon: FileSpreadsheet },
            { id: 'fin-cashflow', name: 'Arus Kas', href: '/hq/finance/cash-flow', icon: ArrowRightLeft },
            { id: 'fin-invoices', name: 'Invoice', href: '/hq/finance/invoices', icon: FileText },
            { id: 'fin-accounts', name: 'Piutang & Hutang', href: '/hq/finance/accounts', icon: Receipt },
            { id: 'fin-budget', name: 'Anggaran', href: '/hq/finance/budget', icon: PiggyBank },
            { id: 'fin-tax', name: 'Pajak', href: '/hq/finance/tax', icon: Calculator },
          ]
        }
      ]
    },
    {
      id: 'reports',
      title: 'Laporan & Audit',
      items: [
        { 
          id: 'reports',
          name: 'Laporan', 
          icon: BarChart3,
          modules: ['reports'],
          children: [
            { id: 'rep-sales', name: 'Laporan Penjualan', href: '/hq/reports/sales', icon: TrendingUp },
            { id: 'rep-consolidated', name: 'Laporan Konsolidasi', href: '/hq/reports/consolidated', icon: FileBarChart },
            { id: 'rep-inventory', name: 'Laporan Stok', href: '/hq/reports/inventory', icon: Package },
            { id: 'rep-finance', name: 'Laporan Keuangan', href: '/hq/reports/finance', icon: DollarSign },
          ]
        },
        { 
          id: 'audit',
          name: 'Audit Log', 
          href: '/hq/audit-logs', 
          icon: History,
          modules: ['audit'],
          roles: ['super_admin', 'owner', 'hq_admin']
        }
      ]
    },
    {
      id: 'settings',
      title: 'Pengaturan',
      items: [
        { 
          id: 'settings',
          name: 'Pengaturan', 
          icon: Settings,
          modules: ['settings'],
          children: [
            { id: 'set-global', name: 'Global Settings', href: '/hq/settings', icon: Globe },
            { id: 'set-integrations', name: 'Integrasi Pihak Ketiga', href: '/hq/settings/integrations', icon: Plug },
            { id: 'set-taxes', name: 'Pajak & Biaya', href: '/hq/settings/taxes', icon: FileText },
            { id: 'set-notifications', name: 'Notifikasi', href: '/hq/settings/notifications', icon: Bell },
          ]
        }
      ]
    }
  ]
};

// ============================================
// BRANCH SIDEBAR CONFIGURATION
// ============================================
export const branchSidebarConfig: SidebarConfig = {
  layout: 'branch',
  logo: {
    icon: Store,
    title: 'BEDAGANG',
    href: '/dashboard'
  },
  groups: [
    {
      id: 'outlet',
      title: 'OUTLET',
      items: [
        { id: 'dashboard', name: 'Dasbor', href: '/dashboard', icon: LayoutDashboard, modules: ['dashboard'] },
        { id: 'pos', name: 'Kasir', href: '/pos', icon: ShoppingCart, modules: ['pos'] },
        { id: 'inventory', name: 'Inventori', href: '/inventory', icon: Package, modules: ['inventory'] },
        { id: 'customers', name: 'Pelanggan', href: '/customers', icon: Users, modules: ['customers'] },
        { id: 'employees', name: 'Jadwal & Shift', href: '/employees/schedules', icon: CalendarDays, modules: ['employees'] },
        { id: 'loyalty', name: 'Program Loyalitas', href: '/loyalty-program', icon: Award, modules: ['loyalty'] },
      ]
    },
    {
      id: 'operations',
      title: 'OPERASIONAL',
      items: [
        { id: 'tables', name: 'Manajemen Meja', href: '/tables', icon: Utensils, modules: ['tables'] },
        { id: 'reservations', name: 'Reservasi', href: '/reservations', icon: Calendar, modules: ['reservations'] },
        { id: 'kitchen', name: 'Management Kitchen', href: '/kitchen', icon: ChefHat, modules: ['kitchen'] },
        { id: 'promo', name: 'Promo & Voucher', href: '/promo-voucher', icon: Ticket, modules: ['promo'] },
      ]
    },
    {
      id: 'backoffice',
      title: 'BACKOFFICE',
      items: [
        { id: 'finance', name: 'Keuangan', href: '/finance', icon: Wallet, modules: ['finance'] },
        { id: 'reports', name: 'Laporan', href: '/reports', icon: BarChart3, modules: ['reports'] },
        { id: 'settings', name: 'Pengaturan', href: '/settings', icon: Settings, modules: ['settings'] },
      ]
    }
  ]
};

// ============================================
// ADMIN SIDEBAR CONFIGURATION  
// ============================================
export const adminSidebarConfig: SidebarConfig = {
  layout: 'admin',
  logo: {
    icon: Shield,
    title: 'Bedagang',
    subtitle: 'Admin Panel',
    href: '/admin/dashboard'
  },
  groups: [
    {
      id: 'main',
      title: 'Utama',
      items: [
        { id: 'dashboard', name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { id: 'tenants', name: 'Tenants', href: '/admin/tenants', icon: Building2 },
        { id: 'users', name: 'Users', href: '/admin/users', icon: Users },
        { id: 'modules', name: 'Modules', href: '/admin/modules', icon: Package },
        { id: 'business-types', name: 'Business Types', href: '/admin/business-types', icon: Store },
      ]
    },
    {
      id: 'system',
      title: 'System',
      items: [
        { id: 'logs', name: 'System Logs', href: '/admin/logs', icon: FileText },
        { id: 'settings', name: 'Settings', href: '/admin/settings', icon: Settings },
      ]
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSidebarConfig(layout: LayoutType): SidebarConfig {
  switch (layout) {
    case 'hq':
      return hqSidebarConfig;
    case 'branch':
      return branchSidebarConfig;
    case 'admin':
      return adminSidebarConfig;
    default:
      return branchSidebarConfig;
  }
}

export function filterMenuByRole(items: MenuItem[], userRole?: UserRole): MenuItem[] {
  if (!userRole) return items;
  
  // Super admin and owner see everything
  if (userRole === 'super_admin' || userRole === 'owner') {
    return items;
  }

  return items.filter(item => {
    // If no roles specified, show to everyone
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.includes(userRole);
  }).map(item => {
    // Recursively filter children
    if (item.children) {
      return {
        ...item,
        children: filterMenuByRole(item.children, userRole)
      };
    }
    return item;
  }).filter(item => {
    // Remove items with no children after filtering
    if (item.children && item.children.length === 0) {
      return false;
    }
    return true;
  });
}

export function filterMenuByModules(
  items: MenuItem[], 
  enabledModules: ModuleCode[],
  userRole?: UserRole
): MenuItem[] {
  // Super admin and owner see everything
  if (userRole === 'super_admin' || userRole === 'owner') {
    return items;
  }

  return items.filter(item => {
    // If no modules specified, show to everyone
    if (!item.modules || item.modules.length === 0) {
      return true;
    }
    // Check if any of the item's modules are enabled
    return item.modules.some(mod => enabledModules.includes(mod));
  }).map(item => {
    // Recursively filter children
    if (item.children) {
      return {
        ...item,
        children: filterMenuByModules(item.children, enabledModules, userRole)
      };
    }
    return item;
  }).filter(item => {
    // Remove items with no children after filtering
    if (item.children && item.children.length === 0) {
      return false;
    }
    return true;
  });
}

export function filterSidebarConfig(
  config: SidebarConfig,
  userRole?: UserRole,
  enabledModules?: ModuleCode[]
): SidebarConfig {
  const filteredGroups = config.groups
    .filter(group => {
      // Filter groups by role if specified
      if (group.roles && group.roles.length > 0 && userRole) {
        if (userRole !== 'super_admin' && userRole !== 'owner') {
          if (!group.roles.includes(userRole)) {
            return false;
          }
        }
      }
      return true;
    })
    .map(group => {
      let filteredItems = group.items;

      // Filter by role
      if (userRole) {
        filteredItems = filterMenuByRole(filteredItems, userRole);
      }

      // Filter by modules
      if (enabledModules && enabledModules.length > 0) {
        filteredItems = filterMenuByModules(filteredItems, enabledModules, userRole);
      }

      return {
        ...group,
        items: filteredItems
      };
    })
    .filter(group => group.items.length > 0); // Remove empty groups

  return {
    ...config,
    groups: filteredGroups
  };
}

export function flattenMenuItems(groups: MenuGroup[]): MenuItem[] {
  const items: MenuItem[] = [];
  
  groups.forEach(group => {
    group.items.forEach(item => {
      items.push(item);
      if (item.children) {
        items.push(...item.children);
      }
    });
  });
  
  return items;
}

export function findActiveMenuItem(groups: MenuGroup[], pathname: string): MenuItem | undefined {
  const allItems = flattenMenuItems(groups);
  return allItems.find(item => {
    if (!item.href) return false;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  });
}

export function getParentMenuItem(groups: MenuGroup[], childId: string): MenuItem | undefined {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children) {
        const child = item.children.find(c => c.id === childId);
        if (child) {
          return item;
        }
      }
    }
  }
  return undefined;
}
