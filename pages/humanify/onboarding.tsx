import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsPageHero, OpsKpiShell, OpsStage, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import {
  UserPlus, Plus, Search, X, CheckCircle, AlertCircle, Clock,
  User, Briefcase, Calendar, Users as UsersIcon, FileText,
  Shield, Mail, Laptop, GraduationCap, Eye, Trash2, BookOpen, Heart,
  LayoutGrid, Table2,
} from 'lucide-react';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import { getDepartmentLabel } from '@/lib/hris/master-data';

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
  document: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-100)]',
  benefit: 'text-pink-600 bg-pink-100',
  it: 'text-cyan-600 bg-cyan-100',
  training: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-100)]',
  general: 'text-gray-600 bg-gray-100',
  review: 'text-green-600 bg-green-100',
};

export default function OnboardingPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OnboardingEntry[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [template, setTemplate] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [listView, setListView] = useState<'card' | 'table'>('table');
  const [viewing, setViewing] = useState<OnboardingEntry | null>(null);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { setMounted(true); fetchAll(); }, []);

  useEffect(() => {
    if (!viewing) {
      setSelectedAssetIds([]);
      return;
    }
    fetch('/api/humanify/assets?status=available', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setAvailableAssets(j.data || []))
      .catch(() => setAvailableAssets([]));
  }, [viewing?.id]);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/lifecycle?action=onboarding');
      const json = await res.json();
      const rows = json?.data || [];
      setItems(rows);
      setDataSource(rows.length ? 'live' : 'empty');
      setTemplate(json?.template || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.employeeId || !form.employeeName) {
      showToast('error', 'Pilih karyawan dari master data');
      return;
    }
    try {
      const res = await fetch('/api/humanify/lifecycle?action=onboarding', {
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
    const nextCompleted = !task.completed;
    try {
      const body: any = { taskKey: task.key, completed: nextCompleted };
      if (task.key === 'asset_issue' && nextCompleted) {
        if (!selectedAssetIds.length) {
          showToast('error', 'Pilih minimal 1 aset available sebelum menandai serah terima');
          return;
        }
        body.assetIds = selectedAssetIds;
      }
      const res = await fetch(`/api/humanify/lifecycle?action=onboarding-task&id=${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        showToast('error', json.error || 'Gagal update task');
        return;
      }
      if (json?.data) {
        setItems((p) => p.map(i => i.id === entry.id ? json.data : i));
        if (viewing?.id === entry.id) setViewing(json.data);
      }
      const n = json.assetIntegration?.assigned?.length;
      if (n) {
        showToast('success', `${n} aset di-assign ke ${entry.employeeName}`);
        setSelectedAssetIds([]);
        fetch('/api/humanify/assets?status=available', { credentials: 'include' })
          .then((r) => r.json())
          .then((j) => setAvailableAssets(j.data || []))
          .catch(() => {});
      }
    } catch {
      showToast('error', 'Gagal update task');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus proses onboarding ini?')) return;
    try {
      await fetch(`/api/humanify/lifecycle?action=onboarding&id=${id}`, { method: 'DELETE' });
      setItems(p => p.filter(i => i.id !== id));
      setViewing((v) => (v?.id === id ? null : v));
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
      <OpsStage>
        <OpsPageHero
          title="Onboarding Karyawan"
          subtitle="Kelola proses onboarding karyawan baru dengan checklist terstruktur"
          badge="Lifecycle"
          liveLabel="Onboarding desk"
          icon={UserPlus}
          score={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
          scoreLabel="Done"
          chips={[
            { icon: Clock, label: `${stats.inProgress} sedang berjalan`, tone: 'text-amber-700' },
            { icon: CheckCircle, label: `${stats.completed} selesai`, tone: 'text-emerald-700' },
            { icon: Briefcase, label: `${stats.tasksProgress}% progress task`, tone: 'text-[color:var(--hf-brand-600)]' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button
                type="button"
                onClick={() => { setForm({}); setShowModal(true); }}
                className="hf-btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Mulai Onboarding
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OpsKpiShell>
            <HRStatCard icon={UserPlus} label="Total Proses" value={stats.total} accent="violet" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={Clock} label="Sedang Berjalan" value={stats.inProgress} accent="orange" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={CheckCircle} label="Selesai" value={stats.completed} accent="emerald" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={Briefcase} label="Progress Task" value={`${stats.tasksProgress}%`} accent="violet" />
          </OpsKpiShell>
        </div>

        <OpsToolbar>
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hf-input w-full pl-9"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="hf-input">
              <option value="all">Semua Status</option>
              <option value="in_progress">Sedang Berjalan</option>
              <option value="completed">Selesai</option>
              <option value="paused">Ditunda</option>
            </select>
          </div>
          <ViewToggle value={listView} onChange={setListView} />
        </OpsToolbar>

        {!loading && filtered.length === 0 ? (
          <HrisEmptyState
            title="Belum ada proses onboarding"
            description="Mulai proses onboarding untuk karyawan baru dengan checklist terstruktur."
            source={dataSource}
            action={(
              <button type="button" onClick={() => { setForm({}); setShowModal(true); }} className="hf-btn-primary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Mulai Onboarding
              </button>
            )}
          />
        ) : listView === 'table' ? (
          <div className="hf-table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Jabatan</th>
                  <th>Departemen</th>
                  <th>Bergabung</th>
                  <th>Buddy</th>
                  <th className="text-right">Progress</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [0, 1, 2, 3, 4].map((n) => (
                    <tr key={n}>
                      <td colSpan={8}><div className="h-8 animate-pulse rounded-md bg-[var(--hf-surface-muted)]" /></td>
                    </tr>
                  ))
                  : filtered.map((i) => {
                    const { doneReq, totalReq, pct } = requiredProgress(i.tasks);
                    return (
                      <tr key={i.id}>
                        <td>
                          <p className="font-medium text-[color:var(--hf-ink)]">{i.employeeName}</p>
                          <p className="text-xs text-[color:var(--hf-ink-faint)]">{i.employeeId || '—'}</p>
                        </td>
                        <td>{i.position || '—'}</td>
                        <td>{i.department || '—'}</td>
                        <td className="whitespace-nowrap tabular-nums">{i.joinDate || '—'}</td>
                        <td>{i.buddyName || '—'}</td>
                        <td className="text-right">
                          <span className="tabular-nums font-medium">{pct}%</span>
                          <span className="ml-1 text-xs text-[color:var(--hf-ink-faint)]">{doneReq}/{totalReq}</span>
                        </td>
                        <td><StatusPill status={i.status} /></td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => setViewing(i)} className="hf-btn-secondary inline-flex items-center gap-1 !px-2.5 !py-1 text-xs">
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </button>
                            <button type="button" onClick={() => handleDelete(i.id)} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-danger)] hover:bg-rose-50" aria-label="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {loading && (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-40 animate-pulse rounded-[var(--hf-radius-xl)] bg-[var(--hf-surface-muted)]" />
                ))}
              </>
            )}
            {filtered.map((i) => {
              const { doneReq, totalReq, pct } = requiredProgress(i.tasks);
              return (
                <div key={i.id} className="hf-tile hf-tile-interactive relative overflow-hidden p-5">
                  <div className="hf-analytics-panel__rail" aria-hidden />
                  <div className="pl-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-[color:var(--hf-ink)]">{i.employeeName}</h3>
                        <p className="text-xs text-[color:var(--hf-ink-muted)]">{i.position || '—'} · {i.department || '—'}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--hf-ink-faint)]">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Bergabung {i.joinDate}</span>
                          {i.buddyName && <span className="flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> Buddy: {i.buddyName}</span>}
                        </p>
                      </div>
                      <StatusPill status={i.status} />
                    </div>
                    <div className="space-y-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[color:var(--hf-ink-muted)]">Progress {doneReq}/{totalReq} task wajib</span>
                        <span className="font-semibold tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                        <div className={`h-full transition-all ${pct === 100 ? 'bg-[var(--hf-success)]' : 'bg-[var(--hf-brand-600)]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-[var(--hf-border-subtle)] pt-3">
                      <button type="button" onClick={() => setViewing(i)} className="hf-btn-secondary inline-flex items-center gap-1 !px-3 !py-1.5 text-sm">
                        <Eye className="h-4 w-4" /> Detail
                      </button>
                      <button type="button" onClick={() => handleDelete(i.id)} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-danger)] hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </OpsStage>

      {/* View modal: checklist */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="hf-card max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  <div key={t.key} className={`rounded-lg border ${t.completed ? 'bg-green-50/40' : ''}`}>
                    <label className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer">
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
                    {t.key === 'asset_issue' && !t.completed && (
                      <div className="px-3 pb-3 pl-12 space-y-2">
                        <p className="text-xs text-gray-500">
                          Pilih aset dari inventori lalu centang task —{' '}
                          <a href="/humanify/assets" className="text-[color:var(--hf-brand-600)] underline">Manajemen Aset</a>
                        </p>
                        {availableAssets.length === 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                            Belum ada aset available. Tambah dulu di Manajemen Aset.
                          </p>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
                            {availableAssets.map((a) => (
                              <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedAssetIds.includes(a.id)}
                                  onChange={(e) => {
                                    setSelectedAssetIds((prev) =>
                                      e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                                    );
                                  }}
                                />
                                <span className="font-mono text-gray-400">{a.assetCode}</span>
                                <span className="font-medium truncate">{a.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="hf-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Mulai Proses Onboarding</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <EmployeePicker
                label="Karyawan"
                required
                value={form.employeeId || ''}
                onChange={(emp: PickedEmployee | null) => {
                  if (!emp) {
                    setForm({});
                    return;
                  }
                  setForm({
                    employeeId: emp.id,
                    employeeUid: emp.employee_id,
                    employeeName: emp.name,
                    position: emp.position,
                    department: emp.department,
                    departmentLabel: emp.department_label,
                    branchName: emp.branch_name,
                    workLocation: emp.work_location,
                    joinDate: emp.join_date || new Date().toISOString().slice(0, 10),
                  });
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="UID" value={form.employeeUid || '-'} />
                <ReadOnlyField label="Posisi" value={form.position || '-'} />
                <ReadOnlyField label="Departemen" value={form.departmentLabel || getDepartmentLabel(form.department) || '-'} />
                <ReadOnlyField label="Cabang / Lokasi" value={form.branchName || '-'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tanggal Bergabung" type="date" value={form.joinDate || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, joinDate: v }))} />
                <Input label="Buddy / Mentor" value={form.buddyName || ''} onChange={(v: string) => setForm((f: any) => ({ ...f, buddyName: v }))} />
              </div>
              <div className="text-xs text-gray-500 bg-[var(--hf-brand-50)] rounded p-2">
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

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-gray-500">{label}</label>
      <p className="text-sm text-gray-800 px-3 py-2 bg-gray-50 border rounded-lg">{value}</p>
    </div>
  );
}

function requiredProgress(tasks: TaskItem[] | undefined) {
  const list = tasks || [];
  const totalReq = list.filter((t) => t.required).length;
  const doneReq = list.filter((t) => t.required && t.completed).length;
  const pct = totalReq > 0 ? Math.round((doneReq / totalReq) * 100) : 0;
  return { totalReq, doneReq, pct };
}

function StatusPill({ status }: { status: OnboardingEntry['status'] }) {
  const cls =
    status === 'completed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'paused'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]';
  const label = status === 'completed' ? 'Selesai' : status === 'paused' ? 'Ditunda' : 'Berjalan';
  return <span className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function ViewToggle({ value, onChange }: { value: 'card' | 'table'; onChange: (v: 'card' | 'table') => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white p-0.5" role="group" aria-label="Tampilan daftar">
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`inline-flex items-center gap-1.5 rounded-[calc(var(--hf-radius)-2px)] px-2.5 py-1.5 text-xs font-medium ${
          value === 'table' ? 'bg-[var(--hf-brand-600)] text-white' : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
        }`}
        aria-pressed={value === 'table'}
      >
        <Table2 className="h-3.5 w-3.5" /> Tabel
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`inline-flex items-center gap-1.5 rounded-[calc(var(--hf-radius)-2px)] px-2.5 py-1.5 text-xs font-medium ${
          value === 'card' ? 'bg-[var(--hf-brand-600)] text-white' : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
        }`}
        aria-pressed={value === 'card'}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Kartu
      </button>
    </div>
  );
}
