import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Package, Plus, Search, Filter, BarChart3, Wrench, ArrowRightLeft, FileText,
  AlertCircle, Settings, Trash2, Eye, Edit, ChevronDown, ChevronRight,
  Building2, MapPin, Users, Clock, DollarSign, Shield, Tag, Cog,
  Monitor, Home, Calendar, CheckCircle, XCircle, AlertTriangle, TrendingDown,
  QrCode, Barcode, Gauge, Activity, Layers, Calculator, Key, Wifi, ClipboardList
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
interface Asset {
  id: string; asset_code: string; name: string; description?: string;
  category_id?: string; category_name?: string; category_icon?: string; category_code?: string;
  status: string; condition: string;
  acquisition_type?: string; acquisition_date?: string; purchase_price: number;
  serial_number?: string; barcode?: string;
  branch_id?: string; department?: string; location?: string;
  custodian_id?: number; custodian_name?: string;
  brand?: string; model?: string; manufacturer?: string;
  depreciation_method?: string; useful_life_months?: number;
  salvage_value?: number; accumulated_depreciation?: number; current_book_value?: number;
  warranty_expiry?: string; photo_url?: string; tags?: string[];
  created_at?: string; [key: string]: any;
}

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_DASHBOARD = {
  totalAssets: 245, totalValue: 4850000000, totalDepreciation: 1250000000, netBookValue: 3600000000,
  byStatus: { active: 198, maintenance: 22, disposed: 15, in_transit: 10 },
  byCategory: [
    { name: 'IT Equipment', count: 65, value: 1200000000 },
    { name: 'Furniture', count: 48, value: 450000000 },
    { name: 'Vehicles', count: 12, value: 1800000000 },
    { name: 'Machinery', count: 35, value: 950000000 },
    { name: 'Office Equipment', count: 42, value: 280000000 },
    { name: 'Buildings', count: 8, value: 170000000 },
  ],
  recentMovements: [
    { id: 'm1', asset_name: 'Laptop Dell Latitude 5540', type: 'transfer', from: 'HQ Jakarta', to: 'Cabang Bandung', date: '2026-03-10' },
    { id: 'm2', asset_name: 'Printer HP LaserJet Pro', type: 'maintenance', from: 'Cabang Surabaya', to: 'Vendor Service', date: '2026-03-08' },
  ],
  expiringWarranties: 8, upcomingMaintenance: 12,
};

const MOCK_ASSETS: Asset[] = [
  { id: 'a1', asset_code: 'AST-IT-001', name: 'Laptop Dell Latitude 5540', category_name: 'IT Equipment', category_code: 'IT', status: 'active', condition: 'good', purchase_price: 18500000, acquisition_date: '2025-06-15', serial_number: 'DL5540-JKT-001', brand: 'Dell', model: 'Latitude 5540', department: 'IT', location: 'HQ Jakarta', custodian_name: 'Rizki Firmansyah', depreciation_method: 'straight_line', useful_life_months: 48, current_book_value: 15400000 },
  { id: 'a2', asset_code: 'AST-IT-002', name: 'MacBook Pro 14" M3', category_name: 'IT Equipment', category_code: 'IT', status: 'active', condition: 'excellent', purchase_price: 32000000, acquisition_date: '2025-09-01', serial_number: 'MBP14-M3-002', brand: 'Apple', model: 'MacBook Pro 14', department: 'MANAGEMENT', location: 'HQ Jakarta', custodian_name: 'Ahmad Wijaya', depreciation_method: 'straight_line', useful_life_months: 48, current_book_value: 28000000 },
  { id: 'a3', asset_code: 'AST-VH-001', name: 'Toyota Avanza 2024', category_name: 'Vehicles', category_code: 'VH', status: 'active', condition: 'good', purchase_price: 245000000, acquisition_date: '2024-03-20', serial_number: 'MHFM1BA3J4K123456', brand: 'Toyota', model: 'Avanza 1.5 G', department: 'OPERATIONS', location: 'HQ Jakarta', depreciation_method: 'straight_line', useful_life_months: 96, current_book_value: 195000000 },
  { id: 'a4', asset_code: 'AST-FR-001', name: 'Meja Kerja Direktur', category_name: 'Furniture', category_code: 'FR', status: 'active', condition: 'good', purchase_price: 8500000, acquisition_date: '2024-01-10', brand: 'IKEA', model: 'BEKANT', department: 'MANAGEMENT', location: 'HQ Jakarta', depreciation_method: 'straight_line', useful_life_months: 120, current_book_value: 6800000 },
  { id: 'a5', asset_code: 'AST-MC-001', name: 'Mesin Espresso Comercial', category_name: 'Machinery', category_code: 'MC', status: 'active', condition: 'good', purchase_price: 85000000, acquisition_date: '2025-01-15', brand: 'La Marzocco', model: 'Linea Mini', department: 'KITCHEN', location: 'Cabang Bali', depreciation_method: 'straight_line', useful_life_months: 60, current_book_value: 71000000 },
  { id: 'a6', asset_code: 'AST-IT-003', name: 'Server Rack Dell PowerEdge', category_name: 'IT Equipment', category_code: 'IT', status: 'active', condition: 'good', purchase_price: 125000000, acquisition_date: '2024-06-01', serial_number: 'DPE-R750-001', brand: 'Dell', model: 'PowerEdge R750', department: 'IT', location: 'Data Center Jakarta', depreciation_method: 'straight_line', useful_life_months: 60, current_book_value: 87500000 },
  { id: 'a7', asset_code: 'AST-OE-001', name: 'Printer HP LaserJet Pro', category_name: 'Office Equipment', category_code: 'OE', status: 'maintenance', condition: 'fair', purchase_price: 12000000, acquisition_date: '2024-09-15', serial_number: 'HP-LJ-PRO-001', brand: 'HP', model: 'LaserJet Pro M404dn', department: 'ADMINISTRATION', location: 'Cabang Surabaya', depreciation_method: 'straight_line', useful_life_months: 48, current_book_value: 8000000 },
  { id: 'a8', asset_code: 'AST-VH-002', name: 'Mitsubishi Colt Diesel', category_name: 'Vehicles', category_code: 'VH', status: 'active', condition: 'fair', purchase_price: 350000000, acquisition_date: '2023-08-10', brand: 'Mitsubishi', model: 'Colt Diesel FE 74', department: 'WAREHOUSE', location: 'Gudang Bekasi', depreciation_method: 'straight_line', useful_life_months: 96, current_book_value: 240000000 },
];

const MOCK_CATEGORIES = [
  { id: 'cat1', code: 'IT', name: 'IT Equipment', description: 'Komputer, laptop, server, networking', icon: 'Monitor', asset_count: 65, useful_life_months: 48 },
  { id: 'cat2', code: 'FR', name: 'Furniture', description: 'Meja, kursi, lemari kantor', icon: 'Home', asset_count: 48, useful_life_months: 120 },
  { id: 'cat3', code: 'VH', name: 'Vehicles', description: 'Kendaraan operasional', icon: 'Truck', asset_count: 12, useful_life_months: 96 },
  { id: 'cat4', code: 'MC', name: 'Machinery', description: 'Mesin produksi dan operasional', icon: 'Cog', asset_count: 35, useful_life_months: 60 },
  { id: 'cat5', code: 'OE', name: 'Office Equipment', description: 'Printer, scanner, AC, dll', icon: 'ClipboardList', asset_count: 42, useful_life_months: 48 },
  { id: 'cat6', code: 'BD', name: 'Buildings', description: 'Bangunan dan renovasi', icon: 'Building2', asset_count: 8, useful_life_months: 240 },
];

const MOCK_MOVEMENTS = [
  { id: 'mv1', asset_code: 'AST-IT-001', asset_name: 'Laptop Dell Latitude 5540', movement_type: 'transfer', from_location: 'HQ Jakarta', to_location: 'Cabang Bandung', date: '2026-03-10', status: 'completed', notes: 'Transfer untuk karyawan baru', created_by: 'Nurul Hidayah' },
  { id: 'mv2', asset_code: 'AST-OE-001', asset_name: 'Printer HP LaserJet Pro', movement_type: 'maintenance', from_location: 'Cabang Surabaya', to_location: 'Vendor HP Service', date: '2026-03-08', status: 'in_progress', notes: 'Paper jam issue', created_by: 'Yuni Kartika' },
  { id: 'mv3', asset_code: 'AST-FR-005', asset_name: 'Kursi Ergonomis', movement_type: 'transfer', from_location: 'Gudang Bekasi', to_location: 'Cabang Bali', date: '2026-03-05', status: 'completed', notes: 'Penambahan furniture cabang baru', created_by: 'Eko Prasetyo' },
  { id: 'mv4', asset_code: 'AST-VH-003', asset_name: 'Honda Vario 160', movement_type: 'return', from_location: 'Cabang Medan', to_location: 'HQ Jakarta', date: '2026-03-01', status: 'completed', notes: 'Return dari karyawan resign', created_by: 'Dewi Lestari' },
];

