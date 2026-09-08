import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Clock,
  Calendar,
  Wallet,
  FileText,
  Fingerprint,
  ChevronRight,
  Shield,
  Building2,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

type Props = {
  csrfToken: string;
};

const ESS_FEATURES = [
  { icon: Fingerprint, title: 'Absensi', short: 'Absensi', desc: 'GPS, selfie & geofence' },
  { icon: Calendar, title: 'Cuti & Izin', short: 'Cuti', desc: 'Ajukan & pantau status' },
  { icon: Wallet, title: 'Slip Gaji', short: 'Slip', desc: 'Payslip bulanan aman' },
  { icon: FileText, title: 'Klaim', short: 'Klaim', desc: 'Reimbursement digital' },
] as const;

const TRUST_BADGES = [
  { icon: Shield, label: 'Enkripsi SSL' },
  { icon: Building2, label: 'Enterprise HRIS' },
  { icon: Zap, label: 'Real-time sync' },
] as const;

export default function EmployeePortalLoginForm({ csrfToken }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email dan password wajib diisi');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (result?.error) {
        toast.error('Email atau password salah');
      } else if (result?.ok) {
        toast.success('Selamat datang di Portal Karyawan');
        const callbackUrl = router.query.callbackUrl as string;
        const target =
          callbackUrl && !callbackUrl.includes('/auth/') && !callbackUrl.includes('/employee/login')
            ? callbackUrl
            : HUMANIFY_BRAND.employeePortalPath;
        window.location.href = target;
      }
    } catch {
      toast.error('Gagal masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full min-h-11 pl-11 pr-4 text-base lg:text-sm rounded-xl outline-none transition-all ' +
    'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 ' +
    'focus:border-[color:var(--ep-accent)] focus:ring-2 focus:ring-teal-500/20 ' +
    'lg:bg-white/[0.04] lg:border-white/[0.08] lg:text-white lg:placeholder:text-slate-600 ' +
    'lg:focus:bg-white/[0.06] lg:focus:border-indigo-500/40 lg:focus:ring-indigo-500/15';

  return (
    <div className="min-h-[100dvh] lg:min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] text-slate-900 lg:bg-[#080b14] lg:text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),transparent)]" />
        <motion.div
          className="absolute top-[-5%] right-[10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]"
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] left-[-5%] w-[420px] h-[420px] bg-violet-600/12 rounded-full blur-[100px]"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Left — enterprise branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[54%] relative z-10 flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
        <HumanifyLogo
          href={HUMANIFY_BRAND.welcomePath}
          size="lg"
          variant="full"
          src={HUMANIFY_BRAND.welcomeLogoPath}
          aspect={HUMANIFY_BRAND.welcomeLogoAspect}
          className="rounded-lg"
          priority
        />

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-400/25 bg-indigo-500/10 text-indigo-200 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Employee Self-Service · {NAINCODE.name}
          </div>

          <h1 className="text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight mb-5">
            Portal Karyawan
            <span className="block mt-2 text-lg xl:text-xl font-normal text-slate-400">
              untuk organisasi skala enterprise
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-md">
            Kelola absensi, cuti, slip gaji, dan klaim — aman, terintegrasi, dan dapat diakses kapan saja.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-10">
            {ESS_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                className="group p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-400/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <f.icon className="w-4 h-4 text-indigo-300" />
                </div>
                <p className="text-sm font-semibold text-white/95">{f.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs text-slate-500">
                <b.icon className="w-3.5 h-3.5 text-indigo-400/70" />
                {b.label}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} {NAINCODE.legalName} · {HUMANIFY_BRAND.name} HRIS
        </p>
      </div>

      {/* Form column — phone shell on mobile, card on desktop */}
      <div className="flex-1 relative z-10 flex flex-col lg:items-center lg:justify-center min-h-[100dvh] lg:min-h-0 lg:p-12">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-none lg:max-w-[420px] flex flex-col flex-1 lg:flex-none px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-0"
        >
          <header className="lg:hidden mb-5">
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="sm"
              variant="full"
              src={HUMANIFY_BRAND.welcomeLogoPath}
              aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              className="rounded-md h-8 w-auto"
            />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 mt-3">
              Employee Self-Service
            </p>
            <h1 className="text-[1.65rem] font-bold tracking-tight text-slate-900 leading-tight mt-1">
              Portal Karyawan
            </h1>
            <p className="text-sm text-slate-500 mt-1 leading-snug">
              Masuk untuk absensi, cuti, slip gaji, dan klaim.
            </p>
          </header>

          <div className="lg:hidden grid grid-cols-4 gap-2 mb-5">
            {ESS_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-1 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <f.icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="text-[10px] font-semibold text-slate-700 text-center leading-tight">{f.short}</p>
              </div>
            ))}
          </div>

          <div className="relative flex-1 lg:flex-none rounded-2xl lg:rounded-3xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] lg:border-white/[0.1] lg:bg-white/[0.04] lg:backdrop-blur-2xl lg:shadow-2xl lg:shadow-black/40 overflow-hidden">
            <div className="hidden lg:block absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

            <div className="relative p-5 sm:p-6 lg:p-9">
              <div className="mb-5 lg:mb-7">
                <h2 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 lg:text-white">
                  Masuk ke akun Anda
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gunakan kredensial karyawan perusahaan</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                <input type="hidden" name="csrfToken" value={csrfToken} />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 lg:text-slate-400 mb-2">
                    Email karyawan
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-slate-400 lg:text-slate-500 group-focus-within:text-teal-600 lg:group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      inputMode="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                      placeholder="nama@perusahaan.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 lg:text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-slate-400 lg:text-slate-500 group-focus-within:text-teal-600 lg:group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`${inputClass} pr-12`}
                      placeholder="Masukkan password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 lg:text-slate-500 lg:hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading ? 1 : 0.99 }}
                  className="relative w-full mt-1 min-h-11 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group text-base lg:text-sm"
                >
                  <div className="absolute inset-0 bg-[color:var(--ep-accent)] lg:bg-gradient-to-r lg:from-indigo-600 lg:via-violet-600 lg:to-indigo-600 lg:bg-[length:200%_100%] lg:group-hover:animate-[shimmer_2s_ease_infinite]" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk Portal Karyawan
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-6 lg:mt-8 pt-5 lg:pt-6 border-t border-slate-100 lg:border-white/[0.06] space-y-3">
                <p className="text-center text-sm lg:text-xs text-slate-500">
                  <Link href="/humanify/forgot-password" className="inline-flex min-h-10 items-center hover:text-teal-700 lg:hover:text-indigo-400 transition-colors">
                    Lupa password?
                  </Link>
                </p>
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="flex items-center justify-between min-h-11 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 lg:border-white/[0.06] lg:bg-white/[0.02] lg:hover:bg-white/[0.05] lg:hover:border-indigo-500/20 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 lg:text-slate-300">Login HR / Admin</p>
                    <p className="text-xs text-slate-500 lg:text-slate-600 mt-0.5">Untuk tim SDM & manajemen</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 lg:text-slate-600 group-hover:text-teal-700 lg:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
                <Link
                  href={HUMANIFY_BRAND.welcomePath}
                  className="flex min-h-10 items-center justify-center text-center text-xs text-slate-500 hover:text-teal-700 lg:text-slate-600 lg:hover:text-indigo-400 transition-colors"
                >
                  Kembali ke beranda Humanify
                </Link>
              </div>
            </div>
          </div>

          <p className="lg:hidden text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Absensi · Cuti · Slip Gaji · Klaim
          </p>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
