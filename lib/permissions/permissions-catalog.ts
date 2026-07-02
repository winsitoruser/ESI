// =======================================================
// BEDAGANG ERP - Permission Catalog (Comprehensive)
// =======================================================
// Catalog lengkap untuk manajemen Role & Privilege Access.
//
// Struktur:
//   Category  → Module → Operation
//
// Setiap operation memiliki action type standar:
//   - view     : melihat data
//   - create   : menambah / membuat baru
//   - update   : mengedit / memperbarui
//   - delete   : menghapus
//   - approve  : menyetujui workflow (PO, payroll, cuti, dll)
//   - export   : mengekspor (PDF/Excel/CSV)
//   - import   : mengimpor data
//   - print    : mencetak (struk, slip, laporan)
//   - manage   : operasi administratif (setting, konfigurasi)
//   - execute  : menjalankan aksi sensitif (void, refund, lock)
//
// Data Scope (ruang lingkup data yg dapat diakses oleh role):
//   - all     : lintas-tenant (super admin platform)
//   - tenant  : seluruh perusahaan / HQ
//   - region  : multi cabang dalam region
//   - branch  : 1 cabang saja
//   - team    : team di bawah supervisi
//   - own     : hanya data milik sendiri
// =======================================================

export type ActionType =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'import'
  | 'print'
  | 'manage'
  | 'execute';

export type DataScope = 'all' | 'tenant' | 'region' | 'branch' | 'team' | 'own';

export interface PermissionOperation {
  /** Key lengkap: `<module>.<operation>.<action>` atau `<module>.<action>`  */
  key: string;
  /** Label Bahasa Indonesia  */
  label: string;
  action: ActionType;
  /** Operasi sensitif (akan diberi indikator khusus di UI) */
  sensitive?: boolean;
  /** Deskripsi tambahan / konsekuensi */
  description?: string;
}

export interface PermissionModule {
  code: string;
  name: string;
  icon?: string;
  /** URL/route utama modul (untuk deep-link dari halaman role) */
  route?: string;
  operations: PermissionOperation[];
}

export interface PermissionCategory {
  id: string;
  name: string;
  color: string;
  modules: PermissionModule[];
}

// =======================================================
// HELPER builder – biar tidak repetitif
// =======================================================
const crud = (module: string, label: string): PermissionOperation[] => [
  { key: `${module}.view`, label: `Lihat ${label}`, action: 'view' },
  { key: `${module}.create`, label: `Tambah ${label}`, action: 'create' },
  { key: `${module}.update`, label: `Ubah ${label}`, action: 'update' },
  { key: `${module}.delete`, label: `Hapus ${label}`, action: 'delete', sensitive: true }
];

const crudx = (module: string, label: string, extras: PermissionOperation[] = []): PermissionOperation[] => [
  ...crud(module, label),
  ...extras
];

const op = (
  key: string,
  label: string,
  action: ActionType,
  sensitive = false,
  description?: string
): PermissionOperation => ({ key, label, action, sensitive, description });

