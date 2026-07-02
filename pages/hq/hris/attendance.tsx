import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Clock, Users, UserCheck, UserX, MapPin, Shield, Settings, Calendar,
  Plus, Edit, Trash2, Save, X, RefreshCw, CheckCircle, AlertCircle,
  Search, Filter, Download, Eye, ChevronRight, ChevronLeft, ArrowRight, Copy,
  Fingerprint, Camera, QrCode, Smartphone, Wifi, Globe, Timer,
  Sun, Moon, Sunset, Coffee, Building2, Navigation, ToggleLeft, ToggleRight,
  Layers, RotateCcw, AlertTriangle, Info, Palette, TrendingUp, XCircle
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
  radius_meters: number; address?: string; branch_id?: string; is_active: boolean;
}
interface ShiftRotation {
  id: string; name: string; description?: string;
  rotation_type: string; rotation_pattern: any[];
  employee_ids?: number[]; is_active: boolean;
  auto_generate: boolean; generate_weeks_ahead: number;
  last_generated_date?: string;
}
interface DailyRecord {
  id: string; employeeName: string; employeeId: string; position: string; branchName: string;
  clockIn: string | null; clockOut: string | null; status: string;
  lateMinutes: number; earlyLeaveMinutes: number; overtimeMinutes: number;
  workHours: number; source: string; isOutsideGeofence: boolean;
}
interface MonthlyRecord {
  employeeId: string; employeeName: string; branchName: string; position: string;
  present: number; late: number; absent: number; leave: number; workFromHome: number;
  totalDays: number; attendanceRate: number;
}
interface BranchSummary {
  branchId: string; branchName: string; totalEmployees: number;
  avgAttendance: number; onTimeRate: number; lateRate: number; absentRate: number;
}

// ===== Constants =====
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const SHIFT_TYPES = [
  { v: 'regular', l: 'Reguler' }, { v: 'office', l: 'Kantor' },
  { v: 'split', l: 'Terbagi' }, { v: 'extended', l: 'Diperpanjang (12J)' },
  { v: 'flexible', l: 'Fleksibel' }, { v: 'field', l: 'Lapangan' },
];
const LOCATION_TYPES = ['office', 'branch', 'warehouse', 'factory', 'site', 'other'];
const COLOR_PRESETS = ['#F59E0B','#3B82F6','#8B5CF6','#10B981','#EC4899','#EF4444','#06B6D4','#14B8A6','#F43F5E','#6B7280'];
const CLOCK_METHOD_ICONS: Record<string, any> = {
  manual: Clock, gps: MapPin, face_recognition: Camera, fingerprint: Fingerprint, qr_code: QrCode, nfc: Wifi
};
const CLOCK_METHOD_LABELS: Record<string, string> = {
  manual: 'Manual', gps: 'GPS', face_recognition: 'Pengenalan Wajah',
  fingerprint: 'Sidik Jari', qr_code: 'Kode QR', nfc: 'NFC'
};


type TabKey = 'live' | 'daily' | 'monthly' | 'shifts' | 'geofence' | 'rotations' | 'settings';

