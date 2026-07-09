/**
 * Sidebar HQ — PT Ekosistem Satwa Indonesia (ESI)
 * Platform pet ecosystem B2B — Partner Management, Teleconsult, Booking, Online Shop
 * Tanpa: PoS retail offline, FnB, Manufaktur, DMS, Livestreaming, BUMDes.
 */
import {
  LayoutDashboard, Package, Users, FileText, Settings, TrendingUp,
  ClipboardList, Truck, BarChart3, History, Globe, DollarSign, Layers,
  UserCog, FileBarChart, UserCheck, Target, Briefcase, Megaphone,
  Headphones, MessageCircle, ShoppingBag, BookOpen, Building2,
  Warehouse, Wrench, Send, Plane, Calculator, Receipt, FileSpreadsheet,
  PiggyBank, CreditCard, Shield, Link2, Code2, Heart, MapPin, Navigation,
  Fuel, HardHat, Scan, GraduationCap, PenTool, Ship, Anchor, Car,
  Sparkles, Activity, AlertTriangle, Timer, Rocket, Gauge, Cog, Brain, UserPlus,
  Dog, Syringe, Hotel, Building, Calendar, Percent, Wallet, Users2, Award, ArrowRightLeft,
  type LucideIcon,
} from 'lucide-react';
import type { SidebarConfig, MenuGroup } from './sidebar.config';

