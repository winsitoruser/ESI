import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import PublicAuthShell from '@/components/humanify/PublicAuthShell';

export default function VerifyEmailPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    fetch('/api/humanify/email-verify?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setStatus('ok');
          setMessage(j.message || 'Email terverifikasi');
        } else {
          setStatus('error');
          setMessage(j.error || 'Verifikasi gagal');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Gagal menghubungi server');
      });
  }, [router.isReady, token]);

  async function resend() {
    setStatus('loading');
    const r = await fetch('/api/humanify/email-verify?action=resend', { method: 'POST' });
    const j = await r.json();
    if (j.success) {
      setStatus('ok');
      setMessage(j.message + (j.data?.verifyUrl ? ` — ${j.data.verifyUrl}` : ''));
    } else {
      setStatus('error');
      setMessage(j.error || 'Gagal kirim ulang');
    }
  }

  return (
    <>
      <Head>
        <title>Verifikasi Email · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <PublicAuthShell>
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center" style={{ borderColor: 'var(--hf-border)' }}>
          <Mail className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-900">Verifikasi email</h1>
          {status === 'loading' && (
            <p className="mt-4 text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Memproses…
            </p>
          )}
          {status === 'ok' && (
            <div className="mt-4 text-emerald-700 text-sm space-y-3">
              <p className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> {message}
              </p>
              <Link href="/humanify" className="inline-block text-emerald-600 underline">
                Lanjut ke Humanify
              </Link>
            </div>
          )}
          {status === 'error' && (
            <p className="mt-4 text-red-600 text-sm">{message}</p>
          )}
          {status === 'idle' && !token && (
            <div className="mt-4 text-sm text-slate-600 space-y-3">
              <p>Masuk untuk mengirim ulang link verifikasi, atau buka link dari email.</p>
              <button
                type="button"
                onClick={resend}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm"
              >
                Kirim ulang (perlu login)
              </button>
              <p className="space-x-3">
                <Link href="/humanify/login" className="text-emerald-600 underline">Login</Link>
                <span className="text-slate-300">·</span>
                <Link href={HUMANIFY_BRAND.welcomePath} className="text-emerald-600 underline">
                  Pelajari Humanify
                </Link>
              </p>
            </div>
          )}
        </div>
      </PublicAuthShell>
    </>
  );
}
