import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import Link from 'next/link';
import {
  DollarSign, ArrowLeft, Building2, Calendar, Percent, Clock, CheckCircle,
  XCircle, Edit3, Save, Trash2, RefreshCw, FileText, User, Phone,
  AlertTriangle, Ban, Wallet, ChevronLeft
} from 'lucide-react';

interface Commission {
  id: string;
  code: string;
  partner_id: string;
  partner_name: string;
  partner_code: string;
  partner_pic: string;
  partner_phone: string;
  period_start: string;
  period_end: string;
  total_transaction: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  paid_by: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const statusColors: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock, label: 'Pending' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: CheckCircle, label: 'Disetujui' },
  paid: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: DollarSign, label: 'Dibayar' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle, label: 'Dibatalkan' },
};

export default function CommissionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchCommission = async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/commissions/${id}`);
      if (res.ok) {
        const json = await res.json();
        setCommission(json.data);
        setEditNotes(json.data?.notes || '');
      }
    } catch (err) {
      console.error('Fetch commission error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && id) fetchCommission();
  }, [mounted, id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!commission) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hq/commissions/${commission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCommission();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Gagal mengubah status');
      }
    } catch (err) {
      console.error('Status change error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!commission) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hq/commissions/${commission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      });
      if (res.ok) {
        setEditMode(false);
        await fetchCommission();
      }
    } catch (err) {
      console.error('Save notes error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!commission) return;
    try {
      const res = await fetch(`/api/hq/commissions/${commission.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/hq/commissions');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <HQLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw size={20} className="animate-spin" />
            Memuat data komisi...
          </div>
        </div>
      </HQLayout>
    );
  }

  if (!commission) {
    return (
      <HQLayout>
        <div className="p-6">
          <div className="text-center py-16">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-3" />
            <h2 className="text-lg font-semibold">Komisi tidak ditemukan</h2>
            <Link href="/hq/commissions" className="text-emerald-600 hover:underline mt-2 inline-block">
              Kembali ke daftar komisi
            </Link>
          </div>
        </div>
      </HQLayout>
    );
  }

  const statusCfg = statusColors[commission.status] || statusColors.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <HQLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Back button */}
        <Link
          href="/hq/commissions"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={16} />
          Kembali ke Daftar Komisi
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${statusCfg.bg} ${statusCfg.border} border`}>
              <DollarSign size={24} className={statusCfg.text} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{commission.code}</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                  <StatusIcon size={14} />
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Dibuat {new Date(commission.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {commission.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Setujui
                </button>
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Ban size={18} />
                  Batalkan
                </button>
              </>
            )}
            {commission.status === 'approved' && (
              <button
                onClick={() => handleStatusChange('paid')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Wallet size={18} />
                Tandai Dibayar
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={commission.status !== 'pending'}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              Hapus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Mitra */}
          <div className="lg:col-span-2 space-y-6">
            {/* Commission Detail Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Detail Komisi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Periode</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {commission.period_start} s/d {commission.period_end}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Total Transaksi</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {formatFullCurrency(Number(commission.total_transaction))}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Rate Komisi</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                    <Percent size={16} className="text-emerald-500" />
                    {Number(commission.commission_rate)}%
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Amount Komisi</label>
                  <p className="text-lg font-bold text-emerald-600 mt-1">
                    {formatFullCurrency(Number(commission.commission_amount))}
                  </p>
                </div>
                {commission.paid_at && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Dibayar Pada</label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(commission.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catatan</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditMode(false); setEditNotes(commission.notes || ''); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <Save size={14} />
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                )}
              </div>
              {editMode ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Tambahkan catatan..."
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {commission.notes || <span className="italic text-gray-400">Tidak ada catatan</span>}
                </p>
              )}
            </div>

            {/* Timeline Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Riwayat Status</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Dibuat</p>
                    <p className="text-xs text-gray-400">
                      {new Date(commission.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {commission.status !== 'pending' && (
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${commission.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'}`}>
                      {commission.status === 'cancelled' ? <XCircle size={14} className="text-red-600" /> : <CheckCircle size={14} className="text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {commission.status === 'cancelled' ? 'Dibatalkan' : 'Disetujui'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(commission.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                {(commission.status === 'paid') && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wallet size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Dibayar</p>
                      <p className="text-xs text-gray-400">
                        {commission.paid_at ? new Date(commission.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Partner Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={16} />
                Informasi Mitra
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Nama Mitra</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{commission.partner_name || '-'}</p>
                </div>
                {commission.partner_code && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Kode</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white mt-1">{commission.partner_code}</p>
                  </div>
                )}
                {commission.partner_pic && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <User size={12} /> PIC
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{commission.partner_pic}</p>
                  </div>
                )}
                {commission.partner_phone && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Phone size={12} /> Telepon
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{commission.partner_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Aksi Cepat</h3>
              <div className="space-y-2">
                <Link
                  href={`/hq/payouts?partnerId=${commission.partner_id}`}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Wallet size={16} className="text-emerald-500" />
                  Buat Payout untuk Mitra Ini
                </Link>
                <Link
                  href={`/hq/commissions?partnerId=${commission.partner_id}`}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FileText size={16} className="text-blue-500" />
                  Lihat Semua Komisi Mitra
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold">Hapus Komisi?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Apakah Anda yakin ingin menghapus komisi <strong>{commission.code}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
