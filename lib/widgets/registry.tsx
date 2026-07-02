import {
  Sparkles, Wallet, CreditCard, Package, Target, Store, Bell, Zap,
  TrendingUp, ShoppingCart, BarChart3, PieChart, Receipt,
  DollarSign, ArrowRightLeft, FileText, PiggyBank,
  CalendarCheck, Users, Clock, Award,
  AlertCircle, Layers,
  Navigation, Heart,
  ClipboardList, Gauge, Shield,
  Truck, Fuel, Wrench,
  Megaphone
} from 'lucide-react';
import { WidgetDefinition, WidgetLayoutItem } from './types';

// Core Widgets
import { WelcomeWidget, RevenueTodayWidget, TransactionCountWidget, StockValueWidget, MonthlyTargetWidget, BranchStatusWidget, AlertsWidget, QuickActionsWidget } from '../../components/hq/widgets/CoreWidgets';
// Analytics Widgets
import { SalesTrendWidget, SalesByBranchWidget, RegionPerformanceWidget, TopProductsWidget, RecentTransactionsWidget, BranchPerformanceWidget } from '../../components/hq/widgets/AnalyticsWidgets';
// Module Widgets
import {
  FinanceRevenueWidget, FinanceProfitLossWidget, FinanceCashFlowWidget, FinanceInvoicesWidget, FinanceBudgetWidget,
  HRISAttendanceWidget, HRISKPIWidget, HRISLeaveWidget, HRISHeadcountWidget,
  InventoryLowStockWidget, InventoryMovementWidget,
  SFAPipelineWidget, SFATargetWidget, SFAActivitiesWidget,
  MfgWorkOrdersWidget, MfgOEEWidget, MfgQualityWidget,
  FleetVehiclesWidget, FleetFuelWidget, FleetMaintenanceWidget,
  MarketingCampaignsWidget, MarketingEngagementWidget,
} from '../../components/hq/widgets/ModuleWidgets';

