import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, lmsFetch } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import {
  GraduationCap, BookOpen, ClipboardList, BarChart3, Award, ChevronRight,
} from 'lucide-react';
import TrainingLmsBridge from '@/components/humanify/TrainingLmsBridge';

const GA_MODULES = [
  { id: 'courses', href: '/humanify/lms/courses', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50', label: 'Kursus & Learning Path', desc: 'Kurikulum, modul, materi, progress belajar' },
  { id: 'tests', href: '/humanify/lms/tests', icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50', label: 'Tes & Ujian', desc: 'Buat & kelola tes/ujian online' },
  { id: 'competency', href: '/humanify/lms/competency', icon: Award, color: 'text-green-600 bg-green-50', label: 'Kompetensi & Sertifikat', desc: 'Sertifikat & riwayat kompetensi' },
  { id: 'analytics', href: '/humanify/lms/analytics', icon: BarChart3, color: 'text-sky-600 bg-sky-50', label: 'Analytics L&D', desc: 'Heatmap departemen & skill gap' },
];

export default function LmsHubPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const labGated = router.query.lab === 'gated';
  const [stats, setStats] = useState<any>({});
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');

  const load = useCallback(async () => {
    try {
      const d = await lmsFetch('dashboard');
      setStats(d.data || {});
      const total = (d.data?.questionBank || 0) + (d.data?.exams || 0) + (d.data?.results || 0);
      setDataSource(total > 0 ? 'live' : 'empty');
    } catch {
      setDataSource('empty');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.view', 'training.*']} title="LMS" description="Learning Management System">
      <HumanifyLayout title={t('hris.lmsTitle')} subtitle={t('hris.lmsSubtitle')}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <LmsPageNav active="hub" />
            <DataSourceBadge source={dataSource} />
          </div>

          {labGated && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Modul LMS lanjutan (psikotes, proctoring, academy, AI, dll.) belum GA.
              Hubungi support untuk mengaktifkan lab, atau gunakan modul di bawah.
            </div>
          )}

          <TrainingLmsBridge currentModule="lms" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Kursus / Path', value: stats.courses || stats.curricula || 0 },
              { label: 'Tes/Ujian', value: stats.exams || 0 },
              { label: 'Hasil Ujian', value: stats.results || 0 },
              { label: 'Pass Rate', value: `${stats.passRate || 0}%` },
            ].map((s) => (
              <div key={s.label} className="bg-white border rounded-xl p-4">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <GraduationCap className="w-4 h-4" />
            <span>Portal Karyawan:</span>
            <Link href="/employee/training" className="text-indigo-600 hover:underline">/employee/training</Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GA_MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.id} href={m.href} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                    {m.label}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
                </Link>
              );
            })}
          </div>

          {dataSource === 'empty' && (
            <HrisEmptyState
              source="empty"
              title="LMS siap dipakai"
              description="Mulai dari Kursus atau Tes & Ujian. Data statistik akan muncul setelah ada konten."
            />
          )}
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
