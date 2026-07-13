import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Briefcase, MapPin, Building2, ArrowRight, Users } from 'lucide-react';
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

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/careers')
      .then((r) => r.json())
      .then((j) => setJobs(j.data || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Karir — {HUMANIFY_BRAND.name}</title>
        <meta name="description" content={`Lowongan kerja terbuka di ${HUMANIFY_BRAND.name}`} />
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/humanify/welcome" className="flex items-center gap-2">
              <HumanifyLogo className="h-8 w-auto" />
            </Link>
            <Link href="/humanify/login" className="text-sm text-blue-600 hover:underline">Masuk HR</Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Karir di {HUMANIFY_BRAND.name}</h1>
            <p className="text-slate-600 mt-2">Temukan peluang bergabung dengan tim kami. Lamar langsung tanpa perlu akun.</p>
          </div>

          {loading && <p className="text-slate-500">Memuat lowongan...</p>}

          {!loading && jobs.length === 0 && (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Belum ada lowongan terbuka saat ini.</p>
            </div>
          )}

          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.slug}`}
                className="bg-white rounded-xl border p-5 hover:border-blue-300 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">{job.title}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      {job.department && (
                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.department}</span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{fmtSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </main>

        <NaincodeFooter variant="light" />
      </div>
    </>
  );
}
