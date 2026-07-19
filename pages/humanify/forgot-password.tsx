import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setDevUrl(null);
    try {
      const r = await fetch('/api/humanify/password-reset?action=request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await r.json();
      if (j.success) {
        setStatus('sent');
        setMessage(j.message || 'Jika email terdaftar, tautan reset telah dikirim.');
        if (j.data?.resetUrl) setDevUrl(j.data.resetUrl);
      } else {
        setStatus('error');
        setMessage(j.error || 'Gagal memproses permintaan');
      }
    } catch {
      setStatus('error');
      setMessage('Gagal menghubungi server');
    }
  }

  return (
    <>
      <Head>
        <title>Lupa Password · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`Reset password akun ${HUMANIFY_BRAND.name} HRIS.`} />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <HumanifyLogo className="h-10 mb-8" />
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Lupa password?</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru.
            </p>
          </div>

          {status === 'sent' ? (
            <div className="mt-6 text-center space-y-4">
              <p className="flex items-center justify-center gap-2 text-emerald-700 text-sm">
                <CheckCircle2 className="w-5 h-5" /> {message}
              </p>
              {devUrl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800 break-all">
                  <p className="font-medium mb-1">Tautan reset (dev / email nonaktif):</p>
                  <Link href={devUrl} className="underline">{devUrl}</Link>
                </div>
              )}
              <Link
                href="/humanify/login"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              {status === 'error' && <p className="text-sm text-red-600">{message}</p>}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Kirim tautan reset
              </button>
              <p className="text-center">
                <Link
                  href="/humanify/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke login
                </Link>
              </p>
              <p className="text-center text-xs text-slate-400">
                Belum punya akun?{' '}
                <Link href={HUMANIFY_BRAND.signupPath} className="text-indigo-600 hover:underline">
                  Daftar trial
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
