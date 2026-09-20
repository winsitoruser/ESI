import { useState, useEffect, useCallback, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import { OpsKpiShell, OpsPanel, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import { PayrollShell, type PayrollNavId } from '@/components/humanify/PayrollModuleChrome';
import {
  Gift, Wallet, CreditCard, Plus, Check, X, Clock, Search, RefreshCw, Banknote,
} from 'lucide-react';

const ICONS = { gift: Gift, wallet: Wallet, credit: CreditCard } as const;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-50 text-[color:var(--hf-warning)]' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-[color:var(--hf-success)]' },
  active: { label: 'Aktif', className: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' },
  paid: { label: 'Dibayar', className: 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]' },
  rejected: { label: 'Ditolak', className: 'bg-rose-50 text-[color:var(--hf-danger)]' },
  completed: { label: 'Selesai', className: 'bg-emerald-50 text-[color:var(--hf-success)]' },
};

const NAV_FOR_TYPE: Record<string, PayrollNavId> = {
  bonus: 'bonus',
  cash_advance: 'kasbon',
  loan: 'loan',
};

interface Props {
  type: 'bonus' | 'cash_advance' | 'loan';
  title: string;
  subtitle: string;
  icon: keyof typeof ICONS;
  categories: string[];
  showInstallment?: boolean;
  categoryLabels?: Record<string, string>;
}

export default function PayrollInputPage({ type, title, subtitle, icon, categories, showInstallment, categoryLabels }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ category: categories[0] || 'other', installmentMonths: type === 'cash_advance' ? 1 : 6 });
  const Icon = ICONS[icon] || Gift;
  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const labelCat = (c: string) => categoryLabels?.[c] || c;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/humanify/payroll-inputs?type=${type}`);
      const j = await r.json();
      const rows = j.data || [];
      setItems(rows);
      setDataSource(rows.length ? 'live' : 'empty');
    } catch { setItems([]); setDataSource('empty'); }
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/humanify/payroll-inputs?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const earlySettle = async (id: string) => {
    if (!confirm('Lunasi dini? Sisa saldo akan di-nol-kan dan status menjadi Selesai.')) return;
    await fetch(`/api/humanify/payroll-inputs?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle' }),
    });
    load();
  };

  const handleCreate = async () => {
    if (!form.employeeId || !form.employeeName || !form.amount) return;
    setSaving(true);
    try {
      const months = Number(form.installmentMonths || 0);
      const amount = Number(form.amount);
      const useInstallment = Boolean(showInstallment && months >= 1);
      await fetch('/api/humanify/payroll-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          employeeId: form.employeeId,
          employeeUid: form.employeeUid,
          employeeName: form.employeeName,
          department: form.department,
          amount,
          reason: form.reason,
          category: form.category,
          installmentMonths: useInstallment ? months : undefined,
          installmentAmount: useInstallment && months ? Math.round(amount / months) : undefined,
          remainingAmount: type === 'cash_advance' || type === 'loan' || useInstallment ? amount : undefined,
          status: 'pending',
        }),
      });
      setShowCreate(false);
      setForm({ category: categories[0] || 'other', installmentMonths: type === 'cash_advance' ? 1 : 6 });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchQ = !q || [i.employeeName, i.department, i.reason, i.category].some((v) => String(v || '').toLowerCase().includes(q));
      let matchS = true;
      if (statusFilter === 'all') matchS = true;
      else if (statusFilter === 'active') matchS = ['approved', 'active'].includes(i.status);
      else if (statusFilter === 'completed') matchS = ['completed', 'paid'].includes(i.status);
      else matchS = i.status === statusFilter;
      return matchQ && matchS;
    });
  }, [items, query, statusFilter]);

  const pending = items.filter((i) => i.status === 'pending');
  const activeCount = items.filter((i) => ['approved', 'active'].includes(i.status)).length;
  const completedCount = items.filter((i) => i.status === 'completed' || i.status === 'paid').length;
  const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const outstanding = items
    .filter((i) => ['approved', 'active'].includes(i.status))
    .reduce((s, i) => s + Number(i.remainingAmount != null ? i.remainingAmount : i.amount || 0), 0);
  const showBalanceCols = Boolean(showInstallment || type === 'cash_advance' || type === 'loan');
  const approveStatus = type === 'loan' ? 'active' : 'approved';
  const showStatusChips = type === 'cash_advance' || type === 'loan';

  return (
    <PageGuard anyPermission={['payroll.view', 'payroll.*']} title={title} description={subtitle}>
      <HQLayout title={title} subtitle={subtitle}>
        <PayrollShell
          current={NAV_FOR_TYPE[type]}
          title={title}
          subtitle={subtitle}
          icon={Icon}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={load} className="hf-btn-secondary inline-flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
              </button>
              <button type="button" onClick={() => setShowCreate(true)} className="hf-btn-primary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Tambah
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsKpiShell><HRStatCard icon={Icon} label="Total catatan" value={items.length} accent="violet" /></OpsKpiShell>
            <OpsKpiShell>
              <button type="button" className="w-full text-left" onClick={() => setStatusFilter('pending')} aria-label="Filter menunggu">
                <HRStatCard icon={Clock} label="Menunggu persetujuan" value={pending.length} accent="amber" />
              </button>
            </OpsKpiShell>
            <OpsKpiShell><HRStatCard icon={Wallet} label="Total nominal" value={fmt(totalAmount)} accent="emerald" /></OpsKpiShell>
            {(type === 'cash_advance' || type === 'loan') && (
              <OpsKpiShell>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setStatusFilter('active')}
                  aria-label="Filter outstanding aktif"
                >
                  <HRStatCard icon={CreditCard} label="Saldo outstanding" value={fmt(outstanding)} accent="rose" />
                </button>
              </OpsKpiShell>
            )}
          </div>

          <div className="rounded-[var(--hf-radius-xl)] border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-brand-600)] flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {type === 'cash_advance'
                ? <>Kasbon disetujui otomatis masuk potongan <strong>CASH_ADV</strong> saat <Link href="/humanify/payroll/main" className="font-semibold underline underline-offset-2">Proses gaji</Link> dihitung; saldo turun setelah run disetujui. Karyawan juga bisa ajukan dari Portal ESS.</>
                : <>{title} yang disetujui masuk ke <Link href="/humanify/payroll/main" className="font-semibold underline underline-offset-2">Proses gaji</Link> periode berjalan.</>}
            </p>
          </div>

          {showStatusChips && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status kasbon">
              {([
                { key: 'all', label: 'Semua', count: items.length },
                { key: 'pending', label: 'Pending', count: pending.length },
                { key: 'active', label: 'Aktif', count: activeCount },
                { key: 'completed', label: 'Selesai', count: completedCount },
              ] as const).map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  aria-pressed={statusFilter === chip.key || (chip.key === 'active' && ['approved', 'active'].includes(statusFilter))}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
                    statusFilter === chip.key
                      || (chip.key === 'active' && statusFilter === 'approved')
                      ? 'bg-[var(--hf-brand-600)] text-white border-transparent'
                      : 'bg-white text-[color:var(--hf-ink-muted)] border-[var(--hf-border)] hover:bg-[var(--hf-surface-muted)]'
                  }`}
                >
                  {chip.label}
                  <span className="tabular-nums opacity-80">{chip.count}</span>
                </button>
              ))}
            </div>
          )}

          <OpsToolbar>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari karyawan, alasan…" className="hf-input w-full pl-9" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="hf-input">
              <option value="all">Semua status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </OpsToolbar>

          {loading ? (
            <div className="h-40 animate-pulse hf-card" />
          ) : filtered.length === 0 ? (
            <HrisEmptyState
              source={dataSource}
              title={`Belum ada ${title.toLowerCase()}`}
              description="Tambah catatan baru, lalu setujui agar terpotong atau ditambahkan di proses gaji."
              action={<button type="button" onClick={() => setShowCreate(true)} className="hf-btn-primary inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah</button>}
            />
          ) : (
            <div className="hf-table-wrap overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Departemen</th>
                    <th>Alasan</th>
                    {showBalanceCols && <th className="text-right">Cicilan</th>}
                    <th className="text-right">Jumlah</th>
                    {showBalanceCols && <th className="text-right">Sisa</th>}
                    <th>Status</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const st = STATUS_LABEL[item.status] || STATUS_LABEL.pending;
                    return (
                      <tr key={item.id}>
                        <td className="font-medium text-[color:var(--hf-ink)]">{item.employeeName}</td>
                        <td>{item.department || '—'}</td>
                        <td>
                          <span className="text-[color:var(--hf-ink-muted)]">{labelCat(item.category) ? `${labelCat(item.category)} · ` : ''}</span>
                          {item.reason || '—'}
                        </td>
                        {showBalanceCols && (
                          <td className="text-right tabular-nums">{item.installmentAmount ? `${fmt(item.installmentAmount)}/bln × ${item.installmentMonths || 0}` : 'Sekali potong'}</td>
                        )}
                        <td className="text-right tabular-nums font-medium">{fmt(item.amount)}</td>
                        {showBalanceCols && <td className="text-right tabular-nums">{fmt(item.remainingAmount != null ? item.remainingAmount : (['approved', 'active'].includes(item.status) ? item.amount : 0))}</td>}
                        <td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span></td>
                        <td className="text-right">
                          {item.status === 'pending' && (
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => setStatus(item.id, approveStatus)} className="hf-btn-secondary inline-flex items-center gap-1 !px-2 !py-1 text-xs text-[color:var(--hf-success)]">
                                <Check className="h-3.5 w-3.5" /> Setujui
                              </button>
                              <button type="button" onClick={() => setStatus(item.id, 'rejected')} className="rounded-[var(--hf-radius)] p-1.5 text-[color:var(--hf-danger)] hover:bg-rose-50" aria-label="Tolak">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          {showBalanceCols && ['approved', 'active'].includes(item.status) && (
                            <button
                              type="button"
                              onClick={() => earlySettle(item.id)}
                              className="hf-btn-secondary inline-flex items-center gap-1 !px-2 !py-1 text-xs text-[color:var(--hf-brand-600)]"
                              title="Lunasi dini — sisa = 0"
                            >
                              <Banknote className="h-3.5 w-3.5" /> Lunasi
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PayrollShell>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
            <div className="hf-card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">Tambah {title}</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="text-[color:var(--hf-ink-faint)]"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <EmployeePicker
                  label="Karyawan"
                  required
                  value={form.employeeId || ''}
                  onChange={(emp: PickedEmployee | null) => {
                    if (!emp) { setForm((f: any) => ({ ...f, employeeId: '', employeeName: '', department: '' })); return; }
                    setForm((f: any) => ({
                      ...f,
                      employeeId: emp.id,
                      employeeUid: emp.employee_id,
                      employeeName: emp.name,
                      department: emp.department,
                    }));
                  }}
                />
                <div>
                  <label className="mb-1 block text-xs font-medium">Kategori</label>
                  <select value={form.category || ''} onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))} className="hf-input w-full">
                    {categories.map((c) => <option key={c} value={c}>{labelCat(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Nominal</label>
                  <input type="number" value={form.amount || ''} onChange={(e) => setForm((f: any) => ({ ...f, amount: e.target.value }))} className="hf-input w-full" />
                </div>
                {showInstallment && (
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      {type === 'cash_advance' ? 'Tenor potongan (bulan) — 1 = sekali potong' : 'Tenor (bulan)'}
                    </label>
                    <input type="number" min={1} value={form.installmentMonths || 6} onChange={(e) => setForm((f: any) => ({ ...f, installmentMonths: e.target.value }))} className="hf-input w-full" />
                    {Number(form.amount) > 0 && Number(form.installmentMonths) > 0 && (
                      <p className="mt-1 text-[11px] text-[color:var(--hf-ink-muted)]">
                        Cicilan ≈ {fmt(Math.round(Number(form.amount) / Number(form.installmentMonths)))}/bulan
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium">Alasan / catatan</label>
                  <textarea value={form.reason || ''} onChange={(e) => setForm((f: any) => ({ ...f, reason: e.target.value }))} rows={3} className="hf-input w-full" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="hf-btn-secondary">Batal</button>
                <button type="button" disabled={saving} onClick={handleCreate} className="hf-btn-primary disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
