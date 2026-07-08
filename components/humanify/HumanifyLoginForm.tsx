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
  Users,
  Clock,
  DollarSign,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HUMANIFY_BRAND, HUMANIFY_FEATURES, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

type Props = {
  csrfToken: string;
  /** Default setelah login jika tidak ada callbackUrl */
  defaultRedirect?: string;
  resolveRedirect?: (role: string | undefined, session: Record<string, unknown> | null) => string;
};

const HIGHLIGHT_ICONS = [Users, Clock, DollarSign];

export default function HumanifyLoginForm({
  csrfToken,
  defaultRedirect = HUMANIFY_BRAND.appPath,
  resolveRedirect,
}: Props) {
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
        toast.success('Selamat datang di Humanify');
        const session = await getSession();
        const role = session?.user?.role as string | undefined;
        const callbackUrl = router.query.callbackUrl as string;
        let target = defaultRedirect;
        if (callbackUrl && !callbackUrl.includes('/auth/') && !callbackUrl.includes('/humanify/login')) {
          target = callbackUrl;
        } else if (resolveRedirect) {
          target = resolveRedirect(role, session as Record<string, unknown> | null);
        } else if ((session as { redirectUrl?: string })?.redirectUrl) {
          const ru = (session as { redirectUrl?: string }).redirectUrl!;
          target = ru.startsWith('/humanify') ? ru : defaultRedirect;
        }
        window.location.href = target;
      }
    } catch {
      toast.error('Gagal masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0812] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <motion.div
          className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-violet-600/25 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-5%] right-[10%] w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[100px]"
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.08),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative z-10 flex-col justify-between p-12 xl:p-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <HumanifyLogo
            href={HUMANIFY_BRAND.welcomePath}
            size="lg"
            variant="withText"
            priority
            textClassName="font-bold text-xl tracking-tight text-white"
            subtitleClassName="text-[11px] uppercase tracking-widest text-violet-300/70 font-medium"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-200 text-xs mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span>Produk HRIS · {NAINCODE.legalName}</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight mb-5">
            Kelola SDM
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200">
              dengan lebih cerdas
            </span>
          </h1>

          <p className="text-violet-200/75 text-lg leading-relaxed mb-10">
            {HUMANIFY_BRAND.description}
          </p>

          <div className="space-y-3">
            {HUMANIFY_FEATURES.slice(0, 3).map((feature, i) => {
              const Icon = HIGHLIGHT_ICONS[i] || Users;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-violet-400/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-violet-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white/90">{feature.title}</p>
                    <p className="text-xs text-violet-300/60 mt-0.5">{feature.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-violet-400/40"
        >
          © {new Date().getFullYear()} {NAINCODE.legalName}
        </motion.p>
      </div>

      {/* Right panel — glass login */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="md"
              variant="withText"
              textClassName="font-bold text-lg tracking-tight text-white"
              subtitleClassName="text-[10px] uppercase tracking-widest text-violet-300/70"
            />
          </div>

          {/* Glass card */}
          <div className="relative rounded-3xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-violet-900/20 overflow-hidden">
            {/* Top shine */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative p-8 sm:p-10">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Selamat datang</h2>
                <p className="text-violet-300/60 text-sm mt-1.5">
                  Masuk ke akun {HUMANIFY_BRAND.name} Anda
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <input type="hidden" name="csrfToken" value={csrfToken} />

                <div>
                  <label className="block text-sm font-medium text-violet-200/80 mb-2">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50 group-focus-within:text-violet-300 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 outline-none focus:bg-white/[0.08] focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
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
                      className="w-full pl-11 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 outline-none focus:bg-white/[0.08] focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
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
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-opacity group-hover:opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        Masuk ke Humanify
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-3">
                <Link
                  href={HUMANIFY_BRAND.employeePortalPath}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-violet-400/20 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-white/80">Portal Karyawan</p>
                    <p className="text-xs text-violet-300/50 mt-0.5">Absensi, cuti & slip gaji</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-violet-400/50 group-hover:text-violet-300 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <p className="text-center text-xs text-violet-400/40 pt-1">
                  <Link href={HUMANIFY_BRAND.welcomePath} className="hover:text-violet-300/70 transition-colors">
                    Pelajari Humanify
                  </Link>
                  <span className="mx-2">·</span>
                  © {new Date().getFullYear()} {NAINCODE.legalName}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
