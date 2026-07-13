import React, { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { toast } from 'react-hot-toast';
import {
  Plus, RefreshCw, CheckCircle, Clock, AlertCircle,
  Target, Calendar, User, ArrowRight, Trash2, Filter, X,
} from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  assigneeId: string;
  dueDate: string;
  completedAt: string | null;
  taskType: 'target' | 'routine' | 'sop' | 'project';
  targetValue: string | null;
  targetUnit: string | null;
  category: string | null;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  code: string;
  role: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const TASK_TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  target: { label: 'Target', badge: 'bg-purple-100 text-purple-700' },
  routine: { label: 'Rutin', badge: 'bg-blue-100 text-blue-700' },
  sop: { label: 'SOP', badge: 'bg-teal-100 text-teal-700' },
  project: { label: 'Proyek', badge: 'bg-orange-100 text-orange-700' },
};

const STATUS_COLUMNS = [
  { value: 'todo', label: 'To Do', icon: Clock, color: 'border-t-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Target, color: 'border-t-amber-500' },
  { value: 'done', label: 'Done', icon: CheckCircle, color: 'border-t-emerald-500' },
] as const;

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function TeamTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium', assigneeId: '',
    dueDate: '', taskType: 'routine', targetValue: '', targetUnit: '', category: '',
  });
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const memberMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [members]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAssignee) params.set('assigneeId', filterAssignee);
      if (filterType) params.set('taskType', filterType);
      if (filterPriority) params.set('priority', filterPriority);
      const res = await fetch(`/api/humanify/team-tasks?${params}`);
      const json = await res.json();
      if (json.success) {
        const rows = json.data || [];
        setTasks(rows);
        setDataSource(rows.length ? 'live' : 'empty');
      }
    } catch {
      toast.error('Gagal memuat tugas');
    } finally {
      setLoading(false);
    }
  }, [filterAssignee, filterType, filterPriority]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/team-members?limit=100');
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch {
      // silent — use empty list
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCreateTask = async () => {
    if (!newTask.title) { toast.error('Judul wajib diisi'); return; }
    setSaving(true);
    try {
      const body: any = { ...newTask };
      if (newTask.taskType !== 'target') {
        body.targetValue = '';
        body.targetUnit = '';
      }
      const res = await fetch('/api/humanify/team-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Tugas berhasil dibuat');
        setTasks(prev => [json.data, ...prev]);
        setNewTask({
          title: '', description: '', priority: 'medium', assigneeId: '',
          dueDate: '', taskType: 'routine', targetValue: '', targetUnit: '', category: '',
        });
        setShowNew(false);
      } else {
        toast.error(json.error || 'Gagal');
      }
    } catch {
      toast.error('Gagal membuat tugas');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/humanify/team-tasks?id=${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
        toast.success(newStatus === 'done' ? 'Tugas selesai' : `Dipindahkan ke ${newStatus}`);
      }
    } catch {
      toast.error('Gagal memperbarui status');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Hapus tugas ini?')) return;
    try {
      const res = await fetch(`/api/humanify/team-tasks?id=${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success('Tugas dihapus');
      }
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterType('');
    setFilterPriority('');
  };

  const hasFilters = filterAssignee || filterType || filterPriority;

  const tasksByStatus = STATUS_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.value).sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    }),
  }));

  return (
    <HumanifyLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tugas Tim</h1>
            <p className="text-sm text-gray-500 mt-1">Manajemen tugas untuk tim internal</p>
          </div>
          <div className="flex items-center gap-3">
            <DataSourceBadge source={dataSource} />
            <button onClick={() => fetchTasks()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Refresh">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Tugas Baru
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm min-w-[160px]">
            <option value="">Semua Anggota</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Semua Tipe</option>
            <option value="target">Target</option>
            <option value="routine">Rutin</option>
            <option value="sop">SOP</option>
            <option value="project">Proyek</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Semua Prioritas</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* New Task Form */}
        {showNew && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-medium text-gray-900">Tugas Baru</h3>
            <input type="text" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Judul tugas *" />
            <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={2} placeholder="Deskripsi (opsional)" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={newTask.taskType} onChange={e => setNewTask(p => ({ ...p, taskType: e.target.value, targetValue: '', targetUnit: '' }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="routine">Rutin</option>
                <option value="target">Target</option>
                <option value="sop">SOP</option>
                <option value="project">Proyek</option>
              </select>
              <input type="text" value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Kategori" list="category-list" />
              <datalist id="category-list">
                <option value="Sales" />
                <option value="Marketing" />
                <option value="Operational" />
                <option value="Finance" />
                <option value="Admin" />
                <option value="HR" />
                <option value="Pengembangan" />
              </datalist>
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Tenggat" />
            </div>

            {/* Assignee dropdown */}
            <select value={newTask.assigneeId} onChange={e => setNewTask(p => ({ ...p, assigneeId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Pilih anggota tim...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>

            {/* Target fields (hanya muncul jika taskType === 'target') */}
            {newTask.taskType === 'target' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Nilai Target</label>
                  <input type="text" value={newTask.targetValue} onChange={e => setNewTask(p => ({ ...p, targetValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Contoh: 100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Satuan</label>
                  <select value={newTask.targetUnit} onChange={e => setNewTask(p => ({ ...p, targetUnit: e.target.value }))}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm">
                    <option value="">Pilih satuan</option>
                    <option value="unit">Unit</option>
                    <option value="%">Persen (%)</option>
                    <option value="Rp">Rupiah (Rp)</option>
                    <option value="kali">Kali</option>
                    <option value="orang">Orang</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600">Batal</button>
              <button onClick={handleCreateTask} disabled={saving || !newTask.title}
                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Buat Tugas'}
              </button>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Memuat tugas...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tasksByStatus.map(col => {
              const Icon = col.icon;
              return (
                <div key={col.value} className={`bg-white rounded-xl border border-gray-200 border-t-4 ${col.color}`}>
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">{col.label}</h3>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {col.tasks.length}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 min-h-[200px]">
                    {col.tasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Tidak ada tugas</p>
                    ) : col.tasks.map(task => {
                      const priorityCfg = PRIORITY_CONFIG[task.priority];
                      const typeCfg = TASK_TYPE_CONFIG[task.taskType] || TASK_TYPE_CONFIG.routine;
                      return (
                        <div key={task.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 hover:border-gray-200 transition-colors">
                          {/* Header: task type badge + delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeCfg.badge}`}>
                                {typeCfg.label}
                              </span>
                              {task.category && (
                                <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                  {task.category}
                                </span>
                              )}
                            </div>
                            <button onClick={() => handleDelete(task.id)}
                              className="p-0.5 text-gray-300 hover:text-red-500 shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Title */}
                          <p className="text-sm font-medium text-gray-900 mt-1">{task.title}</p>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          )}

                          {/* Target progress bar */}
                          {task.taskType === 'target' && task.targetValue && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-[10px] text-purple-700 mb-0.5">
                                <span>Progress Target</span>
                                <span>{task.targetValue}{task.targetUnit || ''}</span>
                              </div>
                              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: '60%' }} />
                              </div>
                            </div>
                          )}

                          {/* Priority + due date + assignee */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityCfg?.color}`}>
                              {priorityCfg?.label || task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.assigneeId && memberMap[task.assigneeId] && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-0.5 ml-auto">
                                <User className="w-2.5 h-2.5" />
                                {memberMap[task.assigneeId]}
                              </span>
                            )}
                          </div>

                          {/* Quick status change buttons */}
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                            {col.value === 'todo' && (
                              <button onClick={() => handleStatusChange(task.id, 'in_progress')}
                                className="flex-1 text-[10px] text-amber-600 hover:bg-amber-50 rounded py-1 transition-colors">
                                Mulai
                              </button>
                            )}
                            {col.value === 'in_progress' && (
                              <>
                                <button onClick={() => handleStatusChange(task.id, 'todo')}
                                  className="flex-1 text-[10px] text-gray-500 hover:bg-gray-100 rounded py-1 transition-colors">
                                  Kembali
                                </button>
                                <button onClick={() => handleStatusChange(task.id, 'done')}
                                  className="flex-1 text-[10px] text-emerald-600 hover:bg-emerald-50 rounded py-1 transition-colors">
                                  Selesai
                                </button>
                              </>
                            )}
                            {col.value === 'done' && (
                              <button onClick={() => handleStatusChange(task.id, 'in_progress')}
                                className="flex-1 text-[10px] text-amber-600 hover:bg-amber-50 rounded py-1 transition-colors">
                                Buka Ulang
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </HumanifyLayout>
  );
}
