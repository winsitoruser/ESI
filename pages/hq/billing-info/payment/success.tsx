import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HQLayout from '../../../../components/hq/HQLayout';
import { CheckCircle, ArrowRight, RefreshCw, Clock, AlertTriangle, Receipt, Download } from 'lucide-react';

interface PollResponse {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  paidDate?: string | null;
  latestTransaction?: {
    provider: string;
    status: string;
    paymentMethod?: string | null;
    providerTransactionId?: string | null;
    processedAt?: string | null;
  } | null;
}

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export default function PaymentSuccessPage() {
  const router = useRouter();
  const invoiceId = router.query.invoice as string | undefined;
  const [data, setData] = useState<PollResponse | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/hq/billing/invoices/${invoiceId}/status`);
        const j = await res.json();
        if (cancelled) return;
        if (j?.success) {
          setData(j.data);
          if (j.data?.status === 'paid') return;
        } else {
          setError(j?.error || 'Gagal memuat status invoice');
        }
      } catch (e: any) {
        setError(e?.message || 'Gagal menghubungi server');
      }
      setAttempt((a) => a + 1);
      if (!cancelled) {
        timerRef.current = window.setTimeout(poll, Math.min(15000, 3000 + attempt * 1500));
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const status = data?.status;
  const isPaid = status === 'paid';
  const isPending = status === 'sent' || status === 'pending';
  const isFailed = status === 'cancelled' || status === 'overdue';

  const tx = data?.latestTransaction;

  return (
    <HQLayout title="Status Pembayaran">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 sm:p-10">
        {/* Icon */}
        <div className="text-center">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              isPaid ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-blue-100'
            }`}
          >
            {isPaid ? (
              <CheckCircle className="w-11 h-11 text-green-600" />
            ) : isFailed ? (
              <AlertTriangle className="w-11 h-11 text-red-600" />
            ) : (
              <RefreshCw className="w-11 h-11 text-blue-600 animate-spin" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {isPaid
              ? 'Pembayaran Berhasil'
              : isFailed
              ? 'Pembayaran Belum Selesai'
              : 'Memverifikasi Pembayaran…'}
          </h2>
          <p className="text-gray-500 mt-1">
            {isPaid
              ? 'Terima kasih! Langganan Anda sudah aktif.'
              : isFailed
              ? 'Invoice tercatat belum lunas. Anda masih bisa mencoba kembali.'
              : 'Menunggu konfirmasi dari payment gateway. Biasanya kurang dari 1 menit.'}
          </p>
        </div>

        {/* Details */}
        {data && (
          <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Ringkasan</span>
            </div>
            <dl className="px-5 py-4 text-sm divide-y divide-gray-100">
              <div className="py-2 flex justify-between">
                <dt className="text-gray-500">No. Invoice</dt>
                <dd className="font-semibold text-gray-900">{data.invoiceNumber}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-gray-500">Total Bayar</dt>
                <dd className="font-semibold text-gray-900">{formatIDR(data.totalAmount)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className={`font-semibold ${isPaid ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-blue-600'}`}>
                  {isPaid ? 'LUNAS' : isPending ? 'MENUNGGU' : data.status?.toUpperCase()}
                </dd>
              </div>
              {tx?.paymentMethod && (
                <div className="py-2 flex justify-between">
                  <dt className="text-gray-500">Metode</dt>
                  <dd className="font-medium text-gray-900 uppercase">{tx.paymentMethod}</dd>
                </div>
              )}
              {tx?.providerTransactionId && (
                <div className="py-2 flex justify-between">
                  <dt className="text-gray-500">Ref. Transaksi</dt>
                  <dd className="font-mono text-xs text-gray-700">{tx.providerTransactionId}</dd>
                </div>
              )}
              {data.paidDate && (
                <div className="py-2 flex justify-between">
                  <dt className="text-gray-500">Tgl. Bayar</dt>
                  <dd className="font-medium text-gray-900">{new Date(data.paidDate).toLocaleString('id-ID')}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {isPending && (
          <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Halaman ini akan otomatis memperbarui status. Anda boleh menutupnya — kami akan mengirim notifikasi via email saat pembayaran terkonfirmasi.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {data && (
            <a
              href={`/api/hq/billing/invoices/${data.invoiceId}/download`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold inline-flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              <Download className="w-4 h-4" /> Unduh Invoice
            </a>
          )}
          <Link
            href={data?.invoiceId ? `/hq/billing-info/invoices/${data.invoiceId}` : '/hq/billing-info'}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-700"
          >
            Lihat Detail <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/hq/dashboard"
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold inline-flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            Ke Dashboard
          </Link>
        </div>
      </div>
    </HQLayout>
  );
}
