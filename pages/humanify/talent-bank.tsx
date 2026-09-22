/**
 * Humanify Bank Data (Talent Bank) — paid add-on
 * Living Talent Profile · NL search · explainable match · rediscovery
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import {
  Brain,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

type TabId = 'bank' | 'search' | 'workforce' | 'dna' | 'detail';

type TalentProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  headline: string | null;
  location: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  experienceYears: number | null;
  skills: string[];
  industries: string[];
  salaryExpectedMin: number | null;
  salaryExpectedMax: number | null;
  intent: string;
  tags: string[];
  consentTalentPool: boolean;
  profileUpdatedAt: string | null;
};

type MatchResult = {
  profileId: string;
  fullName: string;
  roleFit: number;
  actionability: number;
  dataConfidence: number;
  whyMatch: string[];
  potentialGaps: string[];
  uncertainties: string[];
  evidence: { requirement: string; status: string; candidateValue: string; evidence: string }[];
  compensationFit: string;
  locationFit: string;
  commute?: { note: string; fit: string; estimatedKm: number | null };
  intent: string;
  freshnessScore: number;
  sourceKind?: string;
  readinessDays?: number | null;
  missingSkills?: string[];
  buildPath?: string;
};

const INTENT_LABEL: Record<string, string> = {
  actively_looking: 'Actively Looking',
  open: 'Open to Opportunity',
  not_looking: 'Not Looking',
  do_not_contact: 'Do Not Contact',
};

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'ok' | 'warn' }) {
  const color =
    tone === 'ok'
      ? 'var(--hf-success)'
      : tone === 'warn'
        ? 'var(--hf-warning)'
        : 'var(--hf-brand-600)';
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-faint)]">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-[color:var(--hf-ink)]">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function formatIdr(n: number | null | undefined) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function TalentBankPage() {
  const [tab, setTab] = useState<TabId>('bank');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, activelyLooking: 0, open: 0, recentlyUpdated: 0 });
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [q, setQ] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [matching, setMatching] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [market, setMarket] = useState<any>(null);
  const [relaxation, setRelaxation] = useState<{ label: string; available: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    currentTitle: '',
    resumeText: '',
    salaryExpectedMin: '',
    intent: 'open',
  });
  const [toast, setToast] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string, string>>({});
  const [searchScope, setSearchScope] = useState<'all' | 'external' | 'internal'>('all');
  const [buildBuy, setBuildBuy] = useState<any>(null);
  const [workforce, setWorkforce] = useState<any>(null);
  const [poolCounts, setPoolCounts] = useState({ external: 0, internal: 0 });
  const [phase4, setPhase4] = useState<any>(null);
  const [phase4Loading, setPhase4Loading] = useState(false);
  const [analystMessages, setAnalystMessages] = useState<{ role: 'user' | 'analyst'; text: string }[]>([]);
  const [analystSuggestions, setAnalystSuggestions] = useState<{ id: string; label: string; applyAs: string }[]>([]);
  const [analystReply, setAnalystReply] = useState<string | null>(null);
  const [memory, setMemory] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadBank = useCallback(async (search?: string) => {
    setLoading(true);
    setGateError(null);
    try {
      const qs = new URLSearchParams({ action: 'list' });
      if (search) qs.set('q', search);
      const [sRes, lRes] = await Promise.all([
        fetch('/api/humanify/talent-bank?action=stats'),
        fetch(`/api/humanify/talent-bank?${qs}`),
      ]);
      const sJ = await sRes.json();
      const lJ = await lRes.json();
      if (sRes.status === 403 || lRes.status === 403) {
        setGateError(sJ.message || lJ.message || 'Bank Data adalah add-on berbayar. Aktifkan di Billing.');
        setProfiles([]);
        return;
      }
      if (sJ.success) setStats(sJ.data);
      if (lJ.success) setProfiles(lJ.data?.items || []);
    } catch {
      flash('Gagal memuat Bank Data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBank();
  }, [loadBank]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setTab('detail');
    const res = await fetch(`/api/humanify/talent-bank?action=get&id=${encodeURIComponent(id)}`);
    const j = await res.json();
    if (j.success) setDetail(j.data);
  };

  const runNlSearch = async (overrides?: Record<string, string>, scope = searchScope) => {
    if (!nlQuery.trim()) return;
    setMatching(true);
    try {
      const res = await fetch('/api/humanify/talent-bank?action=match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nlQuery,
          priorityOverrides: overrides || priorityOverrides,
          scope,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        flash(j.message || j.error || 'Pencarian gagal');
        return;
      }
      setBlueprint(j.data.blueprint);
      setMatches(j.data.matches || []);
      setMarket(j.data.market);
      setRelaxation(j.data.relaxation || []);
      setBuildBuy(j.data.buildBuy || null);
      setPoolCounts(j.data.poolCounts || { external: 0, internal: 0 });
    } finally {
      setMatching(false);
    }
  };

  const loadWorkforce = async () => {
    const qs = nlQuery.trim() ? `?action=workforce&q=${encodeURIComponent(nlQuery)}` : '?action=workforce';
    const res = await fetch(`/api/humanify/talent-bank${qs}`);
    const j = await res.json();
    if (j.success) setWorkforce(j.data);
    else flash(j.error || 'Gagal muat workforce');
  };

  const loadPhase4 = async () => {
    setPhase4Loading(true);
    try {
      const qs = nlQuery.trim()
        ? `?action=phase4&q=${encodeURIComponent(nlQuery)}`
        : '?action=phase4';
      const res = await fetch(`/api/humanify/talent-bank${qs}`);
      const j = await res.json();
      if (j.success) setPhase4(j.data);
      else flash(j.error || 'Gagal muat Talent DNA');
    } finally {
      setPhase4Loading(false);
    }
  };

  const loadMemory = async () => {
    const res = await fetch('/api/humanify/talent-bank?action=memory&limit=30');
    const j = await res.json();
    if (j.success) setMemory(j.data || []);
  };

  const runAnalyst = async (utterance: string, reset = false) => {
    const text = utterance.trim();
    if (!text) return;
    setMatching(true);
    try {
      const res = await fetch('/api/humanify/talent-bank?action=analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          scope: searchScope,
          blueprint: reset ? null : blueprint,
          messages: reset ? [] : analystMessages,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        flash(j.message || j.error || 'Analyst gagal');
        return;
      }
      setNlQuery(text);
      setBlueprint(j.data.blueprint);
      setMatches(j.data.topMatches || []);
      setMarket(j.data.market);
      setRelaxation(j.data.relaxation || []);
      setAnalystMessages(j.data.messages || []);
      setAnalystSuggestions(j.data.suggestions || []);
      setAnalystReply(j.data.reply || null);
      setPoolCounts(j.data.poolCounts || { external: 0, internal: 0 });
      setPriorityOverrides({});
      setChatInput('');
    } finally {
      setMatching(false);
    }
  };

  const createProfile = async () => {
    if (!form.fullName.trim()) {
      flash('Nama wajib diisi');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/humanify/talent-bank?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email || null,
          phone: form.phone || null,
          location: form.location || null,
          currentTitle: form.currentTitle || null,
          resumeText: form.resumeText || null,
          salaryExpectedMin: form.salaryExpectedMin ? Number(form.salaryExpectedMin) : null,
          intent: form.intent,
          source: 'manual',
        }),
      });
      const j = await res.json();
      if (!j.success) {
        flash(j.error || 'Gagal menyimpan');
        return;
      }
      flash('Profil ditambahkan ke Bank Data');
      setShowCreate(false);
      setForm({
        fullName: '', email: '', phone: '', location: '', currentTitle: '',
        resumeText: '', salaryExpectedMin: '', intent: 'open',
      });
      await loadBank();
    } finally {
      setCreating(false);
    }
  };

  const syncFromAts = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/humanify/talent-bank?action=rediscover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!j.success) {
        flash(j.error || 'Sync gagal');
        return;
      }
      flash(`Rediscovery: ${j.data.imported} diimpor, ${j.data.skipped} dilewati`);
      await loadBank();
    } finally {
      setSyncing(false);
    }
  };

  const pushToAts = async (profileId: string) => {
    const res = await fetch('/api/humanify/talent-bank?action=push-to-ats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    const j = await res.json();
    if (!j.success) {
      flash(j.message || j.error || 'Perlu add-on ATS untuk push ke pipeline');
      return;
    }
    flash('Kandidat masuk pipeline ATS');
  };

  return (
    <HumanifyLayout>
      <TalentShell
        current="talent-bank"
        title="Bank Data Talent"
        subtitle="Living talent profile · pencarian natural · match berbasis bukti"
        icon={Database}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={syncFromAts}
              disabled={syncing}
              className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Rediscovery ATS
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="hf-btn-primary inline-flex items-center gap-1.5 text-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah profil
            </button>
          </div>
        )}
      >
        {toast ? (
          <div className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface)] px-3 py-2 text-sm text-[color:var(--hf-ink)] shadow-[var(--hf-shadow)]">
            {toast}
          </div>
        ) : null}

        {gateError ? (
          <div className="hf-card p-6">
            <HrisEmptyState
              title="Bank Data terkunci"
              description={gateError}
              action={(
                <Link href="/humanify/billing" className="hf-btn-primary inline-flex text-sm">
                  Buka Billing
                </Link>
              )}
            />
          </div>
        ) : (
          <>
            <div className="hf-metric-grid grid grid-cols-2 gap-3 md:grid-cols-4">
              <OpsKpiShell>
                <HRStatCard label="Total profil" value={stats.total} icon={Users} accent="violet" />
              </OpsKpiShell>
              <OpsKpiShell>
                <HRStatCard label="Actively looking" value={stats.activelyLooking} icon={Sparkles} accent="emerald" />
              </OpsKpiShell>
              <OpsKpiShell>
                <HRStatCard label="Open to opp." value={stats.open} icon={User} accent="blue" />
              </OpsKpiShell>
              <OpsKpiShell>
                <HRStatCard label="Update 30 hari" value={stats.recentlyUpdated} icon={Brain} accent="amber" />
              </OpsKpiShell>
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface)] p-1">
              {([
                { id: 'bank' as const, label: 'Talent Bank' },
                { id: 'search' as const, label: 'Talent Search' },
                { id: 'workforce' as const, label: 'Build / Buy' },
                { id: 'dna' as const, label: 'Talent DNA' },
                { id: 'detail' as const, label: 'Candidate 360', disabled: !selectedId },
              ]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.disabled}
                  onClick={() => {
                    setTab(t.id);
                    if (t.id === 'workforce') void loadWorkforce();
                    if (t.id === 'dna') void loadPhase4();
                  }}
                  className={`shrink-0 rounded-[calc(var(--hf-radius)-2px)] px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                    tab === t.id
                      ? 'bg-[var(--hf-brand-600)] text-white'
                      : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'bank' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadBank(q); }}
                      placeholder="Cari nama, skill, lokasi…"
                      className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--hf-brand-500)]"
                    />
                  </div>
                  <button type="button" onClick={() => loadBank(q)} className="hf-btn-secondary text-sm">
                    Cari
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--hf-ink-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="hf-card p-6">
                    <HrisEmptyState
                      title="Bank Data masih kosong"
                      description="Tambah profil manual, tempel teks CV, atau jalankan Rediscovery dari kandidat ATS."
                      action={(
                        <button type="button" onClick={() => setShowCreate(true)} className="hf-btn-primary text-sm">
                          Tambah profil
                        </button>
                      )}
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--hf-border)] bg-[var(--hf-surface-muted)] text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                        <tr>
                          <th className="px-4 py-3 font-medium">Talent</th>
                          <th className="px-4 py-3 font-medium">Lokasi</th>
                          <th className="px-4 py-3 font-medium">Skill</th>
                          <th className="px-4 py-3 font-medium">Intent</th>
                          <th className="px-4 py-3 font-medium">Ekspektasi</th>
                          <th className="px-4 py-3 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {profiles.map((p) => (
                          <tr key={p.id} className="border-b border-[var(--hf-border)] last:border-0 hover:bg-[var(--hf-surface-muted)]/60">
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => openDetail(p.id)} className="text-left">
                                <div className="font-medium text-[color:var(--hf-ink)]">{p.fullName}</div>
                                <div className="text-xs text-[color:var(--hf-ink-muted)]">
                                  {p.currentTitle || p.headline || p.email || '—'}
                                  {p.experienceYears != null ? ` · ${p.experienceYears} th` : ''}
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-[color:var(--hf-ink-muted)]">{p.location || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex max-w-[220px] flex-wrap gap-1">
                                {(p.skills || []).slice(0, 3).map((s) => (
                                  <span key={s} className="rounded-md bg-[var(--hf-brand-50)] px-1.5 py-0.5 text-[11px] text-[var(--hf-brand-600)]">{s}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[color:var(--hf-ink-muted)]">
                              {INTENT_LABEL[p.intent] || p.intent}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[color:var(--hf-ink-muted)]">
                              {formatIdr(p.salaryExpectedMin)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => pushToAts(p.id)}
                                className="text-xs font-medium text-[var(--hf-brand-600)] hover:underline"
                              >
                                Ke ATS
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'search' && (
              <div className="space-y-4">
                <div className="hf-card space-y-3 p-4 md:p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--hf-ink)]">
                    <Sparkles className="h-4 w-4 text-[var(--hf-brand-600)]" />
                    Conversational Talent Analyst
                  </div>
                  <p className="text-sm text-[color:var(--hf-ink-muted)]">
                    Mulai dengan kebutuhan posisi, lalu refine lewat chat — prioritas skill, industri, atau relaksasi constraint.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'all' as const, label: 'Semua (eksternal + internal)' },
                      { id: 'external' as const, label: 'Bank Data saja' },
                      { id: 'internal' as const, label: 'Karyawan / alumni' },
                    ]).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSearchScope(s.id)}
                        className={`rounded-[var(--hf-radius)] px-2.5 py-1 text-xs font-medium ${
                          searchScope === s.id
                            ? 'bg-[var(--hf-brand-600)] text-white'
                            : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {analystMessages.length > 0 && (
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/40 p-3">
                      {analystMessages.map((m, i) => (
                        <div
                          key={`${m.role}-${i}`}
                          className={`text-sm ${m.role === 'user' ? 'text-[color:var(--hf-ink)]' : 'text-[color:var(--hf-ink-muted)]'}`}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                            {m.role === 'user' ? 'Anda' : 'Analyst'}
                          </span>
                          <p className="mt-0.5">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {analystSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {analystSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={matching}
                          onClick={() => void runAnalyst(s.applyAs)}
                          className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--hf-ink-muted)] hover:border-[var(--hf-brand-500)] hover:text-[var(--hf-brand-600)] disabled:opacity-50"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={chatInput || nlQuery}
                      onChange={(e) => {
                        setChatInput(e.target.value);
                        setNlQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void runAnalyst((chatInput || nlQuery).trim(), analystMessages.length === 0);
                        }
                      }}
                      placeholder="Cari Marketing Manager Tangerang sekitar Rp10 juta…"
                      className="min-w-0 flex-1 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--hf-brand-500)]"
                    />
                    <button
                      type="button"
                      onClick={() => void runAnalyst((chatInput || nlQuery).trim(), analystMessages.length === 0)}
                      disabled={matching || !(chatInput || nlQuery).trim()}
                      className="hf-btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
                    >
                      {matching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      {analystMessages.length ? 'Refine' : 'Mulai analisis'}
                    </button>
                    {analystMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnalystMessages([]);
                          setAnalystSuggestions([]);
                          setAnalystReply(null);
                          setBlueprint(null);
                          setMatches([]);
                          setChatInput('');
                        }}
                        className="hf-btn-secondary text-sm"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {(poolCounts.external > 0 || poolCounts.internal > 0) && (
                    <p className="text-xs text-[color:var(--hf-ink-faint)]">
                      Pool: {poolCounts.external} eksternal · {poolCounts.internal} internal/alumni
                      {analystReply ? ' · percakapan aktif' : ''}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void loadMemory()}
                    className="text-xs font-medium text-[var(--hf-brand-600)] hover:underline"
                  >
                    Tampilkan Recruitment Memory
                  </button>
                  {memory.length > 0 && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-[var(--hf-border)] pt-2 text-xs text-[color:var(--hf-ink-muted)]">
                      {memory.slice(0, 15).map((ev) => (
                        <li key={ev.id}>
                          <span className="font-medium text-[color:var(--hf-ink)]">{ev.profileName || String(ev.profileId).slice(0, 8)}</span>
                          {' · '}{ev.title || ev.kind}
                          <span className="text-[color:var(--hf-ink-faint)]"> · {new Date(ev.occurredAt).toLocaleDateString('id-ID')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {blueprint && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="hf-card space-y-2 p-4 lg:col-span-1">
                      <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">Role Blueprint</h3>
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Role</dt><dd>{blueprint.role || '—'}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Lokasi</dt><dd>{blueprint.location || '—'}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Salary max</dt><dd>{formatIdr(blueprint.salaryMax)}</dd></div>
                        <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Exp min</dt><dd>{blueprint.experienceMin ?? '—'} th</dd></div>
                      </dl>
                      {blueprint.healthGaps?.length ? (
                        <div className="mt-2 rounded-[var(--hf-radius)] bg-[var(--hf-warning)]/10 px-2.5 py-2 text-xs text-[color:var(--hf-ink)]">
                          Role health: {blueprint.healthGaps.join(' · ')}
                        </div>
                      ) : null}
                      {blueprint.requirements?.length ? (
                        <ul className="mt-2 space-y-2 text-xs text-[color:var(--hf-ink-muted)]">
                          {blueprint.requirements.map((r: any) => (
                            <li key={r.key} className="flex flex-col gap-1 rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-2 py-1.5">
                              <span className="font-medium text-[color:var(--hf-ink)]">{r.label}</span>
                              <select
                                className="rounded border border-[var(--hf-border)] bg-[var(--hf-surface)] px-1.5 py-1 text-[11px]"
                                value={priorityOverrides[r.key] || r.priority}
                                onChange={(e) => {
                                  const next = { ...priorityOverrides, [r.key]: e.target.value };
                                  setPriorityOverrides(next);
                                  void runNlSearch(next);
                                }}
                              >
                                <option value="must_have">Must Have</option>
                                <option value="strongly_preferred">Strongly Preferred</option>
                                <option value="preferred">Preferred</option>
                                <option value="nice_to_have">Nice to Have</option>
                                <option value="exclude">Exclude</option>
                              </select>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
                      {market && (
                        <div className="hf-card h-full p-4 sm:col-span-2">
                          <div className="mb-2 flex items-baseline justify-between">
                            <h3 className="text-sm font-semibold">Talent Market Simulator</h3>
                            <span className="text-xs text-[color:var(--hf-ink-faint)]">{market.exact} exact match</span>
                          </div>
                          <p className="mb-3 text-sm text-[color:var(--hf-ink-muted)]">{market.insight}</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {(market.scenarios || []).map((s: any) => (
                              <div key={s.label} className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2">
                                <div className="text-xs text-[color:var(--hf-ink-faint)]">{s.label}</div>
                                <div className="text-lg font-semibold tabular-nums">{s.available}</div>
                              </div>
                            ))}
                          </div>
                          {relaxation.length > 0 && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--hf-ink-faint)] sm:col-span-2">Smart relaxation</div>
                              {relaxation.map((r) => (
                                <div key={r.label} className="flex justify-between gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm">
                                  <span className="min-w-0 truncate">{r.label}</span>
                                  <span className="shrink-0 tabular-nums text-[var(--hf-brand-600)]">{r.available}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {market.constraints?.length ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--hf-ink-faint)] sm:col-span-2">Constraint impact</div>
                              {market.constraints.slice(0, 4).map((c: any) => (
                                <div key={c.label} className="text-sm">
                                  <div className="mb-0.5 flex justify-between gap-2">
                                    <span className="truncate text-[color:var(--hf-ink-muted)]">{c.label}</span>
                                    <span className="shrink-0 tabular-nums text-[color:var(--hf-ink)]">−{c.impactPct}%</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                                    <div className="h-full rounded-full bg-[var(--hf-warning)]" style={{ width: `${Math.min(100, c.impactPct)}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {buildBuy && (
                        <div className="hf-card h-full p-4 sm:col-span-2">
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <h3 className="text-sm font-semibold">Build vs Buy vs Borrow</h3>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--hf-brand-600)]">
                              saran: {buildBuy.recommendation}
                            </span>
                          </div>
                          <p className="mb-3 text-sm text-[color:var(--hf-ink-muted)]">{buildBuy.insight}</p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {(buildBuy.options || []).map((o: any) => (
                              <div key={o.path} className="flex h-full flex-col rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2">
                                <div className="text-xs font-medium text-[color:var(--hf-ink)]">{o.label}</div>
                                <div className="mt-1 text-xl font-semibold tabular-nums">{o.count}</div>
                                <p className="mt-1 flex-1 text-[11px] text-[color:var(--hf-ink-faint)]">{o.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {matches.length === 0 ? (
                        <div className="hf-card p-6 text-sm text-[color:var(--hf-ink-muted)] sm:col-span-2">
                          Belum ada hasil. Mulai analisis atau isi Bank Data terlebih dahulu.
                        </div>
                      ) : (
                        matches.map((m) => (
                          <button
                            key={m.profileId}
                            type="button"
                            onClick={() => openDetail(m.profileId)}
                            className="hf-tile-interactive flex h-full min-h-0 flex-col space-y-3 p-4 text-left"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-[color:var(--hf-ink)]">{m.fullName}</div>
                                <div className="text-xs text-[color:var(--hf-ink-muted)]">
                                  {m.sourceKind ? `${m.sourceKind} · ` : ''}
                                  {INTENT_LABEL[m.intent] || m.intent}
                                  {' · '}
                                  Salary {m.compensationFit}
                                  {' · '}
                                  Lokasi {m.locationFit}
                                  {m.readinessDays != null ? ` · siap ~${m.readinessDays}h` : ''}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-[var(--hf-brand-50)] px-2 py-0.5 text-[11px] font-medium text-[var(--hf-brand-600)]">
                                Freshness {m.freshnessScore}%
                              </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <ScoreBar label="Role Fit" value={m.roleFit} tone="brand" />
                              <ScoreBar label="Actionability" value={m.actionability} tone="ok" />
                              <ScoreBar label="Confidence" value={m.dataConfidence} tone="warn" />
                            </div>
                            {m.missingSkills && m.missingSkills.length > 0 ? (
                              <div className="text-xs text-[color:var(--hf-ink-muted)]">
                                <span className="font-medium text-[color:var(--hf-ink)]">Skill gap: </span>
                                {m.missingSkills.join(', ')}
                                {m.buildPath ? ` · ${m.buildPath}` : ''}
                              </div>
                            ) : null}
                            {m.whyMatch.length > 0 && (
                              <div className="line-clamp-2 text-xs text-[color:var(--hf-ink-muted)]">
                                <span className="font-medium text-[color:var(--hf-ink)]">Why match: </span>
                                {m.whyMatch.join(' · ')}
                              </div>
                            )}
                            {m.commute?.note ? (
                              <div className="text-xs text-[color:var(--hf-ink-faint)]">
                                Commute: {m.commute.note} · fit {m.commute.fit}
                              </div>
                            ) : null}
                            {m.potentialGaps.length > 0 && (
                              <div className="line-clamp-1 text-xs text-[color:var(--hf-ink-muted)]">
                                <span className="font-medium text-[color:var(--hf-ink)]">Gaps: </span>
                                {m.potentialGaps.join(' · ')}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'workforce' && (
              <div className="space-y-4">
                <div className="hf-card space-y-3 p-4">
                  <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">Team Capability & Build/Buy</h3>
                  <p className="text-sm text-[color:var(--hf-ink-muted)]">
                    Analisis skill tim internal vs kebutuhan posisi. Isi query di Talent Search lalu buka tab ini, atau ketik di bawah.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={nlQuery}
                      onChange={(e) => setNlQuery(e.target.value)}
                      placeholder="Contoh: Marketing Manager digital marketing FMCG"
                      className="min-w-0 flex-1 rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await loadWorkforce();
                        if (nlQuery.trim()) await runNlSearch(undefined, 'all');
                      }}
                      className="hf-btn-primary text-sm"
                    >
                      Analisis
                    </button>
                  </div>
                </div>

                {buildBuy && (
                  <div className="hf-card p-4">
                    <div className="mb-2 flex justify-between">
                      <h3 className="text-sm font-semibold">Rekomendasi keputusan</h3>
                      <span className="text-xs font-semibold uppercase text-[var(--hf-brand-600)]">{buildBuy.recommendation}</span>
                    </div>
                    <p className="mb-3 text-sm text-[color:var(--hf-ink-muted)]">{buildBuy.insight}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {(buildBuy.options || []).map((o: any) => (
                        <div key={o.path} className="flex h-full flex-col rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-3">
                          <div className="text-sm font-medium">{o.label}</div>
                          <div className="mt-1 text-2xl font-semibold tabular-nums">{o.count}</div>
                          <p className="mt-2 flex-1 text-xs text-[color:var(--hf-ink-muted)]">{o.note}</p>
                          {(o.top || []).length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-[color:var(--hf-ink-faint)]">
                              {o.top.map((t: any) => (
                                <li key={t.profileId} className="truncate">{t.fullName} · fit {t.roleFit}%</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workforce?.teams?.length ? (
                  <div className="overflow-hidden rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--hf-border)] bg-[var(--hf-surface-muted)] text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                        <tr>
                          <th className="px-4 py-3 font-medium">Tim / Dept</th>
                          <th className="px-4 py-3 font-medium">HC</th>
                          <th className="px-4 py-3 font-medium">Strengths</th>
                          <th className="px-4 py-3 font-medium">Capability gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workforce.teams.map((t: any) => (
                          <tr key={t.department} className="border-b border-[var(--hf-border)] last:border-0">
                            <td className="px-4 py-3 font-medium">{t.department}</td>
                            <td className="px-4 py-3 tabular-nums">{t.headcount}</td>
                            <td className="px-4 py-3 text-xs text-[color:var(--hf-ink-muted)]">
                              {(t.strengths || []).slice(0, 4).map((s: any) => s.skill).join(' · ') || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-[color:var(--hf-ink-muted)]">
                              {t.contributionHint}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="hf-card p-6 text-sm text-[color:var(--hf-ink-muted)]">
                    Belum ada data kemampuan tim. Pastikan ada karyawan aktif di tenant, lalu klik Analisis.
                  </div>
                )}

                {workforce?.internalPreview?.length ? (
                  <div className="hf-card p-4">
                    <h3 className="mb-2 text-sm font-semibold">Internal talent preview</h3>
                    <ul className="divide-y divide-[var(--hf-border)]">
                      {workforce.internalPreview.map((p: any) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <div>
                            <span className="font-medium">{p.fullName}</span>
                            <span className="text-[color:var(--hf-ink-muted)]"> · {p.title || '—'} · {p.department || '—'}</span>
                          </div>
                          <span className="text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">{p.sourceKind}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {tab === 'dna' && (
              <div className="space-y-4">
                <div className="hf-card space-y-3 p-4">
                  <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">Company Talent DNA & Workforce Intelligence</h3>
                  <p className="text-sm text-[color:var(--hf-ink-muted)]">
                    DNA role dari high performer, hire-to-performance loop, suksesi, dan prediksi workforce.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={nlQuery}
                      onChange={(e) => setNlQuery(e.target.value)}
                      placeholder="Filter role (opsional): Marketing Manager"
                      className="min-w-0 flex-1 rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={() => void loadPhase4()} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                      {phase4Loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                      Muat DNA
                    </button>
                  </div>
                  {phase4?.dna?.insight ? (
                    <p className="text-sm text-[color:var(--hf-ink-muted)]">{phase4.dna.insight}</p>
                  ) : null}
                </div>

                {phase4Loading && !phase4 ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--hf-ink-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat Talent DNA…
                  </div>
                ) : null}

                {phase4?.predictive?.insights?.length ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {phase4.predictive.insights.map((ins: any, idx: number) => (
                      <div
                        key={`${ins.kind}-${idx}`}
                        className="flex h-full min-h-[96px] flex-col rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface)] p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">{ins.kind}</span>
                          <span className={`text-[10px] font-semibold uppercase ${
                            ins.severity === 'urgent' ? 'text-[var(--hf-danger)]'
                              : ins.severity === 'watch' ? 'text-[var(--hf-warning)]'
                                : 'text-[color:var(--hf-ink-faint)]'
                          }`}>{ins.severity}</span>
                        </div>
                        <div className="text-sm font-medium text-[color:var(--hf-ink)]">{ins.title}</div>
                        <p className="mt-1 line-clamp-3 flex-1 text-xs text-[color:var(--hf-ink-muted)]">{ins.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {phase4?.dna?.roles?.length ? (
                  <div className="hf-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Role DNA</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {phase4.dna.roles.slice(0, 6).map((r: any) => (
                        <div key={r.roleKey} className="flex h-full flex-col rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] p-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="min-w-0 truncate font-medium text-[color:var(--hf-ink)]">{r.title}</div>
                            <span className="shrink-0 text-xs tabular-nums text-[color:var(--hf-ink-faint)]">n={r.sampleSize}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(r.traits || []).slice(0, 6).map((t: any) => (
                              <span key={t.skill} className="rounded-md bg-[var(--hf-brand-50)] px-1.5 py-0.5 text-[11px] text-[var(--hf-brand-600)]">
                                {t.skill} · {t.weight}%
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 flex-1 text-xs text-[color:var(--hf-ink-muted)]">{r.insight}</p>
                          {r.salaryBand?.median != null && (
                            <p className="mt-1 text-xs text-[color:var(--hf-ink-faint)]">
                              Band gaji median {formatIdr(r.salaryBand.median)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : phase4 && !phase4Loading ? (
                  <div className="hf-card p-6 text-sm text-[color:var(--hf-ink-muted)]">
                    Belum ada Role DNA. Lengkapi posisi & specialization karyawan, atau isi performance review.
                  </div>
                ) : null}

                {phase4?.benchmark && (
                  <div className="hf-card p-4">
                    <h3 className="mb-2 text-sm font-semibold">Talent Market Benchmark</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Bank Data median</div>
                        <div className="text-lg font-semibold tabular-nums">{formatIdr(phase4.benchmark.bankMedian)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Internal median</div>
                        <div className="text-lg font-semibold tabular-nums">{formatIdr(phase4.benchmark.internalMedian)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Pressure</div>
                        <div className="text-lg font-semibold uppercase text-[var(--hf-brand-600)]">{phase4.benchmark.pressure}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--hf-ink-muted)]">{phase4.benchmark.note}</p>
                  </div>
                )}

                {phase4?.hireLoop && (
                  <div className="hf-card p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Hire-to-Performance Loop</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-[color:var(--hf-ink-faint)]">
                        <span>Performing {phase4.hireLoop.summary?.performing ?? 0}</span>
                        <span>· At risk {phase4.hireLoop.summary?.atRisk ?? 0}</span>
                        <span>· Alumni {phase4.hireLoop.summary?.alumni ?? 0}</span>
                      </div>
                    </div>
                    <p className="mb-3 text-sm text-[color:var(--hf-ink-muted)]">{phase4.hireLoop.insight}</p>
                    {(phase4.hireLoop.items || []).length ? (
                      <ul className="divide-y divide-[var(--hf-border)]">
                        {phase4.hireLoop.items.slice(0, 12).map((it: any) => (
                          <li key={`${it.profileId}-${it.stage}`} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                            <div>
                              <span className="font-medium">{it.fullName}</span>
                              <span className="text-[color:var(--hf-ink-muted)]"> · {it.hiredAs || '—'}</span>
                              <div className="text-xs text-[color:var(--hf-ink-faint)]">{it.note}</div>
                            </div>
                            <div className="text-right text-xs">
                              <span className="font-semibold uppercase text-[var(--hf-brand-600)]">{it.stage}</span>
                              {it.performanceScore != null && (
                                <div className="tabular-nums text-[color:var(--hf-ink-muted)]">score {it.performanceScore}</div>
                              )}
                              {it.kpiAchievement != null && (
                                <div className="tabular-nums text-[color:var(--hf-ink-muted)]">KPI {it.kpiAchievement}%</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[color:var(--hf-ink-muted)]">Belum ada tautan Bank Data ↔ karyawan (email) atau outcome performansi.</p>
                    )}
                  </div>
                )}

                {phase4?.succession?.plans?.length ? (
                  <div className="overflow-hidden rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface)]">
                    <div className="border-b border-[var(--hf-border)] px-4 py-3">
                      <h3 className="text-sm font-semibold">Succession</h3>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">{phase4.succession.insight}</p>
                    </div>
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--hf-border)] bg-[var(--hf-surface-muted)] text-[11px] uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                        <tr>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Risk</th>
                          <th className="px-4 py-3 font-medium">Incumbent</th>
                          <th className="px-4 py-3 font-medium">Successors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase4.succession.plans.map((p: any) => (
                          <tr key={p.roleTitle} className="border-b border-[var(--hf-border)] last:border-0 align-top">
                            <td className="px-4 py-3 font-medium">{p.roleTitle}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold uppercase ${
                                p.risk === 'high' ? 'text-[var(--hf-danger)]'
                                  : p.risk === 'medium' ? 'text-[var(--hf-warning)]'
                                    : 'text-[var(--hf-success)]'
                              }`}>{p.risk}</span>
                            </td>
                            <td className="px-4 py-3 text-[color:var(--hf-ink-muted)]">{p.incumbent?.name || '—'}</td>
                            <td className="px-4 py-3 text-xs text-[color:var(--hf-ink-muted)]">
                              {(p.successors || []).length === 0
                                ? 'Belum ada'
                                : p.successors.slice(0, 3).map((s: any) => (
                                  <div key={s.profileId} className="mb-1">
                                    {s.fullName} · {s.readiness} · fit {s.roleFit}%
                                    {s.learningPath?.[0] ? (
                                      <div className="text-[color:var(--hf-ink-faint)]">{s.learningPath[0]}</div>
                                    ) : null}
                                  </div>
                                ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}

            {tab === 'detail' && detail?.profile && (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="hf-card space-y-4 p-5 lg:col-span-1">
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--hf-ink)]">{detail.profile.fullName}</h2>
                    <p className="text-sm text-[color:var(--hf-ink-muted)]">
                      {detail.profile.currentTitle || detail.profile.headline || '—'}
                      {detail.profile.currentCompany ? ` · ${detail.profile.currentCompany}` : ''}
                    </p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Lokasi</dt><dd>{detail.profile.location || '—'}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Intent</dt><dd>{INTENT_LABEL[detail.profile.intent] || detail.profile.intent}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Ekspektasi</dt><dd>{formatIdr(detail.profile.salaryExpectedMin)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-[color:var(--hf-ink-faint)]">Email</dt><dd className="truncate">{detail.profile.email || '—'}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-1">
                    {(detail.profile.skills || []).map((s: string) => (
                      <span key={s} className="rounded-md bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[11px]">{s}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => pushToAts(detail.profile.id)} className="hf-btn-primary text-sm">
                      Shortlist ke ATS
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch('/api/humanify/talent-bank?action=invite-self-update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ profileId: detail.profile.id }),
                        });
                        const j = await res.json();
                        if (!j.success) {
                          flash(j.error || 'Gagal buat link');
                          return;
                        }
                        try {
                          await navigator.clipboard.writeText(j.data.url);
                          flash('Link self-update disalin ke clipboard');
                        } catch {
                          flash(j.data.url);
                        }
                      }}
                      className="hf-btn-secondary text-sm"
                    >
                      Minta update kandidat
                    </button>
                    <Link href="/humanify/recruitment" className="hf-btn-secondary text-sm">
                      Buka Rekrutmen
                    </Link>
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <div className="hf-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Evidence</h3>
                    {(detail.evidence || []).length === 0 ? (
                      <p className="text-sm text-[color:var(--hf-ink-muted)]">Belum ada evidence tersimpan.</p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.evidence.map((ev: any) => (
                          <li key={ev.id} className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm">
                            <div className="font-medium">{ev.claimLabel}</div>
                            <div className="text-xs text-[color:var(--hf-ink-muted)]">{ev.evidence} · {ev.source} · conf {ev.confidence}%</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="hf-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Recruitment Memory</h3>
                    {(detail.history || []).length === 0 ? (
                      <p className="text-sm text-[color:var(--hf-ink-muted)]">Belum ada riwayat interaksi.</p>
                    ) : (
                      <ul className="space-y-2">
                        {detail.history.map((h: any) => (
                          <li key={h.id} className="flex gap-3 text-sm">
                            <span className="shrink-0 tabular-nums text-xs text-[color:var(--hf-ink-faint)]">
                              {new Date(h.occurredAt).toLocaleDateString('id-ID')}
                            </span>
                            <div>
                              <div className="font-medium">{h.title || h.kind}</div>
                              {h.detail ? <div className="text-xs text-[color:var(--hf-ink-muted)]">{h.detail}</div> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {detail.profile.resumeText ? (
                    <div className="hf-card p-4">
                      <h3 className="mb-2 text-sm font-semibold">CV / teks sumber</h3>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[color:var(--hf-ink-muted)]">{detail.profile.resumeText}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="hf-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 shadow-[var(--hf-shadow-md)]">
              <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">Tambah profil Bank Data</h3>
              <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                Tempel teks CV — skill & pengalaman diekstrak otomatis.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                  placeholder="Nama lengkap *"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <input className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm" placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm" placeholder="Lokasi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  <input className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm" placeholder="Jabatan saat ini" value={form.currentTitle} onChange={(e) => setForm({ ...form, currentTitle: e.target.value })} />
                </div>
                <input
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                  placeholder="Ekspektasi gaji (IDR)"
                  value={form.salaryExpectedMin}
                  onChange={(e) => setForm({ ...form, salaryExpectedMin: e.target.value })}
                />
                <select
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                  value={form.intent}
                  onChange={(e) => setForm({ ...form, intent: e.target.value })}
                >
                  <option value="actively_looking">Actively Looking</option>
                  <option value="open">Open to Opportunity</option>
                  <option value="not_looking">Not Looking</option>
                  <option value="do_not_contact">Do Not Contact</option>
                </select>
                <textarea
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                  rows={5}
                  placeholder="Tempel teks CV / ringkasan pengalaman…"
                  value={form.resumeText}
                  onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="hf-btn-secondary text-sm">Batal</button>
                <button type="button" onClick={createProfile} disabled={creating} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </TalentShell>
    </HumanifyLayout>
  );
}
