import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password minimal 8 karakter');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Konfirmasi password tidak cocok');
      return;
    }
    setStatus('loading');
    try {
      const r = await fetch('/api/humanify/password-reset?action=confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const j = await r.json();
      if (j.success) {
        setStatus('ok');
        setMessage(j.message || 'Password berhasil diperbarui.');
        setTimeout(() => router.replace('/humanify/login'), 1800);
      } else {
        setStatus('error');
        setMessage(j.error || 'Reset gagal');
      }
    } catch {
      setStatus('error');
      setMessage('Gagal menghubungi server');
    }
  }

  const noToken = router.isReady && !token;

  return (
    <>
      <Head>
        <title>Reset Password · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <HumanifyLogo className="h-10 mb-8" />
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Buat password baru</h1>
            <p className="mt-1.5 text-sm text-slate-500">Minimal 8 karakter.</p>
          </div>

          {noToken ? (
            <div className="mt-6 text-center text-sm text-slate-600 space-y-3">
              <p className="text-red-600">Tautan tidak lengkap — token reset tidak ditemukan.</p>
              <Link href="/humanify/forgot-password" className="text-indigo-600 underline">
                Minta tautan reset baru
              </Link>
            </div>
          ) : status === 'ok' ? (
            <div className="mt-6 text-center space-y-3">
              <p className="flex items-center justify-center gap-2 text-emerald-700 text-sm">
                <CheckCircle2 className="w-5 h-5" /> {message}
              </p>
              <p className="text-xs text-slate-400">Mengarahkan ke halaman login…</p>
              <Link href="/humanify/login" className="inline-block text-indigo-600 underline text-sm">
                Masuk sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password baru</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password baru"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ulangi password"
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
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Simpan password baru
              </button>
              <p className="text-center">
                <Link
                  href="/humanify/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
