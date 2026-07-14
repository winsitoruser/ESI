import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Briefcase, MapPin, Building2, ArrowRight } from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

interface Job {
  id: string;
  slug: string;
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  deadline?: string;
}

function fmtSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return 'Negosiasi';
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return min ? `dari ${fmt(min)}` : `hingga ${fmt(max!)}`;
}

export default function TenantCareersPage() {
  const router = useRouter();
  const tenantSlug = typeof router.query.tenantSlug === 'string' ? router.query.tenantSlug : '';
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<{
    name?: string;
    slug?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      hidePoweredBy?: boolean;
      careersHeadline?: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantSlug) return;
    setLoading(true);
    fetch(`/api/public/careers?tenant=${encodeURIComponent(tenantSlug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) {
          setError(j.message || j.error || 'Portal tidak tersedia');
          setJobs([]);
          setCompany(null);
          return;
        }
        setJobs(j.data || []);
        setCompany(j.tenant || null);
        setError('');
      })
      .catch(() => {
        setError('Gagal memuat lowongan');
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const companyName = company?.name || tenantSlug;
  const brand = company?.branding;
  const primary = brand?.primaryColor || '#1d4ed8';
  const headline = brand?.careersHeadline || `Karir di ${companyName}`;

  return (
    <>
      <Head>
        <title>Karir — {companyName}{brand?.hidePoweredBy ? '' : ` · ${HUMANIFY_BRAND.name}`}</title>
        <meta name="description" content={`Lowongan kerja di ${companyName}`} />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col" style={{ ['--tenant-primary' as any]: primary }}>
        <header className="border-b bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {brand?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt={companyName} className="h-8 w-auto max-w-[160px] object-contain" />
              ) : (
                <HumanifyLogo className="h-8 w-auto" />
              )}
              <span className="text-sm text-slate-400">|</span>
              <span className="text-sm font-medium text-slate-700">{companyName}</span>
            </div>
            <Link href="/humanify/login" className="text-sm hover:underline" style={{ color: primary }}>Masuk HR</Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10 space-y-8 flex-1 w-full">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Portal karir</p>
            <h1 className="text-3xl font-bold text-slate-900">{headline}</h1>
            {!brand?.hidePoweredBy && (
              <p className="text-slate-600 mt-2">Lamar langsung tanpa perlu akun. Didukung {HUMANIFY_BRAND.name}.</p>
            )}
          </div>

          {loading && <p className="text-slate-500">Memuat lowongan...</p>}
          {error && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">{error}</div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Belum ada lowongan terbuka saat ini.</p>
            </div>
          )}

          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/c/${tenantSlug}/careers/${job.slug}`}
                className="bg-white rounded-xl border p-5 hover:shadow-sm transition group"
                style={{ borderColor: undefined }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:opacity-90" style={{ color: undefined }}>
                      {job.title}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      {job.department && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.department}</span>}
                      {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{fmtSalary(job.salaryMin, job.salaryMax)}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 mt-1" style={{ color: primary }} />
                </div>
              </Link>
            ))}
          </div>
        </main>
        {!brand?.hidePoweredBy ? <NaincodeFooter /> : <div className="h-8" />}
      </div>
    </>
  );
}
