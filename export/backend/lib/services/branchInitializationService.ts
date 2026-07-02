/**
 * Branch Initialization Service
 * Handles cloning/generating all services, modules, and configurations for a new branch
 */

interface InitializationResult {
  success: boolean;
  branchId: string;
  initializedServices: string[];
  errors: string[];
}

interface BranchInitConfig {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchType: 'main' | 'branch' | 'warehouse' | 'kiosk';
  createdBy?: number;
}

// Default modules to enable for each branch type
const MODULE_CONFIG = {
  main: ['pos', 'inventory', 'kitchen', 'table', 'reservation', 'loyalty', 'finance', 'hris', 'delivery', 'promo'],
  branch: ['pos', 'inventory', 'kitchen', 'table', 'loyalty', 'promo'],
  warehouse: ['inventory'],
  kiosk: ['pos', 'inventory', 'promo']
};

// Default roles for each branch
const DEFAULT_ROLES = [
  { code: 'branch_manager', name: 'Branch Manager', permissions: ['all'] },
  { code: 'supervisor', name: 'Supervisor', permissions: ['pos', 'inventory', 'reports', 'employees'] },
  { code: 'cashier', name: 'Kasir', permissions: ['pos', 'customers'] },
  { code: 'inventory_staff', name: 'Staff Gudang', permissions: ['inventory', 'stock'] },
  { code: 'kitchen_staff', name: 'Staff Dapur', permissions: ['kitchen', 'orders'] },
  { code: 'waiter', name: 'Pelayan', permissions: ['orders', 'tables', 'reservations'] }
];

// Default store settings categories
const DEFAULT_SETTINGS = {
  general: {
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
    language: 'id',
    date_format: 'DD/MM/YYYY',
    time_format: '24h'
  },
  pos: {
    receipt_header: '',
    receipt_footer: 'Terima kasih atas kunjungan Anda',
    tax_enabled: 'true',
    tax_rate: '11',
    tax_inclusive: 'true',
    service_charge_enabled: 'false',
    service_charge_rate: '5',
    auto_print_receipt: 'true',
    allow_discount: 'true',
    max_discount_percent: '50',
    require_customer: 'false',
    allow_negative_stock: 'false'
  },
  inventory: {
    low_stock_threshold: '10',
    auto_reorder: 'false',
    reorder_point: '5',
    track_expiry: 'true',
    expiry_warning_days: '30',
    allow_negative_stock: 'false',
    sync_from_hq: 'true'
  },
  payment: {
    methods: JSON.stringify(['cash', 'debit', 'credit', 'qris', 'ewallet']),
    default_method: 'cash',
    require_exact_cash: 'false'
  },
  printer: {
    receipt_printer: '',
    kitchen_printer: '',
    auto_cut: 'true',
    print_logo: 'true'
  },
  notification: {
    low_stock_alert: 'true',
    daily_report: 'true',
    shift_reminder: 'true'
  }
};

// Default shift templates
const DEFAULT_SHIFT_TEMPLATES = [
  { name: 'Shift Pagi', code: 'MORNING', startTime: '06:00', endTime: '14:00', breakDuration: 60 },
  { name: 'Shift Siang', code: 'AFTERNOON', startTime: '14:00', endTime: '22:00', breakDuration: 60 },
  { name: 'Shift Malam', code: 'NIGHT', startTime: '22:00', endTime: '06:00', breakDuration: 60 },
  { name: 'Full Day', code: 'FULLDAY', startTime: '08:00', endTime: '17:00', breakDuration: 60 }
];

// Default payment methods
const DEFAULT_PAYMENT_METHODS = [
  { code: 'cash', name: 'Tunai', isActive: true, sortOrder: 1 },
  { code: 'debit', name: 'Kartu Debit', isActive: true, sortOrder: 2 },
  { code: 'credit', name: 'Kartu Kredit', isActive: true, sortOrder: 3 },
  { code: 'qris', name: 'QRIS', isActive: true, sortOrder: 4 },
  { code: 'ewallet', name: 'E-Wallet', isActive: true, sortOrder: 5 },
  { code: 'transfer', name: 'Transfer Bank', isActive: false, sortOrder: 6 }
];

