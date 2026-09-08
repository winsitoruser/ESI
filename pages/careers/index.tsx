import { FormEvent, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Link2,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

/**
 * Global /careers hub — SaaS multi-tenant careers live at /c/{slug}/careers
 */
export default function CareersIndexPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const openPortal = async (e?: FormEvent) => {
    e?.preventDefault();
    const cleaned = slug
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+\/c\//, '')
      .replace(/\/careers.*$/, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-|-$/g, '');
    if (!cleaned) {
      setHint('Masukkan slug perusahaan, misalnya demo atau nama-perusahaan.');
      return;
    }
    setBusy(true);
    setHint('');
    try {
      const res = await fetch(`/api/public/careers?tenant=${encodeURIComponent(cleaned)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        await router.push(`/c/${cleaned}/careers`);
        return;
      }
      setHint(json?.message || json?.error || 'Portal tidak ditemukan. Cek slug atau minta tautan ke HR perusahaan.');
    } catch {
      setHint('Gagal memeriksa portal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Portal Karir — {HUMANIFY_BRAND.name}</title>
        <meta
          name="description"
          content="Portal karir Humanify — setiap perusahaan memiliki URL karir sendiri di /c/{slug}/careers. Cari perusahaan atau buka tautan dari HR."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://humanify.id/careers" />
        <meta property="og:title" content={`Portal Karir — ${HUMANIFY_BRAND.name}`} />
        <meta
          property="og:description"
          content="Temukan lowongan lewat portal karir perusahaan di Humanify."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://humanify.id/careers" />
        <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#0b0618] text-slate-100">
        {/* ambient */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/30 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <header className="relative z-10 border-b border-white/10 bg-[#0b0618]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <HumanifyLogo
              variant="withText"
              size="md"
              href="/"
              textClassName="font-bold tracking-tight text-white"
              subtitleClassName="text-[11px] font-medium text-violet-200/70"
            />
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={HUMANIFY_BRAND.signupPath}
                className="rounded-lg px-3 py-1.5 text-sm text-violet-100 hover:bg-white/5"
              >
                Daftar
              </Link>
              <Link
                href="/humanify/login"
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-violet-950 hover:bg-violet-50"
              >
                Masuk HR
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
          <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Careers hub · multi-tenant
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                Portal karir per perusahaan
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-violet-100/80 sm:text-lg">
                Humanify adalah HRIS multi-tenant. Setiap perusahaan punya portal karir sendiri —
                bukan satu daftar lowongan global. Buka tautan dari HR, atau masukkan slug perusahaan di bawah.
              </p>

              <form onSubmit={openPortal} className="mt-8 max-w-xl">
                <label htmlFor="company-slug" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-violet-200/70">
                  Buka portal perusahaan
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/60" />
                    <input
                      id="company-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="slug-perusahaan atau demo"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-violet-200/40 outline-none ring-cyan-400/40 focus:border-cyan-400/40 focus:ring-2"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:opacity-95 disabled:opacity-50"
                  >
                    {busy ? 'Memeriksa…' : 'Buka portal'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {hint && (
                  <p className="mt-2 text-sm text-amber-200/90" role="status">
                    {hint}
                  </p>
                )}
                <p className="mt-3 text-xs text-violet-200/55">
                  Format URL:{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">
                    https://humanify.id/c/<span className="text-white">{'{slug-perusahaan}'}</span>/careers
                  </code>
                </p>
              </form>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/c/demo/careers"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-violet-100 hover:bg-white/10"
                >
                  <Briefcase className="h-3.5 w-3.5 text-cyan-300" />
                  Lihat contoh: demo
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
                <Link
                  href="/humanify/welcome"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-violet-100 hover:bg-white/10"
                >
                  Pelajari Humanify →
                </Link>
                <Link
                  href={HUMANIFY_BRAND.signupPath}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
                >
                  Daftar trial
                </Link>
              </div>
            </div>

            <aside className="relative">
              <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/20 to-cyan-400/30 blur-xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#140a28]/90 p-6 shadow-2xl backdrop-blur">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-300/30">
                    <Building2 className="h-6 w-6 text-cyan-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Satu produk · banyak portal</p>
                    <p className="text-xs text-violet-200/70">Isolasi tenant, branding, lowongan sendiri</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    { icon: Link2, title: 'URL unik per perusahaan', desc: '/c/{slug}/careers' },
                    { icon: Users, title: 'Lamar tanpa akun', desc: 'Kandidat apply langsung dari portal' },
                    { icon: Shield, title: 'Data terpisah aman', desc: 'Lowongan & lamaran scoped tenant' },
                    { icon: CheckCircle2, title: 'Dikelola di Rekrutmen HR', desc: 'Salin tautan dari Integrasi' },
                  ].map((item) => (
                    <li
                      key={item.title}
                      className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
                    >
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-violet-200/65">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>

          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'HR publikasikan lowongan',
                body: 'Buat job opening di modul Rekrutmen Humanify, set status open.',
              },
              {
                step: '02',
                title: 'Bagikan tautan portal',
                body: 'Salin URL dari Rekrutmen → Integrasi, atau Platform Admin.',
              },
              {
                step: '03',
                title: 'Kandidat melamar',
                body: 'Pelamar buka /c/{slug}/careers dan kirim lamaran tanpa login.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
              >
                <p className="text-xs font-bold tracking-[0.2em] text-cyan-300/80">{s.step}</p>
                <h2 className="mt-2 text-base font-semibold text-white">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-violet-100/70">{s.body}</p>
              </div>
            ))}
          </section>

          <section className="mt-12 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600/30 to-cyan-600/20 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Tim HR — aktifkan portal karir Anda</h2>
                <p className="mt-1 max-w-xl text-sm text-violet-100/75">
                  Tim HR: salin tautan dari modul Rekrutmen → Integrasi, atau dari Platform Admin.
                  Butuh trial? Daftar dan setup wizard dalam hitungan menit.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/humanify/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-950 hover:bg-violet-50"
                >
                  Masuk HR
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={HUMANIFY_BRAND.signupPath}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Daftar trial
                </Link>
              </div>
            </div>
          </section>
        </main>

        <div className="relative z-10 mt-auto">
          <NaincodeFooter />
        </div>
      </div>
    </>
  );
}
