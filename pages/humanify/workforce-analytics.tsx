import { useState, useEffect, useCallback, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import type { HrisDataSource } from '@/lib/hris/data-source';
import DepartmentSelect from '@/components/humanify/DepartmentSelect';
import { useTranslation } from '@/lib/i18n';
import { BarChart3, Users, TrendingUp, TrendingDown, Plus, Edit, Trash2, X, DollarSign, Target, Clock, AlertCircle, CheckCircle, UserPlus, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

interface HeadcountPlan { id: string; name: string; period_start: string; period_end: string; department: string; current_headcount: number; planned_headcount: number; approved_headcount: number; budget_amount: number; status: string; justification: string; details: any[]; }
interface ManpowerBudget { id: string; fiscal_year: number; department: string; budget_category: string; planned_amount: number; actual_amount: number; variance: number; status: string; notes: string; }

type TabKey = 'dashboard' | 'headcount' | 'budgets' | 'turnover' | 'productivity';

const EMPTY_OVERVIEW = { totalEmployees: 0, activeEmployees: 0, newHires: 0, resignations: 0, turnoverRate: 0, avgTenure: 0, headcountGrowth: 0, totalHRBudget: 0, budgetUtilization: 0, absenteeismRate: 0, departmentBreakdown: [] as any[], monthlyTrend: [] as any[] };

export default function WorkforceAnalyticsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [overview, setOverview] = useState<any>(EMPTY_OVERVIEW);
  const [plans, setPlans] = useState<HeadcountPlan[]>([]);
  const [budgets, setBudgets] = useState<ManpowerBudget[]>([]);
  const [turnover, setTurnover] = useState<any>({ byMonth: [], byType: [], byDepartment: [] });
  const [productivity, setProductivity] = useState<any>({ attendanceRate: 0, avgWorkHours: 0, lateRate: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [mounted, setMounted] = useState(false);

  const [planForm, setPlanForm] = useState({ name: '', periodStart: '', periodEnd: '', department: '', currentHeadcount: 0, plannedHeadcount: 0, budgetAmount: 0, justification: '', status: 'draft' });
  const [budgetForm, setBudgetForm] = useState({ fiscalYear: new Date().getFullYear(), department: '', budgetCategory: 'salary', plannedAmount: 0, actualAmount: 0, notes: '', status: 'draft' });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/workforce-analytics?action=${action}${extra}`, opts);
    const json = await r.json().catch(() => ({}));
    return { httpOk: r.ok, status: r.status, ...json };
  }, []);

  const applyApiData = <T,>(res: { httpOk?: boolean; success?: boolean; data?: T; error?: string }, fallback: T, on401?: () => void) => {
    if (res.httpOk && res.success === true) return res.data ?? fallback;
    if (res.status === 401) on401?.();
    return fallback;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hp, mb, ta, pr] = await Promise.all([
        api('overview'), api('headcount-plans'), api('budgets'), api('turnover-analysis'), api('productivity')
      ]);
      const on401 = () => showToast('Sesi berakhir, silakan login ulang', 'error');
      setOverview(applyApiData(ov, EMPTY_OVERVIEW, on401));
      setDataSource(ov.dataSource || (ov.data?.totalEmployees ? 'live' : 'empty'));
      setPlans(applyApiData(hp, [], on401));
      setBudgets(applyApiData(mb, [], on401));
      setTurnover(applyApiData(ta, { byMonth: [], byType: [], byDepartment: [] }, on401));
      setProductivity(applyApiData(pr, { attendanceRate: 0, avgWorkHours: 0, lateRate: 0 }, on401));

      const failed = [ov, hp, mb, ta, pr].find((r) => !r.httpOk || r.success !== true);
      if (failed?.error && failed.status !== 401) {
        showToast(failed.error || 'Gagal memuat data analitik', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data analitik', 'error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { setMounted(true); loadData(); }, [loadData]);

  const trendChartData = useMemo(() => {
    const hiresMap = new Map<string, number>();
    (overview.monthlyTrend || []).forEach((m: { month?: string; hires?: number | string }) => {
      const key = m.month ? new Date(m.month).toISOString().slice(0, 7) : '';
      if (key) hiresMap.set(key, parseInt(String(m.hires), 10) || 0);
    });
    const resignMap = new Map<string, number>();
    (turnover.byMonth || []).forEach((m: { month?: string; count?: number | string }) => {
      const key = m.month ? new Date(m.month).toISOString().slice(0, 7) : '';
      if (key) resignMap.set(key, parseInt(String(m.count), 10) || 0);
    });
    const allMonths = new Set([...hiresMap.keys(), ...resignMap.keys()]);
    return Array.from(allMonths).sort().map((key) => ({
      month: new Date(`${key}-01`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      hires: hiresMap.get(key) || 0,
      resignations: resignMap.get(key) || 0,
    }));
  }, [overview.monthlyTrend, turnover.byMonth]);

  const deptChartData = useMemo(() => (
    (overview.departmentBreakdown || []).map((d: { department?: string; count?: number | string }) => ({
      name: d.department || 'Tidak ada',
      value: parseInt(String(d.count), 10) || 0,
    }))
  ), [overview.departmentBreakdown]);

  const deptTableRows = useMemo(() => {
    const total = overview.totalEmployees || 0;
    return (overview.departmentBreakdown || []).map((d: { department?: string; count?: number | string }) => {
      const count = parseInt(String(d.count), 10) || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { department: d.department || 'Tidak ada', count, pct };
    });
  }, [overview.departmentBreakdown, overview.totalEmployees]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'plan') setPlanForm({ name: '', periodStart: '', periodEnd: '', department: '', currentHeadcount: 0, plannedHeadcount: 0, budgetAmount: 0, justification: '', status: 'draft' });
    if (type === 'budget') setBudgetForm({ fiscalYear: new Date().getFullYear(), department: '', budgetCategory: 'salary', plannedAmount: 0, actualAmount: 0, notes: '', status: 'draft' });
  };

  const handleSave = async () => {
    try {
      let res: any;
      if (modalType === 'plan') {
        if (!planForm.name?.trim()) { showToast('Nama rencana wajib diisi', 'error'); return; }
        if (!planForm.periodStart || !planForm.periodEnd) { showToast('Periode wajib diisi', 'error'); return; }
        res = editingItem
          ? await api('headcount-plan', 'PUT', planForm, `&id=${editingItem.id}`)
          : await api('headcount-plan', 'POST', planForm);
      } else if (modalType === 'budget') {
        res = editingItem
          ? await api('budget', 'PUT', budgetForm, `&id=${editingItem.id}`)
          : await api('budget', 'POST', budgetForm);
      }
      if (res?.success === false || res?.error) {
        showToast(res?.error || 'Gagal menyimpan', 'error');
        return;
      }
      showToast(editingItem ? 'Berhasil diperbarui' : 'Berhasil dibuat');
      setShowModal(false);
      await loadData();
    } catch (e) {
      showToast('Gagal menyimpan', 'error');
    }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await api(action, 'DELETE', null, `&id=${id}`);
      if (res?.success === false || res?.error) {
        showToast(res?.error || 'Gagal menghapus', 'error');
        return;
      }
      showToast('Dihapus');
      await loadData();
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  const handleApprovePlan = async (plan: HeadcountPlan) => {
    const approved = prompt('Jumlah headcount yang disetujui:', String(plan.planned_headcount || plan.approved_headcount || ''));
    if (approved === null) return;
    try {
      const res = await api('approve-plan', 'POST', { id: plan.id, approvedHeadcount: parseInt(approved, 10) || plan.planned_headcount });
      if (res?.success === false || res?.error) {
        showToast(res?.error || 'Gagal menyetujui', 'error');
        return;
      }
      showToast('Rencana disetujui');
      await loadData();
    } catch {
      showToast('Gagal menyetujui', 'error');
    }
  };

  const fmtDateInput = (d: string) => (d ? String(d).slice(0, 10) : '');

  const statusColor = (s: string) => {
    const m: any = { draft: 'bg-gray-100 text-gray-800', submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', active: 'bg-indigo-100 text-indigo-800', closed: 'bg-gray-200 text-gray-600' };
    return m[s] || 'bg-gray-100 text-gray-800';
  };

  const fmtNum = (n: number) => n?.toLocaleString('id-ID') || '0';

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dasbor', icon: BarChart3 },
    { key: 'headcount', label: 'Perencanaan SDM', icon: Users },
    { key: 'budgets', label: 'Anggaran SDM', icon: DollarSign },
    { key: 'turnover', label: 'Analisis Turnover', icon: TrendingDown },
    { key: 'productivity', label: 'Produktivitas', icon: TrendingUp },
  ];

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Workforce Analytics" description="Perencanaan dan analitik SDM">
    <HQLayout title={t('hris.workforceAnalyticsTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Perencanaan & Analitik SDM</h1>
        <p className="text-gray-500 mt-1">Perencanaan tenaga kerja, analisis turnover, dan produktivitas</p>
        </div>
        <DataSourceBadge source={dataSource} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-7 h-7 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Aktif {overview.activeEmployees || 0}</span>
          </div>
          <p className="text-3xl font-bold">{overview.totalEmployees || 0}</p>
          <p className="text-sm text-indigo-100 mt-1">Total Karyawan</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <UserPlus className="w-7 h-7 opacity-80" />
            <TrendingUp className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-3xl font-bold">{overview.newHires || 0}</p>
          <p className="text-sm text-emerald-100 mt-1">Rekrutmen Baru (30 hari)</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <TrendingDown className="w-7 h-7 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">30 hari</span>
          </div>
          <p className="text-3xl font-bold">{overview.turnoverRate || 0}%</p>
          <p className="text-sm text-rose-100 mt-1">Tingkat Turnover</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-7 h-7 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Kehadiran</span>
          </div>
          <p className="text-3xl font-bold">{productivity.attendanceRate || 0}%</p>
          <p className="text-sm text-amber-100 mt-1">Tingkat Kehadiran</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Memuat...</div>}

      {/* DASHBOARD TAB */}
      {!loading && tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Area Chart — workforce movement trend */}
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-semibold text-gray-900">Tren Pergerakan Tenaga Kerja</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Rekrutmen vs pengunduran diri — 12 bulan terakhir</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Rekrutmen</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Pengunduran</span>
                </div>
              </div>
              <div className="h-80 mt-4">
                {mounted && trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hiresGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="resignGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        labelStyle={{ fontWeight: 600, color: '#111827' }}
                      />
                      <Area type="monotone" dataKey="hires" name="Rekrutmen" stroke="#4F46E5" strokeWidth={2.5} fill="url(#hiresGradient)" />
                      <Area type="monotone" dataKey="resignations" name="Pengunduran" stroke="#F43F5E" strokeWidth={2} fill="url(#resignGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data tren bulanan</div>
                )}
              </div>
            </div>

            {/* Doughnut Chart — department distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900">Distribusi Departemen</h3>
              <p className="text-sm text-gray-500 mt-0.5 mb-2">Komposisi karyawan aktif</p>
              <div className="h-72 relative">
                {mounted && deptChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptChartData}
                          cx="50%"
                          cy="46%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {deptChartData.map((_: unknown, i: number) => (
                            <Cell key={`dept-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, _name: string, props: { payload?: { name?: string } }) => [
                            `${value} karyawan`,
                            props.payload?.name || '',
                          ]}
                          contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB' }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 40 }}>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{overview.totalEmployees || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data departemen</div>
                )}
              </div>
            </div>
          </div>

          {/* Department Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Ringkasan per Departemen</h3>
                <p className="text-sm text-gray-500 mt-0.5">Detail headcount dan proporsi tenaga kerja</p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                {deptTableRows.length} departemen
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">Departemen</th>
                    <th className="px-6 py-3 font-medium text-right">Jumlah</th>
                    <th className="px-6 py-3 font-medium text-right">Proporsi</th>
                    <th className="px-6 py-3 font-medium min-w-[180px]">Distribusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deptTableRows.map((row, i) => (
                    <tr key={row.department} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-3.5 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="font-medium text-gray-900">{row.department}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold text-gray-900 tabular-nums">{row.count}</td>
                      <td className="px-6 py-3.5 text-right text-gray-600 tabular-nums">{row.pct.toFixed(1)}%</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {deptTableRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Belum ada data departemen</td>
                    </tr>
                  )}
                </tbody>
                {deptTableRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50/60 border-t border-gray-200">
                      <td className="px-6 py-3" colSpan={2}><span className="font-semibold text-gray-700">Total</span></td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900 tabular-nums">{overview.totalEmployees || 0}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-600">100%</td>
                      <td className="px-6 py-3" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Quick insight row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tingkat Absensi', value: `${overview.absenteeismRate || 0}%`, sub: '30 hari terakhir', color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Rata-rata Jam Kerja', value: `${productivity.avgWorkHours || 0} jam`, sub: 'Per hari', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Keterlambatan', value: `${productivity.lateRate || 0}%`, sub: 'Dari total kehadiran', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Rencana Headcount', value: String(plans.filter(p => p.status === 'approved').length), sub: `${plans.length} total rencana`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADCOUNT TAB */}
      {!loading && tab === 'headcount' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Perencanaan Jumlah Karyawan</h2>
            <button onClick={() => openAdd('plan')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Buat Rencana
            </button>
          </div>
          <div className="space-y-3">
            {plans.map(p => (
              <div key={p.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                      {p.department && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{p.department}</span>}
                    </div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Periode: {p.period_start && new Date(p.period_start).toLocaleDateString('id-ID')} - {p.period_end && new Date(p.period_end).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.status !== 'approved' && (
                      <button onClick={() => handleApprovePlan(p)} className="p-1.5 text-gray-400 hover:text-green-600" title="Setujui"><CheckCircle className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => { setEditingItem(p); setPlanForm({ name: p.name, periodStart: fmtDateInput(p.period_start), periodEnd: fmtDateInput(p.period_end), department: p.department || '', currentHeadcount: p.current_headcount, plannedHeadcount: p.planned_headcount, budgetAmount: Number(p.budget_amount) || 0, justification: p.justification || '', status: p.status }); setModalType('plan'); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('headcount-plan', p.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t">
                  <div><p className="text-xs text-gray-500">Saat Ini</p><p className="text-lg font-bold">{p.current_headcount}</p></div>
                  <div><p className="text-xs text-gray-500">Direncanakan</p><p className="text-lg font-bold text-blue-600">{p.planned_headcount}</p></div>
                  <div><p className="text-xs text-gray-500">Disetujui</p><p className="text-lg font-bold text-green-600">{p.approved_headcount || '-'}</p></div>
                  <div><p className="text-xs text-gray-500">Anggaran</p><p className="text-lg font-bold">Rp {fmtNum(p.budget_amount)}</p></div>
                </div>
                {p.justification && <p className="text-sm text-gray-500 mt-2 italic">"{p.justification}"</p>}
              </div>
            ))}
            {plans.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada rencana headcount</p>}
          </div>
        </div>
      )}

      {/* BUDGETS TAB */}
      {!loading && tab === 'budgets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Anggaran Tenaga Kerja</h2>
            <button onClick={() => openAdd('budget')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Tambah Anggaran
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Tahun</th>
                  <th className="px-4 py-3 text-left">Departemen</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Direncanakan</th>
                  <th className="px-4 py-3 text-right">Aktual</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {budgets.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{b.fiscal_year}</td>
                    <td className="px-4 py-3">{b.department || '-'}</td>
                    <td className="px-4 py-3 capitalize">{b.budget_category}</td>
                    <td className="px-4 py-3 text-right">Rp {fmtNum(b.planned_amount)}</td>
                    <td className="px-4 py-3 text-right">Rp {fmtNum(b.actual_amount)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(b.variance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {fmtNum(b.variance)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(b.status)}`}>{b.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingItem(b); setBudgetForm({ fiscalYear: b.fiscal_year, department: b.department || '', budgetCategory: b.budget_category, plannedAmount: Number(b.planned_amount) || 0, actualAmount: Number(b.actual_amount) || 0, notes: b.notes || '', status: b.status }); setModalType('budget'); setShowModal(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete('budget', b.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {budgets.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data anggaran</p>}
          </div>
        </div>
      )}

      {/* TURNOVER TAB */}
      {!loading && tab === 'turnover' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Analisis Turnover</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Berdasarkan Tipe</h4>
                <div className="space-y-2">
                  {(turnover.byType || []).map((t: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm capitalize">{t.termination_type || 'Unknown'}</span>
                      <span className="font-bold text-gray-900">{t.count}</span>
                    </div>
                  ))}
                  {(!turnover.byType || turnover.byType.length === 0) && <p className="text-sm text-gray-400">Belum ada data turnover</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Tren Bulanan</h4>
                <div className="flex items-end gap-1 h-32">
                  {(turnover.byMonth || []).map((m: any, i: number) => {
                    const max = Math.max(...(turnover.byMonth || []).map((t: any) => parseInt(t.count, 10)), 1);
                    const cnt = parseInt(m.count, 10) || 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px]">{cnt}</span>
                        <div className="w-full bg-red-400 rounded-t" style={{ height: `${(cnt / max) * 100}%`, minHeight: '2px' }} />
                        <span className="text-[9px] text-gray-400">{m.month ? new Date(m.month).toLocaleDateString('id-ID', { month: 'short' }) : ''}</span>
                      </div>
                    );
                  })}
                  {(!turnover.byMonth || turnover.byMonth.length === 0) && <p className="text-sm text-gray-400 w-full text-center">Belum ada data</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTIVITY TAB */}
      {!loading && tab === 'productivity' && (
        <div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-5 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-600">{productivity.attendanceRate || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">Tingkat Kehadiran</p>
            </div>
            <div className="bg-white border rounded-xl p-5 text-center">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-600">{productivity.avgWorkHours || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Rata-rata Jam Kerja</p>
            </div>
            <div className="bg-white border rounded-xl p-5 text-center">
              <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-orange-600">{productivity.lateRate || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">Tingkat Keterlambatan</p>
            </div>
            <div className="bg-white border rounded-xl p-5 text-center">
              <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-purple-600">{overview.absenteeismRate || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">Tingkat Absensi</p>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-5 mt-6">
            <h3 className="font-semibold mb-3">Catatan</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Data produktivitas dihitung dari 30 hari terakhir berdasarkan tabel employee_attendance</p>
              <p>• Tingkat kehadiran = (hadir + terlambat) / total record</p>
              <p>• Rata-rata jam kerja dihitung dari clock-in ke clock-out</p>
              <p>• Gunakan headcount planning dan budget untuk merencanakan kebutuhan tenaga kerja</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit' : 'Tambah'} {modalType === 'plan' ? 'Rencana SDM' : 'Anggaran'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'plan' && (<>
                <div><label className="text-sm font-medium text-gray-700">Nama Rencana</label><input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Periode Mulai</label><input type="date" value={planForm.periodStart} onChange={e => setPlanForm({ ...planForm, periodStart: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Periode Akhir</label><input type="date" value={planForm.periodEnd} onChange={e => setPlanForm({ ...planForm, periodEnd: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Departemen</label>
                  <DepartmentSelect value={planForm.department} onChange={(v) => setPlanForm({ ...planForm, department: v })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Jumlah Saat Ini</label><input type="number" value={planForm.currentHeadcount} onChange={e => setPlanForm({ ...planForm, currentHeadcount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Jumlah Rencana</label><input type="number" value={planForm.plannedHeadcount} onChange={e => setPlanForm({ ...planForm, plannedHeadcount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Anggaran (Rp)</label><input type="number" value={planForm.budgetAmount} onChange={e => setPlanForm({ ...planForm, budgetAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Justifikasi</label><textarea value={planForm.justification} onChange={e => setPlanForm({ ...planForm, justification: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
              </>)}
              {modalType === 'budget' && (<>
                <div><label className="text-sm font-medium text-gray-700">Tahun Fiskal</label><input type="number" value={budgetForm.fiscalYear} onChange={e => setBudgetForm({ ...budgetForm, fiscalYear: parseInt(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Departemen</label>
                  <DepartmentSelect value={budgetForm.department} onChange={(v) => setBudgetForm({ ...budgetForm, department: v })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select value={budgetForm.budgetCategory} onChange={e => setBudgetForm({ ...budgetForm, budgetCategory: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="salary">Gaji</option><option value="benefits">Tunjangan</option><option value="training">Pelatihan</option><option value="recruitment">Rekrutmen</option><option value="other">Lainnya</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Anggaran Rencana</label><input type="number" value={budgetForm.plannedAmount} onChange={e => setBudgetForm({ ...budgetForm, plannedAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Aktual</label><input type="number" value={budgetForm.actualAmount} onChange={e => setBudgetForm({ ...budgetForm, actualAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Catatan</label><textarea value={budgetForm.notes} onChange={e => setBudgetForm({ ...budgetForm, notes: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              </>)}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </HQLayout>
    </PageGuard>
  );
}
