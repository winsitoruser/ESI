import { useState, useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
import HRStatCard from '@/components/humanify/HRStatCard';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import {
  WORK_TIME_SYSTEMS,
  evaluateClockIn,
  evaluateClockOut,
  normalizeWorkTimePolicy,
  presetForSystem,
  toTimeInput,
  type WorkTimePolicy,
  type WorkTimeSystem,
} from '@/lib/hris/work-time-policy';
import { normalizeWorkShift } from '@/lib/hris/shift-record';
import {
  Settings, Clock, MapPin, Fingerprint, Bell, Save, Calendar, Timer,
  Coffee, Layers, Smartphone, Globe, ArrowRight, CheckCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabKey = 'system' | 'hours' | 'tolerance' | 'gps' | 'device' | 'leave' | 'notify';

type AttSettings = WorkTimePolicy & {
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
};

type ShiftOpt = { id: string; name: string; code?: string; start: string; end: string; crossDay?: boolean };

const GPS_DEFAULTS = {
  gpsAttendanceEnabled: true, geoFenceRadius: 100, requireSelfie: false, allowOutsideGeofence: false,
  fingerprintEnabled: true, autoProcessDeviceLogs: true, punchTypeDetection: 'auto',
  annualLeaveQuota: 12, sickLeaveQuota: 14, leaveRequiresApproval: true,
  notifyLateToManager: true, notifyAbsentToManager: true, notifyOvertimeToHr: false,
};

const defaultSettings: AttSettings = { ...normalizeWorkTimePolicy({}), ...GPS_DEFAULTS };

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const SYSTEM_ICON: Record<WorkTimeSystem, typeof Clock> = {
  fixed: Clock,
  shift: Layers,
  flexible: Timer,
  hours_bank: Calendar,
  compressed: Calendar,
  split: Coffee,
  field: MapPin,
  remote_hybrid: Globe,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[color:var(--hf-ink-faint)]">{hint}</p>}
    </label>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-[color:var(--hf-ink-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-[var(--hf-brand-600)]' : 'bg-slate-300'}`}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}

function hydrateSettings(raw: Record<string, any>): AttSettings {
  const work = normalizeWorkTimePolicy(raw);
  return {
    ...defaultSettings,
    ...raw,
    ...work,
    workStartTime: toTimeInput(raw.workStartTime || work.workStartTime),
    workEndTime: toTimeInput(raw.workEndTime || work.workEndTime),
    breakStartTime: toTimeInput(raw.breakStartTime || work.breakStartTime),
    breakEndTime: toTimeInput(raw.breakEndTime || work.breakEndTime),
  };
}

export default function AttendanceSettingsPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AttSettings>(defaultSettings);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>('system');
  const [shifts, setShifts] = useState<ShiftOpt[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/attendance/settings');
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(hydrateSettings(json.data));
        setDataSource('live');
        setDirty(false);
      } else {
        setDataSource('empty');
      }
    } catch {
      setSettings(defaultSettings);
      setDataSource('empty');
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/humanify/attendance-management?action=shifts');
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.shifts) ? json.shifts : []);
      setShifts(list.map((s: any) => {
        const n = normalizeWorkShift(s);
        return {
          id: n.id,
          name: n.name || n.code || 'Shift',
          code: n.code,
          start: n.start_time,
          end: n.end_time,
          crossDay: n.is_cross_day,
        };
      }));
    } catch { /* catalog optional */ }
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
    fetchShifts();
  }, []);

  const previewIn = useMemo(() => evaluateClockIn(settings, new Date()), [settings]);
  const previewOut = useMemo(() => {
    const start = new Date();
    start.setHours(8, 0, 0, 0);
    const end = new Date();
    end.setHours(18, 0, 0, 0);
    return evaluateClockOut(settings, start, end);
  }, [settings]);

  const meta = WORK_TIME_SYSTEMS.find((s) => s.code === settings.workTimeSystem) || WORK_TIME_SYSTEMS[0];
  const selectedShift = shifts.find((s) => s.id === settings.defaultShiftId);

  if (!mounted) return null;

  const patch = (partial: Partial<AttSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
    setDirty(true);
  };

  const applySystem = (code: WorkTimeSystem) => {
    const preset = presetForSystem(code);
    setSettings((s) => hydrateSettings({ ...s, ...preset, workTimeSystem: code }));
    setDirty(true);
  };

  const toggleDay = (day: number) => {
    const days = settings.workDays.includes(day)
      ? settings.workDays.filter((d) => d !== day)
      : [...settings.workDays, day].sort();
    patch({ workDays: days });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/attendance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { toast.error('Gagal menyimpan pengaturan'); setSaving(false); return; }
      const json = await res.json();
      if (json.success) {
        toast.success('Pengaturan jam kerja & absensi disimpan');
        if (json.data) setSettings(hydrateSettings(json.data));
        setDirty(false);
      } else {
        toast.error(json.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Error menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const sys = settings.workTimeSystem;
  const showFixedHours = ['fixed', 'compressed', 'shift'].includes(sys);
  const showFlex = ['flexible', 'remote_hybrid'].includes(sys);

  return (
    <HQLayout title={t('hris.attendanceSettingsTitle')} subtitle={t('hris.attendanceSettingsSubtitle')}>
      <div className="space-y-5">
        <EnterprisePageHeader
          title="Pengaturan absensi & jam kerja"
          subtitle="Pilih sistem jam kerja industri (tetap, shift, flextime, bank jam, dan lainnya). Kebijakan ini dipakai saat clock-in/out portal, mobile, dan mesin sidik jari."
          badge="Kehadiran"
          icon={Settings}
          actions={<DataSourceBadge source={dataSource} />}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HRStatCard label="Sistem aktif" value={meta.label} sub={meta.hint} icon={SYSTEM_ICON[sys]} accent="violet" />
          <HRStatCard
            label={previewIn.tracksPunctuality ? 'Jam masuk acuan' : 'Target jam harian'}
            value={previewIn.tracksPunctuality ? previewIn.expectedStart : `${settings.dailyHoursTarget} jam`}
            sub={selectedShift ? `${selectedShift.name} ${selectedShift.start}–${selectedShift.end}` : `${settings.weeklyHoursTarget} jam / minggu`}
            icon={Clock}
            accent="emerald"
          />
          <HRStatCard
            label="Simulasi sekarang"
            value={previewIn.status === 'late' ? `Telat ${previewIn.lateMinutes} m` : 'Hadir'}
            sub={previewIn.note}
            icon={previewIn.status === 'late' ? AlertTriangle : CheckCircle}
            accent={previewIn.status === 'late' ? 'amber' : 'emerald'}
          />
        </div>

        {dirty && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--hf-radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-950">Perubahan jam kerja belum disimpan. Clock-in karyawan masih memakai kebijakan lama sampai Anda menekan Simpan.</p>
            <button type="button" onClick={handleSave} disabled={saving} className="hf-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan…' : 'Simpan sekarang'}
            </button>
          </div>
        )}

        <EnterpriseTabBar
          tabs={[
            { key: 'system', label: 'Sistem jam kerja', icon: Layers },
            { key: 'hours', label: 'Jam & hari', icon: Clock },
            { key: 'tolerance', label: 'Toleransi & lembur', icon: Timer },
            { key: 'gps', label: 'GPS', icon: Smartphone },
            { key: 'device', label: 'Device', icon: Fingerprint },
            { key: 'leave', label: 'Cuti', icon: Coffee },
            { key: 'notify', label: 'Notifikasi', icon: Bell },
          ]}
          active={tab}
          onChange={setTab}
        />

        {loading ? (
          <div className="h-64 animate-pulse hf-card" />
        ) : (
          <>
            {tab === 'system' && (
              <div className="space-y-4">
                <p className="text-sm text-[color:var(--hf-ink-muted)]">
                  Satu tenant memakai satu sistem default. Karyawan shift tetap bisa punya jadwal harian di{' '}
                  <Link href="/humanify/attendance-management" className="font-medium text-[color:var(--hf-brand-600)] hover:underline">Jadwal &amp; Shift</Link>.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {WORK_TIME_SYSTEMS.map((item) => {
                    const Icon = SYSTEM_ICON[item.code];
                    const active = settings.workTimeSystem === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => applySystem(item.code)}
                        className={`rounded-[var(--hf-radius-lg)] border p-4 text-left transition ${
                          active
                            ? 'border-[var(--hf-brand-600)] bg-[var(--hf-brand-50)] shadow-[var(--hf-shadow)]'
                            : 'border-[var(--hf-border)] bg-white hover:border-[var(--hf-brand-100)]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`rounded-[var(--hf-radius)] p-2 ${active ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-brand-600)]'}`}>
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{item.label}</p>
                            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-secondary)]">{item.summary}</p>
                            <p className="mt-1 text-[11px] text-[color:var(--hf-ink-faint)]">{item.hint}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[color:var(--hf-ink-faint)]">Memilih sistem mengisi nilai umum industri. Tekan <strong>Simpan pengaturan</strong> agar kebijakan dipakai di clock-in karyawan.</p>
              </div>
            )}

            {tab === 'hours' && (
              <div className="hf-card space-y-5 p-5">
                {sys === 'shift' && (
                  <div className="space-y-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Katalog shift</p>
                      <Link href="/humanify/attendance-management" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                        Kelola shift <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <Field label="Shift default (jika karyawan belum dijadwalkan hari ini)">
                      <select
                        value={settings.defaultShiftId}
                        onChange={(e) => {
                          const sh = shifts.find((x) => x.id === e.target.value);
                          patch({
                            defaultShiftId: e.target.value,
                            workStartTime: sh?.start || settings.workStartTime,
                            workEndTime: sh?.end || settings.workEndTime,
                            nightShiftCrossDay: sh?.crossDay || settings.nightShiftCrossDay,
                          });
                        }}
                        className="hf-input w-full"
                      >
                        <option value="">— Pakai jam fallback di bawah —</option>
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name} ({s.start}–{s.end}{s.crossDay ? ', lintas hari' : ''})</option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Istirahat antar shift (jam)" hint="Praktik ILO/Permenaker: minimal 11 jam.">
                        <input type="number" min={8} max={24} className="hf-input w-full" value={settings.restBetweenShiftsHours} onChange={(e) => patch({ restBetweenShiftsHours: parseInt(e.target.value, 10) || 11 })} />
                      </Field>
                      <Field label="Maks. hari kerja beruntun">
                        <input type="number" min={1} max={14} className="hf-input w-full" value={settings.maxConsecutiveWorkDays} onChange={(e) => patch({ maxConsecutiveWorkDays: parseInt(e.target.value, 10) || 6 })} />
                      </Field>
                    </div>
                    <Toggle value={settings.nightShiftCrossDay} onChange={(v) => patch({ nightShiftCrossDay: v })} label="Shift malam boleh lintas hari (mis. 22:00–06:00)" />
                  </div>
                )}

                {showFlex && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Field label="Jendela masuk dari"><input type="time" className="hf-input w-full" value={settings.flexWindowStart} onChange={(e) => patch({ flexWindowStart: e.target.value })} /></Field>
                    <Field label="Jendela masuk sampai" hint="Telat dihitung setelah jam ini + toleransi."><input type="time" className="hf-input w-full" value={settings.flexWindowEnd} onChange={(e) => patch({ flexWindowEnd: e.target.value })} /></Field>
                    <Field label="Jam inti mulai"><input type="time" className="hf-input w-full" value={settings.coreHoursStart} onChange={(e) => patch({ coreHoursStart: e.target.value })} /></Field>
                    <Field label="Jam inti selesai"><input type="time" className="hf-input w-full" value={settings.coreHoursEnd} onChange={(e) => patch({ coreHoursEnd: e.target.value })} /></Field>
                  </div>
                )}

                {sys === 'remote_hybrid' && (
                  <Toggle value={settings.requireCoreHours} onChange={(v) => patch({ requireCoreHours: v })} label="Wajib hadir (online/kantor) selama jam inti" />
                )}

                {sys === 'hours_bank' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Periode bank jam">
                      <select className="hf-input w-full" value={settings.hoursBankPeriod} onChange={(e) => patch({ hoursBankPeriod: e.target.value as AttSettings['hoursBankPeriod'] })}>
                        <option value="weekly">Mingguan</option>
                        <option value="monthly">Bulanan</option>
                      </select>
                    </Field>
                    <Field label="Target jam / minggu"><input type="number" min={1} className="hf-input w-full" value={settings.weeklyHoursTarget} onChange={(e) => patch({ weeklyHoursTarget: parseFloat(e.target.value) || 40 })} /></Field>
                    <Field label="Target jam / hari"><input type="number" min={1} className="hf-input w-full" value={settings.dailyHoursTarget} onChange={(e) => patch({ dailyHoursTarget: parseFloat(e.target.value) || 8 })} /></Field>
                  </div>
                )}

                {sys === 'compressed' && (
                  <Field label="Pola minggu padat">
                    <select className="hf-input w-full max-w-xs" value={settings.compressedPattern} onChange={(e) => patch({ compressedPattern: e.target.value as AttSettings['compressedPattern'] })}>
                      <option value="4x10">4×10 (empat hari, 10 jam)</option>
                      <option value="9x80">9/80 (sembilan hari dalam dua minggu)</option>
                    </select>
                  </Field>
                )}

                {sys === 'split' && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Field label="Sesi 1 mulai"><input type="time" className="hf-input w-full" value={settings.workStartTime} onChange={(e) => patch({ workStartTime: e.target.value })} /></Field>
                    <Field label="Sesi 1 selesai"><input type="time" className="hf-input w-full" value={settings.workEndTime} onChange={(e) => patch({ workEndTime: e.target.value })} /></Field>
                    <Field label="Sesi 2 mulai"><input type="time" className="hf-input w-full" value={settings.splitSecondStart} onChange={(e) => patch({ splitSecondStart: e.target.value })} /></Field>
                    <Field label="Sesi 2 selesai"><input type="time" className="hf-input w-full" value={settings.splitSecondEnd} onChange={(e) => patch({ splitSecondEnd: e.target.value })} /></Field>
                  </div>
                )}

                {(showFixedHours || sys === 'field' || sys === 'flexible' || sys === 'remote_hybrid' || sys === 'hours_bank') && sys !== 'split' && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Field label={sys === 'shift' ? 'Jam fallback mulai' : 'Jam masuk'} hint={sys === 'flexible' ? 'Acuan jadwal, telat memakai batas jendela.' : undefined}>
                      <input type="time" className="hf-input w-full" value={settings.workStartTime} onChange={(e) => patch({ workStartTime: e.target.value })} />
                    </Field>
                    <Field label={sys === 'shift' ? 'Jam fallback selesai' : 'Jam pulang'}>
                      <input type="time" className="hf-input w-full" value={settings.workEndTime} onChange={(e) => patch({ workEndTime: e.target.value })} />
                    </Field>
                    <Field label="Istirahat mulai"><input type="time" className="hf-input w-full" value={settings.breakStartTime} onChange={(e) => patch({ breakStartTime: e.target.value })} /></Field>
                    <Field label="Istirahat selesai"><input type="time" className="hf-input w-full" value={settings.breakEndTime} onChange={(e) => patch({ breakEndTime: e.target.value })} /></Field>
                  </div>
                )}

                <Field label="Durasi istirahat (menit)" hint="Dipotong dari jam kerja saat clock-out jika durasi kerja lebih panjang dari istirahat.">
                  <input type="number" min={0} max={240} className="hf-input w-40" value={settings.breakDurationMinutes} onChange={(e) => patch({ breakDurationMinutes: parseInt(e.target.value, 10) || 0 })} />
                </Field>

                {sys !== 'hours_bank' && sys !== 'field' && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Field label="Target jam / hari"><input type="number" min={1} className="hf-input w-full" value={settings.dailyHoursTarget} onChange={(e) => patch({ dailyHoursTarget: parseFloat(e.target.value) || 8 })} /></Field>
                    <Field label="Target jam / minggu"><input type="number" min={1} className="hf-input w-full" value={settings.weeklyHoursTarget} onChange={(e) => patch({ weeklyHoursTarget: parseFloat(e.target.value) || 40 })} /></Field>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium text-[color:var(--hf-ink-muted)]">Hari kerja</p>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`h-10 w-10 rounded-[var(--hf-radius)] text-sm font-medium transition ${
                          settings.workDays.includes(i)
                            ? 'bg-[var(--hf-brand-600)] text-white'
                            : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)] hover:bg-slate-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] px-3 py-2 text-xs text-[color:var(--hf-ink-secondary)]">
                  Contoh lembur jika clock-out 18:00 setelah masuk 08:00: {previewOut.workHours} jam kerja
                  {previewOut.overtimeMinutes > 0 ? `, lembur ${previewOut.overtimeMinutes} menit` : ', belum lembur'}.
                </p>
              </div>
            )}

            {tab === 'tolerance' && (
              <div className="hf-card space-y-4 p-5">
                {!previewIn.tracksPunctuality && (
                  <p className="rounded-[var(--hf-radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Sistem {meta.label} tidak menandai telat dari jam masuk. Toleransi tetap tersimpan untuk jika Anda beralih ke sistem jam tetap/shift.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Toleransi terlambat (menit)" hint="Clock-in dalam jendela ini tetap berstatus hadir.">
                    <input type="number" min={0} max={120} className="hf-input w-full" value={settings.lateGraceMinutes} onChange={(e) => patch({ lateGraceMinutes: parseInt(e.target.value, 10) || 0 })} />
                  </Field>
                  <Field label="Toleransi pulang awal (menit)">
                    <input type="number" min={0} max={120} className="hf-input w-full" value={settings.earlyLeaveGraceMinutes} onChange={(e) => patch({ earlyLeaveGraceMinutes: parseInt(e.target.value, 10) || 0 })} />
                  </Field>
                  <Field label="Auto-absent setelah (menit)" hint="Acuan proses malam jika tidak clock-in.">
                    <input type="number" min={0} className="hf-input w-full" value={settings.autoAbsentAfterMinutes} onChange={(e) => patch({ autoAbsentAfterMinutes: parseInt(e.target.value, 10) || 0 })} />
                  </Field>
                </div>
                <div className="border-t border-[var(--hf-border)] pt-3">
                  <Toggle value={settings.overtimeEnabled} onChange={(v) => patch({ overtimeEnabled: v })} label="Aktifkan perhitungan lembur otomatis" />
                  {settings.overtimeEnabled && (
                    <div className="mt-2 grid grid-cols-1 gap-3 pl-1 sm:grid-cols-2">
                      <Field label="Minimum menit dihitung lembur">
                        <input type="number" min={0} className="hf-input w-full" value={settings.overtimeMinMinutes} onChange={(e) => patch({ overtimeMinMinutes: parseInt(e.target.value, 10) || 0 })} />
                      </Field>
                      <Toggle value={settings.overtimeRequiresApproval} onChange={(v) => patch({ overtimeRequiresApproval: v })} label="Lembur butuh persetujuan" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'gps' && (
              <div className="hf-card space-y-2 p-5">
                <Toggle value={settings.gpsAttendanceEnabled} onChange={(v) => patch({ gpsAttendanceEnabled: v })} label="Aktifkan absensi via GPS / mobile" />
                {settings.gpsAttendanceEnabled && (
                  <>
                    <Field label="Radius geofence (meter)">
                      <input type="number" min={10} max={5000} className="hf-input w-40" value={settings.geoFenceRadius} onChange={(e) => patch({ geoFenceRadius: parseInt(e.target.value, 10) || 100 })} />
                    </Field>
                    <Toggle value={settings.requireSelfie} onChange={(v) => patch({ requireSelfie: v })} label="Wajib selfie saat clock-in/out" />
                    <Toggle value={settings.allowOutsideGeofence} onChange={(v) => patch({ allowOutsideGeofence: v })} label="Izinkan absensi di luar geofence (dengan tanda)" />
                  </>
                )}
              </div>
            )}

            {tab === 'device' && (
              <div className="hf-card space-y-2 p-5">
                <Toggle value={settings.fingerprintEnabled} onChange={(v) => patch({ fingerprintEnabled: v })} label="Aktifkan integrasi fingerprint" />
                {settings.fingerprintEnabled && (
                  <>
                    <Toggle value={settings.autoProcessDeviceLogs} onChange={(v) => patch({ autoProcessDeviceLogs: v })} label="Auto-proses log device ke attendance" />
                    <Field label="Deteksi tipe punch">
                      <select className="hf-input" value={settings.punchTypeDetection} onChange={(e) => patch({ punchTypeDetection: e.target.value })}>
                        <option value="auto">Auto (ganjil=masuk, genap=keluar)</option>
                        <option value="device">Dari device</option>
                        <option value="time_based">Berdasarkan waktu</option>
                      </select>
                    </Field>
                  </>
                )}
              </div>
            )}

            {tab === 'leave' && (
              <div className="hf-card space-y-3 p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Cuti tahunan (hari)"><input type="number" min={0} className="hf-input w-full" value={settings.annualLeaveQuota} onChange={(e) => patch({ annualLeaveQuota: parseInt(e.target.value, 10) || 0 })} /></Field>
                  <Field label="Cuti sakit (hari)"><input type="number" min={0} className="hf-input w-full" value={settings.sickLeaveQuota} onChange={(e) => patch({ sickLeaveQuota: parseInt(e.target.value, 10) || 0 })} /></Field>
                </div>
                <Toggle value={settings.leaveRequiresApproval} onChange={(v) => patch({ leaveRequiresApproval: v })} label="Cuti memerlukan approval" />
              </div>
            )}

            {tab === 'notify' && (
              <div className="hf-card space-y-1 p-5">
                <Toggle value={settings.notifyLateToManager} onChange={(v) => patch({ notifyLateToManager: v })} label="Kirim notifikasi ke manager saat karyawan terlambat" />
                <Toggle value={settings.notifyAbsentToManager} onChange={(v) => patch({ notifyAbsentToManager: v })} label="Kirim notifikasi ke manager saat karyawan tidak hadir" />
                <Toggle value={settings.notifyOvertimeToHr} onChange={(v) => patch({ notifyOvertimeToHr: v })} label="Kirim notifikasi ke HR saat ada lembur" />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving} className="hf-btn-primary inline-flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
          </button>
        </div>
      </div>
    </HQLayout>
  );
}
