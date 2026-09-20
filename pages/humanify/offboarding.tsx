import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsPageHero, OpsKpiShell, OpsStage, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import {
  KeyRound, Plus, Search, X, CheckCircle, AlertCircle, Clock,
  User, Briefcase, Calendar, FileText, Laptop, DollarSign,
  Eye, Trash2, ShieldCheck, Receipt, MessageSquare, Heart,
  LayoutGrid, Table2, Banknote, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import { getDepartmentLabel } from '@/lib/hris/master-data';

type SettlementFilter = 'all' | 'ready' | 'disbursed' | 'none';
type SortKey = 'employeeName' | 'resignDate' | 'lastWorkingDate' | 'clearance' | 'status' | 'settlement' | 'net';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

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
  resignation: { label: 'Resign', color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]' },
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
  hr: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-100)]',
  work: 'text-orange-600 bg-orange-100',
  it: 'text-cyan-600 bg-cyan-100',
  finance: 'text-green-600 bg-green-100',
  benefit: 'text-pink-600 bg-pink-100',
  tax: 'text-amber-600 bg-amber-100',
};

function settlementStatusOf(entry: any, readyIds: Set<string>): 'ready' | 'disbursed' | 'none' {
  const ds = entry?.settlementData?.disbursementStatus;
  if (ds === 'disbursed') return 'disbursed';
  if (ds === 'ready' || readyIds.has(entry?.id)) return 'ready';
  return 'none';
}

const SETTLEMENT_CHIP: Record<string, { label: string; cls: string }> = {
  ready: { label: 'Siap cair', cls: 'bg-amber-50 text-amber-800' },
  disbursed: { label: 'Cair', cls: 'bg-emerald-50 text-emerald-800' },
  none: { label: 'Belum', cls: 'bg-slate-50 text-slate-500' },
};

