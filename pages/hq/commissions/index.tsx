import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import {
  DollarSign, Plus, Search, Filter, RefreshCw, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertTriangle, XCircle, Building2, Calendar,
  ChevronLeft, ChevronRight, X, Percent, Wallet, Ban, ArrowUpDown
} from 'lucide-react';

interface Commission {
  id: string;
  code: string;
  partner_id: string;
  partner_name: string;
  partner_code: string;
  period_start: string;
  period_end: string;
  total_transaction: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CommissionSummary {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalCancelled: number;
  pendingAmount: number;
  paidAmount: number;
}

const defaultSummary: CommissionSummary = {
  totalPending: 0, totalApproved: 0, totalPaid: 0, totalCancelled: 0,
  pendingAmount: 0, paidAmount: 0,
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  paid: { label: 'Dibayar', color: 'bg-green-100 text-green-800 border-green-200', icon: DollarSign },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function CommissionManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>(defaultSummary);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    partnerId: '', periodStart: '', periodEnd: '',
    totalTransaction: 0, commissionRate: 0, notes: ''
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPartner !== 'all') params.set('partnerId', filterPartner);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/hq/commissions?${params}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        const meta = json.meta || {};
        setCommissions(data);
        setTotalPages(meta.totalPages || 1);

        // Calculate summary
        const sum: CommissionSummary = { totalPending: 0, totalApproved: 0, totalPaid: 0, totalCancelled: 0, pendingAmount: 0, paidAmount: 0 };
        data.forEach((c: Commission) => {
          if (c.status === 'pending') { sum.totalPending++; sum.pendingAmount += Number(c.commission_amount); }
          else if (c.status === 'approved') sum.totalApproved++;
          else if (c.status === 'paid') { sum.totalPaid++; sum.paidAmount += Number(c.commission_amount); }
          else if (c.status === 'cancelled') sum.totalCancelled++;
        });
        setSummary(sum);
      }
    } catch (err) {
      console.error('Fetch commissions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchCommissions();
  }, [mounted, page, filterStatus, filterPartner]);

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
    if (!createForm.partnerId || !createForm.periodStart || !createForm.periodEnd) return;

    const totalTransaction = Number(createForm.totalTransaction);
    const commissionRate = Number(createForm.commissionRate);
    const commissionAmount = Math.round(totalTransaction * commissionRate / 100);

    try {
      const res = await fetch('/api/hq/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, totalTransaction, commissionRate, commissionAmount }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ partnerId: '', periodStart: '', periodEnd: '', totalTransaction: 0, commissionRate: 0, notes: '' });
        fetchCommissions();
      }
    } catch (err) {
      console.error('Create commission error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus komisi ini?')) return;
    try {
      const res = await fetch(`/api/hq/commissions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCommissions();
    } catch (err) {
      console.error('Delete commission error:', err);
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

  return (
    <HQLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="text-emerald-600" size={28} />
              Komisi Mitra
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kelola komisi dan payout mitra bisnis
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={18} />
            Buat Komisi Baru
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
              <span className="text-sm text-gray-500 dark:text-gray-400">Disetujui</span>
              <CheckCircle size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.totalApproved}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Dibayar</span>
              <DollarSign size={18} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.totalPaid}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary.paidAmount)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Dibatalkan</span>
              <XCircle size={18} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.totalCancelled}</p>
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
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchCommissions(); } }}
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
              <option value="approved">Disetujui</option>
              <option value="paid">Dibayar</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <select
              value={filterPartner}
              onChange={(e) => { setFilterPartner(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">Semua Mitra</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setPage(1); fetchCommissions(); }}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Periode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Transaksi</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={18} className="animate-spin" />
                        Memuat data...
                      </div>
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
                      <p>Tidak ada komisi ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/hq/commissions/${c.id}`} className="text-sm font-mono font-medium text-emerald-600 hover:text-emerald-700">
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{c.partner_name || '-'}</span>
                        </div>
                        {c.partner_code && <span className="text-xs text-gray-400 ml-6">{c.partner_code}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <Calendar size={14} className="text-gray-400" />
                          {c.period_start} s/d {c.period_end}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(Number(c.total_transaction))}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          <Percent size={14} className="text-emerald-500" />
                          {Number(c.commission_rate)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{formatCurrency(Number(c.commission_amount))}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/hq/commissions/${c.id}`}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Detail"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/hq/commissions/${c.id}`}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleDelete(c.id)}
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
                  Buat Komisi Baru
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periode Mulai *</label>
                    <input
                      type="date"
                      value={createForm.periodStart}
                      onChange={(e) => setCreateForm({ ...createForm, periodStart: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periode Akhir *</label>
                    <input
                      type="date"
                      value={createForm.periodEnd}
                      onChange={(e) => setCreateForm({ ...createForm, periodEnd: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Transaksi *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={createForm.totalTransaction}
                    onChange={(e) => setCreateForm({ ...createForm, totalTransaction: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate Komisi (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={createForm.commissionRate}
                    onChange={(e) => setCreateForm({ ...createForm, commissionRate: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {createForm.totalTransaction > 0 && createForm.commissionRate > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Amount komisi: {formatCurrency(Math.round(createForm.totalTransaction * createForm.commissionRate / 100))}
                    </p>
                  )}
                </div>
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
