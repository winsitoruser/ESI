import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import { OpsPanel } from '@/components/humanify/OpsPageChrome';
import HumanifyBrandLoader from '@/components/humanify/HumanifyBrandLoader';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function GoLivePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [resending, setResending] = useState(false);
  const [ackingBilling, setAckingBilling] = useState(false);
  const [ackingFlag, setAckingFlag] = useState<string | null>(null);

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
    if (ackingBilling) return;
    setAckingBilling(true);
    try {
      const res = await fetch('/api/humanify/go-live?action=ack-billing', { method: 'POST' });
      const j = await res.json();
      if (j.success) {
        setData(j.data);
        toast.success('Billing checklist dicentang');
      } else toast.error(j.error || 'Gagal');
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setAckingBilling(false);
    }
  }

  async function ackFlag(flag: string, okMessage: string) {
    if (ackingFlag) return;
    setAckingFlag(flag);
    try {
      const res = await fetch('/api/humanify/go-live?action=ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag }),
      });
      const j = await res.json();
      if (j.success) {
        setData(j.data);
        toast.success(okMessage);
      } else toast.error(j.error || 'Gagal');
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setAckingFlag(null);
    }
  }

  async function ackComplete() {
    await ackFlag('completed', 'Checklist go-live ditandai selesai');
  }

  async function resendVerify() {
    setResending(true);
    try {
      const res = await fetch('/api/humanify/email-verify?action=resend', { method: 'POST' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal kirim ulang');
      toast.success(j.message || 'Link verifikasi dikirim');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal kirim ulang verifikasi');
    } finally {
      setResending(false);
    }
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
      <PlatformAccessShell
        current="golive"
        title="Go-live checklist"
        subtitle={`Progress ${data?.score || 0}/${data?.total || 0} (${data?.pct || 0}%)${data?.ready ? ' — siap operasional' : ''}`}
        icon={Rocket}
        score={typeof data?.pct === 'number' ? data.pct : null}
        scoreLabel="Siap"
      >
        <div className="h-2 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
          <div className="h-full bg-[var(--hf-brand-600)] transition-all" style={{ width: `${data?.pct || 0}%` }} />
        </div>

        {data?.ready && data?.pct < 100 && (
          <div className="hf-card p-4">
            <p className="text-sm font-medium text-[color:var(--hf-ink)]">HRIS sudah siap operasional</p>
            <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">
              Item tersisa bersifat rekomendasi (aset, portal karir, atau payroll). Notifikasi setup tidak perlu tetap muncul.
            </p>
            <button
              type="button"
              onClick={ackComplete}
              disabled={Boolean(ackingFlag)}
              className="hf-btn-primary mt-3 text-sm disabled:opacity-50"
            >
              {ackingFlag === 'completed' ? 'Menyimpan…' : 'Tandai checklist selesai'}
            </button>
          </div>
        )}

        <OpsPanel title="Langkah go-live" subtitle="Selesaikan item inti, lalu tandai rekomendasi jika tidak dipakai.">
        <ul className="divide-y divide-[var(--hf-border-subtle)]">
          {(data?.items || []).map((item: any) => (
            <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--hf-success)]" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--hf-ink-faint)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.done ? 'text-[color:var(--hf-ink-secondary)]' : 'text-[color:var(--hf-ink)]'}`}>
                  {item.title}
                </p>
                {item.hint && <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{item.hint}</p>}
                {!item.done && item.id === 'billing_aware' && (
                  <button
                    type="button"
                    onClick={ackBilling}
                    disabled={ackingBilling}
                    className="mt-2 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline disabled:opacity-50"
                  >
                    {ackingBilling ? 'Menyimpan…' : 'Saya sudah cek halaman billing'}
                  </button>
                )}
                {!item.done && item.id === 'email_verified' && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={resendVerify}
                      className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline disabled:opacity-50"
                    >
                      {resending ? 'Mengirim…' : 'Kirim ulang email verifikasi'}
                    </button>
                    <Link href={item.href || '/humanify/verify-email'} className="text-xs text-[color:var(--hf-ink-muted)] hover:underline">
                      Buka halaman verifikasi
                    </Link>
                  </div>
                )}
                {!item.done && item.id === 'careers_ready' && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href={item.href || '/humanify/recruitment?create=1'}
                      className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline"
                    >
                      Tambah lowongan
                    </Link>
                    {data?.careersUrl && (
                      <Link
                        href={data.careersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[color:var(--hf-ink-muted)] hover:underline"
                      >
                        Lihat portal publik
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => ackFlag('careersConfigured', 'Portal karir ditandai selesai')}
                      disabled={Boolean(ackingFlag)}
                      className="text-xs text-[color:var(--hf-ink-muted)] hover:underline disabled:opacity-50"
                    >
                      {ackingFlag === 'careersConfigured' ? 'Menyimpan…' : 'Tidak dipakai sekarang'}
                    </button>
                  </div>
                )}
                {!item.done && item.id === 'asset_inventory' && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link href={item.href} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                      Selesaikan
                    </Link>
                    <button
                      type="button"
                      onClick={() => ackFlag('assetsConfigured', 'Inventori aset ditandai selesai')}
                      disabled={Boolean(ackingFlag)}
                      className="text-xs text-[color:var(--hf-ink-muted)] hover:underline disabled:opacity-50"
                    >
                      {ackingFlag === 'assetsConfigured' ? 'Menyimpan…' : 'Tidak memakai aset'}
                    </button>
                  </div>
                )}
                {!item.done && item.id === 'payroll_ready' && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link href={item.href} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                      Selesaikan
                    </Link>
                    <button
                      type="button"
                      onClick={() => ackFlag('payrollConfigured', 'Payroll ditandai siap')}
                      disabled={Boolean(ackingFlag)}
                      className="text-xs text-[color:var(--hf-ink-muted)] hover:underline disabled:opacity-50"
                    >
                      {ackingFlag === 'payrollConfigured' ? 'Menyimpan…' : 'Sudah diatur di gaji karyawan'}
                    </button>
                  </div>
                )}
                {!item.done && item.id !== 'billing_aware' && item.id !== 'email_verified' && item.id !== 'careers_ready' && item.id !== 'asset_inventory' && item.id !== 'payroll_ready' && (
                  <Link href={item.href} className="mt-2 inline-block text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                    Selesaikan
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
        </OpsPanel>

        {(data?.careersUrl || data?.subdomainHint) && (
          <div className="hf-card space-y-1 p-4 text-sm text-[color:var(--hf-ink-secondary)]">
            {data.careersUrl && (
              <p>
                Portal publik:{' '}
                <Link href={data.careersUrl} className="font-medium text-[color:var(--hf-brand-600)] hover:underline" target="_blank">
                  {data.careersUrl}
                </Link>
                {' · '}
                <Link href="/humanify/recruitment?create=1" className="font-medium text-[color:var(--hf-brand-600)] hover:underline">
                  Kelola lowongan
                </Link>
              </p>
            )}
            {data.subdomainHint && (
              <p className="text-xs text-[color:var(--hf-ink-muted)]">Subdomain (setelah DNS wildcard): {data.subdomainHint}</p>
            )}
          </div>
        )}
      </PlatformAccessShell>
    </HumanifyLayout>
  );
}
