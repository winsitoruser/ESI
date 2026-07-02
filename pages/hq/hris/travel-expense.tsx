import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { Plane, Receipt, Wallet, Plus, Edit, Trash2, X, Check, Eye, Search, MapPin, Calendar, DollarSign } from 'lucide-react';

interface TravelReq { id: string; employee_id: number; request_number: string; destination: string; departure_city: string; purpose: string; departure_date: string; return_date: string; travel_type: string; transportation: string; accommodation_needed: boolean; estimated_budget: number; actual_cost: number; advance_amount: number; status: string; itinerary: any[]; notes: string; }
interface TravelExp { id: string; travel_request_id: string; employee_id: number; expense_date: string; category: string; description: string; amount: number; receipt_url: string; status: string; }
interface Budget { id: string; category: string; fiscal_year: number; monthly_limit: number; annual_limit: number; used_amount: number; remaining_amount: number; is_active: boolean; }

type TabKey = 'requests' | 'expenses' | 'budgets';

const MOCK_TE_OVERVIEW = { totalRequests: 24, pendingRequests: 3, totalExpenses: 185000000, budgetUtilization: 62, avgTripCost: 7700000 };
const MOCK_TE_REQUESTS: TravelReq[] = [
  { id: 'tr1', employee_id: 1, request_number: 'TRV-2026-024', destination: 'Surabaya', departure_city: 'Jakarta', purpose: 'Visit cabang dan audit operasional', departure_date: '2026-03-18', return_date: '2026-03-20', travel_type: 'domestic', transportation: 'flight', accommodation_needed: true, estimated_budget: 8500000, actual_cost: 0, advance_amount: 5000000, status: 'approved', itinerary: [], notes: '' },
  { id: 'tr2', employee_id: 5, request_number: 'TRV-2026-023', destination: 'Bali', departure_city: 'Jakarta', purpose: 'Meeting dengan supplier baru', departure_date: '2026-03-22', return_date: '2026-03-24', travel_type: 'domestic', transportation: 'flight', accommodation_needed: true, estimated_budget: 12000000, actual_cost: 0, advance_amount: 0, status: 'pending', itinerary: [], notes: '' },
  { id: 'tr3', employee_id: 3, request_number: 'TRV-2026-022', destination: 'Bandung', departure_city: 'Jakarta', purpose: 'Training cabang baru', departure_date: '2026-03-10', return_date: '2026-03-12', travel_type: 'domestic', transportation: 'train', accommodation_needed: true, estimated_budget: 4500000, actual_cost: 4200000, advance_amount: 3000000, status: 'completed', itinerary: [], notes: '' },
];
const MOCK_TE_EXPENSES: TravelExp[] = [
  { id: 'te1', travel_request_id: 'tr3', employee_id: 3, expense_date: '2026-03-10', category: 'transportation', description: 'Tiket KA Argo Parahyangan PP', amount: 600000, receipt_url: '', status: 'reimbursed' },
  { id: 'te2', travel_request_id: 'tr3', employee_id: 3, expense_date: '2026-03-10', category: 'accommodation', description: 'Hotel 2 malam', amount: 1600000, receipt_url: '', status: 'reimbursed' },
];
const MOCK_TE_BUDGETS: Budget[] = [
  { id: 'tb1', category: 'travel', fiscal_year: 2026, monthly_limit: 50000000, annual_limit: 600000000, used_amount: 185000000, remaining_amount: 415000000, is_active: true },
];

