import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeePicker from '@/components/humanify/EmployeePicker';
import PerformanceModuleChrome, { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { getDepartmentLabel, HRIS_DEPARTMENTS } from '@/lib/hris/master-data';
import {
  calcProgress, currentOkrPeriod, okrPeriodOptions, krProgressPct, objectiveHealth, summarizeOkrs, buildOkrTree,
  type OkrLevel, type OkrCycle, type OkrConfidence, type OkrStatus, type OkrObjective, type KeyResult, type OkrNode,
} from '@/lib/hris/okr-model';
import {
  Target, Plus, TrendingUp, AlertTriangle, CheckCircle2, Building2, Users, User, Layers,
  RefreshCw, Search, X, Save, MessageSquare, Trash2, Check, GitBranch, ClipboardList,
} from 'lucide-react';

type Tab = 'overview' | 'alignment' | 'objectives';

const LEVEL_LABELS: Record<OkrLevel, string> = {
  company: 'Perusahaan', department: 'Departemen', team: 'Tim', individual: 'Individu',
};
const STATUS_LABELS: Record<OkrStatus, string> = {
  draft: 'Draf', pending_approval: 'Menunggu Persetujuan', active: 'Aktif', completed: 'Selesai', cancelled: 'Diarsipkan', rejected: 'Ditolak',
};
const CONFIDENCE_LABELS: Record<OkrConfidence, string> = {
  on_track: 'Sesuai jalur', at_risk: 'Berisiko', off_track: 'Off track',
};
const CONFIDENCE_CLS: Record<OkrConfidence, string> = {
  on_track: 'bg-emerald-50 text-emerald-800',
  at_risk: 'bg-amber-50 text-amber-800',
  off_track: 'bg-rose-50 text-rose-800',
};
const STATUS_CLS: Record<OkrStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_approval: 'bg-amber-50 text-amber-800',
  active: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
  completed: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
  rejected: 'bg-rose-50 text-rose-800',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

function ProgressBar({ value, health }: { value: number; health?: OkrConfidence }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const bar = health === 'off_track' ? 'bg-rose-500' : health === 'at_risk' ? 'bg-amber-500' : 'bg-[var(--hf-brand-600)]';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--hf-surface-muted)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function newKr(partial?: Partial<KeyResult>): KeyResult {
  return {
    id: `kr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    weight: 1,
    confidence: 'on_track',
    ...partial,
  };
}

function emptyForm(period: string) {
  return {
    title: '',
    description: '',
    level: 'department' as OkrLevel,
    period: period || currentOkrPeriod(),
    cycle: 'quarterly' as OkrCycle,
    department: '',
    ownerId: '',
    ownerName: '',
    parentId: '',
    keyResults: [newKr()],
  };
}

export default function OkrPage() {
  const [okrs, setOkrs] = useState<OkrObjective[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState(currentOkrPeriod());
  const [filterLevel, setFilterLevel] = useState<OkrLevel | ''>('');
  const [statusFilter, setStatusFilter] = useState<OkrStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [checkInOkr, setCheckInOkr] = useState<OkrObjective | null>(null);
  const [checkInForm, setCheckInForm] = useState<{ note: string; confidence: OkrConfidence; keyResults: KeyResult[] }>({ note: '', confidence: 'on_track', keyResults: [] });
  const [form, setForm] = useState(() => emptyForm(currentOkrPeriod()));
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = period ? `?period=${encodeURIComponent(period)}` : '';
      const r = await fetch(`/api/humanify/okr${qs}`);
      const j = await r.json();
      setOkrs(j.data || []);
      setDataSource(j.dataSource || (j.data?.length ? 'live' : 'empty'));
    } catch {
      setOkrs([]);
      setDataSource('empty');
      showToast('Gagal memuat OKR', 'error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showCreate && !checkInOkr) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowCreate(false); setCheckInOkr(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreate, checkInOkr]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return okrs.filter((o) => {
      if (filterLevel && o.level !== filterLevel) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${o.title} ${o.ownerName || ''} ${o.department || ''} ${(o.keyResults || []).map((k) => k.title).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [okrs, filterLevel, statusFilter, search]);

  const summary = useMemo(() => summarizeOkrs(filtered.length ? filtered : okrs, period), [filtered, okrs, period]);
  const tree = useMemo(() => buildOkrTree(filtered.length && !filterLevel ? filtered : okrs.filter((o) => statusFilter === 'all' || o.status === statusFilter)), [filtered, okrs, filterLevel, statusFilter]);
  const parentOptions = okrs.filter((o) => o.status === 'active' && o.level !== 'individual');
  const periods = okrPeriodOptions();

  const openCreate = () => {
    setForm(emptyForm(period || currentOkrPeriod()));
    setShowCreate(true);
  };

  const openCheckIn = (o: OkrObjective) => {
    setCheckInOkr(o);
    setCheckInForm({
      note: '',
      confidence: objectiveHealth(o),
      keyResults: (o.keyResults || []).map((k) => ({ ...k })),
    });
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { showToast('Judul objective wajib', 'error'); return; }
    const keyResults = form.keyResults.filter((k) => k.title.trim()).map((k) => ({
      ...k,
      targetValue: Number(k.targetValue) || 0,
      currentValue: Number(k.currentValue) || 0,
      weight: Number(k.weight) || 1,
    }));
    if (!keyResults.length) { showToast('Minimal satu key result', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/okr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          level: form.level,
          period: form.period,
          cycle: form.cycle,
          department: form.department || undefined,
          ownerId: form.ownerId || undefined,
          ownerName: form.ownerName || undefined,
          parentId: form.parentId || undefined,
          status: 'draft',
          keyResults,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal membuat OKR');
      setShowCreate(false);
      showToast('Objective tersimpan');
      load();
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat OKR', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async () => {
    if (!checkInOkr) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/okr?action=check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: checkInOkr.id,
          note: checkInForm.note,
          confidence: checkInForm.confidence,
          keyResults: checkInForm.keyResults.map((k) => ({
            id: k.id, currentValue: Number(k.currentValue), confidence: k.confidence,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal check-in');
      setCheckInOkr(null);
      showToast('Check-in tersimpan');
      load();
    } catch (e: any) {
      showToast(e.message || 'Gagal check-in', 'error');
    } finally {
      setSaving(false);
    }
  };

  const routeOkr = async (id: string, action: 'submit-approval' | 'approve' | 'reject') => {
    setSaving(true);
    try {
      const body: any = { id };
      if (action === 'reject') {
        const reason = prompt('Alasan penolakan (opsional):') || '';
        body.reason = reason;
      }
      const res = await fetch(`/api/humanify/okr?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal memproses persetujuan');
      showToast(json.message || 'Berhasil');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: OkrStatus) => {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/okr?action=status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal mengubah status');
      showToast(status === 'completed' ? 'OKR ditandai selesai' : status === 'cancelled' ? 'OKR diarsipkan' : 'Status diperbarui');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeOkr = async (id: string) => {
    if (!confirm('Hapus objective ini? Tindakan tidak dapat dibatalkan.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/humanify/okr?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menghapus');
      showToast('OKR dihapus');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderOkrCard = (o: OkrObjective, opts?: { compact?: boolean }) => {
    const health = objectiveHealth(o);
    return (
      <article key={o.id} className="hf-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Pill className="bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">{LEVEL_LABELS[o.level]}</Pill>
              <Pill className={STATUS_CLS[o.status]}>{STATUS_LABELS[o.status]}</Pill>
              <span className="text-xs text-[color:var(--hf-ink-faint)]">{o.period}</span>
              {o.department && <span className="text-xs text-[color:var(--hf-ink-muted)]">· {getDepartmentLabel(o.department)}</span>}
              {o.ownerName && <span className="text-xs text-[color:var(--hf-ink-muted)]">· {o.ownerName}</span>}
            </div>
            <h3 className="text-sm font-semibold text-[color:var(--hf-ink)] sm:text-base">{o.title}</h3>
            {o.description && !opts?.compact && (
              <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">{o.description}</p>
            )}
            {o.parentId && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--hf-brand-600)]">
                <Layers className="h-3 w-3" /> Cascading dari objective induk
              </p>
            )}
          </div>
          <div className="w-full shrink-0 sm:w-32">
            <p className="text-right text-2xl font-semibold tabular-nums text-[color:var(--hf-ink)]">{Math.round(o.progress)}%</p>
            <ProgressBar value={o.progress} health={health} />
            <p className="mt-1 text-right"><Pill className={CONFIDENCE_CLS[health]}>{CONFIDENCE_LABELS[health]}</Pill></p>
          </div>
        </div>

        {(o.keyResults || []).length > 0 && (
          <div className="mt-4 space-y-2">
            {o.keyResults.map((kr) => {
              const pct = krProgressPct(kr);
              return (
                <div key={kr.id} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border-subtle)] bg-[var(--hf-surface-muted)]/40 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[color:var(--hf-ink)]">{kr.title}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)] tabular-nums">
                        {Number(kr.currentValue || 0).toLocaleString('id-ID')} / {Number(kr.targetValue || 0).toLocaleString('id-ID')} {kr.unit}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill className={CONFIDENCE_CLS[kr.confidence]}>{CONFIDENCE_LABELS[kr.confidence]}</Pill>
                      <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-2"><ProgressBar value={pct} health={kr.confidence} /></div>
                </div>
              );
            })}
          </div>
        )}

        {!opts?.compact && (o.checkIns || []).length > 0 && (
          <p className="mt-3 text-xs text-[color:var(--hf-ink-muted)]">
            Check-in terakhir: {new Date(o.checkIns![0].date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            {o.checkIns![0].note ? ` — ${o.checkIns![0].note}` : ''}
          </p>
        )}

        {(o.status === 'draft' || o.status === 'pending_approval' || o.status === 'rejected') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {o.status === 'draft' || o.status === 'rejected' ? (
              <button type="button" onClick={() => routeOkr(o.id, 'submit-approval')} className="hf-btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
                Ajukan Persetujuan
              </button>
            ) : null}
            {o.status === 'pending_approval' ? (
              <>
                <button type="button" onClick={() => routeOkr(o.id, 'approve')} className="hf-btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
                  <Check className="h-3.5 w-3.5" /> Setujui
                </button>
                <button type="button" onClick={() => routeOkr(o.id, 'reject')} className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
                  Tolak
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => removeOkr(o.id)} className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        )}

        {o.status === 'active' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => openCheckIn(o)} className="hf-btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Check-in
            </button>
            <button type="button" onClick={() => setStatus(o.id, 'completed')} className="hf-btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
              <Check className="h-3.5 w-3.5" /> Selesai
            </button>
            <button type="button" onClick={() => setStatus(o.id, 'cancelled')} className="hf-btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
              Arsipkan
            </button>
            <button type="button" onClick={() => removeOkr(o.id)} className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
          </div>
        )}
      </article>
    );
  };

  const renderTree = (nodes: OkrNode[], depth = 0): ReactNode => (
    <div className={depth ? 'ml-3 space-y-3 border-l border-[var(--hf-border)] pl-3 sm:ml-5 sm:pl-4' : 'space-y-3'}>
      {nodes.map((n) => (
        <div key={n.id}>
          {renderOkrCard(n, { compact: depth > 0 })}
          {n.children.length > 0 && <div className="mt-3">{renderTree(n.children, depth + 1)}</div>}
        </div>
      ))}
    </div>
  );

  return (
    <PageGuard anyPermission={['kpi.view', 'kpi.*', 'employees.*']} title="OKR" description="Objectives & Key Results">
      <HQLayout title="OKR Perusahaan" subtitle="Cascading alignment — perusahaan → departemen → tim → individu">
        {toast && (
          <div role="status" className={`fixed top-4 right-4 z-50 rounded-[var(--hf-radius)] px-4 py-3 text-sm text-white shadow-[var(--hf-shadow-md)] ${toast.type === 'error' ? 'bg-[var(--hf-danger)]' : 'bg-[var(--hf-success)]'}`}>
            {toast.msg}
          </div>
        )}

        <div className="space-y-6">
          <PerformanceModuleChrome
            active="okr"
            title="OKR Perusahaan"
            subtitle="Susun objective, ukur key result, check-in progres, dan jaga alignment lintas level"
            badge="Performance · OKR"
            icon={Target}
            actions={
              <>
                <DataSourceBadge source={dataSource} />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="hf-input"
                  aria-label="Periode OKR"
                >
                  <option value="">Semua periode</option>
                  {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button type="button" onClick={load} className="hf-btn-secondary inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
                <button type="button" onClick={openCreate} className="hf-btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Tambah objective
                </button>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {loading && okrs.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[108px] animate-pulse hf-card" />
              ))
            ) : (
              <>
                <HRStatCard label="Objective" value={summary.total} icon={Target} accent="violet" />
                <HRStatCard label="Rata-rata progres" value={`${summary.avgProgress}%`} icon={TrendingUp} accent="indigo" />
                <HRStatCard label="Sesuai jalur" value={summary.onTrack} icon={CheckCircle2} accent="emerald" />
                <HRStatCard label="Berisiko" value={summary.atRisk} icon={AlertTriangle} accent="amber" />
                <HRStatCard label="Off track" value={summary.offTrack} icon={AlertTriangle} accent="rose" />
                <HRStatCard label="Selesai" value={summary.completed} sub={`${summary.checkInsThisPeriod} check-in`} icon={ClipboardList} accent="cyan" />
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setFilterLevel('')} className={`rounded-[var(--hf-radius)] px-3 py-1.5 text-sm ${!filterLevel ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)]'}`}>Semua level</button>
              {(['company', 'department', 'team', 'individual'] as OkrLevel[]).map((l) => (
                <button key={l} type="button" onClick={() => setFilterLevel(l)} className={`inline-flex items-center gap-1 rounded-[var(--hf-radius)] px-3 py-1.5 text-sm ${filterLevel === l ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)]'}`}>
                  {l === 'company' ? <Building2 className="h-3.5 w-3.5" /> : l === 'individual' ? <User className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                  {LEVEL_LABELS[l]}
                  {summary.byLevel[l] ? <span className="tabular-nums opacity-80">{summary.byLevel[l]}</span> : null}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OkrStatus | 'all')} className="hf-input" aria-label="Filter status">
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="pending_approval">Menunggu Persetujuan</option>
                <option value="draft">Draf</option>
                <option value="rejected">Ditolak</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Diarsipkan</option>
              </select>
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, owner, KR…" className="hf-input w-full pl-9" aria-label="Cari OKR" />
              </div>
            </div>
          </div>

          <EnterpriseTabBar
            tabs={[
              { key: 'overview', label: 'Ringkasan', icon: Target, count: filtered.length },
              { key: 'alignment', label: 'Alignment', icon: GitBranch },
              { key: 'objectives', label: 'Objectives', icon: Layers, count: filtered.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {loading && okrs.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse hf-card" />)}
            </div>
          ) : filtered.length === 0 && tab !== 'alignment' ? (
            <HrisEmptyState
              source={dataSource}
              title={okrs.length === 0 ? 'Belum ada OKR di periode ini' : 'Tidak ada yang cocok'}
              description="Cascade dari perusahaan ke departemen dan individu. Mulai dengan 1–3 objective, masing-masing 2–4 key result terukur."
              action={
                <button type="button" onClick={openCreate} className="hf-btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Tambah objective
                </button>
              }
            />
          ) : tab === 'overview' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { title: 'Tulis objective kualitatif', desc: 'Arah yang ingin dicapai tim — bukan metrik. Contoh: “Jadikan payroll closing andalan operasi”.' },
                  { title: 'Ukur dengan key result', desc: '2–4 KR terukur per objective. Target, satuan, dan bobot menentukan progres.' },
                  { title: 'Check-in rutin', desc: 'Update angka + catatan. Confidence Sesuai jalur / Berisiko / Off track terlihat di ringkasan.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white p-4">
                    <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {filtered.slice(0, 8).map((o) => renderOkrCard(o))}
              </div>
              {filtered.length > 8 && (
                <button type="button" onClick={() => setTab('objectives')} className="text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                  Lihat semua {filtered.length} objective
                </button>
              )}
            </div>
          ) : tab === 'alignment' ? (
            tree.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada rantai alignment"
                description="Tetapkan objective induk (perusahaan/departemen) saat membuat OKR tim atau individu."
                action={<button type="button" onClick={openCreate} className="hf-btn-primary">Tambah objective</button>}
              />
            ) : renderTree(tree)
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => renderOkrCard(o))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowCreate(false)} role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="okr-create-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto hf-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
                <h3 id="okr-create-title" className="text-sm font-semibold text-[color:var(--hf-ink)]">Tambah objective</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-[var(--hf-radius)] p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup"><X className="h-5 w-5 text-[color:var(--hf-ink-faint)]" /></button>
              </div>
              <div className="space-y-3 p-5">
                <Field label="Judul objective *">
                  <input className="hf-input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Arah yang ingin dicapai" />
                </Field>
                <Field label="Deskripsi">
                  <textarea className="hf-input w-full" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Level">
                    <select className="hf-input w-full" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as OkrLevel })}>
                      {(Object.keys(LEVEL_LABELS) as OkrLevel[]).map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                    </select>
                  </Field>
                  <Field label="Siklus">
                    <select className="hf-input w-full" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as OkrCycle })}>
                      <option value="quarterly">Triwulan</option>
                      <option value="annual">Tahunan</option>
                      <option value="monthly">Bulanan</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Periode">
                    <select className="hf-input w-full" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                      {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Departemen">
                    <select className="hf-input w-full" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                      <option value="">—</option>
                      {HRIS_DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                    </select>
                  </Field>
                </div>
                <EmployeePicker
                  value={form.ownerId}
                  label="Owner"
                  placeholder="Cari pemilik objective…"
                  onChange={(emp) => setForm({
                    ...form,
                    ownerId: emp?.id || '',
                    ownerName: emp?.name || '',
                    department: form.department || emp?.department || '',
                  })}
                />
                <Field label="Cascade dari (opsional)">
                  <select className="hf-input w-full" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                    <option value="">Tanpa induk</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>{LEVEL_LABELS[p.level]} · {p.title}</option>
                    ))}
                  </select>
                </Field>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Key results</span>
                    <button type="button" onClick={() => setForm({ ...form, keyResults: [...form.keyResults, newKr()] })} className="text-xs font-medium text-[color:var(--hf-brand-600)]">+ Tambah KR</button>
                  </div>
                  <div className="space-y-2">
                    {form.keyResults.map((kr, idx) => (
                      <div key={kr.id} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-3">
                        <input className="hf-input w-full" placeholder={`Key result ${idx + 1}`} value={kr.title} onChange={(e) => {
                          const keyResults = [...form.keyResults];
                          keyResults[idx] = { ...kr, title: e.target.value };
                          setForm({ ...form, keyResults });
                        }} />
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <input type="number" className="hf-input" placeholder="Target" value={kr.targetValue} onChange={(e) => {
                            const keyResults = [...form.keyResults];
                            keyResults[idx] = { ...kr, targetValue: Number(e.target.value) };
                            setForm({ ...form, keyResults });
                          }} />
                          <input className="hf-input" placeholder="Satuan" value={kr.unit} onChange={(e) => {
                            const keyResults = [...form.keyResults];
                            keyResults[idx] = { ...kr, unit: e.target.value };
                            setForm({ ...form, keyResults });
                          }} />
                          <button type="button" disabled={form.keyResults.length === 1} onClick={() => setForm({ ...form, keyResults: form.keyResults.filter((x) => x.id !== kr.id) })} className="text-xs text-rose-700 disabled:opacity-40">Hapus</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--hf-ink-muted)]">Progres awal: {calcProgress(form.keyResults)}%</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
                <button type="button" onClick={() => setShowCreate(false)} className="hf-btn-secondary">Batal</button>
                <button type="button" onClick={handleCreate} disabled={saving || !form.title.trim()} className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {checkInOkr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCheckInOkr(null)} role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="okr-checkin-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto hf-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
                <div>
                  <h3 id="okr-checkin-title" className="text-sm font-semibold text-[color:var(--hf-ink)]">Check-in progres</h3>
                  <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{checkInOkr.title}</p>
                </div>
                <button type="button" onClick={() => setCheckInOkr(null)} className="rounded-[var(--hf-radius)] p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup"><X className="h-5 w-5 text-[color:var(--hf-ink-faint)]" /></button>
              </div>
              <div className="space-y-3 p-5">
                {checkInForm.keyResults.map((kr, idx) => (
                  <div key={kr.id} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-3">
                    <p className="text-sm font-medium text-[color:var(--hf-ink)]">{kr.title}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Field label={`Aktual (${kr.unit})`}>
                        <input type="number" className="hf-input w-full" value={kr.currentValue} onChange={(e) => {
                          const keyResults = [...checkInForm.keyResults];
                          keyResults[idx] = { ...kr, currentValue: Number(e.target.value) };
                          setCheckInForm({ ...checkInForm, keyResults });
                        }} />
                      </Field>
                      <Field label="Confidence">
                        <select className="hf-input w-full" value={kr.confidence} onChange={(e) => {
                          const keyResults = [...checkInForm.keyResults];
                          keyResults[idx] = { ...kr, confidence: e.target.value as OkrConfidence };
                          setCheckInForm({ ...checkInForm, keyResults });
                        }}>
                          {(Object.keys(CONFIDENCE_LABELS) as OkrConfidence[]).map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
                        </select>
                      </Field>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">Target {Number(kr.targetValue).toLocaleString('id-ID')} · {krProgressPct({ ...kr, currentValue: Number(kr.currentValue) })}%</p>
                  </div>
                ))}
                <Field label="Catatan check-in">
                  <textarea className="hf-input w-full" rows={2} value={checkInForm.note} onChange={(e) => setCheckInForm({ ...checkInForm, note: e.target.value })} placeholder="Apa yang bergerak, hambatan, bantuan yang dibutuhkan" />
                </Field>
                <Field label="Confidence keseluruhan">
                  <select className="hf-input w-full" value={checkInForm.confidence} onChange={(e) => setCheckInForm({ ...checkInForm, confidence: e.target.value as OkrConfidence })}>
                    {(Object.keys(CONFIDENCE_LABELS) as OkrConfidence[]).map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
                  </select>
                </Field>
                <p className="text-sm font-medium text-[color:var(--hf-ink)]">Progres setelah simpan: {calcProgress(checkInForm.keyResults)}%</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
                <button type="button" onClick={() => setCheckInOkr(null)} className="hf-btn-secondary">Batal</button>
                <button type="button" onClick={handleCheckIn} disabled={saving} className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan check-in'}
                </button>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
