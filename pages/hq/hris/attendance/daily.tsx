import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Calendar, Clock, UserCheck, UserX, Users, Building2, Search,
  Download, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  AlertTriangle, Fingerprint, Smartphone, MapPin, Eye, Coffee,
  Timer, TrendingUp, RefreshCw
} from 'lucide-react';

interface DailyRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  position: string;
  branchName: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  workHours: number;
  source: string;
  isOutsideGeofence: boolean;
}


const MOCK_DAILY_RECORDS: DailyRecord[] = [
  { id: 'dr1', employeeName: 'Budi Santoso', employeeId: 'EMP-001', position: 'IT Manager', branchName: 'Kantor Pusat Jakarta', clockIn: '08:05', clockOut: '17:15', status: 'present', lateMinutes: 5, earlyLeaveMinutes: 0, overtimeMinutes: 15, workHours: 8.17, source: 'gps', isOutsideGeofence: false },
  { id: 'dr2', employeeName: 'Siti Rahayu', employeeId: 'EMP-002', position: 'Finance Staff', branchName: 'Kantor Pusat Jakarta', clockIn: '08:22', clockOut: '17:00', status: 'late', lateMinutes: 22, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 7.63, source: 'face_recognition', isOutsideGeofence: false },
  { id: 'dr3', employeeName: 'Ahmad Wijaya', employeeId: 'EMP-003', position: 'Operations Lead', branchName: 'Cabang Bandung', clockIn: '07:55', clockOut: '17:30', status: 'present', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 30, workHours: 8.58, source: 'fingerprint', isOutsideGeofence: false },
  { id: 'dr4', employeeName: 'Dewi Lestari', employeeId: 'EMP-004', position: 'Barista Senior', branchName: 'Cabang Surabaya', clockIn: null, clockOut: null, status: 'absent', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workHours: 0, source: '', isOutsideGeofence: false },
  { id: 'dr5', employeeName: 'Eko Prasetyo', employeeId: 'EMP-005', position: 'Warehouse Staff', branchName: 'Cabang Bandung', clockIn: '08:00', clockOut: '16:45', status: 'present', lateMinutes: 0, earlyLeaveMinutes: 15, overtimeMinutes: 0, workHours: 7.75, source: 'gps', isOutsideGeofence: true },
];

export default function DailyAttendancePage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<DailyRecord[]>(MOCK_DAILY_RECORDS);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/hris/attendance?period=${selectedDate}&view=daily`);
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        setRecords(payload.dailyRecords || payload.attendance || []);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords(MOCK_DAILY_RECORDS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [selectedDate]);

  if (!mounted) return null;

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBranch = branchFilter === 'all' || r.branchName === branchFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
    return matchSearch && matchBranch && matchStatus && matchSource;
  });

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const leave = records.filter(r => r.status === 'leave' || r.status === 'sick').length;
  const clockedIn = records.filter(r => r.clockIn && !r.clockOut).length;
  const branches = [...new Set(records.map(r => r.branchName))];

  const formatTime = (t: string | null) => {
    if (!t) return '-';
    return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      present: { label: 'Hadir', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      late: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
      absent: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', icon: XCircle },
      leave: { label: 'Cuti', color: 'bg-blue-100 text-blue-700', icon: Coffee },
      sick: { label: 'Sakit', color: 'bg-purple-100 text-purple-700', icon: Coffee },
      work_from_home: { label: 'WFH', color: 'bg-indigo-100 text-indigo-700', icon: MapPin },
      holiday: { label: 'Libur', color: 'bg-gray-100 text-gray-600', icon: Calendar },
    };
    return map[status] || map.absent;
  };

  const handleExport = () => {
    const headers = ['ID Karyawan', 'Nama', 'Posisi', 'Cabang', 'Clock In', 'Clock Out', 'Jam Kerja', 'Status', 'Sumber', 'Telat (mnt)', 'Pulang Awal (mnt)', 'Lembur (mnt)', 'Di Luar Geofence'];
    const rows = filtered.map(r => [
      r.employeeId, r.employeeName, r.position, r.branchName,
      r.clockIn ? formatTime(r.clockIn) : '-',
      r.clockOut ? formatTime(r.clockOut) : '-',
      r.workHours.toFixed(2),
      r.status,
      r.source || '-',
      r.lateMinutes, r.earlyLeaveMinutes, r.overtimeMinutes,
      r.isOutsideGeofence ? 'Ya' : 'Tidak'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-harian-${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSourceIcon = (source: string) => {
    const map: Record<string, { icon: any; label: string }> = {
      fingerprint: { icon: Fingerprint, label: 'Fingerprint' },
      face_recognition: { icon: Eye, label: 'Face' },
      gps_mobile: { icon: Smartphone, label: 'Mobile' },
      card: { icon: CheckCircle, label: 'Kartu' },
      manual: { icon: UserCheck, label: 'Manual' },
      api: { icon: RefreshCw, label: 'API' },
    };
    return map[source] || map.manual;
  };

  return (
    <HQLayout title={t('hris.dailyAttendanceTitle')} subtitle={t('hris.dailyAttendanceSubtitle')}>
      <div className="space-y-6">
        {/* Date Navigator + Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg font-medium" />
              <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Hari Ini</button>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Hadir: <strong>{present}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Terlambat: <strong>{late}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Tidak Hadir: <strong>{absent}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Cuti: <strong>{leave}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Masih di kantor: <strong>{clockedIn}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari nama / ID karyawan..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Cabang</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="absent">Tidak Hadir</option>
              <option value="leave">Cuti</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Sumber</option>
              <option value="fingerprint">Fingerprint</option>
              <option value="face_recognition">Face Recognition</option>
              <option value="gps_mobile">Mobile/GPS</option>
              <option value="manual">Manual</option>
            </select>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock In</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jam Kerja</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sumber</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                ) : (
                  filtered.map((r) => {
                    const statusConf = getStatusConfig(r.status);
                    const StatusIcon = statusConf.icon;
                    const sourceConf = getSourceIcon(r.source);
                    const SourceIcon = sourceConf.icon;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{r.employeeName}</p>
                            <p className="text-xs text-gray-500">{r.employeeId} · {r.position}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.branchName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-mono ${r.clockIn ? (r.status === 'late' ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>
                            {formatTime(r.clockIn)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-mono ${r.clockOut ? 'text-blue-600' : (r.clockIn ? 'text-orange-500' : 'text-gray-400')}`}>
                            {r.clockOut ? formatTime(r.clockOut) : (r.clockIn ? '⏳ Aktif' : '-')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.workHours > 0 ? (
                            <span className="text-sm font-medium">{r.workHours.toFixed(1)}h</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500" title={sourceConf.label}>
                            <SourceIcon className="w-3.5 h-3.5" />
                            {sourceConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          <div className="space-y-0.5">
                            {r.lateMinutes > 0 && (
                              <span className="block text-yellow-600">Terlambat {r.lateMinutes} mnt</span>
                            )}
                            {r.overtimeMinutes > 0 && (
                              <span className="block text-blue-600">Lembur {r.overtimeMinutes} mnt</span>
                            )}
                            {r.earlyLeaveMinutes > 0 && (
                              <span className="block text-orange-600">Pulang awal {r.earlyLeaveMinutes} mnt</span>
                            )}
                            {r.isOutsideGeofence && (
                              <span className="block text-red-500">⚠ Di luar area</span>
                            )}
                            {!r.lateMinutes && !r.overtimeMinutes && !r.earlyLeaveMinutes && !r.isOutsideGeofence && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
