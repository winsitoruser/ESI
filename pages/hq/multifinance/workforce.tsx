import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { PageGuard } from '@/components/permissions';
import {
  Building2, Users, MapPin, DollarSign, Plus, RefreshCw, CheckCircle,
  ClipboardList, Percent, Target, X, Save, Check, Eye, TrendingUp,
  Phone, Car, Wallet, AlertCircle, FileText,
} from 'lucide-react';
import {
  MF_AGENT_TYPES, MF_PRODUCT_TYPES, MF_ACTIVITY_TYPES, MF_VISIT_OUTCOMES,
  MF_COMMISSION_TYPES, getAgentTypeLabel, getProductTypeLabel,
  getActivityTypeLabel, getVisitOutcomeLabel, getCommissionTypeLabel,
  suggestedMfPayType,
} from '@/lib/hris/multifinance-types';
import { getPayTypeLabel } from '@/lib/hris/workforce-types';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';
const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => today().slice(0, 7);

type Tab = 'overview' | 'agents' | 'activities' | 'commissions' | 'portfolio' | 'rules';

export default function MultifinanceWorkforcePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [agents, setAgents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [eligible, setEligible] = useState<any[]>([]);
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'agent' | 'activity' | 'rule'>('agent');
  const [form, setForm] = useState<any>({});
  const [selectedCommIds, setSelectedCommIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const qs = extra ? `&${extra}` : '';
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api/hq/multifinance/workforce?action=${action}${qs}`, opts);
    return res.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ag, act, comm, rl, el, port] = await Promise.all([
        api('overview'),
        api('agents'),
        api('activities', 'GET', undefined, `date_from=${today().slice(0, 7)}-01`),
        api('commissions', 'GET', undefined, `period_month=${thisMonth()}`),
        api('commission-rules'),
        api('eligible-employees'),
        api('portfolio'),
      ]);
      if (ov.success) setStats(ov.data);
      if (ag.success) setAgents(ag.data || []);
      if (act.success) setActivities(act.data || []);
      if (comm.success) setCommissions(comm.data || []);
      if (rl.success) setRules(rl.data || []);
      if (el.success) setEligible(el.data || []);
      if (port.success) setPortfolio(port.data || []);
    } catch {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (type: typeof modalType, preset: any = {}) => {
    setModalType(type);
    if (type === 'agent') {
      setForm({
        agentType: 'field_agent', territory: '', targetMonthlyDisbursement: 0,
        targetMonthlyCollection: 0, targetVisitCount: 20, hireDate: today(), ...preset,
      });
    } else if (type === 'activity') {
      setForm({
        activityDate: today(), activityType: 'collection', productType: 'motor',
        amountCollected: 0, loanAmount: 0, dpdDays: 0, ...preset,
      });
    } else if (type === 'rule') {
      setForm({ commissionType: 'collection', rateType: 'percentage', rateValue: 0.5, isActive: true, ...preset });
    }
    setShowModal(true);
  };

  const saveForm = async () => {
    if (modalType === 'agent') {
      if (!form.employeeId || !form.agentCode) return showToast('Pilih karyawan & kode agen', 'error');
      const res = await api('agent', 'POST', form);
      if (res.success) { showToast('Agen berhasil didaftarkan'); setShowModal(false); loadData(); }
      else showToast(res.error || 'Gagal', 'error');
    } else if (modalType === 'activity') {
      if (!form.employeeId) return showToast('Pilih agen', 'error');
      const res = await api('activity', 'POST', form);
      if (res.success) { showToast('Aktivitas tercatat'); setShowModal(false); loadData(); }
      else showToast(res.error || 'Gagal', 'error');
    } else if (modalType === 'rule') {
      if (!form.code || !form.name) return showToast('Kode & nama wajib', 'error');
      const res = await api('commission-rule', 'POST', form);
      if (res.success) { showToast('Skema komisi ditambahkan'); setShowModal(false); loadData(); }
      else showToast(res.error || 'Gagal', 'error');
    }
  };

  const verifyActivity = async (id: string, status = 'verified') => {
    const res = await api('verify-activity', 'POST', { id, status });
    if (res.success) { showToast(status === 'verified' ? 'Aktivitas diverifikasi' : 'Aktivitas ditolak'); loadData(); }
    else showToast(res.error || 'Gagal', 'error');
  };

  const approveCommissions = async () => {
    if (!selectedCommIds.length) return showToast('Pilih komisi terlebih dahulu', 'error');
    const res = await api('approve-commission', 'POST', { ids: selectedCommIds });
    if (res.success) { showToast(res.message); setSelectedCommIds([]); loadData(); }
    else showToast(res.error || 'Gagal', 'error');
  };

  const assignContracts = async () => {
    if (!selectedContractIds.length || !assignAgentId) {
      return showToast('Pilih kontrak dan agen', 'error');
    }
    const agent = agents.find((a) => a.id === assignAgentId);
    const res = await api('assign-contract', 'POST', {
      contractIds: selectedContractIds,
      agentId: assignAgentId,
      employeeId: agent?.employee_id,
    });
    if (res.success) {
      showToast(res.message);
      setSelectedContractIds([]);
      loadData();
    } else showToast(res.error || 'Gagal', 'error');
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Ringkasan', icon: TrendingUp },
    { id: 'agents', label: 'Agen Lapangan', icon: Users },
    { id: 'portfolio', label: 'Portofolio Kredit', icon: FileText },
    { id: 'activities', label: 'Aktivitas Koleksi', icon: MapPin },
    { id: 'commissions', label: 'Komisi Agen', icon: DollarSign },
    { id: 'rules', label: 'Skema Komisi', icon: Percent },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800', inactive: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <PageGuard module="hris">
      <HQLayout title="Tenaga Kerja Pembiayaan" subtitle="Multifinance — Agen, Koleksi & Komisi">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Building2 className="w-6 h-6 text-indigo-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Modul Pembiayaan & Multifinance</h1>
              <p className="text-sm text-gray-500">AO, Kolektor, Surveyor — penagihan, pencairan & komisi</p>
            </div>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                ${tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Agen Aktif', value: stats.activeAgents || 0, icon: Users, color: 'indigo' },
                { label: 'Aktivitas Hari Ini', value: stats.todayActivities || 0, icon: MapPin, color: 'blue' },
                { label: 'Koleksi Hari Ini', value: fmtCur(stats.todayCollection), icon: Wallet, color: 'green' },
                { label: 'Komisi Pending', value: fmtCur(stats.pendingCommissionAmount), icon: DollarSign, color: 'amber' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <s.icon className={`w-4 h-4 text-${s.color}-500`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Car className="w-4 h-4" /> Realisasi Bulan Ini</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Pencairan</span><span className="font-medium">{fmtCur(stats.monthlyDisbursement)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Koleksi</span><span className="font-medium text-green-600">{fmtCur(stats.monthlyCollection)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Menunggu Verifikasi</span><span className="font-medium text-amber-600">{stats.pendingVerification || 0} aktivitas</span></div>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                <h3 className="font-semibold text-indigo-900 mb-2">Produk Didukung</h3>
                <div className="flex flex-wrap gap-2">
                  {MF_PRODUCT_TYPES.slice(0, 5).map((p) => (
                    <span key={p.code} className="px-2 py-1 bg-white rounded text-xs text-indigo-700 border border-indigo-200">{p.label}</span>
                  ))}
                </div>
                <p className="text-xs text-indigo-600 mt-3">Komisi terintegrasi ke Payroll HRIS (pay type: komisi / gaji pokok + komisi)</p>
              </div>
            </div>
          </div>
        )}

        {/* Agents */}
        {tab === 'agents' && (
          <div>
            <div className="flex justify-between mb-4">
              <p className="text-sm text-gray-500">{agents.length} agen terdaftar</p>
              <button onClick={() => openModal('agent')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Daftarkan Agen
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Agen</th>
                    <th className="text-left p-3">Tipe</th>
                    <th className="text-left p-3">Wilayah</th>
                    <th className="text-right p-3">Target Pencairan</th>
                    <th className="text-right p-3">Target Koleksi</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{a.employee_name}</div>
                        <div className="text-xs text-gray-400">{a.agent_code}</div>
                      </td>
                      <td className="p-3">{getAgentTypeLabel(a.agent_type)}</td>
                      <td className="p-3">{a.territory || '-'}</td>
                      <td className="p-3 text-right">{fmtCur(parseFloat(a.target_monthly_disbursement))}</td>
                      <td className="p-3 text-right">{fmtCur(parseFloat(a.target_monthly_collection))}</td>
                      <td className="p-3 text-center">{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                  {!agents.length && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Belum ada agen terdaftar</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activities */}
        {tab === 'activities' && (
          <div>
            <div className="flex justify-between mb-4">
              <p className="text-sm text-gray-500">{activities.length} aktivitas bulan ini</p>
              <button onClick={() => openModal('activity', { employeeId: agents[0]?.employee_id })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Catat Aktivitas
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-left p-3">Agen</th>
                    <th className="text-left p-3">Aktivitas</th>
                    <th className="text-left p-3">Nasabah / Kontrak</th>
                    <th className="text-right p-3">Nilai</th>
                    <th className="text-right p-3">Komisi</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act) => (
                    <tr key={act.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">{fmtDate(act.activity_date)}</td>
                      <td className="p-3">{act.agent_name}</td>
                      <td className="p-3">
                        <div>{getActivityTypeLabel(act.activity_type)}</div>
                        {act.visit_outcome && <div className="text-xs text-gray-400">{getVisitOutcomeLabel(act.visit_outcome)}</div>}
                      </td>
                      <td className="p-3">
                        <div>{act.customer_name || '-'}</div>
                        <div className="text-xs text-gray-400">{act.contract_number || ''}</div>
                      </td>
                      <td className="p-3 text-right">
                        {act.activity_type === 'disbursement' ? fmtCur(parseFloat(act.loan_amount)) : fmtCur(parseFloat(act.amount_collected))}
                      </td>
                      <td className="p-3 text-right text-green-600">{fmtCur(parseFloat(act.commission_amount))}</td>
                      <td className="p-3 text-center">{statusBadge(act.status)}</td>
                      <td className="p-3 text-center">
                        {act.status === 'pending' && (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => verifyActivity(act.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Verifikasi"><Check className="w-4 h-4" /></button>
                            <button onClick={() => verifyActivity(act.id, 'rejected')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Tolak"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!activities.length && (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada aktivitas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commissions */}
        {tab === 'commissions' && (
          <div>
            <div className="flex justify-between mb-4">
              <p className="text-sm text-gray-500">Komisi periode {thisMonth()}</p>
              <div className="flex gap-2">
                <button onClick={approveCommissions} disabled={!selectedCommIds.length}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle className="w-4 h-4" /> Setujui ({selectedCommIds.length})
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="text-left p-3">Agen</th>
                    <th className="text-left p-3">Periode</th>
                    <th className="text-left p-3">Jenis</th>
                    <th className="text-right p-3">Dasar</th>
                    <th className="text-right p-3">Komisi</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        {c.status === 'pending' && (
                          <input type="checkbox" checked={selectedCommIds.includes(c.id)}
                            onChange={(e) => setSelectedCommIds(e.target.checked ? [...selectedCommIds, c.id] : selectedCommIds.filter((x) => x !== c.id))} />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{c.employee_name}</div>
                        <div className="text-xs text-gray-400">{c.agent_code}</div>
                      </td>
                      <td className="p-3">{c.period_month}</td>
                      <td className="p-3">{getCommissionTypeLabel(c.commission_type)}</td>
                      <td className="p-3 text-right">{fmtCur(parseFloat(c.base_amount))}</td>
                      <td className="p-3 text-right font-medium text-green-600">{fmtCur(parseFloat(c.commission_amount))}</td>
                      <td className="p-3 text-center">{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                  {!commissions.length && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Belum ada komisi — verifikasi aktivitas terlebih dahulu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {tab === 'portfolio' && (
          <div>
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <p className="text-sm text-gray-500">{portfolio.length} kontrak kredit</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)}
                  className="text-sm border rounded-lg px-2 py-1.5">
                  <option value="">Assign ke agen...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.employee_name} ({a.agent_code})</option>
                  ))}
                </select>
                <button onClick={assignContracts} disabled={!selectedContractIds.length || !assignAgentId}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                  Assign ({selectedContractIds.length})
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="text-left p-3">Kontrak</th>
                    <th className="text-left p-3">Nasabah</th>
                    <th className="text-right p-3">Angsuran</th>
                    <th className="text-center p-3">DPD</th>
                    <th className="text-left p-3">Agen</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <input type="checkbox" checked={selectedContractIds.includes(c.id)}
                          onChange={(e) => setSelectedContractIds(e.target.checked ? [...selectedContractIds, c.id] : selectedContractIds.filter((x) => x !== c.id))} />
                      </td>
                      <td className="p-3 font-mono text-xs">{c.contract_number}</td>
                      <td className="p-3">{c.customer_name}</td>
                      <td className="p-3 text-right">{fmtCur(parseFloat(c.installment_amount))}</td>
                      <td className="p-3 text-center">{c.dpd_days || 0}</td>
                      <td className="p-3 text-xs">{c.agent_name || <span className="text-amber-600">Belum assign</span>}</td>
                      <td className="p-3 text-center">{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                  {!portfolio.length && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Jalankan npm run db:mf-portfolio-migrate</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rules */}
        {tab === 'rules' && (
          <div>
            <div className="flex justify-between mb-4">
              <p className="text-sm text-gray-500">{rules.length} skema komisi</p>
              <button onClick={() => openModal('rule')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Tambah Skema
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {rules.map((r) => (
                <div key={r.id} className={`bg-white rounded-xl border p-4 ${!r.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.code}</div>
                    </div>
                    {statusBadge(r.is_active ? 'active' : 'inactive')}
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Jenis</span><span>{getCommissionTypeLabel(r.commission_type)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Tarif</span>
                      <span className="font-medium">{r.rate_type === 'fixed' ? fmtCur(parseFloat(r.rate_value)) : `${r.rate_value}%`}</span>
                    </div>
                    {r.product_type && <div className="flex justify-between"><span className="text-gray-500">Produk</span><span>{getProductTypeLabel(r.product_type)}</span></div>}
                  </div>
                </div>
              ))}
              {!rules.length && (
                <div className="col-span-2 p-8 text-center text-gray-400 bg-white rounded-xl border">Belum ada skema — jalankan migrasi DB</div>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">
                  {modalType === 'agent' ? 'Daftarkan Agen Pembiayaan' : modalType === 'activity' ? 'Catat Aktivitas Lapangan' : 'Skema Komisi Baru'}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-4 space-y-3">
                {modalType === 'agent' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Karyawan</label>
                      <select className="w-full border rounded-lg p-2 text-sm" value={form.employeeId || ''}
                        onChange={(e) => {
                          const emp = eligible.find((x) => x.id === e.target.value);
                          setForm({ ...form, employeeId: e.target.value, agentCode: emp?.employee_code || `AG-${Date.now().toString().slice(-6)}` });
                        }}>
                        <option value="">-- Pilih --</option>
                        {eligible.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employment_category || 'baru'})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Kode Agen</label>
                        <input className="w-full border rounded-lg p-2 text-sm" value={form.agentCode || ''} onChange={(e) => setForm({ ...form, agentCode: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tipe Agen</label>
                        <select className="w-full border rounded-lg p-2 text-sm" value={form.agentType} onChange={(e) => setForm({ ...form, agentType: e.target.value })}>
                          {MF_AGENT_TYPES.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Wilayah / Territory</label>
                      <input className="w-full border rounded-lg p-2 text-sm" placeholder="Jakarta Selatan, Bekasi, dll" value={form.territory || ''} onChange={(e) => setForm({ ...form, territory: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Target Pencairan/bulan</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.targetMonthlyDisbursement || 0} onChange={(e) => setForm({ ...form, targetMonthlyDisbursement: +e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Target Koleksi/bulan</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.targetMonthlyCollection || 0} onChange={(e) => setForm({ ...form, targetMonthlyCollection: +e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Target Kunjungan</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.targetVisitCount || 0} onChange={(e) => setForm({ ...form, targetVisitCount: +e.target.value })} />
                      </div>
                    </div>
                    <p className="text-xs text-indigo-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pay type disarankan: {getPayTypeLabel(suggestedMfPayType(form.agentType))}</p>
                  </>
                )}

                {modalType === 'activity' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Agen</label>
                      <select className="w-full border rounded-lg p-2 text-sm" value={form.employeeId || ''} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                        <option value="">-- Pilih --</option>
                        {agents.map((a) => <option key={a.employee_id} value={a.employee_id}>{a.employee_name} ({a.agent_code})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Tanggal</label>
                        <input type="date" className="w-full border rounded-lg p-2 text-sm" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Jenis Aktivitas</label>
                        <select className="w-full border rounded-lg p-2 text-sm" value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>
                          {MF_ACTIVITY_TYPES.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Produk</label>
                        <select className="w-full border rounded-lg p-2 text-sm" value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}>
                          {MF_PRODUCT_TYPES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Hasil Kunjungan</label>
                        <select className="w-full border rounded-lg p-2 text-sm" value={form.visitOutcome || ''} onChange={(e) => setForm({ ...form, visitOutcome: e.target.value })}>
                          <option value="">-- Opsional --</option>
                          {MF_VISIT_OUTCOMES.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Nama Nasabah</label>
                        <input className="w-full border rounded-lg p-2 text-sm" value={form.customerName || ''} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">No. Kontrak</label>
                        <input className="w-full border rounded-lg p-2 text-sm" value={form.contractNumber || ''} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Nilai Pencairan</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.loanAmount || 0} onChange={(e) => setForm({ ...form, loanAmount: +e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Tertagih</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.amountCollected || 0} onChange={(e) => setForm({ ...form, amountCollected: +e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">DPD (hari)</label>
                        <input type="number" className="w-full border rounded-lg p-2 text-sm" value={form.dpdDays || 0} onChange={(e) => setForm({ ...form, dpdDays: +e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Lokasi / Catatan</label>
                      <input className="w-full border rounded-lg p-2 text-sm" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </div>
                  </>
                )}

                {modalType === 'rule' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Kode</label>
                        <input className="w-full border rounded-lg p-2 text-sm" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Nama Skema</label>
                        <input className="w-full border rounded-lg p-2 text-sm" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Jenis Komisi</label>
                      <select className="w-full border rounded-lg p-2 text-sm" value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
                        {MF_COMMISSION_TYPES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Tipe Tarif</label>
                        <select className="w-full border rounded-lg p-2 text-sm" value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value })}>
                          <option value="percentage">Persentase (%)</option>
                          <option value="fixed">Nominal Tetap (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Nilai Tarif</label>
                        <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-sm" value={form.rateValue || 0} onChange={(e) => setForm({ ...form, rateValue: +e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Batal</button>
                <button onClick={saveForm} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                  <Save className="w-4 h-4" /> Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
