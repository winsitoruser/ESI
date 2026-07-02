import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { Megaphone, Search, Plus, Eye, Edit, Trash2, X, Check, Users, Star, TrendingUp, Target, BarChart3, FileText, Loader2, DollarSign, Calendar, Tag, Layers, Image, PieChart, CheckCircle2, XCircle, Filter, RefreshCw, Zap, Gift, Percent, ShoppingBag } from 'lucide-react';
import { rowsOr, MOCK_HQ_CAMPAIGNS, MOCK_HQ_PROMOTIONS, MOCK_HQ_SEGMENTS, MOCK_HQ_MKT_BUDGETS } from '@/lib/hq/mock-data';

type TabKey = 'dashboard' | 'campaigns' | 'promotions' | 'segments' | 'budgets';

const CAMP_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Selesai', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

const PROMO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-600' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
};

const OBJ_LABELS: Record<string, string> = { brand_awareness: 'Brand Awareness', sales: 'Penjualan', customer_acquisition: 'Akuisisi Pelanggan', retention: 'Retensi', engagement: 'Engagement' };

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtNum = (n: number) => (n || 0).toLocaleString('id-ID');

export default function MarketingPage() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>(MOCK_HQ_CAMPAIGNS);
  const [promotions, setPromotions] = useState<any[]>(MOCK_HQ_PROMOTIONS);
  const [segments, setSegments] = useState<any[]>(MOCK_HQ_SEGMENTS);
  const [budgets, setBudgets] = useState<any[]>(MOCK_HQ_MKT_BUDGETS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = async (action: string, method = 'GET', body?: any) => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api/hq/marketing?action=${action}`, opts);
    return res.json();
  };

  const fetchDashboard = useCallback(async () => { try { const r = await api('dashboard'); if (r.data) setDashboard(r.data); } catch (e) {} }, []);
  const fetchCampaigns = useCallback(async () => { try { const r = await api('campaigns'); if (r.data) setCampaigns(rowsOr(Array.isArray(r.data) ? r.data : [], MOCK_HQ_CAMPAIGNS)); } catch (e) {} }, []);
  const fetchPromotions = useCallback(async () => { try { const r = await api('promotions'); if (r.data) setPromotions(rowsOr(Array.isArray(r.data) ? r.data : [], MOCK_HQ_PROMOTIONS)); } catch (e) {} }, []);
  const fetchSegments = useCallback(async () => { try { const r = await api('segments'); if (r.data) setSegments(rowsOr(Array.isArray(r.data) ? r.data : [], MOCK_HQ_SEGMENTS)); } catch (e) {} }, []);
  const fetchBudgets = useCallback(async () => { try { const r = await api('budgets'); if (r.data) setBudgets(rowsOr(Array.isArray(r.data) ? r.data : [], MOCK_HQ_MKT_BUDGETS)); } catch (e) {} }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchCampaigns(), fetchPromotions(), fetchSegments(), fetchBudgets()])
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent, type: string) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await api(`create-${type}`, 'POST', form);
      if (r.success) {
        showToast(`${type === 'campaign' ? 'Campaign' : type === 'promotion' ? 'Promosi' : type === 'segment' ? 'Segment' : 'Budget'} berhasil dibuat`);
        setShowModal(null); setForm({});
        fetchDashboard(); fetchCampaigns(); fetchPromotions(); fetchSegments(); fetchBudgets();
      } else showToast(r.error || 'Gagal', 'error');
    } catch { showToast('Error', 'error'); }
    setSaving(false);
  }

  async function handleDelete(type: string, id: string) {
    if (!confirm('Hapus item ini?')) return;
    try {
      const r = await api(`delete-${type}&id=${id}`, 'DELETE');
      if (r.success) { showToast('Berhasil dihapus'); fetchDashboard(); fetchCampaigns(); fetchPromotions(); fetchSegments(); fetchBudgets(); setSelectedItem(null); }
    } catch { showToast('Error', 'error'); }
  }

  async function handleUpdateStatus(type: string, id: string, status: string) {
    try {
      const r = await api(`update-${type}`, 'PUT', { id, status });
      if (r.success) { showToast(`Status: ${status}`); fetchCampaigns(); fetchPromotions(); fetchDashboard(); }
    } catch { showToast('Error', 'error'); }
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const filteredPromotions = promotions.filter(p => {
    if (search && !(p.name || '').toLowerCase().includes(search.toLowerCase()) && !(p.promo_code || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'campaigns', label: 'Campaign', icon: Megaphone },
    { key: 'promotions', label: 'Promosi', icon: Gift },
    { key: 'segments', label: 'Segmentasi', icon: Users },
    { key: 'budgets', label: 'Budget', icon: DollarSign },
  ];

  return (
    <HQLayout title="Marketing & Campaign" subtitle="Kelola campaign, promosi, segmentasi & budget marketing">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterStatus(''); setSelectedItem(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white shadow text-pink-700' : 'text-gray-600 hover:text-gray-800'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-pink-600" /><span className="ml-3 text-gray-500">Memuat data...</span></div>
      ) : (
        <>
          {/* ═══════════ DASHBOARD ═══════════ */}
          {tab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Campaign Aktif', value: dashboard.summary?.activeCampaigns || 0, icon: Megaphone, color: 'text-pink-600 bg-pink-50' },
                  { label: 'Total Reach', value: fmtNum(dashboard.summary?.totalReach), icon: Users, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Conversions', value: fmtNum(dashboard.summary?.totalConversions), icon: Target, color: 'text-green-600 bg-green-50' },
                  { label: 'Avg ROI', value: `${(dashboard.summary?.avgRoi || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
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

              {/* Budget Overview */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Budget Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total Budget</span><span className="font-bold">{fmtCur(dashboard.summary?.totalBudget)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Terpakai</span><span className="font-bold text-red-600">{fmtCur(dashboard.summary?.totalSpent)}</span></div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${dashboard.summary?.totalBudget > 0 ? Math.min(100, (dashboard.summary.totalSpent / dashboard.summary.totalBudget) * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Top Promosi Aktif</h3>
                  <div className="space-y-2">
                    {(dashboard.topPromos || []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.promo_code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-pink-600">{p.usage_count}x</div>
                          <div className="text-xs text-gray-400">digunakan</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Campaigns */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Campaign Aktif</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Campaign</th><th className="pb-2">Objective</th><th className="pb-2">Reach</th><th className="pb-2">Conv.</th><th className="pb-2 text-right">Budget</th><th className="pb-2 text-right">Spent</th></tr></thead>
                    <tbody>
                      {(dashboard.activeCampaigns || []).map((c: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-pink-50/50 cursor-pointer" onClick={() => { setTab('campaigns'); setSelectedItem(c); }}>
                          <td className="py-2 font-medium">{c.name}</td>
                          <td className="py-2 text-gray-600 text-xs">{OBJ_LABELS[c.objective] || c.objective}</td>
                          <td className="py-2">{fmtNum(c.actual_reach)} / {fmtNum(c.target_reach)}</td>
                          <td className="py-2">{fmtNum(c.actual_conversions)}</td>
                          <td className="py-2 text-right">{fmtCur(parseFloat(c.budget))}</td>
                          <td className="py-2 text-right text-red-600">{fmtCur(parseFloat(c.spent))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Segment Stats */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Customer Segments</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {segments.map((s, i) => (
                    <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{fmtNum(s.customer_count)}</div>
                      <div className="text-xs text-gray-500">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.segment_type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ CAMPAIGNS ═══════════ */}
          {tab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2 items-center flex-1 min-w-[200px]">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Cari campaign..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Semua Status</option>
                    {Object.entries(CAMP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <button onClick={() => { setShowModal('campaign'); setForm({ objective: 'brand_awareness', campaign_type: 'multi_channel' }); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-pink-700"><Plus className="w-4 h-4" /> Buat Campaign</button>
              </div>

              {selectedItem ? (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
                      <p className="text-sm text-gray-500">{selectedItem.campaign_number} | {OBJ_LABELS[selectedItem.objective] || selectedItem.objective}</p>
                    </div>
                    <div className="flex gap-2">
                      <select className="text-sm border rounded-lg px-3 py-1.5" value={selectedItem.status} onChange={e => { handleUpdateStatus('campaign', selectedItem.id, e.target.value); setSelectedItem({ ...selectedItem, status: e.target.value }); }}>
                        {Object.entries(CAMP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={() => handleDelete('campaign', selectedItem.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4" /></button>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 p-2"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  {selectedItem.description && <p className="text-sm text-gray-600 mb-4">{selectedItem.description}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Budget</div><div className="font-bold">{fmtCur(parseFloat(selectedItem.budget))}</div></div>
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Spent</div><div className="font-bold text-red-600">{fmtCur(parseFloat(selectedItem.spent))}</div></div>
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Reach</div><div className="font-bold">{fmtNum(selectedItem.actual_reach)} / {fmtNum(selectedItem.target_reach)}</div></div>
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Conversions</div><div className="font-bold">{fmtNum(selectedItem.actual_conversions)} / {fmtNum(selectedItem.target_conversions)}</div></div>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Mulai: {fmtDate(selectedItem.start_date)}</span>
                    <span>Selesai: {fmtDate(selectedItem.end_date)}</span>
                    {parseFloat(selectedItem.roi) > 0 && <span className="text-green-600 font-medium">ROI: {parseFloat(selectedItem.roi).toFixed(1)}%</span>}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredCampaigns.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Belum ada campaign</div>
                  ) : filteredCampaigns.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer" onClick={() => setSelectedItem(c)}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{c.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${CAMP_STATUS[c.status]?.color || ''}`}>{CAMP_STATUS[c.status]?.label || c.status}</span>
                            <span className="text-xs text-gray-400">{OBJ_LABELS[c.objective] || c.objective}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{fmtCur(parseFloat(c.budget))}</div>
                          <div className="text-xs text-gray-400">Budget</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><div className="text-sm font-bold text-blue-600">{fmtNum(c.actual_reach)}</div><div className="text-xs text-gray-400">Reach</div></div>
                        <div><div className="text-sm font-bold text-green-600">{fmtNum(c.actual_conversions)}</div><div className="text-xs text-gray-400">Conversions</div></div>
                        <div><div className="text-sm font-bold text-purple-600">{parseFloat(c.roi || 0).toFixed(1)}%</div><div className="text-xs text-gray-400">ROI</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ PROMOTIONS ═══════════ */}
          {tab === 'promotions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2 items-center flex-1 min-w-[200px]">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Cari promosi..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select className="border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Semua Status</option>
                    {Object.entries(PROMO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <button onClick={() => { setShowModal('promotion'); setForm({ promo_type: 'discount', discount_type: 'percentage' }); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-pink-700"><Plus className="w-4 h-4" /> Buat Promosi</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {filteredPromotions.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-xl border p-8 text-center text-gray-400">Belum ada promosi</div>
                ) : filteredPromotions.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.promo_type === 'bogo' ? 'bg-purple-100 text-purple-600' : p.promo_type === 'voucher' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                          {p.promo_type === 'bogo' ? <ShoppingBag className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{p.name}</h4>
                          <div className="flex gap-2 items-center mt-0.5">
                            {p.promo_code && <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{p.promo_code}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${PROMO_STATUS[p.status]?.color || ''}`}>{PROMO_STATUS[p.status]?.label || p.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateStatus('promotion', p.id, p.status === 'active' ? 'paused' : 'active')} className="text-gray-400 hover:text-gray-600 p-1">
                          {p.status === 'active' ? <XCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete('promotion', p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                      <div><div className="text-sm font-bold text-pink-600">{p.discount_type === 'percentage' ? `${p.discount_value}%` : fmtCur(parseFloat(p.discount_value))}</div><div className="text-xs text-gray-400">Diskon</div></div>
                      <div><div className="text-sm font-bold">{p.usage_count || 0}</div><div className="text-xs text-gray-400">Digunakan</div></div>
                      <div><div className="text-sm font-bold">{p.usage_limit > 0 ? p.usage_limit : '∞'}</div><div className="text-xs text-gray-400">Kuota</div></div>
                    </div>
                    {p.min_purchase > 0 && <div className="text-xs text-gray-400 mt-2">Min. pembelian: {fmtCur(parseFloat(p.min_purchase))}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ SEGMENTS ═══════════ */}
          {tab === 'segments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Customer Segments</h3>
                <button onClick={() => { setShowModal('segment'); setForm({ segment_type: 'static' }); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-pink-700"><Plus className="w-4 h-4" /> Buat Segment</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {segments.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{s.name}</h4>
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{s.code}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.segment_type === 'dynamic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{s.segment_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{s.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold text-pink-600">{fmtNum(s.customer_count)}</div>
                      <span className="text-xs text-gray-400">pelanggan</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ BUDGETS ═══════════ */}
          {tab === 'budgets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Marketing Budget</h3>
                <button onClick={() => { setShowModal('budget'); setForm({ period_type: 'monthly', period: new Date().toISOString().slice(0, 7) }); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-pink-700"><Plus className="w-4 h-4" /> Buat Budget</button>
              </div>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-600 text-left"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3 text-right">Total Budget</th><th className="px-4 py-3 text-right">Terpakai</th><th className="px-4 py-3 text-right">Sisa</th><th className="px-4 py-3">Progress</th></tr></thead>
                  <tbody>
                    {budgets.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada budget</td></tr>
                    ) : budgets.map(b => {
                      const pct = parseFloat(b.total_budget) > 0 ? (parseFloat(b.spent) / parseFloat(b.total_budget)) * 100 : 0;
                      return (
                        <tr key={b.id} className="border-t hover:bg-pink-50/50">
                          <td className="px-4 py-3 font-medium">{b.name}</td>
                          <td className="px-4 py-3 text-gray-600">{b.period}</td>
                          <td className="px-4 py-3 text-right font-medium">{fmtCur(parseFloat(b.total_budget))}</td>
                          <td className="px-4 py-3 text-right text-red-600">{fmtCur(parseFloat(b.spent))}</td>
                          <td className="px-4 py-3 text-right text-green-600">{fmtCur(parseFloat(b.remaining))}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                              <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ MODALS ═══════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {showModal === 'campaign' && 'Buat Campaign Baru'}
                {showModal === 'promotion' && 'Buat Promosi Baru'}
                {showModal === 'segment' && 'Buat Segment Baru'}
                {showModal === 'budget' && 'Buat Budget Baru'}
              </h3>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => handleCreate(e, showModal)} className="p-5 space-y-4">

              {showModal === 'campaign' && <>
                <div><label className="text-xs text-gray-500 mb-1 block">Nama Campaign *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Objective</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.objective || ''} onChange={e => setForm({ ...form, objective: e.target.value })}>
                      {Object.entries(OBJ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipe</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.campaign_type || ''} onChange={e => setForm({ ...form, campaign_type: e.target.value })}>
                      <option value="multi_channel">Multi Channel</option><option value="digital">Digital</option><option value="promotional">Promotional</option><option value="loyalty">Loyalty</option><option value="event">Event</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tanggal Mulai</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tanggal Selesai</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Budget (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.budget || ''} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Target Reach</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.target_reach || ''} onChange={e => setForm({ ...form, target_reach: Number(e.target.value) })} /></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>}

              {showModal === 'promotion' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Nama Promosi *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Kode Promo</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.promo_code || ''} onChange={e => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipe Promo *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.promo_type || 'discount'} onChange={e => setForm({ ...form, promo_type: e.target.value })}>
                      <option value="discount">Discount</option><option value="bogo">Buy 1 Get 1</option><option value="voucher">Voucher</option><option value="cashback">Cashback</option><option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipe Diskon</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.discount_type || 'percentage'} onChange={e => setForm({ ...form, discount_type: e.target.value })}>
                      <option value="percentage">Persentase (%)</option><option value="amount">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Nilai Diskon</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.discount_value || ''} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Min. Pembelian (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.min_purchase || ''} onChange={e => setForm({ ...form, min_purchase: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Max Diskon (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.max_discount || ''} onChange={e => setForm({ ...form, max_discount: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Kuota Penggunaan</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0 = unlimited" value={form.usage_limit || ''} onChange={e => setForm({ ...form, usage_limit: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tanggal Mulai</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tanggal Selesai</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
              </>}

              {showModal === 'segment' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Kode Segment *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Nama Segment *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Tipe</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.segment_type || 'static'} onChange={e => setForm({ ...form, segment_type: e.target.value })}>
                      <option value="static">Static</option><option value="dynamic">Dynamic</option>
                    </select>
                  </div>
                </div>
              </>}

              {showModal === 'budget' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Nama Budget *</label><input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Periode</label><input required type="month" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Total Budget (Rp)</label><input required type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.total_budget || ''} onChange={e => setForm({ ...form, total_budget: Number(e.target.value) })} /></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Catatan</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={saving} className="bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2">
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