export const widgetRegistry: WidgetDefinition[] = [
  // ─── Core ───
  { id: 'core-welcome', title: 'Header Selamat Datang', description: 'Greeting, waktu live, dan tombol aksi utama', module: 'core', icon: Sparkles, defaultSize: 'xl', component: WelcomeWidget },
  { id: 'core-alerts', title: 'Notifikasi & Alert', description: 'Alert dari semua cabang dan sistem', module: 'core', icon: Bell, defaultSize: 'sm', component: AlertsWidget },
  { id: 'core-quick-actions', title: 'Aksi Cepat', description: 'Shortcut ke fitur-fitur utama', module: 'core', icon: Zap, defaultSize: 'sm', component: QuickActionsWidget },

  // ─── Sales ───
  { id: 'sales-revenue-today', title: 'Revenue Hari Ini', description: 'Total penjualan hari ini vs kemarin', module: 'sales', icon: Wallet, defaultSize: 'sm', component: RevenueTodayWidget },
  { id: 'sales-transactions', title: 'Jumlah Transaksi', description: 'Total transaksi dan rata-rata per transaksi', module: 'sales', icon: CreditCard, defaultSize: 'sm', component: TransactionCountWidget },
  { id: 'sales-monthly-target', title: 'Target Bulanan', description: 'Progress pencapaian target bulan ini', module: 'sales', icon: Target, defaultSize: 'sm', component: MonthlyTargetWidget },
  { id: 'sales-trend', title: 'Tren Penjualan', description: 'Grafik tren penjualan harian/mingguan', module: 'sales', icon: TrendingUp, defaultSize: 'lg', component: SalesTrendWidget },
  { id: 'sales-top-products', title: 'Produk Terlaris', description: 'Top 5 produk paling laris', module: 'sales', icon: ShoppingCart, defaultSize: 'md', component: TopProductsWidget },

  // ─── Branches ───
  { id: 'branch-status', title: 'Status Cabang', description: 'Online/offline status semua cabang', module: 'branches', icon: Store, defaultSize: 'sm', component: BranchStatusWidget },
  { id: 'branch-sales', title: 'Penjualan per Cabang', description: 'Perbandingan penjualan antar cabang', module: 'branches', icon: BarChart3, defaultSize: 'md', component: SalesByBranchWidget },
  { id: 'branch-region', title: 'Performa Wilayah', description: 'Penjualan per region/wilayah', module: 'branches', icon: PieChart, defaultSize: 'md', component: RegionPerformanceWidget },
  { id: 'branch-performance', title: 'Tabel Performa Cabang', description: 'Detail performa semua cabang dalam tabel', module: 'branches', icon: Store, defaultSize: 'xl', component: BranchPerformanceWidget },

  // ─── Finance ───
  { id: 'finance-revenue', title: 'Revenue Keuangan', description: 'Total revenue, piutang, dan hutang', module: 'finance', icon: DollarSign, defaultSize: 'sm', component: FinanceRevenueWidget },
  { id: 'finance-profit-loss', title: 'Laba Rugi', description: 'Ringkasan pendapatan, pengeluaran, dan laba', module: 'finance', icon: TrendingUp, defaultSize: 'sm', component: FinanceProfitLossWidget },
  { id: 'finance-cashflow', title: 'Arus Kas', description: 'Grafik arus kas masuk dan keluar', module: 'finance', icon: ArrowRightLeft, defaultSize: 'md', component: FinanceCashFlowWidget },
  { id: 'finance-invoices', title: 'Invoice Terbaru', description: 'Daftar invoice terbaru', module: 'finance', icon: FileText, defaultSize: 'sm', component: FinanceInvoicesWidget },
  { id: 'finance-budget', title: 'Realisasi Anggaran', description: 'Progress realisasi anggaran per departemen', module: 'finance', icon: PiggyBank, defaultSize: 'sm', component: FinanceBudgetWidget },
  { id: 'finance-transactions', title: 'Transaksi Terbaru', description: 'Feed transaksi keuangan real-time', module: 'finance', icon: Receipt, defaultSize: 'md', component: RecentTransactionsWidget },

  // ─── HRIS ───
  { id: 'hris-attendance', title: 'Kehadiran Hari Ini', description: 'Ringkasan kehadiran karyawan', module: 'hris', icon: CalendarCheck, defaultSize: 'sm', component: HRISAttendanceWidget },
  { id: 'hris-kpi', title: 'KPI Overview', description: 'Progress KPI per kategori', module: 'hris', icon: Target, defaultSize: 'sm', component: HRISKPIWidget },
  { id: 'hris-leave', title: 'Permintaan Cuti', description: 'Daftar permintaan cuti terbaru', module: 'hris', icon: Clock, defaultSize: 'sm', component: HRISLeaveWidget },
  { id: 'hris-headcount', title: 'Jumlah Karyawan', description: 'Breakdown karyawan per departemen', module: 'hris', icon: Users, defaultSize: 'sm', component: HRISHeadcountWidget },

  // ─── Inventory ───
  { id: 'inventory-stock-value', title: 'Nilai Stok', description: 'Total nilai stok di semua lokasi', module: 'inventory', icon: Package, defaultSize: 'sm', component: StockValueWidget },
  { id: 'inventory-low-stock', title: 'Stok Rendah', description: 'Item yang perlu restock segera', module: 'inventory', icon: AlertCircle, defaultSize: 'sm', component: InventoryLowStockWidget },
  { id: 'inventory-movement', title: 'Pergerakan Stok', description: 'Grafik stok masuk dan keluar', module: 'inventory', icon: ArrowRightLeft, defaultSize: 'md', component: InventoryMovementWidget },

  // ─── SFA / CRM ───
  { id: 'sfa-pipeline', title: 'Sales Pipeline', description: 'Funnel pipeline dari prospek ke closing', module: 'sfa', icon: Target, defaultSize: 'sm', component: SFAPipelineWidget },
  { id: 'sfa-target', title: 'Target Penjualan', description: 'Progress pencapaian target sales', module: 'sfa', icon: Award, defaultSize: 'sm', component: SFATargetWidget },
  { id: 'sfa-activities', title: 'Aktivitas Sales', description: 'Progress aktivitas: kunjungan, meeting, telepon', module: 'sfa', icon: Navigation, defaultSize: 'sm', component: SFAActivitiesWidget },

  // ─── Manufacturing ───
  { id: 'mfg-work-orders', title: 'Work Orders', description: 'Status work order: draft, in progress, completed', module: 'manufacturing', icon: ClipboardList, defaultSize: 'sm', component: MfgWorkOrdersWidget },
  { id: 'mfg-oee', title: 'OEE Score', description: 'Overall Equipment Effectiveness', module: 'manufacturing', icon: Gauge, defaultSize: 'sm', component: MfgOEEWidget },
  { id: 'mfg-quality', title: 'Quality Control', description: 'Pass rate dan inspeksi QC', module: 'manufacturing', icon: Shield, defaultSize: 'sm', component: MfgQualityWidget },

  // ─── Fleet ───
  { id: 'fleet-vehicles', title: 'Status Kendaraan', description: 'Status aktif/maintenance semua kendaraan', module: 'fleet', icon: Truck, defaultSize: 'sm', component: FleetVehiclesWidget },
  { id: 'fleet-fuel', title: 'Konsumsi BBM', description: 'Total konsumsi dan biaya BBM', module: 'fleet', icon: Fuel, defaultSize: 'sm', component: FleetFuelWidget },
  { id: 'fleet-maintenance', title: 'Maintenance Due', description: 'Kendaraan yang perlu maintenance', module: 'fleet', icon: Wrench, defaultSize: 'sm', component: FleetMaintenanceWidget },

  // ─── Marketing ───
  { id: 'marketing-campaigns', title: 'Kampanye Aktif', description: 'Daftar kampanye marketing yang berjalan', module: 'marketing', icon: Megaphone, defaultSize: 'sm', component: MarketingCampaignsWidget },
  { id: 'marketing-engagement', title: 'Customer Engagement', description: 'Metrik engagement dan retention pelanggan', module: 'marketing', icon: Heart, defaultSize: 'sm', component: MarketingEngagementWidget },
];

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return widgetRegistry.find(w => w.id === id);
}

export function getWidgetsByModule(module: string): WidgetDefinition[] {
  return widgetRegistry.filter(w => w.module === module);
}

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { widgetId: 'core-welcome', size: 'xl' as const, order: 0, x: 0, y: 0, w: 12, h: 3 },
  { widgetId: 'sales-revenue-today', size: 'sm' as const, order: 1, x: 0, y: 3, w: 3, h: 4 },
  { widgetId: 'sales-transactions', size: 'sm' as const, order: 2, x: 3, y: 3, w: 3, h: 4 },
  { widgetId: 'inventory-stock-value', size: 'sm' as const, order: 3, x: 6, y: 3, w: 3, h: 4 },
  { widgetId: 'sales-monthly-target', size: 'sm' as const, order: 4, x: 9, y: 3, w: 3, h: 4 },
  { widgetId: 'sales-trend', size: 'lg' as const, order: 5, x: 0, y: 7, w: 8, h: 5 },
  { widgetId: 'core-alerts', size: 'sm' as const, order: 6, x: 8, y: 7, w: 4, h: 5 },
];
