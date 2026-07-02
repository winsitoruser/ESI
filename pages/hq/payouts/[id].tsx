import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import Link from 'next/link';
import {
  Wallet, ArrowLeft, Building2, Calendar, Clock, CheckCircle,
  XCircle, Edit3, Save, Trash2, RefreshCw, FileText, User, Phone,
  AlertTriangle, Ban, ChevronLeft, Landmark, Banknote, DollarSign
} from 'lucide-react';

interface Payout {
  id: string;
  code: string;
  partner_id: string;
  partner_name: string;
  partner_code: string;
  partner_pic: string;
  partner_phone: string;
  amount: number;
  method: 'transfer' | 'cash' | 'check' | 'other';
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paid_at: string | null;
  processed_by: string | null;
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
  processing: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: RefreshCw, label: 'Diproses' },
  completed: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle, label: 'Selesai' },
  failed: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle, label: 'Gagal' },
};

const methodLabels: Record<string, string> = {
  transfer: 'Transfer Bank',
  cash: 'Tunai',
  check: 'Cek',
  other: 'Lainnya',
};

export default function PayoutDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchPayout = async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/payouts/${id}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        setPayout(data);
        setEditNotes(data?.notes || '');
        setEditMethod(data?.method || 'transfer');
        setEditBankName(data?.bank_name || '');
        setEditBankAccount(data?.bank_account || '');
        setEditAccountName(data?.account_name || '');
      }
    } catch (err) {
      console.error('Fetch payout error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && id) fetchPayout();
  }, [mounted, id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!payout) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hq/payouts/${payout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchPayout();
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

  const handleSave = async () => {
    if (!payout) return;
    setSaving(true);
    try {
      const body: any = { notes: editNotes, method: editMethod };
      if (editMethod === 'transfer') {
        body.bankName = editBankName;
        body.bankAccount = editBankAccount;
        body.accountName = editAccountName;
      }
      const res = await fetch(`/api/hq/payouts/${payout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditMode(false);
        await fetchPayout();
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!payout) return;
    try {
      const res = await fetch(`/api/hq/payouts/${payout.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/hq/payouts');
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
            Memuat data payout...
          </div>
        </div>
      </HQLayout>
    );
  }

  if (!payout) {
    return (
      <HQLayout>
        <div className="p-6">
          <div className="text-center py-16">
            <Wallet size={48} className="mx-auto text-gray-300 mb-3" />
            <h2 className="text-lg font-semibold">Payout tidak ditemukan</h2>
            <Link href="/hq/payouts" className="text-emerald-600 hover:underline mt-2 inline-block">
              Kembali ke daftar payout
            </Link>
          </div>
        </div>
      </HQLayout>
    );
  }

  const statusCfg = statusColors[payout.status] || statusColors.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <HQLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Back button */}
        <Link
          href="/hq/payouts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={16} />
          Kembali ke Daftar Payout
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${statusCfg.bg} ${statusCfg.border} border`}>
              <Wallet size={24} className={statusCfg.text} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{payout.code}</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                  <StatusIcon size={14} />
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Dibuat {new Date(payout.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {payout.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('processing')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw size={18} />
                  Proses Payout
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Selesaikan
                </button>
              </>
            )}
            {payout.status === 'processing' && (
              <>
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Selesaikan
                </button>
                <button
                  onClick={() => handleStatusChange('failed')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Tandai Gagal
                </button>
              </>
            )}
            {payout.status === 'failed' && (
              <button
                onClick={() => handleStatusChange('processing')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={18} />
                Proses Ulang
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={payout.status === 'completed'}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              Hapus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payout Detail Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detail Payout</h3>
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
                      onClick={() => { setEditMode(false); fetchPayout(); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSave}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metode *</label>
                    <select
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="transfer">Transfer Bank</option>
                      <option value="cash">Tunai</option>
                      <option value="check">Cek</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                  {editMethod === 'transfer' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Bank</label>
                        <input
                          type="text"
                          value={editBankName}
                          onChange={(e) => setEditBankName(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. Rekening</label>
                          <input
                            type="text"
                            value={editBankAccount}
                            onChange={(e) => setEditBankAccount(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atas Nama</label>
                          <input
                            type="text"
                            value={editAccountName}
                            onChange={(e) => setEditAccountName(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Metode Pembayaran</label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                      <Landmark size={16} className="text-gray-400" />
                      {methodLabels[payout.method] || payout.method}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Amount</label>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {formatFullCurrency(Number(payout.amount))}
                    </p>
                  </div>
                  {payout.method === 'transfer' && payout.bank_name && (
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Informasi Bank</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{payout.bank_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {payout.account_name} / {payout.bank_account}
                        </p>
                      </div>
                    </div>
                  )}
                  {payout.paid_at && (
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Dibayar Pada</label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {new Date(payout.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes Display (non-edit mode) */}
            {!editMode && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Catatan</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {payout.notes || <span className="italic text-gray-400">Tidak ada catatan</span>}
                </p>
              </div>
            )}

            {/* Timeline */}
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
                      {new Date(payout.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {(payout.status === 'processing' || payout.status === 'completed' || payout.status === 'failed') && (
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${payout.status === 'processing' ? 'bg-blue-100' : 'bg-blue-100'}`}>
                      <RefreshCw size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Diproses</p>
                      <p className="text-xs text-gray-400">
                        {new Date(payout.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                {payout.status === 'completed' && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Selesai</p>
                      <p className="text-xs text-gray-400">
                        {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </div>
                )}
                {payout.status === 'failed' && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <XCircle size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Gagal</p>
                      <p className="text-xs text-gray-400">
                        {new Date(payout.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Partner Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={16} />
                Informasi Mitra
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Nama Mitra</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payout.partner_name || '-'}</p>
                </div>
                {payout.partner_code && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Kode</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white mt-1">{payout.partner_code}</p>
                  </div>
                )}
                {payout.partner_pic && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <User size={12} /> PIC
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payout.partner_pic}</p>
                  </div>
                )}
                {payout.partner_phone && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Phone size={12} /> Telepon
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payout.partner_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Aksi Cepat</h3>
              <div className="space-y-2">
                <Link
                  href={`/hq/commissions?partnerId=${payout.partner_id}`}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <DollarSign size={16} className="text-emerald-500" />
                  Lihat Komisi Mitra
                </Link>
                <Link
                  href={`/hq/payouts?partnerId=${payout.partner_id}`}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FileText size={16} className="text-blue-500" />
                  Lihat Semua Payout Mitra
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
                <h3 className="text-lg font-bold">Hapus Payout?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Apakah Anda yakin ingin menghapus payout <strong>{payout.code}</strong>? Tindakan ini tidak dapat dibatalkan.
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
