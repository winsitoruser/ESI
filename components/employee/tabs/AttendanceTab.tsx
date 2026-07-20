import { ChevronRight, CalendarDays, Clock, Loader2, RefreshCw } from 'lucide-react';

export interface AttendanceSummary {
  present: number;
  late: number;
  leave: number;
  wfh: number;
  absent: number;
  total: number;
}

export interface AttendanceMeta {
  attendanceRate: number;
  workDaysInMonth: number;
  totalWorkHours: number;
}

export interface AttendanceRecord {
  date: string;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours?: number | null;
  late_minutes?: number;
  notes?: string | null;
}

const attStatusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  present: { label: 'Hadir', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  late: { label: 'Terlambat', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  absent: { label: 'Absen', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  leave: { label: 'Cuti/Izin', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  wfh: { label: 'WFH', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export interface AttendanceTabProps {
  attMonth: string;
  setAttMonth: (month: string) => void;
  attMeta: AttendanceMeta;
  attSummary: AttendanceSummary;
  attHistory: AttendanceRecord[];
  attLoading: boolean;
  onRefresh: (month: string) => void;
}

export default function AttendanceTab({
  attMonth,
  setAttMonth,
  attMeta,
  attSummary,
  attHistory,
  attLoading,
  onRefresh,
}: AttendanceTabProps) {
  const monthLabel = new Date(`${attMonth}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const prevMonth = () => {
    const d = new Date(`${attMonth}-01`);
    d.setMonth(d.getMonth() - 1);
    setAttMonth(d.toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const d = new Date(`${attMonth}-01`);
    d.setMonth(d.getMonth() + 1);
    if (d <= new Date()) setAttMonth(d.toISOString().slice(0, 7));
  };
  const isCurrentMonth = attMonth === new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all">
          <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
        </button>
        <p className="font-semibold text-gray-800 text-sm capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 active:scale-95 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wide">Tingkat Kehadiran</p>
            <p className="text-4xl font-bold mt-0.5">
              {attMeta.attendanceRate}
              <span className="text-xl">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Hari Kerja</p>
            <p className="text-2xl font-bold">
              {attMeta.workDaysInMonth}
              <span className="text-sm font-normal"> / {attSummary.total}</span>
            </p>
            <p className="text-xs text-blue-200 mt-0.5">Total jam: {attMeta.totalWorkHours}j</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-2.5">
          <div
            className="bg-white rounded-full h-2.5 transition-all duration-500"
            style={{ width: `${attMeta.attendanceRate}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {[
          { key: 'present', label: 'Hadir', value: attSummary.present, color: 'bg-green-50 text-green-700' },
          { key: 'late', label: 'Terlambat', value: attSummary.late, color: 'bg-yellow-50 text-yellow-700' },
          { key: 'leave', label: 'Cuti', value: attSummary.leave, color: 'bg-blue-50 text-blue-700' },
          { key: 'wfh', label: 'WFH', value: attSummary.wfh, color: 'bg-purple-50 text-purple-700' },
          { key: 'absent', label: 'Absen', value: attSummary.absent, color: 'bg-red-50 text-red-700' },
        ].map((s) => (
          <div key={s.key} className={`${s.color} rounded-xl p-2 text-center`}>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[9px] font-medium leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Riwayat Harian</h3>
          <button
            type="button"
            onClick={() => onRefresh(attMonth)}
            className="text-gray-400 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${attLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {attLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : attHistory.length === 0 ? (
          <div className="text-center py-10">
            <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Belum ada data absensi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {attHistory.map((r, i) => {
              const d = new Date(`${r.date}T00:00:00`);
              const cfg = attStatusConfig[r.status] || attStatusConfig.absent;
              const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
              const isToday = r.date === new Date().toISOString().split('T')[0];
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${isToday ? 'bg-blue-50/50' : ''}`}>
                  <div
                    className={`w-11 text-center flex-shrink-0 ${isToday ? 'bg-blue-600 text-white rounded-xl py-1' : ''}`}
                  >
                    <p className={`text-[10px] font-medium ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>{dayName}</p>
                    <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{d.getDate()}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {r.late_minutes != null && r.late_minutes > 0 && (
                        <span className="text-[10px] text-yellow-600">+{r.late_minutes} mnt</span>
                      )}
                      {isToday && <span className="text-[10px] font-bold text-blue-600">Hari ini</span>}
                    </div>
                    {(r.check_in || r.check_out) && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {r.check_in && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-green-500" />
                            {r.check_in.substring(0, 5)}
                          </span>
                        )}
                        {r.check_out && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-orange-500" />
                            {r.check_out.substring(0, 5)}
                          </span>
                        )}
                        {r.work_hours != null && r.work_hours > 0 && (
                          <span className="text-gray-400">{r.work_hours}j</span>
                        )}
                      </div>
                    )}
                    {r.notes && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
