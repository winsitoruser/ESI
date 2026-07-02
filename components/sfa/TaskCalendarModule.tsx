/**
 * Professional Task & Calendar Module
 * Features: Kanban Board (drag-drop), Gantt Chart, Calendar View with Google Calendar holidays
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LayoutGrid, CalendarDays, BarChart3, List, Plus, Filter, Search, ChevronLeft, ChevronRight,
  Clock, AlertTriangle, CheckCircle, Loader2, GripVertical, MoreHorizontal, Eye, Trash2,
  X, CalendarCheck, ArrowRight, Timer, Star, Flag, Phone, Mail, Users, FileText,
  Zap, RefreshCw, Download, ChevronDown, Circle, Navigation, MapPin, Building2, Sparkles,
} from 'lucide-react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  assigned_to?: number;
  assigned_name?: string;
  customer_name?: string;
  customer_id?: string;
  purpose?: string;
  outlet_name?: string;
  outlet_code?: string;
  checklist?: { text: string; done: boolean }[];
  tags?: string[];
  isOverdue?: boolean;
  progress?: number;
  sfa_visit_id?: string | null;
  visit_row_status?: string | null;
  linked_visit_date?: string | null;
  visit_customer_name?: string | null;
}

interface CalEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  event_type: string;
  color?: string;
  location?: string;
  isTask?: boolean;
  isHoliday?: boolean;
  isOverdue?: boolean;
  priority?: string;
  status?: string;
}

interface Holiday {
  title: string;
  date: string;
  color: string;
  isHoliday: boolean;
}

type ViewMode = 'kanban' | 'gantt' | 'calendar' | 'list';

const api = async (action: string, method = 'GET', body?: any, query = '') => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/task-calendar?action=${action}${query}`, o)).json();
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#6b7280'
};
const PRIORITY_BG: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600'
};
const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', deferred: '#6b7280', cancelled: '#94a3b8'
};
const TYPE_ICONS: Record<string, any> = {
  call: Phone, email: Mail, meeting: Users, follow_up: ArrowRight,
  review: Eye, approval: CheckCircle, document: FileText, custom: Star,
  visit: Navigation, field_visit: MapPin,
};

const fmtDate = (d: string | undefined) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtTime = (d: string | undefined) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
type TaskCalendarProps = {
  showToast: (msg: string) => void;
  /** Tab khusus SFA: task lapangan ter-link kunjungan (rencana vs realisasi) */
  fieldForceBridge?: boolean;
};

