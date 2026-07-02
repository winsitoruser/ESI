import React, { useMemo } from 'react';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface WorkloadItem {
  employeeId: string;
  employeeName: string;
  position?: string;
  branchId?: string;
  activeTasks: number;
  totalHours: number;
  capacityHours?: number; // default 40/week
  overdue?: number;
}

interface Props {
  data: WorkloadItem[];
  periodLabel?: string;
  onEmployeeClick?: (emp: WorkloadItem) => void;
}

const getHeatColor = (utilization: number) => {
  if (utilization >= 1.2) return { bg: 'bg-red-500', text: 'text-white', label: 'Overload' };
  if (utilization >= 0.9) return { bg: 'bg-orange-500', text: 'text-white', label: 'High' };
  if (utilization >= 0.6) return { bg: 'bg-emerald-500', text: 'text-white', label: 'Optimal' };
  if (utilization >= 0.3) return { bg: 'bg-blue-400', text: 'text-white', label: 'Medium' };
  if (utilization > 0) return { bg: 'bg-sky-200', text: 'text-sky-800', label: 'Low' };
  return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Idle' };
};

export default function WorkloadHeatmap({ data, periodLabel = 'Minggu ini', onEmployeeClick }: Props) {
  const summary = useMemo(() => {
    const overload = data.filter((d) => (d.totalHours / (d.capacityHours || 40)) >= 1.2).length;
    const optimal = data.filter((d) => {
      const u = d.totalHours / (d.capacityHours || 40);
      return u >= 0.6 && u < 1.2;
    }).length;
    const idle = data.filter((d) => d.totalHours === 0).length;
    return { overload, optimal, idle, total: data.length };
  }, [data]);

  const sorted = useMemo(() => [...data].sort((a, b) => b.totalHours - a.totalHours), [data]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">Workload Heatmap</h3>
          <span className="text-xs text-gray-500">· {periodLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" />{summary.overload} overload</span>
          <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" />{summary.optimal} optimal</span>
          <span className="text-gray-500">{summary.idle} idle</span>
        </div>
      </div>

      <div className="p-4">
        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Belum ada data workload</div>
        )}
        <div className="space-y-2">
          {sorted.map((emp) => {
            const capacity = emp.capacityHours || 40;
            const util = emp.totalHours / capacity;
            const heat = getHeatColor(util);
            const pct = Math.min(150, util * 100);
            return (
              <button
                key={emp.employeeId}
                onClick={() => onEmployeeClick?.(emp)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {emp.employeeName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate">{emp.employeeName}</span>
                      {emp.position && <span className="text-[10px] text-gray-400 hidden sm:inline">· {emp.position}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      <span className="text-gray-500">{emp.activeTasks} task</span>
                      <span className="font-mono text-gray-700">{emp.totalHours.toFixed(1)}h / {capacity}h</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${heat.bg} ${heat.text}`}>{heat.label}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all ${heat.bg}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    {pct > 100 && <div className="absolute inset-y-0 right-0 bg-red-600" style={{ width: `${Math.min(50, pct - 100)}%` }} />}
                  </div>
                </div>
                {emp.overdue !== undefined && emp.overdue > 0 && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                    {emp.overdue} telat
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
