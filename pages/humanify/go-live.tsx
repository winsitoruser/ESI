import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HumanifyBrandLoader from '@/components/humanify/HumanifyBrandLoader';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function GoLivePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/go-live');
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setData(j.data);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat checklist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/go-live`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  async function ackBilling() {
    const res = await fetch('/api/humanify/go-live?action=ack-billing', { method: 'POST' });
    const j = await res.json();
    if (j.success) {
      setData(j.data);
      toast.success('Billing checklist dicentang');
    } else toast.error(j.error || 'Gagal');
  }

  if (status === 'loading' || loading) {
    return <HumanifyBrandLoader variant="boot" message="Memuat checklist go-live…" />;
  }

  return (
    <HumanifyLayout title="Go-live Checklist">
      <Head>
        <title>Go-live · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Phase 7 · GA</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-indigo-600" /> Go-live checklist
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Progress {data?.score}/{data?.total} ({data?.pct}%)
            {data?.ready ? ' — siap operasional' : ''}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${data?.pct || 0}%` }} />
          </div>
        </div>

        <ul className="rounded-2xl border bg-white divide-y">
          {(data?.items || []).map((item: any) => (
            <li key={item.id} className="px-5 py-4 flex items-start gap-3">
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'text-slate-700' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                {item.hint && <p className="text-xs text-slate-500 mt-0.5">{item.hint}</p>}
                {!item.done && item.id === 'billing_aware' && (
                  <button
                    type="button"
                    onClick={ackBilling}
                    className="mt-2 text-xs text-indigo-600 underline"
                  >
                    Saya sudah cek halaman billing
                  </button>
                )}
                {!item.done && item.id !== 'billing_aware' && (
                  <Link href={item.href} className="mt-2 inline-block text-xs text-indigo-600 underline">
                    Selesaikan
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>

        {(data?.careersUrl || data?.subdomainHint) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
            {data.careersUrl && (
              <p>
                Careers:{' '}
                <Link href={data.careersUrl} className="text-indigo-600 underline" target="_blank">
                  {data.careersUrl}
                </Link>
              </p>
            )}
            {data.subdomainHint && (
              <p className="text-xs text-slate-500">Subdomain (setelah DNS wildcard): {data.subdomainHint}</p>
            )}
          </div>
        )}
      </div>
    </HumanifyLayout>
  );
}
