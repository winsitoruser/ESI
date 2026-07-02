import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { BarChart3, Users, TrendingUp, TrendingDown, Plus, Edit, Trash2, X, DollarSign, Target, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface HeadcountPlan { id: string; name: string; period_start: string; period_end: string; department: string; current_headcount: number; planned_headcount: number; approved_headcount: number; budget_amount: number; status: string; justification: string; details: any[]; }
interface ManpowerBudget { id: string; fiscal_year: number; department: string; budget_category: string; planned_amount: number; actual_amount: number; variance: number; status: string; notes: string; }

type TabKey = 'dashboard' | 'headcount' | 'budgets' | 'turnover' | 'productivity';

const MOCK_WA_OVERVIEW = { totalEmployees: 156, newHires: 12, resignations: 3, turnoverRate: 1.9, avgTenure: 2.8, headcountGrowth: 5.8, totalHRBudget: 8500000000, budgetUtilization: 68 };
const MOCK_WA_PLANS: HeadcountPlan[] = [
  { id: 'hp1', name: 'Ekspansi Q2 2026', period_start: '2026-04-01', period_end: '2026-06-30', department: 'Operations', current_headcount: 45, planned_headcount: 55, approved_headcount: 52, budget_amount: 1200000000, status: 'approved', justification: 'Ekspansi cabang baru Bali dan Semarang', details: [] },
  { id: 'hp2', name: 'IT Team Scale-up', period_start: '2026-04-01', period_end: '2026-09-30', department: 'IT', current_headcount: 18, planned_headcount: 25, approved_headcount: 22, budget_amount: 800000000, status: 'submitted', justification: 'Pengembangan sistem POS v3 dan mobile app', details: [] },
];
const MOCK_WA_BUDGETS: ManpowerBudget[] = [
  { id: 'mb1', fiscal_year: 2026, department: 'Operations', budget_category: 'salary', planned_amount: 3200000000, actual_amount: 2100000000, variance: -1100000000, status: 'active', notes: '' },
  { id: 'mb2', fiscal_year: 2026, department: 'IT', budget_category: 'salary', planned_amount: 1800000000, actual_amount: 1200000000, variance: -600000000, status: 'active', notes: '' },
];
const MOCK_WA_TURNOVER = { monthlyRate: 1.9, annualRate: 8.5, voluntaryRate: 6.2, involuntaryRate: 2.3, avgTenureAtExit: 1.8, topReasons: [{ reason: 'Better opportunity', count: 5 }, { reason: 'Relocation', count: 2 }, { reason: 'Career change', count: 1 }] };
const MOCK_WA_PRODUCTIVITY = { revenuePerEmployee: 27200000, avgWorkHours: 168, utilizationRate: 87, overtimeRate: 12, absenteeismRate: 3.2 };

export default function WorkforceAnalyticsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [overview, setOverview] = useState<any>(MOCK_WA_OVERVIEW);
  const [plans, setPlans] = useState<HeadcountPlan[]>(MOCK_WA_PLANS);
  const [budgets, setBudgets] = useState<ManpowerBudget[]>(MOCK_WA_BUDGETS);
  const [turnover, setTurnover] = useState<any>(MOCK_WA_TURNOVER);
  const [productivity, setProductivity] = useState<any>(MOCK_WA_PRODUCTIVITY);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const [planForm, setPlanForm] = useState({ name: '', periodStart: '', periodEnd: '', department: '', currentHeadcount: 0, plannedHeadcount: 0, budgetAmount: 0, justification: '', status: 'draft' });
  const [budgetForm, setBudgetForm] = useState({ fiscalYear: new Date().getFullYear(), department: '', budgetCategory: 'salary', plannedAmount: 0, actualAmount: 0, notes: '', status: 'draft' });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/workforce-analytics?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hp, mb, ta, pr] = await Promise.all([
        api('overview'), api('headcount-plans'), api('budgets'), api('turnover-analysis'), api('productivity')
      ]);
      setOverview(ov.data || {});
      setPlans(hp.data || []);
      setBudgets(mb.data || []);
      setTurnover(ta.data || {});
      setProductivity(pr.data || {});
    } catch (e) {
      console.error(e);
      setOverview(MOCK_WA_OVERVIEW);
      setPlans(MOCK_WA_PLANS);
      setBudgets(MOCK_WA_BUDGETS);
      setTurnover(MOCK_WA_TURNOVER);
      setProductivity(MOCK_WA_PRODUCTIVITY);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'plan') setPlanForm({ name: '', periodStart: '', periodEnd: '', department: '', currentHeadcount: 0, plannedHeadcount: 0, budgetAmount: 0, justification: '', status: 'draft' });
    if (type === 'budget') setBudgetForm({ fiscalYear: new Date().getFullYear(), department: '', budgetCategory: 'salary', plannedAmount: 0, actualAmount: 0, notes: '', status: 'draft' });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'plan') {
        if (editingItem) await api('headcount-plan', 'PUT', planForm, `&id=${editingItem.id}`);
        else await api('headcount-plan', 'POST', planForm);
      } else if (modalType === 'budget') {
        if (editingItem) await api('budget', 'PUT', budgetForm, `&id=${editingItem.id}`);
        else await api('budget', 'POST', budgetForm);
      }
      showToast(editingItem ? 'Berhasil diperbarui' : 'Berhasil dibuat');
      setShowModal(false); loadData();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus'); loadData();
  };

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
    <HQLayout title={t('hris.workforceAnalyticsTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perencanaan & Analitik SDM</h1>
        <p className="text-gray-500 mt-1">Perencanaan tenaga kerja, analisis turnover, dan produktivitas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">Total Karyawan</span></div>
          <p className="text-2xl font-bold">{overview.totalEmployees || 0}</p>
          <p className="text-xs text-green-600">Aktif: {overview.activeEmployees || 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">Karyawan Baru (30 hari)</span></div>
          <p className="text-2xl font-bold text-green-600">{overview.newHires || 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-500">Tingkat Turnover</span></div>
          <p className="text-2xl font-bold text-red-600">{overview.turnoverRate || 0}%</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-orange-600" /><span className="text-xs text-gray-500">Tingkat Absensi</span></div>
          <p className="text-2xl font-bold text-orange-600">{overview.absenteeismRate || 0}%</p>
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
          {/* Department Breakdown */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Distribusi Karyawan per Departemen</h3>
            <div className="space-y-3">
              {(overview.departmentBreakdown || []).map((d: any, i: number) => {
                const pct = overview.totalEmployees > 0 ? (parseInt(d.count) / overview.totalEmployees * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{d.department || 'Tidak ada'}</span>
                      <span className="text-gray-500">{d.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!overview.departmentBreakdown || overview.departmentBreakdown.length === 0) && <p className="text-sm text-gray-400">Belum ada data departemen</p>}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Tren Rekrutmen Bulanan (12 Bulan Terakhir)</h3>
            <div className="flex items-end gap-2 h-40">
              {(overview.monthlyTrend || []).map((m: any, i: number) => {
                const maxH = Math.max(...(overview.monthlyTrend || []).map((t: any) => parseInt(t.hires)), 1);
                const h = (parseInt(m.hires) / maxH) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{m.hires}</span>
                    <div className="w-full bg-indigo-400 rounded-t" style={{ height: `${h}%`, minHeight: '4px' }} />
                    <span className="text-[10px] text-gray-400">{new Date(m.month).toLocaleDateString('id-ID', { month: 'short' })}</span>
                  </div>
                );
              })}
              {(!overview.monthlyTrend || overview.monthlyTrend.length === 0) && <p className="text-sm text-gray-400 w-full text-center">Belum ada data tren</p>}
            </div>
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
                    <button onClick={() => { setEditingItem(p); setPlanForm({ name: p.name, periodStart: p.period_start, periodEnd: p.period_end, department: p.department || '', currentHeadcount: p.current_headcount, plannedHeadcount: p.planned_headcount, budgetAmount: p.budget_amount, justification: p.justification || '', status: p.status }); setModalType('plan'); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
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
                      <button onClick={() => handleDelete('budget', b.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
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
                    const max = Math.max(...(turnover.byMonth || []).map((t: any) => parseInt(t.count)), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px]">{m.count}</span>
                        <div className="w-full bg-red-400 rounded-t" style={{ height: `${(parseInt(m.count) / max) * 100}%`, minHeight: '2px' }} />
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
                <div><label className="text-sm font-medium text-gray-700">Departemen</label><input value={planForm.department} onChange={e => setPlanForm({ ...planForm, department: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Jumlah Saat Ini</label><input type="number" value={planForm.currentHeadcount} onChange={e => setPlanForm({ ...planForm, currentHeadcount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Jumlah Rencana</label><input type="number" value={planForm.plannedHeadcount} onChange={e => setPlanForm({ ...planForm, plannedHeadcount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Anggaran (Rp)</label><input type="number" value={planForm.budgetAmount} onChange={e => setPlanForm({ ...planForm, budgetAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Justifikasi</label><textarea value={planForm.justification} onChange={e => setPlanForm({ ...planForm, justification: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
              </>)}
              {modalType === 'budget' && (<>
                <div><label className="text-sm font-medium text-gray-700">Tahun Fiskal</label><input type="number" value={budgetForm.fiscalYear} onChange={e => setBudgetForm({ ...budgetForm, fiscalYear: parseInt(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Departemen</label><input value={budgetForm.department} onChange={e => setBudgetForm({ ...budgetForm, department: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
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
  );
}
