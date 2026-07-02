import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Flag, Target, AlertTriangle, Clock,
  ZoomIn, ZoomOut, Download, Eye, EyeOff, Filter, Info
} from 'lucide-react';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface GanttTask {
  id: string;
  name: string;
  start: string | Date;
  end: string | Date;
  progress?: number;
  status?: string;
  type?: 'project' | 'task' | 'milestone' | 'summary';
  projectId?: string;
  projectName?: string;
  projectCode?: string;
  parentId?: string;
  assigneeName?: string;
  assigneeId?: string;
  priority?: string;
  color?: string;
  isCritical?: boolean;
  baseline?: { start: string | Date; end: string | Date };
}

export interface GanttDependency {
  id?: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}

export type ViewMode = 'day' | 'week' | 'month' | 'quarter';

interface Props {
  tasks: GanttTask[];
  dependencies?: GanttDependency[];
  groupBy?: 'project' | 'assignee' | 'none';
  viewMode?: ViewMode;
  showCriticalPath?: boolean;
  showBaseline?: boolean;
  showWeekends?: boolean;
  showDependencies?: boolean;
  onTaskClick?: (task: GanttTask) => void;
  onTaskReschedule?: (taskId: string, newStart: Date, newEnd: Date) => void;
  readonly?: boolean;
  height?: number | string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  planning: { bg: '#94a3b8', border: '#64748b' },
  todo: { bg: '#94a3b8', border: '#64748b' },
  in_progress: { bg: '#3b82f6', border: '#2563eb' },
  'in-progress': { bg: '#3b82f6', border: '#2563eb' },
  active: { bg: '#3b82f6', border: '#2563eb' },
  review: { bg: '#f59e0b', border: '#d97706' },
  blocked: { bg: '#ef4444', border: '#dc2626' },
  completed: { bg: '#10b981', border: '#059669' },
  done: { bg: '#10b981', border: '#059669' },
  on_hold: { bg: '#eab308', border: '#ca8a04' },
  cancelled: { bg: '#9ca3af', border: '#6b7280' },
};

const LABEL_COL_WIDTH = 320;

