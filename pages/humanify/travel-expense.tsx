import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
import HRStatCard from '@/components/humanify/HRStatCard';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import EmployeePicker from '@/components/humanify/EmployeePicker';
import TravelItineraryEditor, { TravelItinerarySummary } from '@/components/humanify/TravelItineraryEditor';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import { emptyStop, itineraryBudget, parseTravelPlan, type ItineraryStop, type TravelTripType } from '@/lib/hris/travel-itinerary';
import { fmtIdr, travelCsv, travelPrintHtml } from '@/lib/hris/travel-document';
import { useTranslation } from '@/lib/i18n';
import { Plane, Receipt, Wallet, Plus, Trash2, X, Check, Eye, Calendar, MapPin, Download, Printer, Mail, Loader2 } from 'lucide-react';

interface TravelReq {
  id: string;
  employee_id: string;
  request_number: string;
  destination: string;
  departure_city: string;
  purpose: string;
  departure_date: string;
  return_date: string;
  travel_type: string;
  trip_type?: string;
  transportation: string;
  accommodation_needed: boolean;
  estimated_budget: number;
  actual_cost: number;
  advance_amount: number;
  status: string;
  itinerary: any;
  notes: string;
}
interface TravelExp {
  id: string;
  travel_request_id: string;
  employee_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  itinerary_stop_id?: string;
  status: string;
}
interface Budget {
  id: string;
  category: string;
  fiscal_year: number;
  monthly_limit: number;
  annual_limit: number;
  used_amount: number;
  remaining_amount: number;
  is_active: boolean;
}

type TabKey = 'requests' | 'expenses' | 'budgets';

const MOCK_ITIN = {
  tripType: 'multi_city' as TravelTripType,
  originCity: 'Jakarta',
  stops: [
    emptyStop(1, {
      city: 'Surabaya',
      arriveDate: '2026-03-18',
      departDate: '2026-03-20',
      activity: 'Audit cabang',
      costs: [
        { id: 'c1', category: 'ticket', label: 'Tiket pesawat', estimated: 2_200_000 },
        { id: 'c2', category: 'hotel', label: 'Hotel 2 malam', estimated: 1_600_000 },
        { id: 'c3', category: 'meal', label: 'Meal', estimated: 700_000 },
      ],
    }),
    emptyStop(2, {
      city: 'Bali',
      arriveDate: '2026-03-20',
      departDate: '2026-03-22',
      activity: 'Meeting supplier',
      costs: [
        { id: 'c4', category: 'ticket', label: 'Tiket domestik', estimated: 1_100_000 },
        { id: 'c5', category: 'hotel', label: 'Hotel 2 malam', estimated: 2_400_000 },
      ],
    }),
  ],
};

const MOCK_TE_OVERVIEW = { totalRequests: 24, pendingApproval: 3, totalExpenses: 12, totalExpenseAmount: 185000000 };
const MOCK_TE_REQUESTS: TravelReq[] = [
  {
    id: 'tr1', employee_id: '1', request_number: 'TRV-2026-024',
    destination: 'Jakarta → Surabaya → Bali → Jakarta', departure_city: 'Jakarta',
    purpose: 'Visit cabang dan meeting supplier', departure_date: '2026-03-18', return_date: '2026-03-22',
    travel_type: 'domestic', trip_type: 'multi_city', transportation: 'flight', accommodation_needed: true,
    estimated_budget: itineraryBudget(MOCK_ITIN.stops), actual_cost: 0, advance_amount: 5000000,
    status: 'approved', itinerary: MOCK_ITIN, notes: '',
  },
  {
    id: 'tr2', employee_id: '5', request_number: 'TRV-2026-023',
    destination: 'Jakarta → Bandung', departure_city: 'Jakarta',
    purpose: 'Training cabang baru', departure_date: '2026-03-10', return_date: '2026-03-12',
    travel_type: 'domestic', trip_type: 'single', transportation: 'train', accommodation_needed: true,
    estimated_budget: 4500000, actual_cost: 4200000, advance_amount: 3000000,
    status: 'completed', itinerary: { tripType: 'single', originCity: 'Jakarta', stops: [emptyStop(1, { city: 'Bandung', arriveDate: '2026-03-10', departDate: '2026-03-12' })] }, notes: '',
  },
];
const MOCK_TE_EXPENSES: TravelExp[] = [
  { id: 'te1', travel_request_id: 'tr2', employee_id: '5', expense_date: '2026-03-10', category: 'transportation', description: 'Tiket KA Argo Parahyangan PP', amount: 600000, status: 'reimbursed' },
  { id: 'te2', travel_request_id: 'tr2', employee_id: '5', expense_date: '2026-03-10', category: 'accommodation', description: 'Hotel 2 malam', amount: 1600000, status: 'reimbursed' },
];
const MOCK_TE_BUDGETS: Budget[] = [
  { id: 'tb1', category: 'travel', fiscal_year: 2026, monthly_limit: 50000000, annual_limit: 600000000, used_amount: 185000000, remaining_amount: 415000000, is_active: true },
];

