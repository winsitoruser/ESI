import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Clock, Users, UserCheck, UserX, MapPin, Shield, Settings, Calendar,
  Plus, Edit, Trash2, Save, X, RefreshCw, CheckCircle, AlertCircle,
  Search, Filter, Download, Eye, ChevronRight, ArrowRight, Copy,
  Fingerprint, Camera, QrCode, Smartphone, Wifi, Globe, Timer,
  Sun, Moon, Sunset, Coffee, Building2, Navigation, ToggleLeft, ToggleRight,
  Layers, RotateCcw, AlertTriangle, Info, Palette, TrendingUp
} from 'lucide-react';

// ===== Types =====
interface WorkShift {
  id: string; code: string; name: string; description?: string;
  shift_type: string; start_time: string; end_time: string;
  break_start?: string; break_end?: string; break_duration_minutes: number;
  is_cross_day: boolean; work_hours_per_day: number; color: string;
  tolerance_late_minutes: number; tolerance_early_leave_minutes?: number;
  overtime_after_minutes?: number;
  applicable_days: number[]; applicable_departments?: string[];
  applicable_branches?: string[];
  max_employees_per_shift?: number; is_active: boolean; sort_order: number;
}

interface GeofenceLocation {
  id: string; name: string; description?: string;
  location_type: string; latitude: number; longitude: number;
  radius_meters: number; address?: string; branch_id?: string;
  is_active: boolean;
}

interface ShiftRotation {
  id: string; name: string; description?: string;
  rotation_type: string; rotation_pattern: any[];
  employee_ids?: number[]; is_active: boolean;
  auto_generate: boolean; generate_weeks_ahead: number;
  last_generated_date?: string;
}

// ===== Constants =====
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const SHIFT_TYPES = [
  { v: 'regular', l: 'Regular' }, { v: 'office', l: 'Office' },
  { v: 'split', l: 'Split' }, { v: 'extended', l: 'Extended (12H)' },
  { v: 'flexible', l: 'Fleksibel' }, { v: 'field', l: 'Lapangan/Field' },
];
const LOCATION_TYPES = ['office', 'branch', 'warehouse', 'factory', 'site', 'other'];
const COLOR_PRESETS = ['#F59E0B','#3B82F6','#8B5CF6','#10B981','#EC4899','#EF4444','#06B6D4','#14B8A6','#F43F5E','#6B7280'];
const CLOCK_METHOD_ICONS: Record<string, any> = {
  manual: Clock, gps: MapPin, face_recognition: Camera, fingerprint: Fingerprint,
  qr_code: QrCode, nfc: Wifi
};
const CLOCK_METHOD_LABELS: Record<string, string> = {
  manual: 'Manual', gps: 'GPS', face_recognition: 'Face Recognition',
  fingerprint: 'Fingerprint', qr_code: 'QR Code', nfc: 'NFC'
};