export default function AdvancedGantt({
  tasks, dependencies = [], groupBy = 'project',
  viewMode: initialMode = 'week',
  showCriticalPath = true,
  showBaseline = false,
  showWeekends = true,
  showDependencies = true,
  onTaskClick, onTaskReschedule, readonly = false,
  height = 600,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [hoveredDep, setHoveredDep] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    taskId: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);
  const [liveTasks, setLiveTasks] = useState<GanttTask[]>(tasks);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLiveTasks(tasks); }, [tasks]);

  // Normalize dates
  const normalized = useMemo(() => liveTasks
    .map((t) => ({
      ...t,
      startDate: new Date(t.start),
      endDate: new Date(t.end),
      baselineStart: t.baseline ? new Date(t.baseline.start) : null,
      baselineEnd: t.baseline ? new Date(t.baseline.end) : null,
    }))
    .filter((t) => !isNaN(t.startDate.getTime()) && !isNaN(t.endDate.getTime())), [liveTasks]);

  // View config
  const viewConfig = useMemo(() => {
    switch (viewMode) {
      case 'day': return { colWidth: 48, daysPerCol: 1, labelFmt: 'D' };
      case 'week': return { colWidth: 90, daysPerCol: 7, labelFmt: 'W' };
      case 'month': return { colWidth: 120, daysPerCol: 30, labelFmt: 'M' };
      case 'quarter': return { colWidth: 160, daysPerCol: 90, labelFmt: 'Q' };
    }
  }, [viewMode]);

  const { minDate, maxDate } = useMemo(() => {
    if (normalized.length === 0) {
      const today = new Date();
      return { minDate: new Date(today.getTime() - 14 * 86400000), maxDate: new Date(today.getTime() + 60 * 86400000) };
    }
    const min = Math.min(...normalized.map((t) => t.startDate.getTime()));
    const max = Math.max(...normalized.map((t) => t.endDate.getTime()));
    return {
      minDate: new Date(min - 7 * 86400000),
      maxDate: new Date(max + 14 * 86400000),
    };
  }, [normalized]);

  // Build timeline columns
  const timeline = useMemo(() => {
    const cols: { start: Date; label: string; subLabel?: string }[] = [];
    const cursor = new Date(minDate);
    // snap to period start
    if (viewMode === 'week') { cursor.setDate(cursor.getDate() - cursor.getDay()); }
    else if (viewMode === 'month') { cursor.setDate(1); }
    else if (viewMode === 'quarter') { cursor.setDate(1); cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3); }
    while (cursor <= maxDate) {
      let label = ''; let subLabel = '';
      switch (viewMode) {
        case 'day':
          label = String(cursor.getDate());
          subLabel = cursor.toLocaleDateString('id-ID', { weekday: 'short' });
          break;
        case 'week':
          label = `W${getWeekNumber(cursor)}`;
          subLabel = cursor.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
          break;
        case 'month':
          label = cursor.toLocaleDateString('id-ID', { month: 'short' });
          subLabel = String(cursor.getFullYear());
          break;
        case 'quarter':
          label = `Q${Math.floor(cursor.getMonth() / 3) + 1}`;
          subLabel = String(cursor.getFullYear());
          break;
      }
      cols.push({ start: new Date(cursor), label, subLabel });
      cursor.setDate(cursor.getDate() + viewConfig.daysPerCol);
    }
    return cols;
  }, [minDate, maxDate, viewMode, viewConfig.daysPerCol]);

  const timelineStart = timeline[0]?.start.getTime() || minDate.getTime();
  const msPerPixel = (86400000 * viewConfig.daysPerCol) / viewConfig.colWidth;
  const totalWidth = timeline.length * viewConfig.colWidth;

  const dateToPx = useCallback((d: Date) => Math.max(0, (d.getTime() - timelineStart) / msPerPixel), [timelineStart, msPerPixel]);
  const pxToDate = useCallback((px: number) => new Date(timelineStart + px * msPerPixel), [timelineStart, msPerPixel]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'Semua', tasks: normalized }];
    const map = new Map<string, { key: string; label: string; tasks: typeof normalized }>();
    for (const t of normalized) {
      const key = groupBy === 'project' ? (t.projectId || 'no-project') : (t.assigneeId || t.assigneeName || 'unassigned');
      const label = groupBy === 'project'
        ? (t.projectName ? `${t.projectCode ? `[${t.projectCode}] ` : ''}${t.projectName}` : 'Tidak ada proyek')
        : (t.assigneeName || 'Belum di-assign');
      if (!map.has(key)) map.set(key, { key, label, tasks: [] });
      map.get(key)!.tasks.push(t);
    }
    // sort tasks within group by start date
    for (const g of map.values()) g.tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [normalized, groupBy]);

  // Flat render list (accounting for collapsed groups)
  const flatList = useMemo(() => {
    const arr: Array<{ kind: 'group' | 'task'; data: any; groupKey?: string; y: number }> = [];
    let y = 0;
    const rowH = 36;
    for (const g of groups) {
      if (groupBy !== 'none') {
        arr.push({ kind: 'group', data: g, y });
        y += rowH;
      }
      if (!collapsed.has(g.key)) {
        for (const t of g.tasks) {
          arr.push({ kind: 'task', data: t, groupKey: g.key, y });
          y += rowH;
        }
      }
    }
    return { list: arr, totalHeight: y, rowH };
  }, [groups, collapsed, groupBy]);

  const taskPositions = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of flatList.list) {
      if (row.kind === 'task') m.set(row.data.id, row.y);
    }
    return m;
  }, [flatList]);

  // Drag handlers
  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dayDelta = Math.round((dx * msPerPixel) / 86400000);
      if (dayDelta === 0) return;
      setLiveTasks((prev) => prev.map((t) => {
        if (t.id !== drag.taskId) return t;
        const ns = new Date(drag.origStart);
        const ne = new Date(drag.origEnd);
        if (drag.mode === 'move') { ns.setDate(ns.getDate() + dayDelta); ne.setDate(ne.getDate() + dayDelta); }
        else if (drag.mode === 'resize-start') { ns.setDate(ns.getDate() + dayDelta); if (ns > ne) ns.setTime(ne.getTime()); }
        else { ne.setDate(ne.getDate() + dayDelta); if (ne < ns) ne.setTime(ns.getTime()); }
        return { ...t, start: ns.toISOString(), end: ne.toISOString() };
      }));
    };
    const handleUp = () => {
      const task = liveTasks.find((t) => t.id === drag.taskId);
      if (task && onTaskReschedule) {
        onTaskReschedule(drag.taskId, new Date(task.start), new Date(task.end));
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [drag, msPerPixel, liveTasks, onTaskReschedule]);

  const startDrag = (e: React.MouseEvent, task: typeof normalized[0], mode: 'move' | 'resize-start' | 'resize-end') => {
    if (readonly || task.type === 'milestone' || task.type === 'project') return;
    e.stopPropagation(); e.preventDefault();
    setDrag({ taskId: task.id, mode, startX: e.clientX, origStart: task.startDate, origEnd: task.endDate });
  };

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  // Today line
  const today = new Date();
  const todayX = dateToPx(today);

  // Dependency paths
  const depPaths = useMemo(() => {
    if (!showDependencies) return [];
    const taskMap = new Map(normalized.map((t) => [t.id, t]));
    return dependencies.map((dep, idx) => {
      const pred = taskMap.get(dep.predecessor_task_id);
      const succ = taskMap.get(dep.successor_task_id);
      if (!pred || !succ) return null;
      const py = taskPositions.get(pred.id);
      const sy = taskPositions.get(succ.id);
      if (py === undefined || sy === undefined) return null;
      const type = (dep.dependency_type || 'FS').toUpperCase() as DependencyType;
      const predX = type === 'SS' || type === 'SF' ? dateToPx(pred.startDate) : dateToPx(pred.endDate);
      const succX = type === 'FF' || type === 'SF' ? dateToPx(succ.endDate) : dateToPx(succ.startDate);
      const predY = py + flatList.rowH / 2;
      const succY = sy + flatList.rowH / 2;
      // Right-angle arrow
      const midX = type === 'FS' ? Math.max(predX + 12, succX - 12) : Math.max(predX + 12, succX);
      const d = `M ${predX} ${predY} L ${midX} ${predY} L ${midX} ${succY} L ${succX} ${succY}`;
      const isBlocking = pred.status !== 'done' && pred.status !== 'completed' && succ.status !== 'done';
      return { id: dep.id || `dep-${idx}`, d, type, isBlocking, predName: pred.name, succName: succ.name, lag: dep.lag_days };
    }).filter(Boolean) as any[];
  }, [dependencies, normalized, taskPositions, dateToPx, showDependencies, flatList.rowH]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 border-b bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-gray-700">Gantt</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{normalized.length} item</span>
          {depPaths.length > 0 && <><span className="text-gray-400">·</span><span className="text-gray-500">{depPaths.length} dependency</span></>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden text-xs">
            {(['day', 'week', 'month', 'quarter'] as ViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 font-medium ${viewMode === m ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>
                {m === 'day' ? 'Hari' : m === 'week' ? 'Minggu' : m === 'month' ? 'Bulan' : 'Q'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Label column */}
        <div className="flex-shrink-0 border-r bg-gray-50/50 overflow-y-auto" style={{ width: `${LABEL_COL_WIDTH}px` }}>
          <div className="h-12 border-b bg-gray-100 px-3 flex items-center text-xs font-semibold text-gray-600 sticky top-0 z-10">
            {groupBy === 'project' ? 'Proyek / Tugas' : groupBy === 'assignee' ? 'Assignee / Tugas' : 'Item'}
          </div>
          {flatList.list.map((row, idx) => {
            if (row.kind === 'group') {
              const isCollapsed = collapsed.has(row.data.key);
              const doneCount = row.data.tasks.filter((t: any) => t.status === 'done' || t.status === 'completed').length;
              return (
                <button key={`g-${row.data.key}`} onClick={() => toggleGroup(row.data.key)}
                  className="w-full h-9 border-b px-3 flex items-center gap-2 text-left bg-gray-100 hover:bg-gray-200 transition-colors font-semibold">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                  <span className="text-xs text-gray-800 truncate flex-1">{row.data.label}</span>
                  <span className="text-[10px] text-gray-500 font-normal">{doneCount}/{row.data.tasks.length}</span>
                </button>
              );
            }
            const t = row.data;
            return (
              <button key={t.id} onClick={() => onTaskClick?.(t)}
                onMouseEnter={() => setHoveredTask(t.id)} onMouseLeave={() => setHoveredTask(null)}
                className={`w-full h-9 border-b px-3 flex items-center gap-2 text-left hover:bg-blue-50 transition-colors ${hoveredTask === t.id ? 'bg-blue-50' : ''}`}
                style={{ paddingLeft: groupBy !== 'none' ? 28 : 12 }}>
                {t.type === 'milestone' && <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                {t.type === 'project' && <Target className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                {t.isCritical && showCriticalPath && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                <span className="text-xs text-gray-800 truncate flex-1">{t.name}</span>
                {t.assigneeName && <span className="text-[9px] text-gray-400 hidden lg:inline truncate max-w-[80px]">{t.assigneeName}</span>}
              </button>
            );
          })}
        </div>

        {/* Timeline area */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative">
          <div style={{ width: `${totalWidth}px`, position: 'relative' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 h-12 flex border-b bg-gray-100">
              {timeline.map((col, i) => {
                const isWeekend = viewMode === 'day' && (col.start.getDay() === 0 || col.start.getDay() === 6);
                return (
                  <div key={i} className={`flex-shrink-0 border-r flex flex-col items-center justify-center text-[10px] ${isWeekend ? 'bg-slate-200 text-slate-600' : 'text-gray-600'}`}
                    style={{ width: `${viewConfig.colWidth}px` }}>
                    <span className="font-semibold">{col.label}</span>
                    {col.subLabel && <span className="text-[9px] opacity-70">{col.subLabel}</span>}
                  </div>
                );
              })}
            </div>

            {/* Background (weekend shading + grid lines) */}
            <div className="relative" style={{ height: `${flatList.totalHeight}px` }}>
              {showWeekends && viewMode === 'day' && timeline.map((col, i) => {
                if (col.start.getDay() !== 0 && col.start.getDay() !== 6) return null;
                return <div key={`wk-${i}`} className="absolute top-0 bottom-0 bg-slate-50 pointer-events-none"
                  style={{ left: i * viewConfig.colWidth, width: viewConfig.colWidth }} />;
              })}

              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `linear-gradient(to right, rgba(203,213,225,0.35) 1px, transparent 1px)`,
                backgroundSize: `${viewConfig.colWidth}px 100%`,
              }} />

              {/* Row separators */}
              {flatList.list.map((row) => (
                <div key={`sep-${row.y}`} className={`absolute left-0 right-0 border-b ${row.kind === 'group' ? 'bg-gray-50' : ''}`}
                  style={{ top: row.y, height: row.kind === 'group' ? 36 : 36 }} />
              ))}

              {/* Today line */}
              {todayX >= 0 && todayX <= totalWidth && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/70 z-10 pointer-events-none"
                  style={{ left: todayX }}>
                  <span className="absolute -top-[14px] left-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded font-bold shadow">TODAY</span>
                </div>
              )}

              {/* Dependency SVG */}
              {showDependencies && (
                <svg className="absolute inset-0 pointer-events-none" style={{ width: totalWidth, height: flatList.totalHeight }}>
                  <defs>
                    <marker id="arrow-blocking" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                    </marker>
                    <marker id="arrow-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                    </marker>
                  </defs>
                  {depPaths.map((dp) => (
                    <g key={dp.id} className="pointer-events-auto">
                      <path d={dp.d} fill="none" stroke={dp.isBlocking ? '#ef4444' : '#6366f1'}
                        strokeWidth={hoveredDep === dp.id ? 2.5 : 1.5}
                        strokeDasharray={dp.isBlocking ? '0' : '4 2'}
                        markerEnd={`url(#${dp.isBlocking ? 'arrow-blocking' : 'arrow-ok'})`}
                        opacity={0.85}
                        onMouseEnter={() => setHoveredDep(dp.id)}
                        onMouseLeave={() => setHoveredDep(null)}>
                        <title>{dp.type}: {dp.predName} → {dp.succName}{dp.lag ? ` (lag ${dp.lag}d)` : ''}</title>
                      </path>
                    </g>
                  ))}
                </svg>
              )}

              {/* Task bars */}
              {flatList.list.map((row) => {
                if (row.kind !== 'task') return null;
                const t = row.data;
                const x = dateToPx(t.startDate);
                const w = Math.max(4, dateToPx(t.endDate) - x);
                const cfg = STATUS_COLORS[t.status || ''] || STATUS_COLORS.in_progress;
                const progress = Math.min(100, Math.max(0, t.progress || 0));
                const isCritical = showCriticalPath && t.isCritical;

                // Milestone: diamond
                if (t.type === 'milestone') {
                  return (
                    <div key={t.id}
                      onClick={() => onTaskClick?.(t)}
                      onMouseEnter={() => setHoveredTask(t.id)} onMouseLeave={() => setHoveredTask(null)}
                      className="absolute cursor-pointer z-10"
                      style={{ left: x - 8, top: row.y + 10 }}
                      title={`${t.name}\n${t.startDate.toLocaleDateString('id-ID')}`}>
                      <div className="w-4 h-4 rotate-45 bg-amber-500 border-2 border-white shadow" />
                    </div>
                  );
                }

                // Project/summary: bracket style
                if (t.type === 'project' || t.type === 'summary') {
                  return (
                    <div key={t.id}
                      onClick={() => onTaskClick?.(t)}
                      className="absolute cursor-pointer z-10"
                      style={{ left: x, top: row.y + 12, width: w, height: 12 }}>
                      <div className="relative w-full h-full">
                        <div className="absolute inset-x-0 top-1/2 h-1 bg-gray-700 rounded" />
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-700 rounded-l" />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gray-700 rounded-r" />
                      </div>
                    </div>
                  );
                }

                // Baseline bar (rendered underneath)
                return (
                  <React.Fragment key={t.id}>
                    {showBaseline && t.baselineStart && t.baselineEnd && (
                      <div className="absolute rounded opacity-40 pointer-events-none border border-dashed border-gray-400"
                        style={{
                          left: dateToPx(t.baselineStart),
                          top: row.y + 22,
                          width: Math.max(4, dateToPx(t.baselineEnd) - dateToPx(t.baselineStart)),
                          height: 6, backgroundColor: '#cbd5e1',
                        }} />
                    )}
                    <div
                      onClick={() => onTaskClick?.(t)}
                      onMouseEnter={() => setHoveredTask(t.id)} onMouseLeave={() => setHoveredTask(null)}
                      onMouseDown={(e) => startDrag(e, t, 'move')}
                      className={`absolute rounded cursor-${readonly ? 'pointer' : 'move'} z-10 shadow-sm group`}
                      style={{
                        left: x, top: row.y + 6, width: w, height: 24,
                        backgroundColor: cfg.bg,
                        border: `1.5px solid ${isCritical ? '#dc2626' : cfg.border}`,
                        boxShadow: hoveredTask === t.id ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
                      }}
                      title={`${t.name}\n${t.startDate.toLocaleDateString('id-ID')} → ${t.endDate.toLocaleDateString('id-ID')}\nProgress: ${progress}%${t.assigneeName ? '\nAssignee: ' + t.assigneeName : ''}`}>
                      {/* Progress fill */}
                      {progress > 0 && (
                        <div className="absolute inset-y-0 left-0 bg-black/25 rounded-l pointer-events-none"
                          style={{ width: `${progress}%` }} />
                      )}
                      {/* Label */}
                      {w > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white truncate pointer-events-none drop-shadow">
                          {t.name}{progress > 0 && <span className="ml-auto opacity-90">{progress}%</span>}
                        </span>
                      )}
                      {/* Resize handles */}
                      {!readonly && w > 20 && (
                        <>
                          <div onMouseDown={(e) => startDrag(e, t, 'resize-start')}
                            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40" />
                          <div onMouseDown={(e) => startDrag(e, t, 'resize-end')}
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/40" />
                        </>
                      )}
                      {isCritical && (
                        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white" />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t bg-gray-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] flex-shrink-0">
        <LegendDot color="bg-slate-400" label="To Do" />
        <LegendDot color="bg-blue-500" label="In Progress" />
        <LegendDot color="bg-amber-500" label="Review" />
        <LegendDot color="bg-emerald-500" label="Done" />
        <LegendDot color="bg-red-500" label="Blocked" />
        <div className="flex items-center gap-1"><div className="w-3 h-3 rotate-45 bg-amber-500" /><span>Milestone</span></div>
        {showCriticalPath && <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 ring-2 ring-red-400 rounded" /><span>Critical Path</span></div>}
        {showDependencies && (
          <>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1 text-indigo-600">
              <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
              Dependency OK
            </span>
            <span className="inline-flex items-center gap-1 text-red-600">
              <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="#ef4444" strokeWidth="2" /></svg>
              Blocking
            </span>
          </>
        )}
        {!readonly && <span className="ml-auto text-gray-500 italic">💡 Drag bar untuk reschedule · drag ujung untuk resize</span>}
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