function blankReqForm() {
  return {
    employeeId: '',
    departureCity: 'Jakarta',
    purpose: '',
    travelType: 'domestic' as string,
    tripType: 'single' as TravelTripType,
    advanceAmount: 0,
    notes: '',
    stops: [emptyStop(1)],
  };
}

export default function TravelExpensePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('requests');
  const [overview, setOverview] = useState<any>({});
  const [requests, setRequests] = useState<TravelReq[]>([]);
  const [expenses, setExpenses] = useState<TravelExp[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [detailReq, setDetailReq] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [emailing, setEmailing] = useState(false);

  const [reqForm, setReqForm] = useState(blankReqForm());
  const [expForm, setExpForm] = useState({ travelRequestId: '', employeeId: '', expenseDate: '', category: 'transportation', description: '', amount: 0, itineraryStopId: '' });
  const [budgetForm, setBudgetForm] = useState({ category: 'travel', fiscalYear: new Date().getFullYear(), monthlyLimit: 0, annualLimit: 0 });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmtCur = (n: number) => fmtIdr(n);

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/travel-expense?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, rq, ex, bg] = await Promise.all([
        api('overview'), api('requests'), api('expenses'), api('budgets'),
      ]);
      setOverview(ov.data || {});
      setRequests(rq.data || []);
      setExpenses(ex.data || []);
      setBudgets(bg.data || []);
      const hasLive = (rq.data?.length || 0) + (ex.data?.length || 0) > 0;
      setDataSource(hasLive ? 'live' : 'empty');
    } catch (e) {
      console.error(e);
      if (USE_MOCK_UI) {
        setOverview(MOCK_TE_OVERVIEW);
        setRequests(MOCK_TE_REQUESTS);
        setExpenses(MOCK_TE_EXPENSES);
        setBudgets(MOCK_TE_BUDGETS);
        setDataSource('demo');
      } else {
        setOverview({});
        setRequests([]);
        setExpenses([]);
        setBudgets([]);
        setDataSource('empty');
      }
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!detailReq) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailReq(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailReq]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'request') setReqForm(blankReqForm());
    if (type === 'expense') setExpForm({ travelRequestId: '', employeeId: '', expenseDate: new Date().toISOString().split('T')[0], category: 'transportation', description: '', amount: 0, itineraryStopId: '' });
    if (type === 'budget') setBudgetForm({ category: 'travel', fiscalYear: new Date().getFullYear(), monthlyLimit: 0, annualLimit: 0 });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'request') {
        if (!reqForm.employeeId || !reqForm.purpose || !reqForm.stops.some((s) => s.city)) {
          showToast('Lengkapi karyawan, tujuan, dan kota itinerary', 'error');
          return;
        }
        if (!reqForm.stops.every((s) => s.arriveDate && s.departDate)) {
          showToast('Isi tanggal tiba dan selesai di setiap kota', 'error');
          return;
        }
        const payload = {
          employeeId: reqForm.employeeId,
          departureCity: reqForm.departureCity,
          purpose: reqForm.purpose,
          travelType: reqForm.travelType,
          tripType: reqForm.tripType,
          transportation: reqForm.stops[0]?.transportMode || 'flight',
          advanceAmount: reqForm.advanceAmount,
          notes: reqForm.notes,
          itinerary: { tripType: reqForm.tripType, originCity: reqForm.departureCity, stops: reqForm.stops },
          status: 'pending',
        };
        if (editingItem) await api('request', 'PUT', payload, `&id=${editingItem.id}`);
        else await api('request', 'POST', payload);
      } else if (modalType === 'expense') {
        if (!expForm.travelRequestId || !expForm.employeeId || !expForm.amount) {
          showToast('Lengkapi perjalanan, karyawan, dan jumlah', 'error');
          return;
        }
        await api('expense', 'POST', expForm);
      } else if (modalType === 'budget') {
        if (editingItem) await api('budget', 'PUT', budgetForm, `&id=${editingItem.id}`);
        else await api('budget', 'POST', budgetForm);
      }
      showToast(editingItem ? 'Diperbarui' : 'Dibuat');
      setShowModal(false); loadData();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus'); loadData();
  };

  const openDetail = async (row: TravelReq) => {
    const localExp = expenses.filter((e) => String(e.travel_request_id) === String(row.id));
    setDetailReq({
      request: row,
      expenses: localExp,
      totalExpenses: localExp.reduce((s, e) => s + Number(e.amount || 0), 0),
      employee: null,
    });
    setEmailTo('');
    setEmailNote('');
    setDetailLoading(true);
    try {
      const res = await api('request-detail', 'GET', null, `&id=${encodeURIComponent(row.id)}`);
      if (res?.success && res.data?.request) {
        setDetailReq(res.data);
        if (res.data.employee?.email) setEmailTo(res.data.employee.email);
      } else {
        showToast(res?.error || 'Detail server tidak lengkap — menampilkan data daftar', 'error');
      }
    } catch {
      showToast('Tidak bisa memuat rincian dari server — menampilkan data daftar', 'error');
    }
    setDetailLoading(false);
  };

  const printDetail = () => {
    if (!detailReq?.request) return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) { showToast('Izinkan pop-up untuk mencetak', 'error'); return; }
    w.document.write(travelPrintHtml(detailReq));
    w.document.close();
    w.focus();
  };

  const exportDetail = () => {
    if (!detailReq?.request) return;
    const blob = new Blob([travelCsv(detailReq)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detailReq.request.request_number || 'perjalanan'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV diunduh');
  };

  const emailDetail = async () => {
    if (!detailReq?.request) return;
    if (!emailTo.includes('@')) { showToast('Isi alamat email tujuan', 'error'); return; }
    setEmailing(true);
    try {
      const res = await api('email-request', 'POST', {
        id: detailReq.request.id,
        to: emailTo.trim(),
        note: emailNote,
      });
      if (res?.success) showToast(res.message || 'Email terkirim');
      else showToast(res?.error || 'Gagal mengirim email', 'error');
    } catch {
      showToast('Gagal mengirim email', 'error');
    }
    setEmailing(false);
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700', pending: 'bg-amber-50 text-amber-800',
      approved: 'bg-emerald-50 text-emerald-800', rejected: 'bg-rose-50 text-rose-800',
      in_progress: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
      completed: 'bg-emerald-50 text-emerald-800', cancelled: 'bg-slate-100 text-slate-500',
      reimbursed: 'bg-emerald-50 text-emerald-800', submitted: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
    };
    return m[s] || 'bg-slate-100 text-slate-700';
  };

  const selectedTrip = requests.find((r) => r.id === expForm.travelRequestId);
  const selectedStops: ItineraryStop[] = selectedTrip
    ? parseTravelPlan(selectedTrip.itinerary, selectedTrip.departure_city).stops
    : [];

  return (
    <HQLayout title={t('hris.travelExpenseTitle')}>
      <div className="space-y-5 max-w-7xl mx-auto">
        {toast && (
          <div className={`fixed top-4 right-4 z-[80] px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-600'}`}>
            {toast.msg}
          </div>
        )}

        <EnterprisePageHeader
          title="Perjalanan & biaya dinas"
          subtitle="Pengajuan multi kota, itinerary, rencana biaya per kota, dan klaim aktual dari portal karyawan."
          badge="HR Ops"
          icon={Plane}
          actions={<DataSourceBadge source={dataSource} />}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HRStatCard label="Pengajuan" value={overview.totalRequests || 0} icon={Plane} accent="violet" />
          <HRStatCard label="Menunggu persetujuan" value={overview.pendingApproval || 0} icon={Calendar} accent="amber" />
          <HRStatCard label="Klaim biaya" value={overview.totalExpenses || 0} icon={Receipt} accent="emerald" />
          <HRStatCard label="Total pengeluaran" value={fmtCur(overview.totalExpenseAmount || 0)} icon={Wallet} accent="cyan" />
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'requests', label: 'Perjalanan dinas', icon: Plane },
            { key: 'expenses', label: 'Klaim biaya', icon: Receipt },
            { key: 'budgets', label: 'Anggaran', icon: Wallet },
          ]}
          active={tab}
          onChange={(k) => { setTab(k); }}
        />

        {loading && <div className="text-center py-10 text-slate-400">Memuat…</div>}

        {!loading && tab === 'requests' && (
          <div className="hf-card p-4 sm:p-5">
            <div className="flex justify-between items-center mb-4 gap-3">
              <h2 className="text-base font-semibold text-slate-900">Pengajuan perjalanan</h2>
              <button type="button" onClick={() => openAdd('request')} className="hf-btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ajukan perjalanan
              </button>
            </div>
            <div className="space-y-3">
              {requests.map((r) => {
                const plan = parseTravelPlan(r.itinerary, r.departure_city);
                return (
                  <div key={r.id} className="hf-tile hf-tile-interactive p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)] px-2 py-0.5 rounded">{r.request_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                            {plan.tripType === 'multi_city' ? 'Multi kota' : plan.tripType === 'round_trip' ? 'Pergi–pulang' : 'Satu kota'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[color:var(--hf-brand-600)] shrink-0" />
                          <span className="truncate">{r.destination}</span>
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{r.purpose}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {r.departure_date && new Date(r.departure_date).toLocaleDateString('id-ID')} – {r.return_date && new Date(r.return_date).toLocaleDateString('id-ID')}
                          {plan.stops.length > 0 ? ` · ${plan.stops.length} kota` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">Rencana {fmtCur(Number(r.estimated_budget))}</p>
                        {Number(r.actual_cost) > 0 && <p className="text-xs text-slate-500">Aktual {fmtCur(Number(r.actual_cost))}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3 pt-3 border-t border-[var(--hf-border)]">
                      <button type="button" onClick={() => openDetail(r)} className="text-xs px-2 py-1 text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Detail
                      </button>
                      {r.status === 'pending' && (
                        <>
                          <button type="button" onClick={async () => { await api('approve-request', 'POST', { id: r.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded flex items-center gap-1">
                            <Check className="w-3 h-3" /> Setujui
                          </button>
                          <button type="button" onClick={async () => { await api('reject-request', 'POST', { id: r.id, reason: 'Ditolak' }); showToast('Ditolak'); loadData(); }} className="text-xs px-2 py-1 text-rose-600 hover:bg-rose-50 rounded">Tolak</button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button type="button" onClick={async () => { await api('complete-travel', 'POST', { id: r.id }); showToast('Perjalanan selesai'); loadData(); }} className="text-xs px-2 py-1 text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded">Selesai</button>
                      )}
                      <button type="button" onClick={() => handleDelete('request', r.id)} className="text-xs px-2 py-1 text-slate-400 hover:text-rose-600 ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && (
                <HrisEmptyState
                  source={dataSource}
                  title="Belum ada pengajuan perjalanan"
                  description="Ajukan rute satu kota atau multi kota beserta rencana biaya per itinerary."
                />
              )}
            </div>
          </div>
        )}

        {detailReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/50" aria-label="Tutup detail" onClick={() => setDetailReq(null)} />
            <div className="relative hf-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[color:var(--hf-brand-600)]">{detailReq.request?.request_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(detailReq.request?.status)}`}>{detailReq.request?.status}</span>
                    {detailLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{detailReq.request?.destination}</h2>
                  {detailReq.employee?.name && <p className="text-xs text-slate-500 mt-0.5">{detailReq.employee.name}</p>}
                </div>
                <button type="button" onClick={() => setDetailReq(null)} className="p-1 hover:bg-slate-100 rounded" aria-label="Tutup"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-slate-600">{detailReq.request?.purpose}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={printDetail} className="hf-btn-secondary text-sm flex items-center gap-1.5">
                    <Printer className="w-4 h-4" /> Cetak / PDF
                  </button>
                  <button type="button" onClick={exportDetail} className="hf-btn-secondary text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Rencana</p><p className="font-bold">{fmtCur(Number(detailReq.request?.estimated_budget))}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Aktual</p><p className="font-bold">{fmtCur(Number(detailReq.request?.actual_cost))}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Klaim tercatat</p><p className="font-bold">{fmtCur(detailReq.totalExpenses)}</p></div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Itinerary & rencana biaya</h3>
                  <TravelItinerarySummary
                    originCity={parseTravelPlan(detailReq.request?.itinerary, detailReq.request?.departure_city).originCity}
                    tripType={(detailReq.request?.trip_type || parseTravelPlan(detailReq.request?.itinerary).tripType) as TravelTripType}
                    stops={parseTravelPlan(detailReq.request?.itinerary, detailReq.request?.departure_city).stops}
                    expenses={detailReq.expenses || []}
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Klaim aktual ({(detailReq.expenses || []).length})</h3>
                  {(detailReq.expenses || []).length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Tanggal</th>
                          <th className="px-3 py-2 text-left">Kategori</th>
                          <th className="px-3 py-2 text-left">Deskripsi</th>
                          <th className="px-3 py-2 text-right">Jumlah</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(detailReq.expenses || []).map((e: any) => (
                          <tr key={e.id}>
                            <td className="px-3 py-2">{e.expense_date && new Date(e.expense_date).toLocaleDateString('id-ID')}</td>
                            <td className="px-3 py-2 capitalize">{e.category}</td>
                            <td className="px-3 py-2">{e.description}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmtCur(Number(e.amount))}</td>
                            <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-slate-400 text-sm">Belum ada klaim dari karyawan.</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setExpForm({
                        travelRequestId: detailReq.request?.id,
                        employeeId: String(detailReq.request?.employee_id || ''),
                        expenseDate: new Date().toISOString().split('T')[0],
                        category: 'transportation',
                        description: '',
                        amount: 0,
                        itineraryStopId: '',
                      });
                      setModalType('expense');
                      setShowModal(true);
                    }}
                    className="mt-4 text-sm px-3 py-2 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Catat biaya
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--hf-border)] p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" /> Kirim email</p>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="hf-input w-full"
                  />
                  <textarea
                    value={emailNote}
                    onChange={(e) => setEmailNote(e.target.value)}
                    rows={2}
                    placeholder="Catatan untuk penerima (opsional)"
                    className="hf-input w-full"
                  />
                  <button type="button" onClick={emailDetail} disabled={emailing} className="hf-btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {emailing ? 'Mengirim…' : 'Kirim'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'expenses' && (
          <div className="hf-card p-4 sm:p-5 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">Klaim biaya perjalanan</h2>
              <button type="button" onClick={() => openAdd('expense')} className="hf-btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Klaim biaya
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-left">Deskripsi</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.expense_date && new Date(e.expense_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 capitalize">{e.category}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCur(Number(e.amount))}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {e.status === 'submitted' && (
                          <button type="button" onClick={async () => { await api('approve-expense', 'POST', { id: e.id }); showToast('Biaya disetujui'); loadData(); }} className="text-xs px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded">Setujui</button>
                        )}
                        {e.status === 'approved' && (
                          <button type="button" onClick={async () => { await api('reimburse-expense', 'POST', { id: e.id }); showToast('Diganti'); loadData(); }} className="text-xs px-2 py-1 text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded">Ganti biaya</button>
                        )}
                        <button type="button" onClick={() => handleDelete('expense', e.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <HrisEmptyState source={dataSource} title="Belum ada klaim biaya" description="Klaim muncul setelah karyawan mencatat biaya per kota dari portal, atau HR mencatat di sini." />
            )}
          </div>
        )}

        {!loading && tab === 'budgets' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">Kontrol anggaran</h2>
              <button type="button" onClick={() => openAdd('budget')} className="hf-btn-primary text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tambah anggaran
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map((b) => {
                const usedPct = Number(b.annual_limit) > 0 ? (Number(b.used_amount) / Number(b.annual_limit)) * 100 : 0;
                return (
                  <div key={b.id} className="hf-card p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold capitalize">{b.category}</h3>
                        <p className="text-xs text-slate-400">FY {b.fiscal_year}</p>
                      </div>
                      <button type="button" onClick={() => handleDelete('budget', b.id)} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Limit bulanan</span><span className="font-medium">{fmtCur(Number(b.monthly_limit))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Limit tahunan</span><span className="font-medium">{fmtCur(Number(b.annual_limit))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Terpakai</span><span className="font-medium text-amber-700">{fmtCur(Number(b.used_amount))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Sisa</span><span className="font-medium text-emerald-700">{fmtCur(Number(b.remaining_amount))}</span></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1"><span>Penggunaan</span><span>{usedPct.toFixed(0)}%</span></div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${usedPct > 80 ? 'bg-rose-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="col-span-3">
                  <HrisEmptyState source={dataSource} title="Belum ada anggaran" description="Tetapkan anggaran perjalanan per kategori untuk kontrol biaya." />
                </div>
              )}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className={`hf-card w-full ${modalType === 'request' ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-semibold">
                  {modalType === 'request' ? 'Pengajuan perjalanan' : modalType === 'expense' ? 'Klaim biaya' : 'Anggaran'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                {modalType === 'request' && (
                  <>
                    <EmployeePicker value={reqForm.employeeId} onChange={(emp) => setReqForm({ ...reqForm, employeeId: emp?.id || '' })} required />
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Keperluan</label>
                      <textarea value={reqForm.purpose} onChange={(e) => setReqForm({ ...reqForm, purpose: e.target.value })} className="hf-input w-full mt-1" rows={2} placeholder="Visit cabang, audit, training…" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Tipe</label>
                        <select value={reqForm.travelType} onChange={(e) => setReqForm({ ...reqForm, travelType: e.target.value })} className="hf-input w-full mt-1">
                          <option value="domestic">Domestik</option>
                          <option value="international">Internasional</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Uang muka</label>
                        <input type="number" value={reqForm.advanceAmount} onChange={(e) => setReqForm({ ...reqForm, advanceAmount: parseInt(e.target.value, 10) || 0 })} className="hf-input w-full mt-1" />
                      </div>
                    </div>
                    <TravelItineraryEditor
                      originCity={reqForm.departureCity}
                      onOriginChange={(v) => setReqForm({ ...reqForm, departureCity: v })}
                      tripType={reqForm.tripType}
                      onTripTypeChange={(v) => setReqForm({ ...reqForm, tripType: v })}
                      stops={reqForm.stops}
                      onChange={(stops) => setReqForm({ ...reqForm, stops })}
                    />
                    <p className="text-sm font-semibold text-right">Total rencana {fmtCur(itineraryBudget(reqForm.stops))}</p>
                  </>
                )}
                {modalType === 'expense' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Pengajuan perjalanan</label>
                      <select
                        value={expForm.travelRequestId}
                        onChange={(e) => {
                          const req = requests.find((r) => r.id === e.target.value);
                          setExpForm({
                            ...expForm,
                            travelRequestId: e.target.value,
                            employeeId: req ? String(req.employee_id) : expForm.employeeId,
                            itineraryStopId: '',
                          });
                        }}
                        className="hf-input w-full mt-1"
                      >
                        <option value="">Pilih perjalanan</option>
                        {requests.map((r) => (
                          <option key={r.id} value={r.id}>{r.request_number} — {r.destination}</option>
                        ))}
                      </select>
                    </div>
                    {selectedStops.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Kota itinerary</label>
                        <select value={expForm.itineraryStopId} onChange={(e) => setExpForm({ ...expForm, itineraryStopId: e.target.value })} className="hf-input w-full mt-1">
                          <option value="">Umum / seluruh trip</option>
                          {selectedStops.map((s) => <option key={s.id} value={s.id}>{s.city || 'Kota'} · {s.arriveDate}</option>)}
                        </select>
                      </div>
                    )}
                    <EmployeePicker value={expForm.employeeId} onChange={(emp) => setExpForm({ ...expForm, employeeId: emp?.id || '' })} required />
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Tanggal</label>
                      <input type="date" value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} className="hf-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Kategori</label>
                      <select value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className="hf-input w-full mt-1">
                        <option value="transportation">Transportasi / tiket</option>
                        <option value="accommodation">Hotel</option>
                        <option value="meals">Makan</option>
                        <option value="communication">Komunikasi</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Deskripsi</label>
                      <input value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="hf-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Jumlah (Rp)</label>
                      <input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: parseInt(e.target.value, 10) || 0 })} className="hf-input w-full mt-1" />
                    </div>
                  </>
                )}
                {modalType === 'budget' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Kategori</label>
                      <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} className="hf-input w-full mt-1">
                        <option value="travel">Perjalanan</option>
                        <option value="meals">Makan</option>
                        <option value="transportation">Transportasi</option>
                        <option value="accommodation">Akomodasi</option>
                        <option value="communication">Komunikasi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Tahun fiskal</label>
                      <input type="number" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm({ ...budgetForm, fiscalYear: parseInt(e.target.value, 10) })} className="hf-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Limit bulanan (Rp)</label>
                      <input type="number" value={budgetForm.monthlyLimit} onChange={(e) => setBudgetForm({ ...budgetForm, monthlyLimit: parseInt(e.target.value, 10) || 0 })} className="hf-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Limit tahunan (Rp)</label>
                      <input type="number" value={budgetForm.annualLimit} onChange={(e) => setBudgetForm({ ...budgetForm, annualLimit: parseInt(e.target.value, 10) || 0 })} className="hf-input w-full mt-1" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={() => setShowModal(false)} className="hf-btn-secondary">Batal</button>
                <button type="button" onClick={handleSave} className="hf-btn-primary">Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
