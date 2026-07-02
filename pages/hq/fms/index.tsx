import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Truck, Users, Wrench, Fuel, FileText, Shield, DollarSign, AlertTriangle,
  Plus, Search, Filter, RefreshCw, Edit, Eye, MapPin, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, X,
  BarChart3, PieChart as PieChartIcon, TrendingUp, TrendingDown,
  Car, Bike, Settings, CircleDot, Loader2, Download, LayoutDashboard,
  ClipboardList, KeyRound, Info, Package, Gauge, Navigation, Bell,
  Crosshair, Activity, Disc, Zap, Target, Download as DownloadIcon, Filter as FilterIcon
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'dashboard' | 'vehicles' | 'drivers' | 'maintenance' | 'fuel' | 'rentals' | 'inspections' | 'incidents' | 'costs' | 'documents' | 'gps' | 'tires' | 'analytics' | 'geofences' | 'violations' | 'reminders';

const TAB_GROUPS: { label: string; icon: any; tabs: { id: TabType; label: string; icon: any }[] }[] = [
  { label: 'Utama', icon: LayoutDashboard, tabs: [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Kendaraan', icon: Truck },
    { id: 'drivers', label: 'Pengemudi', icon: Users },
  ]},
  { label: 'Operasional', icon: Wrench, tabs: [
    { id: 'maintenance', label: 'Pemeliharaan', icon: Wrench },
    { id: 'fuel', label: 'BBM', icon: Fuel },
    { id: 'rentals', label: 'Penyewaan', icon: KeyRound },
    { id: 'inspections', label: 'Inspeksi', icon: ClipboardList },
    { id: 'incidents', label: 'Insiden', icon: AlertTriangle },
  ]},
  { label: 'Pelacakan', icon: Navigation, tabs: [
    { id: 'gps', label: 'GPS Live', icon: Navigation },
    { id: 'geofences', label: 'Geofence', icon: Crosshair },
    { id: 'violations', label: 'Pelanggaran', icon: Zap },
  ]},
  { label: 'Analitik', icon: BarChart3, tabs: [
    { id: 'analytics', label: 'Analitik Armada', icon: BarChart3 },
    { id: 'tires', label: 'Manajemen Ban', icon: Disc },
    { id: 'costs', label: 'Biaya', icon: DollarSign },
  ]},
  { label: 'Admin', icon: FileText, tabs: [
    { id: 'documents', label: 'Dokumen', icon: FileText },
    { id: 'reminders', label: 'Pengingat', icon: Bell },
  ]},
];

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700', active: 'bg-green-100 text-green-700',
  in_use: 'bg-blue-100 text-blue-700', on_trip: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700', scheduled: 'bg-yellow-100 text-yellow-700',
  reserved: 'bg-purple-100 text-purple-700', confirmed: 'bg-purple-100 text-purple-700',
  retired: 'bg-gray-100 text-gray-600', completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700',
  open: 'bg-red-100 text-red-700', draft: 'bg-gray-100 text-gray-600',
  pass: 'bg-green-100 text-green-700', fail: 'bg-red-100 text-red-700',
  expired: 'bg-red-100 text-red-700', pending_renewal: 'bg-yellow-100 text-yellow-700',
  off_duty: 'bg-gray-100 text-gray-600', on_leave: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
};

const CHART_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#6366F1','#14B8A6'];
const CLS = { fontSize: 11, fill: '#6B7280' };

const fmt = (n: any) => Number(n || 0).toLocaleString('id-ID');
const fmtRp = (n: any) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

const MOCK_FMS_DASHBOARD = {
  totalVehicles: 28, activeVehicles: 22, inMaintenance: 3, retired: 3,
  totalDrivers: 35, activeDrivers: 30, onTrip: 18, availableDrivers: 12,
  totalFuelCost: 85000000, avgFuelEfficiency: 12.5, totalMaintenanceCost: 42000000,
  upcomingInspections: 5, overdueDocuments: 2, activeRentals: 4,
  fleetUtilization: 78, avgDriverScore: 85,
};

const MOCK_FMS_VEHICLES = [
  { id: 'v1', plate_number: 'B 1234 ABC', brand: 'Toyota', model: 'Avanza', year: 2023, type: 'van', status: 'in_use', assigned_driver: 'Hendra Gunawan', branch: 'Cabang Bandung', mileage: 45200, fuel_type: 'gasoline', last_service: '2026-02-15' },
  { id: 'v2', plate_number: 'B 5678 DEF', brand: 'Mitsubishi', model: 'L300', year: 2022, type: 'truck', status: 'available', assigned_driver: null, branch: 'Gudang Pusat Bekasi', mileage: 68500, fuel_type: 'diesel', last_service: '2026-03-01' },
  { id: 'v3', plate_number: 'D 9012 GHI', brand: 'Daihatsu', model: 'Gran Max', year: 2024, type: 'van', status: 'in_use', assigned_driver: 'Agus Setiawan', branch: 'Cabang Surabaya', mileage: 12800, fuel_type: 'gasoline', last_service: '2026-03-05' },
  { id: 'v4', plate_number: 'B 3456 JKL', brand: 'Isuzu', model: 'Elf', year: 2021, type: 'truck', status: 'maintenance', assigned_driver: null, branch: 'Gudang Pusat Bekasi', mileage: 95000, fuel_type: 'diesel', last_service: '2026-01-20' },
  { id: 'v5', plate_number: 'DK 7890 MNO', brand: 'Suzuki', model: 'Carry', year: 2023, type: 'van', status: 'in_use', assigned_driver: 'Wayan Darma', branch: 'Cabang Bali', mileage: 28600, fuel_type: 'gasoline', last_service: '2026-02-28' },
];

const MOCK_FMS_DRIVERS = [
  { id: 'd1', name: 'Hendra Gunawan', license_number: 'SIM-A-123456', license_type: 'A', license_expiry: '2027-06-15', phone: '081234567201', status: 'on_trip', assigned_vehicle: 'B 1234 ABC', branch: 'Cabang Bandung', score: 92 },
  { id: 'd2', name: 'Agus Setiawan', license_number: 'SIM-B1-789012', license_type: 'B1', license_expiry: '2026-12-01', phone: '081234567202', status: 'on_trip', assigned_vehicle: 'D 9012 GHI', branch: 'Cabang Surabaya', score: 88 },
  { id: 'd3', name: 'Wayan Darma', license_number: 'SIM-A-345678', license_type: 'A', license_expiry: '2027-03-20', phone: '081234567203', status: 'on_trip', assigned_vehicle: 'DK 7890 MNO', branch: 'Cabang Bali', score: 85 },
  { id: 'd4', name: 'Joko Susilo', license_number: 'SIM-B1-901234', license_type: 'B1', license_expiry: '2026-08-10', phone: '081234567204', status: 'available', assigned_vehicle: null, branch: 'Gudang Pusat Bekasi', score: 78 },
  { id: 'd5', name: 'Rudi Hartono', license_number: 'SIM-A-567890', license_type: 'A', license_expiry: '2027-01-05', phone: '081234567205', status: 'off_duty', assigned_vehicle: null, branch: 'Cabang Medan', score: 90 },
];

