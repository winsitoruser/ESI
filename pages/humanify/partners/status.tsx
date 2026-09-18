import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

/**
 * Partner self-serve status portal (Wave-55 / MKT-L4-1).
 */
export default function PartnerStatusPage() {
  const [email, setEmail] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);
    try {
      const q = new URLSearchParams({ email: email.trim(), id: id.trim() });
      const res = await fetch(`/api/humanify/partners/status?${q}`);
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Tidak ditemukan');
      setData(j.data);
    } catch (err: any) {
      setError(err.message || 'Gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <HumanifySeoHead
        title={`Status Partner — ${HUMANIFY_BRAND.name}`}
        description="Cek status lead partner channel dan periode komisi / payout Humanify."
        path="/humanify/partners/status"
        robots="noindex, follow"
      />
      <HumanifyMarketingShell
        links={[
          { label: 'Daftar partner', href: '/humanify/partners' },
          { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath },
        ]}
        footerVariant="brand"
      >
        <div className="mx-auto max-w-xl px-4 pb-16 pt-4">
          <Link
            href="/humanify/partners"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#656565] hover:text-[#592277]"
          >
            <ArrowLeft className="h-4 w-4" /> Partner Channel
          </Link>
          <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 text-slate-900 shadow-sm sm:p-8">
            <h1 className="mb-2 text-2xl font-bold text-[#35393f]">Status lead & payout</h1>
            <p className="mb-4 text-sm text-slate-600">
              Masukkan email dan ID lead yang Anda terima saat submit formulir.
            </p>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <strong>Payout jujur:</strong> komisi partner dibayar lewat ledger ops (manual mark-paid).
              Bukan transfer otomatis Midtrans (ADR D-015). Status di bawah = catatan internal, bukan bukti transfer bank.
            </div>
            <form onSubmit={lookup} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email kontak"
                className="w-full rounded-xl border border-[#eee9f1] px-3 py-2.5 text-sm outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.15)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                required
                placeholder="ID lead (UUID)"
                className="w-full rounded-xl border border-[#eee9f1] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.15)]"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#592277] py-2.5 text-sm font-medium text-white hover:bg-[#501f6b] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Cek status
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            {data?.lead && (
              <div className="mt-6 space-y-3 border-t pt-4">
                <p className="text-sm">
                  <span className="text-slate-500">Perusahaan:</span>{' '}
                  <strong>{data.lead.companyName}</strong>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Status lead:</span>{' '}
                  <span className="font-semibold capitalize">{data.lead.status}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Dibuat {data.lead.createdAt ? new Date(data.lead.createdAt).toLocaleString('id-ID') : '—'}
                </p>
                {data.payouts?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold mb-2">Payout / komisi</p>
                    <ul className="text-xs space-y-1 divide-y">
                      {data.payouts.map((p: any) => (
                        <li key={p.id} className="py-2 flex justify-between gap-2">
                          <span>
                            {p.partnerCode} · {p.status}
                            {p.periodFrom ? ` · ${p.periodFrom}→${p.periodTo || ''}` : ''}
                          </span>
                          <span className="font-medium">
                            Rp {Number(p.amountIdr || 0).toLocaleString('id-ID')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </HumanifyMarketingShell>
    </>
  );
}
