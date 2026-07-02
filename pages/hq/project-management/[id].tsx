import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Briefcase, ArrowLeft, Edit3, Trash2, Plus, Loader2, Calendar, Users, DollarSign,
  AlertTriangle, FileText, Flag, Timer, ListTodo, CheckCircle2, Clock, Target,
  Layers, XCircle, TrendingUp, ChevronRight, MessageSquare, Activity, Eye,
  CheckCheck, GitBranch, Send, UserPlus, Bell, BellOff, Link as LinkIcon, X
} from 'lucide-react';

const SC: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700', completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-700', review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700', blocked: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700', draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  identified: 'bg-blue-100 text-blue-700', mitigating: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', accepted: 'bg-gray-100 text-gray-700',
};
const PC: Record<string, string> = { low: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-600', medium: 'bg-blue-100 text-blue-600', high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600', critical: 'bg-red-200 text-red-800', very_high: 'bg-red-200 text-red-800' };
const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => { if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`; if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}Jt`; return fmt(n); };
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

type DetailTab = 'overview' | 'tasks' | 'milestones' | 'resources' | 'risks' | 'budget' | 'documents' | 'comments' | 'activity' | 'watchers' | 'approvals' | 'dependencies';

const Badge = ({ value, colors }: { value: string; colors: Record<string, string> }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>
);

