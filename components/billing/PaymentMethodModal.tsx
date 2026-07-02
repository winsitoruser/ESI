import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Banknote,
  QrCode,
  Building2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type PaymentProvider = 'midtrans' | 'xendit' | 'manual';

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate?: string | Date | null;
  status?: string;
}

export interface PaymentMethodOption {
  id: PaymentProvider;
  name: string;
  tagline: string;
  description: string;
  methods: string[];
  icon: React.ElementType;
  color: string;
  feePercent?: number;
  feeFixed?: number;
  isActive: boolean;
  badge?: string;
}

interface Props {
  open: boolean;
  invoice: InvoiceSummary | null;
  onClose: () => void;
  onSuccess?: (result: { invoiceId: string; redirectUrl?: string; provider: PaymentProvider }) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const formatDate = (d?: string | Date | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DEFAULT_METHODS: PaymentMethodOption[] = [
  {
    id: 'midtrans',
    name: 'Midtrans (SNAP)',
    tagline: 'Paling populer di Indonesia',
    description: 'QRIS, Virtual Account (BCA/Mandiri/BNI/BRI/Permata), Kartu Kredit, GoPay, ShopeePay.',
    methods: ['QRIS', 'VA', 'Credit Card', 'E-Wallet'],
    icon: Smartphone,
    color: 'blue',
    feePercent: 0,
    feeFixed: 4500,
    isActive: true,
    badge: 'Rekomendasi',
  },
  {
    id: 'xendit',
    name: 'Xendit Invoice',
    tagline: 'Opsi lengkap cashless',
    description: 'Virtual Account, Kartu Kredit, E-Wallet, Retail (Alfamart/Indomaret), Cicilan.',
    methods: ['VA', 'Credit Card', 'E-Wallet', 'Retail'],
    icon: CreditCard,
    color: 'emerald',
    feePercent: 0,
    feeFixed: 4500,
    isActive: true,
  },
  {
    id: 'manual',
    name: 'Transfer Bank Manual',
    tagline: 'Konfirmasi oleh admin',
    description: 'Transfer ke rekening resmi lalu kirim bukti transfer untuk konfirmasi manual.',
    methods: ['Bank Transfer'],
    icon: Banknote,
    color: 'slate',
    feePercent: 0,
    feeFixed: 0,
    isActive: true,
  },
];

export default function PaymentMethodModal({ open, invoice, onClose, onSuccess }: Props) {
  const [methods, setMethods] = useState<PaymentMethodOption[]>(DEFAULT_METHODS);
  const [provider, setProvider] = useState<PaymentProvider>('midtrans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingMethods(true);
    fetch('/api/hq/billing/payment-methods')
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && Array.isArray(j?.data) && j.data.length > 0) {
          const merged = DEFAULT_METHODS.map((dm) => {
            const fromApi = j.data.find((m: any) => m.id === dm.id);
            if (!fromApi) return { ...dm, isActive: dm.id === 'manual' ? true : false };
            return {
              ...dm,
              isActive: fromApi.isActive !== false,
              feePercent: fromApi.feePercent ?? dm.feePercent,
              feeFixed: fromApi.feeFixed ?? dm.feeFixed,
              badge: fromApi.badge ?? dm.badge,
            };
          });
          setMethods(merged);
          const firstActive = merged.find((m) => m.isActive);
          if (firstActive) setProvider(firstActive.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMethods(false));
  }, [open]);

  const selected = useMemo(() => methods.find((m) => m.id === provider) || methods[0], [methods, provider]);

  const fee = useMemo(() => {
    if (!invoice || !selected) return 0;
    const pct = (selected.feePercent || 0) / 100;
    const fixed = selected.feeFixed || 0;
    return Math.round(invoice.totalAmount * pct + fixed);
  }, [invoice, selected]);

  const grandTotal = (invoice?.totalAmount || 0) + fee;

  const handleConfirm = async () => {
    if (!invoice) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/billing/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          successUrl: `${window.location.origin}/hq/billing-info/payment/success?invoice=${invoice.id}`,
          failureUrl: `${window.location.origin}/hq/billing-info/payment/failure?invoice=${invoice.id}`,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || j?.message || 'Gagal membuat pembayaran');
      }

