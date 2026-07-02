import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Fingerprint, Wifi, WifiOff, Plus, Settings, RefreshCw, Trash2,
  Edit, Monitor, Server, Smartphone, Clock, CheckCircle, XCircle,
  AlertTriangle, Search, Filter, Building2, MoreVertical, Signal,
  Activity, Users, Database, Eye, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string | null;
  ipAddress: string | null;
  port: number | null;
  connectionType: string;
  syncMode: string;
  status: string;
  isOnline: boolean;
  registeredUsers: number;
  maxCapacity: number | null;
  totalSynced: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  location: string;
  branch: { id: string; name: string; code: string };
}

const deviceTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  fingerprint: { icon: Fingerprint, label: 'Fingerprint', color: 'bg-blue-100 text-blue-700' },
  face_recognition: { icon: Eye, label: 'Face Recognition', color: 'bg-purple-100 text-purple-700' },
  card: { icon: Monitor, label: 'Kartu RFID', color: 'bg-amber-100 text-amber-700' },
  mobile_app: { icon: Smartphone, label: 'Mobile App', color: 'bg-green-100 text-green-700' },
  manual: { icon: Edit, label: 'Manual', color: 'bg-gray-100 text-gray-700' },
};

const MOCK_DEVICES: Device[] = [
  { id: 'd1', deviceName: 'Fingerprint HQ Lantai 1', deviceType: 'fingerprint', deviceBrand: 'ZKTeco', deviceModel: 'K40', serialNumber: 'ZK-2024-001', ipAddress: '192.168.1.100', port: 4370, connectionType: 'tcp', syncMode: 'auto', status: 'active', isOnline: true, registeredUsers: 142, maxCapacity: 3000, totalSynced: 28540, lastSyncAt: '2026-03-15T08:00:00Z', lastSyncStatus: 'success', location: 'Lobby Lt.1', branch: { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001' } },
  { id: 'd2', deviceName: 'Face Recognition HQ Lt.2', deviceType: 'face_recognition', deviceBrand: 'Hikvision', deviceModel: 'DS-K1T671M', serialNumber: 'HK-2025-003', ipAddress: '192.168.1.101', port: 80, connectionType: 'tcp', syncMode: 'auto', status: 'active', isOnline: true, registeredUsers: 85, maxCapacity: 1500, totalSynced: 15200, lastSyncAt: '2026-03-15T08:05:00Z', lastSyncStatus: 'success', location: 'Lobby Lt.2', branch: { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001' } },
  { id: 'd3', deviceName: 'Fingerprint Bandung', deviceType: 'fingerprint', deviceBrand: 'ZKTeco', deviceModel: 'K40', serialNumber: 'ZK-2024-005', ipAddress: '192.168.2.100', port: 4370, connectionType: 'tcp', syncMode: 'auto', status: 'active', isOnline: false, registeredUsers: 38, maxCapacity: 3000, totalSynced: 8900, lastSyncAt: '2026-03-14T17:00:00Z', lastSyncStatus: 'success', location: 'Pintu Utama', branch: { id: 'b2', name: 'Cabang Bandung', code: 'BR-002' } },
];

export default function DeviceManagementPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('deviceType', typeFilter);
      const res = await fetch(`/api/hq/hris/attendance/devices?${params}`);
      if (!res.ok) { console.error('Fetch devices failed:', res.status); setLoading(false); return; }
      const json = await res.json();
      if (json.success) {
        setDevices(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices(MOCK_DEVICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDevices();
  }, [statusFilter, typeFilter]);

  if (!mounted) return null;

  const filteredDevices = devices.filter(d =>
    d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.serialNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (d.ipAddress || '').includes(searchQuery)
  );

  const onlineCount = devices.filter(d => d.isOnline).length;
  const offlineCount = devices.filter(d => !d.isOnline && d.status === 'active').length;
  const totalRegistered = devices.reduce((sum, d) => sum + d.registeredUsers, 0);
  const totalSynced = devices.reduce((sum, d) => sum + d.totalSynced, 0);

  const handleSave = async () => {
    try {
      const isEdit = !!editDevice;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { id: editDevice.id, ...formData } : formData;

      const res = await fetch('/api/hq/hris/attendance/devices', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) { toast.error('Gagal menyimpan device'); return; }
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? 'Device berhasil diupdate' : 'Device berhasil ditambahkan');
        setShowAddModal(false);
        setEditDevice(null);
        setFormData({});
        fetchDevices();
      } else {
        toast.error(json.error || 'Gagal menyimpan');
      }
    } catch (error) {
      toast.error('Error menyimpan device');
    }
  };

  const handleSync = async (deviceId: string) => {
    setSyncing(deviceId);
    try {
      const res = await fetch('/api/hq/hris/attendance/device-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, mode: 'manual', records: [] })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok || (json && (json.success || json.data))) {
        toast.success(json?.message || 'Sinkronisasi berhasil diminta');
      } else {
        throw new Error(json?.error || 'Gagal sinkronisasi');
      }
      fetchDevices();
    } catch (error) {
      toast.error('Sync gagal');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Yakin ingin menonaktifkan device ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/attendance/devices?id=${deviceId}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Gagal menghapus device'); return; }
      const json = await res.json();
      if (json.success) {
        toast.success('Device dinonaktifkan');
        fetchDevices();
      }
    } catch (error) {
      toast.error('Error menghapus device');
    }
  };

  const openAdd = () => {
    setEditDevice(null);
    setFormData({
      deviceName: '', deviceType: 'fingerprint', deviceBrand: 'ZKTeco',
      deviceModel: '', serialNumber: '', ipAddress: '', port: 4370,
      communicationKey: '', connectionType: 'tcp', syncMode: 'push',
      syncInterval: 5, maxCapacity: 1000, location: '', branchId: '', notes: ''
    });
    setShowAddModal(true);
  };

  const openEdit = (device: Device) => {
    setEditDevice(device);
    setFormData({ ...device, branchId: device.branch?.id });
    setShowAddModal(true);
  };

  const getStatusBadge = (device: Device) => {
    if (device.status !== 'active') {
      return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Nonaktif</span>;
    }
    if (device.isOnline) {
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><Signal className="w-3 h-3" />Online</span>;
    }
    return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><WifiOff className="w-3 h-3" />Offline</span>;
  };

  const getSyncBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-gray-400">Belum sync</span>;
    const config: Record<string, string> = {
      success: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      timeout: 'bg-yellow-100 text-yellow-700',
      partial: 'bg-orange-100 text-orange-700'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${config[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  return (
    <HQLayout title={t('hris.devicesTitle')} subtitle={t('hris.devicesSubtitle')}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Server className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Device</p>
                <p className="text-xl font-bold">{devices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Wifi className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-xl font-bold text-green-600">{onlineCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Enrolled</p>
                <p className="text-xl font-bold">{totalRegistered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Database className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Synced</p>
                <p className="text-xl font-bold">{totalSynced.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Cari device..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm w-52" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="all">Semua Tipe</option>
                <option value="fingerprint">Fingerprint</option>
                <option value="face_recognition">Face Recognition</option>
                <option value="card">Kartu RFID</option>
                <option value="mobile_app">Mobile App</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchDevices}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Tambah Device
              </button>
            </div>
          </div>
        </div>

        {/* Device Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))
          ) : filteredDevices.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada device terdaftar</p>
            </div>
          ) : (
            filteredDevices.map((device) => {
              const typeConf = deviceTypeConfig[device.deviceType] || deviceTypeConfig.manual;
              const TypeIcon = typeConf.icon;
              return (
                <div key={device.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all">
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${typeConf.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{device.deviceName}</h3>
                          <p className="text-xs text-gray-500">{device.deviceBrand} {device.deviceModel}</p>
                        </div>
                      </div>
                      {getStatusBadge(device)}
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="truncate">{device.branch?.name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>{device.ipAddress ? `${device.ipAddress}:${device.port}` : 'Cloud'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Users className="w-3.5 h-3.5" />
                        <span>{device.registeredUsers}{device.maxCapacity ? `/${device.maxCapacity}` : ''} enrolled</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{device.totalSynced.toLocaleString()} synced</span>
                      </div>
                    </div>

                    {/* Sync Status */}
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {device.lastSyncAt
                            ? `Last sync: ${new Date(device.lastSyncAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}`
                            : 'Belum pernah sync'}
                        </span>
                        {getSyncBadge(device.lastSyncStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t divide-x">
                    <button onClick={() => handleSync(device.id)}
                      disabled={syncing === device.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition disabled:opacity-50">
                      <RefreshCw className={`w-4 h-4 ${syncing === device.id ? 'animate-spin' : ''}`} />
                      {syncing === device.id ? 'Syncing...' : 'Sync'}
                    </button>
                    <button onClick={() => openEdit(device)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDelete(device.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Integration Guide */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📡 Panduan Integrasi Device</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">🔐 Fingerprint (ZKTeco)</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Hubungkan via TCP/IP (port 4370)</li>
                <li>• Masukkan IP address & comm key</li>
                <li>• Mode push: device kirim data otomatis</li>
                <li>• Dukung ZKTeco K40, MB360, uFace</li>
              </ul>
            </div>
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-2">📱 Mobile App</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• GPS-based clock in/out</li>
                <li>• Geofence radius per cabang</li>
                <li>• Opsional: selfie wajib</li>
                <li>• API: POST /api/employees/attendance/mobile</li>
              </ul>
            </div>
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">🔗 Webhook Sync</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Endpoint: POST /api/hq/hris/attendance/device-sync</li>
                <li>• Kirim deviceId + secretKey + records[]</li>
                <li>• Auto-proses ke attendance record</li>
                <li>• Duplikat otomatis di-skip</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold">{editDevice ? 'Edit Device' : 'Tambah Device Baru'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditDevice(null); }}
                className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Device *</label>
                  <input type="text" value={formData.deviceName || ''} onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Fingerprint Entrance" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Device *</label>
                  <select value={formData.deviceType || 'fingerprint'} onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="fingerprint">Fingerprint</option>
                    <option value="face_recognition">Face Recognition</option>
                    <option value="card">Kartu RFID</option>
                    <option value="mobile_app">Mobile App</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select value={formData.deviceBrand || ''} onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih Brand</option>
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Solution">Solution</option>
                    <option value="Revo">Revo</option>
                    <option value="Innovation">Innovation</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input type="text" value={formData.deviceModel || ''} onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="K40 / MB360" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input type="text" value={formData.serialNumber || ''} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cabang *</label>
                  <input type="text" value={formData.branchId || ''} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Branch ID" />
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-900 pt-2 border-t">Koneksi</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input type="text" value={formData.ipAddress || ''} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input type="number" value={formData.port || 4370} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Koneksi</label>
                  <select value={formData.connectionType || 'tcp'} onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="tcp">TCP/IP</option>
                    <option value="http">HTTP/REST</option>
                    <option value="udp">UDP</option>
                    <option value="usb">USB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode Sync</label>
                  <select value={formData.syncMode || 'push'} onChange={(e) => setFormData({ ...formData, syncMode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="push">Push (Device kirim otomatis)</option>
                    <option value="pull">Pull (Server ambil data)</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Communication Key</label>
                  <input type="password" value={formData.communicationKey || ''} onChange={(e) => setFormData({ ...formData, communicationKey: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Device password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Fisik</label>
                  <input type="text" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Pintu masuk utama" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowAddModal(false); setEditDevice(null); }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {editDevice ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
