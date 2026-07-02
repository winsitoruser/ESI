import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
  ShoppingCart, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
  Shield, Building2, ChevronLeft
} from 'lucide-react';

export default function VendorLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = (router.query.redirect as string) || '/procurement/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch('/api/procurement/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();

      if (d.success) {
        localStorage.setItem('vendor_token', d.data.token);
        localStorage.setItem('vendor_user', JSON.stringify(d.data.user));
        router.push(redirect);
      } else {
        setError(d.error?.message || 'Login gagal');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Masuk Vendor | Procurement Portal</title>
      </Head>

      <div className="min-h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/[0.03] rounded-full" />
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
              Selamat Datang<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-200">Kembali</span>
            </h2>
            <p className="text-lg text-white/70">
              Masuk ke akun vendor Anda untuk mengelola penawaran dan mengikuti tender terbaru.
            </p>
            <div className="flex items-center gap-6 pt-4">
              {[
                { icon: Shield, label: 'Aman & Terpercaya' },
                { icon: Building2, label: 'Portal Terbuka' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2 text-white/60">
                  <f.icon className="w-4 h-4" />
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-sm text-white/30">
            &copy; {new Date().getFullYear()} Bedagang ERP
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
          <div className="w-full max-w-md">
            {/* Mobile Back */}
            <Link href="/procurement" className="lg:hidden inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-8">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </Link>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Procurement Portal</p>
                <p className="text-xs text-gray-400">Bedagang ERP</p>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900">Masuk</h1>
              <p className="text-sm text-gray-500 mt-1">Masuk ke akun vendor Anda</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="email"
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    placeholder="vendor@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    placeholder="Masukkan password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Belum punya akun?{' '}
                <Link href="/procurement/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Daftar Sekarang
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href="/procurement" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← Kembali ke halaman pengumuman
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
