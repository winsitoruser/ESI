/**
 * Shared data + filesystem helpers for module documentation (Word / Excel export).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..', '..');

/** Sequelize / backend table inventory (from backend/src/models/*.ts tableName) */
export const TABLES_BY_MODULE = {
  'Core & Autentikasi': [
    'tenants',
    'users',
    'roles',
    'business_types',
    'modules',
    'tenant_modules',
    'branches',
    'branch_modules',
    'branch_setups',
  ],
  'Produk & Katalog': [
    'categories',
    'products',
    'product_variants',
    'product_prices',
    'units',
  ],
  POS: [
    'pos_transactions',
    'pos_transaction_items',
    'shifts',
    'held_transactions',
    'printer_configs',
  ],
  Inventori: [
    'warehouses',
    'locations',
    'stocks',
    'stock_movements',
    'stock_adjustments',
    'stock_adjustment_items',
    'stock_opnames',
    'stock_opname_items',
  ],
  Pembelian: [
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts',
    'goods_receipt_items',
  ],
  Pelanggan: ['customers', 'customer_loyalties'],
  Loyalty: [
    'loyalty_programs',
    'loyalty_tiers',
    'loyalty_rewards',
    'point_transactions',
    'reward_redemptions',
  ],
  Promo: ['promos', 'promo_products', 'promo_categories', 'vouchers'],
  CRM: [
    'crm_customers',
    'crm_contacts',
    'crm_interactions',
    'crm_tickets',
    'crm_ticket_comments',
    'crm_forecasts',
    'crm_automation_rules',
    'crm_documents',
    'crm_segments',
  ],
  Dapur: [
    'kitchen_orders',
    'kitchen_order_items',
    'kitchen_recipes',
    'kitchen_recipe_ingredients',
    'kitchen_inventory_items',
    'kitchen_settings',
  ],
  'Meja & Reservasi': ['tables', 'table_sessions', 'reservations'],
  SDM: ['employees', 'employee_schedules', 'shift_templates'],
  HRIS: [
    'employee_attendances',
    'attendance_devices',
    'leave_types',
    'leave_requests',
    'leave_balances',
    'payroll_runs',
    'employee_salaries',
    'kpi_templates',
    'performance_reviews',
  ],
  Keuangan: [
    'finance_accounts',
    'journal_entries',
    'journal_entry_lines',
    'finance_transactions',
    'finance_invoices',
    'finance_invoice_items',
    'finance_payments',
    'finance_budgets',
    'tax_settings',
  ],
  SFA: [
    'sfa_teams',
    'sfa_team_members',
    'sfa_territories',
    'sfa_visits',
    'sfa_leads',
    'sfa_opportunities',
    'sfa_field_orders',
    'sfa_field_order_items',
    'sfa_targets',
    'sfa_target_assignments',
    'sfa_incentive_schemes',
    'sfa_quotations',
  ],
  Marketing: [
    'mkt_campaigns',
    'mkt_campaign_channels',
    'mkt_segments',
    'mkt_promotions',
    'mkt_budgets',
  ],
  Fleet: [
    'fleet_vehicles',
    'fleet_drivers',
    'fleet_gps_locations',
    'fleet_maintenance_schedules',
    'fleet_fuel_transactions',
    'geofence_locations',
  ],
  TMS: ['tms_shipments', 'tms_carriers', 'tms_rate_cards', 'tms_tracking_events'],
  Manufaktur: [
    'mfg_work_centers',
    'mfg_boms',
    'mfg_bom_items',
    'mfg_routings',
    'mfg_routing_operations',
    'mfg_work_orders',
    'mfg_qc_templates',
    'mfg_qc_inspections',
    'mfg_production_plans',
    'mfg_waste_records',
  ],
  Aset: [
    'assets',
    'asset_categories',
    'asset_movements',
    'asset_maintenance_schedules',
  ],
  'Manajemen Proyek': [
    'pjm_projects',
    'pjm_tasks',
    'pjm_milestones',
    'pjm_timesheets',
    'pjm_risks',
  ],
  'E-Procurement (HQ)': [
    'epr_vendors',
    'epr_procurement_requests',
    'epr_rfqs',
    'epr_rfq_responses',
    'epr_contracts',
  ],
  EXIM: [
    'exim_shipments',
    'exim_containers',
    'exim_customs',
    'exim_lcs',
    'exim_partners',
    'exim_documents',
  ],
  Billing: [
    'subscription_packages',
    'subscriptions',
    'billing_invoices',
    'payment_transactions',
    'usage_records',
  ],
  'Admin & Sistem': [
    'audit_logs',
    'system_backups',
    'notifications',
    'notification_settings',
    'system_alerts',
    'alert_subscriptions',
    'webhooks',
    'store_settings',
    'sync_logs',
    'integration_configs',
    'announcements',
  ],
};

