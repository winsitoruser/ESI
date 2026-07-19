import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User, UserPlus } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

interface Preview {
  valid: boolean;
  email?: string;
  role?: string;
  companyName?: string;
  reason?: string;
}

const ROLE_LABELS: Record<string, string> = {
  hq_admin: 'Admin',
  admin: 'Admin',
  manager: 'Manajer',
  staff: 'Staf',
  viewer: 'Viewer',
};

export default function JoinPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) { setChecking(false); return; }
    (async () => {
      try {
        const r = await fetch(`/api/humanify/invitations-accept?token=${encodeURIComponent(token)}`);
        const j = await r.json();
        setPreview(j.data || { valid: false, reason: 'Undangan tidak valid' });
      } catch {
        setPreview({ valid: false, reason: 'Gagal menghubungi server' });
      } finally {
        setChecking(false);
      }
    })();
  }, [router.isReady, token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setStatus('error'); setMessage('Nama wajib diisi'); return; }
    if (password.length < 8) { setStatus('error'); setMessage('Password minimal 8 karakter'); return; }
    if (password !== confirm) { setStatus('error'); setMessage('Konfirmasi password tidak cocok'); return; }
    setStatus('loading');
    try {
      const r = await fetch('/api/humanify/invitations-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });
      const j = await r.json();
      if (j.success) {
        setStatus('ok');
        setMessage('Akun berhasil dibuat. Mengarahkan ke halaman login…');
        setTimeout(() => router.replace('/humanify/login'), 1800);
      } else {
        setStatus('error');
        setMessage(j.error || 'Gagal menerima undangan');
      }
    } catch {
      setStatus('error');
      setMessage('Gagal menghubungi server');
    }
  }

  const invalid = router.isReady && (!token || (preview && !preview.valid));

  return (
    <>
      <Head>
        <title>Terima Undangan · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <HumanifyLogo className="h-10 mb-8" />
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Bergabung ke tim</h1>
            <p className="mt-1.5 text-sm text-slate-500">Buat akun untuk menerima undangan.</p>
          </div>

          {checking ? (
            <div className="mt-8 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa undangan…
            </div>
          ) : invalid ? (
            <div className="mt-6 text-center text-sm text-slate-600 space-y-3">
              <p className="text-red-600">
                {preview?.reason || 'Tautan tidak lengkap — token undangan tidak ditemukan.'}
              </p>
              <Link href="/humanify/login" className="text-indigo-600 underline">
                Kembali ke login
              </Link>
              <p>
                <Link href={HUMANIFY_BRAND.welcomePath} className="text-indigo-600 underline">
                  Pelajari Humanify
                </Link>
              </p>
            </div>
          ) : status === 'ok' ? (
            <div className="mt-6 text-center space-y-3">
              <p className="flex items-center justify-center gap-2 text-emerald-700 text-sm">
                <CheckCircle2 className="w-5 h-5" /> {message}
              </p>
              <Link href="/humanify/login" className="inline-block text-indigo-600 underline text-sm">
                Masuk sekarang
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{preview?.email}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Diundang ke <span className="font-medium text-slate-700">{preview?.companyName}</span>
                  {preview?.role && (
                    <> sebagai <span className="font-medium text-indigo-600">{ROLE_LABELS[preview.role] || preview.role}</span></>
                  )}
                </p>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Anda"
                      required
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
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
                  {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Buat akun &amp; bergabung
                </button>
                <p className="text-center">
                  <Link
                    href="/humanify/login"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
                  >
                    <ArrowLeft className="w-4 h-4" /> Sudah punya akun? Login
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
