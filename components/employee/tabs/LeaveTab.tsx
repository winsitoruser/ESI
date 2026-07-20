import { Plus, CalendarDays } from 'lucide-react';
import { StatusBadge } from '@/components/employee/portal-ui';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Cuti Tahunan' },
  { value: 'sick', label: 'Cuti Sakit' },
  { value: 'important', label: 'Cuti Penting' },
  { value: 'maternity', label: 'Cuti Melahirkan' },
  { value: 'unpaid', label: 'Cuti Tanpa Gaji' },
];

const LEAVE_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'];

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export interface LeaveTabProps {
  leaveBalance: any[];
  leaveRequests: any[];
  onOpenApply: () => void;
}

export default function LeaveTab({ leaveBalance, leaveRequests, onOpenApply }: LeaveTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Saldo Cuti</h3>
          <button
            type="button"
            onClick={onOpenApply}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Ajukan Cuti
          </button>
        </div>
        <div className="space-y-3">
          {leaveBalance.map((lb: any, i: number) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{lb.type || lb.name}</span>
                <span className="font-medium">
                  {lb.used || lb.used_days || 0}/{lb.total || lb.total_days || 12} hari
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${LEAVE_COLORS[i % LEAVE_COLORS.length]}`}
                  style={{
                    width: `${((lb.used || lb.used_days || 0) / (lb.total || lb.total_days || 12)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Riwayat Pengajuan</h3>
        {leaveRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada pengajuan cuti</p>
        ) : (
          <div className="space-y-2.5">
            {leaveRequests.map((l: any) => (
              <div key={l.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {l.leave_type_name ||
                      LEAVE_TYPES.find((t) => t.value === l.leave_type)?.label ||
                      l.leave_type}
                  </span>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{l.reason}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {fmtDate(l.start_date || l.startDate)} - {fmtDate(l.end_date || l.endDate)}
                  </span>
                  <span>{l.total_days || l.totalDays} hari</span>
                </div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
