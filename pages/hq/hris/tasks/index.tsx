import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Plus, RefreshCw, CheckCircle, Clock, AlertCircle,
  Target, Calendar, User, ArrowRight, Trash2,
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
  createdAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
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
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/team-tasks?limit=100');
      const json = await res.json();
      if (json.success) setTasks(json.data || []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreateTask = async () => {
    if (!newTask.title) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/hq/hris/team-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Task created');
        setTasks(prev => [json.data, ...prev]);
        setNewTask({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
        setShowNew(false);
      } else {
        toast.error(json.error || 'Failed');
      }
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hq/hris/team-tasks?id=${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
        toast.success(`Task ${newStatus === 'done' ? 'completed' : 'moved to ' + newStatus}`);
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/hq/hris/team-tasks?id=${taskId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success('Task deleted');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const tasksByStatus = STATUS_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.value).sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    }),
  }));

  return (
    <HQLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">Task management for SIMESI team</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchTasks()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Refresh">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>

        {/* New Task Form */}
        {showNew && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-medium text-gray-900">New Task</h3>
            <input type="text" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Task title *" />
            <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={2} placeholder="Description (optional)" />
            <div className="grid grid-cols-3 gap-3">
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Due date" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreateTask} disabled={saving || !newTask.title}
                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading tasks...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
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
                      <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
                    ) : col.tasks.map(task => {
                      const priorityCfg = PRIORITY_CONFIG[task.priority];
                      return (
                        <div key={task.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <button onClick={() => handleDelete(task.id)}
                              className="p-0.5 text-gray-300 hover:text-red-500 shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityCfg?.color}`}>
                              {priorityCfg?.label || task.priority}
                            </span>
                            <div className="flex items-center gap-1">
                              {task.dueDate && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Quick status change buttons */}
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                            {col.value === 'todo' && (
                              <button onClick={() => handleStatusChange(task.id, 'in_progress')}
                                className="flex-1 text-[10px] text-amber-600 hover:bg-amber-50 rounded py-1 transition-colors">
                                Start
                              </button>
                            )}
                            {col.value === 'in_progress' && (
                              <>
                                <button onClick={() => handleStatusChange(task.id, 'todo')}
                                  className="flex-1 text-[10px] text-gray-500 hover:bg-gray-100 rounded py-1 transition-colors">
                                  Back
                                </button>
                                <button onClick={() => handleStatusChange(task.id, 'done')}
                                  className="flex-1 text-[10px] text-emerald-600 hover:bg-emerald-50 rounded py-1 transition-colors">
                                  Complete
                                </button>
                              </>
                            )}
                            {col.value === 'done' && (
                              <button onClick={() => handleStatusChange(task.id, 'in_progress')}
                                className="flex-1 text-[10px] text-amber-600 hover:bg-amber-50 rounded py-1 transition-colors">
                                Reopen
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
    </HQLayout>
  );
}