export const MODULE_LABELS = {
  '': 'Beranda & Layout',
  admin: 'Admin (SaaS / Super Admin)',
  auth: 'Autentikasi',
  billing: 'Billing (langganan aplikasi)',
  candidate: 'Portal Kandidat',
  customers: 'Pelanggan',
  dashboard: 'Dashboard (varian)',
  driver: 'Aplikasi Driver',
  employee: 'Karyawan (portal)',
  employees: 'Jadwal Karyawan',
  finance: 'Keuangan',
  hq: 'Headquarters (HQ)',
  inventory: 'Inventori & Gudang',
  kitchen: 'Dapur / Kitchen Display',
  onboarding: 'Onboarding & KYB',
  orders: 'Antrian Pesanan',
  pos: 'Point of Sale (Kasir)',
  procurement: 'E-Procurement',
  products: 'Analisis HPP Produk',
  purchasing: 'Purchasing (integrasi)',
  reports: 'Laporan',
  reservations: 'Reservasi',
  settings: 'Pengaturan Toko',
  tables: 'Layout Meja',
  loyalty: 'Loyalty (halaman)',
  promo: 'Promo & Voucher',
  'promo-voucher': 'Promo & Voucher',
  'dashboard-fnb': 'Dashboard F&B',
  'dashboard-old': 'Dashboard (legacy)',
};

export function walkFiles(dir, pred) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      out.push(...walkFiles(p, pred));
    } else if (pred(p)) out.push(p);
  }
  return out;
}

export function relPages(p) {
  return path.relative(path.join(ROOT, 'pages'), p).replace(/\\/g, '/');
}

export function groupByFirstSegment(files, baseRelFn) {
  const map = new Map();
  for (const f of files) {
    const rel = baseRelFn(f);
    if (
      rel.startsWith('api/') ||
      rel === '_app.tsx' ||
      rel === '_document.tsx' ||
      rel === '_error.tsx'
    )
      continue;
    const seg = rel.includes('/') ? rel.split('/')[0] : '';
    if (!map.has(seg)) map.set(seg, []);
    map.get(seg).push(rel);
  }
  for (const [, arr] of map) arr.sort();
  return map;
}

export function groupApiRoutes(files) {
  const map = new Map();
  for (const f of files) {
    let rel = path.relative(path.join(ROOT, 'pages', 'api'), f).replace(/\\/g, '/');
    rel = rel.replace(/\.(ts|tsx)$/, '');
    const seg = rel.includes('/') ? rel.split('/')[0] : rel || '(root)';
    if (!map.has(seg)) map.set(seg, []);
    map.get(seg).push('/api/' + rel);
  }
  for (const [, arr] of map) arr.sort();
  return map;
}

export function groupComponents(files) {
  const map = new Map();
  for (const f of files) {
    const rel = path.relative(path.join(ROOT, 'components'), f).replace(/\\/g, '/');
    const seg = rel.includes('/') ? rel.split('/')[0] : '';
    if (!map.has(seg)) map.set(seg, []);
    map.get(seg).push(rel);
  }
  for (const [, arr] of map) arr.sort();
  return map;
}

export function labelForSegment(seg) {
  if (MODULE_LABELS[seg] !== undefined) return MODULE_LABELS[seg];
  if (!seg) return 'Beranda & halaman akar';
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
}

/**
 * @returns {{
 *   pageFiles: string[],
 *   apiFiles: string[],
 *   compFiles: string[],
 *   pagesBySeg: Map<string, string[]>,
 *   apiBySeg: Map<string, string[]>,
 *   compBySeg: Map<string, string[]>,
 *   orderedSegs: string[],
 * }}
 */
export function collectDocumentationData() {
  const pageFiles = walkFiles(
    path.join(ROOT, 'pages'),
    (p) => /\.tsx?$/.test(p) && !p.includes(`${path.sep}api${path.sep}`)
  );
  const apiFiles = walkFiles(
    path.join(ROOT, 'pages', 'api'),
    (p) => /\.(ts|tsx)$/.test(p)
  );
  const compFiles = walkFiles(
    path.join(ROOT, 'components'),
    (p) => /\.(tsx?|jsx?)$/.test(p)
  );

  const pagesBySeg = groupByFirstSegment(pageFiles, (f) => relPages(f));
  const apiBySeg = groupApiRoutes(apiFiles);
  const compBySeg = groupComponents(compFiles);

  const allSegs = new Set([
    ...pagesBySeg.keys(),
    ...apiBySeg.keys(),
    ...compBySeg.keys(),
  ]);
  const orderedSegs = [...allSegs].filter((s) => s !== '').sort();
  orderedSegs.unshift('');

  return {
    pageFiles,
    apiFiles,
    compFiles,
    pagesBySeg,
    apiBySeg,
    compBySeg,
    orderedSegs,
  };
}
