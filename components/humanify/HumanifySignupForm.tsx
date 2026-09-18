import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, Phone, Sparkles, ChevronRight, CheckCircle2, Shield, Users, Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HUMANIFY_BRAND, HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import HumanifyBrandLoader from '@/components/humanify/HumanifyBrandLoader';

const INDUSTRIES = [
  { value: 'professional_services', label: 'Jasa Profesional' },
  { value: 'software_house', label: 'Teknologi / IT' },
  { value: 'manufacturing', label: 'Manufaktur' },
  { value: 'retail_general', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'health', label: 'Kesehatan' },
  { value: 'other', label: 'Lainnya' },
];

const EMPLOYEE_RANGES = [
  { value: '1-50', label: '1 – 50 karyawan' },
  { value: '51-200', label: '51 – 200 karyawan' },
  { value: '201-500', label: '201 – 500 karyawan' },
  { value: '500+', label: '500+ karyawan' },
];

const FEATURES = [
  { icon: Shield, title: 'Standar Enterprise', desc: 'Keamanan data dan kontrol akses granular' },
  { icon: Users, title: 'People First', desc: 'Desain intuitif untuk HR dan karyawan' },
  { icon: Target, title: 'Otomatisasi Akurat', desc: 'Payroll, PPh 21, dan BPJS tanpa salah hitung' },
];

