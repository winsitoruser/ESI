import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, Phone, Sparkles, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

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

export default function HumanifySignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
  });

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
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Registrasi gagal');
      }

      toast.success(
        json.data?.verification?.emailed
          ? 'Akun dibuat! Cek email untuk verifikasi.'
          : 'Akun dibuat! Membuka wizard setup...',
      );

      const login = await signIn('credentials', {
        redirect: false,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (login?.ok) {
        window.location.href = json.data?.redirectTo || HUMANIFY_BRAND.setupPath;
        return;
      }

      router.push(HUMANIFY_BRAND.loginPath);
    } catch (err: any) {
      toast.error(err.message || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 outline-none focus:bg-white/[0.08] focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all';

  return (
    <div className="min-h-screen flex bg-[#0a0812] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] right-[15%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[5%] w-[450px] h-[450px] bg-fuchsia-600/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-10 flex flex-col">
        <HumanifyLogo
          href={HUMANIFY_BRAND.welcomePath}
          size="md"
          variant="full"
          src={HUMANIFY_BRAND.welcomeLogoPath}
          aspect={HUMANIFY_BRAND.welcomeLogoAspect}
          className="mb-8"
        />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-200 text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Trial 14 hari · Tanpa kartu kredit
          </div>
          <h1 className="text-2xl font-bold mb-1">Daftar Humanify</h1>
          <p className="text-violet-200/60 text-sm mb-8">
            Buat workspace HRIS untuk perusahaan Anda dalam hitungan menit.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Nama lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
                <input className={inputCls} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nama Anda" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Email kerja</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
                <input type="email" className={inputCls} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="nama@perusahaan.com" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Nama perusahaan</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
                <input className={inputCls} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="PT Contoh Indonesia" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-violet-200/80 mb-2">Industri</label>
                <select
                  className={`${inputCls} pl-4`}
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value} className="bg-slate-900">{i.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200/80 mb-2">Ukuran tim</label>
                <select
                  className={`${inputCls} pl-4`}
                  value={form.employeeRange}
                  onChange={(e) => update('employeeRange', e.target.value)}
                >
                  {EMPLOYEE_RANGES.map((i) => (
                    <option key={i.value} value={i.value} className="bg-slate-900">{i.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Telepon (opsional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
                <input className={inputCls} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputCls} pr-12`}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 karakter"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400/50 hover:text-violet-200">
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-200/80 mb-2">Konfirmasi password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-violet-400/50" />
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

            <label className="flex items-start gap-3 text-xs text-violet-200/60 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => update('acceptTerms', e.target.checked)}
                className="mt-0.5 rounded border-violet-400/30"
              />
              <span>
                Saya setuju dengan syarat layanan Humanify dan kebijakan privasi {NAINCODE.legalName}.
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
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

          <p className="mt-6 text-center text-sm text-violet-300/50">
            Sudah punya akun?{' '}
            <Link href={HUMANIFY_BRAND.loginPath} className="text-violet-300 hover:text-white font-medium">
              Masuk
            </Link>
          </p>

          <Link
            href={HUMANIFY_BRAND.welcomePath}
            className="mt-4 flex items-center justify-center gap-1 text-xs text-violet-400/40 hover:text-violet-300/70"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Kembali ke beranda
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
