import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { Users, Plus, Eye, Edit, Trash2, X, Check, TrendingUp, Target, BarChart3, Loader2, DollarSign, Calendar, Shield, Award, Settings, Search, RefreshCw, CheckCircle2, XCircle, UserPlus, MapPin, ChevronRight, Star, Briefcase, Zap, CreditCard, AlertTriangle, Crown, Medal, Gift, Percent, Calculator, Save, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { rowsOr, MOCK_HQ_SFA_ENHANCED } from '@/lib/hq/mock-data';

type TabKey = 'overview' | 'teams' | 'targets' | 'achievements' | 'incentives' | 'plafon' | 'parameters';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtNum = (n: number) => (n || 0).toLocaleString('id-ID');
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

const RATING_COLORS: Record<string, string> = {
  excellent: 'bg-purple-100 text-purple-700',
  good: 'bg-green-100 text-green-700',
  average: 'bg-yellow-100 text-yellow-700',
  below_avg: 'bg-orange-100 text-orange-700',
  poor: 'bg-red-100 text-red-700',
};
const RATING_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Good', average: 'Average', below_avg: 'Below Avg', poor: 'Poor' };

export default function SFAEnhancedPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Data states (nilai awal + fallback: MOCK_HQ_SFA_ENHANCED)
  const [dashboard, setDashboard] = useState<any>(MOCK_HQ_SFA_ENHANCED.dashboard);
  const [teams, setTeams] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.teams);
  const [targetGroups, setTargetGroups] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.targetGroups);
  const [achievements, setAchievements] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.achievements);
  const [incentiveSchemes, setIncentiveSchemes] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.incentiveSchemes);
  const [incentiveCalcs, setIncentiveCalcs] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.incentiveCalcs);
  const [plafonList, setPlafonList] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.plafonList);
  const [parameters, setParameters] = useState<any>(MOCK_HQ_SFA_ENHANCED.parameters);
  const [paramEdits, setParamEdits] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.users);
  const [territories, setTerritories] = useState<any[]>(MOCK_HQ_SFA_ENHANCED.territories);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = async (action: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api/hq/sfa/enhanced?action=${action}`, opts);
    return res.json();
  };
  const apiBase = async (action: string) => {
    const res = await fetch(`/api/hq/sfa?action=${action}`);
    return res.json();
  };

  const fetchAll = useCallback(async () => {
    const M = MOCK_HQ_SFA_ENHANCED;
    setLoading(true);
    try {
      const [d, t, tg, ach, is, ic, pl, p] = await Promise.all([
        api('enhanced-dashboard'), api('teams'), api('target-groups'),
        api('achievements&period=' + String(new Date().getMonth() + 1).padStart(2, '0') + '&year=' + new Date().getFullYear()),
        api('incentive-schemes'), api('incentive-calculations&period=' + String(new Date().getMonth() + 1).padStart(2, '0') + '&year=' + new Date().getFullYear()),
        api('plafon-list'), api('parameters')
      ]);
      if (d.success) setDashboard(d.data ?? M.dashboard);
      else setDashboard(M.dashboard);
      if (t.success) setTeams(rowsOr(t.data, M.teams));
      else setTeams(M.teams);
      if (tg.success) setTargetGroups(rowsOr(tg.data, M.targetGroups));
      else setTargetGroups(M.targetGroups);
      if (ach.success) setAchievements(rowsOr(ach.data, M.achievements));
      else setAchievements(M.achievements);
      if (is.success) setIncentiveSchemes(rowsOr(is.data, M.incentiveSchemes));
      else setIncentiveSchemes(M.incentiveSchemes);
      if (ic.success) setIncentiveCalcs(rowsOr(ic.data, M.incentiveCalcs));
      else setIncentiveCalcs(M.incentiveCalcs);
      if (pl.success) setPlafonList(rowsOr(pl.data, M.plafonList));
      else setPlafonList(M.plafonList);
      if (p.success) {
        const raw = p.data;
        setParameters(raw && typeof raw === 'object' && Object.keys(raw).length > 0 ? raw : M.parameters);
      } else setParameters(M.parameters);
    } catch (e) {
      console.error(e);
      setDashboard(M.dashboard);
      setTeams(M.teams);
      setTargetGroups(M.targetGroups);
      setAchievements(M.achievements);
      setIncentiveSchemes(M.incentiveSchemes);
      setIncentiveCalcs(M.incentiveCalcs);
      setPlafonList(M.plafonList);
      setParameters(M.parameters);
    }
    setLoading(false);
  }, []);

  const fetchSupport = useCallback(async () => {
    const M = MOCK_HQ_SFA_ENHANCED;
    try {
      const [u, ter] = await Promise.all([
        fetch('/api/hq/integrations/sfa-marketing?action=sfa-salespeople').then(r => r.json()),
        apiBase('territories')
      ]);
      if (u.success) setUsers(rowsOr(u.data, M.users));
      else setUsers(M.users);
      if (ter.success) setTerritories(rowsOr(ter.data, M.territories));
      else setTerritories(M.territories);
    } catch {
      setUsers(M.users);
      setTerritories(M.territories);
    }
  }, []);

  useEffect(() => { fetchAll(); fetchSupport(); }, []);

  async function handleCreate(e: React.FormEvent, type: string) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await api(`create-${type}`, 'POST', form);
      if (r.success) { showToast(r.message || 'Berhasil'); setShowModal(null); setForm({}); fetchAll(); }
      else showToast(r.error || 'Gagal', 'error');
    } catch { showToast('Error', 'error'); }
    setSaving(false);
  }

  async function handleSaveParams() {
    setSaving(true);
    const updates = Object.entries(paramEdits).map(([id, val]) => ({ id, param_value: val }));
    if (updates.length === 0) { showToast('Tidak ada perubahan', 'error'); setSaving(false); return; }
    try {
      const r = await api('update-parameters-bulk', 'PUT', { updates });
      if (r.success) { showToast(r.message); setParamEdits({}); fetchAll(); }
      else showToast(r.error, 'error');
    } catch { showToast('Error', 'error'); }
    setSaving(false);
  }

  async function handleCalcAchievement(userId: number) {
    setSaving(true);
    const period = String(new Date().getMonth() + 1).padStart(2, '0');
    try {
      const r = await api('calculate-achievement', 'POST', { user_id: userId, period, year: new Date().getFullYear() });
      if (r.success) { showToast(`Achievement: ${fmtPct(r.data.weighted_pct)} (${r.data.rating})`); fetchAll(); }
      else showToast(r.error, 'error');
    } catch { showToast('Error', 'error'); }
    setSaving(false);
  }

  async function handleCalcIncentive(userId: number, schemeId: string) {
    setSaving(true);
    const period = String(new Date().getMonth() + 1).padStart(2, '0');
    try {
      const r = await api('calculate-incentive', 'POST', { user_id: userId, period, year: new Date().getFullYear(), scheme_id: schemeId });
      if (r.success) { showToast(`Insentif: ${fmtCur(r.data.net_incentive)} (${r.data.tier})`); fetchAll(); }
      else showToast(r.error, 'error');
    } catch { showToast('Error', 'error'); }
    setSaving(false);
  }

  async function handleApproveIncentive(id: string, status: string) {
    try {
      const r = await api('approve-incentive', 'PUT', { id, status });
      if (r.success) { showToast(r.message); fetchAll(); }
    } catch { showToast('Error', 'error'); }
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'teams', label: 'Tim FF', icon: Users },
    { key: 'targets', label: 'Target', icon: Target },
    { key: 'achievements', label: 'Achievement', icon: Award },
    { key: 'incentives', label: 'Insentif', icon: Gift },
    { key: 'plafon', label: 'Plafon', icon: CreditCard },
    { key: 'parameters', label: 'Parameter', icon: Settings },
  ];

  const CAT_LABELS: Record<string, string> = { visit: 'Kunjungan', target: 'Target', achievement: 'Achievement', incentive: 'Insentif', plafon: 'Plafon' };
  const CAT_ICONS: Record<string, any> = { visit: MapPin, target: Target, achievement: Award, incentive: Gift, plafon: CreditCard };

  return (
    <HQLayout title="SFA Enhanced" subtitle="Tim Field Force, Target, Achievement, Insentif & Plafon">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedItem(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /><span className="ml-3 text-gray-500">Memuat data...</span></div>
      ) : (
        <>
          {/* ══════════ OVERVIEW ══════════ */}
          {tab === 'overview' && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Tim', value: dashboard.summary?.total_teams || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Field Force', value: dashboard.summary?.total_ff || 0, icon: Briefcase, color: 'text-indigo-600 bg-indigo-50' },
                  { label: 'Avg Achievement', value: fmtPct(dashboard.summary?.avg_achievement), icon: Award, color: 'text-green-600 bg-green-50' },
                  { label: 'Total Insentif', value: fmtCur(dashboard.summary?.total_incentive), icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{s.label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Target Groups Aktif', value: dashboard.summary?.active_target_groups || 0, icon: Target, color: 'text-orange-600 bg-orange-50' },
                  { label: 'Insentif Pending', value: dashboard.summary?.pending_incentives || 0, icon: Calculator, color: 'text-yellow-600 bg-yellow-50' },
                  { label: 'Plafon Aktif', value: dashboard.summary?.active_plafon || 0, icon: CreditCard, color: 'text-teal-600 bg-teal-50' },
                  { label: 'High Risk Plafon', value: dashboard.summary?.high_risk_plafon || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{s.label}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Top Achievers */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" /> Top Achievers</h3>
                  <div className="space-y-2">
                    {(dashboard.topAchievers || []).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-200 text-orange-800'}`}>{i + 1}</div>
                          <div>
                            <div className="text-sm font-medium">{a.user_name}</div>
                            <div className="text-xs text-gray-400">{a.team_name || '-'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">{fmtPct(a.weighted_pct)}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${RATING_COLORS[a.rating] || ''}`}>{RATING_LABELS[a.rating] || a.rating}</span>
                        </div>
                      </div>
                    ))}
                    {(!dashboard.topAchievers || dashboard.topAchievers.length === 0) && <p className="text-sm text-gray-400 text-center py-4">Belum ada data achievement</p>}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Performa Tim</h3>
                  <div className="space-y-2">
                    {(dashboard.teamPerformance || []).map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.members} anggota</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{fmtPct(t.avg_achievement)}</div>
                          <div className="text-xs text-gray-400">{fmtCur(t.total_revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ TEAMS ══════════ */}
          {tab === 'teams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Tim Field Force</h3>
                <button onClick={() => { setShowModal('team'); setForm({ team_type: 'field_force', max_members: 20 }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Buat Tim</button>
              </div>

              {selectedItem ? (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{selectedItem.name}</h3>
                      <p className="text-sm text-gray-500">{selectedItem.code} | {selectedItem.team_type} | Leader: {selectedItem.leader_name || '-'}</p>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{selectedItem.description}</p>
                  <h4 className="font-medium text-gray-700 mb-2">Anggota Tim ({selectedItem.members?.length || 0})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Nama</th><th className="pb-2">Role</th><th className="pb-2">Posisi</th><th className="pb-2 text-right">Kunjungan Bulan Ini</th><th className="pb-2 text-right">Revenue Bulan Ini</th></tr></thead>
                      <tbody>
                        {(selectedItem.members || []).map((m: any) => (
                          <tr key={m.id} className="border-b last:border-0">
                            <td className="py-2 font-medium">{m.user_name}</td>
                            <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'leader' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{m.role}</span></td>
                            <td className="py-2 text-gray-600">{m.position}</td>
                            <td className="py-2 text-right">{m.visits_this_month}</td>
                            <td className="py-2 text-right">{fmtCur(m.revenue_this_month)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => { setShowModal('add-member'); setForm({ team_id: selectedItem.id }); }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><UserPlus className="w-3 h-3" /> Tambah Anggota</button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map(t => (
                    <div key={t.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer" onClick={async () => {
                      const r = await api(`team-detail&id=${t.id}`);
                      if (r.data) setSelectedItem(r.data);
                    }}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{t.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{t.code}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${t.team_type === 'field_force' ? 'bg-blue-100 text-blue-700' : t.team_type === 'key_account' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{t.team_type}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                        <div><div className="text-lg font-bold text-blue-600">{t.member_count}</div><div className="text-xs text-gray-400">Anggota</div></div>
                        <div><div className="text-sm font-medium truncate">{t.leader_name || '-'}</div><div className="text-xs text-gray-400">Leader</div></div>
                        <div><div className="text-sm font-medium truncate">{t.territory_name || '-'}</div><div className="text-xs text-gray-400">Territory</div></div>
                      </div>
                    </div>
                  ))}
                  {teams.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400">Belum ada tim</div>}
                </div>
              )}
            </div>
          )}

          {/* ══════════ TARGETS ══════════ */}
          {tab === 'targets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Target Groups</h3>
                <button onClick={() => { setShowModal('target-group'); setForm({ group_type: 'general', period_type: 'monthly', period: String(new Date().getMonth() + 1).padStart(2, '0'), year: new Date().getFullYear() }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Buat Target Group</button>
              </div>

              {selectedItem ? (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{selectedItem.name}</h3>
                      <p className="text-sm text-gray-500">{selectedItem.code} | {selectedItem.period_type} | {selectedItem.period}/{selectedItem.year}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowModal('target-assignment'); setForm({ target_group_id: selectedItem.id }); }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Plus className="w-3 h-3" /> Assign Target</button>
                      <button onClick={() => { setShowModal('target-product'); setForm({ target_group_id: selectedItem.id }); }} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Plus className="w-3 h-3" /> Target Produk</button>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  {selectedItem.total_target_value > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between text-sm"><span>Total Target</span><span className="font-bold">{fmtCur(selectedItem.total_target_value)}</span></div>
                      <div className="flex justify-between text-sm mt-1"><span>Tercapai</span><span className="font-bold text-green-600">{fmtCur(selectedItem.total_achieved_value)}</span></div>
                      <div className="h-2 bg-white rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, selectedItem.overall_achievement_pct || 0)}%` }} />
                      </div>
                      <div className="text-right text-xs text-blue-600 mt-1">{fmtPct(selectedItem.overall_achievement_pct)}</div>
                    </div>
                  )}

                  <h4 className="font-medium text-gray-700 mb-2">Target per FF ({selectedItem.assignments?.length || 0})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Nama</th><th className="pb-2 text-right">Revenue</th><th className="pb-2 text-right">%</th><th className="pb-2 text-right">Visit</th><th className="pb-2 text-right">%</th><th className="pb-2 text-right">New Cust</th><th className="pb-2 text-right">EC</th><th className="pb-2 text-right">Weighted</th></tr></thead>
                      <tbody>
                        {(selectedItem.assignments || []).map((a: any) => (
                          <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 font-medium">{a.user_name || a.team_name || '-'}</td>
                            <td className="py-2 text-right">{fmtCur(a.revenue_target)}<br/><span className="text-xs text-green-600">{fmtCur(a.revenue_achieved)}</span></td>
                            <td className="py-2 text-right font-medium">{fmtPct(a.revenue_achievement_pct)}</td>
                            <td className="py-2 text-right">{a.visit_target}<br/><span className="text-xs text-green-600">{a.visit_achieved}</span></td>
                            <td className="py-2 text-right font-medium">{fmtPct(a.visit_achievement_pct)}</td>
                            <td className="py-2 text-right">{a.new_customer_target}/{a.new_customer_achieved}</td>
                            <td className="py-2 text-right">{a.effective_call_target}/{a.effective_call_achieved}</td>
                            <td className="py-2 text-right"><span className="font-bold text-blue-600">{fmtPct(a.weighted_achievement)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedItem.productTargets?.length > 0 && (
                    <>
                      <h4 className="font-medium text-gray-700 mt-4 mb-2">Target per Produk ({selectedItem.productTargets.length})</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Produk</th><th className="pb-2">Kategori</th><th className="pb-2">Assigned</th><th className="pb-2 text-right">Target Revenue</th><th className="pb-2 text-right">Achieved</th><th className="pb-2 text-right">Target Vol</th><th className="pb-2 text-right">Achieved</th><th className="pb-2 text-right">%</th></tr></thead>
                          <tbody>
                            {selectedItem.productTargets.map((tp: any) => (
                              <tr key={tp.id} className="border-b last:border-0">
                                <td className="py-2 font-medium">{tp.product_name || '-'}</td>
                                <td className="py-2 text-gray-500">{tp.category_name || '-'}</td>
                                <td className="py-2 text-gray-500">{tp.user_name || '-'}</td>
                                <td className="py-2 text-right">{fmtCur(tp.revenue_target)}</td>
                                <td className="py-2 text-right text-green-600">{fmtCur(tp.revenue_achieved)}</td>
                                <td className="py-2 text-right">{fmtNum(tp.volume_target)} {tp.volume_unit}</td>
                                <td className="py-2 text-right text-green-600">{fmtNum(tp.volume_achieved)}</td>
                                <td className="py-2 text-right font-bold">{fmtPct(tp.achievement_pct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {targetGroups.map(tg => (
                    <div key={tg.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer" onClick={async () => {
                      const r = await api(`target-group-detail&id=${tg.id}`);
                      if (r.data) setSelectedItem(r.data);
                    }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{tg.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{tg.code}</span>
                            <span className="text-xs text-gray-500">{tg.period}/{tg.year}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${tg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{tg.status}</span>
                            <span className="text-xs text-gray-400">{tg.assignment_count} assignments</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{fmtCur(tg.total_target_value)}</div>
                          <div className="text-xs text-gray-400">{fmtPct(tg.overall_achievement_pct)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {targetGroups.length === 0 && <div className="text-center py-8 text-gray-400">Belum ada target group</div>}
                </div>
              )}
            </div>
          )}

          {/* ══════════ ACHIEVEMENTS ══════════ */}
          {tab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Achievement Bulan Ini</h3>
                <button onClick={() => { if (users.length > 0) users.forEach((u: any) => handleCalcAchievement(u.id)); }} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Hitung Semua
                </button>
              </div>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-left text-gray-600"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Tim</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Rev %</th><th className="px-4 py-3 text-right">Visit</th><th className="px-4 py-3 text-right">Vis %</th><th className="px-4 py-3 text-right">EC</th><th className="px-4 py-3 text-right">New Cust</th><th className="px-4 py-3 text-right">Weighted</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3"></th></tr></thead>
                  <tbody>
                    {achievements.map(a => (
                      <tr key={a.id} className="border-t hover:bg-blue-50/50">
                        <td className="px-4 py-3 font-medium">{a.user_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.team_name || '-'}</td>
                        <td className="px-4 py-3 text-right">{fmtCur(a.total_revenue)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtPct(a.revenue_pct)}</td>
                        <td className="px-4 py-3 text-right">{a.completed_visits}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtPct(a.visit_pct)}</td>
                        <td className="px-4 py-3 text-right">{a.effective_calls}</td>
                        <td className="px-4 py-3 text-right">{a.new_customers}</td>
                        <td className="px-4 py-3 text-right"><span className="text-lg font-bold text-blue-600">{fmtPct(a.weighted_pct)}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${RATING_COLORS[a.rating] || 'bg-gray-100'}`}>{RATING_LABELS[a.rating] || a.rating}</span></td>
                        <td className="px-4 py-3"><button onClick={() => handleCalcAchievement(a.user_id)} className="text-blue-500 hover:text-blue-700"><RefreshCw className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                    {achievements.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-gray-400">Belum ada data achievement. Klik "Hitung Semua" untuk menghitung.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════ INCENTIVES ══════════ */}
          {tab === 'incentives' && (
            <div className="space-y-6">
              {/* Schemes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800">Skema Insentif</h3>
                  <button onClick={() => { setShowModal('incentive-scheme'); setForm({ scheme_type: 'progressive', calculation_basis: 'achievement_pct', period_type: 'monthly', base_amount: 500000, min_achievement_pct: 70, overachievement_multiplier: 1.5 }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Buat Skema</button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {incentiveSchemes.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{s.name}</h4>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{s.code}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                        </div>
                        <span className="text-xs text-gray-400">{s.tier_count} tier</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{s.description}</p>
                      <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2 text-xs">
                        <div><div className="font-bold">{fmtCur(s.base_amount)}</div><div className="text-gray-400">Base</div></div>
                        <div><div className="font-bold">{fmtPct(s.min_achievement_pct)}</div><div className="text-gray-400">Min Ach</div></div>
                        <div><div className="font-bold">{s.overachievement_multiplier}x</div><div className="text-gray-400">Over Mult</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculations */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800">Kalkulasi Insentif Bulan Ini</h3>
                  {incentiveSchemes.length > 0 && achievements.length > 0 && (
                    <button onClick={() => { achievements.forEach(a => handleCalcIncentive(a.user_id, incentiveSchemes[0].id)); }} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Hitung Semua Insentif
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-gray-600"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Skema</th><th className="px-4 py-3 text-right">Achievement</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3 text-right">Base</th><th className="px-4 py-3 text-right">Bonus</th><th className="px-4 py-3 text-right">Net Insentif</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
                    <tbody>
                      {incentiveCalcs.map(ic => (
                        <tr key={ic.id} className="border-t hover:bg-green-50/50">
                          <td className="px-4 py-3 font-medium">{ic.user_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{ic.scheme_name}</td>
                          <td className="px-4 py-3 text-right font-medium">{fmtPct(ic.achievement_pct)}</td>
                          <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{ic.tier_name}</span></td>
                          <td className="px-4 py-3 text-right">{fmtCur(ic.base_incentive)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{fmtCur(parseFloat(ic.overachievement_bonus || 0) + parseFloat(ic.new_customer_bonus || 0) + parseFloat(ic.visit_bonus || 0) + parseFloat(ic.special_bonus || 0))}</td>
                          <td className="px-4 py-3 text-right"><span className="text-lg font-bold text-green-700">{fmtCur(ic.net_incentive)}</span></td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ic.status === 'approved' ? 'bg-green-100 text-green-700' : ic.status === 'paid' ? 'bg-blue-100 text-blue-700' : ic.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{ic.status}</span></td>
                          <td className="px-4 py-3">
                            {ic.status === 'draft' && (
                              <div className="flex gap-1">
                                <button onClick={() => handleApproveIncentive(ic.id, 'approved')} className="text-green-500 hover:text-green-700" title="Approve"><Check className="w-4 h-4" /></button>
                                <button onClick={() => handleApproveIncentive(ic.id, 'rejected')} className="text-red-500 hover:text-red-700" title="Reject"><X className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {incentiveCalcs.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">Belum ada kalkulasi insentif</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PLAFON ══════════ */}
          {tab === 'plafon' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Plafon / Credit Limit</h3>
                <button onClick={() => { setShowModal('plafon'); setForm({ plafon_type: 'customer', payment_terms: 30, risk_level: 'low' }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"><Plus className="w-4 h-4" /> Buat Plafon</button>
              </div>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-left text-gray-600"><th className="px-4 py-3">Tipe</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3 text-right">Credit Limit</th><th className="px-4 py-3 text-right">Terpakai</th><th className="px-4 py-3 text-right">Tersedia</th><th className="px-4 py-3">Utilisasi</th><th className="px-4 py-3">Terms</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Overdue</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody>
                    {plafonList.map(p => {
                      const util = parseFloat(p.credit_limit) > 0 ? (parseFloat(p.used_amount) / parseFloat(p.credit_limit)) * 100 : 0;
                      return (
                        <tr key={p.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.plafon_type === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.plafon_type}</span></td>
                          <td className="px-4 py-3 font-medium">{p.customer_name || p.user_name || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">{fmtCur(p.credit_limit)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{fmtCur(p.used_amount)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{fmtCur(p.available_amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${util > 90 ? 'bg-red-500' : util > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, util)}%` }} /></div>
                              <span className="text-xs text-gray-400">{util.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{p.payment_terms}d</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.risk_level === 'low' ? 'bg-green-100 text-green-700' : p.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : p.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-red-200 text-red-800'}`}>{p.risk_level}</span></td>
                          <td className="px-4 py-3">{p.overdue_count > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{p.overdue_count}</span> : <span className="text-xs text-green-500">0</span>}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span></td>
                        </tr>
                      );
                    })}
                    {plafonList.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-gray-400">Belum ada plafon</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════ PARAMETERS ══════════ */}
          {tab === 'parameters' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Parameter SFA</h3>
                <button onClick={handleSaveParams} disabled={saving || Object.keys(paramEdits).length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan ({Object.keys(paramEdits).length})
                </button>
              </div>
              {Object.entries(parameters).map(([cat, params]: [string, any]) => {
                const CatIcon = CAT_ICONS[cat] || Settings;
                return (
                  <div key={cat} className="bg-white rounded-xl border">
                    <div className="flex items-center gap-2 p-4 border-b bg-gray-50 rounded-t-xl">
                      <CatIcon className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-gray-800">{CAT_LABELS[cat] || cat}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {(params as any[]).map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700">{p.label}</div>
                            <div className="text-xs text-gray-400">{p.description}</div>
                          </div>
                          <div className="w-48 flex-shrink-0">
                            {p.value_type === 'boolean' ? (
                              <button
                                onClick={() => {
                                  const newVal = (paramEdits[p.id] !== undefined ? paramEdits[p.id] : p.param_value) === 'true' ? 'false' : 'true';
                                  setParamEdits({ ...paramEdits, [p.id]: newVal });
                                }}
                                className={`w-12 h-6 rounded-full transition-colors relative ${(paramEdits[p.id] !== undefined ? paramEdits[p.id] : p.param_value) === 'true' ? 'bg-blue-600' : 'bg-gray-300'}`}
                              >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${(paramEdits[p.id] !== undefined ? paramEdits[p.id] : p.param_value) === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                              </button>
                            ) : p.value_type === 'select' ? (
                              <select className="w-full border rounded-lg px-3 py-1.5 text-sm" value={paramEdits[p.id] !== undefined ? paramEdits[p.id] : p.param_value} onChange={e => setParamEdits({ ...paramEdits, [p.id]: e.target.value })}>
                                <option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                              </select>
                            ) : (
                              <input type="number" className={`w-full border rounded-lg px-3 py-1.5 text-sm text-right ${paramEdits[p.id] !== undefined ? 'border-blue-400 bg-blue-50' : ''}`}
                                value={paramEdits[p.id] !== undefined ? paramEdits[p.id] : p.param_value}
                                onChange={e => setParamEdits({ ...paramEdits, [p.id]: e.target.value })} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════ MODALS ══════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {showModal === 'team' && 'Buat Tim Baru'}
                {showModal === 'add-member' && 'Tambah Anggota Tim'}
                {showModal === 'target-group' && 'Buat Target Group'}
                {showModal === 'target-assignment' && 'Assign Target ke FF'}
                {showModal === 'target-product' && 'Target per Produk'}
                {showModal === 'incentive-scheme' && 'Buat Skema Insentif'}
                {showModal === 'plafon' && 'Buat Plafon Baru'}
              </h3>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => handleCreate(e, showModal === 'add-member' ? 'member' : showModal === 'target-assignment' ? 'target-assignment' : showModal === 'target-product' ? 'target-product' : showModal)} className="p-5 space-y-4">

              {showModal === 'team' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 block mb-1">Kode Tim *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Nama Tim *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tipe Tim</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.team_type || ''} onChange={e => setForm({ ...form, team_type: e.target.value })}>
                      <option value="field_force">Field Force</option><option value="key_account">Key Account</option><option value="telesales">Telesales</option><option value="canvassing">Canvassing</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Max Anggota</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.max_members || ''} onChange={e => setForm({ ...form, max_members: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Territory</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.territory_id || ''} onChange={e => setForm({ ...form, territory_id: e.target.value || null })}>
                      <option value="">-- Pilih --</option>{territories.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Leader</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.leader_id || ''} onChange={e => setForm({ ...form, leader_id: Number(e.target.value) || null })}>
                      <option value="">-- Pilih --</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select></div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>}

              {showModal === 'add-member' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 block mb-1">User *</label>
                    <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.user_id || ''} onChange={e => setForm({ ...form, user_id: Number(e.target.value) })}>
                      <option value="">-- Pilih --</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Role</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.role || 'member'} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="member">Member</option><option value="leader">Leader</option><option value="supervisor">Supervisor</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Posisi</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Visit/hari</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.daily_visit_target || 8} onChange={e => setForm({ ...form, daily_visit_target: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Target Revenue/bulan (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.monthly_revenue_target || ''} onChange={e => setForm({ ...form, monthly_revenue_target: Number(e.target.value) })} /></div>
                </div>
              </>}

              {showModal === 'target-group' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 block mb-1">Kode *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Nama *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tipe</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.group_type || ''} onChange={e => setForm({ ...form, group_type: e.target.value })}>
                      <option value="general">General</option><option value="team">Per Tim</option><option value="territory">Per Territory</option><option value="product">Per Produk</option><option value="branch">Per Cabang</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Periode *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="01-12" value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tahun</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.year || ''} onChange={e => setForm({ ...form, year: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Total Target (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.total_target_value || ''} onChange={e => setForm({ ...form, total_target_value: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tim</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.team_id || ''} onChange={e => setForm({ ...form, team_id: e.target.value || null })}>
                      <option value="">-- Semua --</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Territory</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.territory_id || ''} onChange={e => setForm({ ...form, territory_id: e.target.value || null })}>
                      <option value="">-- Semua --</option>{territories.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select></div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>}

              {showModal === 'target-assignment' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Assigned To *</label>
                    <select required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: Number(e.target.value) })}>
                      <option value="">-- Pilih FF --</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Revenue (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.revenue_target || ''} onChange={e => setForm({ ...form, revenue_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Volume</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.volume_target || ''} onChange={e => setForm({ ...form, volume_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Visit</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.visit_target || ''} onChange={e => setForm({ ...form, visit_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target New Customer</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.new_customer_target || ''} onChange={e => setForm({ ...form, new_customer_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Effective Call</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effective_call_target || ''} onChange={e => setForm({ ...form, effective_call_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Collection (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.collection_target || ''} onChange={e => setForm({ ...form, collection_target: Number(e.target.value) })} /></div>
                </div>
              </>}

              {showModal === 'target-product' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">Nama Produk/Kategori *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.product_name || ''} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Kategori</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category_name || ''} onChange={e => setForm({ ...form, category_name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tipe</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.target_type || 'product'} onChange={e => setForm({ ...form, target_type: e.target.value })}>
                      <option value="product">Per Produk</option><option value="category">Per Kategori</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Assigned To</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: Number(e.target.value) || null })}>
                      <option value="">-- Semua FF --</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Prioritas</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Revenue (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.revenue_target || ''} onChange={e => setForm({ ...form, revenue_target: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Target Volume</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.volume_target || ''} onChange={e => setForm({ ...form, volume_target: Number(e.target.value) })} /></div>
                </div>
              </>}

              {showModal === 'incentive-scheme' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 block mb-1">Kode *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Nama *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Tipe Skema</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.scheme_type || ''} onChange={e => setForm({ ...form, scheme_type: e.target.value })}>
                      <option value="progressive">Progressive</option><option value="slab">Slab</option><option value="flat">Flat</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Base Amount (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.base_amount || ''} onChange={e => setForm({ ...form, base_amount: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Min Achievement (%)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.min_achievement_pct || ''} onChange={e => setForm({ ...form, min_achievement_pct: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Max Cap (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.max_cap || ''} onChange={e => setForm({ ...form, max_cap: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Over-ach Multiplier</label><input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overachievement_multiplier || ''} onChange={e => setForm({ ...form, overachievement_multiplier: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Effective From</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effective_from || ''} onChange={e => setForm({ ...form, effective_from: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_new_customer_bonus || false} onChange={e => setForm({ ...form, has_new_customer_bonus: e.target.checked })} /> Bonus New Customer</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_visit_bonus || false} onChange={e => setForm({ ...form, has_visit_bonus: e.target.checked })} /> Bonus Visit</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_collection_bonus || false} onChange={e => setForm({ ...form, has_collection_bonus: e.target.checked })} /> Bonus Collection</label>
                </div>
                {form.has_new_customer_bonus && <div><label className="text-xs text-gray-500 block mb-1">Bonus per New Customer (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.new_customer_bonus_amount || ''} onChange={e => setForm({ ...form, new_customer_bonus_amount: Number(e.target.value) })} /></div>}
                {form.has_visit_bonus && <div><label className="text-xs text-gray-500 block mb-1">Bonus per Visit (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.visit_bonus_amount || ''} onChange={e => setForm({ ...form, visit_bonus_amount: Number(e.target.value) })} /></div>}
                {form.has_collection_bonus && <div><label className="text-xs text-gray-500 block mb-1">Bonus Collection (%)</label><input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.collection_bonus_pct || ''} onChange={e => setForm({ ...form, collection_bonus_pct: Number(e.target.value) })} /></div>}
                <div><label className="text-xs text-gray-500 block mb-1">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>}

              {showModal === 'plafon' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 block mb-1">Tipe Plafon *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plafon_type || 'customer'} onChange={e => setForm({ ...form, plafon_type: e.target.value })}>
                      <option value="customer">Customer</option><option value="salesperson">Salesperson</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Nama *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Credit Limit (Rp) *</label><input required type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.credit_limit || ''} onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Payment Terms (hari)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.payment_terms || 30} onChange={e => setForm({ ...form, payment_terms: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Risk Level</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.risk_level || 'low'} onChange={e => setForm({ ...form, risk_level: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Max Overdue (hari)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.max_overdue_days || 0} onChange={e => setForm({ ...form, max_overdue_days: Number(e.target.value) })} /></div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Catatan</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