export default function HumanifySignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    industry: 'professional_services',
    employeeRange: '1-50',
    acceptTerms: false,
    partnerCode: '',
  });

  React.useEffect(() => {
    if (!router.isReady) return;
    const ref = String(router.query.ref || router.query.partner || '');
    if (ref) setForm((f) => ({ ...f, partnerCode: ref.toUpperCase() }));
    const plan = String(router.query.plan || '').toLowerCase();
    if (plan && ['starter', 'growth', 'enterprise'].includes(plan)) {
      try { sessionStorage.setItem('humanify.intendedPlan', plan); } catch { /* ignore */ }
    }
  }, [router.isReady, router.query.ref, router.query.partner, router.query.plan]);

  const update = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.companyName || !form.password) {
      toast.error('Lengkapi semua field wajib');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    if (!form.acceptTerms) {
      toast.error('Anda harus menyetujui syarat layanan');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/humanify/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyName: form.companyName,
          phone: form.phone || undefined,
          password: form.password,
          industry: form.industry,
          employeeRange: form.employeeRange,
          partnerCode: form.partnerCode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Registrasi gagal');
      }

      toast.success(
        json.data?.verification?.emailed
          ? 'Akun dibuat! Cek inbox (dan folder spam) untuk verifikasi email.'
          : 'Akun dibuat. Email verifikasi belum terkirim — kirim ulang dari wizard setup setelah login.'
      );

      const login = await signIn('credentials', {
        redirect: false,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (login?.ok) {
        setRedirecting(true);
        await new Promise((r) => setTimeout(r, 700));
        window.location.href = json.data?.redirectTo || HUMANIFY_BRAND.setupPath;
        return;
      }

      router.push(HUMANIFY_BRAND.loginPath);
    } catch (err: any) {
      toast.error(err.message || 'Registrasi gagal');
      setLoading(false);
    }
  };

  if (redirecting) {
    return <HumanifyBrandLoader variant="signup" />;
  }

  const inputCls =
    'w-full min-h-11 pl-11 pr-4 py-3 text-base bg-white border border-[#eee9f1] rounded-xl text-[#35393f] placeholder:text-[#656565]/50 outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.2)] transition-all';

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-white text-[#35393f]">
      {/* Soft purple ambient blurs */}
      <div className="pointer-events-none fixed inset-0 hidden lg:block">
        <div
          className="absolute top-[-10%] left-[-5%] w-[560px] h-[560px] rounded-full blur-[120px]"
          style={{ background: 'rgba(89,34,119,0.08)' }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[520px] h-[520px] rounded-full blur-[120px]"
          style={{ background: 'rgba(89,34,119,0.08)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row min-h-screen">
        {/* Left Side: light branding */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-12 lg:p-16 relative bg-[#f6e6ff]/40">
          <div>
            <HumanifyLogo
              href={HUMANIFY_BRAND.welcomePath}
              size="lg"
              variant="full"
              src={HUMANIFY_BRAND.marketingLogoPath}
              aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              priority
            />
            <h1 className="text-4xl lg:text-5xl font-semibold mt-20 leading-[1.15] tracking-tight text-[#35393f]">
              Transformasi HRIS <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${HUMANIFY_MARKETING.brand}, ${HUMANIFY_MARKETING.gradientFrom})`,
                }}
              >
                untuk tim modern.
              </span>
            </h1>
            <p className="mt-6 text-lg text-[#656565] max-w-md leading-relaxed">
              Bergabung dengan puluhan perusahaan yang telah memodernisasi manajemen SDM, kehadiran, dan payroll dengan satu platform tangguh.
            </p>
          </div>

          <div className="space-y-6 mt-12">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-4 rounded-2xl border border-[#eee9f1] bg-white">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f6e6ff] border border-[#eee9f1]">
                  <feature.icon className="w-5 h-5 text-[#592277]" />
                </div>
                <div>
                  <p className="font-semibold text-[#35393f] text-base">{feature.title}</p>
                  <p className="text-sm text-[#656565] mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-sm text-[#656565]">
            © {new Date().getFullYear()} {NAINCODE.legalName}
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="relative flex flex-1 flex-col justify-start p-4 pb-10 sm:p-8 lg:justify-center lg:p-12 xl:p-16">
          <div className="absolute inset-0 hidden border-l border-[#eee9f1] bg-white lg:block" />

          <div className="relative z-10 mx-auto w-full max-w-xl lg:mx-0 lg:ml-auto">
            {/* Mobile Logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <HumanifyLogo
                href={HUMANIFY_BRAND.welcomePath}
                size="md"
                variant="full"
                src={HUMANIFY_BRAND.marketingLogoPath}
                aspect={HUMANIFY_BRAND.welcomeLogoAspect}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-[#eee9f1] bg-white p-5 shadow-sm sm:p-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#eee9f1] bg-[#f6e6ff] text-[#592277] text-xs mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#592277]" />
                Trial 14 hari · Tanpa kartu kredit
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#35393f] tracking-tight">Daftar Humanify</h2>
              <p className="text-[#656565] text-sm sm:text-base mb-10">
                Buat workspace HRIS untuk perusahaan Anda dalam hitungan menit.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Nama lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                      <input className={inputCls} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nama Anda" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Email kerja</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                      <input type="email" className={inputCls} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="nama@perusahaan.com" required />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#35393f] mb-2">Nama perusahaan</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                    <input className={inputCls} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="PT Contoh Indonesia" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Industri</label>
                    <select
                      className={`${inputCls} pl-4 appearance-none`}
                      value={form.industry}
                      onChange={(e) => update('industry', e.target.value)}
                    >
                      {INDUSTRIES.map((i) => (
                        <option key={i.value} value={i.value} className="bg-white text-[#35393f]">{i.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Ukuran tim</label>
                    <select
                      className={`${inputCls} pl-4 appearance-none`}
                      value={form.employeeRange}
                      onChange={(e) => update('employeeRange', e.target.value)}
                    >
                      {EMPLOYEE_RANGES.map((i) => (
                        <option key={i.value} value={i.value} className="bg-white text-[#35393f]">{i.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Kode partner (opsional)</label>
                    <input
                      className={`${inputCls} pl-4 uppercase`}
                      value={form.partnerCode}
                      onChange={(e) => update('partnerCode', e.target.value.toUpperCase())}
                      placeholder="REF-XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Telepon (opsional)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                      <input className={inputCls} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`${inputCls} pr-12`}
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        placeholder="Min. 8 karakter"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[#656565] hover:text-[#592277]"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#35393f] mb-2">Konfirmasi password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#656565]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={inputCls}
                        value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)}
                        placeholder="Ulangi password"
                        required
                      />
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 pt-2 text-xs text-[#656565]">
                  <span className="inline-flex min-h-11 min-w-11 items-start justify-center pt-0.5">
                    <input
                      type="checkbox"
                      checked={form.acceptTerms}
                      onChange={(e) => update('acceptTerms', e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded border-[#eee9f1] bg-white text-[#592277] checked:border-[#592277] checked:bg-[#592277] focus:ring-[#592277]/30"
                    />
                  </span>
                  <span className="pt-2">
                    Saya setuju dengan syarat layanan Humanify dan kebijakan privasi {NAINCODE.legalName}.
                  </span>
                </label>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="relative w-full mt-4 py-4 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-50 transition-shadow"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, ${HUMANIFY_MARKETING.gradientFrom}, ${HUMANIFY_MARKETING.gradientTo})`,
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? 'Membuat akun...' : (
                      <>
                        Mulai trial gratis
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm text-[#656565]">
                <span>
                  Sudah punya akun?{' '}
                  <Link href={HUMANIFY_BRAND.loginPath} className="font-medium text-[#592277] transition-colors hover:text-[#501f6b]">
                    Masuk di sini
                  </Link>
                </span>
                <Link href={HUMANIFY_BRAND.partnersPath} className="font-medium text-[#592277] transition-colors hover:text-[#501f6b]">
                  Channel partner
                </Link>
                <Link href={HUMANIFY_BRAND.roiCalculatorPath} className="font-medium text-[#592277] transition-colors hover:text-[#501f6b]">
                  Kalkulator ROI
                </Link>
              </p>

              <div className="mt-6 flex justify-center lg:hidden">
                <Link
                  href={HUMANIFY_BRAND.welcomePath}
                  className="flex items-center gap-1 text-xs text-[#656565] hover:text-[#592277] transition-colors"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  Kembali ke beranda
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
