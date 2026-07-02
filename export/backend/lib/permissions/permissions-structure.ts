// Permission Structure for BEDAGANG POS
// Defines all modules, sub-modules, and their available operations

export interface Permission {
  module: string;
  subModule?: string;
  operations: string[];
}

export interface RolePermissions {
  [key: string]: boolean;
}

// Complete permission structure
export const PERMISSIONS_STRUCTURE = {
  // Dashboard Module
  dashboard: {
    label: 'Dashboard',
    permissions: {
      'dashboard.view': 'View Dashboard',
      'dashboard.analytics': 'View Analytics'
    }
  },

  // POS Module
  pos: {
    label: 'Point of Sale',
    permissions: {
      'pos.view': 'View POS',
      'pos.create_transaction': 'Create Transaction',
      'pos.void_transaction': 'Void Transaction',
      'pos.discount': 'Apply Discount',
      'pos.refund': 'Process Refund',
      'pos.view_receipts': 'View Receipts',
      'pos.print_receipt': 'Print Receipt',
      'pos.settings': 'Manage POS Settings'
    }
  },

  // Products Module
  products: {
    label: 'Products',
    permissions: {
      'products.view': 'View Products',
      'products.create': 'Create Product',
      'products.edit': 'Edit Product',
      'products.delete': 'Delete Product',
      'products.import': 'Import Products',
      'products.export': 'Export Products',
      'products.manage_categories': 'Manage Categories',
      'products.manage_stock': 'Manage Stock'
    }
  },

  // Inventory Module
  inventory: {
    label: 'Inventory',
    permissions: {
      'inventory.view': 'View Inventory',
      'inventory.stock_in': 'Stock In',
      'inventory.stock_out': 'Stock Out',
      'inventory.stock_transfer': 'Stock Transfer',
      'inventory.stock_opname': 'Stock Opname',
      'inventory.view_history': 'View Stock History',
      'inventory.settings': 'Manage Inventory Settings'
    }
  },

  // Purchase Module
  purchase: {
    label: 'Purchase',
    permissions: {
      'purchase.view': 'View Purchases',
      'purchase.create': 'Create Purchase Order',
      'purchase.edit': 'Edit Purchase Order',
      'purchase.delete': 'Delete Purchase Order',
      'purchase.approve': 'Approve Purchase',
      'purchase.receive': 'Receive Goods',
      'purchase.manage_suppliers': 'Manage Suppliers'
    }
  },

  // Customers Module
  customers: {
    label: 'Customers',
    permissions: {
      'customers.view': 'View Customers',
      'customers.create': 'Create Customer',
      'customers.edit': 'Edit Customer',
      'customers.delete': 'Delete Customer',
      'customers.view_transactions': 'View Customer Transactions',
      'customers.manage_loyalty': 'Manage Loyalty Points'
    }
  },

  // Employees Module
  employees: {
    label: 'Employees',
    permissions: {
      'employees.view': 'View Employees',
      'employees.create': 'Create Employee',
      'employees.edit': 'Edit Employee',
      'employees.delete': 'Delete Employee',
      'employees.view_attendance': 'View Attendance',
      'employees.manage_payroll': 'Manage Payroll'
    }
  },

  // Finance Module
  finance: {
    label: 'Finance',
    permissions: {
      'finance.view': 'View Finance',
      'finance.view_cashflow': 'View Cash Flow',
      'finance.create_expense': 'Create Expense',
      'finance.edit_expense': 'Edit Expense',
      'finance.delete_expense': 'Delete Expense',
      'finance.view_income': 'View Income',
      'finance.manage_accounts': 'Manage Accounts',
      'finance.settings': 'Manage Finance Settings'
    }
  },

  // Reports Module
  reports: {
    label: 'Reports',
    permissions: {
      'reports.view': 'View Reports',
      'reports.sales': 'View Sales Reports',
      'reports.inventory': 'View Inventory Reports',
      'reports.finance': 'View Finance Reports',
      'reports.customers': 'View Customer Reports',
      'reports.employees': 'View Employee Reports',
      'reports.export': 'Export Reports',
      'reports.print': 'Print Reports'
    }
  },

  // Promotions Module
  promotions: {
    label: 'Promotions',
    permissions: {
      'promotions.view': 'View Promotions',
      'promotions.create': 'Create Promotion',
      'promotions.edit': 'Edit Promotion',
      'promotions.delete': 'Delete Promotion',
      'promotions.activate': 'Activate/Deactivate Promotion'
    }
  },

  // Settings Module
  settings: {
    label: 'Settings',
    permissions: {
      'settings.view': 'View Settings',
      'settings.store': 'Manage Store Settings',
      'settings.users': 'Manage Users',
      'settings.roles': 'Manage Roles & Permissions',
      'settings.security': 'Manage Security',
      'settings.backup': 'Manage Backup & Restore',
      'settings.inventory': 'Manage Inventory Settings',
      'settings.hardware': 'Manage Hardware',
      'settings.notifications': 'Manage Notifications',
      'settings.integrations': 'Manage Integrations',
      'settings.billing': 'Manage Billing',
      'settings.appearance': 'Manage Appearance'
    }
  }
};