const MOCK_AM_SHIFTS: WorkShift[] = [
  { id: 'sh1', code: 'PAGI', name: 'Shift Pagi', shift_type: 'regular', start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#3B82F6', tolerance_late_minutes: 15, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 1 },
  { id: 'sh2', code: 'SIANG', name: 'Shift Siang', shift_type: 'regular', start_time: '14:00', end_time: '22:00', break_start: '18:00', break_end: '18:30', break_duration_minutes: 30, is_cross_day: false, work_hours_per_day: 8, color: '#F59E0B', tolerance_late_minutes: 10, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 2 },
  { id: 'sh3', code: 'MALAM', name: 'Shift Malam', shift_type: 'regular', start_time: '22:00', end_time: '06:00', break_start: '02:00', break_end: '02:30', break_duration_minutes: 30, is_cross_day: true, work_hours_per_day: 8, color: '#8B5CF6', tolerance_late_minutes: 10, applicable_days: [1,2,3,4,5,6], is_active: true, sort_order: 3 },
];
const MOCK_AM_GEO: GeofenceLocation[] = [
  { id: 'g1', name: 'Kantor Pusat Jakarta', location_type: 'office', latitude: -6.2088, longitude: 106.8456, radius_meters: 150, address: 'Jl. Sudirman No.1, Jakarta', is_active: true },
  { id: 'g2', name: 'Cabang Bandung', location_type: 'branch', latitude: -6.9175, longitude: 107.6191, radius_meters: 100, address: 'Jl. Asia Afrika No.10, Bandung', is_active: true },
];
const MOCK_AM_STATS = { totalEmployees: 156, presentToday: 142, lateToday: 8, absentToday: 6, onLeave: 4, avgClockIn: '08:12' };
const MOCK_AM_RECORDS = [
  { id: 'r1', employee_name: 'Budi Santoso', department: 'IT', shift: 'PAGI', clock_in: '08:05', clock_out: null, status: 'present', method: 'gps' },
  { id: 'r2', employee_name: 'Siti Rahayu', department: 'Finance', shift: 'PAGI', clock_in: '08:22', clock_out: null, status: 'late', method: 'face_recognition' },
  { id: 'r3', employee_name: 'Ahmad Wijaya', department: 'Operations', shift: 'PAGI', clock_in: '07:55', clock_out: null, status: 'present', method: 'fingerprint' },
];

export default function AttendanceManagementPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'shifts' | 'geofence' | 'rotations' | 'settings'>('live');

  // Data
  const [shifts, setShifts] = useState<WorkShift[]>(MOCK_AM_SHIFTS);
  const [geofences, setGeofences] = useState<GeofenceLocation[]>(MOCK_AM_GEO);
  const [rotations, setRotations] = useState<ShiftRotation[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [settingsRaw, setSettingsRaw] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>(MOCK_AM_STATS);
  const [todayRecords, setTodayRecords] = useState<any[]>(MOCK_AM_RECORDS);

  // Modals
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState<GeofenceLocation | null>(null);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [editingRotation, setEditingRotation] = useState<ShiftRotation | null>(null);

  // Shift form
  const defaultShiftForm = {
    code: '', name: '', description: '', shift_type: 'regular',
    start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00',
    break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8,
    color: '#3B82F6', tolerance_late_minutes: 15, overtime_after_minutes: 30,
    applicable_days: [1, 2, 3, 4, 5] as number[],
    is_active: true, sort_order: 0,
  };
  const [shiftForm, setShiftForm] = useState(defaultShiftForm);

  // Geo form
  const defaultGeoForm = {
    name: '', description: '', location_type: 'office',
    latitude: -6.2088, longitude: 106.8456, radius_meters: 100,
    address: '', is_active: true,
  };
  const [geoForm, setGeoForm] = useState(defaultGeoForm);

  // Rotation form
  const defaultRotForm = {
    name: '', description: '', rotation_type: 'weekly',
    rotation_pattern: [] as any[], is_active: true,
    auto_generate: true, generate_weeks_ahead: 2,
  };
  const [rotForm, setRotForm] = useState(defaultRotForm);

  // Toast
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/attendance-management');
      const json = await res.json();
      if (json.success) {
        setShifts(json.shifts || []);
        setGeofences(json.geofences || []);
        setRotations(json.rotations || []);
        setSettings(json.settings || {});
        setSettingsRaw(json.settingsRaw || []);
        setTodayStats(json.todayStats || {});
        setTodayRecords(json.todayRecords || []);
      }
    } catch {
      setShifts(MOCK_AM_SHIFTS);
      setGeofences(MOCK_AM_GEO);
      setTodayStats(MOCK_AM_STATS);
      setTodayRecords(MOCK_AM_RECORDS);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);
  if (!mounted) return null;

  // ===== Shift handlers =====
  const openNewShift = () => { setEditingShift(null); setShiftForm({ ...defaultShiftForm, sort_order: shifts.length + 1 }); setShowShiftModal(true); };
  const openEditShift = (s: WorkShift) => {
    setEditingShift(s);
    setShiftForm({
      code: s.code, name: s.name, description: s.description || '',
      shift_type: s.shift_type, start_time: s.start_time, end_time: s.end_time,
      break_start: s.break_start || '12:00', break_end: s.break_end || '13:00',
      break_duration_minutes: s.break_duration_minutes || 60,
      is_cross_day: s.is_cross_day || false,
      work_hours_per_day: s.work_hours_per_day || 8,
      color: s.color || '#3B82F6',
      tolerance_late_minutes: s.tolerance_late_minutes || 15,
      overtime_after_minutes: s.overtime_after_minutes || 30,
      applicable_days: s.applicable_days || [1,2,3,4,5],
      is_active: s.is_active !== false, sort_order: s.sort_order || 0,
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async () => {
    if (!shiftForm.code || !shiftForm.name) { showToast('error', 'Kode dan Nama wajib'); return; }
    try {
      const isEdit = !!editingShift;
      const payload: any = { ...shiftForm, startTime: shiftForm.start_time, endTime: shiftForm.end_time, breakStart: shiftForm.break_start, breakEnd: shiftForm.break_end, breakDurationMinutes: shiftForm.break_duration_minutes, isCrossDay: shiftForm.is_cross_day, workHoursPerDay: shiftForm.work_hours_per_day, toleranceLateMinutes: shiftForm.tolerance_late_minutes, overtimeAfterMinutes: shiftForm.overtime_after_minutes, applicableDays: shiftForm.applicable_days, isActive: shiftForm.is_active, sortOrder: shiftForm.sort_order, shiftType: shiftForm.shift_type };
      if (isEdit) payload.id = editingShift!.id;
      const res = await fetch('/api/hq/hris/attendance-management?action=shift', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) { showToast('success', isEdit ? 'Shift diperbarui' : 'Shift dibuat'); fetchData(); setShowShiftModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan shift'); }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Hapus shift ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/attendance-management?action=shift&id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('success', 'Shift dihapus'); fetchData(); }
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  // ===== Geofence handlers =====
  const openNewGeo = () => { setEditingGeo(null); setGeoForm({ ...defaultGeoForm }); setShowGeoModal(true); };
  const openEditGeo = (g: GeofenceLocation) => {
    setEditingGeo(g);
    setGeoForm({ name: g.name, description: g.description || '', location_type: g.location_type || 'office', latitude: g.latitude, longitude: g.longitude, radius_meters: g.radius_meters || 100, address: g.address || '', is_active: g.is_active !== false });
    setShowGeoModal(true);
  };

  const handleSaveGeo = async () => {
    if (!geoForm.name) { showToast('error', 'Nama wajib'); return; }
    try {
      const isEdit = !!editingGeo;
      const payload: any = { ...geoForm, locationType: geoForm.location_type, radiusMeters: geoForm.radius_meters, isActive: geoForm.is_active };
      if (isEdit) payload.id = editingGeo!.id;
      const res = await fetch('/api/hq/hris/attendance-management?action=geofence', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) { showToast('success', isEdit ? 'Lokasi diperbarui' : 'Lokasi dibuat'); fetchData(); setShowGeoModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan lokasi'); }
  };

  const handleDeleteGeo = async (id: string) => {
    if (!confirm('Hapus lokasi ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/attendance-management?action=geofence&id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('success', 'Lokasi dihapus'); fetchData(); }
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  // ===== Rotation handlers =====
  const openNewRotation = () => { setEditingRotation(null); setRotForm({ ...defaultRotForm, rotation_pattern: shifts.length > 0 ? [{ week: 1, shift_id: shifts[0]?.id, shift_code: shifts[0]?.code }] : [] }); setShowRotationModal(true); };

  const handleSaveRotation = async () => {
    if (!rotForm.name || rotForm.rotation_pattern.length === 0) { showToast('error', 'Nama dan minimal 1 pola wajib'); return; }
    try {
      const isEdit = !!editingRotation;
      const payload: any = { ...rotForm, rotationType: rotForm.rotation_type, rotationPattern: rotForm.rotation_pattern, isActive: rotForm.is_active, autoGenerate: rotForm.auto_generate, generateWeeksAhead: rotForm.generate_weeks_ahead };
      if (isEdit) payload.id = editingRotation!.id;
      const res = await fetch('/api/hq/hris/attendance-management?action=rotation', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) { showToast('success', isEdit ? 'Rotasi diperbarui' : 'Rotasi dibuat'); fetchData(); setShowRotationModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan rotasi'); }
  };

  const handleDeleteRotation = async (id: string) => {
    if (!confirm('Hapus rotasi ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/attendance-management?action=rotation&id=${id}`, { method: 'DELETE' });
      if ((await res.json()).success) { showToast('success', 'Dihapus'); fetchData(); }
    } catch { showToast('error', 'Gagal'); }
  };

  const handleGenerateRotation = async (id: string) => {
    try {
      const res = await fetch('/api/hq/hris/attendance-management?action=generate-rotation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rotationId: id }) });
      const json = await res.json();
      if (json.success) showToast('success', json.message || 'Jadwal di-generate');
      else showToast('error', json.error || 'Gagal');
      fetchData();
    } catch { showToast('error', 'Gagal generate'); }
  };

  // ===== Settings handler =====
  const handleSaveSetting = async (key: string, value: any) => {
    try {
      const res = await fetch('/api/hq/hris/attendance-management?action=settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      const json = await res.json();
      if (json.success) { showToast('success', 'Pengaturan disimpan'); fetchData(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan'); }
  };

  const getShiftIcon = (type: string) => {
    if (type === 'regular') return Sun;
    if (type === 'office') return Building2;
    if (type === 'field') return Navigation;
    if (type === 'flexible') return Timer;
    return Clock;
  };

  return (
    <HQLayout title={t('hris.timeAttendanceTitle')} subtitle={t('hris.timeAttendanceSubtitle')}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total Hari Ini', value: todayStats.total || 0, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Hadir', value: todayStats.present || 0, icon: UserCheck, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Terlambat', value: todayStats.late || 0, icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Tidak Hadir', value: todayStats.absent || 0, icon: UserX, bg: 'bg-red-100', color: 'text-red-600' },
            { label: 'Cuti/Sakit', value: todayStats.leave || 0, icon: Coffee, bg: 'bg-purple-100', color: 'text-purple-600' },
            { label: 'Masih Kerja', value: todayStats.clockedIn || 0, icon: Timer, bg: 'bg-cyan-100', color: 'text-cyan-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${s.bg} rounded-lg`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                <div>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'live', label: 'Live Hari Ini', icon: TrendingUp },
              { key: 'shifts', label: 'Manajemen Shift', icon: Clock },
              { key: 'geofence', label: 'Geofencing', icon: MapPin },
              { key: 'rotations', label: 'Rotasi Shift', icon: RotateCcw },
              { key: 'settings', label: 'Pengaturan', icon: Settings },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== TAB: Live Today ==================== */}
          {activeTab === 'live' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Kehadiran Hari Ini</h3>
                  <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {todayRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada data kehadiran hari ini</p>
                  <p className="text-xs text-gray-400 mt-1">Data akan muncul saat karyawan melakukan clock-in</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase">Karyawan</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Clock In</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Clock Out</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Status</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Metode</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Jam Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {todayRecords.map((r: any, i: number) => {
                        const statusMap: Record<string, { label: string; cls: string }> = {
                          present: { label: 'Hadir', cls: 'bg-green-100 text-green-700' },
                          late: { label: 'Terlambat', cls: 'bg-yellow-100 text-yellow-700' },
                          absent: { label: 'Tidak Hadir', cls: 'bg-red-100 text-red-700' },
                          leave: { label: 'Cuti', cls: 'bg-blue-100 text-blue-700' },
                          sick: { label: 'Sakit', cls: 'bg-purple-100 text-purple-700' },
                          work_from_home: { label: 'WFH', cls: 'bg-cyan-100 text-cyan-700' },
                        };
                        const st = statusMap[r.status] || statusMap.present;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <p className="font-medium">{r.employee_name || `Emp #${r.employee_id}`}</p>
                              <p className="text-xs text-gray-500">{r.position || ''} {r.department ? `· ${r.department}` : ''}</p>
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-xs">
                              {r.clock_in ? new Date(r.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-xs">
                              {r.clock_out ? new Date(r.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-500 animate-pulse">Aktif</span>}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                              {r.late_minutes > 0 && <span className="text-[10px] text-yellow-600 ml-1">+{r.late_minutes}m</span>}
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-gray-500">{r.clock_in_method || 'manual'}</td>
                            <td className="px-4 py-2 text-center font-medium">{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: Shift Management ==================== */}
          {activeTab === 'shifts' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Manajemen Shift</h3>
                  <p className="text-sm text-gray-500">{shifts.length} shift terdefinisi &mdash; sesuaikan untuk industri Anda</p>
                </div>
                <button onClick={openNewShift} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Shift
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map(s => {
                  const ShiftIcon = getShiftIcon(s.shift_type);
                  return (
                    <div key={s.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow group relative ${!s.is_active ? 'opacity-60' : ''}`}>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditShift(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteShift(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl" style={{ backgroundColor: s.color + '20' }}>
                          <ShiftIcon className="w-5 h-5" style={{ color: s.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-sm truncate">{s.name}</h4>
                            {!s.is_active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] rounded">OFF</span>}
                            {s.is_cross_day && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[9px] rounded">Cross-Day</span>}
                          </div>
                          <p className="text-xs text-gray-500">{s.code} &middot; {s.shift_type}</p>
                        </div>
                      </div>

                      {s.description && <p className="text-xs text-gray-400 mt-2 line-clamp-1">{s.description}</p>}

                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 font-mono font-bold" style={{ color: s.color }}>
                          <Clock className="w-3.5 h-3.5" />
                          {s.start_time} - {s.end_time}
                        </div>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">{s.work_hours_per_day}h kerja</span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">Hari:</span>
                        {[0,1,2,3,4,5,6].map(d => (
                          <span key={d} className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-medium ${
                            (s.applicable_days || []).includes(d) ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-300'}`}>
                            {DAY_NAMES[d][0]}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">Toleransi: {s.tolerance_late_minutes}m</span>
                        <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">Istirahat: {s.break_duration_minutes}m</span>
                        {(s.overtime_after_minutes || 0) > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">OT setelah {s.overtime_after_minutes}m</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB: Geofence ==================== */}
          {activeTab === 'geofence' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Geofencing Lokasi</h3>
                  <p className="text-sm text-gray-500">Validasi kehadiran berdasarkan lokasi GPS &mdash; {geofences.length} lokasi</p>
                </div>
                <button onClick={openNewGeo} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Lokasi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geofences.map(g => (
                  <div key={g.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow group relative ${!g.is_active ? 'opacity-60' : ''}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditGeo(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteGeo(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-red-50">
                        <MapPin className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{g.name}</h4>
                        <p className="text-xs text-gray-500">{g.location_type}</p>
                      </div>
                    </div>

                    {g.address && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{g.address}</p>}

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <span className="text-gray-500">Koordinat</span>
                        <p className="font-mono font-medium text-[10px]">{g.latitude?.toFixed?.(4) || g.latitude}, {g.longitude?.toFixed?.(4) || g.longitude}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <span className="text-gray-500">Radius</span>
                        <p className="font-bold">{g.radius_meters}m</p>
                      </div>
                    </div>

                    {/* Visual radius indicator */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(g.radius_meters / 5, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{g.radius_meters}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB: Rotations ==================== */}
          {activeTab === 'rotations' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Rotasi Shift Otomatis</h3>
                  <p className="text-sm text-gray-500">Atur pola rotasi shift karyawan secara otomatis</p>
                </div>
                <button onClick={openNewRotation} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Rotasi
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rotations.map(rot => (
                  <div key={rot.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-blue-600" /> {rot.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{rot.description}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleGenerateRotation(rot.id)} className="p-1 text-gray-400 hover:text-green-600 rounded" title="Generate Jadwal"><RefreshCw className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteRotation(rot.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{rot.rotation_type}</span>
                      {rot.auto_generate && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Auto-generate</span>}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{rot.generate_weeks_ahead} minggu ke depan</span>
                      {rot.last_generated_date && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Last: {rot.last_generated_date}</span>}
                    </div>

                    {/* Pattern visualization */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {(rot.rotation_pattern || []).map((p: any, i: number) => {
                        const matchShift = shifts.find(s => s.id === p.shift_id || s.code === p.shift_code);
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <div className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{ borderColor: matchShift?.color || '#ccc', backgroundColor: (matchShift?.color || '#ccc') + '15', color: matchShift?.color || '#666' }}>
                              W{p.week}: {matchShift?.name || p.shift_code}
                            </div>
                            {i < (rot.rotation_pattern || []).length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {rotations.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    <RotateCcw className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Belum ada pola rotasi</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: Settings ==================== */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              <h3 className="font-semibold text-lg">Pengaturan Absensi</h3>

              {/* Clock Methods */}
              <SettingCard title="Metode Absensi" desc="Pilih metode absensi yang diaktifkan" icon={<Fingerprint className="w-5 h-5 text-blue-600" />}>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                  {['manual', 'gps', 'face_recognition', 'fingerprint', 'qr_code', 'nfc'].map(m => {
                    const Icon = CLOCK_METHOD_ICONS[m] || Clock;
                    const enabled = (settings.clock_methods?.methods || []).includes(m);
                    return (
                      <button key={m} onClick={() => {
                        const current = settings.clock_methods?.methods || [];
                        const updated = enabled ? current.filter((x: string) => x !== m) : [...current, m];
                        handleSaveSetting('clock_methods', { ...settings.clock_methods, methods: updated });
                      }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs ${enabled ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{CLOCK_METHOD_LABELS[m]}</span>
                      </button>
                    );
                  })}
                </div>
              </SettingCard>

              {/* Geofencing */}
              <SettingCard title="Geofencing" desc="Validasi lokasi saat absensi" icon={<MapPin className="w-5 h-5 text-red-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <ToggleSetting label="Aktifkan Geofencing" checked={settings.geofencing?.enabled} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, enabled: v })} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Radius Default (m)</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.geofencing?.default_radius_meters || 100}
                      onChange={(e) => handleSaveSetting('geofencing', { ...settings.geofencing, default_radius_meters: parseInt(e.target.value) })} />
                  </div>
                  <ToggleSetting label="Izinkan di Luar Geofence" checked={settings.geofencing?.allow_outside_geofence} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, allow_outside_geofence: v })} />
                  <ToggleSetting label="Wajib Foto jika di Luar" checked={settings.geofencing?.require_photo_outside} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, require_photo_outside: v })} />
                </div>
              </SettingCard>

              {/* Overtime */}
              <SettingCard title="Lembur" desc="Deteksi dan perhitungan lembur otomatis" icon={<Timer className="w-5 h-5 text-amber-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <ToggleSetting label="Deteksi Otomatis" checked={settings.overtime?.auto_detect} onChange={(v) => handleSaveSetting('overtime', { ...settings.overtime, auto_detect: v })} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Lembur (menit)</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.min_overtime_minutes || 30}
                      onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, min_overtime_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Multiplier Weekday</label>
                    <input type="number" step="0.1" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.weekday_multiplier || 1.5}
                      onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, weekday_multiplier: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Multiplier Weekend</label>
                    <input type="number" step="0.1" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.weekend_multiplier || 2.0}
                      onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, weekend_multiplier: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </SettingCard>

              {/* Late Policy */}
              <SettingCard title="Kebijakan Keterlambatan" desc="Atur toleransi dan konsekuensi keterlambatan" icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Grace Period (menit)</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.grace_period_minutes || 15}
                      onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, grace_period_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Maks Terlambat/Bulan</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.max_late_per_month || 3}
                      onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, max_late_per_month: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Potongan per Terlambat</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.deduction_per_late || 0}
                      onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, deduction_per_late: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Eskalasi Setelah</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.escalation_after || 5}
                      onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, escalation_after: parseInt(e.target.value) })} />
                  </div>
                </div>
              </SettingCard>

              {/* Photo Verification */}
              <SettingCard title="Verifikasi Foto" desc="Pengaturan selfie dan face matching" icon={<Camera className="w-5 h-5 text-indigo-500" />}>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <ToggleSetting label="Wajib Foto Clock In" checked={settings.photo_verification?.require_clock_in_photo} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, require_clock_in_photo: v })} />
                  <ToggleSetting label="Wajib Foto Clock Out" checked={settings.photo_verification?.require_clock_out_photo} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, require_clock_out_photo: v })} />
                  <ToggleSetting label="Face Matching" checked={settings.photo_verification?.enable_face_matching} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, enable_face_matching: v })} />
                </div>
              </SettingCard>

              {/* Auto Absent */}
              <SettingCard title="Otomatis Tandai Absent" desc="Tandai otomatis jika tidak clock-in" icon={<UserX className="w-5 h-5 text-red-500" />}>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <ToggleSetting label="Aktifkan" checked={settings.auto_absent?.enabled} onChange={(v) => handleSaveSetting('auto_absent', { ...settings.auto_absent, enabled: v })} />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tandai Absent Setelah (jam)</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.auto_absent?.mark_absent_after_hours || 4}
                      onChange={(e) => handleSaveSetting('auto_absent', { ...settings.auto_absent, mark_absent_after_hours: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Auto Clock-Out (jam)</label>
                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.auto_absent?.auto_clock_out_hours || 12}
                      onChange={(e) => handleSaveSetting('auto_absent', { ...settings.auto_absent, auto_clock_out_hours: parseInt(e.target.value) })} />
                  </div>
                </div>
              </SettingCard>
            </div>
          )}
        </div>
      </div>

      {/* ==================== SHIFT MODAL ==================== */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShiftModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingShift ? 'Edit' : 'Tambah'} Shift</h3>
              <button onClick={() => setShowShiftModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kode *</label>
                  <input type="text" value={shiftForm.code} onChange={e => setShiftForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="PAGI" disabled={!!editingShift} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label>
                  <input type="text" value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Shift Pagi" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label>
                  <input type="text" value={shiftForm.description} onChange={e => setShiftForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Deskripsi shift" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label>
                  <select value={shiftForm.shift_type} onChange={e => setShiftForm(f => ({ ...f, shift_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {SHIFT_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Jam Mulai *</label>
                  <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Jam Selesai *</label>
                  <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Istirahat Mulai</label>
                  <input type="time" value={shiftForm.break_start} onChange={e => setShiftForm(f => ({ ...f, break_start: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Istirahat Selesai</label>
                  <input type="time" value={shiftForm.break_end} onChange={e => setShiftForm(f => ({ ...f, break_end: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Durasi Istirahat (m)</label>
                  <input type="number" value={shiftForm.break_duration_minutes} onChange={e => setShiftForm(f => ({ ...f, break_duration_minutes: parseInt(e.target.value) || 60 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Jam Kerja/Hari</label>
                  <input type="number" step="0.5" value={shiftForm.work_hours_per_day} onChange={e => setShiftForm(f => ({ ...f, work_hours_per_day: parseFloat(e.target.value) || 8 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Toleransi Telat (m)</label>
                  <input type="number" value={shiftForm.tolerance_late_minutes} onChange={e => setShiftForm(f => ({ ...f, tolerance_late_minutes: parseInt(e.target.value) || 15 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">OT Setelah (m)</label>
                  <input type="number" value={shiftForm.overtime_after_minutes} onChange={e => setShiftForm(f => ({ ...f, overtime_after_minutes: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                </div>
              </div>

              {/* Applicable Days */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Hari Berlaku</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((d, i) => (
                    <button key={i} onClick={() => {
                      const days = shiftForm.applicable_days.includes(i) ? shiftForm.applicable_days.filter(x => x !== i) : [...shiftForm.applicable_days, i];
                      setShiftForm(f => ({ ...f, applicable_days: days }));
                    }} className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${shiftForm.applicable_days.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color & Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Warna</label>
                  <div className="flex gap-1.5">
                    {COLOR_PRESETS.map(c => (
                      <button key={c} onClick={() => setShiftForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-lg border-2 ${shiftForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={shiftForm.is_cross_day} onChange={e => setShiftForm(f => ({ ...f, is_cross_day: e.target.checked }))} className="rounded" />
                    <Moon className="w-4 h-4 text-purple-500" /> Cross-Day
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={shiftForm.is_active} onChange={e => setShiftForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    Aktif
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="border-2 border-dashed rounded-xl p-3">
                <p className="text-[10px] text-gray-400 mb-1">PREVIEW</p>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: shiftForm.color + '20' }}>
                    <Clock className="w-5 h-5" style={{ color: shiftForm.color }} />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{shiftForm.name || 'Nama Shift'}</span>
                    <span className="ml-2 font-mono text-xs" style={{ color: shiftForm.color }}>{shiftForm.start_time} - {shiftForm.end_time}</span>
                    <p className="text-[10px] text-gray-400">{shiftForm.code} &middot; {shiftForm.work_hours_per_day}h &middot; Toleransi {shiftForm.tolerance_late_minutes}m {shiftForm.is_cross_day ? '&middot; Cross-Day' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveShift} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GEOFENCE MODAL ==================== */}
      {showGeoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGeoModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingGeo ? 'Edit' : 'Tambah'} Lokasi Geofence</h3>
              <button onClick={() => setShowGeoModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nama Lokasi *</label>
                  <input type="text" value={geoForm.name} onChange={e => setGeoForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Kantor Pusat" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Alamat</label>
                  <input type="text" value={geoForm.address} onChange={e => setGeoForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Jl. Sudirman No. 1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label>
                  <select value={geoForm.location_type} onChange={e => setGeoForm(f => ({ ...f, location_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Radius (meter)</label>
                  <input type="number" value={geoForm.radius_meters} onChange={e => setGeoForm(f => ({ ...f, radius_meters: parseInt(e.target.value) || 100 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={10} max={5000} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  <input type="number" step="0.0000001" value={geoForm.latitude} onChange={e => setGeoForm(f => ({ ...f, latitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  <input type="number" step="0.0000001" value={geoForm.longitude} onChange={e => setGeoForm(f => ({ ...f, longitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={geoForm.is_active} onChange={e => setGeoForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Aktif
              </label>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Tip: Buka Google Maps, klik kanan lokasi &rarr; salin koordinat. Format: latitude, longitude
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowGeoModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveGeo} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ROTATION MODAL ==================== */}
      {showRotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRotationModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingRotation ? 'Edit' : 'Tambah'} Rotasi Shift</h3>
              <button onClick={() => setShowRotationModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label>
                <input type="text" value={rotForm.name} onChange={e => setRotForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Rotasi 3 Shift" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label>
                <input type="text" value={rotForm.description} onChange={e => setRotForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Rotasi</label>
                  <select value={rotForm.rotation_type} onChange={e => setRotForm(f => ({ ...f, rotation_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="weekly">Mingguan</option>
                    <option value="biweekly">2 Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Generate (minggu)</label>
                  <input type="number" value={rotForm.generate_weeks_ahead} onChange={e => setRotForm(f => ({ ...f, generate_weeks_ahead: parseInt(e.target.value) || 2 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={1} max={12} />
                </div>
              </div>

              {/* Pattern Builder */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-500">Pola Rotasi *</label>
                  <button onClick={() => setRotForm(f => ({ ...f, rotation_pattern: [...f.rotation_pattern, { week: f.rotation_pattern.length + 1, shift_id: shifts[0]?.id, shift_code: shifts[0]?.code }] }))}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Tambah</button>
                </div>
                <div className="space-y-2">
                  {rotForm.rotation_pattern.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">W{p.week}</span>
                      <select value={p.shift_id || ''} onChange={e => {
                        const updated = [...rotForm.rotation_pattern];
                        const sel = shifts.find(s => s.id === e.target.value);
                        updated[i] = { ...updated[i], shift_id: e.target.value, shift_code: sel?.code || '' };
                        setRotForm(f => ({ ...f, rotation_pattern: updated }));
                      }} className="flex-1 px-2 py-1.5 border rounded text-sm">
                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                      </select>
                      {rotForm.rotation_pattern.length > 1 && (
                        <button onClick={() => {
                          const updated = rotForm.rotation_pattern.filter((_, j) => j !== i).map((p, j) => ({ ...p, week: j + 1 }));
                          setRotForm(f => ({ ...f, rotation_pattern: updated }));
                        }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rotForm.auto_generate} onChange={e => setRotForm(f => ({ ...f, auto_generate: e.target.checked }))} className="rounded" /> Auto-generate jadwal</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rotForm.is_active} onChange={e => setRotForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Aktif</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowRotationModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveRotation} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}

// ===== Helper Components =====
function SettingCard({ title, desc, icon, children }: { title: string; desc: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-start gap-3 mb-1">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
      <input type="checkbox" checked={checked || false} onChange={e => onChange(e.target.checked)} className="rounded" />
      {checked ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
      <span className={`text-xs ${checked ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{label}</span>
    </label>
  );
}