export default function OffboardingPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OffEntry[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [template, setTemplate] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [listView, setListView] = useState<'card' | 'table'>('table');
  const [viewing, setViewing] = useState<OffEntry | null>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [settlementForm, setSettlementForm] = useState({ baseSalary: 8000000, remainingLeaveDays: 5, unpaidOvertimeHours: 0, loanBalance: 0, cashAdvanceBalance: 0 });
  const [calculatingSettlement, setCalculatingSettlement] = useState(false);
  const [readySettlements, setReadySettlements] = useState<any[]>([]);
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('resignDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [disbursingId, setDisbursingId] = useState<string | null>(null);
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
      const res = await fetch('/api/humanify/lifecycle?action=offboarding');
      const json = await res.json();
      const rows = json?.data || [];
      setItems(rows);
      setDataSource(rows.length ? 'live' : 'empty');
      setTemplate(json?.template || []);
      const readyRes = await fetch('/api/humanify/offboarding-settlement?action=list-ready')
        .then((r) => r.json())
        .catch(() => null);
      if (readyRes?.success) {
        setReadySettlements(readyRes.data?.rows || []);
      }
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
      const res = await fetch('/api/humanify/lifecycle?action=offboarding', {
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
    const nextCompleted = !task.completed;
    try {
      if (task.key === 'asset_return' && nextCompleted) {
        if (!confirm('Tandai pengembalian aset? Semua aset yang di-assign ke karyawan ini akan dikembalikan ke inventori.')) {
          return;
        }
      }
      const res = await fetch(`/api/humanify/lifecycle?action=offboarding-task&id=${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskKey: task.key, completed: nextCompleted }),
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
      const n = json.assetIntegration?.returned?.length;
      if (task.key === 'asset_return' && nextCompleted) {
        showToast(
          'success',
          n ? `${n} aset dikembalikan ke inventori` : 'Tidak ada aset assigned — checklist tetap ditandai',
        );
      }
    } catch {
      showToast('error', 'Gagal update task');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus proses offboarding ini?')) return;
    try {
      await fetch(`/api/humanify/lifecycle?action=offboarding&id=${id}`, { method: 'DELETE' });
      setItems(p => p.filter(i => i.id !== id));
      setViewing((v) => (v?.id === id ? null : v));
      showToast('success', 'Dihapus');
    } catch {
      showToast('error', 'Gagal hapus');
    }
  }

  async function calculateSettlement(entry: OffEntry) {
    setCalculatingSettlement(true);
    try {
      let cashAdvanceBalance = settlementForm.cashAdvanceBalance;
      let loanBalance = settlementForm.loanBalance;
      try {
        const balRes = await fetch(`/api/humanify/payroll-inputs?employeeId=${encodeURIComponent(String(entry.employeeId))}`);
        const balJson = await balRes.json();
        const rows = Array.isArray(balJson.data) ? balJson.data : [];
        let cashAdvance = 0;
        let loan = 0;
        for (const r of rows) {
          if (!['approved', 'active'].includes(r.status)) continue;
          const rem = Number(r.remainingAmount != null ? r.remainingAmount : r.amount || 0);
          if (r.type === 'cash_advance') cashAdvance += rem;
          if (r.type === 'loan') loan += rem;
        }
        if (cashAdvance > 0 || loan > 0) {
          cashAdvanceBalance = cashAdvance;
          loanBalance = loan;
          setSettlementForm((f) => ({ ...f, cashAdvanceBalance: cashAdvance, loanBalance: loan }));
        }
      } catch { /* optional */ }

      const res = await fetch('/api/humanify/offboarding-settlement?action=calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          baseSalary: settlementForm.baseSalary,
          lastWorkingDate: entry.lastWorkingDate || entry.resignDate,
          resignDate: entry.resignDate,
          reasonCategory: entry.reasonCategory,
          remainingLeaveDays: settlementForm.remainingLeaveDays,
          unpaidOvertimeHours: settlementForm.unpaidOvertimeHours,
          loanBalance,
          cashAdvanceBalance,
        }),
      });
      const json = await res.json();
      setSettlement(json.data);
    } catch {
      showToast('error', 'Gagal hitung settlement');
    } finally {
      setCalculatingSettlement(false);
    }
  }

  async function applySettlement(entry: OffEntry) {
    if (!settlement) return;
    try {
      const res = await fetch(`/api/humanify/offboarding-settlement?action=apply&id=${entry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          baseSalary: settlementForm.baseSalary,
          lastWorkingDate: entry.lastWorkingDate || entry.resignDate,
          resignDate: entry.resignDate,
          reasonCategory: entry.reasonCategory,
          remainingLeaveDays: settlementForm.remainingLeaveDays,
          unpaidOvertimeHours: settlementForm.unpaidOvertimeHours,
          loanBalance: settlementForm.loanBalance,
          cashAdvanceBalance: settlementForm.cashAdvanceBalance,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Settlement diterapkan — siap proses payroll final');
        setViewing(json.data ? { ...entry, ...json.data } : entry);
        fetchAll();
      }
    } catch {
      showToast('error', 'Gagal terapkan settlement');
    }
  }

  async function disburseSettlement(id: string, opts?: { closeDetail?: boolean }) {
    if (disbursingId) return;
    setDisbursingId(id);
    try {
      const res = await fetch(`/api/humanify/offboarding-settlement?action=disburse&id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Settlement ditandai disbursed — siap unduh file bank');
        if (viewing?.id === id) {
          setSettlement((s: any) => ({
            ...(s || {}),
            ...json.data?.settlementData,
            disbursementStatus: 'disbursed',
          }));
          setViewing((v) => (v ? { ...v, settlementData: json.data?.settlementData || (v as any).settlementData } : v));
        }
        await fetchAll();
        if (opts?.closeDetail) setViewing(null);
      } else {
        showToast('error', json.error || 'Gagal disburse');
      }
    } catch {
      showToast('error', 'Gagal disburse settlement');
    } finally {
      setDisbursingId(null);
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'employeeName' ? 'asc' : 'desc'); }
  };

  const readyIds = useMemo(() => new Set(readySettlements.map((r) => r.id)), [readySettlements]);
  const readyTotalNet = useMemo(
    () => readySettlements.reduce((s, r) => s + (Number(r.netSettlement) || 0), 0),
    [readySettlements],
  );

  const filtered = useMemo(() => {
    const rows = items.filter((i) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        i.employeeName?.toLowerCase().includes(q) ||
        String(i.employeeId).toLowerCase().includes(q) ||
        (i.position || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      const matchReason = reasonFilter === 'all' || i.reasonCategory === reasonFilter;
      const settle = settlementStatusOf(i, readyIds);
      const matchSettle = settlementFilter === 'all' || settle === settlementFilter;
      return matchSearch && matchStatus && matchReason && matchSettle;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const settleA = settlementStatusOf(a, readyIds);
      const settleB = settlementStatusOf(b, readyIds);
      const { pct: pctA } = requiredProgress(a.tasks);
      const { pct: pctB } = requiredProgress(b.tasks);
      const netA = Number((a as any)?.settlementData?.settlement?.netSettlement
        ?? readySettlements.find((r) => r.id === a.id)?.netSettlement ?? 0);
      const netB = Number((b as any)?.settlementData?.settlement?.netSettlement
        ?? readySettlements.find((r) => r.id === b.id)?.netSettlement ?? 0);
      let cmp = 0;
      switch (sortKey) {
        case 'employeeName':
          cmp = (a.employeeName || '').localeCompare(b.employeeName || '', 'id');
          break;
        case 'resignDate':
          cmp = String(a.resignDate || '').localeCompare(String(b.resignDate || ''));
          break;
        case 'lastWorkingDate':
          cmp = String(a.lastWorkingDate || '').localeCompare(String(b.lastWorkingDate || ''));
          break;
        case 'clearance':
          cmp = pctA - pctB;
          break;
        case 'status':
          cmp = String(a.status).localeCompare(String(b.status));
          break;
        case 'settlement':
          cmp = settleA.localeCompare(settleB);
          break;
        case 'net':
          cmp = netA - netB;
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return rows;
  }, [items, searchQuery, statusFilter, reasonFilter, settlementFilter, readyIds, sortKey, sortDir, readySettlements]);

  const stats = useMemo(() => {
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const byReason: Record<string, number> = {};
    items.forEach((i) => { byReason[i.reasonCategory] = (byReason[i.reasonCategory] || 0) + 1; });
    const readyCount = readySettlements.length;
    const disbursedCount = items.filter((i) => settlementStatusOf(i, readyIds) === 'disbursed').length;
    return {
      total: items.length,
      inProgress,
      completed,
      topReason: Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]?.[0],
      readyCount,
      disbursedCount,
    };
  }, [items, readySettlements, readyIds]);

  const fmt = fmtCurrency;

  if (!mounted) return null;

  return (
    <HQLayout title="Offboarding / Exit" subtitle="Proses pengunduran diri, exit clearance, dan retensi data karyawan">
      <OpsStage>
        <OpsPageHero
          title="Offboarding & Exit Clearance"
          subtitle="Kelola resignasi, clearance task, settlement, dan retensi data karyawan"
          badge="Lifecycle"
          liveLabel="Exit desk"
          icon={KeyRound}
          score={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
          scoreLabel="Done"
          chips={[
            { icon: Clock, label: `${stats.inProgress} sedang proses`, tone: 'text-amber-700' },
            { icon: CheckCircle, label: `${stats.completed} selesai`, tone: 'text-emerald-700' },
            { icon: Banknote, label: `${stats.readyCount} siap cair`, tone: 'text-teal-700' },
            { icon: ShieldCheck, label: stats.topReason ? `Utama: ${REASON_LABELS[stats.topReason]?.label || '-'}` : 'Belum ada alasan dominan', tone: 'text-[color:var(--hf-brand-600)]' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button
                type="button"
                onClick={() => { setForm({ reasonCategory: 'resignation' }); setShowModal(true); }}
                className="hf-btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Mulai offboarding
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <OpsKpiShell>
            <HRStatCard icon={KeyRound} label="Total Proses" value={stats.total} accent="rose" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={Clock} label="Sedang Proses" value={stats.inProgress} accent="orange" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={CheckCircle} label="Selesai" value={stats.completed} accent="emerald" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard
              icon={Banknote}
              label="Siap Cair"
              value={stats.readyCount}
              accent="cyan"
              onClick={() => setSettlementFilter('ready')}
            />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard icon={ShieldCheck} label="Alasan Utama" value={stats.topReason ? REASON_LABELS[stats.topReason]?.label || '—' : '—'} accent="violet" />
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
                aria-label="Cari offboarding"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="hf-input" aria-label="Filter status proses">
              <option value="all">Semua Status</option>
              <option value="in_progress">Sedang Proses</option>
              <option value="completed">Selesai</option>
              <option value="paused">Ditunda</option>
            </select>
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="hf-input" aria-label="Filter alasan">
              <option value="all">Semua Alasan</option>
              {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <ViewToggle value={listView} onChange={setListView} />
        </OpsToolbar>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status settlement">
          {([
            { key: 'all' as SettlementFilter, label: 'Semua settlement', count: items.length },
            { key: 'ready' as SettlementFilter, label: 'Siap cair', count: stats.readyCount },
            { key: 'disbursed' as SettlementFilter, label: 'Sudah cair', count: stats.disbursedCount },
            { key: 'none' as SettlementFilter, label: 'Belum settlement', count: Math.max(0, items.length - stats.readyCount - stats.disbursedCount) },
          ]).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSettlementFilter(chip.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                settlementFilter === chip.key
                  ? 'bg-[var(--hf-brand-600)] text-white'
                  : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)] hover:bg-[var(--hf-brand-50)]'
              }`}
              aria-pressed={settlementFilter === chip.key}
            >
              {chip.label}
              <span className="tabular-nums opacity-80">{chip.count}</span>
            </button>
          ))}
          <Link
            href="/humanify/payroll/disbursement?mode=settlement"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 underline"
          >
            <Banknote className="h-3.5 w-3.5" /> Transfer Bank settlement
          </Link>
        </div>

        <div className="hf-card border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Settlement siap cair ({readySettlements.length})</p>
              <p className="text-xs text-emerald-700">
                Hitung &amp; terapkan selesai — disburse dari antrean atau unduh file Transfer Bank.
                {readySettlements.length > 0 && (
                  <span className="ml-1 font-semibold tabular-nums">Total {fmtCurrency(readyTotalNet)}</span>
                )}
              </p>
            </div>
            <Link href="/humanify/payroll/disbursement?mode=settlement" className="text-xs font-medium text-emerald-800 underline inline-flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Buka Transfer Bank
            </Link>
          </div>
          {readySettlements.length === 0 ? (
            <div className="rounded-lg bg-white/70 px-3 py-6 text-center" data-testid="ready-settlement-empty">
              <p className="text-sm font-medium text-emerald-900">Belum ada settlement siap cair</p>
              <p className="mt-1 text-xs text-emerald-700">Hitung &amp; terapkan settlement di detail offboarding untuk mengisi antrean ini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readySettlements.slice(0, 12).map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[color:var(--hf-ink)] truncate">{r.employeeName}</p>
                    <p className="text-xs text-[color:var(--hf-ink-faint)] tabular-nums">
                      Net {fmtCurrency(r.netSettlement || 0)}
                      {r.resignDate ? ` · Resign ${r.resignDate}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="hf-btn-secondary !px-2.5 !py-1 text-xs"
                      onClick={() => {
                        const entry = items.find((i) => i.id === r.id);
                        if (entry) setViewing(entry);
                        else showToast('info', 'Buka detail dari daftar untuk lihat clearance');
                      }}
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      disabled={disbursingId === r.id}
                      className="hf-btn-primary !px-2.5 !py-1 text-xs disabled:opacity-50"
                      onClick={() => disburseSettlement(r.id)}
                      aria-label={`Disburse settlement ${r.employeeName}`}
                    >
                      {disbursingId === r.id ? 'Memproses…' : 'Disburse'}
                    </button>
                  </div>
                </div>
              ))}
              {readySettlements.length > 12 && (
                <p className="text-xs text-emerald-700">+{readySettlements.length - 12} lainnya — filter chip &ldquo;Siap cair&rdquo; untuk melihat di tabel.</p>
              )}
            </div>
          )}
        </div>

        {!loading && filtered.length === 0 ? (
          <HrisEmptyState
            title="Belum ada proses offboarding"
            description="Mulai proses exit clearance untuk karyawan yang mengundurkan diri atau berakhir kontrak."
            source={dataSource}
            action={(
              <button type="button" onClick={() => { setForm({ reasonCategory: 'resignation' }); setShowModal(true); }} className="hf-btn-primary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Mulai offboarding
              </button>
            )}
          />
        ) : listView === 'table' ? (
          <div className="hf-table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <SortTh label="Karyawan" active={sortKey === 'employeeName'} dir={sortDir} onClick={() => toggleSort('employeeName')} />
                  <th>Jabatan</th>
                  <th>Alasan</th>
                  <SortTh label="Resign" active={sortKey === 'resignDate'} dir={sortDir} onClick={() => toggleSort('resignDate')} />
                  <SortTh label="Hari terakhir" active={sortKey === 'lastWorkingDate'} dir={sortDir} onClick={() => toggleSort('lastWorkingDate')} />
                  <SortTh label="Clearance" active={sortKey === 'clearance'} dir={sortDir} onClick={() => toggleSort('clearance')} align="right" />
                  <SortTh label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
                  <SortTh label="Settlement" active={sortKey === 'settlement'} dir={sortDir} onClick={() => toggleSort('settlement')} />
                  <SortTh label="Net" active={sortKey === 'net'} dir={sortDir} onClick={() => toggleSort('net')} align="right" />
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [0, 1, 2, 3, 4].map((n) => (
                    <tr key={n}>
                      <td colSpan={10}><div className="h-8 animate-pulse rounded-md bg-[var(--hf-surface-muted)]" /></td>
                    </tr>
                  ))
                  : filtered.map((i) => {
                    const { doneReq, totalReq, pct } = requiredProgress(i.tasks);
                    const rConf = REASON_LABELS[i.reasonCategory] || REASON_LABELS.other;
                    const settleStatus = settlementStatusOf(i, readyIds);
                    const settleChip = SETTLEMENT_CHIP[settleStatus];
                    const net = Number((i as any)?.settlementData?.settlement?.netSettlement
                      ?? readySettlements.find((r) => r.id === i.id)?.netSettlement ?? 0);
                    return (
                      <tr key={i.id}>
                        <td>
                          <p className="font-medium text-[color:var(--hf-ink)]">{i.employeeName}</p>
                          <p className="text-xs text-[color:var(--hf-ink-faint)]">{i.employeeId || '—'}</p>
                        </td>
                        <td>{i.position || '—'}</td>
                        <td>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${rConf.color}`}>{rConf.label}</span>
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{i.resignDate || '—'}</td>
                        <td className="whitespace-nowrap tabular-nums">{i.lastWorkingDate || '—'}</td>
                        <td className="text-right">
                          <span className="tabular-nums font-medium">{pct}%</span>
                          <span className="ml-1 text-xs text-[color:var(--hf-ink-faint)]">{doneReq}/{totalReq}</span>
                        </td>
                        <td><StatusPill status={i.status} /></td>
                        <td>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${settleChip.cls}`}>{settleChip.label}</span>
                        </td>
                        <td className="text-right tabular-nums text-xs">
                          {net > 0 ? fmtCurrency(net) : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {settleStatus === 'ready' && (
                              <button
                                type="button"
                                disabled={disbursingId === i.id}
                                onClick={() => disburseSettlement(i.id)}
                                className="hf-btn-primary inline-flex items-center gap-1 !px-2.5 !py-1 text-xs disabled:opacity-50"
                              >
                                Disburse
                              </button>
                            )}
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
              const rConf = REASON_LABELS[i.reasonCategory] || REASON_LABELS.other;
              return (
                <div key={i.id} className="hf-tile hf-tile-interactive relative overflow-hidden p-5">
                  <div className="hf-analytics-panel__rail" aria-hidden />
                  <div className="pl-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-[color:var(--hf-ink)]">{i.employeeName}</h3>
                        <p className="text-xs text-[color:var(--hf-ink-muted)]">{i.position || '—'} · {i.department || '—'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${rConf.color}`}>{rConf.label}</span>
                          <span className="flex items-center gap-1 text-xs text-[color:var(--hf-ink-faint)]"><Calendar className="h-3.5 w-3.5" /> Resign {i.resignDate}</span>
                        </div>
                      </div>
                      <StatusPill status={i.status} />
                    </div>
                    {i.reason && <p className="mb-3 line-clamp-2 rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)] p-2 text-sm text-[color:var(--hf-ink-secondary)]">&ldquo;{i.reason}&rdquo;</p>}
                    <div className="space-y-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[color:var(--hf-ink-muted)]">Clearance {doneReq}/{totalReq} task wajib</span>
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

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="hf-card max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

            {/* Final Settlement Calculator */}
            <div className="px-5 pt-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-green-600" /> Final Settlement — Penggantian Hak & Cuti</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  <label className="text-xs">Gaji Pokok<input type="number" value={settlementForm.baseSalary} onChange={e => setSettlementForm(f => ({ ...f, baseSalary: +e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded text-sm" /></label>
                  <label className="text-xs">Sisa Cuti (hari)<input type="number" value={settlementForm.remainingLeaveDays} onChange={e => setSettlementForm(f => ({ ...f, remainingLeaveDays: +e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded text-sm" /></label>
                  <label className="text-xs">Jam Lembur<input type="number" value={settlementForm.unpaidOvertimeHours} onChange={e => setSettlementForm(f => ({ ...f, unpaidOvertimeHours: +e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded text-sm" /></label>
                  <label className="text-xs">Sisa Pinjaman<input type="number" value={settlementForm.loanBalance} onChange={e => setSettlementForm(f => ({ ...f, loanBalance: +e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded text-sm" /></label>
                  <label className="text-xs">Sisa Kasbon<input type="number" value={settlementForm.cashAdvanceBalance} onChange={e => setSettlementForm(f => ({ ...f, cashAdvanceBalance: +e.target.value }))} className="w-full mt-0.5 px-2 py-1 border rounded text-sm" /></label>
                </div>
                {(settlementForm.cashAdvanceBalance > 0 || settlementForm.loanBalance > 0) && (
                  <p className="mb-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5" data-testid="kasbon-settlement-breakdown">
                    Potongan settlement: kasbon {fmt(settlementForm.cashAdvanceBalance)}
                    {settlementForm.loanBalance > 0 ? ` + pinjaman ${fmt(settlementForm.loanBalance)}` : ''}
                    {' '}(prefill dari sisa outstanding payroll-inputs)
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => calculateSettlement(viewing)} disabled={calculatingSettlement}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {calculatingSettlement ? 'Menghitung...' : 'Hitung Settlement'}
                  </button>
                  {settlement && (
                    <button onClick={() => applySettlement(viewing)} className="px-3 py-1.5 bg-emerald-700 text-white text-xs rounded-lg hover:bg-emerald-800">
                      Terapkan ke Payroll Final
                    </button>
                  )}
                  {((settlement?.disbursementStatus === 'ready')
                    || (viewing as any)?.settlementData?.disbursementStatus === 'ready'
                    || (!!settlement?.settlement && !(viewing as any)?.settlementData?.disbursedAt)) && (
                    <button
                      type="button"
                      disabled={disbursingId === viewing.id}
                      onClick={() => disburseSettlement(viewing.id)}
                      className="px-3 py-1.5 bg-teal-700 text-white text-xs rounded-lg hover:bg-teal-800 disabled:opacity-50"
                    >
                      {disbursingId === viewing.id ? 'Memproses…' : 'Tandai Disburse'}
                    </button>
                  )}
                  <Link
                    href="/humanify/payroll/disbursement?mode=settlement"
                    className="px-3 py-1.5 border border-green-300 text-green-800 text-xs rounded-lg hover:bg-green-100 inline-flex items-center gap-1"
                  >
                    <Banknote className="h-3.5 w-3.5" /> File Transfer Bank
                  </Link>
                </div>
                {(viewing as any)?.settlementData?.disbursementStatus === 'disbursed' && (
                  <p className="mt-2 text-xs text-teal-700">
                    Sudah di-disburse{(viewing as any).settlementData?.disbursementReference
                      ? ` · Ref ${(viewing as any).settlementData.disbursementReference}`
                      : ''}
                    {(viewing as any).settlementData?.disbursedAt
                      ? ` · ${new Date((viewing as any).settlementData.disbursedAt).toLocaleString('id-ID')}`
                      : ''}
                  </p>
                )}
                {settlement?.settlement && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded p-2">Gaji proporsional: <strong>{fmt(settlement.settlement.finalSalary)}</strong></div>
                    <div className="bg-white rounded p-2">Penggantian cuti: <strong>{fmt(settlement.settlement.leavePayout)}</strong></div>
                    <div className="bg-white rounded p-2">Pesangon: <strong>{fmt(settlement.settlement.severancePay)}</strong></div>
                    <div className="bg-white rounded p-2 font-bold text-green-700">THP Net: {fmt(settlement.settlement.netSettlement)}</div>
                  </div>
                )}
              </div>
            </div>

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
          <div className="hf-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Mulai Proses Offboarding</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <EmployeePicker
                label="Karyawan"
                required
                value={form.employeeId || ''}
                onChange={(emp: PickedEmployee | null) => {
                  if (!emp) { setForm({}); return; }
                  setForm({
                    employeeId: emp.id,
                    employeeUid: emp.employee_id,
                    employeeName: emp.name,
                    position: emp.position,
                    department: emp.department,
                    departmentLabel: emp.department_label,
                    branchName: emp.branch_name,
                    resignDate: new Date().toISOString().slice(0, 10),
                  });
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="UID" value={form.employeeUid || '-'} />
                <ReadOnlyField label="Posisi" value={form.position || '-'} />
                <ReadOnlyField label="Departemen" value={form.departmentLabel || getDepartmentLabel(form.department) || '-'} />
                <ReadOnlyField label="Cabang" value={form.branchName || '-'} />
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

function StatusPill({ status }: { status: OffEntry['status'] }) {
  const cls =
    status === 'completed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'paused'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-orange-50 text-orange-700';
  const label = status === 'completed' ? 'Selesai' : status === 'paused' ? 'Ditunda' : 'Proses';
  return <span className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function SortTh({
  label, active, dir, onClick, align,
}: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; align?: 'right' }) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-xs font-semibold ${active ? 'text-[color:var(--hf-brand-600)]' : 'text-[color:var(--hf-ink-muted)]'}`}
        aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
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
