import { useState, useEffect, useCallback } from 'react';
import {
  X, Loader2, Target, Calendar, Clock, TrendingUp, TrendingDown,
  Minus, ChevronLeft, ChevronRight, User,
} from 'lucide-react';

const fmtTime = (val: string | null) => {
  if (!val) return '-';
  const s = String(val);
  if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  const d = new Date(s);
  return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '-';

const STATUS_LABEL: Record<string, string> = {
  present: 'Hadir', late: 'Terlambat', absent: 'Absen', leave: 'Cuti',
  work_from_home: 'WFH', wfh: 'WFH',
};

const STATUS_COLOR: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  late: 'bg-amber-50 text-amber-700 ring-amber-200',
  absent: 'bg-rose-50 text-rose-700 ring-rose-200',
  leave: 'bg-blue-50 text-blue-700 ring-blue-200',
  work_from_home: 'bg-violet-50 text-violet-700 ring-violet-200',
  wfh: 'bg-violet-50 text-violet-700 ring-violet-200',
};

type Props = {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
};

type DetailData = {
  employee: any;
  kpi: { overallScore: number; period: string; metrics: any[] };
  attendance: {
    month: string;
    summary: Record<string, number>;
    attendanceRate: number;
    totalWorkHours: number;
    workDaysInMonth: number;
    records: any[];
    today: any;
  };
};

const mgrApi = async (action: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ action, ...params });
  const r = await fetch(`/api/employee/manager?${qs}`);
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!json.success && r.status >= 400) {
      return { success: false, error: json.error || `Gagal (${r.status})` };
    }
    return json;
  } catch {
    return { success: false, error: `Gagal memproses respons server (${r.status})` };
  }
};

export default function TeamMemberDetailSheet({ employeeId, employeeName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DetailData | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'kpi' | 'attendance'>('overview');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await mgrApi('team-member-detail', { employeeId, month, period: month });
      if (res.success) setData(res.data);
      else setError(res.error || 'Gagal memuat data');
    } catch {
      setError('Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const shiftMonth = (delta: number) => {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  };

  const kpiScore = data?.kpi?.overallScore ?? 0;
  const kpiMetrics = data?.kpi?.metrics ?? [];
  const att = data?.attendance;
  const emp = data?.employee;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
              {(employeeName || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{emp?.name || employeeName}</h3>
              <p className="text-[11px] text-slate-500 truncate">
                {emp?.position || ''}{emp?.department ? ` · ${emp.department}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-4 pt-3">
          {([
            { key: 'overview' as const, label: 'Ringkasan', icon: User },
            { key: 'kpi' as const, label: 'KPI', icon: Target },
            { key: 'attendance' as const, label: 'Absensi', icon: Calendar },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveSection(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSection === t.key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-rose-500 text-sm">{error}</div>
          ) : (
            <>
              {/* Month navigator */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg hover:bg-white">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  {new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg hover:bg-white">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {activeSection === 'overview' && (
                <div className="space-y-3">
                  {/* KPI score card */}
                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-4 border border-violet-100">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            stroke={kpiScore >= 80 ? '#10b981' : kpiScore >= 60 ? '#f59e0b' : '#f43f5e'}
                            strokeWidth="3" strokeDasharray={`${kpiScore}, 100`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-800">
                          {kpiScore}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-violet-600 font-semibold">Skor KPI</p>
                        <p className="text-sm font-bold text-slate-900">
                          {kpiScore >= 80 ? 'Di Atas Target' : kpiScore >= 60 ? 'Perlu Peningkatan' : 'Di Bawah Target'}
                        </p>
                        <p className="text-[11px] text-slate-500">{kpiMetrics.length} metrik · {month}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance summary */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Kehadiran', value: `${att?.attendanceRate ?? 0}%`, color: 'text-emerald-600' },
                      { label: 'Hadir', value: att?.summary?.present ?? 0, color: 'text-blue-600' },
                      { label: 'Terlambat', value: att?.summary?.late ?? 0, color: 'text-amber-600' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {att?.today && (
                    <div className="bg-white rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Hari Ini</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          Masuk: {fmtTime(att.today.check_in)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          Pulang: {fmtTime(att.today.check_out)}
                        </span>
                      </div>
                    </div>
                  )}

                  {emp && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                      {emp.employee_code && <p><span className="font-medium">NIK:</span> {emp.employee_code}</p>}
                      {emp.branch_name && <p><span className="font-medium">Cabang:</span> {emp.branch_name}</p>}
                      {emp.email && <p><span className="font-medium">Email:</span> {emp.email}</p>}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'kpi' && (
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <div className="relative w-24 h-24 mx-auto mb-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={kpiScore >= 80 ? '#22c55e' : kpiScore >= 60 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="2.5" strokeDasharray={`${kpiScore}, 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{kpiScore}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600">Skor KPI — {month}</p>
                  </div>

                  {kpiMetrics.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Belum ada data KPI untuk periode ini</p>
                  ) : kpiMetrics.map((m: any, i: number) => {
                    const pct = m.target > 0 ? Math.min(100, Math.round((m.actual / m.target) * 100)) : 0;
                    const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
                    const trendColor = m.trend === 'up' ? 'text-emerald-500' : m.trend === 'down' ? 'text-rose-500' : 'text-slate-400';
                    return (
                      <div key={i} className="bg-white rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                          <div className="flex items-center gap-1">
                            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                            <span className="text-xs font-bold text-slate-600">{m.achievement}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Aktual: {m.actual}{m.unit}</span>
                          <span>Target: {m.target}{m.unit} · Bobot {m.weight}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeSection === 'attendance' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'present', label: 'Hadir', color: 'bg-emerald-50 text-emerald-700' },
                      { key: 'late', label: 'Telat', color: 'bg-amber-50 text-amber-700' },
                      { key: 'absent', label: 'Absen', color: 'bg-rose-50 text-rose-700' },
                      { key: 'leave', label: 'Cuti', color: 'bg-blue-50 text-blue-700' },
                    ].map((s) => (
                      <div key={s.key} className={`rounded-xl p-2 text-center ${s.color}`}>
                        <p className="text-lg font-bold">{att?.summary?.[s.key] ?? 0}</p>
                        <p className="text-[10px] font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Tingkat kehadiran: <strong className="text-slate-700">{att?.attendanceRate ?? 0}%</strong></span>
                    <span>Total jam: <strong className="text-slate-700">{att?.totalWorkHours ?? 0}j</strong></span>
                  </div>

                  {!att?.records?.length ? (
                    <p className="text-center text-sm text-slate-400 py-6">Belum ada data absensi untuk periode ini</p>
                  ) : att.records.map((r: any) => (
                    <div key={r.date} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3">
                      <div className="text-center w-12 shrink-0">
                        <p className="text-xs font-bold text-slate-800">
                          {new Date(r.date).getDate()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span>{fmtTime(r.check_in)} – {fmtTime(r.check_out)}</span>
                          {r.work_hours != null && (
                            <span className="text-slate-400">({r.work_hours}j)</span>
                          )}
                        </div>
                        {r.late_minutes > 0 && (
                          <p className="text-[10px] text-amber-600">Terlambat {r.late_minutes} menit</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                        STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600 ring-slate-200'
                      }`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