const Progress = ({ value, height = 'h-2' }: { value: number; height?: string }) => (
  <div className="flex items-center gap-2">
    <div className={`flex-1 ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : value >= 30 ? 'bg-yellow-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-xs font-medium text-gray-500 min-w-[32px]">{Number(value).toFixed(0)}%</span>
  </div>
);

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [taskViewMode, setTaskViewMode] = useState<'table' | 'kanban'>('kanban');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/hq/project-management?action=project-detail&id=${id}`);
      const d = await r.json();
      if (d.success) setProject(d.data);
      else { toast.error('Proyek tidak ditemukan'); router.push('/hq/project-management'); }
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Load data for collaboration tabs
  const fetchCollab = useCallback(async (tab: DetailTab) => {
    if (!id) return;
    setLoadingSub(true);
    try {
      const actionMap: Record<string, string> = {
        comments: 'comments', activity: 'activity-log', watchers: 'watchers',
        approvals: 'approvals', dependencies: 'dependencies',
      };
      const action = actionMap[tab]; if (!action) return;
      const r = await fetch(`/api/hq/project-management?action=${action}&projectId=${id}`);
      const d = await r.json();
      if (!d.success) return;
      const rows = Array.isArray(d.data) ? d.data : (d.data?.rows || []);
      switch (tab) {
        case 'comments': setComments(rows); break;
        case 'activity': setActivityLog(rows); break;
        case 'watchers':
          setWatchers(rows);
          setIsWatching(rows.some((w: any) => w.is_current_user));
          break;
        case 'approvals': setApprovals(rows); break;
        case 'dependencies': setDependencies(rows); break;
      }
    } catch (e: any) { console.error(e); } finally { setLoadingSub(false); }
  }, [id]);

  useEffect(() => {
    if (['comments', 'activity', 'watchers', 'approvals', 'dependencies'].includes(activeTab)) {
      fetchCollab(activeTab);
    }
  }, [activeTab, fetchCollab]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    setPostingComment(true);
    try {
      const r = await fetch('/api/hq/project-management?action=comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, content: newComment.trim() }),
      });
      const d = await r.json();
      if (d.success) { toast.success('Komentar terkirim'); setNewComment(''); fetchCollab('comments'); }
      else toast.error(d.error?.message || 'Gagal');
    } catch (e: any) { toast.error(e.message); } finally { setPostingComment(false); }
  };

  const handleToggleWatch = async () => {
    if (!id) return;
    try {
      const r = await fetch('/api/hq/project-management?action=watchers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, toggle: true }),
      });
      const d = await r.json();
      if (d.success) { toast.success(isWatching ? 'Unwatched' : 'Watching'); fetchCollab('watchers'); }
      else toast.error(d.error?.message || 'Gagal');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleApprovalDecision = async (approvalId: string, decision: 'approved' | 'rejected') => {
    try {
      const r = await fetch(`/api/hq/project-management?action=approvals&id=${approvalId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, projectId: id }),
      });
      const d = await r.json();
      if (d.success) { toast.success(decision === 'approved' ? 'Disetujui' : 'Ditolak'); fetchCollab('approvals'); }
      else toast.error(d.error?.message || 'Gagal');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/hq/project-management?action=tasks&id=${taskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'done' ? { progressPercent: 100 } : {}) })
      });
      toast.success('Status diubah');
      fetchProject();
    } catch (e: any) { toast.error(e.message); }
  };

  const kanbanTasks = useMemo(() => {
    const cols = ['todo', 'in_progress', 'review', 'done', 'blocked'];
    const grouped: Record<string, any[]> = {};
    cols.forEach(c => { grouped[c] = []; });
    (project?.tasks || []).forEach((t: any) => {
      const s = t.status || 'todo';
      if (grouped[s]) grouped[s].push(t); else grouped['todo'].push(t);
    });
    return grouped;
  }, [project]);

  const budgetUsed = Number(project?.actual_cost || 0);
  const budgetTotal = Number(project?.budget_amount || 0);
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  const taskStats = useMemo(() => {
    const tasks = project?.tasks || [];
    return {
      total: tasks.length,
      todo: tasks.filter((t: any) => t.status === 'todo').length,
      in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
      review: tasks.filter((t: any) => t.status === 'review').length,
      done: tasks.filter((t: any) => t.status === 'done').length,
      blocked: tasks.filter((t: any) => t.status === 'blocked').length,
    };
  }, [project]);

  const taskPieData = useMemo(() => [
    { name: 'To Do', value: taskStats.todo, color: '#6B7280' },
    { name: 'In Progress', value: taskStats.in_progress, color: '#F59E0B' },
    { name: 'Review', value: taskStats.review, color: '#8B5CF6' },
    { name: 'Done', value: taskStats.done, color: '#10B981' },
    { name: 'Blocked', value: taskStats.blocked, color: '#EF4444' },
  ].filter(d => d.value > 0), [taskStats]);

  const budgetBreakdown = useMemo(() => {
    return (project?.budgetItems || []).map((b: any) => ({
      name: b.category,
      planned: Number(b.planned_amount || 0),
      actual: Number(b.actual_amount || 0),
    }));
  }, [project]);

  if (loading) return (
    <HQLayout title="Detail Proyek" subtitle="">
      <div className="flex items-center justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
    </HQLayout>
  );

  if (!project) return (
    <HQLayout title="Detail Proyek" subtitle="">
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Briefcase className="w-16 h-16 mb-4" />
        <p className="font-medium">Proyek tidak ditemukan</p>
        <button onClick={() => router.push('/hq/project-management')} className="mt-4 text-blue-600 hover:underline text-sm">Kembali ke daftar proyek</button>
      </div>
    </HQLayout>
  );

  const detailTabs: { id: DetailTab; name: string; icon: any; count?: number }[] = [
    { id: 'overview', name: 'Ringkasan', icon: Briefcase },
    { id: 'tasks', name: 'Tugas', icon: ListTodo, count: project.tasks?.length || 0 },
    { id: 'milestones', name: 'Milestone', icon: Flag, count: project.milestones?.length || 0 },
    { id: 'dependencies', name: 'Dependencies', icon: GitBranch },
    { id: 'resources', name: 'Sumber Daya', icon: Users, count: project.resources?.length || 0 },
    { id: 'risks', name: 'Risiko', icon: AlertTriangle, count: project.risks?.length || 0 },
    { id: 'budget', name: 'Anggaran', icon: DollarSign, count: project.budgetItems?.length || 0 },
    { id: 'documents', name: 'Dokumen', icon: FileText, count: project.documents?.length || 0 },
    { id: 'comments', name: 'Komentar', icon: MessageSquare },
    { id: 'activity', name: 'Aktivitas', icon: Activity },
    { id: 'watchers', name: 'Watchers', icon: Eye },
    { id: 'approvals', name: 'Approval', icon: CheckCheck },
  ];

  return (
    <HQLayout title={project.name} subtitle={`${project.project_code} - Detail Proyek`}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <button onClick={() => router.push('/hq/project-management')} className="hover:text-blue-600 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Manajemen Proyek</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600">{project.project_code}</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge value={project.status} colors={SC} />
                <Badge value={project.priority} colors={PC} />
                {project.category && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{project.category}</span>}
                {project.manager_name && <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{project.manager_name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleToggleWatch}
                className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 transition ${isWatching ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'}`}
                title={isWatching ? 'Berhenti memantau' : 'Pantau proyek ini'}>
                {isWatching ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isWatching ? 'Watching' : 'Watch'}
              </button>
              <button onClick={() => router.push('/hq/project-management?tab=projects')} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5"><Edit3 className="w-4 h-4" /> Edit</button>
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto px-6 gap-1">
          {detailTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <tab.icon className="w-4 h-4" />{tab.name}
              {tab.count !== undefined && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Progress</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{Number(project.progress_percent || 0).toFixed(0)}%</p>
                <Progress value={Number(project.progress_percent || 0)} />
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Tugas</p>
                <p className="text-2xl font-bold text-gray-900">{taskStats.done}/{taskStats.total}</p>
                <p className="text-xs text-gray-400 mt-1">{taskStats.in_progress} sedang dikerjakan</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Anggaran</p>
                <p className="text-2xl font-bold text-gray-900">{fmtShort(budgetUsed)}</p>
                <p className="text-xs text-gray-400 mt-1">dari {fmtShort(budgetTotal)} ({budgetPct}%)</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Risiko Aktif</p>
                <p className="text-2xl font-bold text-gray-900">{(project.risks || []).filter((r: any) => r.status !== 'resolved').length}</p>
                <p className="text-xs text-gray-400 mt-1">{(project.risks || []).length} total</p>
              </div>
            </div>

            {/* Info + Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border p-5 lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">Informasi Proyek</h3>
                {project.description && <p className="text-sm text-gray-600 mb-4">{project.description}</p>}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400">Tanggal Mulai</span><p className="font-medium text-gray-700">{fD(project.start_date)}</p></div>
                  <div><span className="text-gray-400">Tanggal Selesai</span><p className="font-medium text-gray-700">{fD(project.end_date)}</p></div>
                  <div><span className="text-gray-400">Aktual Mulai</span><p className="font-medium text-gray-700">{fD(project.actual_start_date)}</p></div>
                  <div><span className="text-gray-400">Aktual Selesai</span><p className="font-medium text-gray-700">{fD(project.actual_end_date)}</p></div>
                  <div><span className="text-gray-400">Klien</span><p className="font-medium text-gray-700">{project.client_name || '-'}</p></div>
                  <div><span className="text-gray-400">Departemen</span><p className="font-medium text-gray-700">{project.department || '-'}</p></div>
                  <div><span className="text-gray-400">Anggaran</span><p className="font-medium text-gray-700">{fmt(budgetTotal)}</p></div>
                  <div><span className="text-gray-400">Biaya Aktual</span><p className={`font-medium ${budgetPct > 100 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(budgetUsed)}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Distribusi Tugas</h3>
                {taskPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {taskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {taskPieData.map((d, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </>
                ) : <p className="text-center text-gray-300 py-8">Belum ada tugas</p>}
              </div>
            </div>

            {/* Budget Bar Chart */}
            {budgetBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Anggaran per Kategori</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={budgetBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => fmtShort(v)} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="planned" name="Rencana" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Aktual" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Upcoming Milestones */}
            {(project.milestones || []).length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Milestone</h3>
                <div className="space-y-3">
                  {project.milestones.map((m: any) => {
                    const overdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed';
                    return (
                      <div key={m.id} className={`flex items-center gap-4 p-3 rounded-lg border ${overdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'completed' ? 'bg-green-100' : overdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <Flag className={`w-4 h-4 ${m.status === 'completed' ? 'text-green-600' : overdue ? 'text-red-500' : 'text-blue-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{m.name}</p>
                          <p className="text-xs text-gray-400">Deadline: {fD(m.due_date)}</p>
                        </div>
                        <Badge value={m.status} colors={SC} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TASKS ===== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { l: 'To Do', v: taskStats.todo, c: 'bg-gray-50 text-gray-700 border-gray-200' },
                  { l: 'In Progress', v: taskStats.in_progress, c: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                  { l: 'Review', v: taskStats.review, c: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { l: 'Done', v: taskStats.done, c: 'bg-green-50 text-green-700 border-green-200' },
                  { l: 'Blocked', v: taskStats.blocked, c: 'bg-red-50 text-red-700 border-red-200' },
                ].map(s => (
                  <div key={s.l} className={`${s.c} border rounded-lg px-3 py-2 text-center`}>
                    <p className="text-lg font-bold">{s.v}</p>
                    <p className="text-[10px] font-medium">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setTaskViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${taskViewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><ListTodo className="w-4 h-4" /></button>
                <button onClick={() => setTaskViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${taskViewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Layers className="w-4 h-4" /></button>
              </div>
            </div>

            {taskViewMode === 'kanban' ? (
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '55vh' }}>
                {[
                  { id: 'todo', label: 'To Do', bc: 'border-t-gray-400', bg: 'bg-gray-50' },
                  { id: 'in_progress', label: 'In Progress', bc: 'border-t-yellow-400', bg: 'bg-yellow-50' },
                  { id: 'review', label: 'Review', bc: 'border-t-purple-400', bg: 'bg-purple-50' },
                  { id: 'done', label: 'Done', bc: 'border-t-green-400', bg: 'bg-green-50' },
                  { id: 'blocked', label: 'Blocked', bc: 'border-t-red-400', bg: 'bg-red-50' },
                ].map(col => (
                  <div key={col.id} className={`flex-shrink-0 w-72 ${col.bg} rounded-xl border-t-4 ${col.bc} border flex flex-col`}>
                    <div className="px-4 py-3 flex items-center justify-between border-b">
                      <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                      <span className="bg-white text-xs font-bold text-gray-500 px-2 py-0.5 rounded-full shadow-sm">{kanbanTasks[col.id]?.length || 0}</span>
                    </div>
                    <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(55vh - 52px)' }}>
                      {(kanbanTasks[col.id] || []).map((task: any) => (
                        <div key={task.id} className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-gray-400">{task.task_code}</span>
                            <select className="text-[10px] bg-transparent border rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              value={task.status} onChange={e => handleTaskStatusChange(task.id, e.target.value)}>
                              <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="done">Done</option><option value="blocked">Blocked</option>
                            </select>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1.5 line-clamp-2">{task.name}</p>
                          <div className="flex items-center justify-between">
                            <Badge value={task.priority || 'normal'} colors={PC} />
                            {task.due_date && <span className={`text-[10px] flex items-center gap-0.5 ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}><Calendar className="w-3 h-3" />{fD(task.due_date)}</span>}
                          </div>
                          {task.assignee_name && (
                            <div className="mt-2 pt-2 border-t flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">{task.assignee_name.charAt(0).toUpperCase()}</span>
                              <span className="text-[11px] text-gray-500">{task.assignee_name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {(kanbanTasks[col.id] || []).length === 0 && <div className="text-center py-8 text-gray-300 text-xs">Tidak ada tugas</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Kode</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tugas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Prioritas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Assignee</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Deadline</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Progress</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {(project.tasks || []).map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{t.task_code}</span></td>
                        <td className="px-4 py-3 font-medium">{t.name}</td>
                        <td className="px-4 py-3"><Badge value={t.status} colors={SC} /></td>
                        <td className="px-4 py-3"><Badge value={t.priority} colors={PC} /></td>
                        <td className="px-4 py-3">{t.assignee_name || '-'}</td>
                        <td className="px-4 py-3 text-xs">{fD(t.due_date)}</td>
                        <td className="px-4 py-3"><Progress value={Number(t.progress_percent || 0)} /></td>
                      </tr>
                    ))}
                    {(project.tasks || []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada tugas</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== MILESTONES ===== */}
        {activeTab === 'milestones' && (
          <div className="space-y-3">
            {(project.milestones || []).map((m: any) => {
              const overdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed';
              return (
                <div key={m.id} className={`bg-white rounded-xl border ${overdue ? 'border-red-300 bg-red-50/30' : ''} shadow-sm p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'completed' ? 'bg-green-100' : overdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                      {m.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : overdue ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Flag className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-800">{m.name}</h4>
                        <Badge value={m.status} colors={SC} />
                      </div>
                      {m.description && <p className="text-xs text-gray-500 mb-2">{m.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline: {fD(m.due_date)}</span>
                        {m.completed_date && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Selesai: {fD(m.completed_date)}</span>}
                        {overdue && <span className="text-red-500 font-bold">Terlambat</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {(project.milestones || []).length === 0 && <div className="text-center py-16 text-gray-400"><Target className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>Belum ada milestone</p></div>}
          </div>
        )}

        {/* ===== RESOURCES ===== */}
        {activeTab === 'resources' && (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipe</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Alokasi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Biaya/Jam</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Periode</th>
              </tr></thead>
              <tbody className="divide-y">
                {(project.resources || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.resource_name}</td>
                    <td className="px-4 py-3"><Badge value={r.resource_type} colors={{ human: 'bg-blue-100 text-blue-700', equipment: 'bg-orange-100 text-orange-700', material: 'bg-green-100 text-green-700' }} /></td>
                    <td className="px-4 py-3">{r.role || '-'}</td>
                    <td className="px-4 py-3">{Number(r.allocation_percent || 0)}%</td>
                    <td className="px-4 py-3">{fmt(Number(r.cost_per_hour || 0))}</td>
                    <td className="px-4 py-3 text-xs">{fD(r.start_date)} - {fD(r.end_date)}</td>
                  </tr>
                ))}
                {(project.resources || []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada resource</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== RISKS ===== */}
        {activeTab === 'risks' && (
          <div className="space-y-3">
            {(project.risks || []).map((r: any) => {
              const score = Number(r.risk_score || 0);
              return (
                <div key={r.id} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${score >= 9 ? 'bg-red-100 text-red-700' : score >= 6 ? 'bg-orange-100 text-orange-700' : score >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{r.risk_code}</span>
                          <h4 className="font-semibold text-gray-800">{r.title}</h4>
                        </div>
                        <Badge value={r.status} colors={SC} />
                      </div>
                      {r.description && <p className="text-xs text-gray-500 mb-2">{r.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Probabilitas: <Badge value={r.probability} colors={PC} /></span>
                        <span>Dampak: <Badge value={r.impact} colors={PC} /></span>
                        {r.owner_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.owner_name}</span>}
                      </div>
                      {r.mitigation_plan && <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2"><span className="font-medium">Mitigasi:</span> {r.mitigation_plan}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            {(project.risks || []).length === 0 && <div className="text-center py-16 text-gray-400"><AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>Belum ada risiko</p></div>}
          </div>
        )}

        {/* ===== BUDGET ===== */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Anggaran</p>
                <p className="text-xl font-bold text-blue-600">{fmt(budgetTotal)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Terpakai</p>
                <p className={`text-xl font-bold ${budgetPct > 100 ? 'text-red-600' : 'text-green-600'}`}>{fmt(budgetUsed)}</p>
                <p className="text-xs text-gray-400 mt-1">{budgetPct}% dari anggaran</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-sm text-gray-500 mb-1">Sisa</p>
                <p className={`text-xl font-bold ${budgetTotal - budgetUsed >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt(budgetTotal - budgetUsed)}</p>
              </div>
            </div>

            {budgetBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Breakdown Anggaran</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={budgetBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => fmtShort(v)} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="planned" name="Rencana" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Aktual" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kategori</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Deskripsi</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Rencana</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Aktual</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Varians</th>
                </tr></thead>
                <tbody className="divide-y">
                  {(project.budgetItems || []).map((b: any) => {
                    const variance = Number(b.planned_amount || 0) - Number(b.actual_amount || 0);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium capitalize">{b.category}</td>
                        <td className="px-4 py-3">{b.description || '-'}</td>
                        <td className="px-4 py-3">{fmt(Number(b.planned_amount || 0))}</td>
                        <td className="px-4 py-3">{fmt(Number(b.actual_amount || 0))}</td>
                        <td className={`px-4 py-3 font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{variance >= 0 ? '+' : ''}{fmt(variance)}</td>
                      </tr>
                    );
                  })}
                  {(project.budgetItems || []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada data anggaran</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== DOCUMENTS ===== */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Dokumen</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipe</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Versi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Uploader</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
              </tr></thead>
              <tbody className="divide-y">
                {(project.documents || []).map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{d.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="capitalize text-xs bg-gray-100 px-2 py-1 rounded">{d.document_type || '-'}</span></td>
                    <td className="px-4 py-3">{d.version || '-'}</td>
                    <td className="px-4 py-3">{d.uploaded_by_name || '-'}</td>
                    <td className="px-4 py-3 text-xs">{fD(d.created_at)}</td>
                  </tr>
                ))}
                {(project.documents || []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada dokumen</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== COMMENTS ===== */}
        {activeTab === 'comments' && (
          <div className="max-w-4xl space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" />Diskusi Proyek</h3>
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">U</div>
                <div className="flex-1">
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3} placeholder="Tulis komentar atau update proyek..." value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={handlePostComment} disabled={postingComment || !newComment.trim()}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50">
                      {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Kirim
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {loadingSub && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>}
              {!loadingSub && comments.length === 0 && (
                <div className="bg-white border-2 border-dashed rounded-xl p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Belum ada komentar. Jadilah yang pertama!</p>
                </div>
              )}
              {comments.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(c.author_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">{c.author_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {c.task_name && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">pada {c.task_name}</span>}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ACTIVITY LOG ===== */}
        {activeTab === 'activity' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Audit Trail & Activity</h3>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {loadingSub && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>}
                {!loadingSub && activityLog.length === 0 && (
                  <div className="p-12 text-center text-sm text-gray-400">Belum ada aktivitas tercatat</div>
                )}
                {activityLog.map((a: any) => {
                  const actionColor = a.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                    a.action === 'update' ? 'bg-blue-100 text-blue-700' :
                    a.action === 'delete' ? 'bg-red-100 text-red-700' :
                    a.action === 'approve' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700';
                  return (
                    <div key={a.id} className="p-3 flex items-start gap-3 hover:bg-gray-50">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${actionColor}`}>{a.action}</span>
                          <span className="text-xs font-medium text-gray-800">{a.actor_name || 'System'}</span>
                          <span className="text-xs text-gray-500">· {a.entity_type}</span>
                          {a.entity_name && <span className="text-xs text-gray-700 font-medium">{a.entity_name}</span>}
                          <span className="text-xs text-gray-400 ml-auto">{new Date(a.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        {a.description && <p className="text-xs text-gray-500 mt-1">{a.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== WATCHERS ===== */}
        {activeTab === 'watchers' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Watchers</h3>
                  <span className="text-xs text-gray-500">({watchers.length})</span>
                </div>
                <button onClick={handleToggleWatch}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${isWatching ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                  {isWatching ? <><BellOff className="w-3.5 h-3.5" />Berhenti Pantau</> : <><Bell className="w-3.5 h-3.5" />Pantau Proyek</>}
                </button>
              </div>
              <div className="divide-y">
                {loadingSub && <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>}
                {!loadingSub && watchers.length === 0 && (
                  <div className="p-12 text-center text-sm text-gray-400">Belum ada watcher</div>
                )}
                {watchers.map((w: any) => (
                  <div key={w.id || w.user_id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold">
                      {(w.user_name || w.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{w.user_name || w.name}</p>
                      <p className="text-xs text-gray-500">{w.email || w.position || '-'}</p>
                    </div>
                    {w.is_current_user && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Anda</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== APPROVALS ===== */}
        {activeTab === 'approvals' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Approval Workflow</h3>
              </div>
              <div className="divide-y">
                {loadingSub && <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>}
                {!loadingSub && approvals.length === 0 && (
                  <div className="p-12 text-center text-sm text-gray-400">Tidak ada permintaan persetujuan</div>
                )}
                {approvals.map((a: any) => (
                  <div key={a.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge value={a.status} colors={SC} />
                          <span className="text-xs text-gray-500">· {a.entity_type} · {a.approval_type || 'general'}</span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">{a.entity_name || a.title}</p>
                        {a.description && <p className="text-xs text-gray-600 mt-1">{a.description}</p>}
                      </div>
                      {a.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleApprovalDecision(a.id, 'rejected')}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 flex items-center gap-1">
                            <X className="w-3 h-3" />Tolak
                          </button>
                          <button onClick={() => handleApprovalDecision(a.id, 'approved')}
                            className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Setujui
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>Diminta: {a.requester_name || '-'}</span>
                      <span>· {new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                      {a.approver_name && <span>· Approver: {a.approver_name}</span>}
                      {a.approved_at && <span>· Diputuskan: {new Date(a.approved_at).toLocaleDateString('id-ID')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== DEPENDENCIES ===== */}
        {activeTab === 'dependencies' && (
          <div className="max-w-5xl">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Task Dependencies</h3>
                <span className="text-xs text-gray-500 ml-auto">Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), Start-to-Finish (SF)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Predecessor</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Successor</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Lag</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingSub && <tr><td colSpan={5} className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>}
                    {!loadingSub && dependencies.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Belum ada dependency antar task</td></tr>
                    )}
                    {dependencies.map((d: any) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <LinkIcon className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{d.predecessor_name}</span>
                            {d.predecessor_status && <Badge value={d.predecessor_status} colors={SC} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-1 bg-indigo-100 text-indigo-700 rounded">{(d.dependency_type || 'FS').toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{d.successor_name}</span>
                            {d.successor_status && <Badge value={d.successor_status} colors={SC} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{d.lag_days || 0}d</td>
                        <td className="px-4 py-3">
                          {d.is_blocking ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Blocking</span> :
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