const MOCK_SHIFTS: WorkShift[] = [
  { id: 's1', code: 'PAGI', name: 'Shift Pagi', description: 'Shift reguler pagi', shift_type: 'regular', start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#3B82F6', tolerance_late_minutes: 15, overtime_after_minutes: 30, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 1 },
  { id: 's2', code: 'SIANG', name: 'Shift Siang', description: 'Shift reguler siang', shift_type: 'regular', start_time: '14:00', end_time: '22:00', break_start: '18:00', break_end: '18:30', break_duration_minutes: 30, is_cross_day: false, work_hours_per_day: 8, color: '#F59E0B', tolerance_late_minutes: 15, overtime_after_minutes: 30, applicable_days: [1,2,3,4,5,6], is_active: true, sort_order: 2 },
  { id: 's3', code: 'MALAM', name: 'Shift Malam', description: 'Shift malam / night shift', shift_type: 'regular', start_time: '22:00', end_time: '06:00', break_start: '02:00', break_end: '02:30', break_duration_minutes: 30, is_cross_day: true, work_hours_per_day: 8, color: '#8B5CF6', tolerance_late_minutes: 15, overtime_after_minutes: 30, applicable_days: [1,2,3,4,5,6], is_active: true, sort_order: 3 },
  { id: 's4', code: 'FLEX', name: 'Shift Fleksibel', description: 'Jam fleksibel untuk kantor', shift_type: 'flexible', start_time: '07:00', end_time: '16:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#10B981', tolerance_late_minutes: 30, overtime_after_minutes: 60, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 4 },
];

const MOCK_GEOFENCES: GeofenceLocation[] = [
  { id: 'g1', name: 'Kantor Pusat Jakarta', description: 'HQ Jakarta', location_type: 'office', latitude: -6.2088, longitude: 106.8456, radius_meters: 150, address: 'Jl. Sudirman No. 1, Jakarta', is_active: true },
  { id: 'g2', name: 'Cabang Bandung', location_type: 'branch', latitude: -6.9175, longitude: 107.6191, radius_meters: 100, address: 'Jl. Braga No. 10, Bandung', is_active: true },
  { id: 'g3', name: 'Gudang Bekasi', location_type: 'warehouse', latitude: -6.2383, longitude: 106.9756, radius_meters: 200, address: 'Jl. Industri No. 5, Bekasi', is_active: true },
  { id: 'g4', name: 'Cabang Bali', location_type: 'branch', latitude: -8.6500, longitude: 115.2167, radius_meters: 100, address: 'Jl. Sunset Road No. 88, Bali', is_active: true },
];

const MOCK_DAILY_RECORDS: DailyRecord[] = [
  { id: 'd1', employeeName: 'Ahmad Wijaya', employeeId: 'EMP-001', position: 'General Manager', branchName: 'Kantor Pusat Jakarta', clockIn: '2026-03-12T07:55:00', clockOut: '2026-03-12T17:05:00', status: 'present', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 5, workHours: 8.17, source: 'fingerprint', isOutsideGeofence: false },
  { id: 'd2', employeeName: 'Siti Rahayu', employeeId: 'EMP-002', position: 'Branch Manager', branchName: 'Cabang Bandung', clockIn: '2026-03-12T08:22:00', clockOut: '2026-03-12T17:30:00', status: 'late', lateMinutes: 22, earlyLeaveMinutes: 0, overtimeMinutes: 30, workHours: 8.13, source: 'face_recognition', isOutsideGeofence: false },
  { id: 'd3', employeeName: 'Budi Santoso', employeeId: 'EMP-003', position: 'Branch Manager', branchName: 'Cabang Surabaya', clockIn: '2026-03-12T07:50:00', clockOut: '2026-03-12T17:00:00', status: 'present', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 8.17, source: 'gps_mobile', isOutsideGeofence: false },
  { id: 'd4', employeeName: 'Dewi Lestari', employeeId: 'EMP-004', position: 'Branch Manager', branchName: 'Cabang Medan', clockIn: null, clockOut: null, status: 'absent', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 0, source: 'manual', isOutsideGeofence: false },
  { id: 'd5', employeeName: 'Eko Prasetyo', employeeId: 'EMP-005', position: 'Warehouse Supervisor', branchName: 'Gudang Pusat Bekasi', clockIn: '2026-03-12T07:45:00', clockOut: null, status: 'present', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 0, source: 'fingerprint', isOutsideGeofence: false },
  { id: 'd6', employeeName: 'Lisa Permata', employeeId: 'EMP-006', position: 'Finance Manager', branchName: 'Kantor Pusat Jakarta', clockIn: '2026-03-12T08:00:00', clockOut: '2026-03-12T17:15:00', status: 'present', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 15, workHours: 8.25, source: 'face_recognition', isOutsideGeofence: false },
  { id: 'd7', employeeName: 'Rina Anggraini', employeeId: 'EMP-011', position: 'Head Chef', branchName: 'Cabang Bali', clockIn: null, clockOut: null, status: 'leave', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 0, source: 'manual', isOutsideGeofence: false },
  { id: 'd8', employeeName: 'Fajar Setiawan', employeeId: 'EMP-010', position: 'Sales Supervisor', branchName: 'Cabang Bandung', clockIn: '2026-03-12T08:05:00', clockOut: '2026-03-12T17:00:00', status: 'present', lateMinutes: 5, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 7.92, source: 'gps_mobile', isOutsideGeofence: false },
];

const MOCK_MONTHLY_RECORDS: MonthlyRecord[] = [
  { employeeId: 'EMP-001', employeeName: 'Ahmad Wijaya', branchName: 'Kantor Pusat Jakarta', position: 'General Manager', present: 20, late: 1, absent: 0, leave: 1, workFromHome: 2, totalDays: 22, attendanceRate: 100 },
  { employeeId: 'EMP-002', employeeName: 'Siti Rahayu', branchName: 'Cabang Bandung', position: 'Branch Manager', present: 18, late: 3, absent: 0, leave: 1, workFromHome: 0, totalDays: 22, attendanceRate: 95 },
  { employeeId: 'EMP-003', employeeName: 'Budi Santoso', branchName: 'Cabang Surabaya', position: 'Branch Manager', present: 21, late: 0, absent: 1, leave: 0, workFromHome: 0, totalDays: 22, attendanceRate: 95 },
  { employeeId: 'EMP-005', employeeName: 'Eko Prasetyo', branchName: 'Gudang Pusat Bekasi', position: 'Warehouse Supervisor', present: 22, late: 0, absent: 0, leave: 0, workFromHome: 0, totalDays: 22, attendanceRate: 100 },
  { employeeId: 'EMP-006', employeeName: 'Lisa Permata', branchName: 'Kantor Pusat Jakarta', position: 'Finance Manager', present: 19, late: 0, absent: 0, leave: 0, workFromHome: 3, totalDays: 22, attendanceRate: 100 },
  { employeeId: 'EMP-010', employeeName: 'Fajar Setiawan', branchName: 'Cabang Bandung', position: 'Sales Supervisor', present: 17, late: 4, absent: 1, leave: 0, workFromHome: 0, totalDays: 22, attendanceRate: 82 },
  { employeeId: 'EMP-011', employeeName: 'Rina Anggraini', branchName: 'Cabang Bali', position: 'Head Chef', present: 15, late: 0, absent: 0, leave: 5, workFromHome: 0, totalDays: 22, attendanceRate: 91 },
];

const MOCK_BRANCH_SUMMARY: BranchSummary[] = [
  { branchId: '1', branchName: 'Kantor Pusat Jakarta', totalEmployees: 35, avgAttendance: 96, onTimeRate: 92, lateRate: 5, absentRate: 3 },
  { branchId: '2', branchName: 'Cabang Bandung', totalEmployees: 24, avgAttendance: 91, onTimeRate: 85, lateRate: 10, absentRate: 5 },
  { branchId: '3', branchName: 'Cabang Surabaya', totalEmployees: 22, avgAttendance: 94, onTimeRate: 90, lateRate: 6, absentRate: 4 },
  { branchId: '5', branchName: 'Cabang Bali', totalEmployees: 18, avgAttendance: 93, onTimeRate: 88, lateRate: 7, absentRate: 5 },
  { branchId: '8', branchName: 'Gudang Pusat Bekasi', totalEmployees: 28, avgAttendance: 97, onTimeRate: 95, lateRate: 3, absentRate: 2 },
];

export default function AttendancePage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('live');

  // === Management data (shifts, geofence, rotations, settings, live) ===
  const [shifts, setShifts] = useState<WorkShift[]>(MOCK_SHIFTS);
  const [geofences, setGeofences] = useState<GeofenceLocation[]>(MOCK_GEOFENCES);
  const [rotations, setRotations] = useState<ShiftRotation[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [todayStats, setTodayStats] = useState<any>({});
  const [todayRecords, setTodayRecords] = useState<any[]>([]);

  // === Daily data ===
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySearch, setDailySearch] = useState('');
  const [dailyBranch, setDailyBranch] = useState('all');
  const [dailyStatus, setDailyStatus] = useState('all');
  const [dailySource, setDailySource] = useState('all');

  // === Monthly data ===
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyRecord[]>([]);
  const [branchSummary, setBranchSummary] = useState<BranchSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [monthlySearch, setMonthlySearch] = useState('');
  const [monthlyBranch, setMonthlyBranch] = useState('all');

  // === Modals & Forms ===
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState<GeofenceLocation | null>(null);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [editingRotation, setEditingRotation] = useState<ShiftRotation | null>(null);

  const defaultShiftForm = { code: '', name: '', description: '', shift_type: 'regular', start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#3B82F6', tolerance_late_minutes: 15, overtime_after_minutes: 30, applicable_days: [1,2,3,4,5] as number[], is_active: true, sort_order: 0 };
  const [shiftForm, setShiftForm] = useState(defaultShiftForm);
  const defaultGeoForm = { name: '', description: '', location_type: 'office', latitude: -6.2088, longitude: 106.8456, radius_meters: 100, address: '', is_active: true };
  const [geoForm, setGeoForm] = useState(defaultGeoForm);
  const defaultRotForm = { name: '', description: '', rotation_type: 'weekly', rotation_pattern: [] as any[], is_active: true, auto_generate: true, generate_weeks_ahead: 2 };
  const [rotForm, setRotForm] = useState(defaultRotForm);

  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => { setToast({ type, message }); setTimeout(() => setToast(null), 3500); };

  // ===== Data Fetching =====
  const fetchManagementData = async () => {
    try {
      const res = await fetch('/api/hq/hris/attendance-management');
      const json = await res.json();
      if (json.success) {
        setShifts(json.shifts?.length ? json.shifts : MOCK_SHIFTS);
        setGeofences(json.geofences?.length ? json.geofences : MOCK_GEOFENCES);
        setRotations(json.rotations || []);
        setSettings(json.settings || {}); setTodayStats(json.todayStats || {}); setTodayRecords(json.todayRecords?.length ? json.todayRecords : MOCK_DAILY_RECORDS);
      } else {
        setShifts(MOCK_SHIFTS); setGeofences(MOCK_GEOFENCES); setTodayRecords(MOCK_DAILY_RECORDS);
      }
    } catch {
      setShifts(MOCK_SHIFTS); setGeofences(MOCK_GEOFENCES); setTodayRecords(MOCK_DAILY_RECORDS);
    }
  };

  const fetchDailyData = async () => {
    try {
      const res = await fetch(`/api/hq/hris/attendance?period=${selectedDate}&view=daily`);
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const records = payload.dailyRecords || payload.attendance || [];
        setDailyRecords(records.length > 0 ? records : MOCK_DAILY_RECORDS);
      } else setDailyRecords(MOCK_DAILY_RECORDS);
    } catch { setDailyRecords(MOCK_DAILY_RECORDS); }
  };

  const fetchMonthlyData = async () => {
    try {
      const res = await fetch(`/api/hq/hris/attendance?period=${selectedMonth}`);
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const att = payload.attendance || [];
        const bs = payload.branchSummary || [];
        setMonthlyRecords(att.length > 0 ? att : MOCK_MONTHLY_RECORDS);
        setBranchSummary(bs.length > 0 ? bs : MOCK_BRANCH_SUMMARY);
      } else { setMonthlyRecords(MOCK_MONTHLY_RECORDS); setBranchSummary(MOCK_BRANCH_SUMMARY); }
    } catch { setMonthlyRecords(MOCK_MONTHLY_RECORDS); setBranchSummary(MOCK_BRANCH_SUMMARY); }
  };

  useEffect(() => {
    setMounted(true);
    Promise.all([fetchManagementData(), fetchDailyData(), fetchMonthlyData()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (mounted) fetchDailyData(); }, [selectedDate]);
  useEffect(() => { if (mounted) fetchMonthlyData(); }, [selectedMonth]);

  if (!mounted) return null;

  // ===== Shift Handlers =====
  const openNewShift = () => { setEditingShift(null); setShiftForm({ ...defaultShiftForm, sort_order: shifts.length + 1 }); setShowShiftModal(true); };
  const openEditShift = (s: WorkShift) => {
    setEditingShift(s);
    setShiftForm({ code: s.code, name: s.name, description: s.description || '', shift_type: s.shift_type, start_time: s.start_time, end_time: s.end_time, break_start: s.break_start || '12:00', break_end: s.break_end || '13:00', break_duration_minutes: s.break_duration_minutes || 60, is_cross_day: s.is_cross_day || false, work_hours_per_day: s.work_hours_per_day || 8, color: s.color || '#3B82F6', tolerance_late_minutes: s.tolerance_late_minutes || 15, overtime_after_minutes: s.overtime_after_minutes || 30, applicable_days: s.applicable_days || [1,2,3,4,5], is_active: s.is_active !== false, sort_order: s.sort_order || 0 });
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
      if (json.success) { showToast('success', isEdit ? 'Shift diperbarui' : 'Shift dibuat'); fetchManagementData(); setShowShiftModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan shift'); }
  };
  const handleDeleteShift = async (id: string) => {
    if (!confirm('Hapus shift ini?')) return;
    try { const res = await fetch(`/api/hq/hris/attendance-management?action=shift&id=${id}`, { method: 'DELETE' }); if ((await res.json()).success) { showToast('success', 'Shift dihapus'); fetchManagementData(); } } catch { showToast('error', 'Gagal menghapus'); }
  };

  // ===== Geofence Handlers =====
  const openNewGeo = () => { setEditingGeo(null); setGeoForm({ ...defaultGeoForm }); setShowGeoModal(true); };
  const openEditGeo = (g: GeofenceLocation) => { setEditingGeo(g); setGeoForm({ name: g.name, description: g.description || '', location_type: g.location_type || 'office', latitude: g.latitude, longitude: g.longitude, radius_meters: g.radius_meters || 100, address: g.address || '', is_active: g.is_active !== false }); setShowGeoModal(true); };
  const handleSaveGeo = async () => {
    if (!geoForm.name) { showToast('error', 'Nama wajib'); return; }
    try {
      const isEdit = !!editingGeo;
      const payload: any = { ...geoForm, locationType: geoForm.location_type, radiusMeters: geoForm.radius_meters, isActive: geoForm.is_active };
      if (isEdit) payload.id = editingGeo!.id;
      const res = await fetch('/api/hq/hris/attendance-management?action=geofence', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if ((await res.json()).success) { showToast('success', isEdit ? 'Lokasi diperbarui' : 'Lokasi dibuat'); fetchManagementData(); setShowGeoModal(false); }
    } catch { showToast('error', 'Gagal menyimpan lokasi'); }
  };
  const handleDeleteGeo = async (id: string) => {
    if (!confirm('Hapus lokasi ini?')) return;
    try { if ((await (await fetch(`/api/hq/hris/attendance-management?action=geofence&id=${id}`, { method: 'DELETE' })).json()).success) { showToast('success', 'Lokasi dihapus'); fetchManagementData(); } } catch { showToast('error', 'Gagal'); }
  };

  // ===== Rotation Handlers =====
  const openNewRotation = () => { setEditingRotation(null); setRotForm({ ...defaultRotForm, rotation_pattern: shifts.length > 0 ? [{ week: 1, shift_id: shifts[0]?.id, shift_code: shifts[0]?.code }] : [] }); setShowRotationModal(true); };
  const handleSaveRotation = async () => {
    if (!rotForm.name || rotForm.rotation_pattern.length === 0) { showToast('error', 'Nama dan minimal 1 pola wajib'); return; }
    try {
      const isEdit = !!editingRotation;
      const payload: any = { ...rotForm, rotationType: rotForm.rotation_type, rotationPattern: rotForm.rotation_pattern, isActive: rotForm.is_active, autoGenerate: rotForm.auto_generate, generateWeeksAhead: rotForm.generate_weeks_ahead };
      if (isEdit) payload.id = editingRotation!.id;
      const res = await fetch('/api/hq/hris/attendance-management?action=rotation', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if ((await res.json()).success) { showToast('success', isEdit ? 'Rotasi diperbarui' : 'Rotasi dibuat'); fetchManagementData(); setShowRotationModal(false); }
    } catch { showToast('error', 'Gagal menyimpan rotasi'); }
  };
  const handleDeleteRotation = async (id: string) => {
    if (!confirm('Hapus rotasi ini?')) return;
    try { if ((await (await fetch(`/api/hq/hris/attendance-management?action=rotation&id=${id}`, { method: 'DELETE' })).json()).success) { showToast('success', 'Dihapus'); fetchManagementData(); } } catch { showToast('error', 'Gagal'); }
  };
  const handleGenerateRotation = async (id: string) => {
    try { const json = await (await fetch('/api/hq/hris/attendance-management?action=generate-rotation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rotationId: id }) })).json(); if (json.success) showToast('success', json.message || 'Jadwal di-generate'); else showToast('error', json.error || 'Gagal'); fetchManagementData(); } catch { showToast('error', 'Gagal generate'); }
  };

  // ===== Settings Handler =====
  const handleSaveSetting = async (key: string, value: any) => {
    try { const json = await (await fetch('/api/hq/hris/attendance-management?action=settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })).json(); if (json.success) { showToast('success', 'Pengaturan disimpan'); fetchManagementData(); } } catch { showToast('error', 'Gagal menyimpan'); }
  };

  // ===== Helpers =====
  const getShiftIcon = (type: string) => { if (type === 'regular') return Sun; if (type === 'office') return Building2; if (type === 'field') return Navigation; if (type === 'flexible') return Timer; return Clock; };
  const navigateDate = (dir: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + dir); setSelectedDate(d.toISOString().split('T')[0]); };
  const formatTime = (t: string | null) => t ? new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = { present: { label: 'Hadir', color: 'bg-green-100 text-green-700', icon: CheckCircle }, late: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle }, absent: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', icon: XCircle }, leave: { label: 'Cuti', color: 'bg-blue-100 text-blue-700', icon: Coffee }, sick: { label: 'Sakit', color: 'bg-purple-100 text-purple-700', icon: Coffee }, work_from_home: { label: 'WFH', color: 'bg-indigo-100 text-indigo-700', icon: MapPin }, holiday: { label: 'Libur', color: 'bg-gray-100 text-gray-600', icon: Calendar } };
    return map[status] || map.absent;
  };
  const getSourceIcon = (source: string) => {
    const map: Record<string, { icon: any; label: string }> = { fingerprint: { icon: Fingerprint, label: 'Sidik Jari' }, face_recognition: { icon: Eye, label: 'Wajah' }, gps_mobile: { icon: Smartphone, label: 'Ponsel' }, card: { icon: CheckCircle, label: 'Kartu' }, manual: { icon: UserCheck, label: 'Manual' }, api: { icon: RefreshCw, label: 'API' } };
    return map[source] || map.manual;
  };
  const getAttendanceColor = (rate: number) => { if (rate >= 95) return 'text-green-600 bg-green-100'; if (rate >= 80) return 'text-yellow-600 bg-yellow-100'; return 'text-red-600 bg-red-100'; };

  // Filtered data
  const filteredDaily = dailyRecords.filter(r => {
    const s = r.employeeName.toLowerCase().includes(dailySearch.toLowerCase()) || r.employeeId.toLowerCase().includes(dailySearch.toLowerCase());
    return s && (dailyBranch === 'all' || r.branchName === dailyBranch) && (dailyStatus === 'all' || r.status === dailyStatus) && (dailySource === 'all' || r.source === dailySource);
  });
  const filteredMonthly = monthlyRecords.filter(a => {
    const s = a.employeeName.toLowerCase().includes(monthlySearch.toLowerCase()) || a.position.toLowerCase().includes(monthlySearch.toLowerCase());
    return s && (monthlyBranch === 'all' || a.branchName === monthlyBranch);
  });
  const dailyBranches = [...new Set(dailyRecords.map(r => r.branchName))];
  const monthlyBranches = [...new Set(monthlyRecords.map(a => a.branchName))];
  const dPresent = dailyRecords.filter(r => r.status === 'present').length;
  const dLate = dailyRecords.filter(r => r.status === 'late').length;
  const dAbsent = dailyRecords.filter(r => r.status === 'absent').length;
  const dLeave = dailyRecords.filter(r => r.status === 'leave' || r.status === 'sick').length;
  const dClockedIn = dailyRecords.filter(r => r.clockIn && !r.clockOut).length;
  const mTotal = monthlyRecords.length;
  const mAvg = mTotal > 0 ? monthlyRecords.reduce((s, a) => s + a.attendanceRate, 0) / mTotal : 0;
  const mPerfect = monthlyRecords.filter(a => a.attendanceRate === 100).length;
  const mLow = monthlyRecords.filter(a => a.attendanceRate < 80).length;

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'live', label: 'Live Hari Ini', icon: TrendingUp },
    { key: 'daily', label: 'Absensi Harian', icon: Calendar },
    { key: 'monthly', label: 'Rekap Bulanan', icon: Clock },
    { key: 'shifts', label: 'Manajemen Shift', icon: Sun },
    { key: 'geofence', label: 'Geofencing', icon: MapPin },
    { key: 'rotations', label: 'Rotasi Shift', icon: RotateCcw },
    { key: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <HQLayout title={t('hris.attendanceTitle')} subtitle={t('hris.attendanceSubtitle')}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total Hari Ini', value: todayStats.total || dailyRecords.length, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Hadir', value: todayStats.present || dPresent, icon: UserCheck, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Terlambat', value: todayStats.late || dLate, icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Tidak Hadir', value: todayStats.absent || dAbsent, icon: UserX, bg: 'bg-red-100', color: 'text-red-600' },
            { label: 'Cuti/Sakit', value: todayStats.leave || dLeave, icon: Coffee, bg: 'bg-purple-100', color: 'text-purple-600' },
            { label: 'Masih Kerja', value: todayStats.clockedIn || dClockedIn, icon: Timer, bg: 'bg-cyan-100', color: 'text-cyan-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${s.bg} rounded-lg`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                <div><p className="text-[10px] text-gray-500">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
                <button onClick={fetchManagementData} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Segarkan</button>
              </div>
              {todayRecords.length === 0 ? (
                <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Belum ada data kehadiran hari ini</p><p className="text-xs text-gray-400 mt-1">Data akan muncul saat karyawan melakukan absen masuk</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase">Karyawan</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Masuk</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Keluar</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Status</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Metode</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Jam Kerja</th></tr></thead>
                    <tbody className="divide-y">
                      {todayRecords.map((r: any, i: number) => {
                        const statusMap: Record<string, { label: string; cls: string }> = { present: { label: 'Hadir', cls: 'bg-green-100 text-green-700' }, late: { label: 'Terlambat', cls: 'bg-yellow-100 text-yellow-700' }, absent: { label: 'Tidak Hadir', cls: 'bg-red-100 text-red-700' }, leave: { label: 'Cuti', cls: 'bg-blue-100 text-blue-700' }, sick: { label: 'Sakit', cls: 'bg-purple-100 text-purple-700' }, work_from_home: { label: 'WFH', cls: 'bg-cyan-100 text-cyan-700' } };
                        const st = statusMap[r.status] || statusMap.present;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2"><p className="font-medium">{r.employee_name || `Emp #${r.employee_id}`}</p><p className="text-xs text-gray-500">{r.position || ''} {r.department ? `· ${r.department}` : ''}</p></td>
                            <td className="px-4 py-2 text-center font-mono text-xs">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td className="px-4 py-2 text-center font-mono text-xs">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-500 animate-pulse">Aktif</span>}</td>
                            <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.cls}`}>{st.label}</span>{r.late_minutes > 0 && <span className="text-[10px] text-yellow-600 ml-1">+{r.late_minutes}m</span>}</td>
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

          {/* ==================== TAB: Daily ==================== */}
          {activeTab === 'daily' && (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Hari sebelumnya"><ChevronLeft className="w-5 h-5" aria-hidden="true" /></button>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 border rounded-lg font-medium" aria-label="Pilih tanggal absensi" />
                  <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Hari berikutnya"><ChevronRight className="w-5 h-5" aria-hidden="true" /></button>
                  <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Hari Ini</button>
                </div>
                <div className="flex gap-3 text-sm flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-full" /><span>Hadir: <strong>{dPresent}</strong></span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-500 rounded-full" /><span>Terlambat: <strong>{dLate}</strong></span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-full" /><span>Tidak Hadir: <strong>{dAbsent}</strong></span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full" /><span>Cuti: <strong>{dLeave}</strong></span></div>
                  {dClockedIn > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" /><span>Aktif: <strong>{dClockedIn}</strong></span></div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 aria-hidden" aria-hidden="true" /><input type="text" placeholder="Cari nama / ID..." value={dailySearch} onChange={(e) => setDailySearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" aria-label="Cari nama karyawan atau ID" /></div>
                <select value={dailyBranch} onChange={(e) => setDailyBranch(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan cabang"><option value="all">Semua Cabang</option>{dailyBranches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                <select value={dailyStatus} onChange={(e) => setDailyStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan status kehadiran"><option value="all">Semua Status</option><option value="present">Hadir</option><option value="late">Terlambat</option><option value="absent">Tidak Hadir</option><option value="leave">Cuti</option></select>
                <select value={dailySource} onChange={(e) => setDailySource(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan sumber absensi"><option value="all">Semua Sumber</option><option value="fingerprint">Sidik Jari</option><option value="face_recognition">Wajah</option><option value="gps_mobile">Ponsel/GPS</option><option value="manual">Manual</option></select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Masuk</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Keluar</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jam Kerja</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sumber</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ket</th></tr></thead>
                  <tbody className="divide-y">
                    {filteredDaily.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr> : filteredDaily.map(r => {
                      const sc = getStatusConfig(r.status); const StatusIcon = sc.icon; const si = getSourceIcon(r.source); const SourceIcon = si.icon;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><p className="font-medium">{r.employeeName}</p><p className="text-xs text-gray-500">{r.employeeId} · {r.position}</p></td>
                          <td className="px-4 py-3 text-sm">{r.branchName}</td>
                          <td className="px-4 py-3 text-center"><span className={`text-sm font-mono ${r.clockIn ? (r.status === 'late' ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>{formatTime(r.clockIn)}</span></td>
                          <td className="px-4 py-3 text-center"><span className={`text-sm font-mono ${r.clockOut ? 'text-blue-600' : (r.clockIn ? 'text-orange-500' : 'text-gray-400')}`}>{r.clockOut ? formatTime(r.clockOut) : (r.clockIn ? '⏳ Aktif' : '-')}</span></td>
                          <td className="px-4 py-3 text-center">{r.workHours > 0 ? <span className="text-sm font-medium">{r.workHours.toFixed(1)}h</span> : <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}><StatusIcon className="w-3 h-3" />{sc.label}</span></td>
                          <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 text-xs text-gray-500"><SourceIcon className="w-3.5 h-3.5" />{si.label}</span></td>
                          <td className="px-4 py-3 text-center text-xs"><div className="space-y-0.5">{r.lateMinutes > 0 && <span className="block text-yellow-600">Telat {r.lateMinutes}m</span>}{r.overtimeMinutes > 0 && <span className="block text-blue-600">Lembur {r.overtimeMinutes}m</span>}{r.earlyLeaveMinutes > 0 && <span className="block text-orange-600">Pulang awal {r.earlyLeaveMinutes}m</span>}{r.isOutsideGeofence && <span className="block text-red-500">⚠ Di luar area</span>}{!r.lateMinutes && !r.overtimeMinutes && !r.earlyLeaveMinutes && !r.isOutsideGeofence && <span className="text-gray-400">-</span>}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB: Monthly ==================== */}
          {activeTab === 'monthly' && (
            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600">Total Karyawan</p><p className="text-xl font-bold text-blue-800">{mTotal}</p></div>
                <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-600">Rata-rata Kehadiran</p><p className="text-xl font-bold text-green-800">{mAvg.toFixed(1)}%</p></div>
                <div className="bg-purple-50 rounded-lg p-3"><p className="text-xs text-purple-600">Kehadiran Sempurna</p><p className="text-xl font-bold text-purple-800">{mPerfect}</p></div>
                <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-600">Kehadiran Rendah (&lt;80%)</p><p className="text-xl font-bold text-red-800">{mLow}</p></div>
              </div>
              {/* Branch Summary */}
              <div><h4 className="font-semibold text-sm mb-3">Ringkasan per Cabang</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {branchSummary.map(b => (
                    <div key={b.branchId} className="border rounded-lg p-3 hover:shadow-md transition-all text-sm">
                      <h5 className="font-medium text-gray-900 text-xs mb-2">{b.branchName}</h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Karyawan:</span><span className="font-medium">{b.totalEmployees}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Kehadiran:</span><span className={`font-medium ${b.avgAttendance >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>{b.avgAttendance}%</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Tepat Waktu:</span><span className="font-medium">{b.onTimeRate}%</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Terlambat:</span><span className="font-medium text-yellow-600">{b.lateRate}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={monthlySearch} onChange={(e) => setMonthlySearch(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>
                <select value={monthlyBranch} onChange={(e) => setMonthlyBranch(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">Semua Cabang</option>{monthlyBranches.map(b => <option key={b} value={b}>{b}</option>)}</select>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hadir</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Terlambat</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tidak Hadir</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cuti</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tingkat</th></tr></thead>
                  <tbody className="divide-y">
                    {filteredMonthly.map(r => (
                      <tr key={r.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="font-medium">{r.employeeName}</p><p className="text-xs text-gray-500">{r.position}</p></td>
                        <td className="px-4 py-3 text-sm">{r.branchName}</td>
                        <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-green-600"><UserCheck className="w-3.5 h-3.5" />{r.present}</span></td>
                        <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-yellow-600"><Clock className="w-3.5 h-3.5" />{r.late}</span></td>
                        <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-red-600"><UserX className="w-3.5 h-3.5" />{r.absent}</span></td>
                        <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-blue-600"><Coffee className="w-3.5 h-3.5" />{r.leave}</span></td>
                        <td className="px-4 py-3 text-center font-medium">{r.totalDays}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getAttendanceColor(r.attendanceRate)}`}>{r.attendanceRate}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB: Shifts ==================== */}
          {activeTab === 'shifts' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div><h3 className="font-semibold text-lg">Manajemen Shift</h3><p className="text-sm text-gray-500">{shifts.length} shift terdefinisi</p></div>
                <button onClick={openNewShift} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Shift</button>
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
                        <div className="p-2.5 rounded-xl" style={{ backgroundColor: s.color + '20' }}><ShiftIcon className="w-5 h-5" style={{ color: s.color }} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><h4 className="font-semibold text-sm truncate">{s.name}</h4>{!s.is_active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] rounded">OFF</span>}{s.is_cross_day && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[9px] rounded">Lintas Hari</span>}</div>
                          <p className="text-xs text-gray-500">{s.code} &middot; {s.shift_type}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs"><div className="flex items-center gap-1 font-mono font-bold" style={{ color: s.color }}><Clock className="w-3.5 h-3.5" />{s.start_time} - {s.end_time}</div><span className="text-gray-400">|</span><span className="text-gray-500">{s.work_hours_per_day}h kerja</span></div>
                      <div className="mt-2 flex items-center gap-1.5"><span className="text-[10px] text-gray-400">Hari:</span>{[0,1,2,3,4,5,6].map(d => (<span key={d} className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-medium ${(s.applicable_days || []).includes(d) ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-300'}`}>{DAY_NAMES[d][0]}</span>))}</div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]"><span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">Toleransi: {s.tolerance_late_minutes}m</span><span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">Istirahat: {s.break_duration_minutes}m</span>{(s.overtime_after_minutes || 0) > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Lembur setelah {s.overtime_after_minutes}m</span>}</div>
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
                <div><h3 className="font-semibold text-lg">Geofencing Lokasi</h3><p className="text-sm text-gray-500">Validasi kehadiran berdasarkan GPS &mdash; {geofences.length} lokasi</p></div>
                <button onClick={openNewGeo} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Lokasi</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geofences.map(g => (
                  <div key={g.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow group relative ${!g.is_active ? 'opacity-60' : ''}`}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditGeo(g)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteGeo(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-start gap-3"><div className="p-2.5 rounded-xl bg-red-50"><MapPin className="w-5 h-5 text-red-500" /></div><div className="flex-1 min-w-0"><h4 className="font-semibold text-sm truncate">{g.name}</h4><p className="text-xs text-gray-500">{g.location_type}</p></div></div>
                    {g.address && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{g.address}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Koordinat</span><p className="font-mono font-medium text-[10px]">{g.latitude?.toFixed?.(4) || g.latitude}, {g.longitude?.toFixed?.(4) || g.longitude}</p></div><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Radius</span><p className="font-bold">{g.radius_meters}m</p></div></div>
                    <div className="mt-2 flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(g.radius_meters / 5, 100)}%` }} /></div><span className="text-[10px] text-gray-400">{g.radius_meters}m</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB: Rotations ==================== */}
          {activeTab === 'rotations' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div><h3 className="font-semibold text-lg">Rotasi Shift Otomatis</h3><p className="text-sm text-gray-500">Atur pola rotasi shift karyawan secara otomatis</p></div>
                <button onClick={openNewRotation} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Rotasi</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rotations.map(rot => (
                  <div key={rot.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-3"><div><h4 className="font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4 text-blue-600" /> {rot.name}</h4><p className="text-xs text-gray-500 mt-0.5">{rot.description}</p></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleGenerateRotation(rot.id)} className="p-1 text-gray-400 hover:text-green-600 rounded" title="Generate"><RefreshCw className="w-4 h-4" /></button><button onClick={() => handleDeleteRotation(rot.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></div></div>
                    <div className="flex flex-wrap gap-1.5 mb-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{rot.rotation_type}</span>{rot.auto_generate && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Auto-generate</span>}<span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{rot.generate_weeks_ahead} minggu ke depan</span></div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(rot.rotation_pattern || []).map((p: any, i: number) => {
                        const ms = shifts.find(s => s.id === p.shift_id || s.code === p.shift_code);
                        return (<div key={i} className="flex items-center gap-1"><div className="px-2.5 py-1 rounded-lg text-xs font-medium border" style={{ borderColor: ms?.color || '#ccc', backgroundColor: (ms?.color || '#ccc') + '15', color: ms?.color || '#666' }}>W{p.week}: {ms?.name || p.shift_code}</div>{i < (rot.rotation_pattern || []).length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}</div>);
                      })}
                    </div>
                  </div>
                ))}
                {rotations.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500"><RotateCcw className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>Belum ada pola rotasi</p></div>}
              </div>
            </div>
          )}

          {/* ==================== TAB: Settings ==================== */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              <h3 className="font-semibold text-lg">Pengaturan Absensi</h3>
              <SettingCard title="Metode Absensi" desc="Pilih metode absensi yang diaktifkan" icon={<Fingerprint className="w-5 h-5 text-blue-600" />}>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                  {['manual','gps','face_recognition','fingerprint','qr_code','nfc'].map(m => {
                    const Icon = CLOCK_METHOD_ICONS[m] || Clock; const enabled = (settings.clock_methods?.methods || []).includes(m);
                    return (<button key={m} onClick={() => { const c = settings.clock_methods?.methods || []; handleSaveSetting('clock_methods', { ...settings.clock_methods, methods: enabled ? c.filter((x: string) => x !== m) : [...c, m] }); }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs ${enabled ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}><Icon className="w-5 h-5" /><span className="font-medium">{CLOCK_METHOD_LABELS[m]}</span></button>);
                  })}
                </div>
              </SettingCard>
              <SettingCard title="Geofencing" desc="Validasi lokasi saat absensi" icon={<MapPin className="w-5 h-5 text-red-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <ToggleSetting label="Aktifkan Geofencing" checked={settings.geofencing?.enabled} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, enabled: v })} />
                  <div><label className="block text-xs text-gray-500 mb-1">Radius Default (m)</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.geofencing?.default_radius_meters || 100} onChange={(e) => handleSaveSetting('geofencing', { ...settings.geofencing, default_radius_meters: parseInt(e.target.value) })} /></div>
                  <ToggleSetting label="Izinkan di Luar" checked={settings.geofencing?.allow_outside_geofence} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, allow_outside_geofence: v })} />
                  <ToggleSetting label="Wajib Foto jika Luar" checked={settings.geofencing?.require_photo_outside} onChange={(v) => handleSaveSetting('geofencing', { ...settings.geofencing, require_photo_outside: v })} />
                </div>
              </SettingCard>
              <SettingCard title="Lembur" desc="Deteksi dan perhitungan lembur otomatis" icon={<Timer className="w-5 h-5 text-amber-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <ToggleSetting label="Deteksi Otomatis" checked={settings.overtime?.auto_detect} onChange={(v) => handleSaveSetting('overtime', { ...settings.overtime, auto_detect: v })} />
                  <div><label className="block text-xs text-gray-500 mb-1">Min Lembur (menit)</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.min_overtime_minutes || 30} onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, min_overtime_minutes: parseInt(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Pengali Hari Kerja</label><input type="number" step="0.1" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.weekday_multiplier || 1.5} onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, weekday_multiplier: parseFloat(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Pengali Akhir Pekan</label><input type="number" step="0.1" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.overtime?.weekend_multiplier || 2.0} onChange={(e) => handleSaveSetting('overtime', { ...settings.overtime, weekend_multiplier: parseFloat(e.target.value) })} /></div>
                </div>
              </SettingCard>
              <SettingCard title="Kebijakan Keterlambatan" desc="Atur toleransi dan konsekuensi" icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Toleransi (m)</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.grace_period_minutes || 15} onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, grace_period_minutes: parseInt(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Maks Telat/Bulan</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.max_late_per_month || 3} onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, max_late_per_month: parseInt(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Potongan/Telat</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.deduction_per_late || 0} onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, deduction_per_late: parseInt(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Eskalasi Setelah</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.late_policy?.escalation_after || 5} onChange={(e) => handleSaveSetting('late_policy', { ...settings.late_policy, escalation_after: parseInt(e.target.value) })} /></div>
                </div>
              </SettingCard>
              <SettingCard title="Verifikasi Foto" desc="Pengaturan selfie dan face matching" icon={<Camera className="w-5 h-5 text-indigo-500" />}>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <ToggleSetting label="Wajib Foto Masuk" checked={settings.photo_verification?.require_clock_in_photo} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, require_clock_in_photo: v })} />
                  <ToggleSetting label="Wajib Foto Keluar" checked={settings.photo_verification?.require_clock_out_photo} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, require_clock_out_photo: v })} />
                  <ToggleSetting label="Pencocokan Wajah" checked={settings.photo_verification?.enable_face_matching} onChange={(v) => handleSaveSetting('photo_verification', { ...settings.photo_verification, enable_face_matching: v })} />
                </div>
              </SettingCard>
              <SettingCard title="Otomatis Tandai Absen" desc="Tandai otomatis jika tidak absen masuk" icon={<UserX className="w-5 h-5 text-red-500" />}>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <ToggleSetting label="Aktifkan" checked={settings.auto_absent?.enabled} onChange={(v) => handleSaveSetting('auto_absent', { ...settings.auto_absent, enabled: v })} />
                  <div><label className="block text-xs text-gray-500 mb-1">Tandai Absen Setelah (jam)</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.auto_absent?.mark_absent_after_hours || 4} onChange={(e) => handleSaveSetting('auto_absent', { ...settings.auto_absent, mark_absent_after_hours: parseInt(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Keluar Otomatis (jam)</label><input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={settings.auto_absent?.auto_clock_out_hours || 12} onChange={(e) => handleSaveSetting('auto_absent', { ...settings.auto_absent, auto_clock_out_hours: parseInt(e.target.value) })} /></div>
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
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10"><h3 className="text-lg font-semibold">{editingShift ? 'Edit' : 'Tambah'} Shift</h3><button onClick={() => setShowShiftModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Kode *</label><input type="text" value={shiftForm.code} onChange={e => setShiftForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border rounded-lg text-sm" disabled={!!editingShift} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label><input type="text" value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="col-span-3"><label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label><input type="text" value={shiftForm.description} onChange={e => setShiftForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label><select value={shiftForm.shift_type} onChange={e => setShiftForm(f => ({ ...f, shift_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">{SHIFT_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Jam Mulai *</label><input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Jam Selesai *</label><input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Istirahat Mulai</label><input type="time" value={shiftForm.break_start} onChange={e => setShiftForm(f => ({ ...f, break_start: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Istirahat Selesai</label><input type="time" value={shiftForm.break_end} onChange={e => setShiftForm(f => ({ ...f, break_end: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Durasi Istirahat (m)</label><input type="number" value={shiftForm.break_duration_minutes} onChange={e => setShiftForm(f => ({ ...f, break_duration_minutes: parseInt(e.target.value) || 60 }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Jam Kerja/Hari</label><input type="number" step="0.5" value={shiftForm.work_hours_per_day} onChange={e => setShiftForm(f => ({ ...f, work_hours_per_day: parseFloat(e.target.value) || 8 }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Toleransi Telat (m)</label><input type="number" value={shiftForm.tolerance_late_minutes} onChange={e => setShiftForm(f => ({ ...f, tolerance_late_minutes: parseInt(e.target.value) || 15 }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Lembur Setelah (m)</label><input type="number" value={shiftForm.overtime_after_minutes} onChange={e => setShiftForm(f => ({ ...f, overtime_after_minutes: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-2">Hari Berlaku</label><div className="flex gap-2">{DAY_NAMES.map((d, i) => (<button key={i} onClick={() => { const days = shiftForm.applicable_days.includes(i) ? shiftForm.applicable_days.filter(x => x !== i) : [...shiftForm.applicable_days, i]; setShiftForm(f => ({ ...f, applicable_days: days })); }} className={`w-10 h-10 rounded-lg text-sm font-medium ${shiftForm.applicable_days.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{d}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-2">Warna</label><div className="flex gap-1.5">{COLOR_PRESETS.map(c => (<button key={c} onClick={() => setShiftForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-lg border-2 ${shiftForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
                <div className="flex items-end gap-4"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={shiftForm.is_cross_day} onChange={e => setShiftForm(f => ({ ...f, is_cross_day: e.target.checked }))} className="rounded" /><Moon className="w-4 h-4 text-purple-500" /> Lintas Hari</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={shiftForm.is_active} onChange={e => setShiftForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Aktif</label></div>
              </div>
              <div className="border-2 border-dashed rounded-xl p-3"><p className="text-[10px] text-gray-400 mb-1">PREVIEW</p><div className="flex items-center gap-3"><div className="p-2 rounded-lg" style={{ backgroundColor: shiftForm.color + '20' }}><Clock className="w-5 h-5" style={{ color: shiftForm.color }} /></div><div><span className="font-semibold text-sm">{shiftForm.name || 'Nama Shift'}</span><span className="ml-2 font-mono text-xs" style={{ color: shiftForm.color }}>{shiftForm.start_time} - {shiftForm.end_time}</span><p className="text-[10px] text-gray-400">{shiftForm.code} &middot; {shiftForm.work_hours_per_day}h &middot; Toleransi {shiftForm.tolerance_late_minutes}m</p></div></div></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white"><button onClick={() => setShowShiftModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button><button onClick={handleSaveShift} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button></div>
          </div>
        </div>
      )}

      {/* ==================== GEOFENCE MODAL ==================== */}
      {showGeoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGeoModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10"><h3 className="text-lg font-semibold">{editingGeo ? 'Edit' : 'Tambah'} Lokasi</h3><button onClick={() => setShowGeoModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label><input type="text" value={geoForm.name} onChange={e => setGeoForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Alamat</label><input type="text" value={geoForm.address} onChange={e => setGeoForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label><select value={geoForm.location_type} onChange={e => setGeoForm(f => ({ ...f, location_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">{LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Radius (m)</label><input type="number" value={geoForm.radius_meters} onChange={e => setGeoForm(f => ({ ...f, radius_meters: parseInt(e.target.value) || 100 }))} className="w-full px-3 py-2 border rounded-lg text-sm" min={10} max={5000} /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label><input type="number" step="0.0000001" value={geoForm.latitude} onChange={e => setGeoForm(f => ({ ...f, latitude: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label><input type="number" step="0.0000001" value={geoForm.longitude} onChange={e => setGeoForm(f => ({ ...f, longitude: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={geoForm.is_active} onChange={e => setGeoForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Aktif</label>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Tip: Buka Google Maps, klik kanan lokasi &rarr; salin koordinat</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white"><button onClick={() => setShowGeoModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button><button onClick={handleSaveGeo} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button></div>
          </div>
        </div>
      )}

      {/* ==================== ROTATION MODAL ==================== */}
      {showRotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRotationModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10"><h3 className="text-lg font-semibold">{editingRotation ? 'Edit' : 'Tambah'} Rotasi</h3><button onClick={() => setShowRotationModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label><input type="text" value={rotForm.name} onChange={e => setRotForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label><input type="text" value={rotForm.description} onChange={e => setRotForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Tipe</label><select value={rotForm.rotation_type} onChange={e => setRotForm(f => ({ ...f, rotation_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="weekly">Mingguan</option><option value="biweekly">2 Mingguan</option><option value="monthly">Bulanan</option></select></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Generate (minggu)</label><input type="number" value={rotForm.generate_weeks_ahead} onChange={e => setRotForm(f => ({ ...f, generate_weeks_ahead: parseInt(e.target.value) || 2 }))} className="w-full px-3 py-2 border rounded-lg text-sm" min={1} max={12} /></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-xs font-medium text-gray-500">Pola Rotasi *</label><button onClick={() => setRotForm(f => ({ ...f, rotation_pattern: [...f.rotation_pattern, { week: f.rotation_pattern.length + 1, shift_id: shifts[0]?.id, shift_code: shifts[0]?.code }] }))} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Tambah</button></div>
                <div className="space-y-2">
                  {rotForm.rotation_pattern.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">W{p.week}</span>
                      <select value={p.shift_id || ''} onChange={e => { const u = [...rotForm.rotation_pattern]; const s = shifts.find(s => s.id === e.target.value); u[i] = { ...u[i], shift_id: e.target.value, shift_code: s?.code || '' }; setRotForm(f => ({ ...f, rotation_pattern: u })); }} className="flex-1 px-2 py-1.5 border rounded text-sm">{shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}</select>
                      {rotForm.rotation_pattern.length > 1 && <button onClick={() => { const u = rotForm.rotation_pattern.filter((_, j) => j !== i).map((p, j) => ({ ...p, week: j + 1 })); setRotForm(f => ({ ...f, rotation_pattern: u })); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rotForm.auto_generate} onChange={e => setRotForm(f => ({ ...f, auto_generate: e.target.checked }))} className="rounded" /> Otomatis</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rotForm.is_active} onChange={e => setRotForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Aktif</label></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white"><button onClick={() => setShowRotationModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button><button onClick={handleSaveRotation} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button></div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {toast.message}
        </div>
      )}
    </HQLayout>
  );
}

// ===== Helper Components =====
function SettingCard({ title, desc, icon, children }: { title: string; desc: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (<div className="border rounded-xl p-4"><div className="flex items-start gap-3 mb-1"><div className="p-2 bg-gray-50 rounded-lg">{icon}</div><div><h4 className="font-semibold text-sm">{title}</h4><p className="text-xs text-gray-500">{desc}</p></div></div>{children}</div>);
}
function ToggleSetting({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return (<label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50"><input type="checkbox" checked={checked || false} onChange={e => onChange(e.target.checked)} className="rounded" />{checked ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}<span className={`text-xs ${checked ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{label}</span></label>);
}
