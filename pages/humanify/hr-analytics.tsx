import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import HRStatCard from '@/components/humanify/HRStatCard';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import {
  BarChart3, Users, Clock, Target, DollarSign, Wallet, UserPlus,
  TrendingUp, TrendingDown, Award, Activity, ChevronRight, RefreshCw,
  AlertTriangle, CheckCircle2, Timer, Briefcase, Sparkles, Brain, Zap, CalendarDays,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

import { HF_CHART_COLORS_SOLID as CHART_COLORS } from '@/lib/humanify/chart-tokens';

type TabKey = 'overview' | 'attendance' | 'performance' | 'payroll' | 'recruitment' | 'predictive' | 'ai';

const EMPTY = {
  overview: { totalEmployees: 0, activeEmployees: 0, newHires: 0, terminations: 0, turnoverRate: 0, attendanceRate: 0, lateRate: 0, absentRate: 0, avgWorkHours: 0, avgLateMinutes: 0 },
  attendance: { total: 0, present: 0, late: 0, absent: 0, rate: 0, lateRate: 0, trend: [] as any[] },
  overtime: { requests: 0, totalHours: 0, totalCost: 0, byDepartment: [] as any[] },
  performance: { total: 0, completed: 0, avgScore: 0 },
  payroll: { runs: 0, totalGross: 0, totalNet: 0, totalDeductions: 0 },
  kpi: { employees: 0, avgAchievement: 0, onTrack: 0, atRisk: 0, offTrack: 0, byDepartment: [] as any[] },
  recruitment: { openPositions: 0, totalCandidates: 0, hired: 0, acceptanceRate: 0 },
  reimbursement: { total: 0, pending: 0, approved: 0, paid: 0, pendingAmount: 0, approvedAmount: 0 },
  leave: { total: 0, pending: 0, approved: 0 },
};

const GRID_STROKE = '#e2e8f0';
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };

function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hf-card hf-analytics-panel overflow-hidden ${className}`}>
      <div className="hf-analytics-panel__rail" aria-hidden />
      <div className="flex items-start justify-between gap-3 border-b border-[var(--hf-border-subtle)] px-4 py-3 pl-5 md:px-5 md:pl-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-[color:var(--hf-ink)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 pl-5 md:p-5 md:pl-6">{children}</div>
    </section>
  );
}

function HealthRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const tone = clamped >= 80 ? 'var(--hf-success)' : clamped >= 60 ? 'var(--hf-warning)' : 'var(--hf-danger)';
  return (
    <div className="hf-analytics-ring" title={`Skor kesehatan SDM ${clamped}`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--hf-brand-100)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="hf-analytics-ring__label">
        <span className="text-lg font-semibold tabular-nums tracking-tight text-[color:var(--hf-ink)]">{clamped}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--hf-ink-faint)]">Health</span>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}) {
  const tones = {
    neutral: 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink)]',
    success: 'bg-emerald-50 text-emerald-800',
    warning: 'bg-amber-50 text-amber-900',
    danger: 'bg-rose-50 text-rose-800',
    brand: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]',
  };
  return (
    <div className={`rounded-[var(--hf-radius)] px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] opacity-70">{hint}</p>}
    </div>
  );
}

