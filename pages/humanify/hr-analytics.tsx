import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import HRStatCard from '@/components/humanify/HRStatCard';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
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
    { name: 'On Track', value: data.kpi.onTrack, color: '#10B981' },
    { name: 'At Risk', value: data.kpi.atRisk, color: '#F59E0B' },
    { name: 'Off Track', value: data.kpi.offTrack, color: '#EF4444' },
  ].filter(d => d.value > 0), [data.kpi]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
    { key: 'attendance', label: 'Kehadiran & Lembur', icon: Clock },
    { key: 'performance', label: 'Kinerja & KPI', icon: Target },
    { key: 'payroll', label: 'Payroll & Klaim', icon: DollarSign },
    { key: 'predictive', label: 'Prediktif', icon: Brain },
    { key: 'ai', label: 'AI Advisor', icon: Zap },
    { key: 'recruitment', label: 'Rekrutmen', icon: UserPlus },
  ];

  const quickLinks = [
    { href: '/humanify/attendance', label: 'Absensi', icon: Clock, color: 'text-green-600 bg-green-50' },
    { href: '/humanify/kpi', label: 'KPI', icon: Target, color: 'text-purple-600 bg-purple-50' },
    { href: '/humanify/recruitment', label: 'Rekrutmen', icon: UserPlus, color: 'text-orange-600 bg-orange-50' },
    { href: '/humanify/reimbursement', label: 'Reimbursement', icon: Wallet, color: 'text-teal-600 bg-teal-50' },
    { href: '/humanify/performance', label: 'Penilaian', icon: Award, color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]' },
    { href: '/employee', label: 'Portal Karyawan', icon: Users, color: 'text-cyan-600 bg-cyan-50' },
    { href: '/humanify/workforce-analytics', label: 'Workforce', icon: TrendingUp, color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]' },
  ];

  return (
    <HQLayout title="HR Analytics" subtitle="Insight SDM real-time — lebih lengkap dari dashboard HRIS standar">
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[var(--hf-brand-500)] to-[var(--hf-brand)] p-6 text-white shadow-xl md:p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[color:var(--hf-brand-600)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Humanify Analytics Hub</span>
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">Dashboard HR Analytics Terintegrasi</h1>
              <p className="mt-2 max-w-2xl text-sm text-[color:var(--hf-brand-600)]/80">
                Pantau headcount, absensi, lembur, KPI, payroll, dan rekrutmen dalam satu tampilan — insight otomatis tanpa laporan manual.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur placeholder:text-white/50"
              />
              <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/25 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <HRStatCard label="Total Karyawan" value={data.overview.totalEmployees} sub={`${data.overview.activeEmployees} aktif`} icon={Users} gradient="from-[var(--hf-brand-500)] to-[var(--hf-brand)]" trend={{ value: `+${data.overview.newHires} baru`, positive: true }} />
          <HRStatCard label="Tingkat Kehadiran" value={`${data.overview.attendanceRate}%`} sub={`Telat ${data.overview.lateRate}% · Absen ${data.overview.absentRate}%`} icon={Clock} gradient="from-emerald-500 to-teal-700" />
          <HRStatCard label="Rata-rata KPI" value={`${data.kpi.avgAchievement}%`} sub={`${data.kpi.onTrack} on track · ${data.kpi.atRisk} at risk`} icon={Target} gradient="from-[var(--hf-brand-500)] to-purple-700" />
          <HRStatCard label="Biaya Lembur" value={fmtCur(data.overtime.totalCost)} sub={`${data.overtime.totalHours} jam · ${data.overtime.requests} pengajuan`} icon={Timer} gradient="from-amber-500 to-orange-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="py-16 text-center text-gray-400">Memuat analitik...</div>}

        {!loading && tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">Tren Kehadiran 14 Hari</h3>
              <p className="text-sm text-gray-500">Hadir, terlambat, dan absen harian</p>
              <div className="mt-4 h-72">
                {mounted && data.attendance.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.attendance.trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="present" name="Hadir" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                      <Area type="monotone" dataKey="late" name="Telat" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.5} />
                      <Area type="monotone" dataKey="absent" name="Absen" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Belum ada data kehadiran</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">Status KPI</h3>
              <p className="text-sm text-gray-500">On track vs at risk</p>
              <div className="mt-4 h-56">
                {mounted && kpiPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={kpiPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                        {kpiPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Belum ada data KPI</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 className="mx-auto mb-1 h-4 w-4" />{data.kpi.onTrack} On Track</div>
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="mx-auto mb-1 h-4 w-4" />{data.kpi.atRisk} At Risk</div>
                <div className="rounded-lg bg-rose-50 p-2 text-rose-700"><TrendingDown className="mx-auto mb-1 h-4 w-4" />{data.kpi.offTrack} Off</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-3">
              <h3 className="mb-4 font-semibold text-gray-900">Akses Cepat Modul HR</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {quickLinks.map(l => (
                  <Link key={l.href} href={l.href} className="group flex flex-col items-center gap-2 rounded-xl border p-4 transition hover:border-[var(--hf-brand-100)] hover:shadow-md">
                    <div className={`rounded-xl p-2.5 ${l.color}`}><l.icon className="h-5 w-5" /></div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[color:var(--hf-brand-600)]">{l.label}</span>
                    <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-[color:var(--hf-brand-600)]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'attendance' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Attendance Analytics</h3>
              <p className="text-sm text-gray-500">Detail kehadiran periode {period}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Record', value: data.attendance.total, color: 'bg-slate-50' },
                  { label: 'Hadir', value: data.attendance.present, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Terlambat', value: data.attendance.late, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Absen', value: data.attendance.absent, color: 'bg-rose-50 text-rose-700' },
                  { label: 'Rata-rata Jam Kerja', value: `${data.overview.avgWorkHours} jam`, color: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]' },
                  { label: 'Rata-rata Telat', value: `${data.overview.avgLateMinutes} menit`, color: 'bg-orange-50 text-orange-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <Link href="/humanify/attendance" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Kelola Absensi <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Overtime Insights</h3>
              <p className="text-sm text-gray-500">Biaya lembur per departemen</p>
              <div className="mt-4 h-64">
                {mounted && data.overtime.byDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.overtime.byDepartment.map((d: any) => ({ name: d.department || 'N/A', hours: d.hours }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="hours" name="Jam Lembur" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Belum ada data lembur</div>
                )}
              </div>
              <Link href="/humanify/payroll/lembur" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Kelola Lembur <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && tab === 'performance' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Performance Review</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[var(--hf-brand-50)] p-4">
                  <span className="text-sm text-[color:var(--hf-brand)]">Review Selesai</span>
                  <span className="text-2xl font-bold text-[color:var(--hf-brand-600)]">{data.performance.completed}/{data.performance.total}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-purple-50 p-4">
                  <span className="text-sm text-purple-700">Skor Rata-rata</span>
                  <span className="text-2xl font-bold text-purple-900">{data.performance.avgScore || '-'}</span>
                </div>
              </div>
              <Link href="/humanify/performance" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Buka Penilaian Kinerja <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">KPI per Departemen</h3>
              <div className="mt-4 h-64">
                {mounted && data.kpi.byDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.kpi.byDepartment.map((d: any) => ({ name: d.department, achievement: d.achievement }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Pencapaian']} />
                      <Bar dataKey="achievement" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Belum ada data KPI departemen</div>
                )}
              </div>
              <Link href="/humanify/kpi" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Kelola KPI <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && tab === 'payroll' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Payroll Analytics</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Payroll Run', value: data.payroll.runs, sub: `periode ${period}` },
                  { label: 'Total Gross', value: fmtCur(data.payroll.totalGross) },
                  { label: 'Total Net', value: fmtCur(data.payroll.totalNet) },
                  { label: 'Potongan', value: fmtCur(data.payroll.totalDeductions) },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between rounded-xl border p-4">
                    <div><p className="text-sm text-gray-500">{s.label}</p>{s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}</div>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Reimbursement</h3>
              <p className="text-sm text-gray-500">Klaim karyawan — terintegrasi payroll</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-yellow-50 p-4"><p className="text-xs text-yellow-700">Pending</p><p className="text-xl font-bold text-yellow-900">{data.reimbursement.pending}</p><p className="text-xs text-yellow-600">{fmtCur(data.reimbursement.pendingAmount)}</p></div>
                <div className="rounded-xl bg-green-50 p-4"><p className="text-xs text-green-700">Disetujui</p><p className="text-xl font-bold text-green-900">{data.reimbursement.approved}</p><p className="text-xs text-green-600">{fmtCur(data.reimbursement.approvedAmount)}</p></div>
              </div>
              <Link href="/humanify/reimbursement" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Kelola Reimbursement <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && tab === 'predictive' && predictive && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hf-brand-100)] bg-gradient-to-r from-[var(--hf-brand-600)] to-[var(--hf-brand)] p-4">
              <div className="flex items-center gap-2 text-[color:var(--hf-brand-600)]">
                <Brain className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Prediktif + AIMAN</p>
                  <p className="text-xs text-[color:var(--hf-brand-600)]">
                    {llmEnabled
                      ? `LLM aktif · ${llmModel} · sumber ${predictive.llmSource || 'rules'}`
                      : 'Mode rules — aktifkan AIMAN di pengaturan AI'}
                  </p>
                </div>
              </div>
              <DataSourceBadge source={predictiveSource} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <HRStatCard label="Risiko Kritis" value={predictive.attritionRisk?.criticalCount ?? 0} sub="Perlu intervensi segera" icon={AlertTriangle} gradient="from-rose-500 to-red-700" />
              <HRStatCard label="Risiko Tinggi" value={predictive.attritionRisk?.highRiskCount ?? 0} sub={`Avg score ${predictive.attritionRisk?.avgRiskScore ?? 0}`} icon={TrendingDown} gradient="from-orange-500 to-amber-600" />
              <HRStatCard label="Prediksi Absen" value={`${predictive.absenteeism?.predictedRate ?? 0}%`} sub={predictive.absenteeism?.trend ?? 'stable'} icon={Clock} gradient="from-[var(--hf-brand-500)] to-[var(--hf-brand-600)]" />
              <HRStatCard label="Prediksi Cuti" value={predictive.leaveForecast?.predictedRequests ?? 0} sub={`Risiko ops: ${predictive.leaveForecast?.operationalRisk ?? 'low'}`} icon={CalendarDays} gradient="from-teal-500 to-emerald-600" />
              <HRStatCard label="Engagement" value={predictive.engagementScore ?? '—'} sub="skor survei 6 bln" icon={Sparkles} gradient="from-[var(--hf-brand-500)] to-purple-600" />
            </div>

            {predictive.leaveForecast && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="font-semibold">Prediksi Permintaan Cuti</h3>
                <p className="text-sm text-gray-500">Berdasarkan pola pengajuan 12 bulan terakhir</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-teal-50 p-4">
                    <p className="text-xs text-teal-600">Perkiraan bulan depan</p>
                    <p className="text-2xl font-bold text-teal-900">{predictive.leaveForecast.predictedRequests} pengajuan</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Bulan peak</p>
                    <p className="text-sm font-medium text-gray-900">{(predictive.leaveForecast.peakMonths || []).join(', ') || '—'}</p>
                  </div>
                  <div className={`rounded-xl p-4 ${predictive.leaveForecast.operationalRisk === 'high' ? 'bg-red-50' : predictive.leaveForecast.operationalRisk === 'medium' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <p className="text-xs text-gray-500">Rekomendasi</p>
                    <p className="text-sm font-medium text-gray-900">{predictive.leaveForecast.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="font-semibold">Top Attrition Risk</h3>
                <p className="text-sm text-gray-500">Karyawan berisiko resignasi tertinggi</p>
                <div className="mt-4 space-y-2">
                  {(predictive.attritionRisk?.topRisks || []).slice(0, 8).map((e: any) => (
                    <div key={e.employeeId} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="font-medium text-gray-900">{e.employeeName}</p>
                        <p className="text-xs text-gray-500">{e.department} · {e.tenureMonths} bln</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${e.riskLevel === 'critical' ? 'bg-red-100 text-red-700' : e.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {e.riskScore}
                        </span>
                        <p className="mt-1 text-[10px] text-gray-400">{e.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="font-semibold">Proyeksi Headcount</h3>
                <div className="mt-4 h-64">
                  {mounted && (predictive.headcount || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictive.headcount}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="projected" name="Proyeksi" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-gray-400">Data headcount terbatas</div>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold">AI Predictive Insights</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {(predictive.insights || []).map((ins: any, i: number) => (
                  <div key={i} className={`rounded-xl border-l-4 p-4 ${ins.severity === 'critical' ? 'border-l-red-500 bg-red-50' : ins.severity === 'high' ? 'border-l-orange-500 bg-orange-50' : 'border-l-blue-500 bg-[var(--hf-brand-50)]'}`}>
                    <p className="font-medium text-gray-900">{ins.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{ins.description}</p>
                    <p className="mt-2 text-xs font-medium text-[color:var(--hf-brand-600)]">→ {ins.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'ai' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--hf-brand-100)] bg-gradient-to-r from-[var(--hf-brand-600)] to-[var(--hf-brand)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[color:var(--hf-brand-600)]">
                    <Zap className="h-5 w-5" />
                    <span className="font-semibold">Humanify AI Advisor · AIMAN</span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--hf-brand)]">
                    {llmEnabled
                      ? `Terhubung ke AIMAN (${llmModel}) · sumber insight: ${aiSource}`
                      : 'Fallback rule-based — aktifkan AIMAN di pengaturan AI untuk LLM'}
                  </p>
                </div>
                <button
                  onClick={refreshAiAdvisor}
                  disabled={aiLoading}
                  className="flex items-center gap-2 rounded-xl bg-[var(--hf-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--hf-brand)] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                  {aiLoading ? 'Memanggil AIMAN…' : 'Generate ulang'}
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {aiInsights.map((ins: any, i: number) => (
                <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-[var(--hf-brand-100)] px-2.5 py-0.5 text-xs font-medium capitalize text-[color:var(--hf-brand)]">{ins.module}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ins.priority === 'critical' ? 'bg-red-100 text-red-700' : ins.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{ins.confidence}%</span>
                  </div>
                  <h4 className="mt-3 font-semibold text-gray-900">{ins.title}</h4>
                  <p className="mt-2 text-sm text-gray-600">{ins.summary}</p>
                  <ul className="mt-3 space-y-1">
                    {(ins.actions || []).map((a: string, j: number) => (
                      <li key={j} className="flex items-center gap-1.5 text-xs text-[color:var(--hf-brand-600)]"><ChevronRight className="h-3 w-3" />{a}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {aiInsights.length === 0 && (
                <div className="col-span-2 py-12 text-center text-gray-400">
                  {aiLoading ? 'Memanggil AIMAN…' : 'Belum ada insight — klik Generate ulang'}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === 'recruitment' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="font-semibold">Rekrutmen Pipeline</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-orange-50 p-4"><Briefcase className="mb-2 h-5 w-5 text-orange-600" /><p className="text-2xl font-bold">{data.recruitment.openPositions}</p><p className="text-xs text-orange-700">Posisi Terbuka</p></div>
                <div className="rounded-xl bg-[var(--hf-brand-50)] p-4"><Users className="mb-2 h-5 w-5 text-[color:var(--hf-brand-600)]" /><p className="text-2xl font-bold">{data.recruitment.totalCandidates}</p><p className="text-xs text-[color:var(--hf-brand)]">Total Kandidat</p></div>
                <div className="rounded-xl bg-emerald-50 p-4"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-2xl font-bold">{data.recruitment.hired}</p><p className="text-xs text-emerald-700">Diterima</p></div>
                <div className="rounded-xl bg-[var(--hf-brand-50)] p-4"><Activity className="mb-2 h-5 w-5 text-[color:var(--hf-brand-600)]" /><p className="text-2xl font-bold">{data.recruitment.acceptanceRate}%</p><p className="text-xs text-[color:var(--hf-brand)]">Acceptance Rate</p></div>
              </div>
              <Link href="/humanify/recruitment" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Buka Modul Rekrutmen <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-[var(--hf-brand-100)] bg-gradient-to-br from-[var(--hf-brand-600)] to-[var(--hf-brand)] p-6">
              <h3 className="font-semibold text-[color:var(--hf-brand-600)]">Keunggulan vs Kompetitor</h3>
              <ul className="mt-4 space-y-3 text-sm text-[color:var(--hf-brand-600)]">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> AI Screening kandidat terintegrasi langsung di pipeline</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> 9-Box Matrix & OKR cascading dalam satu platform</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Absensi GPS + face recognition + device sync</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Reimbursement → Payroll otomatis tanpa export manual</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
