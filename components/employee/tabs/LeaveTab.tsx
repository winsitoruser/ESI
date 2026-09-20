import { useMemo, useState } from 'react';
import { Plus, CalendarDays } from 'lucide-react';
import { StatusBadge } from '@/components/employee/portal-ui';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Cuti Tahunan' },
  { value: 'sick', label: 'Cuti Sakit' },
  { value: 'important', label: 'Cuti Penting' },
  { value: 'maternity', label: 'Cuti Melahirkan' },
  { value: 'comp_off', label: 'Cuti Pengganti (Comp-Off)' },
  { value: 'unpaid', label: 'Cuti Tanpa Gaji' },
];

const LEAVE_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-gray-500'];

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

function isCompOffBalance(lb: any): boolean {
  const code = String(lb.code || '').toLowerCase();
  const name = String(lb.type || lb.name || '').toLowerCase();
  return code === 'comp_off' || name.includes('pengganti') || name.includes('comp');
}

function remainingOf(lb: any): number {
  if (lb.remaining != null) return Number(lb.remaining);
  return Math.max(0, (Number(lb.total) || Number(lb.total_days) || 0) - (Number(lb.used) || Number(lb.used_days) || 0));
}

export interface LeaveTabProps {
  leaveBalance: any[];
  leaveRequests: any[];
  onOpenApply: () => void;
  onCancelLeave?: (id: string) => void;
}

export default function LeaveTab({ leaveBalance, leaveRequests, onOpenApply, onCancelLeave }: LeaveTabProps) {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'comp_off' | 'pending'>('all');

  const filteredRequests = useMemo(() => {
    if (historyFilter === 'all') return leaveRequests;
    if (historyFilter === 'pending') return leaveRequests.filter((l) => l.status === 'pending');
    return leaveRequests.filter((l) => {
      const t = String(l.leave_type || l.leave_type_name || '').toLowerCase();
      return t.includes('comp') || t.includes('pengganti') || t === 'comp_off';
    });
  }, [leaveRequests, historyFilter]);

  return (
    <div className="space-y-4">
      <div className="hf-card p-4 border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Saldo Cuti</h3>
          <button
            type="button"
            onClick={onOpenApply}
            aria-label="Ajukan cuti"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden /> Ajukan Cuti
          </button>
        </div>
        <div className="space-y-3">
          {leaveBalance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2" role="status">Belum ada saldo cuti</p>
          ) : leaveBalance.map((lb: any, i: number) => {
            const rem = remainingOf(lb);
            const total = Number(lb.total) || Number(lb.total_days) || 12;
            const used = Number(lb.used) || Number(lb.used_days) || 0;
            const comp = isCompOffBalance(lb);
            const isLow = rem <= 2 && !comp;
            return (
              <div
                key={lb.id || lb.code || i}
                className={
                  comp
                    ? 'rounded-lg ring-1 ring-cyan-200 bg-cyan-50/60 p-2 -mx-1'
                    : isLow
                      ? 'rounded-lg ring-1 ring-amber-200 bg-amber-50/70 p-2 -mx-1'
                      : ''
                }
                data-leave-code={lb.code || undefined}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className={`text-gray-700 ${comp ? 'font-semibold text-cyan-800' : isLow ? 'font-semibold text-amber-900' : ''}`}>
                    {lb.type || lb.name}
                    {comp && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">
                        Comp-Off
                      </span>
                    )}
                    {isLow && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Sisa rendah
                      </span>
                    )}
                    {lb.code && (
                      <span className="ml-1 text-[10px] text-gray-400 font-mono">{lb.code}</span>
                    )}
                  </span>
                  <span className={`font-medium ${comp ? 'text-cyan-800' : isLow ? 'text-amber-800' : ''}`}>
                    Sisa {rem} · {used}/{total} hari
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5" aria-hidden>
                  <div
                    className={`h-2.5 rounded-full ${comp ? 'bg-cyan-500' : isLow ? 'bg-amber-500' : LEAVE_COLORS[i % LEAVE_COLORS.length]}`}
                    style={{ width: `${Math.min(100, (used / Math.max(total, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hf-card p-4 border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="font-semibold text-gray-900">Riwayat Pengajuan</h3>
          <div className="flex gap-1" role="group" aria-label="Filter riwayat cuti">
            {([
              { key: 'all', label: 'Semua' },
              { key: 'comp_off', label: 'Comp-Off' },
              { key: 'pending', label: 'Pending' },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setHistoryFilter(f.key)}
                aria-pressed={historyFilter === f.key}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  historyFilter === f.key
                    ? 'bg-cyan-600 text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {filteredRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4" role="status">Belum ada pengajuan cuti</p>
        ) : (
          <div className="space-y-2.5">
            {filteredRequests.map((l: any) => {
              const isComp = String(l.leave_type || '').toLowerCase() === 'comp_off'
                || String(l.leave_type_name || '').toLowerCase().includes('pengganti');
              return (
              <div
                key={l.id}
                className={`p-3 rounded-lg ${isComp ? 'bg-cyan-50 ring-1 ring-cyan-100' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isComp ? 'text-cyan-900' : 'text-gray-900'}`}>
                    {l.leave_type_name ||
                      LEAVE_TYPES.find((t) => t.value === l.leave_type)?.label ||
                      l.leave_type}
                  </span>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{l.reason}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" aria-hidden />
                    {fmtDate(l.start_date || l.startDate)} - {fmtDate(l.end_date || l.endDate)}
                  </span>
                  <span>{l.total_days || l.totalDays} hari kerja (kalender)</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Durasi dihitung hari kalender; hari kerja efektif mengikuti kalender perusahaan.</p>
                {l.status === 'pending' && l.total_approval_steps > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((l.current_approval_step || 1) / l.total_approval_steps) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-teal-600 font-semibold whitespace-nowrap">
                      Tahap {l.current_approval_step || 1}/{l.total_approval_steps}
                    </span>
                  </div>
                )}
                {l.status === 'pending' && l.current_step?.approver_role && (
                  <p className="text-[10px] text-amber-600 mt-1">Menunggu: {l.current_step.approver_role}</p>
                )}
                {l.status === 'rejected' && l.rejection_reason && (
                  <p className="text-[10px] text-rose-600 mt-1">Alasan: {l.rejection_reason}</p>
                )}
                {l.status === 'pending' && onCancelLeave && (
                  <button
                    type="button"
                    onClick={() => onCancelLeave(l.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-600 underline"
                  >
                    Batalkan pengajuan
                  </button>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}
