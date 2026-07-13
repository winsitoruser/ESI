import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GraduationCap, Loader2, BookOpen } from 'lucide-react';

export default function ExternalLearnPage() {
  const router = useRouter();
  const { token } = router.query;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/external/learn?token=${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-gray-500">Link undangan tidak valid atau sudah kedaluwarsa.</p>
      </div>
    );
  }

  const color = data.primary_color || '#4f46e5';

  return (
    <>
      <Head><title>{data.academy_name || 'Humanify Academy'}</title></Head>
      <div className="min-h-screen bg-slate-50">
        <header className="text-white p-6" style={{ backgroundColor: color }}>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">{data.academy_name || 'Humanify Academy'}</h1>
              <p className="text-sm opacity-90">Selamat datang, {data.full_name}</p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-6 space-y-4">
          {data.welcome_message && (
            <p className="text-gray-600 bg-white border rounded-xl p-4">{data.welcome_message}</p>
          )}

          {data.curriculum_title && (
            <div className="bg-white border rounded-xl p-5">
              <BookOpen className="w-6 h-6 text-indigo-600 mb-2" />
              <h2 className="font-semibold">{data.curriculum_title}</h2>
              <p className="text-sm text-gray-500 mt-1">Kursus ditugaskan untuk Anda</p>
              <p className="text-xs text-gray-400 mt-3">Hubungi HR untuk akses penuh melalui portal karyawan jika Anda sudah menjadi employee.</p>
            </div>
          )}

          {data.exam_title && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold">Ujian: {data.exam_title}</h2>
              <p className="text-sm text-gray-500 mt-1">Ujian akan tersedia setelah onboarding internal selesai.</p>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">Powered by Humanify LMS</p>
        </main>
      </div>
    </>
  );
}
