import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, MapPin, Building2, Send, CheckCircle2, Calendar, Banknote } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { toJsonLdScript } from '@/lib/security/sanitize-user-text';

export default function CareerDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', education: '', experience: '', coverLetter: '' });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const fieldDefs = useMemo(() => {
    const defs = job?.customFieldDefs || job?.custom_field_defs || [];
    return Array.isArray(defs) ? defs : [];
  }, [job]);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;
    setLoading(true);
    fetch(`/api/public/careers?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        setJob(j.data || null);
        setCustomAnswers({});
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.id) return;
    for (const f of fieldDefs) {
      if (f.required && !String(customAnswers[f.key] || '').trim()) {
        alert(`Field wajib: ${f.label || f.key}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, jobId: job.id, customAnswers }),
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

  const renderCustomField = (f: any) => {
    const key = f.key;
    const label = f.label || key;
    const common = 'w-full border rounded-lg px-3 py-2 text-sm';
    const opts: string[] = Array.isArray(f.options)
      ? f.options
      : (typeof f.options === 'string'
        ? f.options.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean)
        : []);
    if (f.type === 'textarea') {
      return (
        <div key={key}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {label}{f.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <textarea
            required={!!f.required}
            placeholder={f.placeholder || label}
            value={customAnswers[key] || ''}
            onChange={(e) => setCustomAnswers((a) => ({ ...a, [key]: e.target.value }))}
            className={common}
            rows={3}
          />
        </div>
      );
    }
    if (f.type === 'select') {
      return (
        <div key={key}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {label}{f.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <select
            required={!!f.required}
            value={customAnswers[key] || ''}
            onChange={(e) => setCustomAnswers((a) => ({ ...a, [key]: e.target.value }))}
            className={common}
          >
            <option value="">{f.required ? 'Pilih…' : '— Opsional —'}</option>
            {opts.map((o: string) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={key}>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label}{f.required ? <span className="text-red-500"> *</span> : null}
        </label>
        <input
          required={!!f.required}
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
          placeholder={f.placeholder || label}
          value={customAnswers[key] || ''}
          onChange={(e) => setCustomAnswers((a) => ({ ...a, [key]: e.target.value }))}
          className={common}
        />
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{job?.title ? `${job.title} — Karir` : 'Karir'} — {HUMANIFY_BRAND.name}</title>
        {job && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: toJsonLdScript({
                '@context': 'https://schema.org/',
                '@type': 'JobPosting',
                title: job.title,
                description: [job.description, job.requirements].filter(Boolean).join('\n\n') || job.title,
                datePosted: (job.created_at || new Date().toISOString()).toString().slice(0, 10),
                validThrough: job.deadline || undefined,
                employmentType: String(job.employment_type || job.type || 'FULL_TIME').toUpperCase().replace('-', '_'),
                hiringOrganization: {
                  '@type': 'Organization',
                  name: HUMANIFY_BRAND.company || HUMANIFY_BRAND.name,
                  sameAs: 'https://humanify.id',
                },
                jobLocation: {
                  '@type': 'Place',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: job.location || 'Indonesia',
                    addressCountry: 'ID',
                  },
                },
                baseSalary: job.salary_min || job.salary_max || job.salaryMin || job.salaryMax ? {
                  '@type': 'MonetaryAmount',
                  currency: 'IDR',
                  value: {
                    '@type': 'QuantitativeValue',
                    minValue: job.salary_min || job.salaryMin || undefined,
                    maxValue: job.salary_max || job.salaryMax || undefined,
                    unitText: 'MONTH',
                  },
                } : undefined,
                directApply: true,
                url: `https://humanify.id/careers/${slug}`,
              }),
            }}
          />
        )}
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
          {!loading && !job && (
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-slate-700 font-medium">Lowongan tidak ditemukan</p>
              <p className="text-sm text-slate-500 mt-1">Mungkin sudah ditutup atau tautan tidak valid.</p>
              <Link href="/careers" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Kembali ke daftar karir</Link>
            </div>
          )}

          {job && (
            <>
              <div className="bg-white rounded-xl border p-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Open</span>
                  {(job.employmentType || job.employment_type || job.type) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                      {String(job.employmentType || job.employment_type || job.type).replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  {job.department && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.department}</span>}
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Batas: {new Date(job.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {(job.salaryMin || job.salaryMax || job.salary_min || job.salary_max) && (
                  <p className="mt-3 text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Rp {Number(job.salaryMin || job.salary_min || 0).toLocaleString('id-ID')}
                    {(job.salaryMax || job.salary_max) ? ` – Rp ${Number(job.salaryMax || job.salary_max).toLocaleString('id-ID')}` : ''}
                    <span className="text-slate-400 font-normal">/bulan</span>
                  </p>
                )}
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
                  <h2 className="text-lg font-semibold text-green-800">Lamaran berhasil dikirim</h2>
                  <p className="text-green-700 text-sm mt-1">
                    Terima kasih. Tim HR akan meninjau lamaran Anda dan menghubungi dalam 3–5 hari kerja jika cocok.
                  </p>
                  <Link href="/careers" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Lihat lowongan lain</Link>
                </div>
              ) : (
                <form onSubmit={handleApply} className="bg-white rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold text-slate-900">Lamar Posisi Ini</h2>
                  <p className="text-xs text-slate-500">Field bertanda * wajib diisi.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input required placeholder="Nama lengkap *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Pendidikan terakhir" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <textarea placeholder="Pengalaman kerja" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                  <textarea placeholder="Surat lamaran / catatan" value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                  {fieldDefs.length > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-sm font-medium text-slate-700">Informasi tambahan</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {fieldDefs.map((f: any) => (
                          <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                            {renderCustomField(f)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
