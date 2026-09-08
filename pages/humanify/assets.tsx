import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import { OpsKpiShell, OpsPageHero, OpsStage, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Package, Laptop, Smartphone, CreditCard, Key, ArrowLeftRight,
  Plus, UserPlus, X, Loader2, Search, Users, RotateCcw,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Package> = {
  laptop: Laptop, phone: Smartphone, id_card: CreditCard, access_card: Key, other: Package, uniform: Package, vehicle: Package,
};
const CATEGORIES = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'phone', label: 'HP / Phone' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'access_card', label: 'Access Card' },
  { value: 'uniform', label: 'Seragam' },
  { value: 'vehicle', label: 'Kendaraan' },
  { value: 'other', label: 'Lainnya' },
];
const STATUS_LABEL: Record<string, string> = {
  available: 'Tersedia',
  assigned: 'Dipakai',
  returned: 'Dikembalikan',
  maintenance: 'Perawatan',
};
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  assigned: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] border-[var(--hf-brand-100)]',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
  maintenance: 'bg-amber-50 text-amber-800 border-amber-100',
};

type Emp = { id: string; name: string; employee_code?: string };

const emptyForm = {
  name: '',
  category: 'laptop',
  assetCode: '',
  brand: '',
  serialNumber: '',
  purchaseValue: '',
  purchaseDate: '',
  notes: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignEmp, setAssignEmp] = useState<PickedEmployee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        fetch('/api/humanify/assets', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/humanify/assets?action=summary', { credentials: 'include' }).then((r) => r.json()),
      ]);
      const rows = a.data || [];
      setAssets(rows);
      setSummary(s.data || {});
      setDataSource((a.dataSource || (rows.length ? 'live' : 'empty')) as HrisDataSource);
    } catch {
      setAssets([]);
      setDataSource('empty');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/humanify/employees?action=list&limit=500', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        const list = data.employees || data || [];
        setEmployees(
          (Array.isArray(list) ? list : []).map((e: any) => ({
            id: String(e.id),
            name: e.name || e.full_name || e.employee_name || e.email || String(e.id),
            employee_code: e.employeeId || e.employee_code || e.nip,
          })),
        );
      })
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      setShowCreate(false);
      setAssignTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter === 'available' && !(a.status === 'available' || a.status === 'returned')) return false;
      if (filter && filter !== 'available' && a.status !== filter) return false;
      if (category && a.category !== category) return false;
      if (!term) return true;
      const hay = [a.name, a.assetCode, a.brand, a.serialNumber, a.assignedToName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [assets, filter, category, search]);

  const fmt = (n: number) => (n ? `Rp ${n.toLocaleString('id-ID')}` : '—');
  const totalValue = summary.totalValue || assets.reduce((s: number, a: any) => s + (a.purchaseValue || 0), 0);
  const assignedCount = summary.assigned ?? assets.filter((a) => a.status === 'assigned').length;
  const availableCount = summary.available ?? assets.filter((a) => a.status === 'available' || a.status === 'returned').length;
  const health = assets.length
    ? Math.round((availableCount / Math.max(assets.length, 1)) * 100)
    : null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama aset wajib diisi', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/humanify/assets?action=create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          assetCode: form.assetCode.trim() || undefined,
          brand: form.brand.trim() || undefined,
          serialNumber: form.serialNumber.trim() || undefined,
          purchaseDate: form.purchaseDate || undefined,
          purchaseValue: form.purchaseValue ? Number(form.purchaseValue) : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Gagal menyimpan');
      showToast('Aset ditambahkan ke inventori');
      setShowCreate(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan', 'error');
    }
    setBusy(false);
  }

  async function handleAssign() {
    if (!assignTarget || !assignEmpId) {
      showToast('Pilih karyawan', 'error');
      return;
    }
    const emp = employees.find((e) => e.id === assignEmpId);
    setBusy(true);
    try {
      const res = await fetch(`/api/humanify/assets?action=assign&id=${encodeURIComponent(assignTarget.id)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignEmpId,
          employeeName: assignEmp?.name || emp?.name || '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Gagal assign');
      showToast(`Aset di-assign ke ${assignEmp?.name || emp?.name || 'karyawan'}`);
      setAssignTarget(null);
      setAssignEmpId('');
      setAssignEmp(null);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Gagal assign', 'error');
    }
    setBusy(false);
  }

  async function handleReturn(asset: any) {
    if (!confirm(`Kembalikan "${asset.name}" ke inventori?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/humanify/assets?action=return&id=${encodeURIComponent(asset.id)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: 'good' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Gagal return');
      showToast('Aset dikembalikan — siap di-assign lagi');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Gagal return', 'error');
    }
    setBusy(false);
  }

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Manajemen Aset" description="Inventori aset karyawan">
      <HQLayout title="Manajemen Aset" subtitle="Inventori tenant · assign ke karyawan · return offboarding">
        <OpsStage>
          {toast && (
            <div
              role="status"
              className={`fixed right-4 top-4 z-[60] rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
                toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {toast.msg}
            </div>
          )}

          <OpsPageHero
            title="Manajemen Aset Karyawan"
            subtitle="Inventori per tenant — assign laptop, HP, dan kartu akses ke database karyawan, lalu tandai dikembalikan saat offboarding."
            badge="Karyawan"
            liveLabel="People ops"
            icon={Package}
            chips={[
              { label: `${summary.total || assets.length} aset` },
              { label: `${assignedCount} dipakai` },
              { label: `${availableCount} tersedia` },
            ]}
            score={health}
            scoreLabel="Tersedia"
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <DataSourceBadge source={dataSource} />
                <Link href="/humanify/employees" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4" /> Database karyawan
                </Link>
                <Link href="/humanify/offboarding" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                  Offboarding
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm);
                    setShowCreate(true);
                  }}
                  className="hf-btn-primary inline-flex items-center gap-1.5 text-sm"
                >
                  <Plus className="h-4 w-4" /> Tambah aset
                </button>
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <OpsKpiShell>
              <HRStatCard icon={Package} label="Total aset" value={summary.total || assets.length} accent="violet" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard
                icon={UserPlus}
                label="Dipakai karyawan"
                value={assignedCount}
                accent="blue"
                onClick={() => setFilter('assigned')}
              />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard
                icon={RotateCcw}
                label="Siap di-assign"
                value={availableCount}
                accent="emerald"
                onClick={() => setFilter('available')}
              />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Laptop} label="Nilai beli" value={fmt(totalValue)} accent="amber" />
            </OpsKpiShell>
          </div>

          <OpsToolbar>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
                <input
                  className="hf-input w-full pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, kode, serial, atau pemegang…"
                />
              </div>
              <select className="hf-input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Semua kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: '', label: 'Semua' },
                  { id: 'assigned', label: 'Dipakai' },
                  { id: 'available', label: 'Tersedia' },
                ].map((s) => (
                  <button
                    key={s.id || 'all'}
                    type="button"
                    onClick={() => setFilter(s.id)}
                    className={`rounded-[var(--hf-radius)] px-3 py-1.5 text-sm font-medium ${
                      filter === s.id
                        ? 'bg-[var(--hf-brand-600)] text-white'
                        : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-ink)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Link href="/humanify/onboarding" className="hf-btn-secondary text-sm">Onboarding</Link>
          </OpsToolbar>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--hf-ink-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat inventori…
            </div>
          ) : assets.length === 0 ? (
            <HrisEmptyState
              source={dataSource}
              title="Belum ada aset di tenant ini"
              description="Inventori kosong adalah perilaku sengaja (bukan data demo). Tambah laptop, HP, atau kartu akses, lalu assign ke karyawan dari Database Karyawan."
              action={(
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={() => setShowCreate(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                    <Plus className="h-4 w-4" /> Tambah aset pertama
                  </button>
                  <Link href="/humanify/employees" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                    Database karyawan
                  </Link>
                </div>
              )}
            />
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-[color:var(--hf-ink-muted)]">Tidak ada aset yang cocok dengan filter.</p>
          ) : (
            <div className="hf-table-wrap">
              <table className="hf-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Aset</th>
                    <th className="text-left">Kategori</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Pemegang</th>
                    <th className="text-right">Nilai</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const Icon = CATEGORY_ICONS[a.category] || Package;
                    const canAssign = a.status === 'available' || a.status === 'returned';
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-[color:var(--hf-ink)]">{a.name}</p>
                              <p className="font-mono text-[11px] text-[color:var(--hf-ink-faint)]">
                                {a.assetCode || '—'}
                                {a.serialNumber ? ` · ${a.serialNumber}` : ''}
                                {a.brand ? ` · ${a.brand}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="capitalize text-[color:var(--hf-ink-muted)]">
                          {CATEGORIES.find((c) => c.value === a.category)?.label || a.category}
                        </td>
                        <td>
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABEL[a.status] || a.status}
                          </span>
                        </td>
                        <td>
                          {a.assignedToName ? (
                            <span className="inline-flex items-center gap-1 text-[color:var(--hf-brand-600)]">
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              {a.assignedToName}
                            </span>
                          ) : (
                            <span className="text-[color:var(--hf-ink-faint)]">—</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums text-[color:var(--hf-ink-muted)]">{fmt(a.purchaseValue || 0)}</td>
                        <td className="text-right">
                          <div className="inline-flex gap-1.5">
                            {a.status === 'assigned' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleReturn(a)}
                                className="hf-btn-secondary px-2.5 py-1 text-xs disabled:opacity-50"
                              >
                                Kembalikan
                              </button>
                            )}
                            {canAssign && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setAssignTarget(a);
                                  setAssignEmpId('');
                                  setAssignEmp(null);
                                }}
                                className="hf-btn-primary inline-flex items-center gap-1 px-2.5 py-1 text-xs disabled:opacity-50"
                              >
                                <UserPlus className="h-3 w-3" /> Assign
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </OpsStage>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setShowCreate(false)}>
            <form
              onSubmit={handleCreate}
              className="hf-card w-full max-w-md space-y-3 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Tambah aset inventori</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-xs text-[color:var(--hf-ink-muted)]">Nama *</label>
                <input
                  className="hf-input mt-0.5 w-full"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='MacBook Pro 14"'
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Kategori</label>
                  <select
                    className="hf-input mt-0.5 w-full"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Kode (opsional)</label>
                  <input
                    className="hf-input mt-0.5 w-full font-mono"
                    value={form.assetCode}
                    onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))}
                    placeholder="Auto LT-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Brand</label>
                  <input className="hf-input mt-0.5 w-full" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Serial</label>
                  <input className="hf-input mt-0.5 w-full" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Nilai beli (Rp)</label>
                  <input
                    type="number"
                    className="hf-input mt-0.5 w-full"
                    value={form.purchaseValue}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseValue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[color:var(--hf-ink-muted)]">Tanggal beli</label>
                  <input
                    type="date"
                    className="hf-input mt-0.5 w-full"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[color:var(--hf-ink-muted)]">Catatan</label>
                <input className="hf-input mt-0.5 w-full" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <button type="submit" disabled={busy} className="hf-btn-primary w-full disabled:opacity-50">
                {busy ? 'Menyimpan…' : 'Simpan ke inventori'}
              </button>
            </form>
          </div>
        )}

        {assignTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setAssignTarget(null)}>
            <div className="hf-card w-full max-w-md space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Assign: {assignTarget.name}</h3>
                <button type="button" onClick={() => setAssignTarget(null)} className="rounded p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-[color:var(--hf-ink-muted)]">Pilih karyawan dari Database Karyawan (tenant Anda).</p>
              <EmployeePicker
                value={assignEmpId}
                onChange={(emp) => {
                  setAssignEmp(emp);
                  setAssignEmpId(emp?.id || '');
                }}
                label="Karyawan"
                required
                placeholder="Cari nama, UID, atau departemen…"
              />
              <button
                type="button"
                disabled={busy || !assignEmpId}
                onClick={handleAssign}
                className="hf-btn-primary w-full disabled:opacity-50"
              >
                {busy ? 'Memproses…' : 'Assign aset'}
              </button>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
