import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn, getSession } from 'next-auth/react';
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
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

type Props = {
  csrfToken: string;
};

const ESS_FEATURES = [
  { icon: Fingerprint, title: 'Absensi', desc: 'Check-in GPS & riwayat kehadiran' },
  { icon: Calendar, title: 'Cuti & Izin', desc: 'Ajukan dan pantau status cuti' },
  { icon: Wallet, title: 'Slip Gaji', desc: 'Akses payslip bulanan Anda' },
  { icon: FileText, title: 'Klaim', desc: 'Reimbursement & pengajuan biaya' },
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

  return (
    <div className="min-h-screen flex bg-[#050508] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <motion.div
          className="absolute top-[-8%] right-[15%] w-[560px] h-[560px] bg-violet-600/20 rounded-full blur-[130px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.45, 0.3] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-5%] left-[5%] w-[480px] h-[480px] bg-fuchsia-600/15 rounded-full blur-[110px]"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(139,92,246,0.1),_transparent_55%)]" />
      </div>

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative z-10 flex-col justify-between p-12 xl:p-16">
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-200 text-xs mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span>Employee Self-Service · {NAINCODE.name}</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.12] tracking-tight mb-5">
            Portal
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200">
              Karyawan
            </span>
          </h1>

          <p className="text-violet-200/70 text-lg leading-relaxed mb-10">
            Kelola absensi, cuti, slip gaji, dan klaim Anda — kapan saja, di mana saja.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ESS_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm"
              >
                <f.icon className="w-5 h-5 text-violet-300 mb-2" />
                <p className="text-sm font-semibold text-white/90">{f.title}</p>
                <p className="text-xs text-violet-300/50 mt-0.5 leading-snug">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-violet-400/40">
          © {new Date().getFullYear()} {NAINCODE.legalName}
        </p>
      </div>

      {/* Right — login */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-[440px]"
        >
          <div className="lg:hidden mb-8">
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="md"
              variant="full"
              src={HUMANIFY_BRAND.welcomeLogoPath}
              aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              className="rounded-lg"
            />
          </div>

          <div className="relative rounded-3xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-violet-950/30 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-400/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-violet-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Masuk Portal Karyawan</h2>
                  <p className="text-violet-300/55 text-sm">Gunakan akun karyawan perusahaan Anda</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <input type="hidden" name="csrfToken" value={csrfToken} />

                <div>
                  <label className="block text-sm font-medium text-violet-200/80 mb-2">Email karyawan</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50 group-focus-within:text-violet-300 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 outline-none focus:bg-white/[0.08] focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      placeholder="nama@perusahaan.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-violet-200/80 mb-2">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50 group-focus-within:text-violet-300 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-11 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 outline-none focus:bg-white/[0.08] focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      placeholder="Masukkan password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400/50 hover:text-violet-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className="relative w-full mt-2 py-3.5 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk Portal Karyawan
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-3">
                <Link
                  href={HUMANIFY_BRAND.loginPath}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-violet-400/20 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-white/80">Login HR / Admin</p>
                    <p className="text-xs text-violet-300/50 mt-0.5">Untuk tim SDM & manajemen</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-violet-400/50 group-hover:text-violet-300 group-hover:translate-x-0.5 transition-all" />
                </Link>
                <Link
                  href={HUMANIFY_BRAND.welcomePath}
                  className="block text-center text-xs text-violet-400/50 hover:text-violet-300 transition-colors"
                >
                  Kembali ke beranda Humanify
                </Link>
              </div>
            </div>
          </div>

          <p className="lg:hidden text-center text-xs text-violet-400/40 mt-6 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Absensi · Cuti · Slip Gaji · Klaim
          </p>
        </motion.div>
      </div>
    </div>
  );
}