const MOCK_MAINTENANCE = [
  { id: 'mt1', asset_code: 'AST-VH-001', asset_name: 'Toyota Avanza 2024', schedule_type: 'preventive', frequency: 'quarterly', last_maintenance: '2025-12-20', next_maintenance: '2026-03-20', status: 'upcoming', cost_estimate: 2500000 },
  { id: 'mt2', asset_code: 'AST-MC-001', asset_name: 'Mesin Espresso Comercial', schedule_type: 'preventive', frequency: 'monthly', last_maintenance: '2026-02-15', next_maintenance: '2026-03-15', status: 'upcoming', cost_estimate: 500000 },
  { id: 'mt3', asset_code: 'AST-IT-006', asset_name: 'Server Rack Dell PowerEdge', schedule_type: 'preventive', frequency: 'semi-annual', last_maintenance: '2025-12-01', next_maintenance: '2026-06-01', status: 'scheduled', cost_estimate: 5000000 },
];

const MOCK_LICENSES = [
  { id: 'lic1', name: 'Microsoft 365 Business', vendor: 'Microsoft', license_type: 'subscription', seats: 50, used_seats: 42, cost_per_seat: 250000, total_cost: 12500000, start_date: '2026-01-01', expiry_date: '2026-12-31', status: 'active', auto_renew: true },
  { id: 'lic2', name: 'Adobe Creative Cloud', vendor: 'Adobe', license_type: 'subscription', seats: 5, used_seats: 5, cost_per_seat: 850000, total_cost: 4250000, start_date: '2025-06-01', expiry_date: '2026-05-31', status: 'active', auto_renew: true },
  { id: 'lic3', name: 'Antivirus Kaspersky', vendor: 'Kaspersky', license_type: 'subscription', seats: 80, used_seats: 72, cost_per_seat: 150000, total_cost: 12000000, start_date: '2025-09-01', expiry_date: '2026-08-31', status: 'active', auto_renew: false },
];

const MOCK_ALERTS = [
  { id: 'al1', type: 'warranty_expiry', severity: 'warning', title: 'Garansi akan berakhir', message: '8 aset dengan garansi berakhir dalam 30 hari', date: '2026-03-12', is_read: false },
  { id: 'al2', type: 'maintenance_due', severity: 'info', title: 'Maintenance terjadwal', message: '3 aset memerlukan maintenance minggu ini', date: '2026-03-11', is_read: false },
  { id: 'al3', type: 'license_expiry', severity: 'critical', title: 'Lisensi segera berakhir', message: 'Adobe Creative Cloud berakhir dalam 60 hari', date: '2026-03-10', is_read: true },
  { id: 'al4', type: 'depreciation', severity: 'info', title: 'Penyusutan bulanan', message: 'Penyusutan Maret 2026 telah dihitung: Rp 45.8 Jt', date: '2026-03-01', is_read: true },
];

const MOCK_DEPR_SUMMARY = {
  totalOriginalCost: 4850000000, totalAccumulatedDepreciation: 1250000000, totalNetBookValue: 3600000000,
  monthlyDepreciation: 45800000, yearlyDepreciation: 549600000,
  byMethod: { straight_line: 220, declining_balance: 15, units_of_production: 10 },
  fullyDepreciated: 18,
};

