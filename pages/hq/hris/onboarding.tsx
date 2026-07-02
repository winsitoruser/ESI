import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  UserPlus, Plus, Search, X, CheckCircle, AlertCircle, Clock,
  User, Briefcase, Calendar, Users as UsersIcon, FileText,
  Shield, Mail, Laptop, GraduationCap, Eye, Trash2, BookOpen, Heart
} from 'lucide-react';

interface TaskItem {
  key: string;
  label: string;
  category: string;
  required: boolean;
  completed?: boolean;
  completedAt?: string | null;
  notes?: string;
}

interface OnboardingEntry {
  id: string;
  employeeId: string | number;
  employeeName: string;
  position?: string;
  department?: string;
  joinDate: string;
  buddyName?: string | null;
  status: 'in_progress' | 'completed' | 'paused';
  tasks: TaskItem[];
  notes?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  legal: FileText,
  document: FileText,
  benefit: Heart,
  it: Laptop,
  training: GraduationCap,
  general: User,
  review: BookOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  legal: 'text-purple-600 bg-purple-100',
  document: 'text-blue-600 bg-blue-100',
  benefit: 'text-pink-600 bg-pink-100',
  it: 'text-cyan-600 bg-cyan-100',
  training: 'text-indigo-600 bg-indigo-100',
  general: 'text-gray-600 bg-gray-100',
  review: 'text-green-600 bg-green-100',
};

export default function OnboardingPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OnboardingEntry[]>([]);
  const [template, setTemplate] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<OnboardingEntry | null>(null);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { setMounted(true); fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/lifecycle?action=onboarding');
      const json = await res.json();
      setItems(json?.data || []);
      setTemplate(json?.template || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.employeeId || !form.employeeName) {
      showToast('error', 'Employee ID & Nama wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/hq/hris/lifecycle?action=onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('success', 'Onboarding dibuat');
      setShowModal(false);
      setForm({});
      await fetchAll();
    } catch {
      showToast('error', 'Gagal membuat onboarding');
    }
  }

  async function toggleTask(entry: OnboardingEntry, task: TaskItem) {
    try {
      const res = await fetch(`/api/hq/hris/lifecycle?action=onboarding-task&id=${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskKey: task.key, completed: !task.completed }),
      });
      const json = await res.json();
      if (json?.data) {
        setItems((p) => p.map(i => i.id === entry.id ? json.data : i));
        if (viewing?.id === entry.id) setViewing(json.data);
      }
    } catch {
      showToast('error', 'Gagal update task');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus proses onboarding ini?')) return;
    try {
      await fetch(`/api/hq/hris/lifecycle?action=onboarding&id=${id}`, { method: 'DELETE' });
      setItems(p => p.filter(i => i.id !== id));
      showToast('success', 'Dihapus');
    } catch {
      showToast('error', 'Gagal hapus');
    }
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        i.employeeName?.toLowerCase().includes(q) ||
        String(i.employeeId).toLowerCase().includes(q) ||
        (i.position || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const totalTasks = items.reduce((a, i) => a + (i.tasks?.length || 0), 0);
    const completedTasks = items.reduce((a, i) => a + (i.tasks?.filter(t => t.completed).length || 0), 0);
    return { total: items.length, inProgress, completed, tasksProgress: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0 };
  }, [items]);

  if (!mounted) return null;

  return (
    <HQLayout title="Onboarding Karyawan" subtitle="Kelola proses onboarding karyawan baru dengan checklist terstruktur">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={UserPlus} label="Total Proses" value={stats.total} color="text-blue-600" bg="bg-blue-100" />
          <StatCard icon={Clock} label="Sedang Berjalan" value={stats.inProgress} color="text-orange-600" bg="bg-orange-100" />
          <StatCard icon={CheckCircle} label="Selesai" value={stats.completed} color="text-green-600" bg="bg-green-100" />
          <StatCard icon={Briefcase} label="Progress Task" value={`${stats.tasksProgress}%`} color="text-fuchsia-600" bg="bg-fuchsia-100" />
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari karyawan..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Status</option>
              <option value="in_progress">Sedang Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="paused">Ditunda</option>
            </select>
          </div>
          <button onClick={() => { setForm({}); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Mulai Onboarding
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {loading && <div className="col-span-2 text-center py-12 text-gray-500">Memuat...</div>}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 bg-white border rounded-xl p-12 text-center text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada proses onboarding</p>
            </div>
          )}
          {filtered.map((i) => {
            const totalReq = (i.tasks || []).filter(t => t.required).length;
            const doneReq = (i.tasks || []).filter(t => t.required && t.completed).length;
            const pct = totalReq > 0 ? Math.round(doneReq / totalReq * 100) : 0;
            return (
              <div key={i.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{i.employeeName}</h3>
                    <p className="text-xs text-gray-500">{i.position || '-'} • {i.department || '-'}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" /> Bergabung {i.joinDate}
                      {i.buddyName && <><UsersIcon className="w-3.5 h-3.5 ml-2" /> Buddy: {i.buddyName}</>}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    i.status === 'completed' ? 'bg-green-100 text-green-700' :
                    i.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {i.status === 'completed' ? 'Selesai' : i.status === 'paused' ? 'Ditunda' : 'Berjalan'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Progress {doneReq}/{totalReq} task wajib</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-fuchsia-500 to-purple-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  <button onClick={() => setViewing(i)} className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                    <Eye className="w-4 h-4" /> Detail Checklist
                  </button>
                  <button onClick={() => handleDelete(i.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View modal: checklist */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold">{viewing.employeeName}</h3>
                <p className="text-sm text-gray-500">{viewing.position || '-'} • Join: {viewing.joinDate}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-2">
              {(viewing.tasks || []).map((t) => {
                const Icon = CATEGORY_ICONS[t.category] || User;
                const cColor = CATEGORY_COLORS[t.category] || 'text-gray-600 bg-gray-100';
                return (
                  <label key={t.key} className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer ${t.completed ? 'bg-green-50/40' : ''}`}>
                    <input type="checkbox" checked={!!t.completed} onChange={() => toggleTask(viewing, t)} className="mt-0.5 w-4 h-4 rounded accent-purple-600" />
                    <div className={`p-1.5 rounded-lg ${cColor}`}><Icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.completed ? 'line-through text-gray-400' : ''}`}>
                        {t.label}
                        {t.required && <span className="ml-1 text-xs text-red-500">*</span>}
                      </p>
                      {t.completedAt && <p className="text-xs text-green-600 mt-0.5">Selesai {new Date(t.completedAt).toLocaleDateString('id-ID')}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Mulai Proses Onboarding</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Employee ID *" value={form.employeeId || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, employeeId: v }))} />
                <Input label="Nama Karyawan *" value={form.employeeName || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, employeeName: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Posisi" value={form.position || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, position: v }))} />
                <Input label="Departemen" value={form.department || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, department: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tanggal Bergabung" type="date" value={form.joinDate || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, joinDate: v }))} />
                <Input label="Buddy / Mentor" value={form.buddyName || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, buddyName: v }))} />
              </div>
              <div className="text-xs text-gray-500 bg-blue-50 rounded p-2">
                {template.length} task akan otomatis dibuat berdasarkan template standar onboarding.
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Mulai</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </div>
  );
}
