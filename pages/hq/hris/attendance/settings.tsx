import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Settings, Clock, MapPin, Fingerprint, Smartphone, Bell, Save,
  Building2, Calendar, Timer, Shield, Coffee, AlertTriangle,
  CheckCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AttSettings {
  workStartTime: string;
  workEndTime: string;
  breakStartTime: string;
  breakEndTime: string;
  breakDurationMinutes: number;
  workDays: number[];
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  autoAbsentAfterMinutes: number;
  overtimeEnabled: boolean;
  overtimeMinMinutes: number;
  overtimeRequiresApproval: boolean;
  gpsAttendanceEnabled: boolean;
  geoFenceRadius: number;
  requireSelfie: boolean;
  allowOutsideGeofence: boolean;
  fingerprintEnabled: boolean;
  autoProcessDeviceLogs: boolean;
  punchTypeDetection: string;
  annualLeaveQuota: number;
  sickLeaveQuota: number;
  leaveRequiresApproval: boolean;
  notifyLateToManager: boolean;
  notifyAbsentToManager: boolean;
  notifyOvertimeToHr: boolean;
}

const defaultSettings: AttSettings = {
  workStartTime: '08:00', workEndTime: '17:00',
  breakStartTime: '12:00', breakEndTime: '13:00',
  breakDurationMinutes: 60, workDays: [1, 2, 3, 4, 5],
  lateGraceMinutes: 15, earlyLeaveGraceMinutes: 15, autoAbsentAfterMinutes: 120,
  overtimeEnabled: true, overtimeMinMinutes: 30, overtimeRequiresApproval: true,
  gpsAttendanceEnabled: true, geoFenceRadius: 100, requireSelfie: false, allowOutsideGeofence: false,
  fingerprintEnabled: true, autoProcessDeviceLogs: true, punchTypeDetection: 'auto',
  annualLeaveQuota: 12, sickLeaveQuota: 14, leaveRequiresApproval: true,
  notifyLateToManager: true, notifyAbsentToManager: true, notifyOvertimeToHr: false,
};

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function AttendanceSettingsPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AttSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const params = selectedBranch ? `?branchId=${selectedBranch}` : '';
      const res = await fetch(`/api/hq/hris/attendance/settings${params}`);
      if (!res.ok) { console.error('Fetch settings failed:', res.status); setLoading(false); return; }
      const json = await res.json();
      if (json.success && json.data) {
        setSettings({ ...defaultSettings, ...json.data });
      }
    } catch {
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, [selectedBranch]);

  if (!mounted) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/hq/hris/attendance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, branchId: selectedBranch || null })
      });
      if (!res.ok) { toast.error('Gagal menyimpan pengaturan'); setSaving(false); return; }
      const json = await res.json();
      if (json.success) {
        toast.success('Pengaturan berhasil disimpan');
      } else {
        toast.error(json.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Error menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    const days = settings.workDays.includes(day)
      ? settings.workDays.filter(d => d !== day)
      : [...settings.workDays, day].sort();
    setSettings({ ...settings, workDays: days });
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => onChange(!value)} className={`relative w-11 h-6 rounded-full transition ${value ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`}
          style={{ transform: value ? 'translateX(22px)' : 'translateX(0)' }} />
      </button>
    </div>
  );

  return (
    <HQLayout title={t('hris.attendanceSettingsTitle')} subtitle={t('hris.attendanceSettingsSubtitle')}>
      <div className="space-y-6 max-w-4xl">
        {/* Branch selector */}
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">Pengaturan untuk:</p>
              <p className="text-xs text-gray-500">Kosongkan untuk default tenant, atau pilih cabang spesifik</p>
            </div>
          </div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Default (Semua Cabang)</option>
            <option value="b1">Cabang Pusat Jakarta</option>
            <option value="b2">Cabang Bandung</option>
            <option value="b3">Cabang Surabaya</option>
          </select>
        </div>

        {/* Jam Kerja */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Jam Kerja</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jam Masuk</label>
              <input type="time" value={settings.workStartTime} onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jam Pulang</label>
              <input type="time" value={settings.workEndTime} onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Istirahat Mulai</label>
              <input type="time" value={settings.breakStartTime} onChange={(e) => setSettings({ ...settings, breakStartTime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Istirahat Selesai</label>
              <input type="time" value={settings.breakEndTime} onChange={(e) => setSettings({ ...settings, breakEndTime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Hari Kerja</label>
            <div className="flex gap-2">
              {dayNames.map((name, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                    settings.workDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toleransi & Penalti */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Toleransi & Keterlambatan</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Toleransi Terlambat (menit)</label>
              <input type="number" value={settings.lateGraceMinutes} onChange={(e) => setSettings({ ...settings, lateGraceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm" min={0} max={60} />
              <p className="text-xs text-gray-400 mt-1">Clock-in dalam waktu ini tetap dihitung hadir</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Toleransi Pulang Awal (menit)</label>
              <input type="number" value={settings.earlyLeaveGraceMinutes} onChange={(e) => setSettings({ ...settings, earlyLeaveGraceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm" min={0} max={60} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Auto-Absent Setelah (menit)</label>
              <input type="number" value={settings.autoAbsentAfterMinutes} onChange={(e) => setSettings({ ...settings, autoAbsentAfterMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
              <p className="text-xs text-gray-400 mt-1">Otomatis tandai absent jika tidak clock-in</p>
            </div>
          </div>
          <div className="mt-4 border-t pt-4 space-y-1">
            <Toggle value={settings.overtimeEnabled} onChange={(v) => setSettings({ ...settings, overtimeEnabled: v })} label="Aktifkan perhitungan lembur" />
            {settings.overtimeEnabled && (
              <div className="flex items-center gap-4 pl-4">
                <div>
                  <label className="text-xs text-gray-500">Min. lembur (menit)</label>
                  <input type="number" value={settings.overtimeMinMinutes} onChange={(e) => setSettings({ ...settings, overtimeMinMinutes: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border rounded text-sm ml-2" />
                </div>
                <Toggle value={settings.overtimeRequiresApproval} onChange={(v) => setSettings({ ...settings, overtimeRequiresApproval: v })} label="Butuh approval" />
              </div>
            )}
          </div>
        </div>

        {/* GPS / Mobile */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Absensi Mobile / GPS</h3>
          </div>
          <div className="space-y-1">
            <Toggle value={settings.gpsAttendanceEnabled} onChange={(v) => setSettings({ ...settings, gpsAttendanceEnabled: v })} label="Aktifkan absensi via GPS/Mobile" />
            {settings.gpsAttendanceEnabled && (
              <>
                <div className="flex items-center gap-4 pl-4 py-2">
                  <div>
                    <label className="text-xs text-gray-500">Radius Geofence (meter)</label>
                    <input type="number" value={settings.geoFenceRadius} onChange={(e) => setSettings({ ...settings, geoFenceRadius: parseInt(e.target.value) || 100 })}
                      className="w-24 px-2 py-1 border rounded text-sm ml-2" min={10} max={5000} />
                  </div>
                </div>
                <div className="pl-4">
                  <Toggle value={settings.requireSelfie} onChange={(v) => setSettings({ ...settings, requireSelfie: v })} label="Wajib selfie saat clock-in/out" />
                  <Toggle value={settings.allowOutsideGeofence} onChange={(v) => setSettings({ ...settings, allowOutsideGeofence: v })} label="Izinkan absensi di luar geofence (dengan tanda)" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fingerprint Device */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Fingerprint & Device</h3>
          </div>
          <div className="space-y-1">
            <Toggle value={settings.fingerprintEnabled} onChange={(v) => setSettings({ ...settings, fingerprintEnabled: v })} label="Aktifkan integrasi fingerprint" />
            {settings.fingerprintEnabled && (
              <div className="pl-4">
                <Toggle value={settings.autoProcessDeviceLogs} onChange={(v) => setSettings({ ...settings, autoProcessDeviceLogs: v })} label="Auto-proses log device ke attendance" />
                <div className="flex items-center gap-4 py-2">
                  <span className="text-sm text-gray-700">Deteksi tipe punch</span>
                  <select value={settings.punchTypeDetection} onChange={(e) => setSettings({ ...settings, punchTypeDetection: e.target.value })}
                    className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="auto">Auto (ganjil=masuk, genap=keluar)</option>
                    <option value="device">Dari device</option>
                    <option value="time_based">Berdasarkan waktu</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cuti */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Kuota Cuti</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuti Tahunan (hari)</label>
              <input type="number" value={settings.annualLeaveQuota} onChange={(e) => setSettings({ ...settings, annualLeaveQuota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuti Sakit (hari)</label>
              <input type="number" value={settings.sickLeaveQuota} onChange={(e) => setSettings({ ...settings, sickLeaveQuota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
            </div>
          </div>
          <Toggle value={settings.leaveRequiresApproval} onChange={(v) => setSettings({ ...settings, leaveRequiresApproval: v })} label="Cuti memerlukan approval" />
        </div>

        {/* Notifikasi */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">Notifikasi</h3>
          </div>
          <div className="space-y-1">
            <Toggle value={settings.notifyLateToManager} onChange={(v) => setSettings({ ...settings, notifyLateToManager: v })} label="Kirim notifikasi ke manager saat karyawan terlambat" />
            <Toggle value={settings.notifyAbsentToManager} onChange={(v) => setSettings({ ...settings, notifyAbsentToManager: v })} label="Kirim notifikasi ke manager saat karyawan tidak hadir" />
            <Toggle value={settings.notifyOvertimeToHr} onChange={(v) => setSettings({ ...settings, notifyOvertimeToHr: v })} label="Kirim notifikasi ke HR saat ada lembur" />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200">
            <Save className="w-5 h-5" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </HQLayout>
  );
}
