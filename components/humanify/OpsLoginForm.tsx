import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn, getSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Server, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { isAdminHost, isPlatformOperatorRole } from '@/lib/humanify/ops-host';

type Props = { csrfToken: string };

/**
 * Dedicated login for ops.humanify.id — no tenant signup / SSO / ESS links.
 */
export default function OpsLoginForm({ csrfToken }: Props) {
  const router = useRouter();
  const adminTotal = typeof window !== 'undefined' && isAdminHost(window.location.host);
  const planeName = adminTotal ? 'Admin Total' : 'Platform Ops';
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', totp: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email dan password wajib diisi');
      return;
    }
    if (mfaRequired && !formData.totp) {
      toast.error('Masukkan kode 2FA Anda');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        totp: formData.totp || undefined,
      });
      if (result?.error) {
        const err = String(result.error);
        if (err.includes('MFA_REQUIRED')) {
          setMfaRequired(true);
          toast('Akun ini memakai 2FA — masukkan kode 6 digit', { icon: '🔒' });
        } else if (err.includes('2FA')) {
          setMfaRequired(true);
          toast.error('Kode 2FA salah atau kedaluwarsa');
        } else if (err.toLowerCase().includes('terlalu banyak')) {
          toast.error(err);
        } else {
          toast.error('Email atau password salah');
        }
        return;
      }
      if (!result?.ok) {
        toast.error('Gagal masuk');
        return;
      }

      const session = await getSession();
      const role = (session?.user as any)?.role as string | undefined;
      if (!isPlatformOperatorRole(role)) {
        await signOut({ redirect: false });
        toast.error('Akses Admin Total hanya untuk platform operator (super_admin)');
        return;
      }

      toast.success(adminTotal ? 'Selamat datang di Admin Total' : 'Selamat datang di Platform Ops');
      const callbackUrl = typeof router.query.callbackUrl === 'string' ? router.query.callbackUrl : '';
      const target =
        callbackUrl.startsWith('/platform') || callbackUrl === '/'
          ? callbackUrl === '/'
            ? '/platform'
            : callbackUrl
          : '/platform';
      window.location.href = target;
    } catch {
      toast.error('Gagal masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070b14] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(16,185,129,0.14),transparent)]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[480px] h-[480px] bg-teal-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[-8%] w-[360px] h-[360px] bg-slate-500/10 rounded-full blur-[90px]" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
          <HumanifyLogo
            variant="full"
            size="lg"
            src="/images/humanify_white.png"
            className="rounded-lg"
          />
          <div className="max-w-md">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300/90 mb-6 px-3 py-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10">
              <Shield className="w-3.5 h-3.5" />
              {adminTotal ? 'Admin Total' : 'Control plane'} · {HUMANIFY_BRAND.name}
            </p>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight mb-4">
              {planeName}
              <span className="block mt-2 text-lg font-normal text-slate-400">
                Superadmin seluruh tenant, billing, dan observability
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Hanya <strong className="font-medium text-slate-300">super_admin</strong> platform.
              Portal HR perusahaan dan karyawan tetap di humanify.id.
            </p>
            <div className="space-y-3">
              {[
                { icon: Server, t: 'Tenant & billing control', d: 'Activate, suspend, plan, support' },
                { icon: Activity, t: 'Observability', d: 'Health, errors, email preview' },
                { icon: Shield, t: 'Host-only session', d: 'Cookie tidak berbagi ke humanify.id' },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <Icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/90">{t}</p>
                    <p className="text-xs text-slate-500">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} {NAINCODE.name} · {adminTotal ? 'admin total' : 'ops only'}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <motion.div
            className="w-full max-w-[400px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="lg:hidden mb-8 text-center">
              <HumanifyLogo
                variant="full"
                size="md"
                src="/images/humanify_white.png"
                className="rounded-lg mx-auto"
              />
              <p className="text-xs text-slate-500 mt-2">{planeName}</p>
            </div>

            <div className="rounded-3xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
              <h2 className="text-xl font-bold tracking-tight">
                Masuk sebagai {adminTotal ? 'Admin Total' : 'operator'}
              </h2>
              <p className="text-slate-500 text-sm mt-1 mb-7">
                {adminTotal
                  ? 'Kredensial platform (super_admin) — bukan login HR tenant'
                  : 'Gunakan kredensial platform (super_admin)'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Email operator
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15"
                      placeholder="ops@humanify.id"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData((s) => ({ ...s, password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {mfaRequired && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Kode 2FA
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={formData.totp}
                      onChange={(e) => setFormData((s) => ({ ...s, totp: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm outline-none focus:border-emerald-500/40 tracking-widest"
                      placeholder="000000"
                      maxLength={8}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Memverifikasi…' : `Masuk ke ${planeName}`}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] text-slate-600 leading-relaxed">
                Portal tenant &amp; karyawan tetap di{' '}
                <a href="https://humanify.id" className="text-slate-400 hover:text-emerald-400">
                  humanify.id
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