export default function FMSPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  // Data states
  const [dashboard, setDashboard] = useState<any>(MOCK_FMS_DASHBOARD);
  const [vehicles, setVehicles] = useState<any[]>(MOCK_FMS_VEHICLES);
  const [drivers, setDrivers] = useState<any[]>(MOCK_FMS_DRIVERS);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [fuelSummary, setFuelSummary] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [costRecords, setCostRecords] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  // Enhanced states
  const [gpsLive, setGpsLive] = useState<any[]>([]);
  const [gpsAlerts, setGpsAlerts] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<any[]>([]);
  const [tires, setTires] = useState<any[]>([]);
  const [tireSummary, setTireSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [fleetKpi, setFleetKpi] = useState<any>(null);
  // Fleet Analytics deep states
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null);
  const [analyticsUtilTrend, setAnalyticsUtilTrend] = useState<any[]>([]);
  const [analyticsCost, setAnalyticsCost] = useState<any>(null);
  const [analyticsFuel, setAnalyticsFuel] = useState<any>(null);
  const [analyticsMaint, setAnalyticsMaint] = useState<any>(null);
  const [analyticsDriver, setAnalyticsDriver] = useState<any>(null);
  const [analyticsLifecycle, setAnalyticsLifecycle] = useState<any>(null);
  const [analyticsIncident, setAnalyticsIncident] = useState<any>(null);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview'|'cost'|'fuel'|'maintenance'|'drivers'|'lifecycle'|'incidents'>('overview');
  const [analyticsExporting, setAnalyticsExporting] = useState(false);
  const [violations, setViolations] = useState<any[]>([]);
  const [violationSummary, setViolationSummary] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted, tab]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const api = async (action: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/fms?action=${action}`, opts);
    return r.json();
  };
  const apiE = async (action: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/fms/enhanced?action=${action}`, opts);
    return r.json();
  };
  const apiA = async (action: string, period?: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/fms/analytics?action=${action}&period=${period || analyticsPeriod}`, opts);
    return r.json();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'dashboard': {
          const [r, c] = await Promise.all([api('dashboard'), api('dashboard-charts')]);
          if (r.success) setDashboard(r.data);
          if (c.success) setChartData(c.data);
          break;
        }
        case 'vehicles': {
          const r = await api('vehicles');
          if (r.success) setVehicles(r.data || []);
          break;
        }
        case 'drivers': {
          const r = await api('drivers');
          if (r.success) setDrivers(r.data || []);
          break;
        }
        case 'maintenance': {
          const r = await api('maintenance-records');
          if (r.success) setMaintenanceRecords(r.data || []);
          break;
        }
        case 'fuel': {
          const [r1, r2] = await Promise.all([api('fuel-records'), api('fuel-summary')]);
          if (r1.success) setFuelRecords(r1.data || []);
          if (r2.success) setFuelSummary(r2.data || []);
          break;
        }
        case 'rentals': {
          const r = await api('rentals');
          if (r.success) setRentals(r.data || []);
          break;
        }
        case 'inspections': {
          const r = await api('inspections');
          if (r.success) setInspections(r.data || []);
          break;
        }
        case 'incidents': {
          const r = await api('incidents');
          if (r.success) setIncidents(r.data || []);
          break;
        }
        case 'costs': {
          const [r1, r2] = await Promise.all([api('cost-records'), api('cost-summary')]);
          if (r1.success) setCostRecords(r1.data || []);
          if (r2.success) setCostSummary(r2.data);
          break;
        }
        case 'documents': {
          const r = await api('documents');
          if (r.success) setDocuments(r.data || []);
          break;
        }
        case 'gps': {
          const [r1, r2] = await Promise.all([apiE('gps-live'), apiE('gps-alerts')]);
          if (r1.success) setGpsLive(r1.data || []);
          if (r2.success) setGpsAlerts(r2.data || []);
          break;
        }
        case 'geofences': {
          const [r1, r2] = await Promise.all([apiE('geofences'), apiE('geofence-events')]);
          if (r1.success) setGeofences(r1.data || []);
          if (r2.success) setGeofenceEvents(r2.data || []);
          break;
        }
        case 'tires': {
          const [r1, r2] = await Promise.all([apiE('tires'), apiE('tire-summary')]);
          if (r1.success) setTires(r1.data || []);
          if (r2.success) setTireSummary(r2.data);
          break;
        }
        case 'analytics': {
          const [r0, r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
            apiA('overview'), apiA('utilization-trend'), apiA('cost-analytics'),
            apiA('fuel-analytics'), apiA('maintenance-analytics'), apiA('driver-analytics'),
            apiA('vehicle-lifecycle'), apiA('incident-analytics'),
          ]);
          if (r0.success) setAnalyticsOverview(r0.data);
          if (r1.success) setAnalyticsUtilTrend(r1.data || []);
          if (r2.success) setAnalyticsCost(r2.data);
          if (r3.success) setAnalyticsFuel(r3.data);
          if (r4.success) setAnalyticsMaint(r4.data);
          if (r5.success) setAnalyticsDriver(r5.data);
          if (r6.success) setAnalyticsLifecycle(r6.data);
          if (r7.success) setAnalyticsIncident(r7.data);
          break;
        }
        case 'violations': {
          const [r1, r2] = await Promise.all([apiE('driver-violations'), apiE('violation-summary')]);
          if (r1.success) setViolations(r1.data || []);
          if (r2.success) setViolationSummary(r2.data);
          break;
        }
        case 'reminders': {
          const [r1, r2] = await Promise.all([apiE('reminders'), apiE('maintenance-schedules')]);
          if (r1.success) setReminders(r1.data || []);
          if (r2.success) setSchedules(r2.data || []);
          break;
        }
      }
    } catch (e) {
      console.error('FMS fetch error:', e);
      if (tab === 'dashboard') setDashboard(MOCK_FMS_DASHBOARD);
      if (tab === 'vehicles') setVehicles(MOCK_FMS_VEHICLES);
      if (tab === 'drivers') setDrivers(MOCK_FMS_DRIVERS);
    }
    setLoading(false);
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let r;
      switch (modal) {
        case 'add-vehicle': r = await api('create-vehicle', 'POST', form); break;
        case 'add-driver': r = await api('create-driver', 'POST', form); break;
        case 'add-maintenance': r = await api('create-maintenance', 'POST', form); break;
        case 'add-fuel': r = await api('create-fuel-record', 'POST', form); break;
        case 'add-rental': r = await api('create-rental', 'POST', form); break;
        case 'add-inspection': r = await api('create-inspection', 'POST', form); break;
        case 'add-incident': r = await api('create-incident', 'POST', form); break;
        case 'add-cost': r = await api('create-cost', 'POST', form); break;
        case 'add-document': r = await api('create-document', 'POST', form); break;
        case 'assign-vehicle': r = await api('assign-vehicle', 'POST', form); break;
        case 'add-geofence': r = await apiE('create-geofence', 'POST', form); break;
        case 'add-tire': r = await apiE('create-tire', 'POST', form); break;
        case 'add-violation': r = await apiE('create-violation', 'POST', form); break;
        case 'add-reminder': r = await apiE('create-reminder', 'POST', form); break;
        case 'add-schedule': r = await apiE('create-schedule', 'POST', form); break;
        case 'add-rental-payment': r = await apiE('create-rental-payment', 'POST', form); break;
        default: r = { success: false, error: 'Unknown modal' };
      }
      if (r?.success) { showToast(r.message || 'Berhasil'); setModal(null); setForm({}); fetchData(); }
      else showToast(r?.error || 'Gagal');
    } catch (e) { showToast('Terjadi error'); }
    setSaving(false);
  };

  const handleExport = async (entity: string) => {
    try {
      const r = await api('export&entity=' + entity);
      if (!r.success || !r.data?.length) { showToast('Tidak ada data untuk export'); return; }
      const headers = Object.keys(r.data[0]);
      const csv = [headers.join(','), ...r.data.map((row: any) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `fms_${entity}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url); showToast('Export CSV berhasil');
    } catch { showToast('Export gagal'); }
  };

  const fetchAnalytics = async (period?: string) => {
    const p = period || analyticsPeriod;
    setLoading(true);
    try {
      const [r0, r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        apiA('overview', p), apiA('utilization-trend', p), apiA('cost-analytics', p),
        apiA('fuel-analytics', p), apiA('maintenance-analytics', p), apiA('driver-analytics', p),
        apiA('vehicle-lifecycle', p), apiA('incident-analytics', p),
      ]);
      if (r0.success) setAnalyticsOverview(r0.data);
      if (r1.success) setAnalyticsUtilTrend(r1.data || []);
      if (r2.success) setAnalyticsCost(r2.data);
      if (r3.success) setAnalyticsFuel(r3.data);
      if (r4.success) setAnalyticsMaint(r4.data);
      if (r5.success) setAnalyticsDriver(r5.data);
      if (r6.success) setAnalyticsLifecycle(r6.data);
      if (r7.success) setAnalyticsIncident(r7.data);
    } catch (e) { console.error('Analytics fetch error:', e); }
    setLoading(false);
  };

  const handleAnalyticsPeriodChange = (p: string) => { setAnalyticsPeriod(p); fetchAnalytics(p); };

  const handleAnalyticsExport = async (entity: string) => {
    setAnalyticsExporting(true);
    try {
      const r = await apiA('export-analytics&entity=' + entity);
      if (!r.success || !r.data?.length) { showToast('Tidak ada data untuk export'); setAnalyticsExporting(false); return; }
      const headers = Object.keys(r.data[0]);
      const csv = [headers.join(','), ...r.data.map((row: any) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `fms_analytics_${entity}_${analyticsPeriod}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url); showToast('Export berhasil');
    } catch { showToast('Export gagal'); }
    setAnalyticsExporting(false);
  };

  const handleRefreshKpi = async () => {
    try {
      const r = await apiA('refresh-kpi', undefined, 'POST');
      if (r.success) { showToast(r.message || 'KPI diperbarui'); fetchAnalytics(); }
      else showToast(r.error || 'Gagal refresh KPI');
    } catch { showToast('Error refresh KPI'); }
  };

  if (!mounted) return null;

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
  const StatCard = ({ icon: Icon, label, value, color = 'blue', sub }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`p-2 sm:p-2.5 rounded-lg bg-${color}-50 flex-shrink-0`}><Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-600`} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
  const SectionHeader = ({ title, onAdd, addLabel, onExport }: { title: string; onAdd?: () => void; addLabel?: string; onExport?: () => void }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
        {onExport && <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"><DownloadIcon className="w-4 h-4" /><span className="hidden sm:inline">Ekspor CSV</span><span className="sm:hidden">Ekspor</span></button>}
        {onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />{addLabel || 'Tambah'}</button>}
      </div>
    </div>
  );

  const filteredVehicles = vehicles.filter(v => (!search || v.vehicle_code?.toLowerCase().includes(search.toLowerCase()) || v.license_plate?.toLowerCase().includes(search.toLowerCase()) || v.brand?.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || v.status === statusFilter));
  const filteredDrivers = drivers.filter(d => (!search || d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.driver_code?.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || d.status === statusFilter));

  const activeGroupIdx = TAB_GROUPS.findIndex(g => g.tabs.some(t => t.id === tab));
  const activeGroup = TAB_GROUPS[activeGroupIdx >= 0 ? activeGroupIdx : 0];

  return (
    <HQLayout>
      <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col bg-gray-50/50 overflow-hidden">
        {/* Toast */}
        {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm animate-in">{toast}</div>}

        {/* ─── Sticky Header ─── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          {/* Title Bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate"><Truck className="w-6 h-6 text-blue-600 flex-shrink-0" />{t('fms.title')}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative hidden sm:block"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 lg:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>

          {/* ─── Group Selector ─── */}
          <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {TAB_GROUPS.map((g, gi) => {
              const GIcon = g.icon;
              const isActive = gi === (activeGroupIdx >= 0 ? activeGroupIdx : 0);
              return (
                <button key={g.label} onClick={() => { const firstTab = g.tabs[0].id; setTab(firstTab); setSearch(''); setStatusFilter(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}>
                  <GIcon className="w-4 h-4" /><span className="hidden sm:inline">{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── Sub-tabs for active group ─── */}
          <div className="px-4 sm:px-6 py-2 bg-gray-50/80 flex items-center gap-1 overflow-x-auto scrollbar-hide border-t border-gray-100">
            {activeGroup.tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setStatusFilter(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    tab === t.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
            {/* Mobile search */}
            <div className="relative sm:hidden ml-auto flex-shrink-0">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-36 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ─── Content (scrollable, fit-screen) ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}

          {!loading && tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              {/* ── KPI Summary Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Truck} label="Total Kendaraan" value={fmt(dashboard.vehicles?.total)} color="blue" sub={`${fmt(dashboard.vehicles?.available)} tersedia`} />
                <StatCard icon={Car} label="Sedang Digunakan" value={fmt(dashboard.vehicles?.in_use)} color="purple" />
                <StatCard icon={Wrench} label="Pemeliharaan" value={fmt(dashboard.vehicles?.maintenance)} color="yellow" />
                <StatCard icon={Users} label="Driver Aktif" value={fmt(dashboard.drivers?.active)} color="green" sub={`${fmt(dashboard.drivers?.on_trip)} dalam perjalanan`} />
                <StatCard icon={KeyRound} label="Rental Aktif" value={fmt(dashboard.rentals?.active)} color="indigo" sub={fmtRp(dashboard.rentals?.revenue)} />
                <StatCard icon={AlertTriangle} label="Insiden Terbuka" value={fmt(dashboard.incidents?.open_count)} color="red" />
              </div>

              {/* ── Row 1: Cost Trend (Area) + Vehicle Status (Doughnut) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Tren Biaya Operasional</h3>
                  <p className="text-xs text-gray-400 mb-4">BBM & Pemeliharaan — 12 bulan terakhir</p>
                  {(chartData?.fuelTrend?.length > 0 || chartData?.monthlyMaintenance?.length > 0) ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={(() => {
                        const months = new Set([...(chartData?.fuelTrend||[]).map((f:any)=>f.month),...(chartData?.monthlyMaintenance||[]).map((m:any)=>m.month)]);
                        return Array.from(months).sort().map(m => ({ month: String(m).slice(5), bbm: Number((chartData?.fuelTrend||[]).find((f:any)=>f.month===m)?.cost||0), maintenance: Number((chartData?.monthlyMaintenance||[]).find((mt:any)=>mt.month===m)?.cost||0) }));
                      })()}>
                        <defs>
                          <linearGradient id="gBbm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gMnt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={CLS} />
                        <YAxis tick={CLS} tickFormatter={(v:number) => v >= 1e6 ? `${(v/1e6).toFixed(0)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : String(v)} />
                        <Tooltip formatter={(v:number) => fmtRp(v)} />
                        <Legend />
                        <Area type="monotone" dataKey="bbm" name="BBM" stroke="#F59E0B" fill="url(#gBbm)" strokeWidth={2} />
                        <Area type="monotone" dataKey="maintenance" name="Pemeliharaan" stroke="#3B82F6" fill="url(#gMnt)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Belum ada data tren</div>}
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Status Kendaraan</h3>
                  {chartData?.vehiclesByStatus?.length > 0 ? (<>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={chartData.vehiclesByStatus.map((v:any)=>({name:v.status?.replace(/_/g,' '),value:Number(v.count)}))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {chartData.vehiclesByStatus.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v:number)=>fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">{chartData.vehiclesByStatus.map((v:any,i:number)=>(
                      <div key={v.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="capitalize text-gray-600">{v.status?.replace(/_/g,' ')}</span></div>
                        <span className="font-semibold text-gray-900">{fmt(v.count)}</span>
                      </div>
                    ))}</div>
                  </>) : <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
              </div>

              {/* ── Row 2: Maintenance Bar + Fuel Doughnut ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><Wrench className="w-5 h-5 text-yellow-500" />Pemeliharaan per Kategori</h3>
                  <p className="text-xs text-gray-400 mb-4">6 bulan terakhir</p>
                  {chartData?.maintenanceByCategory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData.maintenanceByCategory.map((m:any)=>({name:m.category?.replace(/_/g,' '),jumlah:Number(m.count),biaya:Number(m.cost)}))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={CLS} />
                        <YAxis yAxisId="l" tick={CLS} />
                        <YAxis yAxisId="r" orientation="right" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:`${(v/1e3).toFixed(0)}rb`} />
                        <Tooltip formatter={(v:number,name:string)=>name==='biaya'?fmtRp(v):fmt(v)} />
                        <Legend />
                        <Bar yAxisId="l" dataKey="jumlah" name="Jumlah WO" fill="#3B82F6" radius={[4,4,0,0]} />
                        <Bar yAxisId="r" dataKey="biaya" name="Biaya" fill="#F59E0B" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><Fuel className="w-5 h-5 text-orange-500" />Konsumsi BBM per Jenis</h3>
                  <p className="text-xs text-gray-400 mb-4">3 bulan terakhir</p>
                  {chartData?.fuelByType?.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={chartData.fuelByType.map((f:any)=>({name:f.fuel_type,value:Number(f.cost)}))} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                            {chartData.fuelByType.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v:number)=>fmtRp(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2.5">{chartData.fuelByType.map((f:any,i:number)=>(
                        <div key={f.fuel_type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="text-sm capitalize text-gray-600">{f.fuel_type}</span></div>
                          <div className="text-right"><p className="text-sm font-semibold">{fmtRp(f.cost)}</p><p className="text-xs text-gray-400">{fmt(f.liters)} L</p></div>
                        </div>
                      ))}</div>
                    </div>
                  ) : <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Belum ada data</div>}
                </div>
              </div>

              {/* ── Row 3: Maintenance & Fuel Info Cards ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-blue-500" />Pemeliharaan Bulan Ini</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-yellow-50 rounded-lg"><p className="text-2xl font-bold text-yellow-700">{fmt(dashboard.maintenance?.scheduled)}</p><p className="text-xs text-gray-500">Terjadwal</p></div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{fmt(dashboard.maintenance?.in_progress)}</p><p className="text-xs text-gray-500">Sedang Berjalan</p></div>
                    <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-700">{fmt(dashboard.maintenance?.completed)}</p><p className="text-xs text-gray-500">Selesai</p></div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">Total Biaya: <span className="font-semibold text-gray-900">{fmtRp(dashboard.maintenance?.month_cost)}</span></p>
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-orange-500" />BBM Bulan Ini</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-orange-50 rounded-lg"><p className="text-2xl font-bold text-orange-700">{fmt(dashboard.fuel?.records)}</p><p className="text-xs text-gray-500">Transaksi</p></div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{fmt(dashboard.fuel?.total_liters)} L</p><p className="text-xs text-gray-500">Total Liter</p></div>
                    <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-700">{fmtRp(dashboard.fuel?.total_cost)}</p><p className="text-xs text-gray-500">Total Biaya</p></div>
                  </div>
                </div>
              </div>

              {/* ── Top Cost Vehicles (Horizontal Bar) ── */}
              {chartData?.topCostVehicles?.filter((v:any)=>Number(v.total_cost)>0).length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><DollarSign className="w-5 h-5 text-red-500" />Top 10 Kendaraan Biaya Tertinggi</h3>
                  <p className="text-xs text-gray-400 mb-4">3 bulan terakhir</p>
                  <ResponsiveContainer width="100%" height={Math.max(180, chartData.topCostVehicles.filter((v:any)=>Number(v.total_cost)>0).length * 32)}>
                    <BarChart layout="vertical" data={chartData.topCostVehicles.filter((v:any)=>Number(v.total_cost)>0).map((v:any)=>({name:v.vehicle_code,total:Number(v.total_cost)}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}jt`:`${(v/1e3).toFixed(0)}rb`} />
                      <YAxis type="category" dataKey="name" width={80} tick={{fontSize:11,fill:'#374151'}} />
                      <Tooltip formatter={(v:number)=>fmtRp(v)} />
                      <Bar dataKey="total" name="Total Biaya" fill="#EF4444" radius={[0,4,4,0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Incident Trend (Line Chart) ── */}
              {chartData?.incidentTrend?.length > 0 && (
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" />Tren Insiden</h3>
                  <p className="text-xs text-gray-400 mb-4">12 bulan terakhir</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData.incidentTrend.map((i:any)=>({month:i.month?.slice(5),jumlah:Number(i.count),biaya:Number(i.cost)}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={CLS} />
                      <YAxis yAxisId="l" tick={CLS} />
                      <YAxis yAxisId="r" orientation="right" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:`${(v/1e3).toFixed(0)}rb`} />
                      <Tooltip formatter={(v:number,name:string)=>name==='biaya'?fmtRp(v):v} />
                      <Legend />
                      <Line yAxisId="l" type="monotone" dataKey="jumlah" name="Jumlah" stroke="#EF4444" strokeWidth={2} dot={{r:3}} />
                      <Line yAxisId="r" type="monotone" dataKey="biaya" name="Biaya" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Expiring Documents Alert ── */}
              {dashboard.expiringDocs?.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2"><Info className="w-5 h-5" />Dokumen Segera Kedaluwarsa (30 hari)</h3>
                  <div className="space-y-2">{dashboard.expiringDocs.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div><span className="font-medium text-gray-900">{d.entity_code}</span> — <span className="text-sm text-gray-600">{d.document_type?.toUpperCase()}</span> #{d.document_number}</div>
                      <span className="text-sm font-medium text-red-600">{fmtDate(d.expiry_date)}</span>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          {!loading && tab === 'vehicles' && (
            <div>
              <SectionHeader title="Daftar Kendaraan" onExport={() => handleExport('vehicles')} onAdd={() => { setForm({ vehicle_type: 'truck', ownership_type: 'owned', status: 'available' }); setModal('add-vehicle'); }} addLabel="Tambah Kendaraan" />
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {['','available','in_use','maintenance','reserved','retired'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : 'Semua'} {s ? `(${vehicles.filter(v => v.status === s).length})` : `(${vehicles.length})`}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kode','Plat','Tipe','Merk/Model','Tahun','BBM','Odometer','Status','Driver','Aksi'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{filteredVehicles.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada kendaraan</td></tr> : filteredVehicles.map(v => (
                    <tr key={v.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{v.vehicle_code}</td>
                      <td className="px-4 py-3">{v.license_plate}</td>
                      <td className="px-4 py-3 capitalize">{v.vehicle_type}</td>
                      <td className="px-4 py-3">{v.brand} {v.model}</td>
                      <td className="px-4 py-3">{v.year || '-'}</td>
                      <td className="px-4 py-3 capitalize">{v.fuel_type || '-'}</td>
                      <td className="px-4 py-3">{fmt(v.current_odometer_km)} km</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3">{v.driver_name || <span className="text-gray-400">-</span>}</td>
                      <td className="px-4 py-3"><button onClick={() => { setForm({ vehicle_id: v.id, driver_id: '' }); setModal('assign-vehicle'); }} className="text-xs text-blue-600 hover:underline">Tugaskan</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'drivers' && (
            <div>
              <SectionHeader title="Daftar Driver" onExport={() => handleExport('drivers')} onAdd={() => { setForm({ employment_type: 'permanent', license_type: 'SIM B1', status: 'active' }); setModal('add-driver'); }} addLabel="Tambah Driver" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kode','Nama','Telepon','SIM','Tipe SIM','Kontrak','Trip','Jarak','Safety','Status','Ketersediaan'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{filteredDrivers.length === 0 ? <tr><td colSpan={11} className="text-center py-8 text-gray-400">Belum ada driver</td></tr> : filteredDrivers.map(d => (
                    <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{d.driver_code}</td>
                      <td className="px-4 py-3">{d.full_name}</td>
                      <td className="px-4 py-3">{d.phone || '-'}</td>
                      <td className="px-4 py-3">{d.license_number || '-'}</td>
                      <td className="px-4 py-3">{d.license_type || '-'}</td>
                      <td className="px-4 py-3 capitalize">{d.employment_type || '-'}</td>
                      <td className="px-4 py-3">{fmt(d.total_trips)}</td>
                      <td className="px-4 py-3">{fmt(d.total_distance_km)} km</td>
                      <td className="px-4 py-3"><span className={`font-medium ${Number(d.safety_score) >= 80 ? 'text-green-600' : Number(d.safety_score) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{Number(d.safety_score || 0).toFixed(0)}%</span></td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={d.availability} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'maintenance' && (
            <div>
              <SectionHeader title="Perintah Kerja Pemeliharaan" onExport={() => handleExport('maintenance')} onAdd={() => { setForm({ category: 'preventive', priority: 'medium', maintenance_type: 'general' }); setModal('add-maintenance'); }} addLabel="Buat Work Order" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['WO#','Kendaraan','Tipe','Kategori','Prioritas','Vendor','Biaya','Status','Tanggal'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{maintenanceRecords.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Belum ada perintah kerja</td></tr> : maintenanceRecords.map(m => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.work_order_number}</td>
                      <td className="px-4 py-3">{m.vehicle_code} ({m.license_plate})</td>
                      <td className="px-4 py-3 capitalize">{m.maintenance_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 capitalize">{m.category}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.priority === 'critical' ? 'bg-red-100 text-red-700' : m.priority === 'high' ? 'bg-orange-100 text-orange-700' : m.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{m.priority}</span></td>
                      <td className="px-4 py-3">{m.vendor_name || '-'}</td>
                      <td className="px-4 py-3 font-medium">{fmtRp(m.total_cost)}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3">{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'fuel' && (
            <div className="space-y-6">
              <SectionHeader title="Catatan Pengisian BBM" onExport={() => handleExport('fuel')} onAdd={() => { setForm({ fuel_type: 'diesel', fill_type: 'full_tank', payment_method: 'cash' }); setModal('add-fuel'); }} addLabel="Catat Pengisian" />
              {fuelSummary.length > 0 && (
                <div className="bg-white rounded-xl border p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Ringkasan BBM per Kendaraan (Bulan Ini)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {fuelSummary.filter((s: any) => Number(s.total_cost) > 0).map((s: any) => (
                      <div key={s.vehicle_code} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm">{s.vehicle_code} <span className="text-gray-400">({s.license_plate})</span></p>
                        <p className="text-lg font-bold text-orange-600">{fmtRp(s.total_cost)}</p>
                        <p className="text-xs text-gray-500">{fmt(s.total_liters)}L · {s.fill_count}x isi · {Number(s.avg_consumption || 0).toFixed(1)} km/L</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Tanggal','Kendaraan','Driver','Jenis BBM','Liter','Harga/L','Total','Odometer','SPBU','Bayar'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{fuelRecords.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada catatan BBM</td></tr> : fuelRecords.map(f => (
                    <tr key={f.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{fmtDate(f.fill_date)}</td>
                      <td className="px-4 py-3 font-medium">{f.vehicle_code} ({f.license_plate})</td>
                      <td className="px-4 py-3">{f.driver_name || '-'}</td>
                      <td className="px-4 py-3 capitalize">{f.fuel_type}</td>
                      <td className="px-4 py-3">{fmt(f.quantity_liters)}</td>
                      <td className="px-4 py-3">{fmtRp(f.price_per_liter)}</td>
                      <td className="px-4 py-3 font-medium">{fmtRp(f.total_cost)}</td>
                      <td className="px-4 py-3">{fmt(f.odometer_reading)} km</td>
                      <td className="px-4 py-3">{f.station_name || '-'}</td>
                      <td className="px-4 py-3 capitalize">{f.payment_method}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'costs' && (
            <div className="space-y-6">
              <SectionHeader title="Analisis Biaya Operasional" onExport={() => handleExport('costs')} onAdd={() => { setForm({ cost_category: 'other' }); setModal('add-cost'); }} addLabel="Catat Biaya" />
              {costSummary && (
                <>
                  {/* Monthly Cost Trend */}
                  {costSummary.monthly?.length > 0 && (
                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-0.5 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Tren Biaya Bulanan</h4>
                      <p className="text-xs text-gray-400 mb-4">6 bulan terakhir</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={costSummary.monthly.map((m:any)=>({month:m.month?.slice(5),total:Number(m.total)}))}>
                          <defs><linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={CLS} />
                          <YAxis tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(0)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}rb`:String(v)} />
                          <Tooltip formatter={(v:number)=>fmtRp(v)} />
                          <Area type="monotone" dataKey="total" name="Total Biaya" stroke="#EF4444" fill="url(#gCost)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category Doughnut */}
                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-4">Per Kategori (Bulan Ini)</h4>
                      {costSummary.byCategory?.length === 0 ? <p className="text-gray-400 text-sm">Belum ada data</p> : (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="50%" height={180}>
                            <PieChart>
                              <Pie data={costSummary.byCategory.map((c:any)=>({name:c.cost_category?.replace(/_/g,' '),value:Number(c.total||0)}))} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={65} paddingAngle={3}>
                                {costSummary.byCategory.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v:number)=>fmtRp(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">{costSummary.byCategory.map((c:any,i:number)=>(
                            <div key={c.cost_category} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="capitalize text-gray-600">{c.cost_category?.replace(/_/g,' ')}</span></div>
                              <span className="font-semibold">{fmtRp(c.total)} <span className="text-gray-400">({c.count}x)</span></span>
                            </div>
                          ))}</div>
                        </div>
                      )}
                    </div>
                    {/* Top Vehicles Bar */}
                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-4">Per Kendaraan (Top 10)</h4>
                      {costSummary.byVehicle?.filter((v:any)=>Number(v.total)>0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(160, costSummary.byVehicle.filter((v:any)=>Number(v.total)>0).length * 28)}>
                          <BarChart layout="vertical" data={costSummary.byVehicle.filter((v:any)=>Number(v.total)>0).map((v:any)=>({name:v.vehicle_code,total:Number(v.total)}))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={CLS} tickFormatter={(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}jt`:`${(v/1e3).toFixed(0)}rb`} />
                            <YAxis type="category" dataKey="name" width={70} tick={{fontSize:11,fill:'#374151'}} />
                            <Tooltip formatter={(v:number)=>fmtRp(v)} />
                            <Bar dataKey="total" name="Total" fill="#F59E0B" radius={[0,4,4,0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-gray-400 text-sm">Belum ada data</p>}
                    </div>
                  </div>
                </>
              )}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Tanggal','Kendaraan','Kategori','Deskripsi','Jumlah','Kwitansi'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{costRecords.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada catatan biaya</td></tr> : costRecords.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{fmtDate(c.cost_date)}</td>
                      <td className="px-4 py-3">{c.vehicle_code} ({c.license_plate})</td>
                      <td className="px-4 py-3 capitalize">{c.cost_category?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">{c.description || '-'}</td>
                      <td className="px-4 py-3 font-medium">{fmtRp(c.amount)}</td>
                      <td className="px-4 py-3">{c.receipt_number || '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'documents' && (
            <div>
              <SectionHeader title="Dokumen Kendaraan & Driver" onAdd={() => { setForm({ entity_type: 'vehicle', document_type: 'stnk', reminder_days: 30 }); setModal('add-document'); }} addLabel="Tambah Dokumen" />
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Entitas','Kode','Tipe Dokumen','No. Dokumen','Terbit','Kedaluwarsa','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{documents.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada dokumen</td></tr> : documents.map(d => {
                    const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date();
                    const isSoon = d.expiry_date && !isExpired && new Date(d.expiry_date) < new Date(Date.now() + 30*86400000);
                    return (
                      <tr key={d.id} className={`border-b hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isSoon ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 capitalize">{d.entity_type}</td>
                        <td className="px-4 py-3 font-medium">{d.entity_code}</td>
                        <td className="px-4 py-3 uppercase text-xs font-medium">{d.document_type}</td>
                        <td className="px-4 py-3">{d.document_number || '-'}</td>
                        <td className="px-4 py-3">{fmtDate(d.issued_date)}</td>
                        <td className="px-4 py-3"><span className={isExpired ? 'text-red-600 font-medium' : isSoon ? 'text-yellow-600 font-medium' : ''}>{fmtDate(d.expiry_date)}</span></td>
                        <td className="px-4 py-3"><StatusBadge status={isExpired ? 'expired' : isSoon ? 'pending_renewal' : d.status} /></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ GPS LIVE TRACKING ═══ */}
          {!loading && tab === 'gps' && (
            <div className="space-y-6">
              <SectionHeader title="Pelacakan GPS Langsung" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Navigation} label="Kendaraan Terlacak" value={fmt(gpsLive.length)} color="blue" />
                <StatCard icon={Activity} label="Sedang Bergerak" value={fmt(gpsLive.filter((g: any) => Number(g.speed_kmh) > 0).length)} color="green" />
                <StatCard icon={MapPin} label="Berhenti/Idle" value={fmt(gpsLive.filter((g: any) => Number(g.speed_kmh) === 0).length)} color="yellow" />
                <StatCard icon={AlertTriangle} label="Alert Terbaru" value={fmt(gpsAlerts.length)} color="red" />
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <div className="px-4 py-3 border-b bg-gray-50"><h4 className="font-medium text-gray-700">Posisi Terakhir Kendaraan</h4></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kendaraan','Plat','Driver','Koordinat','Kecepatan','Mesin','BBM','Waktu'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{gpsLive.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data GPS</td></tr> : gpsLive.map((g: any) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{g.vehicle_code}</td>
                      <td className="px-4 py-3">{g.license_plate}</td>
                      <td className="px-4 py-3">{g.driver_name || '-'}</td>
                      <td className="px-4 py-3 text-xs font-mono">{Number(g.lat).toFixed(5)}, {Number(g.lng).toFixed(5)}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${Number(g.speed_kmh) > 80 ? 'text-red-600' : Number(g.speed_kmh) > 0 ? 'text-green-600' : 'text-gray-400'}`}>{fmt(g.speed_kmh)} km/h</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.engine_status === 'on' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{g.engine_status || 'off'}</span></td>
                      <td className="px-4 py-3">{g.fuel_level ? `${g.fuel_level}%` : '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{g.recorded_at ? new Date(g.recorded_at).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {gpsAlerts.length > 0 && (
                <div className="bg-white rounded-xl border overflow-x-auto">
                  <div className="px-4 py-3 border-b bg-red-50"><h4 className="font-medium text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Alert GPS Terbaru</h4></div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">{['Waktu','Kendaraan','Driver','Event','Kecepatan'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody>{gpsAlerts.map((a: any) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs">{new Date(a.recorded_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 font-medium">{a.vehicle_code}</td>
                        <td className="px-4 py-3">{a.driver_name || '-'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{a.event_type?.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3">{fmt(a.speed_kmh)} km/h</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ GEOFENCES ═══ */}
          {!loading && tab === 'geofences' && (
            <div className="space-y-6">
              <SectionHeader title="Manajemen Geofence" onAdd={() => { setForm({ fence_type: 'circle', category: 'depot', radius_m: 500, alert_on_enter: true, alert_on_exit: true, color: '#3B82F6' }); setModal('add-geofence'); }} addLabel="Tambah Geofence" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Crosshair} label="Total Geofence" value={fmt(geofences.length)} color="blue" />
                <StatCard icon={CheckCircle} label="Aktif" value={fmt(geofences.filter((g: any) => g.is_active).length)} color="green" />
                <StatCard icon={Activity} label="Kejadian (7 hari)" value={fmt(geofences.reduce((s: number, g: any) => s + Number(g.recent_events || 0), 0))} color="purple" />
              </div>
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kode','Nama','Tipe','Kategori','Radius','Peringatan','Batas Kecepatan','Event','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{geofences.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Belum ada geofence</td></tr> : geofences.map((g: any) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{g.fence_code}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: g.color || '#3B82F6'}} />{g.fence_name}</div></td>
                      <td className="px-4 py-3 capitalize">{g.fence_type}</td>
                      <td className="px-4 py-3 capitalize">{g.category?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">{g.fence_type === 'circle' ? `${fmt(g.radius_m)}m` : 'Polygon'}</td>
                      <td className="px-4 py-3 text-xs">{[g.alert_on_enter && 'Enter', g.alert_on_exit && 'Exit', g.alert_on_speeding && 'Speed'].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-4 py-3">{g.speed_limit_kmh ? `${g.speed_limit_kmh} km/h` : '-'}</td>
                      <td className="px-4 py-3 font-medium">{fmt(g.recent_events)}</td>
                      <td className="px-4 py-3"><StatusBadge status={g.is_active ? 'active' : 'retired'} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {geofenceEvents.length > 0 && (
                <div className="bg-white rounded-xl border overflow-x-auto">
                  <div className="px-4 py-3 border-b"><h4 className="font-medium text-gray-700">Event Geofence Terbaru</h4></div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">{['Waktu','Geofence','Kendaraan','Driver','Event','Pelanggaran'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody>{geofenceEvents.slice(0, 30).map((ev: any) => (
                      <tr key={ev.id} className={`border-b hover:bg-gray-50 ${ev.is_violation ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 text-xs">{new Date(ev.event_time).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 font-medium">{ev.fence_name}</td>
                        <td className="px-4 py-3">{ev.vehicle_code}</td>
                        <td className="px-4 py-3">{ev.driver_name || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ev.event_type === 'enter' ? 'bg-green-100 text-green-700' : ev.event_type === 'exit' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{ev.event_type?.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3">{ev.is_violation ? <span className="text-red-600 font-medium">Ya</span> : '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ VIOLATIONS ═══ */}
          {!loading && tab === 'violations' && (
            <div className="space-y-6">
              <SectionHeader title="Pelanggaran Driver" onAdd={() => { setForm({ violation_type: 'speeding', severity: 'minor', deduction_points: 1 }); setModal('add-violation'); }} addLabel="Catat Pelanggaran" />
              {violationSummary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border p-5">
                    <h4 className="font-medium text-gray-700 mb-3">Per Tipe (30 Hari)</h4>
                    {!violationSummary.byType?.length ? <p className="text-gray-400 text-sm">Tidak ada pelanggaran</p> :
                      <div className="space-y-2">{violationSummary.byType.map((v: any) => (
                        <div key={v.violation_type} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm capitalize">{v.violation_type?.replace(/_/g, ' ')}</span>
                          <div><span className="font-medium text-sm">{v.count}x</span>{Number(v.total_fines) > 0 && <span className="text-xs text-red-500 ml-2">{fmtRp(v.total_fines)}</span>}</div>
                        </div>
                      ))}</div>}
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <h4 className="font-medium text-gray-700 mb-3">Top Pelanggar (30 Hari)</h4>
                    {!violationSummary.topOffenders?.length ? <p className="text-gray-400 text-sm">Tidak ada data</p> :
                      <div className="space-y-2">{violationSummary.topOffenders.map((d: any, i: number) => (
                        <div key={d.driver_code} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>{i+1}</span><span className="text-sm">{d.full_name}</span></div>
                          <div><span className="font-medium text-sm text-red-600">{d.violation_count}x</span><span className={`ml-2 text-xs ${Number(d.safety_score) >= 80 ? 'text-green-600' : 'text-red-600'}`}>Safety {Number(d.safety_score).toFixed(0)}%</span></div>
                        </div>
                      ))}</div>}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Tanggal','Driver','Kendaraan','Tipe','Tingkat','Kecepatan','Poin','Denda','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{violations.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Tidak ada pelanggaran</td></tr> : violations.map((v: any) => (
                    <tr key={v.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">{new Date(v.violation_date).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 font-medium">{v.full_name}</td>
                      <td className="px-4 py-3">{v.vehicle_code || '-'}</td>
                      <td className="px-4 py-3 capitalize">{v.violation_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.severity === 'critical' ? 'bg-red-100 text-red-700' : v.severity === 'major' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{v.severity}</span></td>
                      <td className="px-4 py-3">{Number(v.speed_kmh) > 0 ? `${fmt(v.speed_kmh)}/${v.speed_limit_kmh || '-'}` : '-'}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">-{v.deduction_points}</td>
                      <td className="px-4 py-3">{Number(v.fine_amount) > 0 ? fmtRp(v.fine_amount) : '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ FLEET ANALYTICS (COMPREHENSIVE) ═══ */}
          {!loading && tab === 'analytics' && (
            <div className="space-y-4">
              {/* Analytics Header: period selector + sub-tabs + actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" />Analitik Armada</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                    {[{v:'7d',l:'7D'},{v:'30d',l:'30D'},{v:'90d',l:'90D'},{v:'6m',l:'6M'},{v:'12m',l:'1Y'},{v:'ytd',l:'YTD'}].map(p=>(
                      <button key={p.v} onClick={()=>handleAnalyticsPeriodChange(p.v)} className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${analyticsPeriod===p.v?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{p.l}</button>
                    ))}
                  </div>
                  <button onClick={handleRefreshKpi} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Refresh KPI"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
                </div>
              </div>
              {/* Analytics sub-tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
                {([
                  {id:'overview',label:'Ringkasan',icon:LayoutDashboard},
                  {id:'cost',label:'Biaya',icon:DollarSign},
                  {id:'fuel',label:'BBM',icon:Fuel},
                  {id:'maintenance',label:'Pemeliharaan',icon:Wrench},
                  {id:'drivers',label:'Driver',icon:Users},
                  {id:'lifecycle',label:'Kendaraan',icon:Truck},
                  {id:'incidents',label:'Insiden',icon:AlertTriangle},
                ] as {id:typeof analyticsSubTab;label:string;icon:any}[]).map(st=>{
                  const I=st.icon;
                  return <button key={st.id} onClick={()=>setAnalyticsSubTab(st.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${analyticsSubTab===st.id?'bg-blue-600 text-white shadow-sm':'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'}`}><I className="w-3.5 h-3.5" />{st.label}</button>;
                })}
              </div>

              {/* ── OVERVIEW SUB-TAB ── */}
              {analyticsSubTab === 'overview' && analyticsOverview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <StatCard icon={Truck} label="Total Kendaraan" value={fmt(analyticsOverview.fleet?.total_vehicles)} color="blue" />
                    <StatCard icon={Activity} label="Digunakan" value={fmt(analyticsOverview.fleet?.in_use)} color="green" sub={`${analyticsOverview.fleet?.utilization_pct||0}% utilisasi`} />
                    <StatCard icon={Wrench} label="Pemeliharaan" value={fmt(analyticsOverview.fleet?.in_maintenance)} color="yellow" />
                    <StatCard icon={DollarSign} label="Total Biaya" value={fmtRp(analyticsOverview.costs?.total_cost)} color="red" sub={analyticsOverview.costs?.change ? `${Number(analyticsOverview.costs.change)>0?'+':''}${analyticsOverview.costs.change}% vs prev` : undefined} />
                    <StatCard icon={Fuel} label="BBM" value={fmtRp(analyticsOverview.fuel?.cost)} color="orange" sub={analyticsOverview.fuel?.change ? `${Number(analyticsOverview.fuel.change)>0?'+':''}${analyticsOverview.fuel.change}% vs prev` : undefined} />
                    <StatCard icon={AlertTriangle} label="Insiden" value={fmt(analyticsOverview.incidents?.total)} color="red" sub={`${fmt(analyticsOverview.incidents?.critical)} kritis`} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Users} label="Driver Aktif" value={fmt(analyticsOverview.drivers?.active)} color="blue" sub={`Safety ${analyticsOverview.drivers?.avg_safety||0}%`} />
                    <StatCard icon={Shield} label="Ketepatan Waktu" value={`${analyticsOverview.drivers?.avg_on_time||0}%`} color="green" />
                    <StatCard icon={Wrench} label="Biaya Pemeliharaan" value={fmtRp(analyticsOverview.maintenance?.cost)} color="purple" sub={`${fmt(analyticsOverview.maintenance?.completed)} selesai`} />
                    <StatCard icon={Zap} label="Pelanggaran" value={fmt(analyticsOverview.violations?.total)} color="red" sub={`Denda ${fmtRp(analyticsOverview.violations?.fines)}`} />
                  </div>
                  {/* Utilization Trend Chart */}
                  {analyticsUtilTrend.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Tren Utilisasi & KPI Harian</h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={analyticsUtilTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="kpi_date" tickFormatter={(v:string)=>v?.slice(5)} tick={CLS} />
                          <YAxis yAxisId="left" tick={CLS} />
                          <YAxis yAxisId="right" orientation="right" tick={CLS} />
                          <Tooltip formatter={(v:number,n:string)=>[n.includes('cost')||n.includes('fuel')?fmtRp(v):fmt(v),n.replace(/_/g,' ')]} />
                          <Legend />
                          <Area yAxisId="left" type="monotone" dataKey="utilization_rate" name="Utilisasi %" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} />
                          <Area yAxisId="right" type="monotone" dataKey="total_fuel_cost" name="Biaya BBM" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} />
                          <Line yAxisId="left" type="monotone" dataKey="total_incidents" name="Insiden" stroke="#EF4444" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={()=>handleAnalyticsExport('kpi-history')} disabled={analyticsExporting} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50"><DownloadIcon className="w-3.5 h-3.5" />Ekspor Riwayat KPI</button>
                  </div>
                </div>
              )}

              {/* ── COST SUB-TAB ── */}
              {analyticsSubTab === 'cost' && analyticsCost && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analyticsCost.byCategory?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-orange-500" />Rincian Kategori Biaya</h4>
                        <div className="flex items-center gap-3">
                          <ResponsiveContainer width="45%" height={200}>
                            <PieChart><Pie data={analyticsCost.byCategory.map((c:any)=>({name:c.cost_category?.replace(/_/g,' '),value:Number(c.total||0)}))} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={65} paddingAngle={3}>
                              {analyticsCost.byCategory.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                            </Pie><Tooltip formatter={(v:number)=>fmtRp(v)} /></PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">{analyticsCost.byCategory.map((c:any,i:number)=>(
                            <div key={c.cost_category} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="capitalize text-gray-600">{c.cost_category?.replace(/_/g,' ')}</span></div>
                              <span className="font-semibold">{fmtRp(c.total)}</span>
                            </div>
                          ))}</div>
                        </div>
                      </div>
                    )}
                    {analyticsCost.trend?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Tren Biaya Bulanan</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={(() => { const m: any = {}; analyticsCost.trend.forEach((r:any)=>{ if(!m[r.month]) m[r.month]={month:r.month}; m[r.month][r.cost_category||'other']=Number(r.total||0); }); return Object.values(m); })()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={(v:string)=>v?.slice(5)} tick={CLS} /><YAxis tick={CLS} tickFormatter={(v:number)=>`${(v/1e6).toFixed(0)}M`} />
                            <Tooltip formatter={(v:number)=>fmtRp(v)} /><Legend />
                            {[...new Set(analyticsCost.trend.map((r:any)=>r.cost_category))].map((cat:any,i:number)=>
                              <Bar key={cat} dataKey={cat} name={cat?.replace(/_/g,' ')} fill={CHART_COLORS[i%CHART_COLORS.length]} stackId="a" />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  {analyticsCost.topVehicles?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700 flex items-center gap-2"><Truck className="w-4 h-4 text-red-500" />Top 10 Kendaraan Termahal</h4>
                        <button onClick={()=>handleAnalyticsExport('cost-summary')} disabled={analyticsExporting} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"><DownloadIcon className="w-3 h-3" />Export</button>
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead><tr className="border-b">{['Kendaraan','Plat','Tipe','Jumlah Record','Total Biaya'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                        <tbody>{analyticsCost.topVehicles.map((v:any)=>(
                          <tr key={v.vehicle_code} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{v.vehicle_code}</td><td className="px-3 py-2">{v.license_plate}</td><td className="px-3 py-2 capitalize">{v.vehicle_type}</td>
                            <td className="px-3 py-2">{v.record_count}</td><td className="px-3 py-2 font-bold text-red-600">{fmtRp(v.total_cost)}</td>
                          </tr>))}</tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FUEL SUB-TAB ── */}
              {analyticsSubTab === 'fuel' && analyticsFuel && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analyticsFuel.trend?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" />Tren BBM Bulanan</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={analyticsFuel.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={(v:string)=>v?.slice(5)} tick={CLS} />
                            <YAxis yAxisId="left" tick={CLS} tickFormatter={(v:number)=>`${(v/1e6).toFixed(0)}M`} /><YAxis yAxisId="right" orientation="right" tick={CLS} />
                            <Tooltip formatter={(v:number,n:string)=>[n==='cost'?fmtRp(v):fmt(v)+' L',n==='cost'?'Biaya':n==='liters'?'Liter':'Isi']} /><Legend />
                            <Area yAxisId="left" type="monotone" dataKey="cost" name="Biaya" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                            <Line yAxisId="right" type="monotone" dataKey="liters" name="Liter" stroke="#3B82F6" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {analyticsFuel.byFuelType?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-green-500" />Konsumsi per Jenis BBM</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analyticsFuel.byFuelType} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={CLS} tickFormatter={(v:number)=>`${(v/1e6).toFixed(0)}M`} />
                            <YAxis type="category" dataKey="fuel_type" width={70} tick={CLS} /><Tooltip formatter={(v:number)=>fmtRp(v)} />
                            <Bar dataKey="cost" name="Biaya" fill="#10B981" radius={[0,4,4,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  {analyticsFuel.byVehicle?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700 flex items-center gap-2"><Fuel className="w-4 h-4 text-orange-500" />Efisiensi BBM per Kendaraan</h4>
                        <button onClick={()=>handleAnalyticsExport('fuel-summary')} disabled={analyticsExporting} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"><DownloadIcon className="w-3 h-3" />Export</button>
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead><tr className="border-b">{['Kendaraan','Plat','Tipe','Isi','Total Liter','Total Biaya','Jarak','Avg km/L'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                        <tbody>{analyticsFuel.byVehicle.map((f:any)=>(
                          <tr key={f.vehicle_code} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{f.vehicle_code}</td><td className="px-3 py-2">{f.license_plate}</td><td className="px-3 py-2 capitalize">{f.vehicle_type}</td>
                            <td className="px-3 py-2">{f.fill_count}x</td><td className="px-3 py-2">{fmt(f.total_liters)} L</td><td className="px-3 py-2 font-medium">{fmtRp(f.total_cost)}</td>
                            <td className="px-3 py-2">{fmt(f.distance_km)} km</td>
                            <td className="px-3 py-2"><span className={`font-medium ${Number(f.avg_consumption)>=8?'text-green-600':Number(f.avg_consumption)>=5?'text-yellow-600':'text-red-600'}`}>{Number(f.avg_consumption).toFixed(1)}</span></td>
                          </tr>))}</tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MAINTENANCE SUB-TAB ── */}
              {analyticsSubTab === 'maintenance' && analyticsMaint && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analyticsMaint.trend?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" />Tren Biaya Pemeliharaan</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analyticsMaint.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={(v:string)=>v?.slice(5)} tick={CLS} />
                            <YAxis tick={CLS} tickFormatter={(v:number)=>`${(v/1e6).toFixed(0)}M`} /><Tooltip formatter={(v:number)=>fmtRp(v)} /><Legend />
                            <Bar dataKey="parts" name="Suku Cadang" fill="#8B5CF6" stackId="a" /><Bar dataKey="labor" name="Tenaga Kerja" fill="#06B6D4" stackId="a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {analyticsMaint.byCategory?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-blue-500" />Pemeliharaan per Kategori</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart><Pie data={analyticsMaint.byCategory.map((c:any)=>({name:c.category?.replace(/_/g,' '),value:Number(c.cost||0)}))} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                            {analyticsMaint.byCategory.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                          </Pie><Tooltip formatter={(v:number)=>fmtRp(v)} /><Legend /></PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  {analyticsMaint.topVehicles?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700 flex items-center gap-2"><Wrench className="w-4 h-4 text-yellow-500" />Kendaraan Teratas Biaya Pemeliharaan</h4>
                        <button onClick={()=>handleAnalyticsExport('maintenance-summary')} disabled={analyticsExporting} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"><DownloadIcon className="w-3 h-3" />Export</button>
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead><tr className="border-b">{['Kendaraan','Plat','Jumlah WO','Total Biaya','Rata-rata Downtime'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                        <tbody>{analyticsMaint.topVehicles.map((v:any)=>(
                          <tr key={v.vehicle_code} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{v.vehicle_code}</td><td className="px-3 py-2">{v.license_plate}</td>
                            <td className="px-3 py-2">{v.maint_count}</td><td className="px-3 py-2 font-bold text-purple-600">{fmtRp(v.total_cost)}</td>
                            <td className="px-3 py-2">{v.avg_downtime || 0} jam</td>
                          </tr>))}</tbody>
                      </table></div>
                    </div>
                  )}
                  {analyticsMaint.byVendor?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3">Vendor Pemeliharaan Teratas</h4>
                      <div className="space-y-2">{analyticsMaint.byVendor.map((v:any,i:number)=>(
                        <div key={v.vendor_name} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i+1}</span><span className="text-sm font-medium">{v.vendor_name}</span><span className="text-xs text-gray-400">{v.count} WO</span></div>
                          <span className="text-sm font-semibold">{fmtRp(v.cost)}</span>
                        </div>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DRIVER SUB-TAB ── */}
              {analyticsSubTab === 'drivers' && analyticsDriver && (
                <div className="space-y-4">
                  {analyticsDriver.safetyDistribution?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {analyticsDriver.safetyDistribution.map((s:any)=>{
                        const colors: Record<string,{bg:string;text:string;icon:any}> = {excellent:{bg:'bg-green-50',text:'text-green-700',icon:CheckCircle},good:{bg:'bg-blue-50',text:'text-blue-700',icon:Shield},fair:{bg:'bg-yellow-50',text:'text-yellow-700',icon:AlertCircle},poor:{bg:'bg-red-50',text:'text-red-700',icon:XCircle}};
                        const c = colors[s.grade] || colors.fair; const I = c.icon;
                        return <div key={s.grade} className={`${c.bg} rounded-xl border p-3`}><div className="flex items-center gap-2"><I className={`w-5 h-5 ${c.text}`} /><div><p className={`text-lg font-bold ${c.text}`}>{s.count}</p><p className="text-xs text-gray-500 capitalize">{s.grade}</p></div></div></div>;
                      })}
                    </div>
                  )}
                  {analyticsDriver.leaderboard?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Peringkat Driver</h4>
                        <button onClick={()=>handleAnalyticsExport('driver-scorecard')} disabled={analyticsExporting} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"><DownloadIcon className="w-3 h-3" />Export</button>
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead><tr className="border-b">{['#','Driver','Status','Trip','Jarak','Safety','On-Time','Pelanggaran','Rating'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                        <tbody>{analyticsDriver.leaderboard.map((d:any,i:number)=>(
                          <tr key={d.id} className={`border-b hover:bg-gray-50 ${i<3?'bg-yellow-50/30':''}`}>
                            <td className="px-3 py-2"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i<3?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-600'}`}>{i+1}</span></td>
                            <td className="px-3 py-2 font-medium">{d.full_name}<span className="text-xs text-gray-400 ml-1">{d.driver_code}</span></td>
                            <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                            <td className="px-3 py-2">{fmt(d.total_trips)}</td><td className="px-3 py-2">{fmt(d.total_distance_km)} km</td>
                            <td className="px-3 py-2"><span className={`font-bold ${Number(d.safety_score)>=80?'text-green-600':Number(d.safety_score)>=50?'text-yellow-600':'text-red-600'}`}>{Number(d.safety_score).toFixed(0)}</span></td>
                            <td className="px-3 py-2">{Number(d.on_time_rate).toFixed(0)}%</td>
                            <td className="px-3 py-2">{Number(d.period_violations)>0?<span className="text-red-600 font-medium">{d.period_violations}</span>:'0'}</td>
                            <td className="px-3 py-2">{Number(d.customer_rating)>0?`${Number(d.customer_rating).toFixed(1)}★`:'-'}</td>
                          </tr>))}</tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              )}

              {/* ── LIFECYCLE / TCO SUB-TAB ── */}
              {analyticsSubTab === 'lifecycle' && analyticsLifecycle && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {analyticsLifecycle.ageDistribution?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3">Distribusi Umur</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart><Pie data={analyticsLifecycle.ageDistribution.map((a:any)=>({name:a.age_group,value:Number(a.count)}))} dataKey="value" cx="50%" cy="50%" outerRadius={65}>
                            {analyticsLifecycle.ageDistribution.map((_:any,i:number)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                          </Pie><Tooltip /><Legend /></PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {analyticsLifecycle.byOwnership?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3">Kepemilikan</h4>
                        <div className="space-y-3">{analyticsLifecycle.byOwnership.map((o:any)=>(
                          <div key={o.ownership_type} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between"><span className="font-medium capitalize text-sm">{o.ownership_type||'N/A'}</span><span className="text-sm text-gray-500">{o.count} unit</span></div>
                            <div className="text-xs text-gray-500 mt-1">Nilai: {fmtRp(o.total_value)}</div>
                          </div>
                        ))}</div>
                      </div>
                    )}
                    {analyticsLifecycle.byType?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3">Per Tipe Kendaraan</h4>
                        <div className="space-y-3">{analyticsLifecycle.byType.map((v:any)=>(
                          <div key={v.vehicle_type} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between"><span className="font-medium capitalize text-sm">{v.vehicle_type}</span><span className="text-sm text-gray-500">{v.count} unit</span></div>
                            <div className="text-xs text-gray-500 mt-1">Avg Umur {v.avg_age} thn | Kondisi {v.avg_condition}/5</div>
                          </div>
                        ))}</div>
                      </div>
                    )}
                  </div>
                  {analyticsLifecycle.tco?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-gray-700 flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-500" />Total Cost of Ownership (TCO)</h4>
                        <button onClick={()=>handleAnalyticsExport('vehicle-tco')} disabled={analyticsExporting} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50"><DownloadIcon className="w-3 h-3" />Export</button>
                      </div>
                      <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead><tr className="border-b">{['Kendaraan','Tipe','Tahun','Odometer','BBM (Periode)','Pemeliharaan (Periode)','Insiden (Periode)','Biaya Seumur Hidup'].map(h=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
                        <tbody>{analyticsLifecycle.tco.slice(0,15).map((v:any)=>(
                          <tr key={v.vehicle_code} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{v.vehicle_code}</td><td className="px-3 py-2 capitalize">{v.vehicle_type}</td><td className="px-3 py-2">{v.year||'-'}</td>
                            <td className="px-3 py-2">{fmt(v.odometer)} km</td>
                            <td className="px-3 py-2">{fmtRp(v.period_fuel)}</td><td className="px-3 py-2">{fmtRp(v.period_maint)}</td><td className="px-3 py-2">{fmtRp(v.period_incident)}</td>
                            <td className="px-3 py-2 font-bold text-red-600">{fmtRp(v.lifetime_cost)}</td>
                          </tr>))}</tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              )}

              {/* ── INCIDENTS SUB-TAB ── */}
              {analyticsSubTab === 'incidents' && analyticsIncident && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analyticsIncident.byType?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Insiden per Tipe</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={analyticsIncident.byType} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={CLS} />
                            <YAxis type="category" dataKey="incident_type" width={100} tick={CLS} /><Tooltip formatter={(v:number,n:string)=>[n==='cost'?fmtRp(v):v,n==='cost'?'Biaya':'Jumlah']} />
                            <Bar dataKey="count" name="Jumlah" fill="#EF4444" radius={[0,4,4,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {analyticsIncident.trend?.length > 0 && (
                      <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-orange-500" />Tren Insiden</h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={analyticsIncident.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tickFormatter={(v:string)=>v?.slice(5)} tick={CLS} />
                            <YAxis yAxisId="left" tick={CLS} /><YAxis yAxisId="right" orientation="right" tick={CLS} tickFormatter={(v:number)=>`${(v/1e6).toFixed(0)}M`} />
                            <Tooltip formatter={(v:number,n:string)=>[n==='cost'?fmtRp(v):v,n==='cost'?'Biaya':'Jumlah']} /><Legend />
                            <Area yAxisId="left" type="monotone" dataKey="count" name="Jumlah" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} />
                            <Line yAxisId="right" type="monotone" dataKey="cost" name="Biaya" stroke="#F59E0B" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  {analyticsIncident.bySeverity?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {analyticsIncident.bySeverity.map((s:any)=>{
                        const sc: Record<string,string> = {critical:'red',major:'orange',minor:'yellow',negligible:'gray'};
                        return <StatCard key={s.severity} icon={AlertCircle} label={s.severity||'N/A'} value={s.count} color={sc[s.severity]||'gray'} sub={fmtRp(s.cost)} />;
                      })}
                    </div>
                  )}
                  {analyticsIncident.byDriver?.length > 0 && (
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3">Driver dengan Insiden Terbanyak</h4>
                      <div className="space-y-2">{analyticsIncident.byDriver.map((d:any,i:number)=>(
                        <div key={d.driver_code} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i<3?'bg-red-100 text-red-700':'bg-gray-200 text-gray-600'}`}>{i+1}</span><span className="text-sm font-medium">{d.full_name}</span><span className="text-xs text-gray-400">{d.count} insiden</span></div>
                          <span className="text-sm font-semibold text-red-600">{fmtRp(d.cost)}</span>
                        </div>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ TIRES ═══ */}
          {!loading && tab === 'tires' && (
            <div className="space-y-6">
              <SectionHeader title="Manajemen Ban" onAdd={() => { setForm({ type: 'radial', status: 'in_use', max_km: 50000, current_tread_depth: 8, min_tread_depth: 2 }); setModal('add-tire'); }} addLabel="Tambah Ban" />
              {tireSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <StatCard icon={Disc} label="Total Ban" value={fmt(tireSummary.total)} color="blue" />
                  <StatCard icon={CheckCircle} label="Terpasang" value={fmt(tireSummary.in_use)} color="green" />
                  <StatCard icon={Package} label="Spare" value={fmt(tireSummary.spare)} color="yellow" />
                  <StatCard icon={RefreshCw} label="Retread" value={fmt(tireSummary.retread)} color="purple" />
                  <StatCard icon={XCircle} label="Dibuang" value={fmt(tireSummary.disposed)} color="gray" />
                  <StatCard icon={AlertTriangle} label="Perlu Ganti" value={fmt(tireSummary.need_replace)} color="red" />
                </div>
              )}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Serial','Kendaraan','Posisi','Merk','Ukuran','Tipe','Tread','Maks km','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{tires.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Belum ada data ban</td></tr> : tires.map((t: any) => {
                    const lowTread = Number(t.current_tread_depth) <= Number(t.min_tread_depth);
                    return (
                      <tr key={t.id} className={`border-b hover:bg-gray-50 ${lowTread ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-medium font-mono text-xs">{t.tire_serial}</td>
                        <td className="px-4 py-3">{t.vehicle_code || '-'}</td>
                        <td className="px-4 py-3">{t.position || '-'}</td>
                        <td className="px-4 py-3">{t.brand} {t.model || ''}</td>
                        <td className="px-4 py-3">{t.size || '-'}</td>
                        <td className="px-4 py-3 capitalize">{t.type || '-'}</td>
                        <td className="px-4 py-3"><span className={`font-medium ${lowTread ? 'text-red-600' : 'text-green-600'}`}>{Number(t.current_tread_depth).toFixed(1)}mm</span><span className="text-xs text-gray-400"> / min {Number(t.min_tread_depth).toFixed(1)}</span></td>
                        <td className="px-4 py-3">{fmt(t.max_km)} km</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ REMINDERS ═══ */}
          {!loading && tab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pengingat & Jadwal Pemeliharaan</h3>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { const r = await apiE('generate-reminders', 'POST'); showToast(r.message || 'Done'); fetchData(); }} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"><Zap className="w-4 h-4" />Buat Otomatis</button>
                  <button onClick={() => { setForm({ reminder_type: 'maintenance_due', entity_type: 'vehicle', priority: 'medium', days_before: 7 }); setModal('add-reminder'); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />Tambah Pengingat</button>
                  <button onClick={() => { setForm({ schedule_type: 'time_based', maintenance_type: 'general', alert_before_days: 7 }); setModal('add-schedule'); }} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Plus className="w-4 h-4" />Jadwal Pemeliharaan</button>
                </div>
              </div>
              {/* Active Reminders */}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <div className="px-4 py-3 border-b"><h4 className="font-medium text-gray-700 flex items-center gap-2"><Bell className="w-4 h-4" />Pengingat Aktif</h4></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Tipe','Entitas','Judul','Jatuh Tempo','Prioritas','Status','Aksi'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{reminders.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada pengingat aktif</td></tr> : reminders.map((r: any) => {
                    const overdue = r.due_date && new Date(r.due_date) < new Date();
                    return (
                      <tr key={r.id} className={`border-b hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 capitalize text-xs">{r.reminder_type?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">{r.entity_code || '-'} {r.entity_name ? `(${r.entity_name})` : ''}</td>
                        <td className="px-4 py-3 font-medium">{r.title}</td>
                        <td className="px-4 py-3"><span className={overdue ? 'text-red-600 font-medium' : ''}>{fmtDate(r.due_date)}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.priority === 'critical' ? 'bg-red-100 text-red-700' : r.priority === 'high' ? 'bg-orange-100 text-orange-700' : r.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{r.priority}</span></td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3">{r.status !== 'resolved' && <button onClick={async () => { await apiE('resolve-reminder', 'PUT', { id: r.id }); showToast('Diselesaikan'); fetchData(); }} className="text-xs text-green-600 hover:underline">Selesaikan</button>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {/* Maintenance Schedules */}
              <div className="bg-white rounded-xl border overflow-x-auto">
                <div className="px-4 py-3 border-b"><h4 className="font-medium text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4" />Jadwal Pemeliharaan</h4></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Kendaraan','Plat','Tipe Pemeliharaan','Interval','Jatuh Tempo','Odometer','Est. Biaya','Urgensi'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody>{schedules.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada jadwal</td></tr> : schedules.map((s: any) => (
                    <tr key={s.id} className={`border-b hover:bg-gray-50 ${s.urgency === 'overdue' ? 'bg-red-50' : s.urgency === 'due_soon' ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{s.vehicle_code}</td>
                      <td className="px-4 py-3">{s.license_plate}</td>
                      <td className="px-4 py-3 capitalize">{s.maintenance_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-xs">{s.interval_km ? `${fmt(s.interval_km)} km` : ''}{s.interval_days ? ` / ${s.interval_days} hari` : ''}</td>
                      <td className="px-4 py-3">{fmtDate(s.next_due_at)}</td>
                      <td className="px-4 py-3">{fmt(s.current_odometer_km)} km</td>
                      <td className="px-4 py-3">{Number(s.estimated_cost) > 0 ? fmtRp(s.estimated_cost) : '-'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.urgency === 'overdue' ? 'bg-red-100 text-red-700' : s.urgency === 'due_soon' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{s.urgency === 'overdue' ? 'Terlambat' : s.urgency === 'due_soon' ? 'Segera' : 'OK'}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modal === 'add-vehicle' ? 'Tambah Kendaraan' : modal === 'add-driver' ? 'Tambah Driver' : modal === 'add-maintenance' ? 'Buat Work Order' : modal === 'add-fuel' ? 'Catat Pengisian BBM' : modal === 'add-rental' ? 'Buat Kontrak Rental' : modal === 'add-inspection' ? 'Buat Inspeksi' : modal === 'add-incident' ? 'Lapor Insiden' : modal === 'add-cost' ? 'Catat Biaya' : modal === 'add-document' ? 'Tambah Dokumen' : modal === 'assign-vehicle' ? 'Tugaskan Kendaraan ke Driver' : modal === 'add-geofence' ? 'Tambah Geofence' : modal === 'add-tire' ? 'Tambah Ban' : modal === 'add-violation' ? 'Catat Pelanggaran' : modal === 'add-reminder' ? 'Buat Pengingat' : modal === 'add-schedule' ? 'Jadwal Pemeliharaan' : modal === 'add-rental-payment' ? 'Catat Pembayaran Rental' : 'Form'}
                </h3>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                {modal === 'add-vehicle' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode Kendaraan *</label><input required className={inputCls} value={form.vehicle_code || ''} onChange={e => setForm({...form, vehicle_code: e.target.value})} placeholder="VH-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Plat Nomor *</label><input required className={inputCls} value={form.license_plate || ''} onChange={e => setForm({...form, license_plate: e.target.value.toUpperCase()})} placeholder="B 1234 ABC" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.vehicle_type || 'truck'} onChange={e => setForm({...form, vehicle_type: e.target.value})}><option value="truck">Truck</option><option value="van">Van</option><option value="bus">Bus</option><option value="car">Mobil</option><option value="motorcycle">Motor</option><option value="heavy_equipment">Alat Berat</option><option value="trailer">Trailer</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kategori</label><select className={inputCls} value={form.vehicle_category || 'delivery'} onChange={e => setForm({...form, vehicle_category: e.target.value})}><option value="delivery">Delivery</option><option value="rental">Rental</option><option value="operational">Operasional</option><option value="executive">Executive</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Merk</label><input className={inputCls} value={form.brand || ''} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Hino" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Model</label><input className={inputCls} value={form.model || ''} onChange={e => setForm({...form, model: e.target.value})} placeholder="Dutro 130HD" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tahun</label><input type="number" className={inputCls} value={form.year || ''} onChange={e => setForm({...form, year: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">BBM</label><select className={inputCls} value={form.fuel_type || 'diesel'} onChange={e => setForm({...form, fuel_type: e.target.value})}><option value="diesel">Solar/Diesel</option><option value="petrol">Bensin</option><option value="electric">Listrik</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kepemilikan</label><select className={inputCls} value={form.ownership_type || 'owned'} onChange={e => setForm({...form, ownership_type: e.target.value})}><option value="owned">Milik Sendiri</option><option value="leased">Leasing</option><option value="rented">Rental</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Maks Berat (kg)</label><input type="number" className={inputCls} value={form.max_weight_kg || ''} onChange={e => setForm({...form, max_weight_kg: parseFloat(e.target.value)})} /></div>
                  </div>
                </>}

                {modal === 'add-driver' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode Driver *</label><input required className={inputCls} value={form.driver_code || ''} onChange={e => setForm({...form, driver_code: e.target.value})} placeholder="DRV-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama Lengkap *</label><input required className={inputCls} value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telepon</label><input className={inputCls} value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="08xx" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Email</label><input type="email" className={inputCls} value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">No. SIM</label><input className={inputCls} value={form.license_number || ''} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe SIM</label><select className={inputCls} value={form.license_type || 'SIM B1'} onChange={e => setForm({...form, license_type: e.target.value})}><option value="SIM A">SIM A</option><option value="SIM B1">SIM B1</option><option value="SIM B2">SIM B2</option><option value="SIM C">SIM C</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">SIM Kedaluwarsa</label><input type="date" className={inputCls} value={form.license_expiry_date || ''} onChange={e => setForm({...form, license_expiry_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe Kontrak</label><select className={inputCls} value={form.employment_type || 'permanent'} onChange={e => setForm({...form, employment_type: e.target.value})}><option value="permanent">Tetap</option><option value="contract">Kontrak</option><option value="freelance">Freelance</option><option value="outsource">Outsource</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Gaji Pokok</label><input type="number" className={inputCls} value={form.base_salary || ''} onChange={e => setForm({...form, base_salary: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Uang Jalan/Trip</label><input type="number" className={inputCls} value={form.allowance_per_trip || ''} onChange={e => setForm({...form, allowance_per_trip: parseFloat(e.target.value)})} /></div>
                  </div>
                </>}

                {modal === 'add-maintenance' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.maintenance_type || 'general'} onChange={e => setForm({...form, maintenance_type: e.target.value})}><option value="general">General</option><option value="oil_change">Ganti Oli</option><option value="tire_rotation">Rotasi Ban</option><option value="brake_check">Cek Rem</option><option value="full_service">Full Service</option><option value="kir_renewal">Perpanjangan KIR</option><option value="engine_repair">Perbaikan Mesin</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kategori</label><select className={inputCls} value={form.category || 'preventive'} onChange={e => setForm({...form, category: e.target.value})}><option value="preventive">Preventif</option><option value="corrective">Korektif</option><option value="emergency">Darurat</option><option value="accident_repair">Perbaikan Kecelakaan</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Prioritas</label><select className={inputCls} value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Vendor</label><input className={inputCls} value={form.vendor_name || ''} onChange={e => setForm({...form, vendor_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Biaya Parts</label><input type="number" className={inputCls} value={form.parts_cost || ''} onChange={e => setForm({...form, parts_cost: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Biaya Jasa</label><input type="number" className={inputCls} value={form.labor_cost || ''} onChange={e => setForm({...form, labor_cost: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className={inputCls} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-fuel' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Driver</label><select className={inputCls} value={form.driver_id || ''} onChange={e => setForm({...form, driver_id: e.target.value})}><option value="">Pilih</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jenis BBM</label><select className={inputCls} value={form.fuel_type || 'diesel'} onChange={e => setForm({...form, fuel_type: e.target.value})}><option value="diesel">Solar</option><option value="dexlite">Dexlite</option><option value="pertamax">Pertamax</option><option value="pertalite">Pertalite</option><option value="petrol">Premium</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jumlah (Liter)</label><input required type="number" step="0.01" className={inputCls} value={form.quantity_liters || ''} onChange={e => setForm({...form, quantity_liters: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Harga/Liter</label><input required type="number" className={inputCls} value={form.price_per_liter || ''} onChange={e => setForm({...form, price_per_liter: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Odometer (km)</label><input type="number" className={inputCls} value={form.odometer_reading || ''} onChange={e => setForm({...form, odometer_reading: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">SPBU</label><input className={inputCls} value={form.station_name || ''} onChange={e => setForm({...form, station_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Pembayaran</label><select className={inputCls} value={form.payment_method || 'cash'} onChange={e => setForm({...form, payment_method: e.target.value})}><option value="cash">Cash</option><option value="fuel_card">Kartu BBM</option><option value="transfer">Transfer</option></select></div>
                  </div>
                </>}

                {modal === 'add-rental' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.rental_type || 'rent_out'} onChange={e => setForm({...form, rental_type: e.target.value})}><option value="rent_out">Sewa Keluar (ke Customer)</option><option value="rent_in">Sewa Masuk (dari Vendor)</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.filter(v => v.status === 'available').map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">{form.rental_type === 'rent_out' ? 'Nama Customer' : 'Nama Vendor'} *</label><input required className={inputCls} value={form.customer_name || ''} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Telepon</label><input className={inputCls} value={form.customer_phone || ''} onChange={e => setForm({...form, customer_phone: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Mulai *</label><input required type="date" className={inputCls} value={form.start_date || ''} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Selesai *</label><input required type="date" className={inputCls} value={form.end_date || ''} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Kontrak</label><select className={inputCls} value={form.contract_type || 'daily'} onChange={e => setForm({...form, contract_type: e.target.value})}><option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option><option value="project_based">Per Proyek</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jumlah Tarif</label><input type="number" className={inputCls} value={form.rate_amount || ''} onChange={e => setForm({...form, rate_amount: parseFloat(e.target.value), total_amount: parseFloat(e.target.value)})} /></div>
                    <div><label className="flex items-center gap-2 mt-5"><input type="checkbox" checked={form.include_driver || false} onChange={e => setForm({...form, include_driver: e.target.checked})} /><span className="text-sm">Termasuk Driver</span></label></div>
                    <div><label className="flex items-center gap-2 mt-5"><input type="checkbox" checked={form.include_fuel || false} onChange={e => setForm({...form, include_fuel: e.target.checked})} /><span className="text-sm">Termasuk BBM</span></label></div>
                  </div>
                </>}

                {modal === 'add-inspection' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.inspection_type || 'pre_trip'} onChange={e => setForm({...form, inspection_type: e.target.value})}><option value="pre_trip">Pre-Trip</option><option value="post_trip">Post-Trip</option><option value="periodic">Periodik</option><option value="annual">Tahunan</option><option value="kir">KIR</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Inspector</label><input className={inputCls} value={form.inspector_name || ''} onChange={e => setForm({...form, inspector_name: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Catatan</label><input className={inputCls} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-incident' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.incident_type || 'accident'} onChange={e => setForm({...form, incident_type: e.target.value})}><option value="accident">Kecelakaan</option><option value="breakdown">Mogok</option><option value="theft">Pencurian</option><option value="vandalism">Vandalisme</option><option value="traffic_violation">Pelanggaran Lalu Lintas</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tingkat</label><select className={inputCls} value={form.severity || 'minor'} onChange={e => setForm({...form, severity: e.target.value})}><option value="minor">Ringan</option><option value="moderate">Sedang</option><option value="major">Berat</option><option value="total_loss">Total Loss</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Lokasi</label><input className={inputCls} value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Biaya Perbaikan</label><input type="number" className={inputCls} value={form.repair_cost || ''} onChange={e => setForm({...form, repair_cost: parseFloat(e.target.value), total_cost: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><textarea className={inputCls} rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-cost' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kategori</label><select className={inputCls} value={form.cost_category || 'other'} onChange={e => setForm({...form, cost_category: e.target.value})}><option value="toll">Tol</option><option value="parking">Parkir</option><option value="tax">Pajak</option><option value="insurance">Asuransi</option><option value="tire">Ban</option><option value="penalty">Denda</option><option value="depreciation">Depresiasi</option><option value="other">Lainnya</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tanggal</label><input type="date" className={inputCls} value={form.cost_date || new Date().toISOString().slice(0,10)} onChange={e => setForm({...form, cost_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Jumlah (Rp) *</label><input required type="number" className={inputCls} value={form.amount || ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">No. Kwitansi</label><input className={inputCls} value={form.receipt_number || ''} onChange={e => setForm({...form, receipt_number: e.target.value})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className={inputCls} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-document' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Entitas</label><select className={inputCls} value={form.entity_type || 'vehicle'} onChange={e => setForm({...form, entity_type: e.target.value, entity_id: ''})}><option value="vehicle">Kendaraan</option><option value="driver">Driver</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">{form.entity_type === 'vehicle' ? 'Kendaraan' : 'Driver'} *</label><select required className={inputCls} value={form.entity_id || ''} onChange={e => setForm({...form, entity_id: e.target.value})}><option value="">Pilih</option>{form.entity_type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code}</option>) : drivers.map(d => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe Dokumen</label><select className={inputCls} value={form.document_type || 'stnk'} onChange={e => setForm({...form, document_type: e.target.value})}><option value="stnk">STNK</option><option value="bpkb">BPKB</option><option value="kir">KIR</option><option value="sim">SIM</option><option value="insurance">Asuransi</option><option value="contract">Kontrak</option><option value="permit">Izin</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">No. Dokumen</label><input className={inputCls} value={form.document_number || ''} onChange={e => setForm({...form, document_number: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tanggal Terbit</label><input type="date" className={inputCls} value={form.issued_date || ''} onChange={e => setForm({...form, issued_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tanggal Kedaluwarsa</label><input type="date" className={inputCls} value={form.expiry_date || ''} onChange={e => setForm({...form, expiry_date: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'assign-vehicle' && <>
                  <div className="grid grid-cols-1 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Driver *</label><select required className={inputCls} value={form.driver_id || ''} onChange={e => setForm({...form, driver_id: e.target.value})}><option value="">Pilih Driver</option>{drivers.filter(d => d.availability === 'available').map(d => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Alasan</label><input className={inputCls} value={form.reason || ''} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Penugasan baru" /></div>
                  </div>
                </>}

                {modal === 'add-geofence' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Kode *</label><input required className={inputCls} value={form.fence_code || ''} onChange={e => setForm({...form, fence_code: e.target.value})} placeholder="GF-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Nama *</label><input required className={inputCls} value={form.fence_name || ''} onChange={e => setForm({...form, fence_name: e.target.value})} placeholder="Depot Jakarta" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.fence_type || 'circle'} onChange={e => setForm({...form, fence_type: e.target.value})}><option value="circle">Lingkaran</option><option value="polygon">Polygon</option><option value="route_corridor">Koridor Rute</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kategori</label><select className={inputCls} value={form.category || 'depot'} onChange={e => setForm({...form, category: e.target.value})}><option value="depot">Depot</option><option value="customer">Customer</option><option value="restricted">Terbatas</option><option value="speed_zone">Zona Kecepatan</option><option value="rest_area">Tempat Istirahat</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Lat</label><input type="number" step="0.0000001" className={inputCls} value={form.center_lat || ''} onChange={e => setForm({...form, center_lat: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Lng</label><input type="number" step="0.0000001" className={inputCls} value={form.center_lng || ''} onChange={e => setForm({...form, center_lng: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Radius (m)</label><input type="number" className={inputCls} value={form.radius_m || 500} onChange={e => setForm({...form, radius_m: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Batas Kecepatan (km/h)</label><input type="number" className={inputCls} value={form.speed_limit_kmh || ''} onChange={e => setForm({...form, speed_limit_kmh: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Warna</label><input type="color" className="w-full h-9 rounded-lg border border-gray-200" value={form.color || '#3B82F6'} onChange={e => setForm({...form, color: e.target.value})} /></div>
                    <div className="flex flex-col gap-2 justify-center">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.alert_on_enter !== false} onChange={e => setForm({...form, alert_on_enter: e.target.checked})} /><span className="text-xs">Peringatan Masuk</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.alert_on_exit !== false} onChange={e => setForm({...form, alert_on_exit: e.target.checked})} /><span className="text-xs">Peringatan Keluar</span></label>
                    </div>
                  </div>
                </>}

                {modal === 'add-tire' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Serial Ban *</label><input required className={inputCls} value={form.tire_serial || ''} onChange={e => setForm({...form, tire_serial: e.target.value})} placeholder="TIR-001" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Kendaraan</label><select className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih (opsional)</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Posisi</label><input className={inputCls} value={form.position || ''} onChange={e => setForm({...form, position: e.target.value})} placeholder="FL, FR, RL, RR" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Merk *</label><input required className={inputCls} value={form.brand || ''} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Bridgestone" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Model</label><input className={inputCls} value={form.model || ''} onChange={e => setForm({...form, model: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Ukuran</label><input className={inputCls} value={form.size || ''} onChange={e => setForm({...form, size: e.target.value})} placeholder="295/80R22.5" /></div>
                    <div><label className="text-xs font-medium text-gray-600">Maks KM</label><input type="number" className={inputCls} value={form.max_km || 50000} onChange={e => setForm({...form, max_km: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Harga Beli</label><input type="number" className={inputCls} value={form.purchase_price || ''} onChange={e => setForm({...form, purchase_price: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Kedalaman Tapak (mm)</label><input type="number" step="0.1" className={inputCls} value={form.current_tread_depth || 8} onChange={e => setForm({...form, current_tread_depth: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Min Tapak (mm)</label><input type="number" step="0.1" className={inputCls} value={form.min_tread_depth || 2} onChange={e => setForm({...form, min_tread_depth: parseFloat(e.target.value)})} /></div>
                  </div>
                </>}

                {modal === 'add-violation' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Driver *</label><select required className={inputCls} value={form.driver_id || ''} onChange={e => setForm({...form, driver_id: e.target.value})}><option value="">Pilih</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kendaraan</label><select className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.violation_type || 'speeding'} onChange={e => setForm({...form, violation_type: e.target.value})}><option value="speeding">Ngebut</option><option value="harsh_braking">Pengereman Keras</option><option value="harsh_acceleration">Akselerasi Keras</option><option value="idle_excess">Idle Berlebih</option><option value="unauthorized_stop">Berhenti Tidak Sah</option><option value="route_deviation">Deviasi Rute</option><option value="fatigue_driving">Mengemudi Kelelahan</option><option value="phone_use">Penggunaan HP</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tingkat</label><select className={inputCls} value={form.severity || 'minor'} onChange={e => setForm({...form, severity: e.target.value})}><option value="warning">Peringatan</option><option value="minor">Ringan</option><option value="major">Berat</option><option value="critical">Kritis</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Kecepatan (km/h)</label><input type="number" className={inputCls} value={form.speed_kmh || ''} onChange={e => setForm({...form, speed_kmh: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Poin Pengurangan</label><input type="number" className={inputCls} value={form.deduction_points || 1} onChange={e => setForm({...form, deduction_points: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Denda (Rp)</label><input type="number" className={inputCls} value={form.fine_amount || ''} onChange={e => setForm({...form, fine_amount: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className={inputCls} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-reminder' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600">Tipe</label><select className={inputCls} value={form.reminder_type || 'maintenance_due'} onChange={e => setForm({...form, reminder_type: e.target.value})}><option value="document_expiry">Dokumen Kedaluwarsa</option><option value="maintenance_due">Pemeliharaan Jatuh Tempo</option><option value="insurance_expiry">Asuransi Kedaluwarsa</option><option value="kir_expiry">KIR Kedaluwarsa</option><option value="sim_expiry">SIM Kedaluwarsa</option><option value="rental_end">Rental Selesai</option><option value="inspection_due">Inspeksi Jatuh Tempo</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Entitas</label><select className={inputCls} value={form.entity_type || 'vehicle'} onChange={e => setForm({...form, entity_type: e.target.value, entity_id: ''})}><option value="vehicle">Kendaraan</option><option value="driver">Driver</option></select></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">{form.entity_type === 'vehicle' ? 'Kendaraan' : 'Driver'}</label><select className={inputCls} value={form.entity_id || ''} onChange={e => setForm({...form, entity_id: e.target.value})}><option value="">Pilih</option>{form.entity_type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>) : drivers.map(d => <option key={d.id} value={d.id}>{d.driver_code} - {d.full_name}</option>)}</select></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Judul *</label><input required className={inputCls} value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Jatuh Tempo *</label><input required type="date" className={inputCls} value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Prioritas</label><select className={inputCls} value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option></select></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className={inputCls} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-schedule' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Kendaraan *</label><select required className={inputCls} value={form.vehicle_id || ''} onChange={e => setForm({...form, vehicle_id: e.target.value})}><option value="">Pilih</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_code} - {v.license_plate}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Tipe Maintenance</label><select className={inputCls} value={form.maintenance_type || 'general'} onChange={e => setForm({...form, maintenance_type: e.target.value})}><option value="general">General</option><option value="oil_change">Ganti Oli</option><option value="tire_rotation">Rotasi Ban</option><option value="brake_check">Cek Rem</option><option value="full_service">Full Service</option><option value="kir_renewal">KIR</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jadwal Tipe</label><select className={inputCls} value={form.schedule_type || 'time_based'} onChange={e => setForm({...form, schedule_type: e.target.value})}><option value="time_based">Waktu</option><option value="odometer_based">Odometer</option><option value="both">Keduanya</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">Interval (km)</label><input type="number" className={inputCls} value={form.interval_km || ''} onChange={e => setForm({...form, interval_km: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Interval (hari)</label><input type="number" className={inputCls} value={form.interval_days || ''} onChange={e => setForm({...form, interval_days: parseInt(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Jatuh Tempo</label><input type="date" className={inputCls} value={form.next_due_at || ''} onChange={e => setForm({...form, next_due_at: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Est. Biaya</label><input type="number" className={inputCls} value={form.estimated_cost || ''} onChange={e => setForm({...form, estimated_cost: parseFloat(e.target.value)})} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Vendor</label><input className={inputCls} value={form.vendor || ''} onChange={e => setForm({...form, vendor: e.target.value})} /></div>
                  </div>
                </>}

                {modal === 'add-rental-payment' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Rental *</label><select required className={inputCls} value={form.rental_id || ''} onChange={e => setForm({...form, rental_id: e.target.value})}><option value="">Pilih</option>{rentals.map(r => <option key={r.id} value={r.id}>{r.rental_number} - {r.vehicle_code}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-600">Jumlah (Rp) *</label><input required type="number" className={inputCls} value={form.amount || ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Tanggal</label><input type="date" className={inputCls} value={form.payment_date || new Date().toISOString().slice(0,10)} onChange={e => setForm({...form, payment_date: e.target.value})} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Metode</label><select className={inputCls} value={form.payment_method || 'transfer'} onChange={e => setForm({...form, payment_method: e.target.value})}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="check">Cek/Giro</option></select></div>
                    <div><label className="text-xs font-medium text-gray-600">No. Referensi</label><input className={inputCls} value={form.reference_number || ''} onChange={e => setForm({...form, reference_number: e.target.value})} /></div>
                  </div>
                </>}

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Batal</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
