import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Flag, Target } from 'lucide-react';

interface GanttItem {
  id: string;
  name: string;
  start: string | Date;
  end: string | Date;
  progress?: number;
  status?: string;
  type?: 'project' | 'task' | 'milestone';
  parentId?: string;
  assigneeName?: string;
  color?: string;
  isCritical?: boolean;
}

interface Props {
  items: GanttItem[];
  onItemClick?: (item: GanttItem) => void;
  title?: string;
  viewMode?: 'day' | 'week' | 'month';
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-400',
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  'in-progress': 'bg-blue-500',
  review: 'bg-amber-500',
  blocked: 'bg-red-500',
  completed: 'bg-emerald-500',
  done: 'bg-emerald-500',
  on_hold: 'bg-yellow-500',
  cancelled: 'bg-gray-400',
};

export default function GanttChart({ items, onItemClick, title = 'Gantt Chart', viewMode: initialMode = 'week' }: Props) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(initialMode);
  const [offset, setOffset] = useState(0);

  const normalized = useMemo(() => items.map((i) => ({
    ...i,
    startDate: new Date(i.start),
    endDate: new Date(i.end),
  })).filter((i) => !isNaN(i.startDate.getTime()) && !isNaN(i.endDate.getTime())), [items]);

  const { minDate, maxDate } = useMemo(() => {
    if (normalized.length === 0) {
      const t = new Date();
      return { minDate: t, maxDate: new Date(t.getTime() + 30 * 86400000) };
    }
    const mins = Math.min(...normalized.map((i) => i.startDate.getTime()));
    const maxs = Math.max(...normalized.map((i) => i.endDate.getTime()));
    return { minDate: new Date(mins), maxDate: new Date(maxs) };
  }, [normalized]);

  const colWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 80 : 120;
  const daysPerCol = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;

  const timeline = useMemo(() => {
    const cols: { label: string; date: Date }[] = [];
    const start = new Date(minDate);
    start.setDate(start.getDate() - daysPerCol);
    const end = new Date(maxDate);
    end.setDate(end.getDate() + daysPerCol * 2);
    const cursor = new Date(start);
    while (cursor <= end) {
      cols.push({
        label: viewMode === 'day'
          ? cursor.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
          : viewMode === 'week'
            ? `W${getWeekNumber(cursor)}`
            : cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        date: new Date(cursor),
      });
      cursor.setDate(cursor.getDate() + daysPerCol);
    }
    return cols;
  }, [minDate, maxDate, viewMode, daysPerCol]);

  const timelineStart = timeline[0]?.date.getTime() || 0;
  const timelineEnd = timeline[timeline.length - 1]?.date.getTime() || 0;
  const totalWidth = timeline.length * colWidth;

  const getBarStyle = (item: typeof normalized[0]) => {
    const startOffset = ((item.startDate.getTime() - timelineStart) / (86400000 * daysPerCol)) * colWidth;
    const duration = Math.max(1, (item.endDate.getTime() - item.startDate.getTime()) / (86400000 * daysPerCol)) * colWidth;
    return { left: `${startOffset}px`, width: `${Math.max(duration, 20)}px` };
  };

  const today = new Date();
  const todayLeft = ((today.getTime() - timelineStart) / (86400000 * daysPerCol)) * colWidth;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{normalized.length} item</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'day' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>Hari</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>Minggu</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>Bulan</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{ maxHeight: '600px' }}>
        <div className="flex-shrink-0 w-72 border-r bg-gray-50/50 overflow-y-auto">
          <div className="h-10 border-b bg-gray-100 px-3 flex items-center text-xs font-semibold text-gray-600 sticky top-0 z-10">Item</div>
          {normalized.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="w-full h-10 border-b px-3 flex items-center gap-2 text-left hover:bg-blue-50 transition-colors"
              style={{ paddingLeft: `${(item.type === 'task' ? 20 : 12)}px` }}
            >
              {item.type === 'milestone' && <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              {item.type === 'project' && <Target className="w-3 h-3 text-blue-500 flex-shrink-0" />}
              <span className="text-xs font-medium text-gray-800 truncate flex-1">{item.name}</span>
              {item.isCritical && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">CP</span>}
            </button>
          ))}
          {normalized.length === 0 && <div className="p-6 text-xs text-gray-400 text-center">Belum ada item untuk ditampilkan</div>}
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="relative" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
            <div className="sticky top-0 z-10 flex h-10 border-b bg-gray-100">
              {timeline.map((col, idx) => (
                <div key={idx} className="flex-shrink-0 border-r text-center text-xs font-semibold text-gray-600 flex items-center justify-center" style={{ width: `${colWidth}px` }}>
                  {col.label}
                </div>
              ))}
            </div>

            <div className="relative">
              {todayLeft >= 0 && todayLeft <= totalWidth && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none" style={{ left: `${todayLeft}px` }}>
                  <span className="absolute -top-0.5 left-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded">NOW</span>
                </div>
              )}

              {normalized.map((item) => {
                const colorClass = item.color || STATUS_COLORS[item.status || ''] || 'bg-blue-500';
                const progress = item.progress || 0;
                return (
                  <div key={item.id} className="h-10 border-b relative hover:bg-gray-50/50" style={{ backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: `${colWidth}px 100%` }}>
                    {item.type === 'milestone' ? (
                      <div
                        onClick={() => onItemClick?.(item)}
                        className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ left: `${((item.startDate.getTime() - timelineStart) / (86400000 * daysPerCol)) * colWidth - 8}px` }}
                        title={`${item.name} — ${item.startDate.toLocaleDateString('id-ID')}`}
                      >
                        <div className="w-4 h-4 rotate-45 bg-amber-500 border-2 border-white shadow" />
                      </div>
                    ) : (
                      <div
                        onClick={() => onItemClick?.(item)}
                        className={`absolute top-1.5 h-7 rounded ${colorClass} cursor-pointer shadow-sm hover:shadow-md transition-shadow group ${item.isCritical ? 'ring-2 ring-red-300' : ''}`}
                        style={getBarStyle(item)}
                        title={`${item.name} (${item.startDate.toLocaleDateString('id-ID')} — ${item.endDate.toLocaleDateString('id-ID')}) · ${progress}%`}
                      >
                        {progress > 0 && (
                          <div className="absolute inset-y-0 left-0 bg-black/25 rounded-l" style={{ width: `${Math.min(100, progress)}%` }} />
                        )}
                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white truncate drop-shadow">
                          {item.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 border-t bg-gray-50 flex flex-wrap items-center gap-3 text-[10px]">
        <LegendDot color="bg-slate-400" label="To Do" />
        <LegendDot color="bg-blue-500" label="In Progress" />
        <LegendDot color="bg-amber-500" label="Review" />
        <LegendDot color="bg-emerald-500" label="Done" />
        <LegendDot color="bg-red-500" label="Blocked" />
        <div className="flex items-center gap-1"><div className="w-3 h-3 rotate-45 bg-amber-500" /><span>Milestone</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 ring-2 ring-red-300 rounded" /><span>Critical Path</span></div>
      </div>
    </div>
  );
}

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${color}`} /><span className="text-gray-600">{label}</span></div>
);

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
