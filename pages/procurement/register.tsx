import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
  ShoppingCart, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
  Shield, Building2, ChevronLeft, User, Phone, MapPin, FileText,
  Briefcase, CheckCircle
} from 'lucide-react';

export default function VendorRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key: string, val: string) => setForm((f: any) => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    if (!form.companyName) return 'Nama perusahaan wajib diisi';
    if (!form.contactPerson) return 'Nama contact person wajib diisi';
    if (!form.businessType) return 'Tipe bisnis wajib diisi';
    return null;
  };

  const validateStep2 = () => {
    if (!form.email) return 'Email wajib diisi';
    if (!form.password) return 'Password wajib diisi';
    if (form.password.length < 6) return 'Password minimal 6 karakter';
    if (form.password !== form.confirmPassword) return 'Password tidak cocok';
    return null;
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const r = await fetch('/api/procurement/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();

      if (d.success) {
        setSuccess(true);
      } else {
        setError(d.error?.message || 'Registrasi gagal');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Head><title>Registrasi Berhasil | Procurement Portal</title></Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Registrasi Berhasil!</h1>
            <p className="text-sm text-gray-500 mb-2">
              Akun vendor Anda telah dibuat. Tim kami akan memverifikasi data Anda dan mengaktifkan akun dalam 1-3 hari kerja.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Anda akan menerima notifikasi melalui email setelah akun disetujui.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/procurement/login"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all text-sm">
                Masuk Sekarang
              </Link>
              <Link href="/procurement"
                className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm">
                Lihat Pengumuman
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Daftar Vendor | Procurement Portal</title></Head>

      <div className="min-h-screen flex">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
          </div>

          <div className="relative">
            <Link href="/procurement" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Procurement Portal</p>
                <p className="text-xs text-white/50">Bedagang ERP</p>
              </div>
            </Link>
          </div>

          <div className="relative space-y-6 max-w-md">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Bergabung Sebagai<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-200">Vendor</span>
            </h2>
            <p className="text-lg text-white/70">
              Daftar untuk mengakses peluang pengadaan, mengajukan penawaran, dan mengelola proyek Anda.
            </p>

            {/* Steps indicator */}
            <div className="space-y-4 pt-6">
              {[
                { n: 1, label: 'Informasi Perusahaan', desc: 'Nama, tipe bisnis, contact person' },
                { n: 2, label: 'Akun & Keamanan', desc: 'Email, password' },
                { n: 3, label: 'Detail Tambahan', desc: 'Alamat, NPWP, telepon' },
              ].map(s => (
                <div key={s.n} className={`flex items-start gap-4 transition-all ${step >= s.n ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all
                    ${step > s.n ? 'bg-emerald-400 text-white' : step === s.n ? 'bg-white text-blue-700' : 'bg-white/20 text-white/60'}`}>
                    {step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs text-white/50">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-sm text-white/30">
            &copy; {new Date().getFullYear()} Bedagang ERP
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50 overflow-y-auto">
          <div className="w-full max-w-lg">
            <Link href="/procurement" className="lg:hidden inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </Link>

            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900">Daftar Vendor</p>
            </div>

            {/* Mobile Step Indicator */}
            <div className="lg:hidden flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 flex items-center gap-2">
                  <div className={`w-full h-1.5 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
              ))}
              <span className="text-xs text-gray-400 ml-2 shrink-0">Langkah {step}/3</span>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-gray-900">
                {step === 1 ? 'Informasi Perusahaan' : step === 2 ? 'Akun & Keamanan' : 'Detail Tambahan'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {step === 1 ? 'Masukkan informasi perusahaan Anda' : step === 2 ? 'Buat akun untuk masuk ke portal' : 'Informasi opsional untuk melengkapi profil'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-xs font-bold">!</div>
                {error}
              </div>
            )}

            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
              {/* Step 1: Company Info */}
              {step === 1 && (<>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Perusahaan *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="PT. Contoh Perusahaan" value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="Nama lengkap" value={form.contactPerson || ''} onChange={e => set('contactPerson', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Bisnis *</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none"
                      value={form.businessType || ''} onChange={e => set('businessType', e.target.value)}>
                      <option value="">Pilih tipe bisnis</option>
                      <option value="supplier">Supplier / Pemasok</option>
                      <option value="contractor">Kontraktor</option>
                      <option value="consultant">Konsultan</option>
                      <option value="distributor">Distributor</option>
                      <option value="manufacturer">Manufaktur</option>
                      <option value="service_provider">Penyedia Jasa</option>
                    </select>
                  </div>
                </div>
              </>)}

              {/* Step 2: Account */}
              {step === 2 && (<>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="vendor@email.com" value={form.email || ''} onChange={e => set('email', e.target.value)} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="Minimal 6 karakter" value={form.password || ''} onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Minimal 6 karakter</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Konfirmasi Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="Ulangi password" value={form.confirmPassword || ''} onChange={e => set('confirmPassword', e.target.value)} />
                  </div>
                </div>
              </>)}

              {/* Step 3: Additional Info */}
              {step === 3 && (<>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">No. Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="08xx-xxxx-xxxx" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NPWP</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="xx.xxx.xxx.x-xxx.xxx" value={form.npwp || ''} onChange={e => set('npwp', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                      rows={2} placeholder="Alamat lengkap perusahaan" value={form.address || ''} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kota</label>
                    <input className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="Jakarta" value={form.city || ''} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provinsi</label>
                    <input className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      placeholder="DKI Jakarta" value={form.province || ''} onChange={e => set('province', e.target.value)} />
                  </div>
                </div>
              </>)}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <button type="button" onClick={() => { setStep(step - 1); setError(''); }}
                    className="px-6 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    Kembali
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  {step < 3 ? 'Lanjutkan' : loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Sudah punya akun?{' '}
                <Link href="/procurement/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Masuk
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
