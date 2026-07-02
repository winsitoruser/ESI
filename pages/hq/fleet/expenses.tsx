/**
 * HQ — Driver Expense Approval Dashboard
 *
 * Operator / Finance meninjau pengeluaran driver:
 *  - Filter status / driver / periode / kategori
 *  - Lihat foto struk (bukti)
 *  - Approve / Reject (single & bulk)
 *  - Tandai sudah dibayar (untuk reimburse tunai)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import HQLayout from '../../../components/hq/HQLayout';
import {
  RefreshCw, Filter, CheckCircle, XCircle, Wallet, Search,
  Calendar, User, DollarSign, FileText, Eye, Truck, Check, X,
  Loader2, Clock, ArrowRight, Receipt,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const CATEGORY_LABEL: Record<string, string> = {
  toll: 'Tol', parking: 'Parkir', meal: 'Makan',
  lodging: 'Penginapan', repair: 'Reparasi', other: 'Lainnya',
};

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700 border-amber-200',
  approved:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
  paid:      'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', paid: 'Dibayar',
};

function fmtCur(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
}
function fmtDate(d: string | Date) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HQDriverExpensesPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (categoryFilter) qs.set('category', categoryFilter);
      if (monthFilter) qs.set('month', monthFilter);
      const r = await fetch(`/api/hq/fleet/expenses?${qs}`);
      const j = await r.json();
      if (j.success) {
        setRecords(j.data || []);
        setSummary(j.summary || null);
        setByCategory(j.byCategory || []);
        setSelectedIds(new Set());
      }
    } catch (e) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, monthFilter]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchList(); }, [mounted, fetchList]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return records;
    return records.filter((e) =>
      e.driver_name?.toLowerCase().includes(s) ||
      e.driver_number?.toLowerCase().includes(s) ||
      e.license_plate?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s) ||
      e.route_number?.toLowerCase().includes(s)
    );
  }, [records, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const pending = filtered.filter((e) => e.status === 'submitted');
    if (selectedIds.size === pending.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map((e) => e.id)));
  };

  const selectedSum = useMemo(
    () => filtered.filter((e) => selectedIds.has(e.id)).reduce((s, e) => s + Number(e.amount || 0), 0),
    [filtered, selectedIds]
  );

  const approveOne = async (exp: any) => {
    try {
      const r = await fetch(`/api/hq/fleet/expenses/${exp.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const j = await r.json();
      if (j.success) { toast.success(j.message || 'Disetujui'); fetchList(); setDetail(null); }
      else toast.error(j.error || 'Gagal');
    } catch { toast.error('Gagal'); }
  };

  const markPaid = async (exp: any) => {
    try {
      const r = await fetch(`/api/hq/fleet/expenses/${exp.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-paid' }),
      });
      const j = await r.json();
      if (j.success) { toast.success(j.message || 'Ditandai dibayar'); fetchList(); setDetail(null); }
      else toast.error(j.error || 'Gagal');
    } catch { toast.error('Gagal'); }
  };

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) { toast.error('Alasan tolak wajib'); return; }
    try {
      const r = await fetch(`/api/hq/fleet/expenses/${rejectTarget.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success('Expense ditolak');
        setRejectTarget(null);
        setRejectReason('');
        setDetail(null);
        fetchList();
      } else toast.error(j.error || 'Gagal');
    } catch { toast.error('Gagal'); }
  };

  const bulkAction = async (action: 'bulk-approve' | 'bulk-reject' | 'bulk-mark-paid', reason?: string) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const r = await fetch(`/api/hq/fleet/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedIds), reason }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`${j.data?.updated || 0} expense diproses`);
        setSelectedIds(new Set());
        fetchList();
      } else toast.error(j.error || 'Gagal');
    } catch { toast.error('Gagal'); }
    finally { setBulkBusy(false); }
  };

  if (!mounted) return null;

  return (
    <HQLayout>
      <Head><title>Expense Driver · Bedagang HQ</title></Head>
      <Toaster position="top-center" />
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-fuchsia-600 to-rose-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Expense Driver</h1>
                <p className="text-pink-100 text-xs md:text-sm">
                  Review & approve pengeluaran harian armada (tol, parkir, BBM, dll)
                </p>
              </div>
            </div>
            <button
              onClick={fetchList}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 backdrop-blur-sm flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard icon={<Clock className="w-5 h-5 text-amber-600" />} label="Menunggu" count={summary.pending} amount={summary.pending_amount} color="amber" />
            <SummaryCard icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} label="Disetujui" count={summary.approved} amount={summary.approved_amount} color="emerald" />
            <SummaryCard icon={<XCircle className="w-5 h-5 text-red-600" />} label="Ditolak" count={summary.rejected} amount={summary.rejected_amount} color="red" />
            <SummaryCard icon={<DollarSign className="w-5 h-5 text-blue-600" />} label="Dibayar" count={summary.paid} amount={summary.paid_amount} color="blue" />
            <SummaryCard icon={<Receipt className="w-5 h-5 text-gray-600" />} label="Total" count={summary.total_count} amount={summary.total_amount} color="gray" />
          </div>
        )}

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Breakdown per kategori (filter aktif)</p>
            <div className="flex flex-wrap gap-2">
              {byCategory.map((c) => (
                <div key={c.category} className="bg-gray-50 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{CATEGORY_LABEL[c.category] || c.category}</span>
                  <span className="text-gray-500">{c.count}×</span>
                  <span className="text-gray-700 font-medium">{fmtCur(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[220px] flex items-center gap-2 px-2 bg-gray-50 rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, plat, deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent py-2 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['submitted', 'approved', 'rejected', 'paid', ''] as const).map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                    statusFilter === s ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {s === '' ? 'Semua' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">Semua kategori</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-pink-50 border border-pink-100 rounded-lg p-2">
              <span className="text-xs font-semibold text-pink-700">
                {selectedIds.size} dipilih · {fmtCur(selectedSum)}
              </span>
              <button
                onClick={() => bulkAction('bulk-approve')}
                disabled={bulkBusy}
                className="ml-auto px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => {
                  const r = prompt('Alasan menolak seluruhnya?');
                  if (r && r.trim()) bulkAction('bulk-reject', r.trim());
                }}
                disabled={bulkBusy}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-60"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => bulkAction('bulk-mark-paid')}
                disabled={bulkBusy}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-60"
              >
                <DollarSign className="w-3.5 h-3.5" /> Mark Paid
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={
                        filtered.filter((e) => e.status === 'submitted').length > 0 &&
                        selectedIds.size === filtered.filter((e) => e.status === 'submitted').length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-2 text-left">Tgl</th>
                  <th className="p-2 text-left">Driver</th>
                  <th className="p-2 text-left">Kategori</th>
                  <th className="p-2 text-left">Deskripsi</th>
                  <th className="p-2 text-right">Jumlah</th>
                  <th className="p-2 text-left">Trip</th>
                  <th className="p-2 text-left">Struk</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} className="text-center p-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center p-8 text-gray-400">Tidak ada data</td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className={`border-t border-gray-50 hover:bg-pink-50/30 transition ${selectedIds.has(e.id) ? 'bg-pink-50' : ''}`}>
                    <td className="p-2">
                      {e.status === 'submitted' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(e.id)}
                          onChange={() => toggleSelect(e.id)}
                        />
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap text-xs">{fmtDate(e.expense_date)}</td>
                    <td className="p-2">
                      <p className="font-semibold text-xs">{e.driver_name}</p>
                      <p className="text-[10px] text-gray-500">
                        {e.driver_number} · {e.license_plate || '-'}
                      </p>
                    </td>
                    <td className="p-2">
                      <span className="bg-gray-100 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {CATEGORY_LABEL[e.category] || e.category}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-gray-700 max-w-[200px] truncate" title={e.description}>
                      {e.description || '-'}
                    </td>
                    <td className="p-2 text-right font-semibold text-xs whitespace-nowrap">{fmtCur(e.amount)}</td>
                    <td className="p-2 text-[10px] text-gray-600 max-w-[140px] truncate" title={e.route_name}>
                      {e.route_number || '-'}
                    </td>
                    <td className="p-2">
                      {e.receipt_photo_url ? (
                        <a href={e.receipt_photo_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={e.receipt_photo_url} alt="struk" className="w-10 h-10 rounded-md object-cover border" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[e.status] || 'bg-gray-100'}`}>
                        {STATUS_LABEL[e.status] || e.status}
                      </span>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <button onClick={() => setDetail(e)} className="text-gray-500 hover:text-pink-600 p-1" title="Detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      {e.status === 'submitted' && (
                        <>
                          <button onClick={() => approveOne(e)} className="text-emerald-600 hover:bg-emerald-50 rounded p-1 ml-1" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setRejectTarget(e); setRejectReason(''); }} className="text-red-600 hover:bg-red-50 rounded p-1 ml-1" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {e.status === 'approved' && (
                        <button onClick={() => markPaid(e)} className="text-blue-600 hover:bg-blue-50 rounded p-1 ml-1" title="Mark paid">
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail modal */}
        {detail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-2" onClick={() => setDetail(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Detail Expense</h3>
                <button onClick={() => setDetail(null)} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
              </div>
              {detail.receipt_photo_url && (
                <a href={detail.receipt_photo_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detail.receipt_photo_url} alt="struk" className="w-full max-h-60 object-contain bg-gray-50 rounded-lg border" />
                </a>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Driver" value={`${detail.driver_name || '-'} (${detail.driver_number || '-'})`} />
                <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label="Kendaraan" value={detail.license_plate || '-'} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Tanggal" value={fmtDate(detail.expense_date)} />
                <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Trip" value={detail.route_number || '-'} />
                <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Jumlah" value={fmtCur(detail.amount)} />
                <InfoRow icon={<Wallet className="w-3.5 h-3.5" />} label="Pembayaran" value={detail.payment_method || '-'} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Deskripsi</p>
                <p className="text-sm">{detail.description || '-'}</p>
              </div>
              {detail.notes && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Catatan Driver</p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}
              {detail.rejection_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                  <p className="text-[10px] text-red-600 uppercase font-semibold">Alasan Ditolak</p>
                  <p className="text-xs text-red-700">{detail.rejection_reason}</p>
                </div>
              )}
              {detail.approver_name && (
                <p className="text-[10px] text-gray-500">
                  Diproses oleh <b>{detail.approver_name}</b> · {fmtDate(detail.approved_at)}
                </p>
              )}
              {detail.status === 'submitted' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => approveOne(detail)} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => { setRejectTarget(detail); setRejectReason(''); setDetail(null); }} className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
              {detail.status === 'approved' && (
                <button onClick={() => markPaid(detail)} className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1">
                  <DollarSign className="w-4 h-4" /> Tandai Sudah Dibayar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reject modal */}
        {rejectTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-2" onClick={() => setRejectTarget(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold">Tolak Expense</h3>
              <p className="text-xs text-gray-500">
                {rejectTarget.driver_name} · {fmtCur(rejectTarget.amount)} · {CATEGORY_LABEL[rejectTarget.category] || rejectTarget.category}
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700">Alasan <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Struk tidak terbaca / tidak sesuai trip"
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRejectTarget(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg">
                  Batal
                </button>
                <button onClick={submitReject} className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg">
                  Tolak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}

function SummaryCard({ icon, label, count, amount, color }: any) {
  const bg: Record<string, string> = {
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    gray: 'bg-gray-50',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${bg[color] || bg.gray}`}>{icon}</div>
        <p className="text-[10px] uppercase text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{count || 0}</p>
      <p className="text-[11px] text-gray-500">{fmtCur(amount || 0)}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase">
        {icon} {label}
      </div>
      <p className="text-xs font-medium text-gray-900 truncate" title={String(value)}>{value}</p>
    </div>
  );
}