function StatusBadge({
  level,
  children,
}: {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  children: ReactNode;
}) {
  const map = {
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-800 border-amber-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)] border-[var(--hf-brand-100)]',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${map[level]}`}>
      {children}
    </span>
  );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)] ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat analitik">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-[108px]" />
        ))}
      </div>
      <SkeletonBlock className="h-11" />
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonBlock className="h-80 lg:col-span-2" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hf-brand-500)]/30"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function HRAnalyticsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [mounted, setMounted] = useState(false);
  const [predictive, setPredictive] = useState<any>(null);
  const [predictiveSource, setPredictiveSource] = useState<HrisDataSource>('empty');
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [aiSource, setAiSource] = useState<'rules' | 'llm' | 'hybrid'>('rules');
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmModel, setLlmModel] = useState('deepseek-v4-flash');
  const [aiLoading, setAiLoading] = useState(false);

  const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hrRes, predRes, aiRes] = await Promise.all([
        fetch(`/api/humanify/hr-analytics?period=${period}`),
        fetch(`/api/humanify/predictive-analytics?action=overview&period=${period}`),
        fetch(`/api/humanify/ai-insights?batch=true&period=${period}`),
      ]);
      const json = await hrRes.json();
      if (json.success && json.data) setData({ ...EMPTY, ...json.data });
      const predJson = await predRes.json();
      if (predJson.success) {
        setPredictive(predJson.data);
        setPredictiveSource(predJson.dataSource || predJson.data?.dataSource || 'live');
        if (predJson.llmEnabled != null) setLlmEnabled(!!predJson.llmEnabled);
        if (predJson.llmModel) setLlmModel(predJson.llmModel);
      }
      const aiJson = await aiRes.json();
      if (aiJson.success) {
        setAiInsights(aiJson.data || []);
        setAiSource(aiJson.source || 'rules');
        if (aiJson.llmEnabled != null) setLlmEnabled(!!aiJson.llmEnabled);
        if (aiJson.llmModel) setLlmModel(aiJson.llmModel);
      }
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, [period]);

  const refreshAiAdvisor = useCallback(async () => {
    setAiLoading(true);
    try {
      const aiRes = await fetch(`/api/humanify/ai-insights?batch=true&period=${period}`);
      const aiJson = await aiRes.json();
      if (aiJson.success) {
        setAiInsights(aiJson.data || []);
        setAiSource(aiJson.source || 'rules');
        if (aiJson.llmEnabled != null) setLlmEnabled(!!aiJson.llmEnabled);
        if (aiJson.llmModel) setLlmModel(aiJson.llmModel);
      }
    } catch { /* ignore */ }
    finally { setAiLoading(false); }
  }, [period]);

  useEffect(() => { setMounted(true); load(); }, [load]);

  const kpiPie = useMemo(() => [
    { name: 'On Track', value: data.kpi.onTrack, color: CHART_COLORS[2] },
    { name: 'At Risk', value: data.kpi.atRisk, color: CHART_COLORS[3] },
    { name: 'Off Track', value: data.kpi.offTrack, color: CHART_COLORS[4] },
  ].filter((d) => d.value > 0), [data.kpi]);

  const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
    { key: 'attendance', label: 'Kehadiran', icon: Clock },
    { key: 'performance', label: 'Kinerja', icon: Target },
    { key: 'payroll', label: 'Payroll', icon: DollarSign },
    { key: 'predictive', label: 'Prediktif', icon: Brain },
    { key: 'ai', label: 'AI Advisor', icon: Zap },
    { key: 'recruitment', label: 'Rekrutmen', icon: UserPlus },
  ];

  const quickLinks = [
    { href: '/humanify/attendance', label: 'Absensi', icon: Clock },
    { href: '/humanify/kpi', label: 'KPI', icon: Target },
    { href: '/humanify/recruitment', label: 'Rekrutmen', icon: UserPlus },
    { href: '/humanify/reimbursement', label: 'Reimbursement', icon: Wallet },
    { href: '/humanify/performance', label: 'Penilaian', icon: Award },
    { href: '/humanify/workforce-analytics', label: 'Workforce', icon: TrendingUp },
    { href: '/employee', label: 'Portal Karyawan', icon: Users },
  ];

  const secondaryKpis = [
    { label: 'Turnover (30h)', value: `${data.overview.turnoverRate || 0}%`, sub: `${data.overview.terminations} terminasi` },
    { label: 'Telat', value: `${data.overview.lateRate}%`, sub: `Rata ${data.overview.avgLateMinutes} mnt` },
    { label: 'Absen', value: `${data.overview.absentRate}%`, sub: `${data.attendance.absent} record` },
    { label: 'Jam kerja avg', value: `${data.overview.avgWorkHours} j`, sub: `Lembur ${data.overtime.totalHours} j` },
    { label: 'Cuti pending', value: data.leave.pending, sub: `${data.leave.approved} disetujui` },
    { label: 'Klaim pending', value: data.reimbursement.pending, sub: fmtCur(data.reimbursement.pendingAmount) },
  ];

  const healthScore = useMemo(() => {
    const attendance = Number(data.overview.attendanceRate) || 0;
    const kpi = Number(data.kpi.avgAchievement) || 0;
    const latePenalty = Math.max(0, 100 - (Number(data.overview.lateRate) || 0) * 2.5);
    return Math.round(attendance * 0.45 + kpi * 0.4 + latePenalty * 0.15);
  }, [data.overview.attendanceRate, data.overview.lateRate, data.kpi.avgAchievement]);

  const insightChips = [
    { icon: CheckCircle2, label: `${data.kpi.onTrack} KPI on track`, tone: 'text-emerald-700' },
    { icon: AlertTriangle, label: `${data.kpi.atRisk + data.kpi.offTrack} perlu perhatian`, tone: 'text-amber-700' },
    { icon: Timer, label: `${data.overtime.totalHours} jam lembur`, tone: 'text-[color:var(--hf-brand-600)]' },
    { icon: Sparkles, label: llmEnabled ? `AIMAN · ${llmModel}` : 'AIMAN rules mode', tone: 'text-[color:var(--hf-brand)]' },
  ];

  return (
    <HQLayout title="HR Analytics" subtitle="Insight SDM real-time — kepadatan enterprise untuk operasi HR">
      <div className="hf-analytics-stage space-y-4">
        {/* Artistic hero — Humanify brand mesh, not generic purple marketing */}
        <header className="hf-analytics-hero px-5 py-5 md:px-6 md:py-6">
          <div className="hf-analytics-hero__orb hf-analytics-hero__orb--a" aria-hidden />
          <div className="hf-analytics-hero__orb hf-analytics-hero__orb--b" aria-hidden />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="hf-analytics-live">
                  <span className="hf-analytics-live__dot" aria-hidden />
                  Live analytics
                </span>
                <span className="hf-analytics-chip">
                  <BarChart3 className="h-3.5 w-3.5 text-[color:var(--hf-brand-600)]" />
                  Analytics Hub
                </span>
              </div>
              <h1 className="hf-page-title text-[1.5rem] md:text-[1.7rem]">Dasbor Analitik HR</h1>
              <p className="hf-page-subtitle max-w-2xl">
                Headcount, kehadiran, KPI, payroll, prediktif, dan AI Advisor dalam satu kanvas operasi · periode {period}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {insightChips.map((chip) => (
                  <span key={chip.label} className="hf-analytics-chip">
                    <chip.icon className={`h-3.5 w-3.5 ${chip.tone}`} />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <HealthRing score={healthScore} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="hr-analytics-period">Periode</label>
                <input
                  id="hr-analytics-period"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="hf-input bg-white/80 backdrop-blur"
                />
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Muat ulang
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="hf-analytics-kpi-shell">
            <HRStatCard
              label="Total Karyawan"
              value={data.overview.totalEmployees}
              sub={`${data.overview.activeEmployees} aktif`}
              icon={Users}
              accent="violet"
              trend={{ value: `+${data.overview.newHires} baru`, positive: true }}
            />
          </div>
          <div className="hf-analytics-kpi-shell">
            <HRStatCard
              label="Tingkat Kehadiran"
              value={`${data.overview.attendanceRate}%`}
              sub={`Telat ${data.overview.lateRate}% · Absen ${data.overview.absentRate}%`}
              icon={Clock}
              accent="emerald"
            />
          </div>
          <div className="hf-analytics-kpi-shell">
            <HRStatCard
              label="Rata-rata KPI"
              value={`${data.kpi.avgAchievement}%`}
              sub={`${data.kpi.onTrack} on track · ${data.kpi.atRisk} at risk`}
              icon={Target}
              accent="indigo"
            />
          </div>
          <div className="hf-analytics-kpi-shell">
            <HRStatCard
              label="Biaya Lembur"
              value={fmtCur(data.overtime.totalCost)}
              sub={`${data.overtime.totalHours} jam · ${data.overtime.requests} pengajuan`}
              icon={Timer}
              accent="amber"
            />
          </div>
        </div>

        <div className="hf-analytics-strip hf-card overflow-x-auto">
          <div className="relative grid min-w-[720px] grid-cols-6 divide-x divide-[var(--hf-border-subtle)]">
            {secondaryKpis.map((k) => (
              <div key={k.label} className="px-3 py-3">
                <p className="hf-section-label">{k.label}</p>
                <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-[color:var(--hf-ink)]">{k.value}</p>
                <p className="truncate text-[11px] text-[color:var(--hf-ink-faint)]">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <EnterpriseTabBar tabs={tabs} active={tab} onChange={setTab} />

        {loading && <LoadingSkeleton />}

        {!loading && tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              title="Tren kehadiran 14 hari"
              subtitle="Hadir, terlambat, dan absen harian"
              action={<InlineLink href="/humanify/attendance">Kelola absensi</InlineLink>}
            >
              <div className="h-72">
                {mounted && data.attendance.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.attendance.trend}>
                      <defs>
                        <linearGradient id="hfPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[2]} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="hfLate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[3]} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={CHART_COLORS[3]} stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="hfAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[4]} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={CHART_COLORS[4]} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                      <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid var(--hf-border)',
                          fontSize: 12,
                          boxShadow: 'var(--hf-shadow-md)',
                          backdropFilter: 'blur(8px)',
                          background: 'rgb(255 255 255 / 0.92)',
                        }}
                      />
                      <Area type="monotone" dataKey="present" name="Hadir" stackId="1" stroke={CHART_COLORS[2]} fill="url(#hfPresent)" strokeWidth={2} />
                      <Area type="monotone" dataKey="late" name="Telat" stackId="1" stroke={CHART_COLORS[3]} fill="url(#hfLate)" strokeWidth={2} />
                      <Area type="monotone" dataKey="absent" name="Absen" stackId="1" stroke={CHART_COLORS[4]} fill="url(#hfAbsent)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <HrisEmptyState
                    title="Belum ada tren kehadiran"
                    description="Data absensi periode ini belum tersedia untuk ditampilkan sebagai grafik."
                    action={<InlineLink href="/humanify/attendance">Buka absensi</InlineLink>}
                  />
                )}
              </div>
            </Panel>

            <Panel title="Status KPI" subtitle="Distribusi on track vs risiko">
              <div className="h-52">
                {mounted && kpiPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={kpiPie} cx="50%" cy="50%" innerRadius={48} outerRadius={74} dataKey="value" paddingAngle={3}>
                        {kpiPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--hf-ink-faint)]">
                    Belum ada data KPI
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-[var(--hf-radius)] bg-emerald-50 px-2 py-2 text-emerald-800">
                  <CheckCircle2 className="mx-auto mb-1 h-3.5 w-3.5" />
                  <span className="font-semibold tabular-nums">{data.kpi.onTrack}</span>
                  <p className="opacity-70">On track</p>
                </div>
                <div className="rounded-[var(--hf-radius)] bg-amber-50 px-2 py-2 text-amber-900">
                  <AlertTriangle className="mx-auto mb-1 h-3.5 w-3.5" />
                  <span className="font-semibold tabular-nums">{data.kpi.atRisk}</span>
                  <p className="opacity-70">At risk</p>
                </div>
                <div className="rounded-[var(--hf-radius)] bg-rose-50 px-2 py-2 text-rose-800">
                  <TrendingDown className="mx-auto mb-1 h-3.5 w-3.5" />
                  <span className="font-semibold tabular-nums">{data.kpi.offTrack}</span>
                  <p className="opacity-70">Off track</p>
                </div>
              </div>
            </Panel>

            <Panel className="lg:col-span-3" title="Akses cepat modul HR" subtitle="Navigasi operasional tanpa meninggalkan konteks analitik">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
                {quickLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-gradient-to-br from-white to-[var(--hf-surface-muted)]/40 px-3 py-2.5 text-sm text-[color:var(--hf-ink-secondary)] transition hover:border-[var(--hf-brand-100)] hover:shadow-[var(--hf-shadow-md)] hover:text-[color:var(--hf-brand)]"
                  >
                    <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--hf-brand-500)] opacity-0 transition group-hover:opacity-100" aria-hidden />
                    <l.icon className="h-4 w-4 shrink-0 text-[color:var(--hf-ink-faint)] group-hover:text-[color:var(--hf-brand-600)]" />
                    <span className="truncate font-medium">{l.label}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {!loading && tab === 'attendance' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Analitik kehadiran"
              subtitle={`Detail periode ${period}`}
              action={<InlineLink href="/humanify/attendance">Kelola absensi</InlineLink>}
            >
              <div className="grid grid-cols-2 gap-2">
                <MetricCell label="Total record" value={data.attendance.total} />
                <MetricCell label="Hadir" value={data.attendance.present} tone="success" />
                <MetricCell label="Terlambat" value={data.attendance.late} tone="warning" />
                <MetricCell label="Absen" value={data.attendance.absent} tone="danger" />
                <MetricCell label="Rata jam kerja" value={`${data.overview.avgWorkHours} jam`} tone="brand" />
                <MetricCell label="Rata telat" value={`${data.overview.avgLateMinutes} mnt`} tone="warning" />
              </div>
            </Panel>
            <Panel
              title="Lembur per departemen"
              subtitle="Jam lembur teragregasi"
              action={<InlineLink href="/humanify/payroll/lembur">Kelola lembur</InlineLink>}
            >
              <div className="h-64">
                {mounted && data.overtime.byDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.overtime.byDepartment.map((d: any) => ({ name: d.department || 'N/A', hours: d.hours }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                      <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--hf-border)', fontSize: 12 }} />
                      <Bar dataKey="hours" name="Jam Lembur" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--hf-ink-faint)]">
                    Belum ada data lembur
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {!loading && tab === 'performance' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Performance review"
              subtitle="Penyelesaian siklus penilaian"
              action={<InlineLink href="/humanify/performance">Buka penilaian</InlineLink>}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-4 py-3">
                  <span className="text-sm text-[color:var(--hf-ink-muted)]">Review selesai</span>
                  <span className="text-xl font-semibold tabular-nums text-[color:var(--hf-brand)]">
                    {data.performance.completed}/{data.performance.total}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-4 py-3">
                  <span className="text-sm text-[color:var(--hf-ink-muted)]">Skor rata-rata</span>
                  <span className="text-xl font-semibold tabular-nums text-[color:var(--hf-ink)]">
                    {data.performance.avgScore || '—'}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--hf-brand-600)]"
                    style={{
                      width: `${data.performance.total > 0 ? Math.min(100, Math.round((data.performance.completed / data.performance.total) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[color:var(--hf-ink-faint)]">
                  Progres penyelesaian review periode berjalan
                </p>
              </div>
            </Panel>
            <Panel
              title="KPI per departemen"
              subtitle="Pencapaian % terhadap target"
              action={<InlineLink href="/humanify/kpi">Kelola KPI</InlineLink>}
            >
              <div className="h-64">
                {mounted && data.kpi.byDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.kpi.byDepartment.map((d: any) => ({ name: d.department, achievement: d.achievement }))}
                      layout="vertical"
                      margin={{ left: 4, right: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
                      <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Pencapaian']} contentStyle={{ borderRadius: 8, border: '1px solid var(--hf-border)', fontSize: 12 }} />
                      <Bar dataKey="achievement" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--hf-ink-faint)]">
                    Belum ada data KPI departemen
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {!loading && tab === 'payroll' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Payroll" subtitle={`Ringkasan run periode ${period}`}>
              <div className="hf-table-wrap !shadow-none">
                <table>
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      <th className="!text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Payroll run', value: data.payroll.runs },
                      { label: 'Total gross', value: fmtCur(data.payroll.totalGross) },
                      { label: 'Total net', value: fmtCur(data.payroll.totalNet) },
                      { label: 'Potongan', value: fmtCur(data.payroll.totalDeductions) },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td className="text-right font-semibold tabular-nums text-[color:var(--hf-ink)]">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel
              title="Reimbursement"
              subtitle="Klaim karyawan terintegrasi payroll"
              action={<InlineLink href="/humanify/reimbursement">Kelola klaim</InlineLink>}
            >
              <div className="grid grid-cols-2 gap-2">
                <MetricCell
                  label="Pending"
                  value={data.reimbursement.pending}
                  hint={fmtCur(data.reimbursement.pendingAmount)}
                  tone="warning"
                />
                <MetricCell
                  label="Disetujui"
                  value={data.reimbursement.approved}
                  hint={fmtCur(data.reimbursement.approvedAmount)}
                  tone="success"
                />
                <MetricCell label="Dibayar" value={data.reimbursement.paid} tone="brand" />
                <MetricCell label="Total klaim" value={data.reimbursement.total} />
              </div>
            </Panel>
          </div>
        )}

        {!loading && tab === 'predictive' && predictive && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 hf-card px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] p-2 text-[color:var(--hf-brand-600)]">
                  <Brain className="h-4 w-4" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--hf-brand-500)]" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Prediktif + AIMAN</p>
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">
                    {llmEnabled
                      ? `LLM aktif · ${llmModel} · sumber ${predictive.llmSource || 'rules'}`
                      : 'Mode rules — aktifkan AIMAN di pengaturan AI'}
                  </p>
                </div>
              </div>
              <DataSourceBadge source={predictiveSource} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <HRStatCard label="Risiko kritis" value={predictive.attritionRisk?.criticalCount ?? 0} sub="Perlu intervensi" icon={AlertTriangle} accent="rose" />
              <HRStatCard label="Risiko tinggi" value={predictive.attritionRisk?.highRiskCount ?? 0} sub={`Avg ${predictive.attritionRisk?.avgRiskScore ?? 0}`} icon={TrendingDown} accent="orange" />
              <HRStatCard label="Prediksi absen" value={`${predictive.absenteeism?.predictedRate ?? 0}%`} sub={predictive.absenteeism?.trend ?? 'stable'} icon={Clock} accent="blue" />
              <HRStatCard label="Prediksi cuti" value={predictive.leaveForecast?.predictedRequests ?? 0} sub={`Ops: ${predictive.leaveForecast?.operationalRisk ?? 'low'}`} icon={CalendarDays} accent="cyan" />
              <HRStatCard label="Engagement" value={predictive.engagementScore ?? '—'} sub="skor survei 6 bln" icon={Sparkles} accent="violet" />
            </div>

            {predictive.leaveForecast && (
              <Panel title="Prediksi permintaan cuti" subtitle="Pola pengajuan 12 bulan terakhir">
                <div className="grid gap-2 md:grid-cols-3">
                  <MetricCell label="Perkiraan bulan depan" value={`${predictive.leaveForecast.predictedRequests} pengajuan`} tone="brand" />
                  <MetricCell label="Bulan peak" value={(predictive.leaveForecast.peakMonths || []).join(', ') || '—'} />
                  <MetricCell
                    label="Rekomendasi"
                    value={predictive.leaveForecast.recommendation || '—'}
                    tone={
                      predictive.leaveForecast.operationalRisk === 'high'
                        ? 'danger'
                        : predictive.leaveForecast.operationalRisk === 'medium'
                          ? 'warning'
                          : 'success'
                    }
                  />
                </div>
              </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Top attrition risk" subtitle="Karyawan berisiko resignasi tertinggi">
                {(predictive.attritionRisk?.topRisks || []).length > 0 ? (
                  <div className="hf-table-wrap !shadow-none max-h-80 overflow-auto">
                    <table>
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th>Karyawan</th>
                          <th>Departemen</th>
                          <th className="!text-right">Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(predictive.attritionRisk?.topRisks || []).slice(0, 8).map((e: any) => (
                          <tr key={e.employeeId}>
                            <td>
                              <p className="font-medium text-[color:var(--hf-ink)]">{e.employeeName}</p>
                              <p className="text-[11px] text-[color:var(--hf-ink-faint)]">{e.tenureMonths} bln · {e.recommendation}</p>
                            </td>
                            <td className="text-[color:var(--hf-ink-muted)]">{e.department}</td>
                            <td className="text-right">
                              <StatusBadge
                                level={
                                  e.riskLevel === 'critical' ? 'critical' : e.riskLevel === 'high' ? 'high' : 'medium'
                                }
                              >
                                {e.riskScore}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-[color:var(--hf-ink-faint)]">Belum ada skor risiko</p>
                )}
              </Panel>

              <Panel title="Proyeksi headcount" subtitle="Forecast bulanan">
                <div className="h-64">
                  {mounted && (predictive.headcount || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictive.headcount}>
                        <defs>
                          <linearGradient id="hfHeadcount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                        <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--hf-border)', fontSize: 12 }} />
                        <Area type="monotone" dataKey="projected" name="Proyeksi" stroke={CHART_COLORS[0]} fill="url(#hfHeadcount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[color:var(--hf-ink-faint)]">
                      Data headcount terbatas
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            <Panel title="AI predictive insights" subtitle="Temuan prioritas dengan aksi yang disarankan">
              <div className="grid gap-2 md:grid-cols-2">
                {(predictive.insights || []).map((ins: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] border-l-4 bg-gradient-to-r from-white to-[var(--hf-brand-50)]/40 p-3.5"
                    style={{
                      borderLeftColor:
                        ins.severity === 'critical'
                          ? 'var(--hf-danger)'
                          : ins.severity === 'high'
                            ? 'var(--hf-warning)'
                            : 'var(--hf-info)',
                    }}
                  >
                    <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{ins.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">{ins.description}</p>
                    <p className="mt-2 text-xs font-medium text-[color:var(--hf-brand-600)]">→ {ins.action}</p>
                  </div>
                ))}
                {(predictive.insights || []).length === 0 && (
                  <p className="col-span-2 py-6 text-center text-sm text-[color:var(--hf-ink-faint)]">Belum ada insight prediktif</p>
                )}
              </div>
            </Panel>
          </div>
        )}

        {!loading && tab === 'ai' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 hf-card px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] p-2 text-[color:var(--hf-brand-600)]">
                  <Zap className="h-4 w-4" />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Humanify AI Advisor · AIMAN</p>
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">
                    {llmEnabled
                      ? `Terhubung ke AIMAN (${llmModel}) · sumber insight: ${aiSource}`
                      : 'Fallback rule-based — aktifkan AIMAN di pengaturan AI untuk LLM'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshAiAdvisor}
                disabled={aiLoading}
                className="hf-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading ? 'Memanggil AIMAN…' : 'Generate ulang'}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {aiInsights.map((ins: any, i: number) => (
                <article key={i} className="hf-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-[var(--hf-brand-50)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-brand)]">
                      {ins.module}
                    </span>
                    <StatusBadge
                      level={ins.priority === 'critical' ? 'critical' : ins.priority === 'high' ? 'high' : 'info'}
                    >
                      {ins.confidence}%
                    </StatusBadge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[color:var(--hf-ink)]">{ins.title}</h3>
                  <p className="mt-1.5 text-sm text-[color:var(--hf-ink-muted)]">{ins.summary}</p>
                  <ul className="mt-3 space-y-1">
                    {(ins.actions || []).map((a: string, j: number) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-[color:var(--hf-brand-600)]">
                        <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {aiInsights.length === 0 && (
                <div className="col-span-2">
                  <HrisEmptyState
                    title={aiLoading ? 'Memanggil AIMAN…' : 'Belum ada insight'}
                    description="Klik Generate ulang untuk menghasilkan rekomendasi AI Advisor."
                    action={(
                      <button type="button" onClick={refreshAiAdvisor} disabled={aiLoading} className="hf-btn-primary disabled:opacity-50">
                        Generate ulang
                      </button>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === 'recruitment' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Pipeline rekrutmen"
              subtitle="Posisi terbuka hingga acceptance rate"
              action={<InlineLink href="/humanify/recruitment">Buka rekrutmen</InlineLink>}
            >
              <div className="grid grid-cols-2 gap-2">
                <MetricCell label="Posisi terbuka" value={data.recruitment.openPositions} tone="warning" />
                <MetricCell label="Total kandidat" value={data.recruitment.totalCandidates} tone="brand" />
                <MetricCell label="Diterima" value={data.recruitment.hired} tone="success" />
                <MetricCell label="Acceptance rate" value={`${data.recruitment.acceptanceRate}%`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[color:var(--hf-ink-muted)]">
                <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Openings</span>
                <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Candidates</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Hired</span>
                <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Acceptance</span>
              </div>
            </Panel>
            <Panel title="Kapabilitas platform" subtitle="Diferensiasi operasional vs alur manual">
              <ul className="space-y-2.5 text-sm text-[color:var(--hf-ink-secondary)]">
                {[
                  'AI screening kandidat langsung di pipeline',
                  '9-Box Matrix & OKR cascading dalam satu platform',
                  'Absensi GPS + face recognition + device sync',
                  'Reimbursement → payroll otomatis tanpa export manual',
                ].map((item) => (
                  <li key={item} className="flex gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-border-subtle)] bg-[var(--hf-surface-muted)]/60 px-3 py-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--hf-success)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        {!loading && tab === 'predictive' && !predictive && (
          <HrisEmptyState
            title="Data prediktif belum siap"
            description="Model prediktif belum mengembalikan ringkasan untuk periode ini. Coba muat ulang atau lengkapi data SDM."
            source={predictiveSource}
            action={(
              <button type="button" onClick={load} className="hf-btn-primary">
                Muat ulang
              </button>
            )}
          />
        )}
      </div>
    </HQLayout>
  );
}
