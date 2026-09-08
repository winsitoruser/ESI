import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import HRStatCard from '@/components/humanify/HRStatCard';
import { HrisHeroNavCard } from '@/components/humanify/HrisHeroMetricCard';
import { PageGuard } from '@/components/permissions';
import { LmsStatusBadge, lmsFetch } from '@/components/humanify/lms/shared';
import { OpsChartCard, OpsPieChart, OpsLineChart } from '@/components/humanify/ops-charts';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { HF_CHART_COLORS_SOLID } from '@/lib/humanify/chart-tokens';
import TrainingLmsBridge from '@/components/humanify/TrainingLmsBridge';
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Library,
  PenTool,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const QUICK_MODULES = [
  {
    id: 'courses',
    href: '/humanify/lms/courses',
    icon: BookOpen,
    label: 'Kursus & Path',
    desc: 'Kurikulum, modul, materi',
  },
  {
    id: 'tests',
    href: '/humanify/lms/tests',
    icon: ClipboardList,
    label: 'Tes & Ujian',
    desc: 'Susun soal & buka ujian',
  },
  {
    id: 'bank',
    href: '/humanify/lms/question-bank',
    icon: Library,
    label: 'Bank Soal',
    desc: 'MC & essay per modul',
  },
  {
    id: 'grading',
    href: '/humanify/lms/grading',
    icon: PenTool,
    label: 'Penilaian',
    desc: 'Otomatis + essay manual',
  },
  {
    id: 'competency',
    href: '/humanify/lms/competency',
    icon: Award,
    label: 'Kompetensi',
    desc: 'Sertifikat & skill history',
  },
  {
    id: 'analytics',
    href: '/humanify/lms/analytics',
    icon: BarChart3,
    label: 'Analytics L&D',
    desc: 'Heatmap & skill gap',
  },
];

