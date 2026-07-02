import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import HQLayout from '../../../components/hq/HQLayout';
import AdvancedGantt, { GanttTask, GanttDependency } from '../../../components/projectManagement/AdvancedGantt';
import {
  GitBranch, ArrowLeft, RefreshCw, Download, Filter, Layers,
  AlertTriangle, CheckCircle2, Clock, Target, Maximize2, Minimize2,
  Settings, Users, Flag, Loader2, X, ChevronDown, Info, Zap, Eye, EyeOff, Save,
  Calendar as CalIcon, TrendingUp, TrendingDown,
} from 'lucide-react';

type GroupBy = 'project' | 'assignee' | 'none';

interface ProjectOption { id: string; name: string; project_code?: string; status?: string; }
interface EmployeeOption { id: string; name: string; }

export default function GanttPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<GanttTask[]>([]);
  const [dependencies, setDependencies] = useState<GanttDependency[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [criticalPathIds, setCriticalPathIds] = useState<Set<string>>(new Set());

  // Filters
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [groupBy, setGroupBy] = useState<GroupBy>('project');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('week');

  // Display toggles
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidePanel, setSidePanel] = useState<GanttTask | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch gantt data
  const fetchGantt = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ action: 'gantt-full' });
      if (projectFilter) params.set('projectId', projectFilter);
      if (assigneeFilter) params.set('assigneeId', assigneeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const resp = await fetch(`/api/hq/project-management?${params.toString()}`);
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error?.message || 'Gagal memuat data');

      const data = json.data || {};
      setItems((data.items || []) as GanttTask[]);
      setDependencies((data.dependencies || []) as GanttDependency[]);
      setCounts(data.counts || {});
      setCriticalPathIds(new Set(data.criticalPath || []));
      if (showToast) toast.success('Data Gantt diperbarui');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat Gantt');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [projectFilter, assigneeFilter, statusFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      const resp = await fetch('/api/hq/project-management?action=projects&limit=200');
      const json = await resp.json();
      if (json.success) setProjects((json.data || []).map((p: any) => ({ id: p.id, name: p.name, project_code: p.project_code, status: p.status })));
    } catch {}
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const resp = await fetch('/api/hq/project-management?action=employees&limit=200');
      const json = await resp.json();
      if (json.success) setEmployees((json.data || []).map((e: any) => ({ id: e.id, name: e.name })));
    } catch {}
  }, []);

  useEffect(() => { fetchProjects(); fetchEmployees(); }, [fetchProjects, fetchEmployees]);
  useEffect(() => { fetchGantt(); }, [fetchGantt]);

  // Merge critical path flag into items
  const enrichedItems = useMemo(() => items.map((t) => ({
    ...t,
    isCritical: criticalPathIds.has(t.id) || (t as any).isCritical,
  })), [items, criticalPathIds]);

  // Apply client-side filters for display toggles
  const displayItems = useMemo(() => enrichedItems.filter((t) => {
    if (!showMilestones && t.type === 'milestone') return false;
    if (!showProjects && t.type === 'project') return false;
    return true;
  }), [enrichedItems, showMilestones, showProjects]);

  // Stats
  const stats = useMemo(() => {
    const tasks = displayItems.filter((t) => t.type === 'task');
    const completed = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'active').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    const overdue = tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'completed') return false;
      return new Date(t.end) < new Date();
    }).length;
    const critical = tasks.filter((t) => (t as any).isCritical).length;
    const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length) : 0;
    return { total: tasks.length, completed, inProgress, blocked, overdue, critical, avgProgress };
  }, [displayItems]);

  // Handle drag-reschedule
  const handleReschedule = useCallback(async (taskId: string, newStart: Date, newEnd: Date) => {
    const t = items.find((x) => x.id === taskId);
    const entityType = t?.type === 'milestone' ? 'milestone' : t?.type === 'project' ? 'project' : 'task';
    try {
      const resp = await fetch('/api/hq/project-management?action=update-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, entityType, startDate: newStart.toISOString(), endDate: newEnd.toISOString() }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error?.message || 'Gagal update');
      toast.success(`${t?.name || 'Item'} dijadwalkan ulang`);
      // Update local state
      setItems((prev) => prev.map((x) => x.id === taskId ? { ...x, start: newStart.toISOString(), end: newEnd.toISOString() } : x));
    } catch (err: any) {
      toast.error(err.message || 'Gagal reschedule');
      // refetch to restore
      fetchGantt();
    }
  }, [items, fetchGantt]);

  const handleExportCSV = useCallback(() => {
    const headers = ['ID', 'Type', 'Project', 'Name', 'Start', 'End', 'Status', 'Progress', 'Assignee', 'Critical'];
    const rows = displayItems.map((t) => [
      t.id, t.type || 'task', t.projectName || '', t.name,
      new Date(t.start).toLocaleDateString('id-ID'),
      new Date(t.end).toLocaleDateString('id-ID'),
      t.status || '', t.progress || 0, t.assigneeName || '',
      (t as any).isCritical ? 'YA' : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV diekspor');
  }, [displayItems]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, []);

  const clearFilters = () => {
    setProjectFilter(''); setAssigneeFilter(''); setStatusFilter('');
  };

  const ganttHeight = fullscreen ? '85vh' : 'calc(100vh - 360px)';

  const content = (
    <div ref={containerRef} className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/hq/project-management')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Kembali">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Gantt Chart Center
                  {(counts.tasks || 0) > 0 && (
                    <span className="text-xs font-normal text-gray-500">
                      · {counts.projects || 0} proyek · {counts.tasks || 0} task · {counts.milestones || 0} milestone · {counts.dependencies || 0} dependency
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-500">Visualisasi timeline, dependency, critical path, & reschedule interaktif</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchGantt(true)} disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard icon={Target} label="Total Task" value={stats.total} color="blue" />
          <StatCard icon={CheckCircle2} label="Selesai" value={stats.completed} color="emerald"
            subtitle={stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'} />
          <StatCard icon={Clock} label="Berjalan" value={stats.inProgress} color="amber" />
          <StatCard icon={AlertTriangle} label="Terlambat" value={stats.overdue} color="red" highlight={stats.overdue > 0} />
          <StatCard icon={Zap} label="Blocked" value={stats.blocked} color="red" highlight={stats.blocked > 0} />
          <StatCard icon={Flag} label="Critical Path" value={stats.critical} color="purple" />
          <StatCard icon={TrendingUp} label="Avg Progress" value={`${stats.avgProgress}%`} color="indigo" />
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="w-4 h-4 text-indigo-500" /> Filter
          </div>

          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 min-w-[200px] focus:ring-2 focus:ring-indigo-500">
            <option value="">Semua Proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_code ? `[${p.project_code}] ` : ''}{p.name}</option>
            ))}
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 min-w-[180px] focus:ring-2 focus:ring-indigo-500">
            <option value="">Semua Assignee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500">
            <option value="">Semua Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>

          <div className="h-5 w-px bg-gray-200" />

          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500">
            <option value="project">Group: Proyek</option>
            <option value="assignee">Group: Assignee</option>
            <option value="none">Tanpa Group</option>
          </select>

          {(projectFilter || assigneeFilter || statusFilter) && (
            <button onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <ToggleChip active={showCriticalPath} onClick={() => setShowCriticalPath((v) => !v)} label="Critical Path" icon={AlertTriangle} />
            <ToggleChip active={showDependencies} onClick={() => setShowDependencies((v) => !v)} label="Dependency" icon={GitBranch} />
            <ToggleChip active={showBaseline} onClick={() => setShowBaseline((v) => !v)} label="Baseline" icon={Layers} />
            <ToggleChip active={showWeekends} onClick={() => setShowWeekends((v) => !v)} label="Weekend" icon={CalIcon} />
            <ToggleChip active={showMilestones} onClick={() => setShowMilestones((v) => !v)} label="Milestone" icon={Flag} />
            <ToggleChip active={showProjects} onClick={() => setShowProjects((v) => !v)} label="Proyek" icon={Target} />
          </div>
        </div>

        {/* Gantt + Side panel */}
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white border rounded-xl h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="bg-white border rounded-xl h-96 flex flex-col items-center justify-center text-gray-500">
                <GitBranch className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm">Tidak ada data untuk ditampilkan</p>
                <p className="text-xs text-gray-400 mt-1">Coba ubah filter atau buat task/proyek baru</p>
              </div>
            ) : (
              <AdvancedGantt
                tasks={displayItems}
                dependencies={dependencies}
                groupBy={groupBy}
                viewMode={viewMode}
                showCriticalPath={showCriticalPath}
                showBaseline={showBaseline}
                showWeekends={showWeekends}
                showDependencies={showDependencies}
                onTaskClick={setSidePanel}
                onTaskReschedule={handleReschedule}
                height={ganttHeight}
              />
            )}
          </div>

          {sidePanel && (
            <TaskDetailPanel task={sidePanel} onClose={() => setSidePanel(null)} onOpenProject={(pid) => router.push(`/hq/project-management/${pid}`)} />
          )}
        </div>

        {/* Insights */}
        {!loading && displayItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InsightCard title="Perlu Perhatian" icon={AlertTriangle} color="red">
              {stats.overdue === 0 && stats.blocked === 0 ? (
                <p className="text-xs text-gray-500">Tidak ada item bermasalah. Tim berjalan sesuai jadwal.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {stats.overdue > 0 && <li className="text-red-600 font-medium">• {stats.overdue} task terlambat dari jadwal</li>}
                  {stats.blocked > 0 && <li className="text-red-600 font-medium">• {stats.blocked} task dalam status blocked</li>}
                  {stats.critical > 0 && <li className="text-amber-600">• {stats.critical} task berada di critical path</li>}
                </ul>
              )}
            </InsightCard>
            <InsightCard title="Progress Proyek" icon={TrendingUp} color="indigo">
              <div className="space-y-2">
                {projects.slice(0, 4).map((p) => {
                  const projTasks = displayItems.filter((t) => t.projectId === p.id && t.type === 'task');
                  const avg = projTasks.length ? Math.round(projTasks.reduce((s, t) => s + (t.progress || 0), 0) / projTasks.length) : 0;
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="truncate max-w-[70%] text-gray-700">{p.name}</span>
                        <span className="font-semibold text-indigo-600">{avg}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${avg}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </InsightCard>
            <InsightCard title="Tips" icon={Info} color="emerald">
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>• Drag bar untuk <b>reschedule</b> task (akan tersimpan otomatis)</li>
                <li>• Drag ujung bar untuk <b>resize</b> durasi</li>
                <li>• Aktifkan <b>Critical Path</b> untuk melihat task berdampak pada deadline</li>
                <li>• Garis putus-putus = dependency siap, garis solid merah = <b>blocking</b></li>
                <li>• Klik task untuk melihat detail di panel kanan</li>
              </ul>
            </InsightCard>
          </div>
        )}
      </div>
    </div>
  );

  return <HQLayout>{content}</HQLayout>;
}

// ─── Sub-components ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, subtitle, highlight }: any) {
  const colorMap: any = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };
  return (
    <div className={`bg-white border rounded-xl p-3 ${highlight ? 'border-red-300 ring-1 ring-red-100' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">{label}</span>
        <div className={`p-1 rounded bg-gradient-to-br ${colorMap[color]}`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-lg font-bold text-gray-900">{value}</div>
        {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, label, icon: Icon }: any) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
        active
          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
      }`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
    </button>
  );
}

function InsightCard({ title, icon: Icon, color, children }: any) {
  const colorMap: any = {
    red: 'from-red-500 to-rose-500 text-red-600',
    indigo: 'from-indigo-500 to-purple-500 text-indigo-600',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-600',
  };
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colorMap[color]?.split(' ')[0]} ${colorMap[color]?.split(' ')[1]}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TaskDetailPanel({ task, onClose, onOpenProject }: { task: GanttTask; onClose: () => void; onOpenProject: (id: string) => void }) {
  const start = new Date(task.start);
  const end = new Date(task.end);
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const isOverdue = end < new Date() && task.status !== 'done' && task.status !== 'completed';

  return (
    <aside className="w-80 flex-shrink-0 bg-white border rounded-xl p-4 h-fit sticky top-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {task.type === 'milestone' && <Flag className="w-4 h-4 text-amber-500" />}
            {task.type === 'project' && <Target className="w-4 h-4 text-indigo-500" />}
            {(task as any).isCritical && <AlertTriangle className="w-4 h-4 text-red-500" />}
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">{task.type || 'Task'}</span>
          </div>
          <h3 className="text-base font-bold text-gray-900 break-words">{task.name}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
      </div>

      {task.projectName && (
        <button onClick={() => task.projectId && onOpenProject(task.projectId)}
          className="block w-full text-left text-xs text-indigo-600 hover:underline">
          📂 {task.projectCode ? `[${task.projectCode}] ` : ''}{task.projectName}
        </button>
      )}

      <div className="space-y-2 text-xs">
        <Row label="Mulai" value={start.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
        <Row label="Selesai" value={end.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} warn={isOverdue} />
        <Row label="Durasi" value={`${durationDays} hari`} />
        {task.status && <Row label="Status" value={task.status} />}
        {task.priority && <Row label="Prioritas" value={task.priority} />}
        {task.assigneeName && <Row label="Assignee" value={task.assigneeName} />}
        {typeof (task as any).estimatedHours !== 'undefined' && (task as any).estimatedHours !== null && (
          <Row label="Estimasi" value={`${(task as any).estimatedHours || 0}j`} />
        )}
        {typeof (task as any).actualHours !== 'undefined' && (task as any).actualHours !== null && (
          <Row label="Actual" value={`${(task as any).actualHours || 0}j`} />
        )}
      </div>

      {typeof task.progress === 'number' && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-semibold text-gray-800">{task.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {(task as any).isCritical && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700">Task ini berada di <b>Critical Path</b>. Keterlambatan akan berdampak pada deadline proyek.</p>
        </div>
      )}

      {task.projectId && (
        <button onClick={() => onOpenProject(task.projectId!)}
          className="w-full py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
          Buka Detail Proyek →
        </button>
      )}
    </aside>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${warn ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
