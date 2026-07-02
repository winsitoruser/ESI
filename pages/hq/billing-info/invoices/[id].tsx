import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HQLayout from '../../../../components/hq/HQLayout';
import PaymentMethodModal from '../../../../components/billing/PaymentMethodModal';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Banknote,
  Copy,
  Receipt,
  Building2,
  CalendarClock,
  FileText,
  Shield,
  PlayCircle,
  Ban,
  Upload,
  Send,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceTransaction {
  id: string;
  provider: string;
  providerTransactionId?: string | null;
  status: string;
  amount: number;
  paymentMethod?: string | null;
  processedAt?: string | null;
  createdAt?: string | null;
}

interface ManualAccount {
  bank: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  paymentProvider: string | null;
  paymentMethod: string | null;
  customerName: string | null;
  customerEmail: string | null;
  notes: string | null;
  metadata: any;
  items: InvoiceItem[];
  paymentTransactions: InvoiceTransaction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d?: string | null) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: 'Lunas', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  sent: { label: 'Menunggu Pembayaran', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  pending: { label: 'Menunggu Pembayaran', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  overdue: { label: 'Jatuh Tempo', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Ban },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: FileText },
  refunded: { label: 'Direfund', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: RefreshCw },
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id, method } = router.query;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ referenceNumber: '', paidAt: '', notes: '', proofUrl: '' });
  const [copyOk, setCopyOk] = useState<string | null>(null);

  const load = async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/billing/invoices/${id}`);
      const j = await res.json();
      if (j.success) {
        setInvoice(j.data);
      } else {
        setError(j.error || 'Gagal memuat invoice');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  // Poll while pending
  useEffect(() => {
    if (!invoice) return;
    const pendingStates = ['sent', 'pending', 'overdue'];
    if (!pendingStates.includes(invoice.status)) return;
    const hasPendingTx = (invoice.paymentTransactions || []).some((t) => t.status === 'pending' || t.status === 'processing');
    if (!hasPendingTx && invoice.status !== 'sent') return;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/hq/billing/invoices/${invoice.id}/status`);
        const j = await res.json();
        if (j?.success && j.data?.status && j.data.status !== invoice.status) {
          load();
        }
      } catch (_) { /* ignore */ }
    }, 8000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.status]);

  const statusMeta = invoice ? (STATUS_META[invoice.status] || STATUS_META.sent) : null;

  const isOverdue = useMemo(() => {
    if (!invoice) return false;
    if (invoice.status === 'overdue') return true;
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    return new Date(invoice.dueDate).getTime() < Date.now();
  }, [invoice]);

  const daysOverdue = useMemo(() => {
    if (!invoice || !isOverdue) return 0;
    const diff = Date.now() - new Date(invoice.dueDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [invoice, isOverdue]);

  const canPay = invoice && ['sent', 'overdue', 'pending', 'draft'].includes(invoice.status);
  const showManual = method === 'manual' || invoice?.paymentProvider === 'manual';
  const manualInstructions = invoice?.metadata?.manualInstructions as {
    uniqueAmount?: number;
    originalAmount?: number;
    invoiceNumber?: string;
    accounts?: ManualAccount[];
    verificationWindowHours?: number;
    note?: string;
  } | undefined;

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopyOk(key);
    setTimeout(() => setCopyOk(null), 2000);
  };

  const handleCancel = async () => {
    if (!invoice) return;
    const reason = prompt('Alasan pembatalan invoice:');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/hq/billing/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const j = await res.json();
      if (j.success) {
        alert('Invoice dibatalkan');
        load();
      } else {
        alert(j.error);
      }
    } catch (e: any) { alert(e.message); }
  };

  const handleConfirmManual = async () => {
    if (!invoice) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/hq/billing/invoices/${invoice.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'bank_transfer',
          referenceNumber: confirmForm.referenceNumber || undefined,
          paidAt: confirmForm.paidAt || undefined,
          notes: confirmForm.notes || undefined,
          proofUrl: confirmForm.proofUrl || undefined
        })
      });
      const j = await res.json();
      if (j.success) {
        alert('Pembayaran dikonfirmasi. Status invoice: LUNAS.');
        setConfirmForm({ referenceNumber: '', paidAt: '', notes: '', proofUrl: '' });
        load();
      } else {
        alert(j.error);
      }
    } catch (e: any) { alert(e.message); }
    finally { setConfirming(false); }
  };

  if (loading) {
    return (
      <HQLayout title="Detail Invoice">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </HQLayout>
    );
  }

  if (error || !invoice) {
    return (
      <HQLayout title="Detail Invoice">
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error || 'Invoice tidak ditemukan'}</p>
          <Link href="/hq/billing-info" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Billing
          </Link>
        </div>
      </HQLayout>
    );
  }

  const StatusIcon = statusMeta!.icon;

  return (
    <HQLayout title={`Invoice ${invoice.invoiceNumber}`} subtitle="Detail tagihan dan riwayat pembayaran">
      <div className="max-w-5xl space-y-6">
        {/* Back + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/hq/billing-info" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Billing
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={`/api/hq/billing/invoices/${invoice.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Unduh / Cetak
            </a>
            {canPay && invoice.status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50"
              >
                <Ban className="w-4 h-4" /> Batalkan
              </button>
            )}
            {canPay && (
              <button
                onClick={() => setPayOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-md"
              >
                <CreditCard className="w-4 h-4" /> {isOverdue ? 'Bayar Sekarang (Jatuh Tempo)' : 'Bayar Sekarang'}
              </button>
            )}
          </div>
        </div>

        {/* Overdue banner */}
        {isOverdue && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800">Invoice sudah jatuh tempo {daysOverdue} hari</p>
              <p className="text-sm text-red-700 mt-0.5">
                Layanan dapat dihentikan jika pembayaran tidak segera diselesaikan. Hubungi support jika Anda butuh perpanjangan jatuh tempo.
              </p>
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className={`px-6 py-5 flex items-center justify-between border-b ${statusMeta!.color.replace('text', 'border').replace('100', '200').split(' ')[0]}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${statusMeta!.color}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Status Invoice</p>
                <p className="text-xl font-bold text-gray-900">{statusMeta!.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Tagihan</p>
              <p className="text-3xl font-bold text-gray-900">{formatIDR(invoice.totalAmount)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            <InfoCell label="No. Invoice" value={invoice.invoiceNumber} />
            <InfoCell label="Tgl. Terbit" value={formatDate(invoice.issuedDate)} />
            <InfoCell label="Jatuh Tempo" value={formatDate(invoice.dueDate)} accent={isOverdue ? 'red' : 'default'} />
            <InfoCell label="Tgl. Bayar" value={invoice.paidDate ? formatDate(invoice.paidDate) : '-'} />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Rincian Item</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Deskripsi</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Qty</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Harga</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Tidak ada item</td></tr>
                )}
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{it.description}</p>
                      <p className="text-xs uppercase tracking-wide text-gray-400 mt-0.5">{it.type}</p>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">{it.quantity}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{formatIDR(it.unitPrice)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatIDR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-right text-gray-500 text-sm">Subtotal</td>
                  <td className="px-6 py-2 text-right font-medium text-gray-900">{formatIDR(invoice.subtotal)}</td>
                </tr>
                {invoice.discountAmount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-right text-green-600 text-sm">Diskon</td>
                    <td className="px-6 py-2 text-right font-medium text-green-600">- {formatIDR(invoice.discountAmount)}</td>
                  </tr>
                )}
                {invoice.taxAmount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-right text-gray-500 text-sm">PPN 11%</td>
                    <td className="px-6 py-2 text-right font-medium text-gray-900">{formatIDR(invoice.taxAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right border-t-2 border-gray-200 font-bold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-right border-t-2 border-gray-200 text-lg font-bold text-blue-700">{formatIDR(invoice.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Manual transfer instructions */}
        {showManual && manualInstructions && invoice.status !== 'paid' && (
          <div className="bg-white rounded-2xl border-2 border-amber-200">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2 rounded-t-2xl">
              <Banknote className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-amber-900">Instruksi Transfer Manual</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Transfer Jumlah Persis</p>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-3xl font-bold text-amber-900">{formatIDR(manualInstructions.uniqueAmount || invoice.totalAmount)}</p>
                  <button
                    onClick={() => handleCopy('amount', String(manualInstructions.uniqueAmount || invoice.totalAmount))}
                    className="inline-flex items-center gap-1 text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-md hover:bg-amber-300"
                  >
                    <Copy className="w-3 h-3" /> {copyOk === 'amount' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <p className="text-xs text-amber-700 mt-1">3 digit terakhir adalah kode unik invoice — WAJIB transfer pas untuk pencocokan otomatis.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Rekening Tujuan</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {(manualInstructions.accounts || []).map((acc, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">Bank {acc.bank}</span>
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-lg font-semibold text-blue-700 tracking-wider">{acc.accountNumber}</span>
                        <button
                          onClick={() => handleCopy(`acc-${idx}`, acc.accountNumber)}
                          className="p-1.5 rounded-md hover:bg-gray-100"
                          title="Salin"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">a.n. {acc.accountName}</p>
                      {copyOk === `acc-${idx}` && <p className="text-xs text-green-600 mt-1">No. rekening tersalin</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {manualInstructions.note || 'Mohon upload bukti transfer agar admin dapat memverifikasi pembayaran Anda dalam 1×24 jam.'}
                </p>
              </div>

              {/* Confirm form */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" /> Konfirmasi Pembayaran Manual
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="No. Referensi / No. Transaksi Bank"
                    value={confirmForm.referenceNumber}
                    onChange={(e) => setConfirmForm({ ...confirmForm, referenceNumber: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="datetime-local"
                    value={confirmForm.paidAt}
                    onChange={(e) => setConfirmForm({ ...confirmForm, paidAt: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    placeholder="URL bukti transfer (opsional)"
                    value={confirmForm.proofUrl}
                    onChange={(e) => setConfirmForm({ ...confirmForm, proofUrl: e.target.value })}
                    className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    placeholder="Catatan tambahan (opsional)"
                    value={confirmForm.notes}
                    onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                    className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleConfirmManual}
                  disabled={confirming}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? <><RefreshCw className="w-4 h-4 animate-spin" /> Mengirim…</> : <><Send className="w-4 h-4" /> Kirim Konfirmasi</>}
                </button>
                <p className="text-xs text-gray-400 mt-2">Admin akan memverifikasi dalam 1×24 jam. Status invoice otomatis berubah ke LUNAS setelah dikonfirmasi.</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment timeline */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Riwayat Pembayaran</h3>
          </div>
          <div className="p-6">
            {invoice.paymentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Belum ada riwayat pembayaran untuk invoice ini</p>
              </div>
            ) : (
              <ol className="relative border-l-2 border-gray-200 ml-3 space-y-5">
                {invoice.paymentTransactions.map((t) => {
                  const color = t.status === 'completed' ? 'bg-green-500' : t.status === 'failed' ? 'bg-red-500' : t.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500';
                  return (
                    <li key={t.id} className="ml-4">
                      <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ${color} ring-4 ring-white`} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">
                            {t.provider} — {t.status}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t.paymentMethod ? `${t.paymentMethod} · ` : ''}
                            {t.providerTransactionId ? `Ref: ${t.providerTransactionId}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatIDR(t.amount)}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(t.processedAt || t.createdAt)}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      <PaymentMethodModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          status: invoice.status
        }}
        onSuccess={({ provider }) => {
          if (provider !== 'manual') setPayOpen(false);
        }}
      />
    </HQLayout>
  );
}

function InfoCell({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'red' }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
