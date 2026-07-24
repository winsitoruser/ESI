import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Package, Laptop, Smartphone, CreditCard, Key, ArrowLeftRight,
  ArrowLeft, Plus, UserPlus, X, Loader2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
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
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  assigned: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]',
  returned: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-amber-100 text-amber-700',
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [assignEmpId, setAssignEmpId] = useState('');
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

  const filtered = filter
    ? assets.filter((a) => (filter === 'available' ? a.status === 'available' || a.status === 'returned' : a.status === filter))
    : assets;
  const fmt = (n: number) => (n ? `Rp ${n.toLocaleString('id-ID')}` : '-');

  async function handleCreate(e: React.FormEvent) {
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
      showToast('Aset ditambahkan ke inventori tenant');
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
          employeeName: emp?.name || '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Gagal assign');
      showToast(`Aset di-assign ke ${emp?.name || 'karyawan'}`);
      setAssignTarget(null);
      setAssignEmpId('');
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
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Asset Management" description="Manajemen aset karyawan">
      <HQLayout title="Manajemen Aset" subtitle="Inventori tenant · assign ke database karyawan · return offboarding">
        <div className="space-y-6">
          {toast && (
            <div
              className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
                toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
              }`}
            >
              {toast.msg}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/humanify/employees" className="p-2 border rounded-lg hover:bg-gray-50" title="Database karyawan">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-[color:var(--hf-brand-600)]" /> Manajemen Aset Karyawan
              </h2>
              <p className="text-sm text-gray-500">
                Data live di <code className="text-xs bg-gray-100 px-1 rounded">hris_assets</code> per tenant — di-assign ke karyawan dari Database Karyawan
              </p>
            </div>
            <Link href="/humanify/onboarding" className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Onboarding
            </Link>
            <Link href="/humanify/offboarding" className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Offboarding
            </Link>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--hf-brand-600)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Tambah Aset
            </button>
            <DataSourceBadge source={dataSource} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Aset', value: summary.total || assets.length },
              { label: 'Assigned', value: summary.assigned ?? assets.filter((a) => a.status === 'assigned').length },
              { label: 'Available', value: summary.available ?? assets.filter((a) => a.status === 'available' || a.status === 'returned').length },
              {
                label: 'Total Nilai',
                value: fmt(summary.totalValue || assets.reduce((s: number, a: any) => s + (a.purchaseValue || 0), 0)),
              },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {['', 'assigned', 'available'].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-gray-100'}`}
              >
                {s === '' ? 'Semua' : s === 'assigned' ? 'Assigned (perlu return)' : 'Available'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-800">Belum ada aset di tenant ini</p>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                Inventori kosong adalah perilaku sengaja (bukan data demo). Tambah laptop/HP/ID card, lalu assign ke karyawan dari Database Karyawan.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--hf-brand-600)] px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="w-4 h-4" /> Tambah aset pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => {
                const Icon = CATEGORY_ICONS[a.category] || Package;
                const canAssign = a.status === 'available' || a.status === 'returned';
                return (
                  <div key={a.id} className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[var(--hf-brand-100)] rounded-lg">
                        <Icon className="w-5 h-5 text-[color:var(--hf-brand-600)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{a.assetCode}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>
                            {a.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mt-0.5">{a.name}</h3>
                        {(a.brand || a.serialNumber) && (
                          <p className="text-xs text-gray-500">
                            {[a.brand, a.serialNumber].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {a.assignedToName && (
                          <p className="text-xs text-[color:var(--hf-brand-600)] mt-1 flex items-center gap-1">
                            <ArrowLeftRight className="w-3 h-3" />
                            {a.assignedToName}
                          </p>
                        )}
                        {a.purchaseValue != null && a.purchaseValue > 0 && (
                          <p className="text-xs text-gray-400 mt-1">{fmt(a.purchaseValue)}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {a.status === 'assigned' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReturn(a)}
                          className="flex-1 py-1.5 text-xs border border-[var(--hf-brand-100)] text-[color:var(--hf-brand-600)] rounded-lg hover:bg-[var(--hf-brand-50)] disabled:opacity-50"
                        >
                          Tandai Dikembalikan
                        </button>
                      )}
                      {canAssign && (
                        <button
                          type="button"
                          disabled={busy || employees.length === 0}
                          onClick={() => {
                            setAssignTarget(a);
                            setAssignEmpId('');
                          }}
                          className="flex-1 py-1.5 text-xs bg-[var(--hf-brand-600)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" /> Assign ke karyawan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setShowCreate(false)}>
            <form
              onSubmit={handleCreate}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Tambah aset inventori</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500">Nama *</label>
                <input
                  className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="MacBook Pro 14&quot;"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Kategori</label>
                  <select
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Kode (opsional)</label>
                  <input
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                    value={form.assetCode}
                    onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))}
                    placeholder="Auto LT-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Brand</label>
                  <input
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Serial</label>
                  <input
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.serialNumber}
                    onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Nilai beli (Rp)</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.purchaseValue}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseValue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Tanggal beli</label>
                  <input
                    type="date"
                    className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Catatan</label>
                <input
                  className="mt-0.5 w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[var(--hf-brand-600)] py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Menyimpan…' : 'Simpan ke inventori'}
              </button>
            </form>
          </div>
        )}

        {assignTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setAssignTarget(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Assign: {assignTarget.name}</h3>
                <button type="button" onClick={() => setAssignTarget(null)} className="p-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Pilih karyawan dari Database Karyawan (tenant Anda).</p>
              {employees.length === 0 ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Belum ada karyawan.{' '}
                  <Link href="/humanify/employees" className="underline font-medium">
                    Tambah di Database Karyawan
                  </Link>
                </p>
              ) : (
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={assignEmpId}
                  onChange={(e) => setAssignEmpId(e.target.value)}
                >
                  <option value="">— Pilih karyawan —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code ? `${e.employee_code} · ` : ''}
                      {e.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={busy || !assignEmpId}
                onClick={handleAssign}
                className="w-full rounded-lg bg-[var(--hf-brand-600)] py-2.5 text-sm font-medium text-white disabled:opacity-50"
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
