import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  KeyRound, Plus, Search, X, CheckCircle, AlertCircle, Clock,
  User, Briefcase, Calendar, FileText, Laptop, DollarSign,
  Eye, Trash2, ShieldCheck, Receipt, MessageSquare, Heart
} from 'lucide-react';

interface TaskItem {
  key: string;
  label: string;
  category: string;
  required: boolean;
  completed?: boolean;
  completedAt?: string | null;
}

interface OffEntry {
  id: string;
  employeeId: string | number;
  employeeName: string;
  position?: string;
  department?: string;
  resignDate: string;
  lastWorkingDate?: string | null;
  reason?: string;
  reasonCategory: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'other';
  status: 'in_progress' | 'completed' | 'paused';
  tasks: TaskItem[];
  exitInterviewNotes?: string;
  rehireable?: boolean;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  resignation: { label: 'Resign', color: 'bg-blue-100 text-blue-700' },
  termination: { label: 'PHK', color: 'bg-red-100 text-red-700' },
  retirement: { label: 'Pensiun', color: 'bg-purple-100 text-purple-700' },
  contract_end: { label: 'Akhir Kontrak', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Lainnya', color: 'bg-gray-100 text-gray-600' },
};

const CATEGORY_ICONS: Record<string, any> = {
  legal: FileText,
  hr: User,
  work: Briefcase,
  it: Laptop,
  finance: DollarSign,
  benefit: Heart,
  tax: Receipt,
};

const CATEGORY_COLORS: Record<string, string> = {
  legal: 'text-purple-600 bg-purple-100',
  hr: 'text-blue-600 bg-blue-100',
  work: 'text-orange-600 bg-orange-100',
  it: 'text-cyan-600 bg-cyan-100',
  finance: 'text-green-600 bg-green-100',
  benefit: 'text-pink-600 bg-pink-100',
  tax: 'text-amber-600 bg-amber-100',
};

export default function OffboardingPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OffEntry[]>([]);
  const [template, setTemplate] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<OffEntry | null>(null);
  const [form, setForm] = useState<any>({ reasonCategory: 'resignation' });
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { setMounted(true); fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/lifecycle?action=offboarding');
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
      const res = await fetch('/api/hq/hris/lifecycle?action=offboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('success', 'Offboarding dibuat');
      setShowModal(false);
      setForm({ reasonCategory: 'resignation' });
      await fetchAll();
    } catch {
      showToast('error', 'Gagal membuat offboarding');
    }
  }

  async function toggleTask(entry: OffEntry, task: TaskItem) {
    try {
      const res = await fetch(`/api/hq/hris/lifecycle?action=offboarding-task&id=${entry.id}`, {
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
    if (!confirm('Hapus proses offboarding ini?')) return;
    try {
      await fetch(`/api/hq/hris/lifecycle?action=offboarding&id=${id}`, { method: 'DELETE' });
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
      const matchReason = reasonFilter === 'all' || i.reasonCategory === reasonFilter;
      return matchSearch && matchStatus && matchReason;
    });
  }, [items, searchQuery, statusFilter, reasonFilter]);

  const stats = useMemo(() => {
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const byReason: Record<string, number> = {};
    items.forEach((i) => { byReason[i.reasonCategory] = (byReason[i.reasonCategory] || 0) + 1; });
    return { total: items.length, inProgress, completed, topReason: Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]?.[0] };
  }, [items]);

  if (!mounted) return null;

  return (
    <HQLayout title="Offboarding / Exit" subtitle="Proses pengunduran diri, exit clearance, dan retensi data karyawan">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={KeyRound} label="Total Proses" value={stats.total} color="text-red-600" bg="bg-red-100" />
          <StatCard icon={Clock} label="Sedang Proses" value={stats.inProgress} color="text-orange-600" bg="bg-orange-100" />
          <StatCard icon={CheckCircle} label="Selesai" value={stats.completed} color="text-green-600" bg="bg-green-100" />
          <StatCard icon={ShieldCheck} label="Alasan Utama" value={stats.topReason ? REASON_LABELS[stats.topReason]?.label || '-' : '-'} color="text-purple-600" bg="bg-purple-100" />
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
              <option value="in_progress">Sedang Proses</option>
              <option value="completed">Selesai</option>
              <option value="paused">Ditunda</option>
            </select>
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Alasan</option>
              {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button onClick={() => { setForm({ reasonCategory: 'resignation' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Mulai Offboarding
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {loading && <div className="col-span-2 text-center py-12 text-gray-500">Memuat...</div>}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 bg-white border rounded-xl p-12 text-center text-gray-500">
              <KeyRound className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada proses offboarding</p>
            </div>
          )}
          {filtered.map((i) => {
            const totalReq = (i.tasks || []).filter(t => t.required).length;
            const doneReq = (i.tasks || []).filter(t => t.required && t.completed).length;
            const pct = totalReq > 0 ? Math.round(doneReq / totalReq * 100) : 0;
            const rConf = REASON_LABELS[i.reasonCategory] || REASON_LABELS.other;
            return (
              <div key={i.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{i.employeeName}</h3>
                    <p className="text-xs text-gray-500">{i.position || '-'} • {i.department || '-'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rConf.color}`}>{rConf.label}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Resign {i.resignDate}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    i.status === 'completed' ? 'bg-green-100 text-green-700' :
                    i.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {i.status === 'completed' ? 'Selesai' : i.status === 'paused' ? 'Ditunda' : 'Proses'}
                  </span>
                </div>
                {i.reason && <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mb-3 line-clamp-2">"{i.reason}"</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Clearance {doneReq}/{totalReq} task wajib</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  <button onClick={() => setViewing(i)} className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                    <Eye className="w-4 h-4" /> Checklist Exit
                  </button>
                  <button onClick={() => handleDelete(i.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold">{viewing.employeeName}</h3>
                <p className="text-sm text-gray-500">
                  {viewing.position || '-'} • Resign: {viewing.resignDate}
                  {viewing.lastWorkingDate && ` • Last day: ${viewing.lastWorkingDate}`}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {viewing.reason && (
              <div className="px-5 pt-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-medium flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Alasan:</p>
                  <p className="mt-1 text-gray-700">{viewing.reason}</p>
                </div>
              </div>
            )}
            <div className="p-5 space-y-2">
              {(viewing.tasks || []).map((t) => {
                const Icon = CATEGORY_ICONS[t.category] || FileText;
                const cColor = CATEGORY_COLORS[t.category] || 'text-gray-600 bg-gray-100';
                return (
                  <label key={t.key} className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer ${t.completed ? 'bg-green-50/40' : ''}`}>
                    <input type="checkbox" checked={!!t.completed} onChange={() => toggleTask(viewing, t)} className="mt-0.5 w-4 h-4 rounded accent-red-600" />
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
              <h3 className="text-lg font-bold">Mulai Proses Offboarding</h3>
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
                <Input label="Tanggal Pengajuan" type="date" value={form.resignDate || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, resignDate: v }))} />
                <Input label="Hari Kerja Terakhir" type="date" value={form.lastWorkingDate || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, lastWorkingDate: v }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kategori Alasan</label>
                <select value={form.reasonCategory || 'resignation'} onChange={(e) => setForm((f: any) => ({ ...f, reasonCategory: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Alasan / Catatan</label>
                <textarea value={form.reason || ''} onChange={(e) => setForm((f: any) => ({ ...f, reason: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="text-xs text-gray-500 bg-red-50 rounded p-2">
                {template.length} task exit clearance akan otomatis dibuat.
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Mulai</button>
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