// Predefined roles with their permissions
export const DEFAULT_ROLES = {
  admin: {
    name: 'Administrator',
    description: 'Full access to all features',
    permissions: {
      // All permissions enabled
      'dashboard.view': true,
      'dashboard.analytics': true,
      'pos.view': true,
      'pos.create_transaction': true,
      'pos.void_transaction': true,
      'pos.discount': true,
      'pos.refund': true,
      'pos.view_receipts': true,
      'pos.print_receipt': true,
      'pos.settings': true,
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'products.delete': true,
      'products.import': true,
      'products.export': true,
      'products.manage_categories': true,
      'products.manage_stock': true,
      'inventory.view': true,
      'inventory.stock_in': true,
      'inventory.stock_out': true,
      'inventory.stock_transfer': true,
      'inventory.stock_opname': true,
      'inventory.view_history': true,
      'inventory.settings': true,
      'purchase.view': true,
      'purchase.create': true,
      'purchase.edit': true,
      'purchase.delete': true,
      'purchase.approve': true,
      'purchase.receive': true,
      'purchase.manage_suppliers': true,
      'customers.view': true,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': true,
      'customers.view_transactions': true,
      'customers.manage_loyalty': true,
      'employees.view': true,
      'employees.create': true,
      'employees.edit': true,
      'employees.delete': true,
      'employees.view_attendance': true,
      'employees.manage_payroll': true,
      'finance.view': true,
      'finance.view_cashflow': true,
      'finance.create_expense': true,
      'finance.edit_expense': true,
      'finance.delete_expense': true,
      'finance.view_income': true,
      'finance.manage_accounts': true,
      'finance.settings': true,
      'reports.view': true,
      'reports.sales': true,
      'reports.inventory': true,
      'reports.finance': true,
      'reports.customers': true,
      'reports.employees': true,
      'reports.export': true,
      'reports.print': true,
      'promotions.view': true,
      'promotions.create': true,
      'promotions.edit': true,
      'promotions.delete': true,
      'promotions.activate': true,
      'settings.view': true,
      'settings.store': true,
      'settings.users': true,
      'settings.roles': true,
      'settings.security': true,
      'settings.backup': true,
      'settings.inventory': true,
      'settings.hardware': true,
      'settings.notifications': true,
      'settings.integrations': true,
      'settings.billing': true,
      'settings.appearance': true
    }
  },

  manager: {
    name: 'Manager',
    description: 'Access to most features except critical settings',
    permissions: {
      'dashboard.view': true,
      'dashboard.analytics': true,
      'pos.view': true,
      'pos.create_transaction': true,
      'pos.void_transaction': true,
      'pos.discount': true,
      'pos.refund': true,
      'pos.view_receipts': true,
      'pos.print_receipt': true,
      'pos.settings': false,
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'products.delete': false,
      'products.import': true,
      'products.export': true,
      'products.manage_categories': true,
      'products.manage_stock': true,
      'inventory.view': true,
      'inventory.stock_in': true,
      'inventory.stock_out': true,
      'inventory.stock_transfer': true,
      'inventory.stock_opname': true,
      'inventory.view_history': true,
      'inventory.settings': false,
      'purchase.view': true,
      'purchase.create': true,
      'purchase.edit': true,
      'purchase.delete': false,
      'purchase.approve': true,
      'purchase.receive': true,
      'purchase.manage_suppliers': true,
      'customers.view': true,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': false,
      'customers.view_transactions': true,
      'customers.manage_loyalty': true,
      'employees.view': true,
      'employees.create': false,
      'employees.edit': false,
      'employees.delete': false,
      'employees.view_attendance': true,
      'employees.manage_payroll': false,
      'finance.view': true,
      'finance.view_cashflow': true,
      'finance.create_expense': true,
      'finance.edit_expense': true,
      'finance.delete_expense': false,
      'finance.view_income': true,
      'finance.manage_accounts': false,
      'finance.settings': false,
      'reports.view': true,
      'reports.sales': true,
      'reports.inventory': true,
      'reports.finance': true,
      'reports.customers': true,
      'reports.employees': true,
      'reports.export': true,
      'reports.print': true,
      'promotions.view': true,
      'promotions.create': true,
      'promotions.edit': true,
      'promotions.delete': false,
      'promotions.activate': true,
      'settings.view': true,
      'settings.store': false,
      'settings.users': false,
      'settings.roles': false,
      'settings.security': false,
      'settings.backup': false,
      'settings.inventory': true,
      'settings.hardware': true,
      'settings.notifications': true,
      'settings.integrations': false,
      'settings.billing': false,
      'settings.appearance': false
    }
  },

  cashier: {
    name: 'Cashier',
    description: 'POS operations and basic customer management',
    permissions: {
      'dashboard.view': true,
      'dashboard.analytics': false,
      'pos.view': true,
      'pos.create_transaction': true,
      'pos.void_transaction': false,
      'pos.discount': true,
      'pos.refund': false,
      'pos.view_receipts': true,
      'pos.print_receipt': true,
      'pos.settings': false,
      'products.view': true,
      'products.create': false,
      'products.edit': false,
      'products.delete': false,
      'products.import': false,
      'products.export': false,
      'products.manage_categories': false,
      'products.manage_stock': false,
      'inventory.view': true,
      'inventory.stock_in': false,
      'inventory.stock_out': false,
      'inventory.stock_transfer': false,
      'inventory.stock_opname': false,
      'inventory.view_history': false,
      'inventory.settings': false,
      'purchase.view': false,
      'purchase.create': false,
      'purchase.edit': false,
      'purchase.delete': false,
      'purchase.approve': false,
      'purchase.receive': false,
      'purchase.manage_suppliers': false,
      'customers.view': true,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': false,
      'customers.view_transactions': true,
      'customers.manage_loyalty': true,
      'employees.view': false,
      'employees.create': false,
      'employees.edit': false,
      'employees.delete': false,
      'employees.view_attendance': false,
      'employees.manage_payroll': false,
      'finance.view': false,
      'finance.view_cashflow': false,
      'finance.create_expense': false,
      'finance.edit_expense': false,
      'finance.delete_expense': false,
      'finance.view_income': false,
      'finance.manage_accounts': false,
      'finance.settings': false,
      'reports.view': false,
      'reports.sales': false,
      'reports.inventory': false,
      'reports.finance': false,
      'reports.customers': false,
      'reports.employees': false,
      'reports.export': false,
      'reports.print': false,
      'promotions.view': true,
      'promotions.create': false,
      'promotions.edit': false,
      'promotions.delete': false,
      'promotions.activate': false,
      'settings.view': false,
      'settings.store': false,
      'settings.users': false,
      'settings.roles': false,
      'settings.security': false,
      'settings.backup': false,
      'settings.inventory': false,
      'settings.hardware': false,
      'settings.notifications': false,
      'settings.integrations': false,
      'settings.billing': false,
      'settings.appearance': false
    }
  },

  staff: {
    name: 'Staff',
    description: 'Basic access to POS and inventory',
    permissions: {
      'dashboard.view': true,
      'dashboard.analytics': false,
      'pos.view': true,
      'pos.create_transaction': true,
      'pos.void_transaction': false,
      'pos.discount': false,
      'pos.refund': false,
      'pos.view_receipts': true,
      'pos.print_receipt': true,
      'pos.settings': false,
      'products.view': true,
      'products.create': false,
      'products.edit': false,
      'products.delete': false,
      'products.import': false,
      'products.export': false,
      'products.manage_categories': false,
      'products.manage_stock': false,
      'inventory.view': true,
      'inventory.stock_in': false,
      'inventory.stock_out': false,
      'inventory.stock_transfer': false,
      'inventory.stock_opname': false,
      'inventory.view_history': false,
      'inventory.settings': false,
      'purchase.view': false,
      'purchase.create': false,
      'purchase.edit': false,
      'purchase.delete': false,
      'purchase.approve': false,
      'purchase.receive': false,
      'purchase.manage_suppliers': false,
      'customers.view': true,
      'customers.create': false,
      'customers.edit': false,
      'customers.delete': false,
      'customers.view_transactions': false,
      'customers.manage_loyalty': false,
      'employees.view': false,
      'employees.create': false,
      'employees.edit': false,
      'employees.delete': false,
      'employees.view_attendance': false,
      'employees.manage_payroll': false,
      'finance.view': false,
      'finance.view_cashflow': false,
      'finance.create_expense': false,
      'finance.edit_expense': false,
      'finance.delete_expense': false,
      'finance.view_income': false,
      'finance.manage_accounts': false,
      'finance.settings': false,
      'reports.view': false,
      'reports.sales': false,
      'reports.inventory': false,
      'reports.finance': false,
      'reports.customers': false,
      'reports.employees': false,
      'reports.export': false,
      'reports.print': false,
      'promotions.view': true,
      'promotions.create': false,
      'promotions.edit': false,
      'promotions.delete': false,
      'promotions.activate': false,
      'settings.view': false,
      'settings.store': false,
      'settings.users': false,
      'settings.roles': false,
      'settings.security': false,
      'settings.backup': false,
      'settings.inventory': false,
      'settings.hardware': false,
      'settings.notifications': false,
      'settings.integrations': false,
      'settings.billing': false,
      'settings.appearance': false
    }
  }
};

// Helper function to check if user has permission
export function hasPermission(userPermissions: RolePermissions, permission: string): boolean {
  return userPermissions[permission] === true;
}

// Helper function to get all permissions for a module
export function getModulePermissions(module: string): string[] {
  const moduleData = PERMISSIONS_STRUCTURE[module as keyof typeof PERMISSIONS_STRUCTURE];
  if (!moduleData) return [];
  return Object.keys(moduleData.permissions);
}

// Helper function to get permission label
export function getPermissionLabel(permission: string): string {
  for (const module of Object.values(PERMISSIONS_STRUCTURE)) {
    const permissions = module.permissions as Record<string, string>;
    if (permissions[permission]) {
      return permissions[permission];
    }
  }
  return permission;
}
