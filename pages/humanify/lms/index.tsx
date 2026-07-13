import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, lmsFetch } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import {
  GraduationCap, BookOpen, ClipboardList, Brain, Calendar, PenTool,
  BarChart3, Award, Users, ChevronRight,
} from 'lucide-react';
import TrainingLmsBridge from '@/components/humanify/TrainingLmsBridge';

const MODULES = [
  { id: 'courses', href: '/humanify/lms/courses', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50', label: 'Kursus & Learning Path', desc: 'Kurikulum, modul, materi video/PDF, progress belajar' },
  { id: 'question-bank', href: '/humanify/lms/question-bank', icon: BookOpen, color: 'text-blue-600 bg-blue-50', label: 'Bank Soal', desc: 'Bank soal terpusat — MC, essay, likert, situational' },
  { id: 'tests', href: '/humanify/lms/tests', icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50', label: 'Tes & Ujian', desc: 'Buat & kelola tes/ujian online' },
  { id: 'blueprints', href: '/humanify/lms/blueprints', icon: ClipboardList, color: 'text-amber-600 bg-amber-50', label: 'Blueprint Adaptif', desc: 'Randomisasi soal per kategori & tingkat kesulitan' },
  { id: 'psychometric', href: '/humanify/lms/psychometric', icon: Brain, color: 'text-purple-600 bg-purple-50', label: 'Psikotes', desc: 'Psikotes kognitif, kepribadian, integritas' },
  { id: 'psycho-reports', href: '/humanify/lms/psychometric-reports', icon: Brain, color: 'text-violet-600 bg-violet-50', label: 'Laporan Psikotes', desc: 'Interpretasi & rekomendasi hasil psikotes' },
  { id: 'schedules', href: '/humanify/lms/schedules', icon: Calendar, color: 'text-amber-600 bg-amber-50', label: 'Penjadwalan', desc: 'Penjadwalan tes per departemen/role' },
  { id: 'grading', href: '/humanify/lms/grading', icon: PenTool, color: 'text-teal-600 bg-teal-50', label: 'Penilaian', desc: 'Penilaian otomatis & manual grading' },
  { id: 'reports', href: '/humanify/lms/reports', icon: BarChart3, color: 'text-rose-600 bg-rose-50', label: 'Laporan', desc: 'Laporan hasil ujian' },
  { id: 'analytics', href: '/humanify/lms/analytics', icon: BarChart3, color: 'text-sky-600 bg-sky-50', label: 'Analytics L&D', desc: 'Heatmap departemen & skill gap' },
  { id: 'proctoring', href: '/humanify/lms/proctoring', icon: Users, color: 'text-orange-600 bg-orange-50', label: 'Proctoring', desc: 'Review sesi anti-cheat & snapshot kamera' },
  { id: 'integrations', href: '/humanify/lms/integrations', icon: Users, color: 'text-cyan-600 bg-cyan-50', label: 'Integrasi', desc: 'Rekrutmen, payroll, KPI, webhook' },
  { id: 'academy', href: '/humanify/lms/academy', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50', label: 'Academy', desc: 'Branding & peserta eksternal' },
  { id: 'ai-assistant', href: '/humanify/lms/ai-assistant', icon: GraduationCap, color: 'text-amber-600 bg-amber-50', label: 'AI Assistant', desc: 'Generate soal SOP & rekomendasi path' },
  { id: 'competency', href: '/humanify/lms/competency', icon: Award, color: 'text-green-600 bg-green-50', label: 'Kompetensi', desc: 'Sertifikat & riwayat kompetensi' },
  { id: 'access', href: '/humanify/lms/access', icon: Users, color: 'text-gray-600 bg-gray-50', label: 'Akses & Role', desc: 'Manajemen pengguna & role LMS' },
];

export default function LmsHubPage() {
  const { t } = useTranslation();
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

          <TrainingLmsBridge currentModule="lms" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Bank Soal', value: stats.questionBank || 0 },
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
            <span className="text-gray-400">|</span>
            <Link href="/humanify/training-development" className="text-indigo-600 hover:underline">Pelatihan & Pengembangan (legacy)</Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((m) => {
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
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