export const esiHqSidebarConfig: SidebarConfig = {
  layout: 'hq',
  logo: {
    icon: Heart,
    title: 'ESI ERP',
    subtitle: 'PT Ekosistem Satwa Indonesia',
    href: '/hq/home',
  },
  groups: [
    {
      id: 'main',
      title: 'Utama',
      items: [
        { id: 'home', name: 'Beranda', href: '/hq/home', icon: Sparkles },
        { id: 'dashboard', name: 'Dasbor Operasional', href: '/hq/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      id: 'platform',
      title: 'Platform & Partner',
      items: [
        {
          id: 'partners',
          name: 'Partner Management',
          icon: Building2,
          modules: ['partners'],
          children: [
            { id: 'partner-all', name: 'Semua Partner', href: '/hq/partners', icon: Users },
            { id: 'partner-vet', name: 'Veterinarian', href: '/hq/partners?type=vet', icon: Syringe },
            { id: 'partner-petshop', name: 'Pet Shop', href: '/hq/partners?type=petshop', icon: Dog },
            { id: 'partner-clinic', name: 'Pet Clinic', href: '/hq/partners?type=petclinic', icon: Heart },
            { id: 'partner-hotel', name: 'Pet Hotel', href: '/hq/partners?type=pethotel', icon: Hotel },
            { id: 'partner-transport', name: 'Pet Transport', href: '/hq/partners?type=pettransport', icon: Truck },
          ],
        },
        {
          id: 'teleconsult',
          name: 'Teleconsult',
          icon: Heart,
          modules: ['teleconsult'],
          children: [
            { id: 'tc-sessions', name: 'Sesi Telekonsul', href: '/hq/teleconsult', icon: Activity },
          ],
        },
        {
          id: 'booking',
          name: 'Booking',
          icon: Calendar,
          modules: ['booking'],
          children: [
            { id: 'booking-list', name: 'Daftar Booking', href: '/hq/booking', icon: ClipboardList },
          ],
        },
      ],
    },
    {
      id: 'conservation',
      title: 'Konservasi & Proyek',
      items: [
        {
          id: 'project-management',
          name: 'Manajemen Proyek',
          icon: Target,
          modules: ['project_management'],
          children: [
            { id: 'pm-dashboard', name: 'Dasbor Proyek', href: '/hq/project-management', icon: LayoutDashboard },
            { id: 'pm-programs', name: 'Program Konservasi', href: '/hq/project-management?tab=projects', icon: Heart },
            { id: 'pm-tasks', name: 'Tugas & Milestone', href: '/hq/project-management?tab=tasks', icon: ClipboardList },
            { id: 'pm-resources', name: 'Sumber Daya', href: '/hq/project-management?tab=resources', icon: Users },
          ],
        },
        {
          id: 'assets',
          name: 'Manajemen Aset',
          icon: Wrench,
          modules: ['asset_management'],
          children: [
            { id: 'asset-dashboard', name: 'Dasbor Aset', href: '/hq/assets', icon: LayoutDashboard },
            { id: 'asset-register', name: 'Register Aset', href: '/hq/assets?tab=register', icon: Package },
            { id: 'asset-field', name: 'Aset Lapangan', href: '/hq/assets/field', icon: MapPin },
            { id: 'asset-maintenance', name: 'Pemeliharaan', href: '/hq/assets?tab=maintenance', icon: Cog },
          ],
        },
        {
          id: 'knowledge-base',
          name: 'Basis Pengetahuan',
          icon: BookOpen,
          modules: ['knowledge_base'],
          children: [
            { id: 'kb-home', name: 'SOP & Protokol', href: '/hq/knowledge-base', icon: BookOpen },
          ],
        },
      ],
    },
    {
      id: 'operations',
      title: 'Operasional',
      items: [
        {
          id: 'inventory',
          name: 'Gudang & Inventori',
          icon: Package,
          modules: ['inventory', 'products'],
          children: [
            { id: 'inv-dashboard', name: 'Dasbor Gudang', href: '/hq/inventory', icon: Warehouse },
            { id: 'inv-products', name: 'Produk & Bahan', href: '/hq/products', icon: Layers },
            { id: 'inv-suppliers', name: 'Pemasok', href: '/hq/suppliers', icon: Truck },
            { id: 'inv-po', name: 'Pesanan Pembelian', href: '/hq/purchase-orders', icon: ClipboardList },
          ],
        },
        {
          id: 'requisitions',
          name: 'Permintaan Barang',
          icon: ClipboardList,
          modules: ['requisitions'],
          children: [
            { id: 'req-list', name: 'Daftar Permintaan', href: '/hq/requisitions', icon: ClipboardList },
          ],
        },
        {
          id: 'e-procurement',
          name: 'E-Pengadaan',
          icon: ShoppingBag,
          modules: ['e_procurement'],
          children: [
            { id: 'ep-dashboard', name: 'Dasbor Pengadaan', href: '/hq/e-procurement', icon: LayoutDashboard },
          ],
        },
        {
          id: 'fleet',
          name: 'Armada & Lapangan',
          icon: Truck,
          modules: ['fms', 'tms', 'fleet'],
          children: [
            { id: 'fleet-hub', name: 'Pusat Kendali Armada', href: '/hq/fleet', icon: MapPin },
            { id: 'fms', name: 'Manajemen Armada', href: '/hq/fms', icon: Car },
            { id: 'tms', name: 'Transportasi & Logistik', href: '/hq/tms', icon: Send },
          ],
        },
        {
          id: 'export-import',
          name: 'Ekspor-Impor',
          icon: Ship,
          modules: ['export_import'],
          children: [
            { id: 'ei-dashboard', name: 'Dasbor Ekspor-Impor', href: '/hq/export-import', icon: Anchor },
          ],
        },
      ],
    },
    {
      id: 'platforms',
      title: 'Platform',
      items: [
        {
          id: 'humanify',
          name: 'Humanify',
          icon: UserCheck,
          modules: ['humanify', 'hris'],
          children: [
            { id: 'humanify-welcome', name: 'Tentang Humanify', href: '/humanify/welcome', icon: Sparkles },
            { id: 'humanify-home', name: 'Beranda Humanify', href: '/humanify', icon: Sparkles },
            { id: 'humanify-employees', name: 'Karyawan', href: '/humanify/employees', icon: Users },
            { id: 'humanify-hr-analytics', name: 'HR Analytics', href: '/humanify/hr-analytics', icon: Activity },
            { id: 'humanify-attendance', name: 'Kehadiran', href: '/humanify/attendance', icon: Timer },
            { id: 'humanify-recruitment', name: 'Rekrutmen', href: '/humanify/recruitment', icon: UserPlus },
            { id: 'humanify-kpi', name: 'KPI Karyawan', href: '/humanify/kpi', icon: Target },
            { id: 'humanify-reimbursement', name: 'Reimbursement', href: '/humanify/reimbursement', icon: Wallet },
            { id: 'humanify-payroll', name: 'Payroll', href: '/humanify/payroll', icon: DollarSign },
            { id: 'humanify-casual', name: 'Tenaga Harian', href: '/humanify/casual-workforce', icon: HardHat },
          ],
        },
        { id: 'users', name: 'Pengguna & Akses', href: '/hq/users', icon: UserCog, modules: ['users'] },
      ],
    },
    {
      id: 'stakeholder',
      title: 'Stakeholder & Komunikasi',
      items: [
        {
          id: 'crm',
          name: 'CRM & Mitra',
          icon: Briefcase,
          modules: ['crm', 'sfa'],
          children: [
            { id: 'crm-dashboard', name: 'Dasbor CRM', href: '/hq/crm', icon: LayoutDashboard },
            { id: 'crm-pipeline', name: 'Pipeline Leads', href: '/hq/crm', icon: Target },
            { id: 'crm-planning', name: 'Sales Planning', href: '/hq/crm/planning', icon: Calendar },
            { id: 'crm-targets', name: 'Target & Realisasi', href: '/hq/crm/targets', icon: TrendingUp },
          ],
        },
        { id: 'helpdesk', name: 'Layanan & Help Desk', href: '/hq/helpdesk', icon: Headphones, modules: ['helpdesk', 'crm'] },
        { id: 'marketing', name: 'Pemasaran & Edukasi', href: '/hq/marketing', icon: Megaphone, modules: ['marketing'] },
        { id: 'whatsapp', name: 'WhatsApp Bisnis', href: '/hq/whatsapp', icon: MessageCircle, modules: ['whatsapp_business'] },
        { id: 'website-builder', name: 'Website Builder', href: '/hq/website-builder', icon: Code2, modules: ['website_builder'] },
      ],
    },
    {
      id: 'finance',
      title: 'Keuangan',
      items: [
        {
          id: 'finance-pro',
          name: 'Keuangan Lengkap',
          icon: DollarSign,
          modules: ['finance_pro'],
          children: [
            { id: 'fin-dashboard', name: 'Dasbor Keuangan', href: '/hq/finance', icon: LayoutDashboard },
            { id: 'fin-commissions', name: 'Komisi Partner', href: '/hq/commissions', icon: Percent },
            { id: 'fin-payouts', name: 'Pembayaran Partner', href: '/hq/payouts', icon: Wallet },
            { id: 'fin-invoices', name: 'Faktur', href: '/hq/finance/invoices', icon: Receipt },
            { id: 'fin-expenses', name: 'Pengeluaran', href: '/hq/finance/expenses', icon: CreditCard },
            { id: 'fin-pnl', name: 'Laba Rugi', href: '/hq/finance/profit-loss', icon: FileSpreadsheet },
            { id: 'fin-tax', name: 'Pajak', href: '/hq/finance/tax', icon: Calculator },
          ],
        },
        {
          id: 'multifinance',
          name: 'Pembiayaan & Multifinance',
          icon: Building2,
          modules: ['hris', 'finance_pro'],
          children: [
            { id: 'mf-workforce', name: 'Tenaga Kerja Pembiayaan', href: '/hq/multifinance/workforce', icon: Users },
            { id: 'mf-casual-link', name: 'Tenaga Harian & Borongan', href: '/humanify/casual-workforce', icon: HardHat },
          ],
        },
      ],
    },
    {
      id: 'reports',
      title: 'Laporan & Audit',
      items: [
        { id: 'reports', name: 'Laporan', href: '/hq/reports', icon: FileBarChart, modules: ['reports'] },
        { id: 'audit', name: 'Log Audit', href: '/hq/audit-logs', icon: History, modules: ['audit'] },
      ],
    },
    {
      id: 'settings',
      title: 'Pengaturan',
      items: [
        { id: 'settings', name: 'Pengaturan Sistem', href: '/hq/settings', icon: Settings, modules: ['settings'] },
        { id: 'modules', name: 'Manajemen Modul', href: '/hq/settings/modules', icon: Layers, modules: ['settings'] },
      ],
    },
  ] as MenuGroup[],
};