      const redirectUrl: string | undefined = j.data?.redirectUrl || j.data?.payment?.redirectUrl;
      onSuccess?.({ invoiceId: invoice.id, redirectUrl, provider });

      if (provider === 'manual') {
        window.location.href = `/hq/billing-info/invoices/${invoice.id}?method=manual`;
        return;
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      window.location.href = `/hq/billing-info/invoices/${invoice.id}`;
    } catch (e: any) {
      setError(e?.message || 'Terjadi kesalahan pembayaran');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !invoice) return null;

  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const isOverdue = dueDate ? dueDate.getTime() < Date.now() : invoice.status === 'overdue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pilih Metode Pembayaran</h3>
            <p className="text-xs text-gray-500">Invoice {invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Invoice Summary */}
          <div className={`rounded-xl border p-4 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                Total Tagihan
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> Jatuh Tempo
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-2xl font-bold text-gray-900">{formatIDR(invoice.totalAmount)}</p>
              <p className={`text-xs ${isOverdue ? 'text-red-700' : 'text-gray-500'}`}>
                Jatuh tempo: {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Method picker */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 inline-block">Metode Pembayaran</label>
            {loadingMethods && (
              <div className="text-xs text-gray-500 mb-2 inline-flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memuat metode aktif…
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = provider === m.id;
                const disabled = !m.isActive;
                const colorClasses: Record<string, string> = {
                  blue: 'border-blue-500 ring-blue-100 bg-blue-50',
                  emerald: 'border-emerald-500 ring-emerald-100 bg-emerald-50',
                  slate: 'border-slate-500 ring-slate-100 bg-slate-50',
                };
                return (
                  <button
                    type="button"
                    key={m.id}
                    disabled={disabled}
                    onClick={() => !disabled && setProvider(m.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ring-4 ring-transparent ${
                      active ? colorClasses[m.color] : 'border-gray-200 hover:border-gray-300 bg-white'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl flex-shrink-0 ${
                          m.color === 'blue'
                            ? 'bg-blue-100 text-blue-700'
                            : m.color === 'emerald'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-semibold text-gray-900">{m.name}</span>
                          {m.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full">
                              {m.badge}
                            </span>
                          )}
                          {disabled && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 rounded-full">
                              Belum dikonfigurasi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{m.tagline}</p>
                        <p className="text-xs text-gray-600 mt-1">{m.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.methods.map((x) => (
                            <span key={x} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-white border border-gray-200 text-gray-600 rounded-full">
                              {x === 'QRIS' && <QrCode className="w-3 h-3" />}
                              {x === 'VA' && <Building2 className="w-3 h-3" />}
                              {x === 'Credit Card' && <CreditCard className="w-3 h-3" />}
                              {x === 'Bank Transfer' && <Banknote className="w-3 h-3" />}
                              {x}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {active ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Pembayaran aman dengan enkripsi. Kami tidak menyimpan data kartu/rekening Anda. Proses verifikasi dilakukan langsung oleh payment gateway resmi.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="text-gray-500">
              <p className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Biaya {selected?.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected?.feePercent ? `${selected.feePercent}% + ` : ''}
                {formatIDR(selected?.feeFixed || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total bayar</p>
              <p className="text-xl font-bold text-gray-900">{formatIDR(grandTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !selected?.isActive}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memproses…
                </>
              ) : (
                <>
                  Lanjut Bayar <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          {provider === 'manual' && (
            <p className="text-[11px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Untuk transfer manual, lakukan transfer & upload bukti untuk verifikasi admin (1×24 jam).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
