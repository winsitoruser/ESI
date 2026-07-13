import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, MapPin, Building2, Send, CheckCircle2 } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function CareerDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', education: '', experience: '', coverLetter: '' });

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;
    setLoading(true);
    fetch(`/api/public/careers?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => setJob(j.data || null))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jobId: job.id }),
      });
      const json = await res.json();
      if (json.success) setSubmitted(true);
      else alert(json.error || 'Gagal mengirim lamaran');
    } catch {
      alert('Gagal mengirim lamaran');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>{job?.title ? `${job.title} — Karir` : 'Karir'} — {HUMANIFY_BRAND.name}</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/careers" className="p-2 border rounded-lg hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></Link>
            <HumanifyLogo className="h-7 w-auto" />
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {loading && <p className="text-slate-500">Memuat...</p>}
          {!loading && !job && <p className="text-slate-500">Lowongan tidak ditemukan.</p>}

          {job && (
            <>
              <div className="bg-white rounded-xl border p-6">
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  {job.department && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.department}</span>}
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
                </div>
                {job.description && (
                  <div className="mt-6 prose prose-sm max-w-none">
                    <h3 className="font-semibold text-slate-800">Deskripsi</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{job.description}</p>
                  </div>
                )}
                {job.requirements && (
                  <div className="mt-4 prose prose-sm max-w-none">
                    <h3 className="font-semibold text-slate-800">Persyaratan</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                )}
              </div>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-green-800">Lamaran Terkirim</h2>
                  <p className="text-green-700 text-sm mt-1">Tim HR akan meninjau lamaran Anda.</p>
                  <Link href="/careers" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Lihat lowongan lain</Link>
                </div>
              ) : (
                <form onSubmit={handleApply} className="bg-white rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold text-slate-900">Lamar Posisi Ini</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input required placeholder="Nama lengkap *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Pendidikan terakhir" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <textarea placeholder="Pengalaman kerja" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                  <textarea placeholder="Surat lamaran / catatan" value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                    <Send className="w-4 h-4" /> {submitting ? 'Mengirim...' : 'Kirim Lamaran'}
                  </button>
                </form>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
