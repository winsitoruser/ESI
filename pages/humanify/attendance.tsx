import { useState, useEffect } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import AttendanceBulkImportModal from '@/components/humanify/AttendanceBulkImportModal';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/export-utils';
import {
  mapDailyToExportRows, mapMonthlyToExportRows, mapLiveToExportRows,
  DAILY_PDF_COLUMNS, MONTHLY_PDF_COLUMNS,
} from '@/lib/hq/attendance-export-import';
import {
  Clock, Users, UserCheck, UserX, MapPin, Settings, Calendar,
  RefreshCw, CheckCircle, AlertCircle,
  Search, Download, Eye, ChevronRight, ChevronLeft,
  Fingerprint, Smartphone, Timer,
  Sun, Coffee, TrendingUp, XCircle,
  Upload, FileSpreadsheet, FileText, AlertTriangle
} from 'lucide-react';

// ===== Types =====
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

type TabKey = 'live' | 'daily' | 'monthly';

export default function AttendancePage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('live');

  // === Live today data ===
  const [todayStats, setTodayStats] = useState<any>({});
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');

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

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [undoExpiresAt, setUndoExpiresAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => { setToast({ type, message }); setTimeout(() => setToast(null), 3500); };

  const fetchLiveData = async () => {
    try {
      const res = await fetch('/api/humanify/attendance-management');
      const json = await res.json();
      if (res.ok && json.success) {
        setTodayStats(json.todayStats || {});
        setTodayRecords(json.todayRecords || []);
        if (json.dataSource) setDataSource(json.dataSource);
        else setDataSource((json.todayRecords?.length || json.todayStats?.total) ? 'live' : 'empty');
      }
    } catch {
      showToast('error', 'Gagal memuat data live');
    }
  };

  const fetchDailyData = async () => {
    try {
      const res = await fetch(`/api/humanify/attendance?period=${selectedDate}&view=daily`);
      const json = await res.json();
      if (res.ok) {
        const payload = json.data || json;
        setDailyRecords(payload.dailyRecords || []);
      } else {
        setDailyRecords([]);
        showToast('error', json.error || json.message || 'Gagal memuat absensi harian');
      }
    } catch {
      setDailyRecords([]);
      showToast('error', 'Gagal memuat absensi harian');
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const res = await fetch(`/api/humanify/attendance?period=${selectedMonth}`);
      const json = await res.json();
      if (res.ok) {
        const payload = json.data || json;
        setMonthlyRecords(payload.attendance || []);
        setBranchSummary(payload.branchSummary || []);
      } else {
        setMonthlyRecords([]);
        setBranchSummary([]);
        showToast('error', json.error || json.message || 'Gagal memuat rekap bulanan');
      }
    } catch {
      setMonthlyRecords([]);
      setBranchSummary([]);
      showToast('error', 'Gagal memuat rekap bulanan');
    }
  };

  useEffect(() => {
    setMounted(true);
    Promise.all([fetchLiveData(), fetchDailyData(), fetchMonthlyData()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (mounted) fetchDailyData(); }, [selectedDate]);
  useEffect(() => { if (mounted) fetchMonthlyData(); }, [selectedMonth]);

  if (!mounted) return null;

  // ===== Helpers =====
  const navigateDate = (dir: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + dir); setSelectedDate(d.toISOString().split('T')[0]); };
  const formatTime = (t: string | null) => t ? new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = { present: { label: 'Hadir', color: 'bg-green-100 text-green-700', icon: CheckCircle }, late: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle }, absent: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', icon: XCircle }, leave: { label: 'Cuti', color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]', icon: Coffee }, sick: { label: 'Sakit', color: 'bg-purple-100 text-purple-700', icon: Coffee }, work_from_home: { label: 'WFH', color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]', icon: MapPin }, holiday: { label: 'Libur', color: 'bg-gray-100 text-gray-600', icon: Calendar } };
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

  const handleExport = (view: 'daily' | 'monthly' | 'live', format: 'csv' | 'xlsx' | 'pdf') => {
    let rows: Record<string, unknown>[] = [];
    let filename = '';
    let pdfCols = DAILY_PDF_COLUMNS;

    if (view === 'daily') {
      rows = mapDailyToExportRows(filteredDaily, selectedDate);
      filename = `absensi-harian-${selectedDate}`;
      pdfCols = DAILY_PDF_COLUMNS;
    } else if (view === 'monthly') {
      rows = mapMonthlyToExportRows(filteredMonthly, selectedMonth);
      filename = `absensi-bulanan-${selectedMonth}`;
      pdfCols = MONTHLY_PDF_COLUMNS;
    } else {
      rows = mapLiveToExportRows(todayRecords);
      filename = `absensi-live-${new Date().toISOString().split('T')[0]}`;
      pdfCols = DAILY_PDF_COLUMNS;
    }

    if (!rows.length) { showToast('error', 'Tidak ada data untuk diekspor'); return; }

    const title = view === 'daily' ? `Absensi Harian — ${selectedDate}` : view === 'monthly' ? `Rekap Bulanan — ${selectedMonth}` : 'Kehadiran Hari Ini';
    if (format === 'csv') {
      const r = exportToCSV(rows, filename);
      showToast(r.success ? 'success' : 'error', r.success ? `CSV ${title} diunduh` : (r.error?.message || 'Gagal export CSV'));
    } else if (format === 'xlsx') {
      const r = exportToExcel(rows, filename);
      showToast(r.success ? 'success' : 'error', r.success ? `Excel ${title} diunduh` : (r.error?.message || 'Gagal export Excel'));
    } else {
      const r = exportToPDF(rows, pdfCols, filename);
      showToast(r.success ? 'success' : 'error', r.success ? `PDF ${title} diunduh` : (r.error?.message || 'Gagal export PDF'));
    }
  };

  const refreshAfterImport = () => {
    fetchDailyData();
    fetchMonthlyData();
    fetchLiveData();
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllDaily = () => {
    const ids = filteredDaily.map((r) => r.id).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  };

  const handleBulkCorrect = async () => {
    if (!selectedIds.length) { showToast('error', 'Pilih minimal satu baris'); return; }
    setBulkBusy(true);
    try {
      const res = await fetch('/api/humanify/attendance-bulk?action=correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          patch: { status: bulkStatus, ...(bulkNotes.trim() ? { notes: bulkNotes.trim() } : {}) },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Koreksi gagal');
      } else {
        setLastBatchId(json.data?.batchId || json.batchId || null);
        setUndoExpiresAt(json.data?.undoExpiresAt || json.undoExpiresAt || null);
        setSelectedIds([]);
        showToast('success', `Dikoreksi ${json.data?.updated ?? json.updated ?? selectedIds.length} baris · undo 24 jam`);
        fetchDailyData();
        fetchLiveData();
      }
    } catch {
      showToast('error', 'Koreksi gagal');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkUndo = async () => {
    if (!lastBatchId) return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/humanify/attendance-bulk?action=undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: lastBatchId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Undo gagal');
      } else {
        showToast('success', 'Koreksi dibatalkan');
        setLastBatchId(null);
        setUndoExpiresAt(null);
        fetchDailyData();
        fetchLiveData();
      }
    } catch {
      showToast('error', 'Undo gagal');
    } finally {
      setBulkBusy(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'live', label: 'Live Hari Ini', icon: TrendingUp },
    { key: 'daily', label: 'Absensi Harian', icon: Calendar },
    { key: 'monthly', label: 'Rekap Bulanan', icon: Clock },
  ];

  const QUICK_LINKS = [
    { href: '/humanify/attendance/daily', label: 'Rekap Harian', icon: Calendar },
    { href: '/humanify/attendance-management', label: 'Jadwal & Shift', icon: Sun },
    { href: '/humanify/attendance/settings', label: 'Kebijakan Absensi', icon: Settings },
    { href: '/humanify/attendance/devices', label: 'Perangkat Absensi', icon: Fingerprint },
    { href: '/humanify/leave', label: 'Manajemen Cuti', icon: Coffee },
  ];

  return (
    <HQLayout title={t('hris.attendanceTitle')} subtitle={t('hris.attendanceSubtitle')}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <DataSourceBadge source={dataSource} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total Hari Ini', value: todayStats.total || dailyRecords.length, icon: Users, bg: 'bg-[var(--hf-brand-100)]', color: 'text-[color:var(--hf-brand-600)]' },
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

        {/* Quick links ke modul terkait */}
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 text-gray-700 shadow-sm">
              <link.icon className="w-4 h-4" /> {link.label}
            </Link>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== TAB: Live Today ==================== */}
          {activeTab === 'live' && (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Kehadiran Hari Ini</h3>
                  <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <button onClick={fetchLiveData} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Segarkan</button>
                <AttendanceExportBar view="live" onExport={(f) => handleExport('live', f)} onImport={() => setShowBulkImport(true)} />
                </div>
              </div>
              {todayRecords.length === 0 ? (
                <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Belum ada data kehadiran hari ini</p><p className="text-xs text-gray-400 mt-1">Data akan muncul saat karyawan melakukan absen masuk</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase">Karyawan</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Masuk</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Keluar</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Status</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Metode</th><th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Jam Kerja</th></tr></thead>
                    <tbody className="divide-y">
                      {todayRecords.map((r: any, i: number) => {
                        const statusMap: Record<string, { label: string; cls: string }> = { present: { label: 'Hadir', cls: 'bg-green-100 text-green-700' }, late: { label: 'Terlambat', cls: 'bg-yellow-100 text-yellow-700' }, absent: { label: 'Tidak Hadir', cls: 'bg-red-100 text-red-700' }, leave: { label: 'Cuti', cls: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]' }, sick: { label: 'Sakit', cls: 'bg-purple-100 text-purple-700' }, work_from_home: { label: 'WFH', cls: 'bg-cyan-100 text-cyan-700' } };
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
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--hf-brand-500)] rounded-full" /><span>Cuti: <strong>{dLeave}</strong></span></div>
                  {dClockedIn > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" /><span>Aktif: <strong>{dClockedIn}</strong></span></div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 aria-hidden" aria-hidden="true" /><input type="text" placeholder="Cari nama / ID..." value={dailySearch} onChange={(e) => setDailySearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" aria-label="Cari nama karyawan atau ID" /></div>
                <select value={dailyBranch} onChange={(e) => setDailyBranch(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan cabang"><option value="all">Semua Cabang</option>{dailyBranches.map(b => <option key={b} value={b}>{b}</option>)}</select>
                <select value={dailyStatus} onChange={(e) => setDailyStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan status kehadiran"><option value="all">Semua Status</option><option value="present">Hadir</option><option value="late">Terlambat</option><option value="absent">Tidak Hadir</option><option value="leave">Cuti</option></select>
                <select value={dailySource} onChange={(e) => setDailySource(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" aria-label="Filter berdasarkan sumber absensi"><option value="all">Semua Sumber</option><option value="fingerprint">Sidik Jari</option><option value="face_recognition">Wajah</option><option value="gps_mobile">Ponsel/GPS</option><option value="manual">Manual</option></select>
                <AttendanceExportBar view="daily" onExport={(f) => handleExport('daily', f)} onImport={() => setShowBulkImport(true)} />
              </div>

              {(selectedIds.length > 0 || lastBatchId) && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  {selectedIds.length > 0 && (
                    <>
                      <span className="text-xs font-medium text-slate-600">{selectedIds.length} dipilih</span>
                      <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs">
                        <option value="present">Hadir</option>
                        <option value="late">Terlambat</option>
                        <option value="absent">Tidak Hadir</option>
                        <option value="leave">Cuti</option>
                      </select>
                      <input
                        value={bulkNotes}
                        onChange={(e) => setBulkNotes(e.target.value)}
                        placeholder="Catatan (opsional)"
                        className="px-2 py-1.5 border rounded-lg text-xs min-w-[140px]"
                      />
                      <button
                        type="button"
                        disabled={bulkBusy}
                        onClick={handleBulkCorrect}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--hf-brand-600)' }}
                      >
                        Koreksi
                      </button>
                      <button type="button" onClick={() => setSelectedIds([])} className="px-2 py-1.5 text-xs text-slate-500 hover:underline">
                        Batal pilih
                      </button>
                    </>
                  )}
                  {lastBatchId && (
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={handleBulkUndo}
                      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-300 bg-amber-50 text-amber-800 disabled:opacity-50"
                      title={undoExpiresAt ? `Berlaku s/d ${undoExpiresAt}` : 'Undo 24 jam'}
                    >
                      Batalkan koreksi (24 jam)
                    </button>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th scope="col" className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua"
                        checked={filteredDaily.length > 0 && filteredDaily.every((r) => selectedIds.includes(r.id))}
                        onChange={toggleSelectAllDaily}
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Masuk</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Keluar</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jam Kerja</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sumber</th><th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ket</th></tr></thead>
                  <tbody className="divide-y">
                    {filteredDaily.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4">
                          <HrisEmptyState
                            source={dataSource}
                            title="Belum ada data absensi hari ini"
                            description="Data muncul setelah karyawan clock-in via perangkat atau portal ESS."
                            action={
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <a
                                  href="/humanify/attendance/devices"
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                                  style={{ background: 'var(--hf-brand-600)' }}
                                >
                                  Kelola perangkat
                                </a>
                                <a
                                  href="/employee?tab=attendance"
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-white"
                                >
                                  Portal ESS
                                </a>
                              </div>
                            }
                          />
                        </td>
                      </tr>
                    ) : filteredDaily.map(r => {
                      const sc = getStatusConfig(r.status); const StatusIcon = sc.icon; const si = getSourceIcon(r.source); const SourceIcon = si.icon;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${r.employeeName}`}
                              checked={selectedIds.includes(r.id)}
                              onChange={() => toggleSelectId(r.id)}
                            />
                          </td>
                          <td className="px-4 py-3"><p className="font-medium">{r.employeeName}</p><p className="text-xs text-gray-500">{r.employeeId} · {r.position}</p></td>
                          <td className="px-4 py-3 text-sm">{r.branchName}</td>
                          <td className="px-4 py-3 text-center"><span className={`text-sm font-mono ${r.clockIn ? (r.status === 'late' ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>{formatTime(r.clockIn)}</span></td>
                          <td className="px-4 py-3 text-center"><span className={`text-sm font-mono ${r.clockOut ? 'text-[color:var(--hf-brand-600)]' : (r.clockIn ? 'text-orange-500' : 'text-gray-400')}`}>{r.clockOut ? formatTime(r.clockOut) : (r.clockIn ? '⏳ Aktif' : '-')}</span></td>
                          <td className="px-4 py-3 text-center">{r.workHours > 0 ? <span className="text-sm font-medium">{r.workHours.toFixed(1)}h</span> : <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}><StatusIcon className="w-3 h-3" />{sc.label}</span></td>
                          <td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 text-xs text-gray-500"><SourceIcon className="w-3.5 h-3.5" />{si.label}</span></td>
                          <td className="px-4 py-3 text-center text-xs"><div className="space-y-0.5">{r.lateMinutes > 0 && <span className="block text-yellow-600">Telat {r.lateMinutes}m</span>}{r.overtimeMinutes > 0 && <span className="block text-[color:var(--hf-brand-600)]">Lembur {r.overtimeMinutes}m</span>}{r.earlyLeaveMinutes > 0 && <span className="block text-orange-600">Pulang awal {r.earlyLeaveMinutes}m</span>}{r.isOutsideGeofence && <span className="block text-red-500">⚠ Di luar area</span>}{!r.lateMinutes && !r.overtimeMinutes && !r.earlyLeaveMinutes && !r.isOutsideGeofence && <span className="text-gray-400">-</span>}</div></td>
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
                <div className="bg-[var(--hf-brand-50)] rounded-lg p-3"><p className="text-xs text-[color:var(--hf-brand-600)]">Total Karyawan</p><p className="text-xl font-bold text-[color:var(--hf-brand-600)]">{mTotal}</p></div>
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
                <AttendanceExportBar view="monthly" onExport={(f) => handleExport('monthly', f)} onImport={() => setShowBulkImport(true)} />
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
                        <td className="px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-[color:var(--hf-brand-600)]"><Coffee className="w-3.5 h-3.5" />{r.leave}</span></td>
                        <td className="px-4 py-3 text-center font-medium">{r.totalDays}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getAttendanceColor(r.attendanceRate)}`}>{r.attendanceRate}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      <AttendanceBulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={refreshAfterImport}
        showToast={showToast}
      />

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
function AttendanceExportBar({
  view, onExport, onImport,
}: {
  view: 'daily' | 'monthly' | 'live';
  onExport: (format: 'csv' | 'xlsx' | 'pdf') => void;
  onImport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
      <span className="text-xs text-gray-400 hidden sm:inline">Ekspor:</span>
      <button onClick={() => onExport('csv')} title="Export CSV"
        className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs hover:bg-gray-50 text-gray-700">
        <Download className="w-3.5 h-3.5" /> CSV
      </button>
      <button onClick={() => onExport('xlsx')} title="Export Excel"
        className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs hover:bg-gray-50 text-gray-700">
        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
      </button>
      <button onClick={() => onExport('pdf')} title="Export PDF"
        className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs hover:bg-gray-50 text-gray-700">
        <FileText className="w-3.5 h-3.5" /> PDF
      </button>
      {(view === 'daily' || view === 'monthly' || view === 'live') && (
        <button onClick={onImport} title="Import data massal"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--hf-brand-600)] text-white rounded-lg text-xs hover:bg-[var(--hf-brand)] ml-1">
          <Upload className="w-3.5 h-3.5" /> Import
        </button>
      )}
    </div>
  );
}

