import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
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
import { HUMANIFY_BRAND, HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';

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
    'bg-white border border-[#eee9f1] text-[#35393f] placeholder:text-[#656565]/50 ' +
    'focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.2)]';

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-white text-[#35393f] lg:min-h-screen lg:flex-row">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute left-[15%] top-[-8%] h-[420px] w-[420px] rounded-full bg-[#f6e6ff] blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[5%] h-[360px] w-[360px] rounded-full bg-[#e6deeb]/70 blur-[90px]" />
      </div>

      {/* Left — branding (desktop) */}
      <div className="relative z-10 hidden flex-col justify-between border-r border-[#eee9f1] bg-[#f6e6ff]/40 p-12 lg:flex lg:w-[54%] xl:p-16">
        <Link href={HUMANIFY_BRAND.welcomePath} className="relative h-10 w-36 shrink-0">
          <Image
            src={HUMANIFY_BRAND.marketingLogoPath}
            alt={HUMANIFY_BRAND.name}
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-xl"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#eee9f1] bg-white px-3.5 py-1.5 text-xs font-medium text-[#592277]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Employee Self-Service · {NAINCODE.name}
          </div>

          <h1 className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight xl:text-[2.75rem]">
            Portal Karyawan
            <span className="mt-2 block text-lg font-normal text-[#656565] xl:text-xl">
              untuk organisasi skala enterprise
            </span>
          </h1>

          <p className="mb-10 max-w-md text-base leading-relaxed text-[#656565]">
            Kelola absensi, cuti, slip gaji, dan klaim — aman, terintegrasi, dan dapat diakses kapan saja.
          </p>

          <div className="mb-10 grid grid-cols-2 gap-3">
            {ESS_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                className="group rounded-2xl border border-[#eee9f1] bg-white p-4 transition-all hover:border-[#592277]/30 hover:shadow-sm"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#eee9f1] bg-[#f6e6ff] transition-transform group-hover:scale-105">
                  <f.icon className="h-4 w-4 text-[#592277]" />
                </div>
                <p className="text-sm font-semibold text-[#35393f]">{f.title}</p>
                <p className="mt-0.5 text-xs text-[#656565]">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            {TRUST_BADGES.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs text-[#656565]">
                <b.icon className="h-3.5 w-3.5 text-[#592277]/70" />
                {b.label}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-[#656565]">
          © {new Date().getFullYear()} {NAINCODE.legalName} · {HUMANIFY_BRAND.name} HRIS
        </p>
      </div>

      {/* Form column */}
      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col lg:min-h-0 lg:items-center lg:justify-center lg:p-12">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex w-full max-w-none flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-w-[420px] lg:flex-none lg:p-0"
        >
          <header className="mb-5 lg:hidden">
            <Link href={HUMANIFY_BRAND.welcomePath} className="relative mb-1 block h-8 w-28">
              <Image
                src={HUMANIFY_BRAND.marketingLogoPath}
                alt={HUMANIFY_BRAND.name}
                fill
                className="object-contain object-left"
                priority
              />
            </Link>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#592277]">
              Employee Self-Service
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold leading-tight tracking-tight text-[#35393f]">
              Portal Karyawan
            </h1>
            <p className="mt-1 text-sm leading-snug text-[#656565]">
              Masuk untuk absensi, cuti, slip gaji, dan klaim.
            </p>
          </header>

          <div className="mb-5 grid grid-cols-4 gap-2 lg:hidden">
            {ESS_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#eee9f1] bg-white px-1 py-2.5 shadow-[0_1px_2px_rgba(53,57,63,0.04)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f6e6ff] text-[#592277]">
                  <f.icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="text-center text-[10px] font-semibold leading-tight text-[#35393f]">
                  {f.short}
                </p>
              </div>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-[#eee9f1] bg-white shadow-[0_8px_30px_rgba(53,57,63,0.06)] lg:flex-none lg:rounded-3xl">
            <div className="relative p-5 sm:p-6 lg:p-9">
              <a
                href="#ess-login-email"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-[#35393f]"
              >
                Lompat ke formulir masuk
              </a>
              <div className="mb-5 lg:mb-7">
                <h2 className="text-lg font-bold tracking-tight text-[#35393f] lg:text-xl">
                  Masuk ke akun Anda
                </h2>
                <p className="mt-1 text-sm text-[#656565]">Gunakan kredensial karyawan perusahaan</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                <input type="hidden" name="csrfToken" value={csrfToken} />

                <div>
                  <label
                    htmlFor="ess-login-email"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#656565]"
                  >
                    Email karyawan
                  </label>
                  <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#656565]/70 transition-colors group-focus-within:text-[#592277]" />
                    <input
                      id="ess-login-email"
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
                  <label
                    htmlFor="ess-login-password"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#656565]"
                  >
                    Password
                  </label>
                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#656565]/70 transition-colors group-focus-within:text-[#592277]" />
                    <input
                      id="ess-login-password"
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
                      className="absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#656565] transition-colors hover:text-[#592277]"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading ? 1 : 0.99 }}
                  className="group relative mt-1 min-h-11 w-full overflow-hidden rounded-[10px] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm"
                  style={{ background: HUMANIFY_MARKETING.brand }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <motion.div
                          className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk Portal Karyawan
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-6 space-y-3 border-t border-[#eee9f1] pt-5 lg:mt-8 lg:pt-6">
                <p className="text-center text-sm text-[#656565] lg:text-xs">
                  <Link
                    href="/humanify/forgot-password"
                    className="inline-flex min-h-10 items-center transition-colors hover:text-[#592277]"
                  >
                    Lupa password?
                  </Link>
                </p>
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="group flex min-h-11 items-center justify-between rounded-xl border border-[#eee9f1] bg-[#f6e6ff]/50 p-3.5 transition-all hover:border-[#592277]/30 hover:bg-[#f6e6ff]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#35393f]">Login HR / Admin</p>
                    <p className="mt-0.5 text-xs text-[#656565]">Untuk tim SDM & manajemen</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#656565] transition-all group-hover:translate-x-0.5 group-hover:text-[#592277]" />
                </Link>
                <Link
                  href={HUMANIFY_BRAND.welcomePath}
                  className="flex min-h-10 items-center justify-center text-center text-xs text-[#656565] transition-colors hover:text-[#592277]"
                >
                  Kembali ke beranda Humanify
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#656565] lg:hidden">
            <Clock className="h-3.5 w-3.5" />
            Absensi · Cuti · Slip Gaji · Klaim
          </p>
        </motion.div>
      </div>
    </div>
  );
}
