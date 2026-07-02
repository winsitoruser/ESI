import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, GraduationCap, Loader2, MapPin, BookOpen } from 'lucide-react';

export default function CandidateRegister() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', id_number: '', date_of_birth: '', gender: '',
    address: '', education: '', tenant_id: router.query.tenant || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) { setError('Nama lengkap wajib diisi'); return false; }
    if (!formData.email.trim()) { setError('Email wajib diisi'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Format email tidak valid'); return false; }
    if (!formData.password || formData.password.length < 6) { setError('Password minimal 6 karakter'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Konfirmasi password tidak cocok'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenant_id) { setError('Tenant ID diperlukan. Hubungi administrator.'); return; }
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/candidate/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('candidate_token', data.token);
        localStorage.setItem('candidate_user', JSON.stringify(data.user));
        router.push('/candidate/dashboard');
      } else {
        setError(data.error || 'Registrasi gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Daftar Kandidat - Training Portal</title>
        <meta name="description" content="Daftar akun portal pelatihan kandidat" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-3">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Daftar Akun Kandidat</h1>
              <p className="text-gray-500 text-sm mt-1">
                {step === 1 ? 'Informasi akun' : 'Data pribadi (opsional)'}
              </p>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              </div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="name" value={formData.name} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Nama lengkap" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" name="email" value={formData.email} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="email@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                        className="w-full pl-10 pr-12 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Minimal 6 karakter" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Ulangi password" required />
                    </div>
                  </div>
                  {/* Hidden tenant_id from URL or manual entry */}
                  {!router.query.tenant && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Organisasi *</label>
                      <input type="text" name="tenant_id" value={formData.tenant_id} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Masukkan kode dari organisasi Anda" required />
                    </div>
                  )}
                  <button type="button" onClick={() => { if (validateStep1()) setStep(2); }}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                    Lanjut <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                          className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="08xx" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                      <select name="gender" value={formData.gender} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">Pilih</option>
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. KTP</label>
                      <input type="text" name="id_number" value={formData.id_number} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="No. identitas" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tgl Lahir</label>
                      <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                        className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" name="education" value={formData.education} onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="SMA / D3 / S1 dll" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} rows={2}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Alamat lengkap" />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50">Kembali</button>
                    <button type="submit" disabled={isLoading}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Daftar</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-5 text-center">
              <p className="text-gray-500 text-sm">
                Sudah punya akun?{' '}
                <Link href="/candidate/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Masuk</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
