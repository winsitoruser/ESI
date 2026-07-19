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
        footerVariant="dark"
      >
        <div className="max-w-xl mx-auto px-4 pb-16">
          <Link href="/humanify/partners" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> Partner Channel
          </Link>
          <div className="rounded-2xl bg-white text-slate-900 p-6 sm:p-8 shadow-xl">
            <h1 className="text-2xl font-bold mb-2">Status lead & payout</h1>
            <p className="text-slate-600 text-sm mb-6">
              Masukkan email dan ID lead yang Anda terima saat submit formulir.
            </p>
            <form onSubmit={lookup} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email kontak"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                required
                placeholder="ID lead (UUID)"
                className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--hf-brand-600)] text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
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