// =======================================================
// PERMISSION CATALOG
// =======================================================
export const PERMISSION_CATALOG: PermissionCategory[] = [
  // -----------------------------------------------------
  // 1. DASHBOARD & ANALYTICS
  // -----------------------------------------------------
  {
    id: 'analytics',
    name: 'Dasbor & Analitik',
    color: 'blue',
    modules: [
      {
        code: 'dashboard',
        name: 'Dasbor Utama',
        route: '/hq/home',
        operations: [
          op('dashboard.view', 'Lihat Dasbor', 'view'),
          op('dashboard.analytics', 'Lihat Analitik KPI', 'view'),
          op('dashboard.export', 'Ekspor Dasbor (PDF/Excel)', 'export'),
          op('dashboard.ai', 'Gunakan Analisa AI', 'execute')
        ]
      },
      {
        code: 'reports',
        name: 'Laporan',
        route: '/hq/reports',
        operations: [
          op('reports.view', 'Lihat Laporan', 'view'),
          op('reports.sales', 'Laporan Penjualan', 'view'),
          op('reports.inventory', 'Laporan Inventori', 'view'),
          op('reports.finance', 'Laporan Keuangan', 'view', true),
          op('reports.hris', 'Laporan SDM', 'view'),
          op('reports.custom', 'Buat Laporan Custom', 'create'),
          op('reports.export', 'Ekspor Laporan', 'export'),
          op('reports.print', 'Cetak Laporan', 'print'),
          op('reports.schedule', 'Jadwal Laporan Otomatis', 'manage')
        ]
      },
      {
        code: 'audit',
        name: 'Audit Log',
        route: '/hq/audit-logs',
        operations: [
          op('audit.view', 'Lihat Audit Log', 'view', true),
          op('audit.export', 'Ekspor Audit Log', 'export', true),
          op('audit.purge', 'Hapus Audit Log', 'delete', true, 'Hanya boleh dilakukan oleh Super Admin')
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 2. SALES & POS
  // -----------------------------------------------------
  {
    id: 'sales',
    name: 'Penjualan & POS',
    color: 'green',
    modules: [
      {
        code: 'pos',
        name: 'Point of Sale',
        route: '/pos',
        operations: [
          op('pos.view', 'Akses Layar POS', 'view'),
          op('pos.create_transaction', 'Buat Transaksi', 'create'),
          op('pos.void_transaction', 'Void Transaksi', 'execute', true),
          op('pos.refund', 'Proses Refund', 'execute', true),
          op('pos.discount', 'Terapkan Diskon', 'execute'),
          op('pos.price_override', 'Override Harga', 'execute', true),
          op('pos.open_drawer', 'Buka Laci Kas', 'execute', true),
          op('pos.close_shift', 'Tutup Shift Kasir', 'execute'),
          op('pos.reprint', 'Cetak Ulang Struk', 'print'),
          op('pos.settings', 'Pengaturan POS', 'manage', true)
        ]
      },
      {
        code: 'promotions',
        name: 'Promosi',
        route: '/hq/promotions',
        operations: [
          ...crud('promotions', 'Promosi'),
          op('promotions.activate', 'Aktifkan/Nonaktifkan Promo', 'execute'),
          op('promotions.approve', 'Setujui Promo', 'approve', true)
        ]
      },
      {
        code: 'customers',
        name: 'Pelanggan',
        route: '/hq/customers',
        operations: [
          ...crud('customers', 'Pelanggan'),
          op('customers.view_transactions', 'Lihat Transaksi Pelanggan', 'view'),
          op('customers.manage_loyalty', 'Kelola Poin Loyalitas', 'manage'),
          op('customers.export', 'Ekspor Data Pelanggan', 'export', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 3. INVENTORY & WAREHOUSE
  // -----------------------------------------------------
  {
    id: 'warehouse',
    name: 'Gudang & Inventori',
    color: 'amber',
    modules: [
      {
        code: 'products',
        name: 'Produk',
        route: '/hq/products',
        operations: [
          ...crud('products', 'Produk'),
          op('products.import', 'Impor Produk', 'import'),
          op('products.export', 'Ekspor Produk', 'export'),
          op('products.manage_categories', 'Kelola Kategori', 'manage'),
          op('products.manage_pricing', 'Kelola Harga', 'manage', true),
          op('products.price_lock', 'Kunci Harga', 'execute', true)
        ]
      },
      {
        code: 'inventory',
        name: 'Inventori',
        route: '/hq/inventory',
        operations: [
          op('inventory.view', 'Lihat Stok', 'view'),
          op('inventory.stock_in', 'Barang Masuk', 'create'),
          op('inventory.stock_out', 'Barang Keluar', 'create'),
          op('inventory.transfer', 'Transfer Antar Gudang', 'create'),
          op('inventory.approve_transfer', 'Setujui Transfer', 'approve', true),
          op('inventory.stock_opname', 'Stok Opname', 'execute'),
          op('inventory.adjust', 'Penyesuaian Stok', 'execute', true),
          op('inventory.view_history', 'Riwayat Stok', 'view'),
          op('inventory.settings', 'Setting Inventori', 'manage', true)
        ]
      },
      {
        code: 'purchase',
        name: 'Pembelian / PO',
        route: '/hq/purchase-orders',
        operations: [
          ...crud('purchase', 'Purchase Order'),
          op('purchase.approve', 'Setujui PO', 'approve', true),
          op('purchase.receive', 'Terima Barang (GRN)', 'create'),
          op('purchase.return', 'Retur Pembelian', 'execute', true),
          op('purchase.manage_suppliers', 'Kelola Supplier', 'manage')
        ]
      },
      {
        code: 'requisitions',
        name: 'Permintaan Barang',
        route: '/hq/requisitions',
        operations: [
          ...crud('requisitions', 'Permintaan'),
          op('requisitions.approve', 'Setujui Permintaan', 'approve', true)
        ]
      },
      {
        code: 'e_procurement',
        name: 'e-Procurement',
        route: '/hq/e-procurement',
        operations: [
          ...crud('e_procurement', 'e-Procurement'),
          op('e_procurement.approve', 'Setujui Vendor/Tender', 'approve', true),
          op('e_procurement.bid', 'Buka/Tutup Tender', 'execute', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 4. FINANCE
  // -----------------------------------------------------
  {
    id: 'finance',
    name: 'Keuangan',
    color: 'purple',
    modules: [
      {
        code: 'finance',
        name: 'Keuangan Umum',
        route: '/hq/finance',
        operations: [
          op('finance.view', 'Lihat Keuangan', 'view', true),
          op('finance.view_cashflow', 'Lihat Cashflow', 'view', true),
          op('finance.view_pnl', 'Lihat Profit & Loss', 'view', true),
          op('finance.view_revenue', 'Lihat Pendapatan', 'view'),
          op('finance.budget_manage', 'Kelola Anggaran', 'manage', true),
          op('finance.budget_approve', 'Setujui Anggaran', 'approve', true),
          op('finance.settings', 'Pengaturan Keuangan', 'manage', true),
          op('finance.ai_guardian', 'Gunakan AI Guardian', 'execute')
        ]
      },
      {
        code: 'finance_accounts',
        name: 'Akun / COA',
        route: '/hq/finance/accounts',
        operations: [...crud('finance_accounts', 'Akun')]
      },
      {
        code: 'finance_transactions',
        name: 'Transaksi Keuangan',
        route: '/hq/finance/transactions',
        operations: [
          ...crud('finance_transactions', 'Transaksi'),
          op('finance_transactions.approve', 'Setujui Transaksi', 'approve', true),
          op('finance_transactions.post', 'Posting ke GL', 'execute', true),
          op('finance_transactions.reverse', 'Reversal Jurnal', 'execute', true)
        ]
      },
      {
        code: 'finance_expenses',
        name: 'Beban / Biaya',
        route: '/hq/finance/expenses',
        operations: [
          ...crud('finance_expenses', 'Beban'),
          op('finance_expenses.approve', 'Setujui Beban', 'approve', true)
        ]
      },
      {
        code: 'finance_invoices',
        name: 'Invoice',
        route: '/hq/finance/invoices',
        operations: [
          ...crud('finance_invoices', 'Invoice'),
          op('finance_invoices.send', 'Kirim Invoice', 'execute'),
          op('finance_invoices.mark_paid', 'Tandai Lunas', 'execute', true),
          op('finance_invoices.export', 'Ekspor Invoice', 'export')
        ]
      },
      {
        code: 'finance_tax',
        name: 'Pajak',
        route: '/hq/finance/tax',
        operations: [
          op('finance_tax.view', 'Lihat Pajak', 'view'),
          op('finance_tax.manage', 'Kelola Pajak', 'manage', true),
          op('finance_tax.export', 'Ekspor Laporan Pajak', 'export'),
          op('finance_tax.efaktur', 'Generate e-Faktur', 'execute', true)
        ]
      },
      {
        code: 'billing',
        name: 'Billing Platform',
        route: '/hq/billing-info',
        operations: [
          op('billing.view', 'Lihat Billing', 'view'),
          op('billing.manage', 'Kelola Langganan', 'manage', true),
          op('billing.pay', 'Bayar Tagihan', 'execute', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 5. HRIS & PAYROLL
  // -----------------------------------------------------
  {
    id: 'hris',
    name: 'SDM & Payroll',
    color: 'indigo',
    modules: [
      {
        code: 'employees',
        name: 'Karyawan',
        route: '/hq/hris/employees',
        operations: [
          ...crud('employees', 'Karyawan'),
          op('employees.import', 'Impor Karyawan', 'import'),
          op('employees.export', 'Ekspor Karyawan', 'export', true),
          op('employees.view_salary', 'Lihat Gaji', 'view', true),
          op('employees.terminate', 'Terminasi Karyawan', 'execute', true)
        ]
      },
      {
        code: 'organization',
        name: 'Organisasi & Struktur',
        route: '/hq/hris/organization',
        operations: [...crud('organization', 'Struktur')]
      },
      {
        code: 'attendance',
        name: 'Kehadiran',
        route: '/hq/hris/attendance',
        operations: [
          op('attendance.view', 'Lihat Kehadiran', 'view'),
          op('attendance.view_all', 'Lihat Semua Karyawan', 'view', true),
          op('attendance.manage', 'Kelola Presensi', 'manage'),
          op('attendance.approve', 'Setujui Koreksi Presensi', 'approve'),
          op('attendance.devices', 'Kelola Device', 'manage'),
          op('attendance.settings', 'Setting Kehadiran', 'manage')
        ]
      },
      {
        code: 'leave',
        name: 'Cuti',
        route: '/hq/hris/leave',
        operations: [
          ...crud('leave', 'Cuti'),
          op('leave.approve', 'Setujui Cuti', 'approve', true),
          op('leave.reject', 'Tolak Cuti', 'execute')
        ]
      },
      {
        code: 'overtime',
        name: 'Lembur',
        route: '/hq/hris/payroll/lembur',
        operations: [
          ...crud('overtime', 'Lembur'),
          op('overtime.approve', 'Setujui Lembur', 'approve', true)
        ]
      },
      {
        code: 'payroll',
        name: 'Payroll',
        route: '/hq/hris/payroll',
        operations: [
          op('payroll.view', 'Lihat Payroll', 'view', true),
          op('payroll.run', 'Jalankan Payroll', 'execute', true),
          op('payroll.approve', 'Setujui Payroll', 'approve', true),
          op('payroll.disburse', 'Transfer Gaji', 'execute', true),
          op('payroll.slip_view', 'Lihat Slip Gaji', 'view'),
          op('payroll.slip_all', 'Lihat Semua Slip', 'view', true),
          op('payroll.slip_print', 'Cetak Slip Gaji', 'print'),
          op('payroll.bpjs', 'Kelola BPJS', 'manage', true),
          op('payroll.pph21', 'Kelola PPh21', 'manage', true),
          op('payroll.thr', 'Kelola THR', 'manage', true),
          op('payroll.report', 'Laporan Payroll', 'view', true)
        ]
      },
      {
        code: 'recruitment',
        name: 'Rekrutmen',
        route: '/hq/hris/recruitment',
        operations: [
          ...crud('recruitment', 'Lowongan/Kandidat'),
          op('recruitment.approve_offer', 'Setujui Penawaran', 'approve', true)
        ]
      },
      {
        code: 'performance',
        name: 'Kinerja & KPI',
        route: '/hq/hris/performance',
        operations: [
          ...crud('performance', 'Penilaian Kinerja'),
          op('performance.approve', 'Setujui Penilaian', 'approve'),
          op('performance.kpi_settings', 'Setting KPI', 'manage', true)
        ]
      },
      {
        code: 'training',
        name: 'Training & Development',
        route: '/hq/hris/training',
        operations: [
          ...crud('training', 'Training'),
          op('training.scoring', 'Input Nilai Training', 'update'),
          op('training.approve', 'Setujui Training', 'approve')
        ]
      },
      {
        code: 'travel_expense',
        name: 'Perjalanan Dinas',
        route: '/hq/hris/travel-expense',
        operations: [
          ...crud('travel_expense', 'Travel/Expense'),
          op('travel_expense.approve', 'Setujui Perjalanan', 'approve', true),
          op('travel_expense.reimburse', 'Reimbursement', 'execute', true)
        ]
      },
      {
        code: 'industrial_relations',
        name: 'Hub. Industrial',
        route: '/hq/hris/industrial-relations',
        operations: [
          ...crud('industrial_relations', 'Kasus IR'),
          op('industrial_relations.sensitive', 'Lihat Kasus Sensitif', 'view', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 6. CRM & SFA
  // -----------------------------------------------------
  {
    id: 'crm_sfa',
    name: 'CRM & Sales Force',
    color: 'pink',
    modules: [
      {
        code: 'crm',
        name: 'CRM',
        route: '/hq/crm',
        operations: [
          ...crud('crm', 'CRM'),
          op('crm.import', 'Impor Data CRM', 'import'),
          op('crm.export', 'Ekspor Data CRM', 'export', true),
          op('crm.manage_tickets', 'Kelola Tiket', 'manage'),
          op('crm.manage_tasks', 'Kelola Task', 'manage'),
          op('crm.approve', 'Approval CRM', 'approve'),
          op('crm.settings', 'Setting CRM', 'manage', true)
        ]
      },
      {
        code: 'sfa',
        name: 'Sales Force (SFA)',
        route: '/hq/sfa',
        operations: [
          ...crud('sfa', 'Lead/Pipeline'),
          op('sfa.manage_visits', 'Kelola Kunjungan', 'manage'),
          op('sfa.manage_targets', 'Kelola Target', 'manage', true),
          op('sfa.manage_incentives', 'Kelola Insentif', 'manage', true),
          op('sfa.manage_geofence', 'Kelola Geofence', 'manage'),
          op('sfa.approve', 'Approval SFA', 'approve', true)
        ]
      },
      {
        code: 'marketing',
        name: 'Marketing & Campaign',
        route: '/hq/marketing',
        operations: [
          ...crud('marketing', 'Campaign'),
          op('marketing.approve', 'Setujui Campaign', 'approve', true),
          op('marketing.launch', 'Luncurkan Campaign', 'execute', true),
          op('marketing.budget', 'Kelola Budget', 'manage', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 7. LOGISTICS & FLEET
  // -----------------------------------------------------
  {
    id: 'logistics',
    name: 'Logistik & Armada',
    color: 'cyan',
    modules: [
      {
        code: 'fms',
        name: 'Fleet Management (FMS)',
        route: '/hq/fms',
        operations: [
          ...crud('fms', 'Kendaraan'),
          op('fms.manage_drivers', 'Kelola Pengemudi', 'manage'),
          op('fms.manage_maintenance', 'Pemeliharaan', 'manage'),
          op('fms.manage_fuel', 'BBM', 'manage'),
          op('fms.gps_live', 'GPS Live Tracking', 'view'),
          op('fms.approve_cost', 'Setujui Biaya Armada', 'approve', true)
        ]
      },
      {
        code: 'tms',
        name: 'Transport Management (TMS)',
        route: '/hq/tms',
        operations: [
          ...crud('tms', 'Pengiriman'),
          op('tms.dispatch', 'Dispatch Pengiriman', 'execute'),
          op('tms.tracking', 'Pelacakan', 'view'),
          op('tms.approve', 'Approval TMS', 'approve', true),
          op('tms.billing', 'Penagihan Transportasi', 'manage', true)
        ]
      },
      {
        code: 'fleet',
        name: 'Armada (Legacy)',
        route: '/hq/fleet',
        operations: [
          ...crud('fleet', 'Armada Legacy'),
          op('fleet.tracking', 'Pelacakan Armada', 'view')
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 8. OPERATIONS (Branches, Manufacturing, Assets, PM)
  // -----------------------------------------------------
  {
    id: 'operations',
    name: 'Operasional',
    color: 'orange',
    modules: [
      {
        code: 'branches',
        name: 'Cabang',
        route: '/hq/branches',
        operations: [
          ...crud('branches', 'Cabang'),
          op('branches.performance', 'Lihat Performa Cabang', 'view'),
          op('branches.settings', 'Setting Cabang', 'manage', true)
        ]
      },
      {
        code: 'manufacturing',
        name: 'Manufaktur',
        route: '/hq/manufacturing',
        operations: [
          ...crud('manufacturing', 'Manufaktur'),
          op('manufacturing.work_order', 'Kelola Work Order', 'manage'),
          op('manufacturing.bom', 'Kelola BOM', 'manage'),
          op('manufacturing.quality', 'Kontrol Kualitas', 'execute', true),
          op('manufacturing.approve_wo', 'Setujui Work Order', 'approve', true)
        ]
      },
      {
        code: 'asset_management',
        name: 'Manajemen Aset',
        route: '/hq/assets',
        operations: [
          ...crud('asset_management', 'Aset'),
          op('asset_management.depreciation', 'Kelola Penyusutan', 'manage', true),
          op('asset_management.transfer', 'Mutasi Aset', 'execute'),
          op('asset_management.licenses', 'Kelola Lisensi', 'manage')
        ]
      },
      {
        code: 'project_management',
        name: 'Manajemen Proyek',
        route: '/hq/project-management',
        operations: [
          ...crud('project_management', 'Proyek'),
          op('project_management.approve', 'Setujui Proyek', 'approve', true),
          op('project_management.budget', 'Kelola Budget Proyek', 'manage', true)
        ]
      }
    ]
  },

  // -----------------------------------------------------
  // 9. INTEGRATIONS & CHANNELS
  // -----------------------------------------------------
  {
    id: 'integrations',
    name: 'Integrasi & Channel',
    color: 'teal',
    modules: [
      {
        code: 'whatsapp_business',
        name: 'WhatsApp Business',
        route: '/hq/whatsapp',
        operations: [
          op('whatsapp_business.view', 'Lihat Chat', 'view'),
          op('whatsapp_business.send', 'Kirim Pesan', 'execute'),
          op('whatsapp_business.broadcast', 'Broadcast', 'execute', true),
          op('whatsapp_business.manage', 'Setting WABA', 'manage', true)
        ]
      },
      {
        code: 'marketplace_integration',
        name: 'Marketplace',
        route: '/hq/marketplace',
        operations: [
          op('marketplace_integration.view', 'Lihat Marketplace', 'view'),
          op('marketplace_integration.sync', 'Sinkronisasi', 'execute'),
          op('marketplace_integration.manage', 'Setting Integrasi', 'manage', true)
        ]
      },
      {
        code: 'website_builder',
        name: 'Website Builder',
        route: '/hq/website-builder',
        operations: [
          op('website_builder.view', 'Lihat Website Builder', 'view'),
          op('website_builder.edit', 'Edit Halaman', 'update'),
          op('website_builder.publish', 'Publikasikan', 'execute', true),
          op('website_builder.theme', 'Kelola Tema', 'manage'),
          op('website_builder.seo', 'Kelola SEO', 'manage')
        ]
      },
      {
        code: 'knowledge_base',
        name: 'Knowledge Base',
        route: '/hq/knowledge-base',
        operations: [...crud('knowledge_base', 'Artikel')]
      }
    ]
  },

  // -----------------------------------------------------
  // 10. SYSTEM & SETTINGS
  // -----------------------------------------------------
  {
    id: 'system',
    name: 'Sistem & Pengaturan',
    color: 'red',
    modules: [
      {
        code: 'users',
        name: 'Pengguna',
        route: '/hq/users',
        operations: [
          ...crud('users', 'Pengguna'),
          op('users.role_assign', 'Assign Role', 'execute', true),
          op('users.reset_password', 'Reset Password', 'execute', true),
          op('users.impersonate', 'Impersonate User', 'execute', true, 'Hak sensitif untuk debugging — audit log wajib')
        ]
      },
      {
        code: 'roles',
        name: 'Role & Permission',
        route: '/hq/users/roles',
        operations: [
          op('roles.view', 'Lihat Role', 'view'),
          op('roles.create', 'Tambah Role', 'create', true),
          op('roles.update', 'Ubah Role', 'update', true),
          op('roles.delete', 'Hapus Role', 'delete', true),
          op('roles.assign_permission', 'Atur Permission', 'execute', true)
        ]
      },
      {
        code: 'settings',
        name: 'Pengaturan Sistem',
        route: '/hq/settings',
        operations: [
          op('settings.view', 'Lihat Setting', 'view'),
          op('settings.store', 'Setting Toko', 'manage'),
          op('settings.security', 'Setting Keamanan', 'manage', true),
          op('settings.backup', 'Backup & Restore', 'execute', true),
          op('settings.integrations', 'Setting Integrasi', 'manage', true),
          op('settings.appearance', 'Setting Tampilan', 'manage'),
          op('settings.hardware', 'Setting Hardware', 'manage'),
          op('settings.notifications', 'Setting Notifikasi', 'manage')
        ]
      }
    ]
  }
];

// =======================================================
// Level & Role Preset
// =======================================================
export interface RolePreset {
  code: string;
  name: string;
  description: string;
  level: number;
  dataScope: DataScope;
  color: string;
  /** Permission pakai wildcard `module.*` atau specific key */
  permissions: string[];
}

export const ROLE_LEVELS: { level: number; label: string; color: string; description: string }[] = [
  { level: 1, label: 'Super Admin', color: 'bg-red-100 text-red-800 border-red-300', description: 'Akses penuh lintas-tenant, kelola platform' },
  { level: 2, label: 'Owner / HQ Admin', color: 'bg-purple-100 text-purple-800 border-purple-300', description: 'Pemilik perusahaan, full akses tenant' },
  { level: 3, label: 'Manager', color: 'bg-blue-100 text-blue-800 border-blue-300', description: 'Manajer regional/departemen, approval level 1' },
  { level: 4, label: 'Supervisor', color: 'bg-green-100 text-green-800 border-green-300', description: 'Supervisor tim, approval terbatas' },
  { level: 5, label: 'Staff', color: 'bg-gray-100 text-gray-800 border-gray-300', description: 'Operasional harian' },
  { level: 6, label: 'Read-only / Audit', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', description: 'Hanya view untuk kebutuhan audit' }
];

export const DATA_SCOPES: { value: DataScope; label: string; description: string; color: string }[] = [
  { value: 'all', label: 'Semua Tenant', description: 'Akses lintas-tenant (khusus platform admin)', color: 'bg-red-100 text-red-700' },
  { value: 'tenant', label: 'Seluruh Perusahaan', description: 'Seluruh data di tenant/HQ', color: 'bg-purple-100 text-purple-700' },
  { value: 'region', label: 'Region', description: 'Beberapa cabang dalam satu region', color: 'bg-blue-100 text-blue-700' },
  { value: 'branch', label: 'Cabang Ditugaskan', description: '1 cabang saja', color: 'bg-green-100 text-green-700' },
  { value: 'team', label: 'Tim', description: 'Tim di bawah supervisi', color: 'bg-teal-100 text-teal-700' },
  { value: 'own', label: 'Data Sendiri', description: 'Hanya data yang dibuat/dimiliki user', color: 'bg-gray-100 text-gray-700' }
];

// Preset role (siap pakai saat Create Role)
export const ROLE_PRESETS: RolePreset[] = [
  {
    code: 'SUPERHERO',
    name: 'Superhero (Super Admin)',
    description: 'Full unrestricted access pada semua modul & platform',
    level: 1,
    dataScope: 'all',
    color: 'red',
    permissions: ['*']
  },
  {
    code: 'HQ_ADMIN',
    name: 'HQ Administrator',
    description: 'Admin tenant dengan akses penuh kecuali platform settings',
    level: 2,
    dataScope: 'tenant',
    color: 'purple',
    permissions: [
      'dashboard.*', 'reports.*', 'pos.*', 'promotions.*', 'customers.*',
      'products.*', 'inventory.*', 'purchase.*', 'requisitions.*', 'e_procurement.*',
      'finance.*', 'finance_accounts.*', 'finance_transactions.*', 'finance_expenses.*',
      'finance_invoices.*', 'finance_tax.*', 'billing.*',
      'employees.*', 'organization.*', 'attendance.*', 'leave.*', 'overtime.*',
      'payroll.*', 'recruitment.*', 'performance.*', 'training.*', 'travel_expense.*',
      'industrial_relations.*', 'crm.*', 'sfa.*', 'marketing.*',
      'fms.*', 'tms.*', 'fleet.*', 'branches.*', 'manufacturing.*',
      'asset_management.*', 'project_management.*',
      'whatsapp_business.*', 'marketplace_integration.*', 'website_builder.*', 'knowledge_base.*',
      'users.view', 'users.create', 'users.update', 'users.role_assign', 'users.reset_password',
      'roles.view', 'roles.create', 'roles.update', 'roles.assign_permission',
      'settings.view', 'settings.store', 'settings.appearance', 'settings.notifications', 'settings.hardware'
    ]
  },
  {
    code: 'BRANCH_MANAGER',
    name: 'Branch Manager',
    description: 'Manajer cabang — approval level 1, akses cabang sendiri',
    level: 3,
    dataScope: 'branch',
    color: 'blue',
    permissions: [
      'dashboard.view', 'dashboard.analytics',
      'reports.view', 'reports.sales', 'reports.inventory', 'reports.hris', 'reports.export', 'reports.print',
      'pos.view', 'pos.create_transaction', 'pos.void_transaction', 'pos.refund', 'pos.discount', 'pos.close_shift', 'pos.reprint',
      'promotions.view', 'promotions.create', 'promotions.update', 'promotions.activate',
      'customers.view', 'customers.create', 'customers.update', 'customers.view_transactions', 'customers.manage_loyalty',
      'products.view', 'products.create', 'products.update',
      'inventory.view', 'inventory.stock_in', 'inventory.stock_out', 'inventory.transfer', 'inventory.approve_transfer',
      'inventory.stock_opname', 'inventory.view_history',
      'purchase.view', 'purchase.create', 'purchase.update', 'purchase.approve', 'purchase.receive',
      'requisitions.view', 'requisitions.create', 'requisitions.approve',
      'employees.view', 'employees.update',
      'attendance.view_all', 'attendance.manage', 'attendance.approve',
      'leave.view', 'leave.approve', 'leave.reject',
      'overtime.view', 'overtime.approve',
      'performance.view', 'performance.create', 'performance.update', 'performance.approve',
      'training.view',
      'branches.view', 'branches.performance',
      'fms.view', 'tms.view'
    ]
  },
  {
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Supervisor shift/tim — approval terbatas',
    level: 4,
    dataScope: 'team',
    color: 'green',
    permissions: [
      'dashboard.view',
      'pos.view', 'pos.create_transaction', 'pos.void_transaction', 'pos.discount', 'pos.close_shift', 'pos.reprint',
      'customers.view', 'customers.create', 'customers.update', 'customers.manage_loyalty',
      'products.view',
      'inventory.view', 'inventory.stock_in', 'inventory.stock_out', 'inventory.view_history',
      'attendance.view_all', 'attendance.manage',
      'leave.view', 'leave.approve',
      'overtime.view', 'overtime.approve',
      'reports.view', 'reports.sales', 'reports.inventory'
    ]
  },
  {
    code: 'CASHIER',
    name: 'Kasir',
    description: 'Staff kasir — operasi POS saja',
    level: 5,
    dataScope: 'own',
    color: 'gray',
    permissions: [
      'dashboard.view',
      'pos.view', 'pos.create_transaction', 'pos.discount', 'pos.reprint', 'pos.close_shift',
      'customers.view', 'customers.create', 'customers.update', 'customers.manage_loyalty',
      'products.view', 'promotions.view',
      'inventory.view'
    ]
  },
  {
    code: 'WAREHOUSE',
    name: 'Staff Gudang',
    description: 'Staff gudang untuk manajemen stok',
    level: 5,
    dataScope: 'branch',
    color: 'amber',
    permissions: [
      'dashboard.view',
      'products.view',
      'inventory.view', 'inventory.stock_in', 'inventory.stock_out', 'inventory.transfer', 'inventory.stock_opname', 'inventory.view_history',
      'purchase.view', 'purchase.receive',
      'requisitions.view', 'requisitions.create'
    ]
  },
  {
    code: 'FINANCE_STAFF',
    name: 'Staff Keuangan',
    description: 'Staff keuangan — input & posting transaksi',
    level: 5,
    dataScope: 'tenant',
    color: 'purple',
    permissions: [
      'dashboard.view',
      'finance.view', 'finance.view_cashflow', 'finance.view_revenue',
      'finance_accounts.view',
      'finance_transactions.view', 'finance_transactions.create', 'finance_transactions.update',
      'finance_expenses.view', 'finance_expenses.create', 'finance_expenses.update',
      'finance_invoices.view', 'finance_invoices.create', 'finance_invoices.update', 'finance_invoices.send',
      'finance_tax.view',
      'reports.view', 'reports.finance', 'reports.export'
    ]
  },
  {
    code: 'HR_STAFF',
    name: 'Staff HRD',
    description: 'Staff HRD — kelola data karyawan & kehadiran',
    level: 5,
    dataScope: 'tenant',
    color: 'indigo',
    permissions: [
      'dashboard.view',
      'employees.view', 'employees.create', 'employees.update',
      'organization.view', 'organization.update',
      'attendance.view', 'attendance.view_all', 'attendance.manage',
      'leave.view', 'leave.create', 'leave.update',
      'overtime.view', 'overtime.create', 'overtime.update',
      'recruitment.view', 'recruitment.create', 'recruitment.update',
      'training.view', 'training.create', 'training.update',
      'performance.view',
      'reports.view', 'reports.hris'
    ]
  },
  {
    code: 'AUDITOR',
    name: 'Auditor (Read-only)',
    description: 'Auditor — hanya dapat melihat, tidak dapat mengubah data',
    level: 6,
    dataScope: 'tenant',
    color: 'yellow',
    permissions: [
      'dashboard.view', 'dashboard.analytics',
      'reports.view', 'reports.sales', 'reports.inventory', 'reports.finance', 'reports.hris', 'reports.export',
      'audit.view', 'audit.export',
      'pos.view', 'customers.view', 'products.view', 'inventory.view', 'inventory.view_history',
      'purchase.view', 'finance.view', 'finance.view_cashflow', 'finance.view_pnl',
      'finance_accounts.view', 'finance_transactions.view', 'finance_expenses.view',
      'finance_invoices.view', 'finance_tax.view',
      'employees.view', 'attendance.view_all', 'leave.view', 'overtime.view',
      'payroll.view', 'performance.view', 'branches.view', 'branches.performance'
    ]
  }
];

// =======================================================
// HELPER Functions
// =======================================================
export function expandPermissions(permissions: string[]): string[] {
  const result = new Set<string>();
  for (const p of permissions) {
    if (p === '*') {
      PERMISSION_CATALOG.forEach(cat =>
        cat.modules.forEach(m => m.operations.forEach(o => result.add(o.key)))
      );
      continue;
    }
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2);
      PERMISSION_CATALOG.forEach(cat =>
        cat.modules.forEach(m => {
          if (m.code === prefix) m.operations.forEach(o => result.add(o.key));
        })
      );
      continue;
    }
    result.add(p);
  }
  return Array.from(result);
}

export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  PERMISSION_CATALOG.forEach(cat =>
    cat.modules.forEach(m => m.operations.forEach(o => keys.push(o.key)))
  );
  return keys;
}

export function findOperation(key: string): PermissionOperation | undefined {
  for (const cat of PERMISSION_CATALOG) {
    for (const m of cat.modules) {
      const op = m.operations.find(o => o.key === key);
      if (op) return op;
    }
  }
  return undefined;
}

export function getModuleOperations(moduleCode: string): PermissionOperation[] {
  for (const cat of PERMISSION_CATALOG) {
    const m = cat.modules.find(x => x.code === moduleCode);
    if (m) return m.operations;
  }
  return [];
}

export function countPermissions(permissions: Record<string, boolean> | string[]): number {
  if (Array.isArray(permissions)) return permissions.length;
  return Object.values(permissions).filter(Boolean).length;
}

export function hasPermission(
  user: { permissions?: Record<string, boolean> | string[] } | null | undefined,
  permission: string
): boolean {
  if (!user?.permissions) return false;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission) || user.permissions.includes('*');
  return user.permissions[permission] === true || user.permissions['*'] === true;
}

export const ACTION_META: Record<ActionType, { label: string; color: string; icon: string }> = {
  view:    { label: 'Lihat',      color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: 'Eye' },
  create:  { label: 'Tambah',     color: 'bg-green-50 text-green-700 border-green-200',    icon: 'Plus' },
  update:  { label: 'Ubah',       color: 'bg-amber-50 text-amber-700 border-amber-200',    icon: 'Edit' },
  delete:  { label: 'Hapus',      color: 'bg-red-50 text-red-700 border-red-200',          icon: 'Trash2' },
  approve: { label: 'Setujui',    color: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'CheckCircle' },
  export:  { label: 'Ekspor',     color: 'bg-teal-50 text-teal-700 border-teal-200',       icon: 'Download' },
  import:  { label: 'Impor',      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       icon: 'Upload' },
  print:   { label: 'Cetak',      color: 'bg-gray-50 text-gray-700 border-gray-200',       icon: 'Printer' },
  manage:  { label: 'Kelola',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'Settings' },
  execute: { label: 'Eksekusi',   color: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'Zap' }
};