function CourseCard({ course }: { course: any }) {
  const cat = String(course.category || 'general');
  const enroll = Number(course.enrollment_count) || 0;
  const modules = Number(course.module_count) || 0;
  const progressVisual = Math.min(100, modules > 0 ? Math.round((enroll / Math.max(enroll, 8)) * 100) : enroll > 0 ? 55 : 8);

  return (
    <Link
      href={`/humanify/lms/courses/${course.id}`}
      className="hf-tile hf-tile-interactive group relative flex h-full min-h-[180px] flex-col overflow-hidden"
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="flex flex-1 flex-col px-4 py-4 pl-5">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-md bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
            {cat.replace('_', ' ')}
          </span>
          <LmsStatusBadge status={course.status || 'draft'} />
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[color:var(--hf-ink)]">
          {course.title}
        </h3>
        <p className="mt-1 font-mono text-[11px] text-[color:var(--hf-ink-faint)]">{course.code || '—'}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--hf-ink-muted)]">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {modules} modul
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {enroll} peserta
          </span>
        </div>
        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--hf-brand-500)]"
              style={{ width: `${progressVisual}%` }}
            />
          </div>
        </div>
      </div>
      <span className="flex items-center justify-between border-t border-[var(--hf-border-subtle)] px-4 py-2 pl-5 text-xs font-medium text-[color:var(--hf-brand-600)]">
        Kelola kursus
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function LmsHubPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const labGated = router.query.lab === 'gated';
  const [stats, setStats] = useState<any>({});
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await lmsFetch('dashboard');
      const data = d.data || {};
      setStats(data);
      const total =
        (data.courses || 0) +
        (data.exams || 0) +
        (data.results || 0) +
        (data.enrollments || 0) +
        (data.questionBank || 0);
      setDataSource(total > 0 ? 'live' : 'empty');
    } catch {
      setDataSource('empty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activityData = (stats.activitySeries || []).map((r: any) => ({
    x: r.label,
    y: Number(r.attempts) || 0,
  }));

  const hasActivity = activityData.some((d: any) => d.y > 0);
  const topCourses = stats.topCourses || [];
  const recentResults = stats.recentResults || [];

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.view', 'training.*']} title="LMS" description="Learning Management System">
      <HumanifyLayout title={t('hris.lmsTitle')} subtitle={t('hris.lmsSubtitle')}>
        <TalentShell
          current="lms"
          title="Learning Hub"
          subtitle="Kelola kursus, ujian, kompetensi, dan analitik L&D dalam satu dasbor."
          icon={GraduationCap}
          chips={[
            { label: `${stats.courses || 0} kursus` },
            { label: `${stats.enrollments || 0} enrollment` },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <Link href="/employee/training" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                Portal karyawan
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/humanify/lms/courses" className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" />
                Buat kursus
              </Link>
            </div>
          }
        >
          {labGated && (
            <div className="rounded-[var(--hf-radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Modul LMS lanjutan (psikotes, proctoring, academy, AI) belum GA. Hubungi support untuk lab, atau
              gunakan modul inti di bawah.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HRStatCard icon={BookOpen} label="Kursus aktif" value={loading ? '—' : stats.courses || 0} sub={`${stats.enrollments || 0} enrollment`} accent="violet" />
            <HRStatCard icon={Users} label="Peserta belajar" value={loading ? '—' : stats.learners || stats.enrollments || 0} sub="Unique learners" accent="blue" />
            <HRStatCard icon={ClipboardList} label="Tes & ujian" value={loading ? '—' : stats.exams || 0} sub={`${stats.results || 0} percobaan`} accent="amber" />
            <HRStatCard icon={TrendingUp} label="Pass rate" value={loading ? '—' : `${Math.round(Number(stats.passRate) || 0)}%`} sub={`Avg skor ${Math.round(Number(stats.avgScore) || 0)}`} accent="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <OpsChartCard title="Aktivitas ujian" subtitle="14 hari terakhir" className="lg:col-span-2">
              {hasActivity ? (
                <OpsLineChart data={activityData} xKey="x" yKey="y" yLabel="Percobaan" height={240} color={HF_CHART_COLORS_SOLID[0]} />
              ) : (
                <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
                  <Sparkles className="h-8 w-8 text-[color:var(--hf-brand-500)] opacity-40" />
                  <p className="text-sm text-[color:var(--hf-ink-muted)]">Belum ada percobaan ujian</p>
                  <Link href="/humanify/lms/tests" className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline">
                    Buat tes pertama →
                  </Link>
                </div>
              )}
            </OpsChartCard>

            <OpsChartCard title="Hasil ujian" subtitle="Lulus vs tidak lulus">
              {(stats.passFail || []).some((r: any) => r.value > 0) ? (
                <OpsPieChart data={stats.passFail} height={240} />
              ) : (stats.categoryBreakdown || []).length > 0 ? (
                <OpsPieChart data={stats.categoryBreakdown} height={240} />
              ) : (
                <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
                  <BarChart3 className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-[color:var(--hf-ink-muted)]">Distribusi akan muncul setelah ada data</p>
                </div>
              )}
            </OpsChartCard>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="hf-section-label">Modul utama</p>
                <h2 className="text-base font-semibold text-[color:var(--hf-ink)]">Akses cepat L&D</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_MODULES.map((m) => (
                <HrisHeroNavCard key={m.id} label={m.label} desc={m.desc} meta="Buka" href={m.href} icon={m.icon} />
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-5">
            <section className="xl:col-span-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="hf-section-label">Kursus</p>
                  <h2 className="text-base font-semibold text-[color:var(--hf-ink)]">Kursus populer</h2>
                </div>
                <Link href="/humanify/lms/courses" className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline">
                  Lihat semua
                </Link>
              </div>
              {topCourses.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topCourses.map((c: any) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--hf-radius-xl)] border border-dashed border-[var(--hf-border)] bg-white p-8">
                  <HrisEmptyState
                    source="empty"
                    title="Belum ada kursus"
                    description="Buat learning path pertama — statistik dan kartu kursus akan muncul di sini."
                  />
                  <div className="mt-4 flex justify-center">
                    <Link href="/humanify/lms/courses" className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                      <Plus className="h-4 w-4" /> Buat kursus
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section className="xl:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="hf-section-label">Aktivitas</p>
                  <h2 className="text-base font-semibold text-[color:var(--hf-ink)]">Hasil ujian terbaru</h2>
                </div>
                <Link href="/humanify/lms/grading" className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline">
                  Penilaian
                </Link>
              </div>
              <div className="hf-card overflow-hidden">
                {recentResults.length > 0 ? (
                  <ul className="space-y-2 p-3">
                    {recentResults.map((r: any) => (
                      <li key={r.id} className="hf-tile-nested flex items-start gap-3 px-3 py-3">
                        <span
                          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            r.is_passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {r.is_passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[color:var(--hf-ink)]">
                            {r.employee_name || 'Peserta'}
                          </p>
                          <p className="truncate text-xs text-[color:var(--hf-ink-muted)]">{r.exam_title || 'Ujian'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-[color:var(--hf-ink)]">
                            {r.score != null ? Math.round(Number(r.score)) : '—'}
                          </p>
                          <p className="text-[10px] text-[color:var(--hf-ink-faint)]">
                            {r.submitted_at || r.created_at
                              ? new Date(r.submitted_at || r.created_at).toLocaleDateString('id-ID')
                              : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
                    <ClipboardList className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-[color:var(--hf-ink-muted)]">Belum ada hasil ujian</p>
                    <Link href="/humanify/lms/tests" className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline">
                      Kelola tes →
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="hf-tile-nested p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Bank soal</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--hf-ink)]">{stats.questionBank || 0}</p>
                </div>
                <div className="hf-tile-nested p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Kompetensi</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--hf-ink)]">{stats.competencies || 0}</p>
                </div>
              </div>
            </section>
          </div>

          <TrainingLmsBridge currentModule="lms" />
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
