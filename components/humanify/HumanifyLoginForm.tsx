import React, { useState, useEffect } from 'react';
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
import { HUMANIFY_BRAND, HUMANIFY_FEATURES, HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';
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
  const [mfaRequired, setMfaRequired] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', totp: '' });
  const [ssoBusy, setSsoBusy] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');

  // Complete SSO handoff after ACS redirect
  useEffect(() => {
    const token = typeof router.query.ssoToken === 'string' ? router.query.ssoToken : '';
    const err = typeof router.query.error === 'string' ? router.query.error : '';
    if (err) toast.error(err);
    if (!token || ssoBusy) return;
    let cancelled = false;
    (async () => {
      setSsoBusy(true);
      setIsLoading(true);
      try {
        const result = await signIn('sso', { redirect: false, token });
        if (cancelled) return;
        if (result?.error) {
          toast.error(result.error || 'SSO gagal');
        } else if (result?.ok) {
          toast.success('Login SSO berhasil');
          const session = await getSession();
          const role = session?.user?.role as string | undefined;
          const callbackUrl = router.query.callbackUrl as string;
          let target = defaultRedirect;
          if (callbackUrl && callbackUrl.startsWith('/')) target = callbackUrl;
          else if (resolveRedirect) target = resolveRedirect(role, session as any);
          else if ((session?.user as any)?.redirectUrl) target = (session?.user as any).redirectUrl;
          router.replace(target);
          return;
        }
      } catch {
        if (!cancelled) toast.error('SSO gagal');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setSsoBusy(false);
          // strip token from URL
          const q = { ...router.query };
          delete q.ssoToken;
          delete q.error;
          router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.ssoToken]);

  const startSso = () => {
    const slug = tenantSlug.trim();
    if (!slug) {
      toast.error('Masukkan slug tenant untuk SSO');
      return;
    }
    window.location.href = `/api/humanify/sso/login?tenant=${encodeURIComponent(slug)}`;
  };

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
        } else if (err.toLowerCase().includes('tidak aktif')) {
          toast.error('Akun Anda tidak aktif. Hubungi administrator.');
        } else {
          toast.error('Email atau password salah');
        }
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
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-white text-[#35393f]">
      {/* Soft purple ambient blurs */}
      <div className="pointer-events-none fixed inset-0">
        <motion.div
          className="absolute top-[-10%] left-[15%] w-[560px] h-[560px] rounded-full blur-[120px]"
          style={{ background: 'rgba(89,34,119,0.08)' }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-8%] right-[8%] w-[480px] h-[480px] rounded-full blur-[100px]"
          style={{ background: 'rgba(89,34,119,0.08)' }}
          animate={{ scale: [1.04, 1, 1.04], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row min-h-screen">
        {/* Left panel — light branding */}
        <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 xl:p-16 bg-[#f6e6ff]/40">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="lg"
              variant="full"
              src={HUMANIFY_BRAND.marketingLogoPath}
              aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-lg"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#eee9f1] bg-white text-[#592277] text-xs mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#592277]" />
              <span>Produk HRIS · {NAINCODE.legalName}</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight mb-5 text-[#35393f]">
              Kelola SDM
              <span
                className="block mt-1 text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${HUMANIFY_MARKETING.brand}, ${HUMANIFY_MARKETING.gradientFrom})`,
                }}
              >
                dengan lebih cerdas
              </span>
            </h1>

            <p className="text-[#656565] text-lg leading-relaxed mb-10">
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
                    className="flex items-center gap-4 p-4 rounded-2xl border border-[#eee9f1] bg-white hover:border-[#592277]/25 hover:shadow-sm transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f6e6ff] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#592277]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#35393f]">{feature.title}</p>
                      <p className="text-xs text-[#656565] mt-0.5">{feature.desc}</p>
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
            className="text-sm text-[#656565]"
          >
            © {new Date().getFullYear()} {NAINCODE.legalName}
          </motion.p>
        </div>

        {/* Right panel — light login card */}
        <div className="relative z-10 flex flex-1 items-start justify-center p-4 pb-10 sm:items-center sm:p-8 lg:p-12">
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
                variant="full"
                src={HUMANIFY_BRAND.marketingLogoPath}
                aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              />
            </div>

              <div className="relative overflow-hidden rounded-3xl border border-[#eee9f1] bg-white shadow-sm">
              <div className="relative p-5 sm:p-8 sm:p-10">
                <a
                  href="#humanify-login-email"
                  className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:left-4 focus:top-4 focus:rounded-lg focus:bg-[#f6e6ff] focus:px-3 focus:py-2 focus:text-sm focus:text-[#592277]"
                >
                  Lompat ke formulir masuk
                </a>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-[#35393f]">Selamat datang</h2>
                  <p className="text-[#656565] text-sm mt-1.5">
                    Masuk ke akun {HUMANIFY_BRAND.name} Anda
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <input type="hidden" name="csrfToken" value={csrfToken} />

                  <div>
                    <label htmlFor="humanify-login-email" className="block text-sm font-medium text-[#35393f] mb-2">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565] group-focus-within:text-[#592277] transition-colors" />
                      <input
                        id="humanify-login-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full min-h-11 pl-11 pr-4 py-3 text-base bg-white border border-[#eee9f1] rounded-xl text-[#35393f] placeholder:text-[#656565]/50 outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.2)] transition-all duration-200"
                        placeholder="nama@perusahaan.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="humanify-login-password" className="block text-sm font-medium text-[#35393f] mb-2">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565] group-focus-within:text-[#592277] transition-colors" />
                      <input
                        id="humanify-login-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full min-h-11 pl-11 pr-12 py-3 text-base bg-white border border-[#eee9f1] rounded-xl text-[#35393f] placeholder:text-[#656565]/50 outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.2)] transition-all duration-200"
                        placeholder="Masukkan password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#656565] transition-colors hover:text-[#592277]"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <Link
                        href="/humanify/forgot-password"
                        className="inline-flex min-h-10 items-center text-xs text-[#592277] transition-colors hover:text-[#501f6b]"
                      >
                        Lupa password?
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-[#eee9f1] bg-[#f6e6ff]/50 p-3">
                    <p className="text-xs text-[#656565]">Atau masuk dengan SSO (SAML)</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label htmlFor="humanify-login-sso-slug" className="sr-only">Slug tenant SSO</label>
                      <input
                        id="humanify-login-sso-slug"
                        type="text"
                        value={tenantSlug}
                        onChange={(e) => setTenantSlug(e.target.value)}
                        placeholder="slug-tenant"
                        className="min-h-11 flex-1 rounded-lg border border-[#eee9f1] bg-white px-3 text-base text-[#35393f] outline-none placeholder:text-[#656565]/50 focus:border-[#592277] sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={startSso}
                        disabled={isLoading}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#592277] px-4 text-sm font-medium text-white hover:bg-[#501f6b] disabled:opacity-50"
                      >
                        SSO
                      </button>
                    </div>
                  </div>

                  {mfaRequired && (
                    <div>
                      <label htmlFor="humanify-login-totp" className="block text-sm font-medium text-[#35393f] mb-2">Kode 2FA</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565] group-focus-within:text-[#592277] transition-colors" />
                        <input
                          id="humanify-login-totp"
                          type="text"
                          name="totp"
                          inputMode="numeric"
                          maxLength={6}
                          autoFocus
                          value={formData.totp}
                          onChange={(e) => setFormData({ ...formData, totp: e.target.value.replace(/\D/g, '') })}
                          className="w-full min-h-11 pl-11 pr-4 py-3 text-base tracking-[0.4em] font-mono bg-white border border-[#eee9f1] rounded-xl text-[#35393f] placeholder:text-[#656565]/50 placeholder:tracking-normal placeholder:font-sans outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.2)] transition-all duration-200"
                          placeholder="Kode 6 digit dari authenticator"
                        />
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="relative mt-2 min-h-11 w-full overflow-hidden rounded-xl py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 group"
                  >
                    <div
                      className="absolute inset-0 transition-opacity group-hover:opacity-95"
                      style={{
                        background: `linear-gradient(90deg, ${HUMANIFY_MARKETING.gradientFrom}, ${HUMANIFY_MARKETING.gradientTo})`,
                      }}
                    />
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

              <div className="mt-8 space-y-3 border-t border-[#eee9f1] pt-6">
                <Link
                  href={HUMANIFY_BRAND.signupPath}
                  className="group flex items-center justify-between rounded-xl border border-[#592277]/25 bg-[#f6e6ff] p-3.5 transition-all hover:bg-[#f0d9ff]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#35393f]">Belum punya akun?</p>
                    <p className="mt-0.5 text-xs text-[#656565]">Daftar trial 14 hari gratis</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#592277] transition-all group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href={HUMANIFY_BRAND.employeeLoginPath}
                  className="group flex items-center justify-between rounded-xl border border-[#eee9f1] bg-white p-3.5 transition-all hover:border-[#592277]/25 hover:bg-[#f6e6ff]/40"
                >
                  <div>
                    <p className="text-sm font-medium text-[#35393f]">Portal Karyawan</p>
                    <p className="mt-0.5 text-xs text-[#656565]">Absensi, cuti & slip gaji</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#656565] transition-all group-hover:translate-x-0.5 group-hover:text-[#592277]" />
                </Link>

                <div className="flex flex-col items-center gap-2 pt-1 text-center text-xs text-[#656565] sm:block">
                  <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <Link href={HUMANIFY_BRAND.welcomePath} className="inline-flex min-h-8 items-center text-[#592277] transition-colors hover:text-[#501f6b]">
                      Pelajari Humanify
                    </Link>
                    <span className="hidden text-[#ccc] sm:inline">·</span>
                    <Link href={HUMANIFY_BRAND.partnersPath} className="inline-flex min-h-8 items-center text-[#592277] transition-colors hover:text-[#501f6b]">
                      Partner
                    </Link>
                    <span className="hidden text-[#ccc] sm:inline">·</span>
                    <Link href={HUMANIFY_BRAND.roiCalculatorPath} className="inline-flex min-h-8 items-center text-[#592277] transition-colors hover:text-[#501f6b]">
                      ROI
                    </Link>
                  </span>
                  <span className="block sm:inline sm:before:mx-2 sm:before:content-['·']">
                    © {new Date().getFullYear()} {NAINCODE.legalName}
                  </span>
                </div>
              </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
