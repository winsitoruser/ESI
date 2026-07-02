import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import { toast } from 'react-hot-toast';
import {
  Home, TreePine, Radio, Camera, MapPin, Plus, Search, Filter, Eye, Edit, Trash2,
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronDown, Layers,
  Activity, Thermometer, Wind, Droplets, Compass, Navigation, Zap, Battery,
  Wrench, ArrowRightLeft, Calendar, Users, Tag, AlertCircle, RefreshCw,
  Package, Building2, Settings, Download, Upload, QrCode, Barcode
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';

// ============================================================
// TYPES
// ============================================================
interface FieldAsset {
  id: string;
  asset_code: string;
  name: string;
  category: 'enclosure' | 'field_equipment' | 'monitoring_station';
  category_name: string;
  status: 'active' | 'maintenance' | 'deployed' | 'retired' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'broken';

  // Enclosure-specific
  species?: string[];
  capacity?: number;
  current_occupancy?: number;
  habitat_type?: string;
  enclosure_size?: string;
  climate_control?: boolean;

  // Field Equipment-specific
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  battery_level?: number;
  last_calibration?: string;
  next_calibration?: string;
  deployment_status?: string;

  // Monitoring Station-specific
  gps_lat?: number;
  gps_lng?: number;
  habitat_zone?: string;
  elevation?: number;
  last_reading?: string;
  sensor_types?: string[];
  connectivity?: 'online' | 'offline' | 'intermittent';

  // Common fields
  location?: string;
  zone?: string;
  assigned_to?: string;
  purchase_date?: string;
  purchase_price?: number;
  last_maintenance?: string;
  next_maintenance?: string;
  warranty_expiry?: string;
  notes?: string;
  tags?: string[];
  last_deployed?: string;
  deployment_count?: number;
}

interface MaintenanceLog {
  id: string;
  asset_id: string;
  asset_name: string;
  date: string;
  type: 'preventive' | 'corrective' | 'calibration';
  technician: string;
  notes: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  cost?: number;
}

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_ENCLOSURES: FieldAsset[] = [
  {
    id: 'enc-001', asset_code: 'ENC-MAM-001', name: 'Kandang Orangutan A1',
    category: 'enclosure', category_name: 'Kandang', status: 'active', condition: 'good',
    species: ['Pongo abelii'], capacity: 3, current_occupancy: 2,
    habitat_type: 'Hutan Hujan Tropis', enclosure_size: '12m x 8m x 6m',
    climate_control: true, location: 'Kawasan Rehabilitasi A', zone: 'Zona Primata',
    purchase_date: '2020-03-15', purchase_price: 45000000,
    last_maintenance: '2026-02-10', next_maintenance: '2026-03-10',
    notes: 'Dilengkapi dengan climbing structure dan kolam kecil',
    tags: ['primata', 'rehabilitasi', 'outdoor']
  },
  {
    id: 'enc-002', asset_code: 'ENC-BRD-002', name: 'Kandang Elang Jawa B3',
    category: 'enclosure', category_name: 'Kandang', status: 'active', condition: 'excellent',
    species: ['Nisaetus bartelsi'], capacity: 2, current_occupancy: 1,
    habitat_type: 'Savanna Terbuka', enclosure_size: '15m x 10m x 8m',
    climate_control: false, location: 'Kawasan Reintroduksi', zone: 'Zona Raptor',
    purchase_date: '2021-06-20', purchase_price: 38000000,
    last_maintenance: '2026-01-15', next_maintenance: '2026-04-15',
    notes: 'Flight cage untuk latihan terbang sebelum pelepasan',
    tags: ['raptor', 'reintroduksi', 'flight-cage']
  },
  {
    id: 'enc-003', asset_code: 'ENC-RH-003', name: 'Kandang Badak Jawa C1',
    category: 'enclosure', category_name: 'Kandang', status: 'active', condition: 'good',
    species: ['Rhinoceros sondaicus'], capacity: 2, current_occupancy: 1,
    habitat_type: 'Hutan Bakau', enclosure_size: '30m x 20m x 5m',
    climate_control: false, location: 'Kawasan Konservasi', zone: 'Zona Badak',
    purchase_date: '2019-11-08', purchase_price: 85000000,
    last_maintenance: '2026-02-20', next_maintenance: '2026-03-20',
    notes: 'Dilengkapi dengan kolam lumpur dan area pakan alami',
    tags: ['badak', 'konservasi', 'bakau']
  },
  {
    id: 'enc-004', asset_code: 'ENC-ISO-004', name: 'Isolasi Medis D1',
    category: 'enclosure', category_name: 'Kandang', status: 'maintenance', condition: 'fair',
    species: [], capacity: 1, current_occupancy: 0,
    habitat_type: 'Kamar Isolasi', enclosure_size: '4m x 3m x 2.5m',
    climate_control: true, location: 'Klinik Satwa', zone: 'Medis',
    purchase_date: '2022-01-10', purchase_price: 25000000,
    last_maintenance: '2026-02-28', next_maintenance: '2026-03-05',
    notes: 'Kandang isolasi untuk karantina dan perawatan medis',
    tags: ['medis', 'isolasi', 'indoor']
  },
];

const MOCK_FIELD_EQUIPMENT: FieldAsset[] = [
  {
    id: 'fe-001', asset_code: 'CAM-TRP-001', name: 'Camera Trap Browning Dark Ops',
    category: 'field_equipment', category_name: 'Peralatan Lapangan', status: 'deployed', condition: 'good',
    equipment_type: 'Camera Trap', model: 'Dark Ops HD Pro X', serial_number: 'BRO-2024-0156',
    battery_level: 75, last_calibration: '2026-01-10', next_calibration: '2026-07-10',
    location: 'Hutan Gunung Halimun', zone: 'Sektor Barat',
    assigned_to: 'Ranger Team A', deployment_count: 12,
    last_deployed: '2026-02-20', purchase_date: '2023-05-20', purchase_price: 8500000,
    notes: 'Pasang di jalur satwa untuk monitoring aktivitas',
    tags: ['camera-trap', 'monitoring', 'deployed']
  },
  {
    id: 'fe-002', asset_code: 'GPS-002', name: 'GPS Garmin GPSmap 66s',
    category: 'field_equipment', category_name: 'Peralatan Lapangan', status: 'active', condition: 'excellent',
    equipment_type: 'GPS Handheld', model: 'GPSmap 66s', serial_number: 'GAR-2023-0892',
    battery_level: 90, last_calibration: '2026-02-01', next_calibration: '2026-08-01',
    location: 'Gudang Peralatan', zone: 'HQ',
    assigned_to: 'Ranger Team B', deployment_count: 28,
    last_deployed: '2026-02-25', purchase_date: '2022-08-15', purchase_price: 12500000,
    notes: 'Dilengkapi dengan sensor barometer dan kompas',
    tags: ['gps', 'navigation', 'handheld']
  },
  {
    id: 'fe-003', asset_code: 'RAD-003', name: 'Radio HT Icom IC-V86',
    category: 'field_equipment', category_name: 'Peralatan Lapangan', status: 'active', condition: 'good',
    equipment_type: 'Handy Talkie', model: 'IC-V86', serial_number: 'ICO-2024-0045',
    battery_level: 60, last_calibration: '2025-11-15', next_calibration: '2026-05-15',
    location: 'Gudang Peralatan', zone: 'HQ',
    assigned_to: 'Security Patrol', deployment_count: 45,
    last_deployed: '2026-03-01', purchase_date: '2023-03-10', purchase_price: 4500000,
    notes: 'VHF 136-174 MHz, 8W output',
    tags: ['radio', 'communication', 'vhf']
  },
  {
    id: 'fe-004', asset_code: 'BIN-004', name: 'Teropong Swarovski EL 10x42',
    category: 'field_equipment', category_name: 'Peralatan Lapangan', status: 'maintenance', condition: 'fair',
    equipment_type: 'Binoculars', model: 'EL Range 10x42', serial_number: 'SWO-2022-1123',
    last_calibration: '2025-10-20', next_calibration: '2026-04-20',
    location: 'Service Center', zone: 'HQ',
    assigned_to: 'Tim Survey', deployment_count: 32,
    last_deployed: '2026-02-15', purchase_date: '2022-04-05', purchase_price: 68000000,
    notes: 'Dilengkapi dengan rangefinder laser, perbaikan fokus',
    tags: ['binoculars', 'survey', 'service']
  },
  {
    id: 'fe-005', asset_code: 'DRN-005', name: 'Drone DJI Matrice 300 RTK',
    category: 'field_equipment', category_name: 'Peralatan Lapangan', status: 'active', condition: 'good',
    equipment_type: 'Survey Drone', model: 'Matrice 300 RTK', serial_number: 'DJI-2023-0567',
    battery_level: 100, last_calibration: '2026-02-15', next_calibration: '2026-08-15',
    location: 'Gudang Peralatan', zone: 'HQ',
    assigned_to: 'Tim Mapping', deployment_count: 18,
    last_deployed: '2026-02-28', purchase_date: '2023-07-12', purchase_price: 185000000,
    notes: 'Dilengkapi dengan kamera Zenmuse L1 LiDAR',
    tags: ['drone', 'mapping', 'lidar']
  },
];

const MOCK_MONITORING_STATIONS: FieldAsset[] = [
  {
    id: 'ms-001', asset_code: 'STA-GH-001', name: 'Stasiun Monitoring Gunung Halimun A',
    category: 'monitoring_station', category_name: 'Stasiun Monitoring', status: 'active', condition: 'good',
    gps_lat: -6.7234, gps_lng: 106.4567, habitat_zone: 'Hutan Hujan Primer',
    elevation: 1450, connectivity: 'online',
    sensor_types: ['temperature', 'humidity', 'rainfall', 'camera'],
    last_reading: '2026-03-02 08:30:00',
    location: 'Sektor Barat', zone: 'GH-01',
    assigned_to: 'Tim Monitoring A', deployment_count: 1,
    purchase_date: '2021-09-10', purchase_price: 125000000,
    last_maintenance: '2026-02-01', next_maintenance: '2026-05-01',
    notes: 'Stasiun otomatis dengan power surya',
    tags: ['automatic', 'solar-powered', 'camera-trap-array']
  },
  {
    id: 'ms-002', asset_code: 'STA-PNG-002', name: 'Pos Patroli Penyangga C3',
    category: 'monitoring_station', category_name: 'Stasiun Monitoring', status: 'active', condition: 'excellent',
    gps_lat: -6.7589, gps_lng: 106.4890, habitat_zone: 'Hutan Sekunder',
    elevation: 850, connectivity: 'intermittent',
    sensor_types: ['manual_log', 'sign_recording'],
    location: 'Sektor Utara', zone: 'PNG-03',
    assigned_to: 'Ranger Team C',
    purchase_date: '2020-05-20', purchase_price: 45000000,
    last_maintenance: '2026-01-15', next_maintenance: '2026-04-15',
    notes: 'Pos patroli manual untuk pengawasan perbatasan',
    tags: ['manual', 'patrol-post', 'border-security']
  },
  {
    id: 'ms-003', asset_code: 'STA-WL-003', name: 'Stasiun Weather Labuhan Ratu',
    category: 'monitoring_station', category_name: 'Stasiun Monitoring', status: 'active', condition: 'good',
    gps_lat: -5.8734, gps_lng: 105.9876, habitat_zone: 'Hutan Bakau',
    elevation: 15, connectivity: 'online',
    sensor_types: ['temperature', 'humidity', 'wind_speed', 'rainfall', 'tide'],
    last_reading: '2026-03-02 08:45:00',
    location: 'Sisir Pantai', zone: 'LR-01',
    assigned_to: 'Tim Klimatologi',
    purchase_date: '2022-02-10', purchase_price: 85000000,
    last_maintenance: '2026-02-10', next_maintenance: '2026-03-10',
    notes: 'Monitoring cuaca dan pasang surut',
    tags: ['weather', 'tide', 'coastal']
  },
  {
    id: 'ms-004', asset_code: 'STA-SC-004', name: 'Smart Camera Tower SC-04',
    category: 'monitoring_station', category_name: 'Stasiun Monitoring', status: 'maintenance', condition: 'fair',
    gps_lat: -6.7123, gps_lng: 106.4789, habitat_zone: 'Koridor Satwa',
    elevation: 1100, connectivity: 'offline',
    sensor_types: ['ptz_camera', 'thermal', 'ai_detection'],
    last_reading: '2026-02-28 14:20:00',
    location: 'Sektor Tengah', zone: 'KOR-02',
    assigned_to: 'Tim Teknologi',
    purchase_date: '2023-11-05', purchase_price: 285000000,
    last_maintenance: '2025-12-01', next_maintenance: '2026-03-05',
    notes: 'Menara kamera AI dengan deteksi satwa otomatis - perlu perbaikan koneksi',
    tags: ['ai-camera', 'smart-tower', 'offline']
  },
];

const MOCK_MAINTENANCE_LOGS: MaintenanceLog[] = [
  { id: 'ml-001', asset_id: 'fe-004', asset_name: 'Teropong Swarovski EL 10x42', date: '2026-03-05', type: 'corrective', technician: 'Andi Santoso', notes: 'Perbaikan mekanisme fokus yang macet', status: 'in_progress', cost: 2500000 },
  { id: 'ml-002', asset_id: 'ms-004', asset_name: 'Smart Camera Tower SC-04', date: '2026-03-06', type: 'corrective', technician: 'Tim Teknologi', notes: 'Perbaikan sistem komunikasi dan ganti baterai backup', status: 'scheduled', cost: 5000000 },
  { id: 'ml-003', asset_id: 'enc-004', asset_name: 'Isolasi Medis D1', date: '2026-03-03', type: 'preventive', technician: 'Tim Medis', notes: 'Disinfeksi rutin dan pengecekan sistem ventilasi', status: 'in_progress', cost: 500000 },
  { id: 'ml-004', asset_id: 'fe-001', asset_name: 'Camera Trap Browning Dark Ops', date: '2026-03-10', type: 'calibration', technician: 'Ranger Team A', notes: 'Kalibrasi waktu dan pengecekan sensor gerak', status: 'scheduled', cost: 0 },
];

const MOCK_DASHBOARD = {
  totalFieldAssets: 156,
  byCategory: { enclosures: 42, fieldEquipment: 89, monitoringStations: 25 },
  byStatus: { active: 98, maintenance: 12, deployed: 35, retired: 8, lost: 3 },
  byCondition: { excellent: 45, good: 68, fair: 28, poor: 10, broken: 5 },
  upcomingMaintenance: 8,
  overdueMaintenance: 3,
  totalValue: 2850000000,
  deploymentsThisMonth: 45,
  connectivity: { online: 18, offline: 4, intermittent: 3 },
};

const CATEGORY_ICONS: Record<string, any> = {
  enclosure: Home,
  field_equipment: Radio,
  monitoring_station: MapPin,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  deployed: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  retired: 'bg-gray-100 text-gray-700',
  lost: 'bg-red-100 text-red-700',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'text-emerald-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-orange-600',
  broken: 'text-red-600',
};

const CONNECTIVITY_COLORS: Record<string, string> = {
  online: 'bg-green-100 text-green-700',
  offline: 'bg-red-100 text-red-700',
  intermittent: 'bg-yellow-100 text-yellow-700',
};

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

// ============================================================
// MAIN PAGE
// ============================================================
export default function FieldAssetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { tab } = router.query;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [enclosures, setEnclosures] = useState<FieldAsset[]>([]);
  const [fieldEquipment, setFieldEquipment] = useState<FieldAsset[]>([]);
  const [monitoringStations, setMonitoringStations] = useState<FieldAsset[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<FieldAsset | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (tab && typeof tab === 'string') setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setDashboardData(MOCK_DASHBOARD);
      setEnclosures(MOCK_ENCLOSURES);
      setFieldEquipment(MOCK_FIELD_EQUIPMENT);
      setMonitoringStations(MOCK_MONITORING_STATIONS);
      setMaintenanceLogs(MOCK_MAINTENANCE_LOGS);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  if (status === 'loading') return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
    </div>
  );
  if (status === 'unauthenticated') { router.push('/auth/login'); return null; }

  const formatCurrency = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

  const tabs = [
    { id: 'dashboard', label: 'Dasbor', icon: Activity },
    { id: 'enclosures', label: 'Kandang', icon: Home },
    { id: 'equipment', label: 'Peralatan', icon: Radio },
    { id: 'stations', label: 'Stasiun', icon: MapPin },
    { id: 'maintenance', label: 'Pemeliharaan', icon: Wrench },
  ];

  const getFilteredAssets = (assets: FieldAsset[]) => {
    return assets.filter(a => {
      const matchSearch = !searchTerm || 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.asset_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  };

  return (
    <HQLayout title="Manajemen Aset Lapangan" noPadding>
    <ModuleGuard moduleCode="asset_management">
      <Head><title>Aset Lapangan - ESI ERP</title></Head>
      <FieldAssetsContent
        activeTab={activeTab} setActiveTab={setActiveTab}
        tabs={tabs} loading={loading}
        dashboardData={dashboardData}
        enclosures={getFilteredAssets(enclosures)}
        fieldEquipment={getFilteredAssets(fieldEquipment)}
        monitoringStations={getFilteredAssets(monitoringStations)}
        maintenanceLogs={maintenanceLogs}
        searchTerm={searchTerm} filterStatus={filterStatus}
        onSearch={setSearchTerm} onFilterStatus={setFilterStatus}
        selectedAsset={selectedAsset} showDetailModal={showDetailModal}
        onView={(a) => { setSelectedAsset(a); setShowDetailModal(true); }}
        onCloseDetail={() => { setShowDetailModal(false); setSelectedAsset(null); }}
        formatCurrency={formatCurrency} formatDate={formatDate}
        router={router}
      />
    </ModuleGuard>
    </HQLayout>
  );
}

// ============================================================
// CONTENT COMPONENT
// ============================================================
function FieldAssetsContent(props: any) {
  const {
    activeTab, setActiveTab, tabs, loading,
    dashboardData, enclosures, fieldEquipment, monitoringStations, maintenanceLogs,
    searchTerm, filterStatus, onSearch, onFilterStatus,
    selectedAsset, showDetailModal, onView, onCloseDetail,
    formatCurrency, formatDate, router
  } = props;

  const renderAssetCard = (asset: FieldAsset) => {
    const Icon = CATEGORY_ICONS[asset.category] || Package;
    return (
      <div key={asset.id} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition cursor-pointer"
        onClick={() => onView(asset)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              asset.category === 'enclosure' ? 'bg-emerald-50' :
              asset.category === 'field_equipment' ? 'bg-blue-50' : 'bg-amber-50'
            }`}>
              <Icon className={`w-5 h-5 ${
                asset.category === 'enclosure' ? 'text-emerald-600' :
                asset.category === 'field_equipment' ? 'text-blue-600' : 'text-amber-600'
              }`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{asset.name}</h3>
              <p className="text-xs text-gray-400 font-mono">{asset.asset_code}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
            {asset.status}
          </span>
        </div>

        {asset.category === 'enclosure' && asset.species && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Satwa:</span>
            {asset.species.map((s, i) => (
              <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                <i>{s}</i>
              </span>
            ))}
            {asset.current_occupancy !== undefined && asset.capacity && (
              <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                {asset.current_occupancy}/{asset.capacity}
              </span>
            )}
          </div>
        )}

        {asset.category === 'field_equipment' && (
          <div className="mt-3 flex items-center gap-3">
            {asset.battery_level !== undefined && (
              <div className="flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-gray-400" />
                <span className={`text-xs ${
                  asset.battery_level > 70 ? 'text-green-600' :
                  asset.battery_level > 30 ? 'text-yellow-600' : 'text-red-600'
                }`}>{asset.battery_level}%</span>
              </div>
            )}
            {asset.deployment_count !== undefined && (
              <span className="text-xs text-gray-400">
                {asset.deployment_count} deployments
              </span>
            )}
          </div>
        )}

        {asset.category === 'monitoring_station' && (
          <div className="mt-3 flex items-center gap-3">
            {asset.connectivity && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONNECTIVITY_COLORS[asset.connectivity]}`}>
                {asset.connectivity}
              </span>
            )}
            {asset.gps_lat && (
              <span className="text-xs text-gray-400 font-mono">
                {asset.gps_lat.toFixed(4)}°S, {asset.gps_lng.toFixed(4)}°E
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{asset.location || 'HQ'}</span>
          <span className={CONDITION_COLORS[asset.condition]}>
            {asset.condition}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <TreePine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manajemen Aset Lapangan</h1>
            <p className="text-xs text-gray-500">Kandang, peralatan, dan stasiun monitoring konservasi</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
          onClick={() => router.push('/hq/assets')}>
          <Layers className="w-4 h-4" /> Semua Aset
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="flex gap-1 overflow-x-auto px-4 scrollbar-hide">
          {tabs.map((tb: any) => (
            <button key={tb.id} onClick={() => { setActiveTab(tb.id); router.push(`/hq/assets/field?tab=${tb.id}`, undefined, { shallow: true }); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition font-medium ${
                activeTab === tb.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search/Filter Bar (for list views) */}
      {['enclosures', 'equipment', 'stations'].includes(activeTab) && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari nama atau kode aset..."
                value={searchTerm} onChange={e => onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white" />
            </div>
          </div>
          <select value={filterStatus} onChange={e => onFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="deployed">Deployed</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      )}

      {/* Content */}
      <div>
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 bg-white rounded-xl animate-pulse border" />
            ))}
          </div>
        )}

        {!loading && activeTab === 'dashboard' && dashboardData && (
          <DashboardTab data={dashboardData} formatCurrency={formatCurrency}
            enclosures={enclosures} fieldEquipment={fieldEquipment}
            monitoringStations={monitoringStations} maintenanceLogs={maintenanceLogs}
            onView={onView} />
        )}

        {!loading && activeTab === 'enclosures' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enclosures.map((e: FieldAsset) => renderAssetCard(e))}
            {enclosures.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada data kandang</p>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'equipment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fieldEquipment.map((e: FieldAsset) => renderAssetCard(e))}
            {fieldEquipment.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada data peralatan</p>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'stations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitoringStations.map((s: FieldAsset) => renderAssetCard(s))}
            {monitoringStations.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada data stasiun monitoring</p>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'maintenance' && (
          <MaintenanceTab logs={maintenanceLogs} formatCurrency={formatCurrency} formatDate={formatDate} />
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAsset && (
        <AssetDetailModal asset={selectedAsset} onClose={onCloseDetail}
          formatCurrency={formatCurrency} formatDate={formatDate} />
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================
function DashboardTab({ data, formatCurrency, enclosures, fieldEquipment, monitoringStations, maintenanceLogs, onView }: any) {
  const byCategoryData = [
    { name: 'Kandang', value: data.byCategory.enclosures, fill: '#10B981' },
    { name: 'Peralatan', value: data.byCategory.fieldEquipment, fill: '#3B82F6' },
    { name: 'Stasiun', value: data.byCategory.monitoringStations, fill: '#F59E0B' },
  ];

  const statusData = Object.entries(data.byStatus).map(([k, v]) => ({
    name: k === 'active' ? 'Aktif' : k === 'maintenance' ? 'Maintenance' :
          k === 'deployed' ? 'Dideploy' : k === 'retired' ? 'Pensiun' : 'Hilang',
    count: v as number,
  }));

  const connectivityData = Object.entries(data.connectivity).map(([k, v]) => ({
    name: k === 'online' ? 'Online' : k === 'offline' ? 'Offline' : 'Intermittent',
    count: v as number,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Aset Lapangan', value: data.totalFieldAssets, sub: '3 kategori', icon: Layers, color: 'from-teal-500 to-emerald-600' },
          { label: 'Aktif/Dideploy', value: data.byStatus.active + data.byStatus.deployed, sub: `${data.byStatus.maintenance} dalam maintenance`, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
          { label: 'Maintenance', value: data.upcomingMaintenance, sub: `${data.overdueMaintenance} terlambat`, icon: Wrench, color: data.overdueMaintenance > 0 ? 'from-red-500 to-orange-600' : 'from-yellow-500 to-amber-600' },
          { label: 'Nilai Total', value: formatCurrency(data.totalValue), sub: 'Investasi aset', icon: Package, color: 'from-blue-500 to-indigo-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <div className={`w-10 h-10 bg-gradient-to-br ${c.color} rounded-lg flex items-center justify-center`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Per Kategori</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {byCategoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Per Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Konektivitas Stasiun</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={connectivityData} cx="50%" cy="50%" outerRadius={80}
                dataKey="count" label={({ name, value }) => `${name}: ${value}`}>
                {connectivityData.map((_, i) => (
                  <Cell key={i} fill={
                    i === 0 ? '#10B981' : i === 1 ? '#EF4444' : '#F59E0B'
                  } />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kandang */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Kandang</h3>
            </div>
            <span className="text-sm text-teal-600 font-medium">{data.byCategory.enclosures} total</span>
          </div>
          <div className="space-y-2">
            {enclosures.slice(0, 3).map((e: FieldAsset) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => onView(e)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.current_occupancy}/{e.capacity} penghuni</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Peralatan</h3>
            </div>
            <span className="text-sm text-blue-600 font-medium">{data.byCategory.fieldEquipment} total</span>
          </div>
          <div className="space-y-2">
            {fieldEquipment.slice(0, 3).map((e: FieldAsset) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => onView(e)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.equipment_type} • {e.model}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Maintenance</h3>
            </div>
            <span className="text-sm text-amber-600 font-medium">{maintenanceLogs.length} jadwal</span>
          </div>
          <div className="space-y-2">
            {maintenanceLogs.slice(0, 4).map((l: MaintenanceLog) => (
              <div key={l.id} className="p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">{l.asset_name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.status === 'completed' ? 'bg-green-100 text-green-700' :
                    l.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{l.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{l.date}</span>
                  <span className="capitalize">{l.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAINTENANCE TAB
// ============================================================
function MaintenanceTab({ logs, formatCurrency, formatDate }: any) {
  const typeColors: Record<string, string> = {
    preventive: 'bg-blue-50 text-blue-700',
    corrective: 'bg-orange-50 text-orange-700',
    calibration: 'bg-purple-50 text-purple-700',
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Jadwal & Riwayat Pemeliharaan</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 font-medium">
          <Plus className="w-4 h-4" /> Jadwal Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600 text-xs uppercase">
              <th className="px-4 py-3 font-medium">Aset</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Teknisi</th>
              <th className="px-4 py-3 font-medium">Biaya</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: MaintenanceLog) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{l.asset_name}</p>
                  <p className="text-xs text-gray-400 mt-1">{l.notes}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{l.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${typeColors[l.type]}`}>
                    {l.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{l.technician}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{l.cost ? formatCurrency(l.cost) : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status]}`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada jadwal pemeliharaan</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ASSET DETAIL MODAL
// ============================================================
function AssetDetailModal({ asset, onClose, formatCurrency, formatDate }: any) {
  const Icon = CATEGORY_ICONS[asset.category] || Package;
  const [activeSubTab, setActiveSubTab] = useState('overview');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              asset.category === 'enclosure' ? 'bg-emerald-50' :
              asset.category === 'field_equipment' ? 'bg-blue-50' : 'bg-amber-50'
            }`}>
              <Icon className={`w-5 h-5 ${
                asset.category === 'enclosure' ? 'text-emerald-600' :
                asset.category === 'field_equipment' ? 'text-blue-600' : 'text-amber-600'
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{asset.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 font-mono">{asset.asset_code}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                  {asset.status}
                </span>
                <span className={`text-xs font-medium ${CONDITION_COLORS[asset.condition]}`}>
                  Kondisi: {asset.condition}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 border-b bg-gray-50">
          <div className="flex gap-4">
            {[
              { id: 'overview', label: 'Ringkasan' },
              { id: 'specs', label: 'Spesifikasi' },
              { id: 'history', label: 'Riwayat' },
              { id: 'maintenance', label: 'Pemeliharaan' },
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveSubTab(t.id)}
                className={`py-3 text-sm font-medium border-b-2 transition ${
                  activeSubTab === t.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Key Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Informasi Dasar</h3>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Kategori" value={asset.category_name} />
                    <DetailRow label="Lokasi" value={asset.location} />
                    <DetailRow label="Zona" value={asset.zone} />
                    <DetailRow label="Penanggung Jawab" value={asset.assigned_to} />
                    {asset.deployment_count !== undefined && (
                      <DetailRow label="Total Deployments" value={`${asset.deployment_count}x`} />
                    )}
                    {asset.last_deployed && (
                      <DetailRow label="Terakhir Dideploy" value={formatDate(asset.last_deployed)} />
                    )}
                  </div>
                </div>

                {asset.category === 'enclosure' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Informasi Kandang</h3>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Tipe Habitat" value={asset.habitat_type} />
                      <DetailRow label="Ukuran" value={asset.enclosure_size} />
                      <DetailRow label="Kapasitas" value={`${asset.current_occupancy || 0} / ${asset.capacity} satwa`} />
                      <DetailRow label="Climate Control" value={asset.climate_control ? 'Ya' : 'Tidak'} />
                      {asset.species && asset.species.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 w-32 flex-shrink-0">Penghuni:</span>
                          <div className="flex flex-wrap gap-1">
                            {asset.species.map((s: string, i: number) => (
                              <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                                <i>{s}</i>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {asset.category === 'field_equipment' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Informasi Peralatan</h3>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Tipe" value={asset.equipment_type} />
                      <DetailRow label="Model" value={asset.model} />
                      <DetailRow label="Serial Number" value={asset.serial_number} />
                      {asset.battery_level !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-32">Battery:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                asset.battery_level > 70 ? 'bg-green-500' :
                                asset.battery_level > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} style={{ width: `${asset.battery_level}%` }} />
                            </div>
                            <span className="text-gray-900">{asset.battery_level}%</span>
                          </div>
                        </div>
                      )}
                      <DetailRow label="Kalibrasi Terakhir" value={formatDate(asset.last_calibration)} />
                      <DetailRow label="Kalibrasi Berikutnya" value={formatDate(asset.next_calibration)} />
                    </div>
                  </div>
                )}

                {asset.category === 'monitoring_station' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Informasi Stasiun</h3>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Tipe Habitat" value={asset.habitat_zone} />
                      <DetailRow label="Elevasi" value={asset.elevation ? `${asset.elevation} mdpl` : '-'} />
                      <DetailRow label="Koordinat GPS" value={asset.gps_lat ? `${asset.gps_lat.toFixed(4)}°S, ${asset.gps_lng.toFixed(4)}°E` : '-'} />
                      <DetailRow label="Konektivitas" value={
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONNECTIVITY_COLORS[asset.connectivity] || 'bg-gray-100 text-gray-600'}`}>
                          {asset.connectivity}
                        </span>
                      } />
                      <DetailRow label="Pembacaan Terakhir" value={asset.last_reading} />
                      {asset.sensor_types && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 w-32 flex-shrink-0">Sensor:</span>
                          <div className="flex flex-wrap gap-1">
                            {asset.sensor_types.map((s: string, i: number) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded capitalize">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Financial */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Informasi Keuangan</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <DetailRow label="Tanggal Pembelian" value={formatDate(asset.purchase_date)} />
                    <DetailRow label="Nilai Pembelian" value={formatCurrency(asset.purchase_price)} />
                    <DetailRow label="Garansi Berakhir" value={formatDate(asset.warranty_expiry)} />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Pemeliharaan</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <DetailRow label="Terakhir" value={formatDate(asset.last_maintenance)} />
                    <DetailRow label="Berikutnya" value={formatDate(asset.next_maintenance)} />
                  </div>
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.map((t: string, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {asset.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Catatan</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{asset.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'specs' && (
            <div className="text-center py-12 text-gray-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tab spesifikasi - detail teknis dan spesifikasi aset</p>
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Riwayat deployment, transfer, dan penggunaan aset</p>
            </div>
          )}

          {activeSubTab === 'maintenance' && (
            <div className="text-center py-12 text-gray-400">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Riwayat pemeliharaan dan jadwal mendatang</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button className="px-4 py-2 text-sm text-gray-600 hover:bg-white border rounded-lg flex items-center gap-2">
            <Eye className="w-4 h-4" /> Lihat Log
          </button>
          <button className="px-4 py-2 text-sm text-gray-600 hover:bg-white border rounded-lg flex items-center gap-2">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button className="px-4 py-2 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Transfer/Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500 w-32 flex-shrink-0">{label}:</span>
      {typeof value === 'string' || typeof value === 'number' || value === undefined ? (
        <span className="text-gray-900">{value || '-'}</span>
      ) : value}
    </div>
  );
}