export async function initializeBranch(config: BranchInitConfig): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: false,
    branchId: config.branchId,
    initializedServices: [],
    errors: []
  };

  try {
    // Import models
    const models = require('../../models');
    const {
      BranchSetup,
      BranchModule,
      Location,
      StoreSetting,
      ShiftTemplate,
      PrinterConfig
    } = models;

    // 1. Create Branch Setup record
    try {
      await BranchSetup.findOrCreate({
        where: { branchId: config.branchId },
        defaults: {
          branchId: config.branchId,
          status: 'pending',
          currentStep: 1,
          totalSteps: 6
        }
      });
      result.initializedServices.push('branch_setup');
    } catch (e: any) {
      result.errors.push(`BranchSetup: ${e.message}`);
    }

    // 2. Enable modules based on branch type
    try {
      const modulesToEnable = MODULE_CONFIG[config.branchType] || MODULE_CONFIG.branch;
      const allModules = BranchModule.AVAILABLE_MODULES || [];

      for (const mod of allModules) {
        const isEnabled = modulesToEnable.includes(mod.code) || mod.isCore;
        await BranchModule.findOrCreate({
          where: { branchId: config.branchId, moduleCode: mod.code },
          defaults: {
            branchId: config.branchId,
            moduleCode: mod.code,
            moduleName: mod.name,
            isEnabled,
            enabledBy: config.createdBy,
            settings: {}
          }
        });
      }
      result.initializedServices.push('modules');
    } catch (e: any) {
      result.errors.push(`Modules: ${e.message}`);
    }

    // 3. Create default locations
    try {
      if (Location) {
        const locations = [
          { code: 'MAIN', name: 'Lokasi Utama', type: 'store', isDefault: true },
          { code: 'STORAGE', name: 'Gudang', type: 'warehouse', isDefault: false },
          { code: 'DISPLAY', name: 'Display', type: 'display', isDefault: false }
        ];

        for (const loc of locations) {
          await Location.findOrCreate({
            where: { branchId: config.branchId, code: loc.code },
            defaults: {
              branchId: config.branchId,
              ...loc,
              isActive: true
            }
          });
        }
        result.initializedServices.push('locations');
      }
    } catch (e: any) {
      result.errors.push(`Locations: ${e.message}`);
    }

    // 4. Create default store settings
    try {
      if (StoreSetting) {
        for (const [category, settings] of Object.entries(DEFAULT_SETTINGS)) {
          for (const [key, value] of Object.entries(settings)) {
            let finalValue = value;
            // Replace placeholders
            if (key === 'receipt_header' && !value) {
              finalValue = config.branchName;
            }

            const dataType = typeof value === 'boolean' ? 'boolean' 
              : !isNaN(Number(value)) && key !== 'currency' ? 'number'
              : value.startsWith('[') || value.startsWith('{') ? 'json'
              : 'string';

            await StoreSetting.findOrCreate({
              where: { branchId: config.branchId, category, key },
              defaults: {
                branchId: config.branchId,
                category,
                key,
                value: String(finalValue),
                dataType,
                isGlobal: false
              }
            });
          }
        }
        result.initializedServices.push('store_settings');
      }
    } catch (e: any) {
      result.errors.push(`StoreSettings: ${e.message}`);
    }

    // 5. Create default shift templates
    try {
      if (ShiftTemplate) {
        for (const template of DEFAULT_SHIFT_TEMPLATES) {
          await ShiftTemplate.findOrCreate({
            where: { branchId: config.branchId, code: template.code },
            defaults: {
              branchId: config.branchId,
              ...template,
              isActive: true
            }
          });
        }
        result.initializedServices.push('shift_templates');
      }
    } catch (e: any) {
      result.errors.push(`ShiftTemplates: ${e.message}`);
    }

    // 6. Create default printer configuration
    try {
      if (PrinterConfig) {
        await PrinterConfig.findOrCreate({
          where: { branchId: config.branchId, name: 'Printer Kasir' },
          defaults: {
            branchId: config.branchId,
            name: 'Printer Kasir',
            type: 'receipt',
            connectionType: 'network',
            ipAddress: '',
            port: 9100,
            isDefault: true,
            isActive: false,
            settings: {
              paperWidth: 80,
              autoCut: true,
              printLogo: true
            }
          }
        });
        result.initializedServices.push('printer_config');
      }
    } catch (e: any) {
      result.errors.push(`PrinterConfig: ${e.message}`);
    }

    // 7. Clone products from HQ (sync enabled by default)
    try {
      // Products are synced from HQ via the sync_from_hq setting
      // No need to clone individually - they'll sync on first access
      result.initializedServices.push('products_sync_configured');
    } catch (e: any) {
      result.errors.push(`ProductsSync: ${e.message}`);
    }

    // 8. Create default finance accounts
    try {
      const FinanceAccount = models.FinanceAccount;
      if (FinanceAccount) {
        const defaultAccounts = [
          { code: 'CASH', name: 'Kas', type: 'asset', category: 'current_asset' },
          { code: 'BANK', name: 'Bank', type: 'asset', category: 'current_asset' },
          { code: 'AR', name: 'Piutang Usaha', type: 'asset', category: 'current_asset' },
          { code: 'INVENTORY', name: 'Persediaan', type: 'asset', category: 'current_asset' },
          { code: 'AP', name: 'Hutang Usaha', type: 'liability', category: 'current_liability' },
          { code: 'SALES', name: 'Penjualan', type: 'revenue', category: 'operating_revenue' },
          { code: 'COGS', name: 'Harga Pokok Penjualan', type: 'expense', category: 'cost_of_sales' },
          { code: 'OPEX', name: 'Beban Operasional', type: 'expense', category: 'operating_expense' }
        ];

        for (const account of defaultAccounts) {
          await FinanceAccount.findOrCreate({
            where: { branchId: config.branchId, code: account.code },
            defaults: {
              branchId: config.branchId,
              ...account,
              balance: 0,
              isActive: true
            }
          });
        }
        result.initializedServices.push('finance_accounts');
      }
    } catch (e: any) {
      result.errors.push(`FinanceAccounts: ${e.message}`);
    }

    // 9. Create branch real-time metrics record
    try {
      const BranchRealTimeMetrics = models.BranchRealTimeMetrics;
      if (BranchRealTimeMetrics) {
        await BranchRealTimeMetrics.findOrCreate({
          where: { branchId: config.branchId },
          defaults: {
            branchId: config.branchId,
            currentSales: 0,
            transactionCount: 0,
            customerCount: 0,
            avgTransactionValue: 0,
            activeStaff: 0,
            status: 'offline',
            lastSync: new Date()
          }
        });
        result.initializedServices.push('realtime_metrics');
      }
    } catch (e: any) {
      result.errors.push(`RealTimeMetrics: ${e.message}`);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error: any) {
    result.errors.push(`General: ${error.message}`);
    return result;
  }
}

export async function cloneProductsFromHQ(branchId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const models = require('../../models');
    const { Product, Stock, Location } = models;

    // Get all active products from HQ
    const products = await Product.findAll({
      where: { isActive: true }
    });

    // Get default location for this branch
    const location = await Location.findOne({
      where: { branchId, isDefault: true }
    });

    if (!location) {
      return { success: false, count: 0, error: 'No default location found' };
    }

    // Create stock records for each product
    let count = 0;
    for (const product of products) {
      await Stock.findOrCreate({
        where: { 
          product_id: product.id, 
          location_id: location.id 
        },
        defaults: {
          product_id: product.id,
          location_id: location.id,
          quantity: 0,
          reserved_quantity: 0,
          available_quantity: 0
        }
      });
      count++;
    }

    return { success: true, count };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message };
  }
}

export default {
  initializeBranch,
  cloneProductsFromHQ,
  MODULE_CONFIG,
  DEFAULT_ROLES,
  DEFAULT_SETTINGS,
  DEFAULT_SHIFT_TEMPLATES,
  DEFAULT_PAYMENT_METHODS
};