export default function TaskCalendarModule({ showToast, fieldForceBridge }: TaskCalendarProps) {
  const [view, setView] = useState<ViewMode>('kanban');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [boardData, setBoardData] = useState<any>(null);
  const [ganttTasks, setGanttTasks] = useState<Task[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [calTaskEvents, setCalTaskEvents] = useState<CalEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({ priority: 'all', type: 'all', assigned: 'all' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [ganttRange, setGanttRange] = useState<'week' | 'month' | '3months'>('month');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [taskForm, setTaskForm] = useState<any>({});
  const [eventForm, setEventForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [custQ, setCustQ] = useState('');
  const [custResults, setCustResults] = useState<any[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [visitSug, setVisitSug] = useState<any[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const visitPeriod = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // ── Data Loading (all parallel, non-blocking) ──
  const usersLoaded = useRef(false);
  const statsLoaded = useRef(false);
  const viewRef = useRef(view);
  const filtersRef = useRef(filters);
  const ganttRangeRef = useRef(ganttRange);
  const calDateRef = useRef(calDate);
  viewRef.current = view;
  filtersRef.current = filters;
  ganttRangeRef.current = ganttRange;
  calDateRef.current = calDate;

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const v = viewRef.current;
    const f = filtersRef.current;
    const promises: Promise<any>[] = [];
    const ff = fieldForceBridge ? '&visit_link=only' : '';

    // Stats & users: fire-and-forget, don't block
    if (!statsLoaded.current || forceRefresh) {
      api('stats').then(r => { if (r.success) { setStats(r.data); statsLoaded.current = true; } });
    }
    if (!usersLoaded.current) {
      api('users').then(r => { if (r.success) { setUsers(r.data || []); usersLoaded.current = true; } });
    }

    // Only load data for the active view
    if (v === 'kanban' || v === 'list') {
      const q = `&priority=${f.priority}&type=${f.type}&assigned=${f.assigned}${ff}`;
      promises.push(api('board', 'GET', undefined, q).then(r => { if (r.success) setBoardData(r.data); }));
    } else if (v === 'gantt') {
      promises.push(api('gantt', 'GET', undefined, `&range=${ganttRangeRef.current}${ff}`).then(r => { if (r.success) setGanttTasks(r.data || []); }));
    } else if (v === 'calendar') {
      const y = calDateRef.current.getFullYear(); const m = calDateRef.current.getMonth() + 1;
      promises.push(api('calendar', 'GET', undefined, `&year=${y}&month=${m}${ff}`).then(r => {
        if (r.success) { setCalEvents(r.data.events || []); setCalTaskEvents(r.data.taskEvents || []); }
      }));
      // Holidays: non-blocking background, never blocks UI
      api('holidays', 'GET', undefined, `&year=${y}`).then(r => { if (r.success) setHolidays(r.data || []); });
    }

    if (promises.length > 0) await Promise.all(promises);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldForceBridge]);

  useEffect(() => {
    if (fieldForceBridge) setFilters(f => ({ ...f, type: 'field_visit' }));
  }, [fieldForceBridge]);

  // Trigger load on view/filter/range/date change
  useEffect(() => { loadData(); }, [view, filters, ganttRange, calDate, loadData]);

  const loadAll = useCallback(() => loadData(true), [loadData]);

  // CRM customer search (picker)
  const custTimer = useRef<any>(null);
  useEffect(() => {
    if (!showCreateTask) return;
    if (custTimer.current) clearTimeout(custTimer.current);
    if (!custQ.trim() || custQ.trim().length < 2) {
      setCustResults([]);
      return;
    }
    custTimer.current = setTimeout(async () => {
      setCustLoading(true);
      const r = await api('customer-picker', 'GET', undefined, `&q=${encodeURIComponent(custQ.trim())}&limit=40`);
      if (r.success) setCustResults(r.data || []);
      setCustLoading(false);
    }, 300);
    return () => { if (custTimer.current) clearTimeout(custTimer.current); };
  }, [custQ, showCreateTask]);

  // Saran kunjungan dari data penjualan (top outlet)
  useEffect(() => {
    if (!showCreateTask) return;
    let cancelled = false;
    (async () => {
      setSugLoading(true);
      const r = await api('visit-suggestions', 'GET', undefined, `&period=${visitPeriod}`);
      if (!cancelled && r.success) setVisitSug(r.data?.suggestions || []);
      setSugLoading(false);
    })();
    return () => { cancelled = true; };
  }, [showCreateTask, visitPeriod]);

  const applyCustomer = (c: any) => {
    const label = c.display_name || c.company_name || '';
    setTaskForm((p: any) => ({
      ...p,
      customer_id: c.id,
      _cust_label: label,
      outlet_name: p.outlet_name || c.display_name || c.company_name || '',
      title: p.title || `Kunjungan: ${label || 'Outlet'}`,
    }));
    setCustQ('');
    setCustResults([]);
  };

  const applySuggestion = (s: any) => {
    setTaskForm((p: any) => ({
      ...p,
      task_type: p.task_type || 'visit',
      outlet_name: s.outlet_name || '',
      outlet_code: s.outlet_code || '',
      purpose: s.suggested_purpose || p.purpose,
      customer_id: s.customer_id || p.customer_id,
      title: p.title || `Visit: ${s.outlet_name || 'Outlet'}`,
    }));
  };

  // ── Kanban Drag & Drop ──
  const dragItem = useRef<{ taskId: string; fromCol: string } | null>(null);

  const handleDragStart = (taskId: string, fromCol: string) => {
    dragItem.current = { taskId, fromCol };
  };

  const handleDrop = async (toCol: string) => {
    if (!dragItem.current || dragItem.current.fromCol === toCol) return;
    const { taskId, fromCol } = dragItem.current;
    dragItem.current = null;

    // Optimistic update — move task from source column to target column
    if (boardData) {
      let movedTask: any = null;
      const newCols = boardData.columns.map((c: any) => {
        if (c.id === fromCol) {
          const found = c.tasks.find((t: any) => t.id === taskId);
          if (found) movedTask = { ...found, status: toCol };
          return { ...c, tasks: c.tasks.filter((t: any) => t.id !== taskId) };
        }
        if (c.id === toCol && movedTask) {
          return { ...c, tasks: [...c.tasks, movedTask] };
        }
        return c;
      });
      // Handle case where movedTask wasn't found in first pass
      if (movedTask) {
        const finalCols = newCols.map((c: any) => {
          if (c.id === toCol && !c.tasks.find((t: any) => t.id === taskId)) {
            return { ...c, tasks: [...c.tasks, movedTask] };
          }
          return c;
        });
        setBoardData({ ...boardData, columns: finalCols });
      }
    }

    const r = await api('move', 'POST', { taskId, newStatus: toCol });
    if (r.success) {
      showToast(`Task → ${toCol.replace('_', ' ')}`);
      loadData(true);
    } else {
      showToast(r.error || 'Gagal memindahkan task');
      loadData(true); // reload to revert optimistic update on failure
    }
  };

  // ── Task CRUD ──
  const createTask = async () => {
    if (!taskForm.title?.trim()) { showToast('Judul task wajib diisi'); return; }
    setSaving(true);
    const { _cust_label, ...payload } = taskForm;
    const r = await api('create-task', 'POST', payload);
    if (r.success) {
      showToast('Task berhasil dibuat');
      setShowCreateTask(false);
      setTaskForm({});
      loadAll();
    } else showToast(r.error || 'Gagal');
    setSaving(false);
  };

  const createEvent = async () => {
    if (!eventForm.title?.trim()) { showToast('Judul event wajib diisi'); return; }
    setSaving(true);
    const r = await api('create-event', 'POST', eventForm);
    if (r.success) {
      showToast('Event berhasil dibuat');
      setShowCreateEvent(false);
      setEventForm({});
      loadAll();
    } else showToast(r.error || 'Gagal');
    setSaving(false);
  };

  const quickUpdateTask = async (id: string, fields: any) => {
    const r = await api('quick-update', 'POST', { id, ...fields });
    if (r.success) { loadAll(); } else showToast(r.error || 'Gagal update');
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Hapus task ini?')) return;
    const r = await api('delete', 'DELETE', undefined, `&id=${id}&type=task`);
    if (r.success) { showToast('Task dihapus'); loadAll(); }
  };

  // Filter tasks by search
  const filterBySearch = (tasks: Task[]) => {
    if (!search.trim()) return tasks;
    const s = search.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(s) || t.task_number?.toLowerCase().includes(s) || t.assigned_name?.toLowerCase().includes(s));
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ── Header Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks', value: stats.total, color: 'bg-blue-50 text-blue-700', icon: LayoutGrid },
            { label: 'Active', value: stats.active, color: 'bg-amber-50 text-amber-700', icon: Clock },
            { label: 'Overdue', value: stats.overdue, color: 'bg-red-50 text-red-700', icon: AlertTriangle },
            { label: 'Completion', value: `${stats.completionRate}%`, color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4 opacity-60" />
                <span className="text-[11px] font-medium opacity-70">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {fieldForceBridge && (
        <div className="p-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 text-xs text-violet-900 leading-relaxed">
          <span className="font-bold">Rencana vs realisasi lapangan</span>
          {' '}— Task terhubung ke jadwal kunjungan SFA. Check-in / check-out dari aplikasi karyawan memperbarui status task ini secara otomatis.
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-3">
        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: 'kanban' as ViewMode, label: 'Kanban', icon: LayoutGrid },
            { id: 'gantt' as ViewMode, label: 'Gantt', icon: BarChart3 },
            { id: 'calendar' as ViewMode, label: 'Calendar', icon: CalendarDays },
            { id: 'list' as ViewMode, label: 'List', icon: List },
          ]).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari task..."
              className="w-full sm:w-48 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl border transition-colors ${showFilters ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <Filter className="w-4 h-4" />
          </button>
          <button onClick={() => loadAll()} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 bg-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => {
            setShowCreateTask(true);
            setTaskForm({ priority: 'medium', status: 'open', task_type: fieldForceBridge ? 'field_visit' : 'follow_up', purpose: '' });
            setCustQ(''); setCustResults([]);
          }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all">
            <Plus className="w-3.5 h-3.5" /> Task / Visit
          </button>
          {view === 'calendar' && (
            <button onClick={() => { setShowCreateEvent(true); setEventForm({ event_type: 'meeting', color: '#3b82f6' }); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all">
              <Plus className="w-3.5 h-3.5" /> Event
            </button>
          )}
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <label className="text-xs font-medium text-gray-500">Prioritas:</label>
          <select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-amber-300">
            <option value="all">Semua</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="text-xs font-medium text-gray-500">Tipe:</label>
          <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-amber-300">
            <option value="all">Semua</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="follow_up">Follow Up</option>
            <option value="visit">Visit / Kunjungan</option>
            <option value="field_visit">Field Visit (lapangan)</option>
            <option value="review">Review</option>
            <option value="document">Document</option>
          </select>
          <label className="text-xs font-medium text-gray-500">Assignee:</label>
          <select value={filters.assigned} onChange={e => setFilters(p => ({ ...p, assigned: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-amber-300">
            <option value="all">Semua</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="ml-3 text-sm text-gray-400">Memuat data...</span>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* KANBAN VIEW */}
      {/* ════════════════════════════════════════ */}
      {!loading && view === 'kanban' && boardData && (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
          {boardData.columns.map((col: any) => (
            <div key={col.id}
              className="flex-shrink-0 w-72 bg-gray-50/80 rounded-2xl border border-gray-100"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-amber-300'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('ring-2', 'ring-amber-300'); }}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-amber-300'); handleDrop(col.id); }}>

              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-bold text-gray-800">{col.title}</span>
                  <span className="text-[10px] font-bold bg-white text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                    {filterBySearch(col.tasks).length}
                  </span>
                </div>
              </div>

              {/* Task Cards */}
              <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
                {filterBySearch(col.tasks).map((task: Task) => (
                  <KanbanCard key={task.id} task={task} onDragStart={() => handleDragStart(task.id, col.id)}
                    onQuickUpdate={quickUpdateTask} onDelete={deleteTask} onSelect={setSelectedTask} />
                ))}
                {filterBySearch(col.tasks).length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-300">Tidak ada task</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* GANTT CHART VIEW */}
      {/* ════════════════════════════════════════ */}
      {!loading && view === 'gantt' && (
        <GanttChart tasks={filterBySearch(ganttTasks)} range={ganttRange} onRangeChange={setGanttRange}
          onTaskClick={setSelectedTask} />
      )}

      {/* ════════════════════════════════════════ */}
      {/* CALENDAR VIEW */}
      {/* ════════════════════════════════════════ */}
      {!loading && view === 'calendar' && (
        <CalendarView date={calDate} onDateChange={setCalDate} events={calEvents}
          taskEvents={calTaskEvents} holidays={holidays} />
      )}

      {/* ════════════════════════════════════════ */}
      {/* LIST VIEW */}
      {/* ════════════════════════════════════════ */}
      {!loading && view === 'list' && boardData && (
        <TaskListView columns={boardData.columns} search={search}
          onQuickUpdate={quickUpdateTask} onDelete={deleteTask} onSelect={setSelectedTask} />
      )}

      {/* ════════════════════════════════════════ */}
      {/* CREATE TASK MODAL */}
      {/* ════════════════════════════════════════ */}
      {showCreateTask && (
        <Modal title="Rencana Call / Visit" onClose={() => setShowCreateTask(false)} wide>
          <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Hubungkan dengan <strong>Pelanggan (CRM)</strong> untuk outlet/kunjungan. Saran di bawah diambil dari <strong>produktivitas penjualan</strong> (top outlet periode).
            </p>

            {/* Saran dari penjualan */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">Saran rencana kunjungan ({visitPeriod})</span>
                {sugLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {visitSug.length === 0 && !sugLoading && (
                  <p className="text-[11px] text-gray-500">Belum ada data penjualan / outlet untuk periode ini.</p>
                )}
                {visitSug.map((s: any, i: number) => (
                  <button key={i} type="button" onClick={() => applySuggestion(s)}
                    className="w-full text-left flex items-start justify-between gap-2 px-2 py-1.5 rounded-lg bg-white border border-indigo-100 hover:border-amber-300 text-[11px]">
                    <span>
                      <span className="font-semibold text-gray-900">{s.outlet_name || 'Outlet'}</span>
                      {s.outlet_code && <span className="text-gray-400 ml-1 font-mono">{s.outlet_code}</span>}
                      {s.customer_name && <span className="block text-emerald-700">CRM: {s.customer_name}</span>}
                    </span>
                    <span className="shrink-0 text-amber-700 font-semibold">{s.revenue ? `${Math.round(s.revenue).toLocaleString('id-ID')}` : '—'}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input label="Judul task *" value={taskForm.title || ''} onChange={v => setTaskForm((p: any) => ({ ...p, title: v }))} />
            <Textarea label="Deskripsi" value={taskForm.description || ''} onChange={v => setTaskForm((p: any) => ({ ...p, description: v }))} />
            <Textarea label="Tujuan / purpose" value={taskForm.purpose || ''} onChange={v => setTaskForm((p: any) => ({ ...p, purpose: v }))}
              placeholder="Contoh: Cek stok, follow-up PO, survey display, negosiasi promo…" />

            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipe aktivitas" value={taskForm.task_type || 'follow_up'} onChange={v => setTaskForm((p: any) => ({ ...p, task_type: v }))}
                options={[
                  { v: 'call', l: 'Call (telepon)' },
                  { v: 'visit', l: 'Visit / Kunjungan toko' },
                  { v: 'field_visit', l: 'Field visit (rute)' },
                  { v: 'email', l: 'Email' },
                  { v: 'meeting', l: 'Meeting' },
                  { v: 'follow_up', l: 'Follow Up' },
                  { v: 'review', l: 'Review' },
                  { v: 'approval', l: 'Approval' },
                  { v: 'document', l: 'Document' },
                  { v: 'custom', l: 'Custom' },
                ]} />
              <Select label="Prioritas" value={taskForm.priority || 'medium'} onChange={v => setTaskForm((p: any) => ({ ...p, priority: v }))}
                options={[{ v: 'urgent', l: 'Urgent' }, { v: 'high', l: 'High' }, { v: 'medium', l: 'Medium' }, { v: 'low', l: 'Low' }]} />
            </div>

            {(taskForm.task_type === 'visit' || taskForm.task_type === 'field_visit' || taskForm.task_type === 'call') && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Building2 className="w-4 h-4" /> Pelanggan & outlet (CRM)
                </div>
                <div className="relative">
                  <Input label="Cari pelanggan (min. 2 huruf)" value={custQ} onChange={v => setCustQ(v)} placeholder="Nama toko / perusahaan / kota…" />
                  {custLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-amber-500" />}
                  {custResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {custResults.map((c: any) => (
                        <button key={c.id} type="button" onClick={() => applyCustomer(c)}
                          className="w-full text-left px-3 py-2 text-[11px] hover:bg-amber-50 border-b border-gray-50 last:border-0">
                          <span className="font-semibold text-gray-900">{c.display_name}</span>
                          {c.company_name && <span className="text-gray-500"> · {c.company_name}</span>}
                          <span className="block text-[10px] text-gray-400">{c.city || c.address || c.customer_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {taskForm.customer_id && (
                  <p className="text-[11px] text-emerald-700 font-semibold">Terhubung ke CRM: {taskForm._cust_label || 'pelanggan dipilih'}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Nama outlet / lokasi kunjungan" value={taskForm.outlet_name || ''} onChange={v => setTaskForm((p: any) => ({ ...p, outlet_name: v }))} />
                  <Input label="Kode outlet (opsional)" value={taskForm.outlet_code || ''} onChange={v => setTaskForm((p: any) => ({ ...p, outlet_code: v }))} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={taskForm.start_date?.slice(0, 10) || ''} onChange={v => setTaskForm((p: any) => ({ ...p, start_date: v }))} />
              <Input label="Due Date" type="date" value={taskForm.due_date?.slice(0, 10) || ''} onChange={v => setTaskForm((p: any) => ({ ...p, due_date: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Assign Ke" value={taskForm.assigned_to || ''} onChange={v => setTaskForm((p: any) => ({ ...p, assigned_to: v ? Number(v) : null }))}
                options={[{ v: '', l: 'Pilih...' }, ...users.map(u => ({ v: String(u.id), l: u.name }))]} />
              <Input label="Estimasi Jam" type="number" value={taskForm.estimated_hours || ''} onChange={v => setTaskForm((p: any) => ({ ...p, estimated_hours: v ? Number(v) : null }))} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setShowCreateTask(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
              <button type="button" onClick={createTask} disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Simpan rencana
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════ */}
      {/* CREATE EVENT MODAL */}
      {/* ════════════════════════════════════════ */}
      {showCreateEvent && (
        <Modal title="Buat Event Baru" onClose={() => setShowCreateEvent(false)}>
          <div className="space-y-3">
            <Input label="Judul *" value={eventForm.title || ''} onChange={v => setEventForm((p: any) => ({ ...p, title: v }))} />
            <Textarea label="Deskripsi" value={eventForm.description || ''} onChange={v => setEventForm((p: any) => ({ ...p, description: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipe" value={eventForm.event_type || 'meeting'} onChange={v => setEventForm((p: any) => ({ ...p, event_type: v }))}
                options={[{ v: 'meeting', l: 'Meeting' }, { v: 'call', l: 'Call' }, { v: 'presentation', l: 'Presentasi' }, { v: 'training', l: 'Training' }, { v: 'demo', l: 'Demo' }, { v: 'visit', l: 'Visit' }, { v: 'webinar', l: 'Webinar' }, { v: 'networking', l: 'Networking' }]} />
              <Input label="Warna" type="color" value={eventForm.color || '#3b82f6'} onChange={v => setEventForm((p: any) => ({ ...p, color: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Mulai" type="datetime-local" value={eventForm.start_time?.slice(0, 16) || ''} onChange={v => setEventForm((p: any) => ({ ...p, start_time: v }))} />
              <Input label="Selesai" type="datetime-local" value={eventForm.end_time?.slice(0, 16) || ''} onChange={v => setEventForm((p: any) => ({ ...p, end_time: v }))} />
            </div>
            <Input label="Lokasi" value={eventForm.location || ''} onChange={v => setEventForm((p: any) => ({ ...p, location: v }))} />
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowCreateEvent(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
              <button onClick={createEvent} disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Buat Event
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════ */}
      {/* TASK DETAIL MODAL */}
      {/* ════════════════════════════════════════ */}
      {selectedTask && (
        <Modal title={selectedTask.title} onClose={() => setSelectedTask(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PRIORITY_BG[selectedTask.priority]}`}>{selectedTask.priority}</span>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">{selectedTask.status?.replace('_', ' ')}</span>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">{selectedTask.task_type?.replace('_', ' ')}</span>
              {selectedTask.task_number && <span className="text-[10px] font-mono text-gray-400">{selectedTask.task_number}</span>}
            </div>
            {selectedTask.description && <p className="text-sm text-gray-600">{selectedTask.description}</p>}
            {(selectedTask as any).purpose && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs">
                <span className="text-gray-500 font-semibold">Tujuan: </span>
                <span className="text-gray-800">{(selectedTask as any).purpose}</span>
              </div>
            )}
            {((selectedTask as any).outlet_name || (selectedTask as any).outlet_code) && (
              <div className="text-xs flex items-center gap-2 text-gray-700">
                <Navigation className="w-3.5 h-3.5 text-amber-600" />
                <span>{(selectedTask as any).outlet_name}</span>
                {(selectedTask as any).outlet_code && <span className="font-mono text-gray-400">({(selectedTask as any).outlet_code})</span>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-400">Assigned:</span> <span className="font-medium">{selectedTask.assigned_name || '-'}</span></div>
              <div><span className="text-gray-400">Customer:</span> <span className="font-medium">{selectedTask.customer_name || '-'}</span></div>
              <div><span className="text-gray-400">Start:</span> <span className="font-medium">{fmtDate(selectedTask.start_date)}</span></div>
              <div><span className="text-gray-400">Due:</span> <span className={`font-medium ${selectedTask.isOverdue ? 'text-red-500' : ''}`}>{fmtDate(selectedTask.due_date)}</span></div>
              <div><span className="text-gray-400">Est. Hours:</span> <span className="font-medium">{selectedTask.estimated_hours || '-'}</span></div>
              {selectedTask.progress !== undefined && <div><span className="text-gray-400">Progress:</span> <span className="font-medium">{selectedTask.progress}%</span></div>}
            </div>
            {selectedTask.checklist && selectedTask.checklist.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Checklist</h4>
                <div className="space-y-1.5">
                  {selectedTask.checklist.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${c.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                        {c.done && <CheckCircle className="w-3 h-3" />}
                      </span>
                      <span className={c.done ? 'line-through text-gray-400' : 'text-gray-700'}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quick Status Change */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Ubah Status:</span>
              {['open', 'in_progress', 'completed'].map(s => (
                <button key={s} onClick={() => { quickUpdateTask(selectedTask.id, { status: s }); setSelectedTask(null); }}
                  disabled={selectedTask.status === s}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                    selectedTask.status === s ? 'bg-gray-200 text-gray-400' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                  }`} style={{ borderLeftColor: STATUS_COLORS[s], borderLeftWidth: 3 }}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Kanban Card Component
// ═══════════════════════════════════════════
function KanbanCard({ task, onDragStart, onQuickUpdate, onDelete, onSelect }: {
  task: Task; onDragStart: () => void; onQuickUpdate: (id: string, f: any) => void; onDelete: (id: string) => void; onSelect: (t: Task) => void;
}) {
  const TypeIcon = TYPE_ICONS[task.task_type] || Star;
  return (
    <div draggable onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', task.id); onDragStart(); }}
      className="bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-amber-200 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
          <span className="text-[10px] font-mono text-gray-400 shrink-0">{task.task_number}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onSelect(task)} className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50"><Eye className="w-3 h-3" /></button>
          <button onClick={() => onDelete(task.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 cursor-pointer" onClick={() => onSelect(task)}>
        {task.title}
      </h4>
      {(task as any).purpose && (
        <p className="text-[10px] text-gray-500 line-clamp-2 mb-1">{(task as any).purpose}</p>
      )}
      {(task as any).sfa_visit_id && (
        <div className="text-[9px] text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1 mb-1 font-semibold flex items-center gap-1 flex-wrap">
          <Navigation className="w-3 h-3 shrink-0" />
          <span>Kunjungan SFA: {(task as any).visit_row_status || '—'}</span>
          {(task as any).linked_visit_date && <span className="text-violet-600 font-normal">· {fmtDate((task as any).linked_visit_date)}</span>}
        </div>
      )}
      {((task as any).customer_name || (task as any).outlet_name) && (
        <p className="text-[10px] text-indigo-600 font-medium mb-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{(task as any).customer_name || (task as any).outlet_name}</span>
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_BG[task.priority]}`}>{task.priority}</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <TypeIcon className="w-3 h-3" /> {task.task_type?.replace('_', ' ')}
        </span>
      </div>

      {/* Due date & assignee */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${task.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              <Clock className="w-3 h-3" /> {fmtDate(task.due_date)}
              {task.isOverdue && <AlertTriangle className="w-3 h-3" />}
            </span>
          )}
        </div>
        {task.assigned_name && (
          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[80px]">
            {task.assigned_name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Checklist progress */}
      {task.checklist && task.checklist.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>Checklist</span>
            <span>{task.checklist.filter(c => c.done).length}/{task.checklist.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{
              width: `${(task.checklist.filter(c => c.done).length / task.checklist.length) * 100}%`
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Gantt Chart Component
// ═══════════════════════════════════════════
function GanttChart({ tasks, range, onRangeChange, onTaskClick }: {
  tasks: Task[]; range: string; onRangeChange: (r: 'week' | 'month' | '3months') => void; onTaskClick: (t: Task) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate date range
  const dates = useMemo(() => {
    const d: Date[] = [];
    const start = new Date(today);
    const totalDays = range === 'week' ? 14 : range === 'month' ? 35 : 90;
    start.setDate(start.getDate() - Math.floor(totalDays * 0.3)); // 30% past, 70% future
    for (let i = 0; i < totalDays; i++) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + i);
      d.push(dt);
    }
    return d;
  }, [range]);

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const totalDays = dates.length;
  const dayWidth = range === 'week' ? 50 : range === 'month' ? 28 : 12;

  const getBarStyle = (task: Task) => {
    const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.due_date || today);
    const taskEnd = task.due_date ? new Date(task.due_date) : taskStart;
    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(0, 0, 0, 0);

    const diffStart = Math.max(0, Math.round((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.round((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const left = diffStart * dayWidth;
    const width = duration * dayWidth;

    return { left, width, diffStart, duration };
  };

  const todayOffset = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Range Selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Gantt Chart</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { id: 'week' as const, label: '2 Minggu' },
            { id: 'month' as const, label: '1 Bulan' },
            { id: '3months' as const, label: '3 Bulan' },
          ]).map(r => (
            <button key={r.id} onClick={() => onRangeChange(r.id)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                range === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Task Names (Fixed Left) */}
        <div className="shrink-0 w-64 border-r border-gray-100">
          <div className="h-10 border-b border-gray-100 px-3 flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Task
          </div>
          {tasks.map(task => (
            <div key={task.id} onClick={() => onTaskClick(task)}
              className="h-10 px-3 flex items-center gap-2 border-b border-gray-50 cursor-pointer hover:bg-amber-50/30 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
              <span className="text-xs font-medium text-gray-900 truncate">{task.title}</span>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="h-20 flex items-center justify-center text-xs text-gray-300">Tidak ada task dengan tanggal</div>
          )}
        </div>

        {/* Timeline (Scrollable Right) */}
        <div className="flex-1 overflow-x-auto">
          {/* Date Headers */}
          <div className="flex h-10 border-b border-gray-100 sticky top-0 bg-white z-10" style={{ width: totalDays * dayWidth }}>
            {dates.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isFirst = d.getDate() === 1;
              return (
                <div key={i} className={`shrink-0 flex flex-col items-center justify-center border-r border-gray-50 text-[9px]
                  ${isToday ? 'bg-amber-50 font-bold text-amber-700' : isWeekend ? 'bg-gray-50 text-gray-400' : 'text-gray-500'}
                  ${isFirst ? 'border-l-2 border-l-gray-300' : ''}`} style={{ width: dayWidth }}>
                  {(dayWidth >= 20 || i % (dayWidth < 15 ? 7 : 3) === 0) && (
                    <>
                      <span>{d.getDate()}</span>
                      {(isFirst || i === 0) && <span className="text-[8px] opacity-60">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bars */}
          <div style={{ width: totalDays * dayWidth, position: 'relative' }}>
            {/* Today line */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 opacity-60" style={{ left: todayOffset * dayWidth + dayWidth / 2 }} />

            {tasks.map((task, idx) => {
              const bar = getBarStyle(task);
              const progress = task.progress || 0;
              const color = STATUS_COLORS[task.status] || '#94a3b8';
              const isOverdue = task.isOverdue;

              return (
                <div key={task.id} className="h-10 relative border-b border-gray-50 flex items-center" style={{ width: totalDays * dayWidth }}>
                  {/* Weekend shading */}
                  {dates.map((d, di) => (
                    (d.getDay() === 0 || d.getDay() === 6) && (
                      <div key={di} className="absolute top-0 bottom-0 bg-gray-50/50" style={{ left: di * dayWidth, width: dayWidth }} />
                    )
                  ))}

                  {/* Task Bar */}
                  <div className="absolute h-6 rounded-md cursor-pointer group hover:shadow-md transition-shadow flex items-center overflow-hidden"
                    style={{ left: bar.left, width: Math.max(bar.width, dayWidth), background: `${color}20`, border: `1.5px solid ${color}` }}
                    onClick={() => onTaskClick(task)} title={`${task.title} (${progress}%)`}>
                    {/* Progress fill */}
                    <div className="absolute inset-0 rounded-md transition-all" style={{ width: `${progress}%`, background: `${color}40` }} />
                    {/* Label */}
                    {bar.width > 50 && (
                      <span className="relative z-10 px-2 text-[9px] font-semibold truncate" style={{ color }}>
                        {task.title}
                      </span>
                    )}
                    {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500 absolute right-1" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Calendar View Component
// ═══════════════════════════════════════════
function CalendarView({ date, onDateChange, events, taskEvents, holidays }: {
  date: Date; onDateChange: (d: Date) => void; events: CalEvent[]; taskEvents: CalEvent[]; holidays: Holiday[];
}) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onDateChange(new Date(year, month + 1, 1));
  const goToday = () => onDateChange(new Date());

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false, isToday: false });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ date: dt, isCurrentMonth: true, isToday: dt.toDateString() === new Date().toDateString() });
  }
  // Next month days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false, isToday: false });
  }

  // Map events/tasks/holidays to dates
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) {
      const k = e.start_time ? new Date(e.start_time).toISOString().slice(0, 10) : '';
      if (k) { if (!map[k]) map[k] = []; map[k].push(e); }
    }
    for (const e of taskEvents) {
      const k = e.start_time ? new Date(e.start_time).toISOString().slice(0, 10) : '';
      if (k) { if (!map[k]) map[k] = []; map[k].push(e); }
    }
    return map;
  }, [events, taskEvents]);

  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    for (const h of holidays) {
      if (h.date) { if (!map[h.date]) map[h.date] = []; map[h.date].push(h); }
    }
    return map;
  }, [holidays]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];
  const selectedHolidays = selectedDate ? (holidaysByDate[selectedDate] || []) : [];

  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="text-sm font-bold text-gray-900 min-w-[160px] text-center">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={goToday} className="text-xs font-semibold text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50">
            Hari Ini
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center py-2 text-[10px] font-bold uppercase tracking-wider ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const key = dateKey(cell.date);
            const evts = eventsByDate[key] || [];
            const hols = holidaysByDate[key] || [];
            const isSunday = cell.date.getDay() === 0;
            const isSelected = key === selectedDate;
            const hasHoliday = hols.length > 0;

            return (
              <div key={i} onClick={() => setSelectedDate(isSelected ? null : key)}
                className={`min-h-[80px] p-1 border-b border-r border-gray-50 cursor-pointer transition-colors
                  ${!cell.isCurrentMonth ? 'bg-gray-50/50' : ''}
                  ${cell.isToday ? 'bg-amber-50/50' : ''}
                  ${isSelected ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/30' : 'hover:bg-gray-50/80'}
                `}>
                <div className={`text-right text-xs font-medium mb-0.5 px-1 ${
                  !cell.isCurrentMonth ? 'text-gray-300' :
                  cell.isToday ? 'text-amber-600 font-bold' :
                  isSunday || hasHoliday ? 'text-red-500' : 'text-gray-700'
                }`}>
                  {cell.date.getDate()}
                  {cell.isToday && <span className="ml-1 text-[8px] bg-amber-500 text-white px-1 rounded">Today</span>}
                </div>

                {/* Holiday badge */}
                {hols.map((h, hi) => (
                  <div key={hi} className="text-[8px] bg-red-100 text-red-600 px-1 py-0.5 rounded mb-0.5 truncate font-medium">
                    🔴 {h.title}
                  </div>
                ))}

                {/* Events */}
                {evts.slice(0, 3).map((e, ei) => (
                  <div key={ei} className="text-[8px] px-1 py-0.5 rounded mb-0.5 truncate font-medium"
                    style={{ background: `${e.color || '#3b82f6'}15`, color: e.color || '#3b82f6' }}>
                    {e.isTask ? '📋' : '📅'} {e.title?.replace('[Task] ', '')}
                  </div>
                ))}
                {evts.length > 3 && (
                  <div className="text-[8px] text-gray-400 px-1">+{evts.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar — Selected Day Details + Upcoming */}
      <div className="space-y-4">
        {/* Legend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Keterangan</h4>
          <div className="space-y-1.5">
            {[
              { icon: '🔴', label: 'Hari Libur Nasional (Google Calendar)', color: 'text-red-600' },
              { icon: '📅', label: 'Calendar Event', color: 'text-blue-600' },
              { icon: '📋', label: 'Task Due Date', color: 'text-amber-600' },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span>{l.icon}</span>
                <span className={`font-medium ${l.color}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Date Detail */}
        {selectedDate && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h4 className="text-xs font-bold text-gray-700 mb-2">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            {selectedHolidays.length > 0 && (
              <div className="mb-3">
                {selectedHolidays.map((h, i) => (
                  <div key={i} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-xl mb-1.5 font-medium">🔴 {h.title}</div>
                ))}
              </div>
            )}
            {selectedEvents.length === 0 && selectedHolidays.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Tidak ada event atau task</p>
            )}
            <div className="space-y-2">
              {selectedEvents.map((e, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-gray-100 hover:border-amber-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color || '#3b82f6' }} />
                    <span className="text-xs font-semibold text-gray-900 truncate">{e.title?.replace('[Task] ', '')}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 pl-4">
                    {e.isTask ? `Task • ${e.priority}` : `${e.event_type} • ${fmtTime(e.start_time)} - ${fmtTime(e.end_time)}`}
                    {e.isOverdue && <span className="text-red-500 font-medium ml-1">• Overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming This Week */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Minggu Ini</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...events, ...taskEvents]
              .filter(e => {
                const d = new Date(e.start_time);
                const now = new Date();
                const weekEnd = new Date(now);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return d >= now && d <= weekEnd;
              })
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .slice(0, 8)
              .map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] py-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color || '#3b82f6' }} />
                  <span className="text-gray-400 font-mono shrink-0">{fmtDate(e.start_time).split(' ').slice(0, 2).join(' ')}</span>
                  <span className="text-gray-700 font-medium truncate">{e.title?.replace('[Task] ', '')}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Task List View Component
// ═══════════════════════════════════════════
function TaskListView({ columns, search, onQuickUpdate, onDelete, onSelect }: {
  columns: any[]; search: string; onQuickUpdate: (id: string, f: any) => void; onDelete: (id: string) => void; onSelect: (t: Task) => void;
}) {
  const allTasks = columns.flatMap((c: any) => c.tasks);
  const filtered = search
    ? allTasks.filter((t: Task) => t.title.toLowerCase().includes(search.toLowerCase()) || t.task_number?.toLowerCase().includes(search.toLowerCase()))
    : allTasks;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Task</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tipe</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider">Prioritas</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Assigned</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-300">Tidak ada task</td></tr>
            ) : filtered.map((task: Task, idx: number) => {
              const TypeIcon = TYPE_ICONS[task.task_type] || Star;
              return (
                <tr key={task.id} className="hover:bg-amber-50/20 transition-colors cursor-pointer" onClick={() => onSelect(task)}>
                  <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className={`font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{task.task_number} {task.customer_name && `· ${task.customer_name}`}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="flex items-center gap-1 text-gray-500"><TypeIcon className="w-3 h-3" /> {task.task_type?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PRIORITY_BG[task.priority]}`}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={e => {
                      e.stopPropagation();
                      const next: Record<string, string> = { open: 'in_progress', in_progress: 'completed', completed: 'open', deferred: 'open', cancelled: 'open' };
                      onQuickUpdate(task.id, { status: next[task.status] || 'open' });
                    }} className="text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors hover:border-amber-300"
                      style={{ borderColor: STATUS_COLORS[task.status], color: STATUS_COLORS[task.status], background: `${STATUS_COLORS[task.status]}10` }}>
                      {task.status?.replace('_', ' ')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{task.assigned_name || '-'}</td>
                  <td className={`px-4 py-3 hidden lg:table-cell ${task.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                    {fmtDate(task.due_date)}
                    {task.isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onSelect(task)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(task.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Shared UI Components
// ═══════════════════════════════════════════
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-lg'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange }: { label: string; type?: string; value: string | number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 bg-white">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