// ============================================================
// MAIN PAGE
// ============================================================
export default function AssetManagementPage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tab } = router.query;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<any>(null);
  // Asset list state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  // Selected asset detail
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Create/Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  // Movements
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  // Depreciation
  const [deprSummary, setDeprSummary] = useState<any>(null);
  const [deprSchedule, setDeprSchedule] = useState<any[]>([]);
  // Maintenance
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  // Licenses
  const [licenses, setLicenses] = useState<any[]>([]);
  // Tenancies
  const [tenancies, setTenancies] = useState<any[]>([]);
  // Alerts
  const [alerts, setAlerts] = useState<any[]>([]);
  // Settings
  const [settings, setSettings] = useState<any>({});
  // Dispose modal
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposingAsset, setDisposingAsset] = useState<any>(null);

  useEffect(() => {
    if (tab && typeof tab === 'string') setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (activeTab === 'dashboard') fetchDashboard();
      if (activeTab === 'registry') fetchAssets();
      if (activeTab === 'categories') fetchCategories();
      if (activeTab === 'movements') fetchMovements();
      if (activeTab === 'depreciation') fetchDepreciation();
      if (activeTab === 'maintenance') { fetchMaintenanceSchedules(); fetchWorkOrders(); }
      if (activeTab === 'licenses') fetchLicenses();
      if (activeTab === 'tenancy') fetchTenancies();
      if (activeTab === 'alerts') fetchAlerts();
      if (activeTab === 'settings') fetchSettings();
    }
  }, [activeTab, status, currentPage, filterStatus, filterCategory]);

  // ============================================================
  // API CALLS
  // ============================================================
  const apiFetch = useCallback(async (url: string) => {
    const res = await fetch(url);
    return res.json();
  }, []);

  const apiPost = useCallback(async (url: string, body: any) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets?action=dashboard');
      if (data.success && data.data) setDashboardData(data.data);
      else setDashboardData(MOCK_DASHBOARD);
    } catch (e) { console.error(e); setDashboardData(MOCK_DASHBOARD); }
    setLoading(false);
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      let url = `/api/hq/assets?action=list&page=${currentPage}&limit=20`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      const data = await apiFetch(url);
      if (data.success && data.data?.length) { setAssets(data.data); setTotalAssets(data.total); }
      else { setAssets(MOCK_ASSETS); setTotalAssets(MOCK_ASSETS.length); }
    } catch (e) { console.error(e); setAssets(MOCK_ASSETS); setTotalAssets(MOCK_ASSETS.length); }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch('/api/hq/assets?action=categories');
      if (data.success && data.data?.length) setCategories(data.data);
      else setCategories(MOCK_CATEGORIES);
    } catch (e) { console.error(e); setCategories(MOCK_CATEGORIES); }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets?action=movements');
      if (data.success && data.data?.length) setMovements(data.data);
      else setMovements(MOCK_MOVEMENTS);
    } catch (e) { console.error(e); setMovements(MOCK_MOVEMENTS); }
    setLoading(false);
  };

  const fetchDepreciation = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets/depreciation?action=summary');
      if (data.success && data.data) setDeprSummary(data.data);
      else setDeprSummary(MOCK_DEPR_SUMMARY);
    } catch (e) { console.error(e); setDeprSummary(MOCK_DEPR_SUMMARY); }
    setLoading(false);
  };

  const fetchMaintenanceSchedules = async () => {
    try {
      const data = await apiFetch('/api/hq/assets/extensions?action=maintenance-schedules');
      if (data.success && data.data?.length) setMaintenanceSchedules(data.data);
      else setMaintenanceSchedules(MOCK_MAINTENANCE);
    } catch (e) { console.error(e); setMaintenanceSchedules(MOCK_MAINTENANCE); }
  };

  const fetchWorkOrders = async () => {
    try {
      const data = await apiFetch('/api/hq/assets/extensions?action=work-orders');
      if (data.success) setWorkOrders(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets/extensions?action=licenses');
      if (data.success && data.data?.length) setLicenses(data.data);
      else setLicenses(MOCK_LICENSES);
    } catch (e) { console.error(e); setLicenses(MOCK_LICENSES); }
    setLoading(false);
  };

  const fetchTenancies = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets/extensions?action=tenancies');
      if (data.success) setTenancies(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/hq/assets?action=alerts');
      if (data.success && data.data?.length) setAlerts(data.data);
      else setAlerts(MOCK_ALERTS);
    } catch (e) { console.error(e); setAlerts(MOCK_ALERTS); }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/hq/assets?action=settings');
      if (data.success) setSettings(data.data);
    } catch (e) { console.error(e); }
  };

  const viewAssetDetail = async (id: string) => {
    try {
      const data = await apiFetch(`/api/hq/assets?action=detail&id=${id}`);
      if (data.success) { setSelectedAsset(data.data); setShowDetailModal(true); }
    } catch (e) { console.error(e); }
  };

  const handleCreateAsset = async (formData: any) => {
    try {
      const action = editingAsset ? 'update' : 'create';
      const url = editingAsset ? `/api/hq/assets?action=update&id=${editingAsset.id}` : '/api/hq/assets?action=create';
      const data = await apiPost(url, formData);
      if (data.success) {
        setShowCreateModal(false);
        setEditingAsset(null);
        fetchAssets();
        fetchDashboard();
      }
    } catch (e) { console.error(e); }
  };

  const handleDispose = async (formData: any) => {
    try {
      const data = await apiPost('/api/hq/assets?action=dispose', formData);
      if (data.success) {
        setShowDisposeModal(false);
        setDisposingAsset(null);
        fetchAssets();
        fetchDashboard();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Hapus aset ini? Data tidak bisa dikembalikan.')) return;
    try {
      const res = await fetch(`/api/hq/assets?action=asset&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { fetchAssets(); fetchDashboard(); }
      else alert(data.error || 'Gagal menghapus');
    } catch (e) { console.error(e); }
  };

  const calculateAllDepr = async () => {
    try {
      const data = await apiPost('/api/hq/assets/depreciation?action=calculate-all', {});
      alert(data.message || 'Selesai');
      fetchDepreciation();
    } catch (e) { console.error(e); }
  };

  const postDepr = async () => {
    try {
      const data = await apiPost('/api/hq/assets/depreciation?action=post', {});
      alert(data.message || 'Selesai');
      fetchDepreciation();
    } catch (e) { console.error(e); }
  };

  if (status === 'loading') return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (status === 'unauthenticated') { router.push('/auth/login'); return null; }

  const formatCurrency = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

  return (
    <HQLayout title={t('assets.title')} noPadding>
    <ModuleGuard moduleCode="asset_management">
      <AssetManagementContent
        activeTab={activeTab} setActiveTab={setActiveTab} loading={loading}
        dashboardData={dashboardData} assets={assets} totalAssets={totalAssets}
        searchTerm={searchTerm} filterStatus={filterStatus} filterCategory={filterCategory}
        currentPage={currentPage} categories={categories} selectedAsset={selectedAsset}
        showDetailModal={showDetailModal} showCreateModal={showCreateModal}
        editingAsset={editingAsset} movements={movements} deprSummary={deprSummary}
        maintenanceSchedules={maintenanceSchedules} workOrders={workOrders}
        licenses={licenses} tenancies={tenancies} alerts={alerts} settings={settings}
        showDisposeModal={showDisposeModal} disposingAsset={disposingAsset}
        formatCurrency={formatCurrency} formatDate={formatDate}
        onSearch={(v: string) => { setSearchTerm(v); setCurrentPage(1); setTimeout(fetchAssets, 300); }}
        onFilterStatus={(v: string) => { setFilterStatus(v); setCurrentPage(1); }}
        onFilterCategory={(v: string) => { setFilterCategory(v); setCurrentPage(1); }}
        onPageChange={setCurrentPage}
        onView={viewAssetDetail}
        onEdit={(a: any) => { setEditingAsset(a); fetchCategories(); setShowCreateModal(true); }}
        onDispose={(a: any) => { setDisposingAsset(a); setShowDisposeModal(true); }}
        onDelete={handleDeleteAsset}
        onCreateNew={() => { setEditingAsset(null); fetchCategories(); setShowCreateModal(true); }}
        onCloseDetail={() => setShowDetailModal(false)}
        onCloseCreate={() => { setShowCreateModal(false); setEditingAsset(null); }}
        onSaveAsset={handleCreateAsset}
        onCloseDispose={() => { setShowDisposeModal(false); setDisposingAsset(null); }}
        onConfirmDispose={handleDispose}
        onCalculateDepr={calculateAllDepr}
        onPostDepr={postDepr}
        fetchCategories={fetchCategories}
        apiPost={apiPost}
        fetchAlerts={fetchAlerts}
        fetchSettings={fetchSettings}
        fetchMovements={fetchMovements}
        router={router}
      />
    </ModuleGuard>
    </HQLayout>
  );
}

// Extracted content component to keep ModuleGuard wrapper clean
function AssetManagementContent(props: any) {
  const { t } = useTranslation();
  const {
    activeTab, setActiveTab, loading, dashboardData, assets, totalAssets,
    searchTerm, filterStatus, filterCategory, currentPage, categories,
    selectedAsset, showDetailModal, showCreateModal, editingAsset,
    movements, deprSummary, maintenanceSchedules, workOrders,
    licenses, tenancies, alerts, settings,
    showDisposeModal, disposingAsset, formatCurrency, formatDate,
    onSearch, onFilterStatus, onFilterCategory, onPageChange,
    onView, onEdit, onDispose, onDelete, onCreateNew,
    onCloseDetail, onCloseCreate, onSaveAsset,
    onCloseDispose, onConfirmDispose,
    onCalculateDepr, onPostDepr, fetchCategories, apiPost, fetchAlerts, fetchSettings, fetchMovements, router
  } = props;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700',
    in_use: 'bg-blue-100 text-blue-700', maintenance: 'bg-yellow-100 text-yellow-700',
    disposed: 'bg-red-100 text-red-700', inactive: 'bg-gray-200 text-gray-600',
  };

  const conditionColors: Record<string, string> = {
    excellent: 'text-green-600', good: 'text-blue-600', fair: 'text-yellow-600',
    poor: 'text-orange-600', broken: 'text-red-600',
  };

  const tabs = [
    { id: 'dashboard', label: t('assets.tabDashboard'), icon: BarChart3 },
    { id: 'registry', label: t('assets.tabRegistry'), icon: Package },
    { id: 'categories', label: t('assets.tabCategories'), icon: Layers },
    { id: 'movements', label: t('assets.tabMovements'), icon: ArrowRightLeft },
    { id: 'depreciation', label: t('assets.tabDepreciation'), icon: TrendingDown },
    { id: 'maintenance', label: t('assets.tabMaintenance'), icon: Wrench },
    { id: 'licenses', label: t('assets.tabLicenses'), icon: Key },
    { id: 'tenancy', label: t('assets.tabTenancy'), icon: Home },
    { id: 'alerts', label: t('assets.tabAlerts'), icon: AlertCircle },
    { id: 'settings', label: t('assets.tabSettings'), icon: Settings },
  ];

  return (
    <>
      <Head><title>{t('assets.title')} - Bedagang</title></Head>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('assets.title')}</h1>
              <p className="text-xs text-gray-500">{t('assets.subtitle')}</p>
            </div>
          </div>
          <button onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
            <Plus className="w-4 h-4" /> {t('assets.addAsset')}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border">
          <div className="flex gap-1 overflow-x-auto px-4 scrollbar-hide">
            {tabs.map(tb => (
              <button key={tb.id} onClick={() => { setActiveTab(tb.id); router.push(`/hq/assets?tab=${tb.id}`, undefined, { shallow: true }); }}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition font-medium ${
                  activeTab === tb.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <tb.icon className="w-4 h-4" /> {tb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'dashboard' && <DashboardTab data={dashboardData} loading={loading} formatCurrency={formatCurrency} />}
          {activeTab === 'registry' && (
            <RegistryTab
              assets={assets} total={totalAssets} loading={loading} page={currentPage}
              searchTerm={searchTerm} filterStatus={filterStatus} filterCategory={filterCategory}
              categories={categories} statusColors={statusColors}
              onSearch={onSearch}
              onFilterStatus={onFilterStatus}
              onFilterCategory={onFilterCategory}
              onPageChange={onPageChange}
              onView={onView}
              onEdit={onEdit}
              onDispose={onDispose}
              onDelete={onDelete}
              formatCurrency={formatCurrency} formatDate={formatDate}
              fetchCategories={fetchCategories}
            />
          )}
          {activeTab === 'categories' && <CategoriesTab categories={categories} fetchCategories={fetchCategories} apiPost={apiPost} />}
          {activeTab === 'movements' && <MovementsTab movements={movements} statusColors={statusColors} formatDate={formatDate} apiPost={apiPost} fetchMovements={fetchMovements} assets={assets} />}
          {activeTab === 'depreciation' && (
            <DepreciationTab summary={deprSummary} loading={loading}
              formatCurrency={formatCurrency} onCalculateAll={onCalculateDepr} onPostAll={onPostDepr} />
          )}
          {activeTab === 'maintenance' && (
            <MaintenanceTab schedules={maintenanceSchedules} workOrders={workOrders}
              formatCurrency={formatCurrency} formatDate={formatDate} />
          )}
          {activeTab === 'licenses' && <LicensesTab licenses={licenses} formatCurrency={formatCurrency} formatDate={formatDate} />}
          {activeTab === 'tenancy' && <TenancyTab tenancies={tenancies} formatCurrency={formatCurrency} formatDate={formatDate} />}
          {activeTab === 'alerts' && <AlertsTab alerts={alerts} formatDate={formatDate} apiPost={apiPost} fetchAlerts={fetchAlerts} />}
          {activeTab === 'settings' && <SettingsTab settings={settings} apiPost={apiPost} fetchSettings={fetchSettings} />}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedAsset && (
          <AssetDetailModal asset={selectedAsset} onClose={onCloseDetail}
            formatCurrency={formatCurrency} formatDate={formatDate} statusColors={statusColors} conditionColors={conditionColors} />
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <AssetFormModal asset={editingAsset} categories={categories}
            onClose={onCloseCreate}
            onSave={onSaveAsset} />
        )}

        {/* Dispose Modal */}
        {showDisposeModal && disposingAsset && (
          <DisposeModal asset={disposingAsset} onClose={onCloseDispose}
            onConfirm={onConfirmDispose} formatCurrency={formatCurrency} />
        )}
      </div>
    </>
  );
}

// Module-level constants for use across sub-components
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700',
  in_use: 'bg-blue-100 text-blue-700', maintenance: 'bg-yellow-100 text-yellow-700',
  disposed: 'bg-red-100 text-red-700', inactive: 'bg-gray-200 text-gray-600',
};

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ data, loading, formatCurrency }: any) {
  if (loading || !data) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />)}</div>
    </div>
  );

  const s = data.stats || {};
  const dh = data.depreciationHealth || {};
  const ms = data.maintenanceSummary || {};
  const totalActive = parseInt(s.total_assets || 0) - parseInt(s.disposed_count || 0);
  const deprPct = parseFloat(dh.total_depreciable_base) > 0
    ? Math.round((parseFloat(dh.total_accumulated) / parseFloat(dh.total_depreciable_base)) * 100)
    : 0;

  const STATUS_BAR_COLORS: Record<string, string> = {
    active: 'bg-green-500', in_use: 'bg-blue-500', maintenance: 'bg-yellow-500',
    draft: 'bg-gray-400', disposed: 'bg-red-500', inactive: 'bg-gray-300',
  };
  const CONDITION_COLORS: Record<string, string> = {
    excellent: 'text-emerald-600 bg-emerald-50', good: 'text-green-600 bg-green-50',
    fair: 'text-yellow-600 bg-yellow-50', poor: 'text-orange-600 bg-orange-50',
    broken: 'text-red-600 bg-red-50',
  };

  return (
    <div className="space-y-6">
      {/* ── Row 1: KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Aset', value: s.total_assets || 0, sub: `${s.category_count || 0} kategori`, icon: Package, color: 'from-blue-500 to-blue-600' },
          { label: 'Aset Aktif', value: totalActive, sub: `${s.disposed_count || 0} dilepas`, icon: CheckCircle, color: 'from-green-500 to-green-600' },
          { label: 'Dalam Maintenance', value: parseInt(ms.overdue || 0) + parseInt(ms.upcoming || 0), sub: `${ms.overdue || 0} terlambat`, icon: Wrench, color: parseInt(ms.overdue || 0) > 0 ? 'from-red-500 to-red-600' : 'from-yellow-500 to-yellow-600' },
          { label: 'Alert Aktif', value: (data.alerts || []).length, sub: `${s.warranty_expiring || 0} garansi kedaluwarsa`, icon: AlertTriangle, color: (data.alerts || []).length > 0 ? 'from-orange-500 to-orange-600' : 'from-gray-400 to-gray-500' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <div className={`w-10 h-10 bg-gradient-to-br ${c.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Financial Overview ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Nilai Perolehan</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(s.total_acquisition_value)}</p>
          <p className="text-xs text-gray-400 mt-1">Total harga beli seluruh aset</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Nilai Buku Saat Ini</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(s.total_book_value)}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${parseFloat(s.total_acquisition_value) > 0 ? Math.round((parseFloat(s.total_book_value) / parseFloat(s.total_acquisition_value)) * 100) : 0}%` }} />
            </div>
            <span className="text-xs text-gray-500">{parseFloat(s.total_acquisition_value) > 0 ? Math.round((parseFloat(s.total_book_value) / parseFloat(s.total_acquisition_value)) * 100) : 0}%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Total Penyusutan</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(s.total_depreciation)}</p>
          <p className="text-xs text-gray-400 mt-1">Akumulasi seluruh periode</p>
        </div>
      </div>

      {/* ── Row 3: Depreciation Health + Maintenance + Condition ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Depreciation Health */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Kesehatan Penyusutan
          </h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray={`${deprPct}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{deprPct}%</span>
                <span className="text-[10px] text-gray-400">terserap</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 rounded-lg px-2.5 py-2 text-center">
              <p className="font-bold text-green-700">{dh.fully_depreciated || 0}</p>
              <p className="text-green-600">Sudah Penuh</p>
            </div>
            <div className="bg-blue-50 rounded-lg px-2.5 py-2 text-center">
              <p className="font-bold text-blue-700">{dh.partially_depreciated || 0}</p>
              <p className="text-blue-600">Sedang Berjalan</p>
            </div>
            <div className="bg-yellow-50 rounded-lg px-2.5 py-2 text-center">
              <p className="font-bold text-yellow-700">{dh.not_started || 0}</p>
              <p className="text-yellow-600">Belum Mulai</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-center">
              <p className="font-bold text-gray-700">{dh.non_depreciable || 0}</p>
              <p className="text-gray-500">Non-Penyusutan</p>
            </div>
          </div>
        </div>

        {/* Maintenance Overview */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-yellow-500" /> Ringkasan Pemeliharaan
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Pemeliharaan Terlambat', value: ms.overdue || 0, color: parseInt(ms.overdue || 0) > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50', icon: AlertCircle },
              { label: 'Jadwal 30 Hari Kedepan', value: ms.upcoming || 0, color: 'text-yellow-600 bg-yellow-50', icon: Calendar },
              { label: 'Perintah Kerja Terbuka', value: ms.open_wo || 0, color: 'text-blue-600 bg-blue-50', icon: ClipboardList },
              { label: 'Perintah Kerja Berjalan', value: ms.in_progress_wo || 0, color: 'text-indigo-600 bg-indigo-50', icon: Activity },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span>{s.warranty_expiring || 0} garansi segera habis · {s.warranty_expired || 0} sudah kedaluwarsa</span>
            </div>
          </div>
        </div>

        {/* Condition Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-500" /> Kondisi Aset
          </h3>
          {(data.conditionBreakdown || []).length > 0 ? (
            <div className="space-y-2.5">
              {data.conditionBreakdown.map((c: any, i: number) => {
                const pct = totalActive > 0 ? Math.round((parseInt(c.count) / totalActive) * 100) : 0;
                const colors = CONDITION_COLORS[c.condition] || 'text-gray-600 bg-gray-50';
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${colors}`}>{c.condition || 'N/A'}</span>
                      <span className="text-xs text-gray-500">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${c.condition === 'excellent' ? 'bg-emerald-500' : c.condition === 'good' ? 'bg-green-500' : c.condition === 'fair' ? 'bg-yellow-500' : c.condition === 'poor' ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data kondisi</p>
          )}
        </div>
      </div>

      {/* ── Row 4: Status + Category + Department ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Status Aset</h3>
          <div className="space-y-2.5">
            {(data.statusBreakdown || []).map((st: any, i: number) => {
              const total = parseInt(s.total_assets) || 1;
              const pct = Math.round((parseInt(st.count) / total) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_BAR_COLORS[st.status] || 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-700 capitalize">{st.status}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{st.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${STATUS_BAR_COLORS[st.status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Distribusi per Kategori</h3>
          <div className="space-y-2.5">
            {(data.categoryBreakdown || []).filter((c: any) => parseInt(c.count) > 0).slice(0, 6).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-700 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{c.count}</span>
                  <span className="text-xs font-medium text-gray-900 w-24 text-right">{formatCurrency(c.total_value)}</span>
                </div>
              </div>
            ))}
            {(!data.categoryBreakdown || data.categoryBreakdown.filter((c: any) => parseInt(c.count) > 0).length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" /> Distribusi per Departemen
          </h3>
          <div className="space-y-2.5">
            {(data.departmentBreakdown || []).slice(0, 6).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">{d.department}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{d.count} aset</span>
                  <span className="text-xs font-medium text-gray-900 w-24 text-right">{formatCurrency(d.total_value)}</span>
                </div>
              </div>
            ))}
            {(!data.departmentBreakdown || data.departmentBreakdown.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 5: Top Value Assets + Monthly Trend ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Value Assets */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" /> Aset Bernilai Tertinggi
          </h3>
          <div className="space-y-3">
            {(data.topValueAssets || []).map((a: any, i: number) => {
              const bookPct = parseFloat(a.purchase_price) > 0
                ? Math.round((parseFloat(a.current_book_value) / parseFloat(a.purchase_price)) * 100) : 0;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">{formatCurrency(a.purchase_price)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{a.asset_code}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{a.category_name || '-'}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">Buku: {bookPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!data.topValueAssets || data.topValueAssets.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Monthly Acquisition Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Tren Akuisisi Aset (12 Bulan)
          </h3>
          {(data.monthlyTrend || []).length > 0 ? (
            <div className="space-y-1">
              {(() => {
                const trend = data.monthlyTrend || [];
                const maxVal = Math.max(...trend.map((t: any) => parseFloat(t.total_value) || 0), 1);
                return trend.map((t: any, i: number) => {
                  const pct = Math.round((parseFloat(t.total_value) / maxVal) * 100);
                  const monthLabel = t.month ? new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) : t.month;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 flex-shrink-0">{monthLabel}</span>
                      <div className="flex-1 bg-gray-50 rounded-full h-5 relative overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all flex items-center" style={{ width: `${Math.max(pct, 2)}%` }}>
                          {pct > 30 && <span className="text-[10px] text-white font-medium ml-2">{formatCurrency(t.total_value)}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-6 text-right flex-shrink-0">{t.count}</span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada data akuisisi 12 bulan terakhir</p>
          )}
        </div>
      </div>

      {/* ── Row 6: Recent Assets Table ───────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" /> Aset Terbaru Didaftarkan
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2.5 font-medium text-xs">KODE</th>
              <th className="pb-2.5 font-medium text-xs">NAMA ASET</th>
              <th className="pb-2.5 font-medium text-xs">KATEGORI</th>
              <th className="pb-2.5 font-medium text-xs">STATUS</th>
              <th className="pb-2.5 font-medium text-xs">PENGGUNA</th>
              <th className="pb-2.5 font-medium text-xs">LOKASI</th>
              <th className="pb-2.5 font-medium text-xs text-right">NILAI PEROLEHAN</th>
              <th className="pb-2.5 font-medium text-xs text-right">NILAI BUKU</th>
            </tr></thead>
            <tbody>
              {(data.recentAssets || []).slice(0, 8).map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50/50 transition">
                  <td className="py-2.5 font-mono text-xs text-indigo-600 font-medium">{a.asset_code}</td>
                  <td className="py-2.5 font-medium text-gray-900">{a.name}</td>
                  <td className="py-2.5 text-gray-500 text-xs">{a.category_name || '-'}</td>
                  <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span></td>
                  <td className="py-2.5 text-gray-500 text-xs">{a.custodian_name || '-'}</td>
                  <td className="py-2.5 text-gray-500 text-xs">{a.department || a.location || '-'}</td>
                  <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrency(a.purchase_price)}</td>
                  <td className="py-2.5 text-right text-gray-500">{formatCurrency(a.current_book_value)}</td>
                </tr>
              ))}
              {(!data.recentAssets || data.recentAssets.length === 0) && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-400">Belum ada aset terdaftar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 7: Active Alerts ─────────────────────────────────── */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" /> Alert Aktif ({data.alerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.alerts.map((a: any) => (
              <div key={a.id} className={`p-3 rounded-lg border-l-4 ${
                a.severity === 'critical' ? 'border-red-500 bg-red-50' :
                a.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                a.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    a.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    a.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>{a.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// REGISTRY TAB
// ============================================================
function RegistryTab({ assets, total, loading, page, searchTerm, filterStatus, filterCategory,
  categories, statusColors, onSearch, onFilterStatus, onFilterCategory, onPageChange,
  onView, onEdit, onDispose, onDelete, formatCurrency, formatDate, fetchCategories }: any) {

  useEffect(() => { fetchCategories(); }, []);
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari nama, kode, serial number..." value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <select value={filterStatus} onChange={(e) => onFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Semua Status</option>
          <option value="draft">Draft</option><option value="active">Aktif</option>
          <option value="in_use">Digunakan</option><option value="maintenance">Pemeliharaan</option>
          <option value="disposed">Dilepas</option>
        </select>
        <select value={filterCategory} onChange={(e) => onFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Semua Kategori</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} aset ditemukan</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-600 text-xs uppercase">
              <th className="px-4 py-3 font-medium">Kode Aset</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kondisi</th>
              <th className="px-4 py-3 font-medium">Lokasi</th>
              <th className="px-4 py-3 font-medium">Penanggung Jawab</th>
              <th className="px-4 py-3 font-medium text-right">Nilai Perolehan</th>
              <th className="px-4 py-3 font-medium text-right">Nilai Buku</th>
              <th className="px-4 py-3 font-medium text-center">Aksi</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Memuat...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada aset</td></tr>
              ) : assets.map((a: Asset) => (
                <tr key={a.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-medium">{a.asset_code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.name}</div>
                    {a.serial_number && <div className="text-xs text-gray-400">SN: {a.serial_number}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.category_name || '-'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100'}`}>{a.status}</span></td>
                  <td className="px-4 py-3 capitalize text-gray-600">{a.condition}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.department || a.location || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{a.custodian_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.current_book_value)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onView(a.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Detail"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                      {a.status !== 'disposed' && (
                        <button onClick={() => onDispose(a)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Dispose"><Trash2 className="w-4 h-4" /></button>
                      )}
                      {a.status === 'draft' && (
                        <button onClick={() => onDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus"><XCircle className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">Sebelumnya</button>
              <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">Selanjutnya</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CATEGORIES TAB
// ============================================================
function CategoriesTab({ categories, fetchCategories, apiPost }: any) {
  useEffect(() => { fetchCategories(); }, []);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', depreciationMethod: 'straight_line', defaultUsefulLife: 60, defaultSalvagePct: 0, industryPack: '', isActive: true });

  const openNew = () => { setEditCat(null); setForm({ name: '', code: '', description: '', depreciationMethod: 'straight_line', defaultUsefulLife: 60, defaultSalvagePct: 0, industryPack: '', isActive: true }); setShowForm(true); };
  const openEdit = (c: any) => { setEditCat(c); setForm({ name: c.name, code: c.code, description: c.description || '', depreciationMethod: c.depreciation_method || 'straight_line', defaultUsefulLife: c.default_useful_life || 60, defaultSalvagePct: c.default_salvage_pct || 0, industryPack: c.industry_pack || '', isActive: c.is_active !== false }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) return alert('Nama dan Kode wajib diisi');
    const payload = { ...form, id: editCat?.id || undefined };
    const data = await apiPost('/api/hq/assets?action=category', payload);
    if (data.success) { setShowForm(false); fetchCategories(); }
    else alert(data.error || 'Gagal menyimpan');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    const res = await fetch(`/api/hq/assets?action=category&id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchCategories();
    else alert(data.error || 'Gagal menghapus');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Kategori Aset</h2>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium">
          <Plus className="w-4 h-4" /> Tambah Kategori
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c: any) => (
          <div key={c.id} className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{c.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-indigo-600 mr-1">{c.asset_count || 0}</span>
                <button onClick={() => openEdit(c)} className="p-1 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                {c.depreciation_method === 'none' ? 'Tidak disusutkan' : c.depreciation_method?.replace('_', ' ')}
              </span>
              {c.default_useful_life > 0 && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 rounded text-blue-600">
                  {Math.round(c.default_useful_life / 12)} tahun
                </span>
              )}
              {c.industry_pack && (
                <span className="text-xs px-2 py-0.5 bg-purple-50 rounded text-purple-600 capitalize">
                  {c.industry_pack.replace('_', ' ')}
                </span>
              )}
            </div>
            {c.description && <p className="text-xs text-gray-500 mt-2">{c.description}</p>}
          </div>
        ))}
        {categories.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">Belum ada kategori</p>}
      </div>

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editCat ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Kendaraan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="e.g. VHC" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Penyusutan</label>
                  <select value={form.depreciationMethod} onChange={e => setForm({ ...form, depreciationMethod: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="straight_line">Garis Lurus</option>
                    <option value="double_declining">Saldo Menurun Ganda</option>
                    <option value="sum_of_years">Jumlah Angka Tahun</option>
                    <option value="none">Tidak Disusutkan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Umur Ekonomis (bulan)</label>
                  <input type="number" value={form.defaultUsefulLife} onChange={e => setForm({ ...form, defaultUsefulLife: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Nilai Sisa</label>
                  <input type="number" value={form.defaultSalvagePct} onChange={e => setForm({ ...form, defaultSalvagePct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min="0" max="100" step="0.1" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                {editCat ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MOVEMENTS TAB
// ============================================================
function MovementsTab({ movements, statusColors, formatDate, apiPost, fetchMovements, assets }: any) {
  const movStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assetId: '', movementType: 'transfer', toDepartment: '', toLocation: '', toCustodianName: '', reason: '', movementDate: new Date().toISOString().split('T')[0] });

  const handleCreate = async () => {
    if (!form.assetId) return alert('Pilih aset yang akan dimutasi');
    const data = await apiPost('/api/hq/assets?action=movement', form);
    if (data.success) { setShowForm(false); fetchMovements(); setForm({ assetId: '', movementType: 'transfer', toDepartment: '', toLocation: '', toCustodianName: '', reason: '', movementDate: new Date().toISOString().split('T')[0] }); }
    else alert(data.error || 'Gagal membuat mutasi');
  };

  const handleApprove = async (id: string) => {
    const data = await apiPost('/api/hq/assets?action=movement-approve', { id });
    if (data.success) fetchMovements();
  };

  const handleReceive = async (id: string) => {
    const data = await apiPost('/api/hq/assets?action=movement-receive', { id });
    if (data.success) fetchMovements();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Mutasi & Transfer Aset</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium">
          <Plus className="w-4 h-4" /> Buat Mutasi
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-gray-600 text-xs uppercase">
            <th className="px-4 py-3 font-medium">No. Referensi</th>
            <th className="px-4 py-3 font-medium">Aset</th>
            <th className="px-4 py-3 font-medium">Tipe</th>
            <th className="px-4 py-3 font-medium">Dari</th>
            <th className="px-4 py-3 font-medium">Ke</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium text-center">Aksi</th>
          </tr></thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data mutasi</td></tr>
            ) : movements.map((m: any) => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-indigo-600">{m.reference_number}</td>
                <td className="px-4 py-3 font-medium">{m.asset_name}<br /><span className="text-xs text-gray-400">{m.asset_code}</span></td>
                <td className="px-4 py-3 capitalize text-xs">{m.movement_type}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.from_department || m.from_location || '-'}<br />{m.from_custodian_name || ''}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.to_department || m.to_location || '-'}<br />{m.to_custodian_name || ''}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${movStatusColors[m.status] || 'bg-gray-100'}`}>{m.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(m.movement_date)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {m.status === 'pending' && (
                      <button onClick={() => handleApprove(m.id)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium">Setujui</button>
                    )}
                    {m.status === 'approved' && (
                      <button onClick={() => handleReceive(m.id)} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium">Terima</button>
                    )}
                    {(m.status === 'received' || m.status === 'rejected') && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Movement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Buat Mutasi / Transfer Aset</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Aset *</label>
                <select value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">-- Pilih Aset --</option>
                  {(assets || []).filter((a: any) => a.status !== 'disposed').map((a: any) => (
                    <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Mutasi</label>
                  <select value={form.movementType} onChange={e => setForm({ ...form, movementType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="transfer">Transfer</option>
                    <option value="relocation">Relokasi</option>
                    <option value="loan">Pinjaman</option>
                    <option value="return">Pengembalian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input type="date" value={form.movementDate} onChange={e => setForm({ ...form, movementDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ke Departemen</label>
                  <input type="text" value={form.toDepartment} onChange={e => setForm({ ...form, toDepartment: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Dept. tujuan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ke Lokasi</label>
                  <input type="text" value={form.toLocation} onChange={e => setForm({ ...form, toLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Lokasi tujuan" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penerima</label>
                <input type="text" value={form.toCustodianName} onChange={e => setForm({ ...form, toCustodianName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama penerima" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Alasan mutasi" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={handleCreate} className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Buat Mutasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEPRECIATION TAB
// ============================================================
function DepreciationTab({ summary, loading, formatCurrency, onCalculateAll, onPostAll }: any) {
  if (loading || !summary) return <div className="h-48 bg-white rounded-xl animate-pulse" />;

  const s = summary.summary || {};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Penyusutan Aset</h2>
        <div className="flex gap-2">
          <button onClick={onCalculateAll} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Hitung Penyusutan Bulan Ini
          </button>
          <button onClick={onPostAll} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Posting ke Jurnal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aset Disusutkan', value: s.total_depreciable_assets || 0, color: 'text-indigo-600' },
          { label: 'Total Nilai Perolehan', value: formatCurrency(s.total_cost), color: 'text-blue-600' },
          { label: 'Akumulasi Penyusutan', value: formatCurrency(s.total_accumulated), color: 'text-orange-600' },
          { label: 'Total Nilai Buku', value: formatCurrency(s.total_book_value), color: 'text-green-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* By Method */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-4">Per Metode Penyusutan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(summary.byMethod || []).map((m: any, i: number) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium capitalize">{m.depreciation_method?.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{m.count}</p>
              <p className="text-xs text-gray-500">Akumulasi: {formatCurrency(m.total_accumulated)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      {summary.monthlyTrend && summary.monthlyTrend.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Tren Penyusutan Bulanan</h3>
          <div className="space-y-2">
            {summary.monthlyTrend.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-20 font-mono">{m.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div className="bg-indigo-500 h-4 rounded-full" style={{
                    width: `${Math.min(100, (parseFloat(m.total_depreciation) / Math.max(...summary.monthlyTrend.map((t: any) => parseFloat(t.total_depreciation)))) * 100)}%`
                  }} />
                </div>
                <span className="text-sm font-medium w-36 text-right">{formatCurrency(m.total_depreciation)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.fullyDepreciatedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800"><strong>{summary.fullyDepreciatedCount}</strong> aset telah mencapai nilai sisa (penyusutan penuh)</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAINTENANCE TAB
// ============================================================
function MaintenanceTab({ schedules, workOrders, formatCurrency, formatDate }: any) {
  const [subTab, setSubTab] = useState<'schedules' | 'work-orders'>('schedules');
  const woStatusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pemeliharaan Preventif</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setSubTab('schedules')}
            className={`px-3 py-1.5 text-sm rounded-md ${subTab === 'schedules' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
            Jadwal Servis
          </button>
          <button onClick={() => setSubTab('work-orders')}
            className={`px-3 py-1.5 text-sm rounded-md ${subTab === 'work-orders' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>
            Perintah Kerja
          </button>
        </div>
      </div>

      {subTab === 'schedules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{s.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{s.asset_name} ({s.asset_code})</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipe:</span> <span className="font-medium capitalize">{s.schedule_type}</span></div>
                <div><span className="text-gray-500">Frekuensi:</span> <span className="font-medium capitalize">{s.frequency || '-'}</span></div>
                <div><span className="text-gray-500">Jadwal Berikutnya:</span> <span className="font-medium">{formatDate(s.next_due_date)}</span></div>
                <div><span className="text-gray-500">Prioritas:</span> <span className="font-medium capitalize">{s.priority}</span></div>
                {s.hour_meter_interval && <div className="col-span-2"><span className="text-gray-500">Interval HM:</span> <span className="font-medium">{s.hour_meter_interval} jam</span></div>}
              </div>
              {s.estimated_cost && <p className="text-xs text-gray-500 mt-2">Est. biaya: {formatCurrency(s.estimated_cost)}</p>}
            </div>
          ))}
          {schedules.length === 0 && <p className="text-gray-400 text-sm col-span-2 text-center py-8">Belum ada jadwal pemeliharaan</p>}
        </div>
      )}

      {subTab === 'work-orders' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-600 text-xs uppercase">
              <th className="px-4 py-3">No. WO</th><th className="px-4 py-3">Aset</th>
              <th className="px-4 py-3">Judul</th><th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Prioritas</th>
              <th className="px-4 py-3 text-right">Biaya</th>
            </tr></thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada perintah kerja</td></tr>
              ) : workOrders.map((wo: any) => (
                <tr key={wo.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{wo.wo_number}</td>
                  <td className="px-4 py-3 text-xs">{wo.asset_name}</td>
                  <td className="px-4 py-3 font-medium">{wo.title}</td>
                  <td className="px-4 py-3 capitalize text-xs">{wo.wo_type}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${woStatusColors[wo.status] || 'bg-gray-100'}`}>{wo.status}</span></td>
                  <td className="px-4 py-3 capitalize text-xs">{wo.priority}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(wo.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LICENSES TAB
// ============================================================
function LicensesTab({ licenses, formatCurrency, formatDate }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Manajemen Lisensi Perangkat Lunak</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {licenses.map((l: any) => {
          const daysToExpiry = l.expiry_date ? Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000*60*60*24)) : null;
          const isExpiring = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
          const isExpired = daysToExpiry !== null && daysToExpiry < 0;

          return (
            <div key={l.id} className={`bg-white rounded-xl p-5 shadow-sm border ${isExpired ? 'border-red-300' : isExpiring ? 'border-amber-300' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{l.license_name}</h4>
                    <p className="text-xs text-gray-500">{l.vendor || '-'}</p>
                  </div>
                </div>
                {isExpired ? <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Kedaluwarsa</span> :
                 isExpiring ? <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{daysToExpiry} hari lagi</span> :
                 <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full capitalize">{l.status}</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipe:</span> <span className="font-medium capitalize">{l.license_type}</span></div>
                <div><span className="text-gray-500">Versi:</span> <span className="font-medium">{l.version || '-'}</span></div>
                <div><span className="text-gray-500">Kursi:</span> <span className="font-medium">{l.used_seats}/{l.total_seats}</span></div>
                <div><span className="text-gray-500">Kedaluwarsa:</span> <span className="font-medium">{formatDate(l.expiry_date)}</span></div>
              </div>
              {l.purchase_cost && <p className="text-xs text-gray-500 mt-2">Biaya: {formatCurrency(l.purchase_cost)}</p>}
            </div>
          );
        })}
        {licenses.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">Belum ada lisensi</p>}
      </div>
    </div>
  );
}

// ============================================================
// TENANCY TAB
// ============================================================
function TenancyTab({ tenancies, formatCurrency, formatDate }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Manajemen Penyewaan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenancies.map((t: any) => (
          <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{t.tenant_name}</h4>
                <p className="text-xs text-gray-500">{t.asset_name} ({t.asset_code})</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>{t.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Perusahaan:</span> <span className="font-medium">{t.tenant_company || '-'}</span></div>
              <div><span className="text-gray-500">No. Sewa:</span> <span className="font-medium">{t.lease_number || '-'}</span></div>
              <div><span className="text-gray-500">Periode:</span> <span className="font-medium">{formatDate(t.lease_start)} - {formatDate(t.lease_end)}</span></div>
              <div><span className="text-gray-500">Sewa/bulan:</span> <span className="font-medium">{formatCurrency(t.monthly_rent)}</span></div>
              <div><span className="text-gray-500">Deposit:</span> <span className="font-medium">{formatCurrency(t.deposit_amount)}</span></div>
              <div><span className="text-gray-500">Luas:</span> <span className="font-medium">{t.unit_size_sqm ? `${t.unit_size_sqm} m²` : '-'}</span></div>
            </div>
          </div>
        ))}
        {tenancies.length === 0 && <p className="text-gray-400 text-sm col-span-2 text-center py-8">Belum ada data penyewaan</p>}
      </div>
    </div>
  );
}

// ============================================================
// ALERTS TAB
// ============================================================
function AlertsTab({ alerts, formatDate, apiPost, fetchAlerts }: any) {
  const severityColors: Record<string, string> = {
    critical: 'border-red-500 bg-red-50', high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50', low: 'border-blue-500 bg-blue-50', info: 'border-gray-300 bg-gray-50',
  };

  const handleAcknowledge = async (id: string, resolve = false) => {
    const data = await apiPost('/api/hq/assets?action=alert-acknowledge', { id, resolve });
    if (data.success) fetchAlerts();
  };

  const activeAlerts = alerts.filter((a: any) => a.status === 'active' || !a.status);
  const acknowledgedAlerts = alerts.filter((a: any) => a.status === 'acknowledged');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Alert & Notifikasi</h2>
        <span className="text-sm text-gray-500">{activeAlerts.length} alert aktif</span>
      </div>

      {activeAlerts.length === 0 && acknowledgedAlerts.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada alert aktif</p>
          <p className="text-xs text-gray-400 mt-1">Semua aset dalam kondisi baik</p>
        </div>
      )}

      <div className="space-y-3">
        {activeAlerts.map((a: any) => (
          <div key={a.id} className={`p-4 rounded-xl border-l-4 bg-white shadow-sm ${severityColors[a.severity] || 'border-gray-300 bg-gray-50'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    a.severity === 'critical' ? 'bg-red-200 text-red-800' : a.severity === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>{a.severity}</span>
                  <span className="text-xs text-gray-400 capitalize">{a.alert_type?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                </div>
                <h4 className="font-medium text-gray-900 mt-1.5">{a.title}</h4>
                {a.message && <p className="text-sm text-gray-600 mt-1">{a.message}</p>}
                {a.asset_name && <p className="text-xs text-gray-400 mt-1.5">Aset: <span className="font-medium text-gray-600">{a.asset_name}</span> ({a.asset_code})</p>}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => handleAcknowledge(a.id, false)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                  Terima
                </button>
                <button onClick={() => handleAcknowledge(a.id, true)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                  Selesaikan
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {acknowledgedAlerts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Sudah Diterima ({acknowledgedAlerts.length})</h3>
          <div className="space-y-2">
            {acknowledgedAlerts.map((a: any) => (
              <div key={a.id} className="p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.alert_type?.replace(/_/g, ' ')} • {formatDate(a.created_at)}</p>
                </div>
                <button onClick={() => handleAcknowledge(a.id, true)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                  Selesaikan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ settings, apiPost, fetchSettings }: any) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>({});

  const startEdit = (key: string, value: any) => {
    setEditingKey(key);
    setEditValue(typeof value === 'object' ? { ...value } : value);
  };

  const handleSave = async () => {
    if (!editingKey) return;
    const data = await apiPost('/api/hq/assets?action=settings', { key: editingKey, value: editValue });
    if (data.success) { setEditingKey(null); fetchSettings(); }
    else alert(data.error || 'Gagal menyimpan');
  };

  const toggleValue = (k: string) => {
    setEditValue((prev: any) => ({ ...prev, [k]: !prev[k] }));
  };

  const updateSubValue = (k: string, v: any) => {
    setEditValue((prev: any) => ({ ...prev, [k]: v }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pengaturan Modul Aset</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(settings).map(([key, value]: [string, any]) => {
          const isEditing = editingKey === key;
          return (
            <div key={key} className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h3>
                {!isEditing ? (
                  <button onClick={() => startEdit(key, value)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingKey(null)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
                    <button onClick={handleSave} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg font-medium">Simpan</button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {typeof value === 'object' ? Object.entries(isEditing ? editValue : value).map(([k, v]: [string, any]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                    {isEditing ? (
                      typeof v === 'boolean' ? (
                        <button onClick={() => toggleValue(k)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${editValue[k] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {editValue[k] ? 'Aktif' : 'Nonaktif'}
                        </button>
                      ) : typeof v === 'number' ? (
                        <input type="number" value={editValue[k]} onChange={e => updateSubValue(k, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border rounded text-sm text-right" />
                      ) : (
                        <input type="text" value={editValue[k] || ''} onChange={e => updateSubValue(k, e.target.value)}
                          className="w-40 px-2 py-1 border rounded text-sm text-right" />
                      )
                    ) : (
                      <span className="font-medium text-gray-900">
                        {typeof v === 'boolean' ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v ? 'Aktif' : 'Nonaktif'}</span>
                        ) : String(v)}
                      </span>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-700">{String(value)}</p>
                )}
              </div>
            </div>
          );
        })}
        {Object.keys(settings).length === 0 && (
          <div className="col-span-2 bg-white rounded-xl p-12 text-center shadow-sm border">
            <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada pengaturan</p>
            <p className="text-xs text-gray-300 mt-1">Pengaturan akan muncul setelah konfigurasi awal</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ASSET DETAIL MODAL
// ============================================================
function AssetDetailModal({ asset, onClose, formatCurrency, formatDate, statusColors, conditionColors }: any) {
  const [detailTab, setDetailTab] = useState('info');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 mb-10">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{asset.name}</h2>
            <p className="text-sm text-gray-500 font-mono">{asset.asset_code}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b flex gap-1 overflow-x-auto">
          {['info', 'depreciation', 'lifecycle', 'movements', 'custody'].map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={`px-3 py-2.5 text-sm font-medium capitalize border-b-2 ${
                detailTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
              }`}>{t === 'info' ? 'Informasi' : t === 'depreciation' ? 'Penyusutan' : t === 'lifecycle' ? 'Riwayat' : t === 'movements' ? 'Mutasi' : 'Serah Terima'}</button>
          ))}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {detailTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm">Detail Umum</h4>
                {[
                  ['Kategori', asset.category_name], ['Status', asset.status], ['Kondisi', asset.condition],
                  ['Serial Number', asset.serial_number], ['Barcode', asset.barcode],
                  ['Merek', asset.brand], ['Model', asset.model], ['Produsen', asset.manufacturer],
                ].map(([l, v]) => v && (
                  <div key={l as string} className="flex justify-between text-sm">
                    <span className="text-gray-500">{l}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm">Lokasi & Penanggung Jawab</h4>
                {[
                  ['Departemen', asset.department], ['Lokasi', asset.location],
                  ['Lantai', asset.floor], ['Ruangan', asset.room],
                  ['Penanggung Jawab', asset.custodian_name],
                ].map(([l, v]) => v && (
                  <div key={l as string} className="flex justify-between text-sm">
                    <span className="text-gray-500">{l}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm">Informasi Finansial</h4>
                {[
                  ['Harga Perolehan', formatCurrency(asset.purchase_price)],
                  ['Nilai Buku Saat Ini', formatCurrency(asset.current_book_value)],
                  ['Akumulasi Penyusutan', formatCurrency(asset.accumulated_depreciation)],
                  ['Nilai Sisa', formatCurrency(asset.salvage_value)],
                  ['Metode Penyusutan', asset.depreciation_method?.replace('_', ' ')],
                  ['Umur Ekonomis', `${asset.useful_life_months} bulan`],
                  ['Tanggal Perolehan', formatDate(asset.acquisition_date)],
                  ['Garansi s/d', formatDate(asset.warranty_expiry)],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between text-sm">
                    <span className="text-gray-500">{l}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm">Custom Attributes</h4>
                {(asset.attributeValues || []).map((av: any) => (
                  <div key={av.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{av.attr_name}</span>
                    <span className="font-medium">{av.value_string || av.value_number || av.value_date || '-'}</span>
                  </div>
                ))}
                {(!asset.attributeValues || asset.attributeValues.length === 0) && <p className="text-xs text-gray-400">Tidak ada atribut tambahan</p>}
              </div>
            </div>
          )}

          {detailTab === 'depreciation' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b text-xs">
                  <th className="pb-2">Periode</th><th className="pb-2">Tanggal</th>
                  <th className="pb-2 text-right">Nilai Awal</th><th className="pb-2 text-right">Penyusutan</th>
                  <th className="pb-2 text-right">Akumulasi</th><th className="pb-2 text-right">Nilai Akhir</th>
                  <th className="pb-2">Posted</th>
                </tr></thead>
                <tbody>
                  {(asset.depreciation || []).map((d: any) => (
                    <tr key={d.id} className="border-b">
                      <td className="py-2">{d.period_number}</td>
                      <td className="py-2">{formatDate(d.period_date)}</td>
                      <td className="py-2 text-right">{formatCurrency(d.opening_value)}</td>
                      <td className="py-2 text-right text-red-600">-{formatCurrency(d.depreciation_amount)}</td>
                      <td className="py-2 text-right">{formatCurrency(d.accumulated)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(d.closing_value)}</td>
                      <td className="py-2">{d.is_posted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-300" />}</td>
                    </tr>
                  ))}
                  {(!asset.depreciation || asset.depreciation.length === 0) && (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">Belum ada jadwal penyusutan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'lifecycle' && (
            <div className="space-y-3">
              {(asset.lifecycle || []).map((e: any) => (
                <div key={e.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{e.event_type?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.event_date)} • {e.performed_by_name || 'System'}</p>
                  </div>
                </div>
              ))}
              {(!asset.lifecycle || asset.lifecycle.length === 0) && <p className="text-center py-4 text-gray-400 text-sm">Belum ada riwayat</p>}
            </div>
          )}

          {detailTab === 'movements' && (
            <div className="space-y-3">
              {(asset.movements || []).map((m: any) => (
                <div key={m.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium capitalize">{m.movement_type} • <span className="font-mono text-xs text-indigo-600">{m.reference_number}</span></p>
                      <p className="text-xs text-gray-500 mt-1">
                        {m.from_department || '-'} → {m.to_department || '-'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.status}</span>
                  </div>
                </div>
              ))}
              {(!asset.movements || asset.movements.length === 0) && <p className="text-center py-4 text-gray-400 text-sm">Belum ada mutasi</p>}
            </div>
          )}

          {detailTab === 'custody' && (
            <div className="space-y-3">
              {(asset.custody || []).map((c: any) => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.action === 'checkout' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {c.action === 'checkout' ? <ChevronRight className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{c.action} - {c.custodian_name || '-'}</p>
                    <p className="text-xs text-gray-500">{formatDate(c.handover_date)} {c.return_date ? `→ ${formatDate(c.return_date)}` : ''}</p>
                  </div>
                </div>
              ))}
              {(!asset.custody || asset.custody.length === 0) && <p className="text-center py-4 text-gray-400 text-sm">Belum ada serah terima</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSET FORM MODAL (CREATE/EDIT)
// ============================================================
function AssetFormModal({ asset, categories, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: asset?.name || '', description: asset?.description || '',
    categoryId: asset?.category_id || '', status: asset?.status || 'active',
    condition: asset?.condition || 'good', acquisitionType: asset?.acquisition_type || 'purchase',
    acquisitionDate: asset?.acquisition_date || '', purchasePrice: asset?.purchase_price || 0,
    serialNumber: asset?.serial_number || '', barcode: asset?.barcode || '',
    brand: asset?.brand || '', model: asset?.model || '', manufacturer: asset?.manufacturer || '',
    department: asset?.department || '', location: asset?.location || '',
    custodianName: asset?.custodian_name || '',
    depreciationMethod: asset?.depreciation_method || 'straight_line',
    usefulLifeMonths: asset?.useful_life_months || 60,
    salvageValue: asset?.salvage_value || 0,
    warrantyExpiry: asset?.warranty_expiry || '',
    notes: asset?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert('Nama aset wajib diisi');
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 mb-10">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{asset ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aset *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Pilih Kategori</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="draft">Draft</option><option value="active">Active</option>
                <option value="in_use">In Use</option><option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="excellent">Excellent</option><option value="good">Good</option>
                <option value="fair">Fair</option><option value="poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Perolehan</label>
              <select value={form.acquisitionType} onChange={e => setForm({...form, acquisitionType: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="purchase">Pembelian</option><option value="lease">Sewa</option>
                <option value="donation">Donasi</option><option value="transfer">Transfer</option>
              </select>
            </div>
          </div>

          {/* Identification */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Identifikasi</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Serial Number</label>
                <input type="text" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Barcode</label>
                <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Merek</label>
                <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Model</label>
                <input type="text" value={form.model} onChange={e => setForm({...form, model: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Produsen</label>
                <input type="text" value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Informasi Finansial</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Harga Perolehan (Rp)</label>
                <input type="number" value={form.purchasePrice} onChange={e => setForm({...form, purchasePrice: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Perolehan</label>
                <input type="date" value={form.acquisitionDate} onChange={e => setForm({...form, acquisitionDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metode Penyusutan</label>
                <select value={form.depreciationMethod} onChange={e => setForm({...form, depreciationMethod: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="straight_line">Garis Lurus (Straight Line)</option>
                  <option value="double_declining">Saldo Menurun Ganda (Double Declining)</option>
                  <option value="sum_of_years">Jumlah Angka Tahun (Sum of Years)</option>
                  <option value="units_of_production">Unit Produksi</option>
                  <option value="none">Tidak Disusutkan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Umur Ekonomis (bulan)</label>
                <input type="number" value={form.usefulLifeMonths} onChange={e => setForm({...form, usefulLifeMonths: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nilai Sisa (Rp)</label>
                <input type="number" value={form.salvageValue} onChange={e => setForm({...form, salvageValue: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Garansi s/d</label>
                <input type="date" value={form.warrantyExpiry} onChange={e => setForm({...form, warrantyExpiry: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Lokasi & Penanggung Jawab</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Departemen</label>
                <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Penanggung Jawab</label>
                <input type="text" value={form.custodianName} onChange={e => setForm({...form, custodianName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
            <button type="submit" className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
              {asset ? 'Simpan Perubahan' : 'Daftarkan Aset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// DISPOSE MODAL
// ============================================================
function DisposeModal({ asset, onClose, onConfirm, formatCurrency }: any) {
  const [form, setForm] = useState({
    id: asset.id, disposalDate: new Date().toISOString().split('T')[0],
    disposalMethod: 'sold', disposalPrice: 0, disposalReason: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Penghapusan Aset</h2>
          <p className="text-sm text-gray-500">{asset.name} ({asset.asset_code})</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Nilai buku saat ini: <strong>{formatCurrency(asset.current_book_value)}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Penghapusan</label>
            <input type="date" value={form.disposalDate} onChange={e => setForm({...form, disposalDate: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Metode Penghapusan</label>
            <select value={form.disposalMethod} onChange={e => setForm({...form, disposalMethod: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="sold">Dijual</option><option value="scrapped">Dihancurkan</option>
              <option value="donated">Didonasikan</option><option value="trade_in">Tukar Tambah</option>
              <option value="lost">Hilang</option><option value="stolen">Dicuri</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Harga Jual / Nilai Sisa (Rp)</label>
            <input type="number" value={form.disposalPrice} onChange={e => setForm({...form, disposalPrice: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alasan</label>
            <textarea value={form.disposalReason} onChange={e => setForm({...form, disposalReason: e.target.value})}
              rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
          <button onClick={() => onConfirm(form)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Konfirmasi Penghapusan
          </button>
        </div>
      </div>
    </div>
  );
}
