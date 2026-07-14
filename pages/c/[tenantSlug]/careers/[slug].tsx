import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, MapPin, Building2, Send, CheckCircle2 } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function TenantCareerDetailPage() {
  const router = useRouter();
  const tenantSlug = typeof router.query.tenantSlug === 'string' ? router.query.tenantSlug : '';
  const jobSlug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [job, setJob] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', education: '', experience: '', coverLetter: '' });

  useEffect(() => {
    if (!tenantSlug || !jobSlug) return;
    setLoading(true);
    fetch(`/api/public/careers?tenant=${encodeURIComponent(tenantSlug)}&slug=${encodeURIComponent(jobSlug)}`)
      .then((r) => r.json())
      .then((j) => {
        setJob(j.data || null);
        setCompany(j.tenant || null);
      })
      .catch(() => { setJob(null); setCompany(null); })
      .finally(() => setLoading(false));
  }, [tenantSlug, jobSlug]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jobId: job.id, tenant: tenantSlug }),
      });
      const json = await res.json();
      if (json.success) setSubmitted(true);
      else alert(json.error || json.message || 'Gagal mengirim lamaran');
    } catch {
      alert('Gagal mengirim lamaran');
    } finally {
      setSubmitting(false);
    }
  }

  const companyName = company?.name || tenantSlug;
  const careersHref = `/c/${tenantSlug}/careers`;

  return (
    <>
      <Head>
        <title>{job?.title ? `${job.title} — ${companyName}` : 'Karir'} · {HUMANIFY_BRAND.name}</title>
        {job && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org/',
                '@type': 'JobPosting',
                title: job.title,
                description: [job.description, job.requirements].filter(Boolean).join('\n\n') || job.title,
                datePosted: (job.postedDate || job.created_at || new Date().toISOString()).toString().slice(0, 10),
                validThrough: job.deadline || undefined,
                employmentType: String(job.employmentType || 'FULL_TIME').toUpperCase().replace('-', '_'),
                hiringOrganization: {
                  '@type': 'Organization',
                  name: companyName,
                  sameAs: `https://humanify.id${careersHref}`,
                },
                jobLocation: {
                  '@type': 'Place',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: job.location || 'Indonesia',
                    addressCountry: 'ID',
                  },
                },
                baseSalary: job.salaryMin || job.salaryMax ? {
                  '@type': 'MonetaryAmount',
                  currency: 'IDR',
                  value: {
                    '@type': 'QuantitativeValue',
                    minValue: job.salaryMin || undefined,
                    maxValue: job.salaryMax || undefined,
                    unitText: 'MONTH',
                  },
                } : undefined,
                directApply: true,
                url: `https://humanify.id/c/${tenantSlug}/careers/${jobSlug}`,
              }),
            }}
          />
        )}
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href={careersHref} className="p-2 border rounded-lg hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></Link>
            <HumanifyLogo className="h-7 w-auto" />
            <span className="text-sm text-slate-500">{companyName}</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {loading && <p className="text-slate-500">Memuat...</p>}
          {!loading && !job && <p className="text-slate-500">Lowongan tidak ditemukan untuk perusahaan ini.</p>}

          {job && (
            <>
              <div className="bg-white rounded-xl border p-6">
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  {job.department && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.department}</span>}
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
                </div>
                {job.description && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-800">Deskripsi</h3>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm mt-1">{job.description}</p>
                  </div>
                )}
                {job.requirements && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-slate-800">Persyaratan</h3>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm mt-1">{job.requirements}</p>
                  </div>
                )}
              </div>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-green-800">Lamaran Terkirim</h2>
                  <p className="text-green-700 text-sm mt-1">Tim HR {companyName} akan meninjau lamaran Anda.</p>
                  <Link href={careersHref} className="inline-block mt-4 text-sm text-blue-600 hover:underline">Lihat lowongan lain</Link>
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
