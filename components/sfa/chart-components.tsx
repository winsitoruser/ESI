import React from 'react';

export const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#6366f1', '#a855f7'];
export const LEAD_COLORS: Record<string, string> = { new: '#3b82f6', contacted: '#06b6d4', qualified: '#6366f1', proposal: '#8b5cf6', negotiation: '#f59e0b', converted: '#10b981', lost: '#ef4444' };
export const STAGE_COLORS: Record<string, string> = { qualification: '#3b82f6', needs_analysis: '#6366f1', proposal: '#8b5cf6', negotiation: '#f59e0b', closed_won: '#10b981', closed_lost: '#ef4444' };

export const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-gray-900/10 px-4 py-3 rounded-xl text-xs" style={{ minWidth: 140 }}>
      {label && <p className="text-gray-500 font-medium mb-2 pb-2 border-b border-gray-100">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: p.color || p.fill }} />
              <span className="text-gray-600">{p.name}</span>
            </div>
            <span className="font-bold text-gray-900">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartCard = ({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-0 overflow-hidden ${className}`}>
    <div className="px-5 pt-5 pb-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

export const ChartLegendItem = ({ color, label, value, total, suffix = '' }: { color: string; label: string; value: number; total?: number; suffix?: string }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="w-3 h-3 rounded-md shadow-sm shrink-0" style={{ background: color }} />
    <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-bold text-gray-900">{(value || 0).toLocaleString()}{suffix}</span>
      {total != null && total > 0 && <span className="text-[10px] text-gray-400 w-10 text-right">{((value / total) * 100).toFixed(0)}%</span>}
    </div>
  </div>
);