export default function TravelExpensePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('requests');
  const [overview, setOverview] = useState<any>(MOCK_TE_OVERVIEW);
  const [requests, setRequests] = useState<TravelReq[]>(MOCK_TE_REQUESTS);
  const [expenses, setExpenses] = useState<TravelExp[]>(MOCK_TE_EXPENSES);
  const [budgets, setBudgets] = useState<Budget[]>(MOCK_TE_BUDGETS);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [detailReq, setDetailReq] = useState<any>(null);

  const [reqForm, setReqForm] = useState({ employeeId: '', destination: '', departureCity: '', purpose: '', departureDate: '', returnDate: '', travelType: 'domestic', transportation: 'flight', accommodationNeeded: true, estimatedBudget: 0, advanceAmount: 0, notes: '' });
  const [expForm, setExpForm] = useState({ travelRequestId: '', employeeId: '', expenseDate: '', category: 'transportation', description: '', amount: 0, receiptNumber: '' });
  const [budgetForm, setBudgetForm] = useState({ category: 'travel', fiscalYear: new Date().getFullYear(), monthlyLimit: 0, annualLimit: 0 });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/travel-expense?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, rq, ex, bg] = await Promise.all([
        api('overview'), api('requests'), api('expenses'), api('budgets')
      ]);
      setOverview(ov.data || {});
      setRequests(rq.data || []);
      setExpenses(ex.data || []);
      setBudgets(bg.data || []);
    } catch (e) {
      console.error(e);
      setOverview(MOCK_TE_OVERVIEW);
      setRequests(MOCK_TE_REQUESTS);
      setExpenses(MOCK_TE_EXPENSES);
      setBudgets(MOCK_TE_BUDGETS);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'request') setReqForm({ employeeId: '', destination: '', departureCity: '', purpose: '', departureDate: '', returnDate: '', travelType: 'domestic', transportation: 'flight', accommodationNeeded: true, estimatedBudget: 0, advanceAmount: 0, notes: '' });
    if (type === 'expense') setExpForm({ travelRequestId: '', employeeId: '', expenseDate: new Date().toISOString().split('T')[0], category: 'transportation', description: '', amount: 0, receiptNumber: '' });
    if (type === 'budget') setBudgetForm({ category: 'travel', fiscalYear: new Date().getFullYear(), monthlyLimit: 0, annualLimit: 0 });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'request') {
        if (editingItem) await api('request', 'PUT', reqForm, `&id=${editingItem.id}`);
        else await api('request', 'POST', reqForm);
      } else if (modalType === 'expense') {
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

  const statusColor = (s: string) => {
    const m: any = { draft: 'bg-gray-100 text-gray-800', pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', in_progress: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-gray-200 text-gray-600', reimbursed: 'bg-emerald-100 text-emerald-800', submitted: 'bg-blue-100 text-blue-800' };
    return m[s] || 'bg-gray-100 text-gray-800';
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'requests', label: 'Perjalanan Dinas', icon: Plane },
    { key: 'expenses', label: 'Klaim Biaya', icon: Receipt },
    { key: 'budgets', label: 'Kontrol Anggaran', icon: Wallet },
  ];

  return (
    <HQLayout title={t('hris.travelExpenseTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Perjalanan & Pengeluaran</h1>
        <p className="text-gray-500 mt-1">Pengajuan perjalanan dinas, klaim biaya, dan kontrol anggaran</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <Plane className="w-5 h-5 text-blue-600 mb-1" />
          <p className="text-2xl font-bold">{overview.totalRequests || 0}</p>
          <p className="text-xs text-gray-500">Total Perjalanan</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <Calendar className="w-5 h-5 text-orange-600 mb-1" />
          <p className="text-2xl font-bold text-orange-600">{overview.pendingApproval || 0}</p>
          <p className="text-xs text-gray-500">Menunggu Persetujuan</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <Receipt className="w-5 h-5 text-green-600 mb-1" />
          <p className="text-2xl font-bold">{overview.totalExpenses || 0}</p>
          <p className="text-xs text-gray-500">Total Klaim</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <DollarSign className="w-5 h-5 text-purple-600 mb-1" />
          <p className="text-2xl font-bold">{fmtCur(overview.totalExpenseAmount || 0)}</p>
          <p className="text-xs text-gray-500">Total Pengeluaran</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setDetailReq(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Memuat...</div>}

      {/* REQUESTS TAB */}
      {!loading && tab === 'requests' && !detailReq && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Pengajuan Perjalanan Dinas</h2>
            <button onClick={() => openAdd('request')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Ajukan Perjalanan
            </button>
          </div>
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.request_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{r.travel_type}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      {r.departure_city && `${r.departure_city} → `}{r.destination}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{r.purpose}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Karyawan #{r.employee_id}</span>
                      <span>{r.departure_date && new Date(r.departure_date).toLocaleDateString('id-ID')} - {r.return_date && new Date(r.return_date).toLocaleDateString('id-ID')}</span>
                      <span>🚗 {r.transportation}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">Est: {fmtCur(r.estimated_budget)}</p>
                    {Number(r.actual_cost) > 0 && <p className="text-xs text-gray-500">Aktual: {fmtCur(r.actual_cost)}</p>}
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t">
                  <button onClick={async () => { const res = await api('request-detail', 'GET', null, `&id=${r.id}`); setDetailReq(res.data); }} className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1"><Eye className="w-3 h-3" />Detail</button>
                  {r.status === 'pending' && (<>
                    <button onClick={async () => { await api('approve-request', 'POST', { id: r.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded flex items-center gap-1"><Check className="w-3 h-3" />Setujui</button>
                    <button onClick={async () => { await api('reject-request', 'POST', { id: r.id, reason: 'Ditolak' }); showToast('Ditolak'); loadData(); }} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Tolak</button>
                  </>)}
                  {r.status === 'approved' && (
                    <button onClick={async () => { await api('complete-travel', 'POST', { id: r.id }); showToast('Perjalanan selesai'); loadData(); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Selesai</button>
                  )}
                  <button onClick={() => handleDelete('request', r.id)} className="text-xs px-2 py-1 text-gray-400 hover:text-red-600 ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {requests.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada pengajuan perjalanan dinas</p>}
          </div>
        </div>
      )}

      {/* REQUEST DETAIL */}
      {!loading && tab === 'requests' && detailReq && (
        <div>
          <button onClick={() => setDetailReq(null)} className="text-sm text-indigo-600 mb-4 hover:underline">← Kembali</button>
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-indigo-600">{detailReq.request?.request_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(detailReq.request?.status)}`}>{detailReq.request?.status}</span>
            </div>
            <h2 className="text-xl font-bold">{detailReq.request?.destination}</h2>
            <p className="text-gray-500">{detailReq.request?.purpose}</p>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Anggaran</p><p className="font-bold">{fmtCur(detailReq.request?.estimated_budget)}</p></div>
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Aktual</p><p className="font-bold">{fmtCur(detailReq.request?.actual_cost)}</p></div>
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Total Pengeluaran</p><p className="font-bold">{fmtCur(detailReq.totalExpenses)}</p></div>
            </div>
            <h3 className="font-semibold mt-6 mb-3">Rincian Biaya ({(detailReq.expenses || []).length})</h3>
            {(detailReq.expenses || []).length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Kategori</th><th className="px-3 py-2 text-left">Deskripsi</th><th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody className="divide-y">
                  {(detailReq.expenses || []).map((e: any) => (
                    <tr key={e.id}><td className="px-3 py-2">{e.expense_date && new Date(e.expense_date).toLocaleDateString('id-ID')}</td><td className="px-3 py-2 capitalize">{e.category}</td><td className="px-3 py-2">{e.description}</td><td className="px-3 py-2 text-right font-medium">{fmtCur(e.amount)}</td><td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-gray-400 text-sm">Belum ada klaim biaya</p>}
            <button onClick={() => { setExpForm({ ...expForm, travelRequestId: detailReq.request?.id, employeeId: detailReq.request?.employee_id }); openAdd('expense'); }} className="mt-4 text-sm px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-1"><Plus className="w-4 h-4" />Tambah Biaya</button>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {!loading && tab === 'expenses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Klaim Biaya Perjalanan</h2>
            <button onClick={() => openAdd('expense')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <Plus className="w-4 h-4" /> Klaim Biaya
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-left">Deskripsi</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{e.expense_date && new Date(e.expense_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">#{e.employee_id}</td>
                    <td className="px-4 py-3 capitalize">{e.category}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCur(e.amount)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {e.status === 'submitted' && (
                          <button onClick={async () => { await api('approve-expense', 'POST', { id: e.id }); showToast('Biaya disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Setujui</button>
                        )}
                        {e.status === 'approved' && (
                          <button onClick={async () => { await api('reimburse-expense', 'POST', { id: e.id }); showToast('Diganti'); loadData(); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Ganti Biaya</button>
                        )}
                        <button onClick={() => handleDelete('expense', e.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada klaim biaya</p>}
          </div>
        </div>
      )}

      {/* BUDGETS TAB */}
      {!loading && tab === 'budgets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Kontrol Anggaran</h2>
            <button onClick={() => openAdd('budget')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Tambah Anggaran
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(b => {
              const usedPct = Number(b.annual_limit) > 0 ? (Number(b.used_amount) / Number(b.annual_limit)) * 100 : 0;
              return (
                <div key={b.id} className="bg-white border rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold capitalize">{b.category}</h3>
                      <p className="text-xs text-gray-400">FY {b.fiscal_year}</p>
                    </div>
                    <button onClick={() => handleDelete('budget', b.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Limit Bulanan</span><span className="font-medium">{fmtCur(b.monthly_limit)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Limit Tahunan</span><span className="font-medium">{fmtCur(b.annual_limit)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Terpakai</span><span className="font-medium text-orange-600">{fmtCur(b.used_amount)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Sisa</span><span className="font-medium text-green-600">{fmtCur(b.remaining_amount)}</span></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1"><span>Penggunaan</span><span>{usedPct.toFixed(0)}%</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {budgets.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">Belum ada anggaran</p>}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">
                {modalType === 'request' ? 'Pengajuan Perjalanan' : modalType === 'expense' ? 'Klaim Biaya' : 'Anggaran'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'request' && (<>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={reqForm.employeeId} onChange={e => setReqForm({ ...reqForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Kota Asal</label><input value={reqForm.departureCity} onChange={e => setReqForm({ ...reqForm, departureCity: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Tujuan</label><input value={reqForm.destination} onChange={e => setReqForm({ ...reqForm, destination: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Tujuan Perjalanan</label><textarea value={reqForm.purpose} onChange={e => setReqForm({ ...reqForm, purpose: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Berangkat</label><input type="date" value={reqForm.departureDate} onChange={e => setReqForm({ ...reqForm, departureDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Pulang</label><input type="date" value={reqForm.returnDate} onChange={e => setReqForm({ ...reqForm, returnDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Tipe</label>
                    <select value={reqForm.travelType} onChange={e => setReqForm({ ...reqForm, travelType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="domestic">Domestik</option><option value="international">Internasional</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium text-gray-700">Transportasi</label>
                    <select value={reqForm.transportation} onChange={e => setReqForm({ ...reqForm, transportation: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="flight">Pesawat</option><option value="train">Kereta</option><option value="bus">Bus</option><option value="car">Mobil</option><option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Estimasi Anggaran</label><input type="number" value={reqForm.estimatedBudget} onChange={e => setReqForm({ ...reqForm, estimatedBudget: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Uang Muka</label><input type="number" value={reqForm.advanceAmount} onChange={e => setReqForm({ ...reqForm, advanceAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
              </>)}
              {modalType === 'expense' && (<>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={expForm.employeeId} onChange={e => setExpForm({ ...expForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={expForm.expenseDate} onChange={e => setExpForm({ ...expForm, expenseDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="transportation">Transportasi</option><option value="accommodation">Akomodasi</option><option value="meals">Makan</option><option value="communication">Komunikasi</option><option value="other">Lainnya</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Jumlah (Rp)</label><input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </>)}
              {modalType === 'budget' && (<>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="travel">Perjalanan</option><option value="meals">Makan</option><option value="transportation">Transportasi</option><option value="accommodation">Akomodasi</option><option value="communication">Komunikasi</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Tahun Fiskal</label><input type="number" value={budgetForm.fiscalYear} onChange={e => setBudgetForm({ ...budgetForm, fiscalYear: parseInt(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Limit Bulanan (Rp)</label><input type="number" value={budgetForm.monthlyLimit} onChange={e => setBudgetForm({ ...budgetForm, monthlyLimit: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Limit Tahunan (Rp)</label><input type="number" value={budgetForm.annualLimit} onChange={e => setBudgetForm({ ...budgetForm, annualLimit: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
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
