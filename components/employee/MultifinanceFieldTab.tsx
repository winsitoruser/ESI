/**
 * Tab Lapangan Pembiayaan — mobile employee portal
 * Untuk: Kolektor, AO, Surveyor, Agen Lapangan
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Building2, MapPin, DollarSign, Target, Plus, RefreshCw, CheckCircle,
  AlertCircle, Loader2, Navigation, Phone, Car, Wallet, TrendingUp,
  Search, X, Save, ChevronRight, FileText, Clock, AlertTriangle,
} from 'lucide-react';
import {
  MF_ACTIVITY_TYPES, MF_VISIT_OUTCOMES, MF_PRODUCT_TYPES,
  getAgentTypeLabel, getActivityTypeLabel, getVisitOutcomeLabel,
  getProductTypeLabel,
} from '@/lib/hris/multifinance-types';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => today().slice(0, 7);

type SubTab = 'ringkasan' | 'portofolio' | 'aktivitas' | 'komisi';

interface Props {
  onNavigateHome?: () => void;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>{children}</div>;
}

function ProgressBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DpdBadge({ dpd }: { dpd: number }) {
  if (dpd <= 0) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Lancar</span>;
  if (dpd <= 30) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">DPD {dpd}</span>;
  if (dpd <= 90) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">DPD {dpd}</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">NPL {dpd}d</span>;
}

export default function MultifinanceFieldTab({ onNavigateHome }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('ringkasan');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [overview, setOverview] = useState<any>({});
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState<'all' | 'overdue' | 'npl'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<any>({
    activityDate: today(), activityType: 'collection', productType: 'motor',
    amountCollected: 0, visitOutcome: '', promiseDate: '', notes: '',
  });

  const mfApi = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const qs = extra ? `&${extra}` : '';
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api/employee/multifinance?action=${action}${qs}`, opts);
    return res.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pf = portfolioFilter === 'all' ? '' : `status=${portfolioFilter}`;
      const sq = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '';
      const portQs = [sq, pf].filter(Boolean).join('&');
      const [prof, ov, port, acts, comm] = await Promise.all([
        mfApi('profile'),
        mfApi('overview'),
        mfApi('portfolio', 'GET', undefined, portQs),
        mfApi('activities', 'GET', undefined, `date_from=${thisMonth()}-01&date_to=${today()}`),
        mfApi('commissions', 'GET', undefined, `period_month=${thisMonth()}`),
      ]);
      if (prof.success) setProfile(prof.data);
      if (ov.success) setOverview(ov.data || {});
      if (port.success) setPortfolio(port.data || []);
      if (acts.success) setActivities(acts.data || []);
      if (comm.success) setCommissions(comm.data || []);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [mfApi, searchQuery, portfolioFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const getGps = () => new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS tidak tersedia di perangkat ini'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error('Gagal mendapatkan lokasi GPS')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });

  const openActivityModal = (contract?: any) => {
    const agentType = profile?.agent?.agentType || profile?.employmentCategory || 'collector';
    const defaultActivity = agentType === 'surveyor' ? 'survey'
      : agentType === 'account_officer' ? 'prospect' : 'collection';
    setSelectedContract(contract || null);
    setForm({
      activityDate: today(),
      activityType: defaultActivity,
      productType: contract?.product_type || 'motor',
      customerName: contract?.customer_name || '',
      contractNumber: contract?.contract_number || '',
      installmentAmount: contract?.installment_amount || 0,
      amountCollected: contract?.installment_amount || 0,
      loanAmount: contract?.loan_amount || 0,
      dpdDays: contract?.dpd_days || 0,
      visitOutcome: '',
      promiseDate: '',
      notes: '',
      gpsLat: null,
      gpsLng: null,
      gpsAccuracy: null,
    });
    setMsg(null);
    setShowModal(true);
  };

  const captureGps = async () => {
    setGpsLoading(true);
    setMsg(null);
    try {
      const coords = await getGps();
      setForm((f: any) => ({ ...f, gpsLat: coords.lat, gpsLng: coords.lng, gpsAccuracy: coords.accuracy }));
      setMsg({ type: 'success', text: `GPS tercatat (±${Math.round(coords.accuracy)}m)` });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setGpsLoading(false);
    }
  };

  const submitActivity = async () => {
    if (!form.visitOutcome && form.activityType === 'collection') {
      setMsg({ type: 'error', text: 'Pilih hasil kunjungan penagihan' });
      return;
    }
    if (form.gpsLat == null) {
      setMsg({ type: 'error', text: 'Ambil lokasi GPS terlebih dahulu' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await mfApi('activity', 'POST', form);
      if (res.success) {
        setMsg({ type: 'success', text: res.message || 'Aktivitas tersimpan' });
        setTimeout(() => { setShowModal(false); loadData(); }, 1500);
      } else {
        setMsg({ type: 'error', text: res.error || 'Gagal menyimpan' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menyimpan aktivitas' });
    } finally {
      setSubmitting(false);
    }
  };

  const agentLabel = getAgentTypeLabel(profile?.agent?.agentType || profile?.employmentCategory);
  const collPct = overview.targetCollection > 0 ? Math.round((overview.monthlyCollection / overview.targetCollection) * 100) : 0;
  const visitPct = overview.targetVisits > 0 ? Math.round((overview.visitCount / overview.targetVisits) * 100) : 0;

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: TrendingUp },
    { id: 'portofolio', label: 'Portofolio', icon: FileText },
    { id: 'aktivitas', label: 'Aktivitas', icon: MapPin },
    { id: 'komisi', label: 'Komisi', icon: DollarSign },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Agent header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 opacity-80" />
              <span className="text-[11px] font-medium opacity-80">Tim Lapangan Pembiayaan</span>
            </div>
            <h2 className="text-lg font-bold">{profile?.employeeName || profile?.agent?.agentCode || 'Agen Lapangan'}</h2>
            <p className="text-xs text-indigo-200 mt-0.5">{agentLabel}{profile?.agent?.territory ? ` · ${profile.agent.territory}` : ''}</p>
          </div>
          <button onClick={loadData} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {profile?.agent?.agentCode && (
          <span className="inline-block mt-2 text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded">{profile.agent.agentCode}</span>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
              ${subTab === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Ringkasan */}
      {subTab === 'ringkasan' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Koleksi Hari Ini', value: fmtCur(overview.todayCollection), icon: Wallet, color: 'text-emerald-600' },
              { label: 'Aktivitas Hari Ini', value: overview.todayActivities || 0, icon: MapPin, color: 'text-blue-600' },
              { label: 'Tunggu Verifikasi', value: overview.pendingVerification || 0, icon: Clock, color: 'text-amber-600' },
              { label: 'Komisi Pending', value: fmtCur(overview.pendingCommission), icon: DollarSign, color: 'text-violet-600' },
            ].map((s) => (
              <Card key={s.label} className="p-3">
                <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
                <p className="text-lg font-bold text-slate-900">{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Kinerja vs Target Bulan Ini</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Koleksi</span>
                  <span className="font-semibold text-slate-700">{fmtCur(overview.monthlyCollection)} / {fmtCur(overview.targetCollection)}</span>
                </div>
                <ProgressBar value={overview.monthlyCollection || 0} max={overview.targetCollection || 1} color="bg-emerald-500" />
                <p className="text-[10px] text-slate-400 mt-0.5">{collPct}% tercapai</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Kunjungan</span>
                  <span className="font-semibold text-slate-700">{overview.visitCount || 0} / {overview.targetVisits || 20}</span>
                </div>
                <ProgressBar value={overview.visitCount || 0} max={overview.targetVisits || 20} color="bg-blue-500" />
                <p className="text-[10px] text-slate-400 mt-0.5">{visitPct}% tercapai</p>
              </div>
              {(profile?.agent?.agentType === 'account_officer' || profile?.employmentCategory === 'account_officer') && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Pencairan</span>
                    <span className="font-semibold text-slate-700">{fmtCur(overview.monthlyDisbursement)} / {fmtCur(overview.targetDisbursement)}</span>
                  </div>
                  <ProgressBar value={overview.monthlyDisbursement || 0} max={overview.targetDisbursement || 1} color="bg-violet-500" />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Portofolio Kredit
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-xl font-bold text-slate-800">{overview.portfolioTotal || portfolio.length}</p>
                <p className="text-[10px] text-slate-500">Total</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2.5">
                <p className="text-xl font-bold text-amber-700">{overview.portfolioOverdue || 0}</p>
                <p className="text-[10px] text-amber-600">Tunggakan</p>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5">
                <p className="text-xl font-bold text-red-700">{overview.portfolioNpl || 0}</p>
                <p className="text-[10px] text-red-600">NPL</p>
              </div>
            </div>
          </Card>

          <button onClick={() => openActivityModal()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-indigo-600/25 active:scale-[0.98]">
            <Plus className="w-5 h-5" /> Catat Aktivitas Lapangan
          </button>
        </div>
      )}

      {/* Portofolio */}
      {subTab === 'portofolio' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kontrak / nasabah..."
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-1.5">
            {(['all', 'overdue', 'npl'] as const).map((f) => (
              <button key={f} onClick={() => setPortfolioFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${portfolioFilter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {f === 'all' ? 'Semua' : f === 'overdue' ? 'Tunggakan' : 'NPL'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : portfolio.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Tidak ada kontrak ditemukan</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {portfolio.map((c) => (
                <Card key={c.id} className="p-3.5 active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{c.customer_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.contract_number}</p>
                    </div>
                    <DpdBadge dpd={c.dpd_days || 0} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1"><Car className="w-3 h-3" />{getProductTypeLabel(c.product_type)}</span>
                    <span>Angsuran: <b className="text-slate-700">{fmtCur(parseFloat(c.installment_amount))}</b></span>
                  </div>
                  {c.customer_phone && (
                    <a href={`tel:${c.customer_phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 mb-2">
                      <Phone className="w-3 h-3" /> {c.customer_phone}
                    </a>
                  )}
                  {c.customer_address && (
                    <p className="text-[11px] text-slate-500 truncate mb-2">{c.customer_address}</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button onClick={() => openActivityModal(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold active:scale-95">
                      <Navigation className="w-3.5 h-3.5" /> Kunjungi & Tagih
                    </button>
                    {c.gps_lat && c.gps_lng && (
                      <a href={`https://www.google.com/maps?q=${c.gps_lat},${c.gps_lng}`} target="_blank" rel="noreferrer"
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aktivitas */}
      {subTab === 'aktivitas' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">{activities.length} aktivitas bulan ini</p>
            <button onClick={() => openActivityModal()} className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Baru
            </button>
          </div>
          {activities.length === 0 ? (
            <Card className="p-8 text-center">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Belum ada aktivitas</p>
              <button onClick={() => openActivityModal()} className="mt-3 text-indigo-600 text-xs font-semibold">+ Catat sekarang</button>
            </Card>
          ) : (
            activities.map((a) => (
              <Card key={a.id} className="p-3.5">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{a.customer_name || '—'}</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(a.activity_date)} · {getActivityTypeLabel(a.activity_type)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    a.status === 'verified' ? 'bg-blue-100 text-blue-700'
                      : a.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>{a.status}</span>
                </div>
                {a.visit_outcome && <p className="text-xs text-slate-600">{getVisitOutcomeLabel(a.visit_outcome)}</p>}
                {parseFloat(a.amount_collected) > 0 && (
                  <p className="text-sm font-bold text-emerald-600 mt-1">{fmtCur(parseFloat(a.amount_collected))}</p>
                )}
                {a.gps_lat && (
                  <a href={`https://www.google.com/maps?q=${a.gps_lat},${a.gps_lng}`} target="_blank" rel="noreferrer"
                    className="text-[10px] text-blue-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> Lihat lokasi GPS
                  </a>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Komisi */}
      {subTab === 'komisi' && (
        <div className="space-y-3">
          <Card className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-100">
            <p className="text-xs text-violet-600 mb-1">Total Komisi Pending — {thisMonth()}</p>
            <p className="text-2xl font-bold text-violet-800">{fmtCur(overview.pendingCommission)}</p>
            <p className="text-[10px] text-violet-500 mt-1">Disetujui HR → masuk payroll bulan berjalan</p>
          </Card>
          {commissions.length === 0 ? (
            <Card className="p-6 text-center text-sm text-slate-500">Belum ada komisi — verifikasi aktivitas oleh HR</Card>
          ) : (
            commissions.map((c) => (
              <Card key={c.id} className="p-3.5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-900">{getActivityTypeLabel(c.commission_type)}</p>
                  <p className="text-[10px] text-slate-400">{c.period_month}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{fmtCur(parseFloat(c.commission_amount))}</p>
                  <span className={`text-[10px] font-semibold ${c.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>{c.status}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Activity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={() => !submitting && setShowModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Catat Aktivitas Lapangan</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              {selectedContract && (
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-800">{selectedContract.customer_name}</p>
                  <p className="text-[10px] text-indigo-600 font-mono">{selectedContract.contract_number}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Jenis Aktivitas</label>
                  <select value={form.activityType} onChange={(e) => setForm((f: any) => ({ ...f, activityType: e.target.value }))}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                    {MF_ACTIVITY_TYPES.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Produk</label>
                  <select value={form.productType} onChange={(e) => setForm((f: any) => ({ ...f, productType: e.target.value }))}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                    {MF_PRODUCT_TYPES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {!selectedContract && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Nama Nasabah</label>
                    <input value={form.customerName || ''} onChange={(e) => setForm((f: any) => ({ ...f, customerName: e.target.value }))}
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" placeholder="Nama debitur" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">No. Kontrak</label>
                    <input value={form.contractNumber || ''} onChange={(e) => setForm((f: any) => ({ ...f, contractNumber: e.target.value }))}
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" placeholder="MF-2024-xxxxx" />
                  </div>
                </>
              )}

              {(form.activityType === 'collection' || form.activityType === 'recovery') && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Hasil Kunjungan *</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {MF_VISIT_OUTCOMES.map((o) => (
                        <button key={o.code} type="button"
                          onClick={() => setForm((f: any) => ({ ...f, visitOutcome: o.code }))}
                          className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition-all
                            ${form.visitOutcome === o.code ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Jumlah Tertagih (Rp)</label>
                    <input type="number" value={form.amountCollected || ''} onChange={(e) => setForm((f: any) => ({ ...f, amountCollected: +e.target.value }))}
                      className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  {form.visitOutcome === 'promise_to_pay' && (
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Janji Bayar (Tanggal)</label>
                      <input type="date" value={form.promiseDate || ''} onChange={(e) => setForm((f: any) => ({ ...f, promiseDate: e.target.value }))}
                        className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
                    </div>
                  )}
                </>
              )}

              {form.activityType === 'disbursement' && (
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Nilai Pencairan (Rp)</label>
                  <input type="number" value={form.loanAmount || ''} onChange={(e) => setForm((f: any) => ({ ...f, loanAmount: +e.target.value }))}
                    className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
                </div>
              )}

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Catatan</label>
                <textarea value={form.notes || ''} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full mt-1 border rounded-xl px-3 py-2 text-sm resize-none" placeholder="Kondisi lapangan, kendala, dll." />
              </div>

              {/* GPS */}
              <div className={`rounded-xl p-3 border ${form.gpsLat != null ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className={`w-4 h-4 ${form.gpsLat != null ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Lokasi GPS *</p>
                      {form.gpsLat != null ? (
                        <p className="text-[10px] text-emerald-600">{form.gpsLat.toFixed(5)}, {form.gpsLng?.toFixed(5)} (±{Math.round(form.gpsAccuracy || 0)}m)</p>
                      ) : (
                        <p className="text-[10px] text-slate-400">Wajib untuk verifikasi kunjungan</p>
                      )}
                    </div>
                  </div>
                  <button onClick={captureGps} disabled={gpsLoading}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ambil GPS'}
                  </button>
                </div>
              </div>

              {msg && (
                <div className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {msg.text}
                </div>
              )}

              <button onClick={submitActivity} disabled={submitting || gpsLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98]">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Kirim Aktivitas</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
