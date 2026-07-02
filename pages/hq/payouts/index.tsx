import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import {
  Wallet, Plus, Search, RefreshCw, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertTriangle, XCircle, Building2,
  ChevronLeft, ChevronRight, X, ArrowUpDown, Landmark, Banknote
} from 'lucide-react';

interface Payout {
  id: string;
  code: string;
  partner_id: string;
  partner_name: string;
  partner_code: string;
  amount: number;
  method: 'transfer' | 'cash' | 'check' | 'other';
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paid_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface PayoutSummary {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  pendingAmount: number;
  completedAmount: number;
}

const defaultSummary: PayoutSummary = {
  totalPending: 0, totalProcessing: 0, totalCompleted: 0, totalFailed: 0,
  pendingAmount: 0, completedAmount: 0,
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  failed: { label: 'Gagal', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const methodLabels: Record<string, string> = {
  transfer: 'Transfer Bank',
  cash: 'Tunai',
  check: 'Cek',
  other: 'Lainnya',
};

export default function PayoutManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>(defaultSummary);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    partnerId: '', amount: 0, method: 'transfer' as string,
    bankName: '', bankAccount: '', accountName: '', notes: ''
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterMethod !== 'all') params.set('method', filterMethod);
      if (filterPartner !== 'all') params.set('partnerId', filterPartner);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/hq/payouts?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        const meta = json.meta || {};
        setPayouts(data);
        setTotalPages(meta.totalPages || 1);

        const sum: PayoutSummary = { totalPending: 0, totalProcessing: 0, totalCompleted: 0, totalFailed: 0, pendingAmount: 0, completedAmount: 0 };
        data.forEach((p: Payout) => {
          if (p.status === 'pending') { sum.totalPending++; sum.pendingAmount += Number(p.amount); }
          else if (p.status === 'processing') sum.totalProcessing++;
          else if (p.status === 'completed') { sum.totalCompleted++; sum.completedAmount += Number(p.amount); }
          else if (p.status === 'failed') sum.totalFailed++;
        });
        setSummary(sum);
      }
    } catch (err) {
      console.error('Fetch payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchPayouts();
  }, [mounted, page, filterStatus, filterMethod, filterPartner]);

  useEffect(() => {
    fetchPartners();
  }, [mounted]);

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/hq/partners?limit=100');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setPartners(data.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (err) {
      setPartners([
        { id: 'p1', name: 'PT Mitra Sejahtera' },
        { id: 'p2', name: 'CV Karya Abadi' },
        { id: 'p3', name: 'Toko Maju Jaya' },
        { id: 'p4', name: 'UD Sinar Harapan' },
        { id: 'p5', name: 'PT Bumi Makmur' },
      ]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.partnerId || !createForm.amount) return;

    try {
      const res = await fetch('/api/hq/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ partnerId: '', amount: 0, method: 'transfer', bankName: '', bankAccount: '', accountName: '', notes: '' });
        fetchPayouts();
      }
    } catch (err) {
      console.error('Create payout error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus payout ini?')) return;
    try {
      const res = await fetch(`/api/hq/payouts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPayouts();
    } catch (err) {
      console.error('Delete payout error:', err);
    }
  };

  if (!mounted) return null;

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
        <Icon size={14} />
        {cfg.label}
      </span>
    );
  };

  const MethodBadge = ({ method }: { method: string }) => {
    const colors: Record<string, string> = {
      transfer: 'bg-purple-100 text-purple-800 border-purple-200',
      cash: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      check: 'bg-orange-100 text-orange-800 border-orange-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${colors[method] || colors.other}`}>
        <Landmark size={12} />
        {methodLabels[method] || method}
      </span>
    );
  };

  return (
    <HQLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="text-emerald-600" size={28} />
              Payout Mitra
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kelola pembayaran payout ke mitra bisnis
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={18} />
            Buat Payout Baru
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
              <Clock size={18} className="text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{summary.totalPending}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary.pendingAmount)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Diproses</span>
              <RefreshCw size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.totalProcessing}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Selesai</span>
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.totalCompleted}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary.completedAmount)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Gagal</span>
              <XCircle size={18} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.totalFailed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kode atau nama mitra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchPayouts(); } }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="failed">Gagal</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => { setFilterMethod(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">Semua Metode</option>
              <option value="transfer">Transfer Bank</option>
              <option value="cash">Tunai</option>
              <option value="check">Cek</option>
              <option value="other">Lainnya</option>
            </select>
            <button
              onClick={() => { setPage(1); fetchPayouts(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mitra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Info Bank</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={18} className="animate-spin" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <Wallet size={40} className="mx-auto mb-2 opacity-30" />
                      <p>Tidak ada payout ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/hq/payouts/${p.id}`} className="text-sm font-mono font-medium text-emerald-600 hover:text-emerald-700">
                          {p.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{p.partner_name || '-'}</span>
                        </div>
                        {p.partner_code && <span className="text-xs text-gray-400 ml-6">{p.partner_code}</span>}
                      </td>
                      <td className="px-4 py-3"><MethodBadge method={p.method} /></td>
                      <td className="px-4 py-3">
                        {p.method === 'transfer' ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 dark:text-white">{p.bank_name || '-'}</p>
                            <p className="text-xs text-gray-400">{p.account_name} / {p.bank_account}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/hq/payouts/${p.id}`}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Detail"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/hq/payouts/${p.id}`}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          {(p.status === 'pending' || p.status === 'failed') && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Plus size={20} className="text-emerald-600" />
                  Buat Payout Baru
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mitra *</label>
                  <select
                    value={createForm.partnerId}
                    onChange={(e) => setCreateForm({ ...createForm, partnerId: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Pilih Mitra</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metode *</label>
                  <select
                    value={createForm.method}
                    onChange={(e) => setCreateForm({ ...createForm, method: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai</option>
                    <option value="check">Cek</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                {createForm.method === 'transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Bank</label>
                      <input
                        type="text"
                        value={createForm.bankName}
                        onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. Rekening</label>
                        <input
                          type="text"
                          value={createForm.bankAccount}
                          onChange={(e) => setCreateForm({ ...createForm, bankAccount: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atas Nama</label>
                        <input
                          type="text"
                          value={createForm.accountName}
                          onChange={(e) => setCreateForm({ ...createForm, accountName: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
