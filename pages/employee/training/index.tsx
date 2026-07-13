import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GraduationCap, BookOpen, ClipboardList, Award, ChevronRight, Loader2 } from 'lucide-react';
import { Card, SectionHeader, StatusBadge } from '@/components/employee/portal-ui';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';

const API = '/api/employee/lms';

export default function EmployeeTrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`${API}?action=dashboard`).then((r) => r.json());
      if (d.error === 'Unauthorized') { router.push('/employee/login'); return; }
      setData(d.data || {});
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { exams = [], results = [], competencies = [], progress = [], employee } = data;

  return (
    <>
      <Head><title>Training & LMS — Portal Karyawan</title></Head>
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <HumanifyLogo className="h-8" />
          <div>
            <h1 className="font-bold text-gray-900">Training & Learning</h1>
            <p className="text-xs text-gray-500">{employee?.name}</p>
          </div>
          <Link href="/employee" className="ml-auto text-sm text-indigo-600">← Portal</Link>
        </header>

        <main className="max-w-lg mx-auto p-4 space-y-4">
          <SectionHeader title="Ujian Tersedia" />
          {exams.map((ex: any) => (
            <Card key={ex.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{ex.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{ex.duration_minutes} menit · {ex.my_attempts}/{ex.max_attempts} percobaan</p>
                  {ex.psychometric_type && <StatusBadge status={ex.psychometric_type} />}
                </div>
                {ex.my_attempts < ex.max_attempts && ex.status === 'open' ? (
                  <Link href={`/employee/training/exam/${ex.id}`} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">Mulai</Link>
                ) : (
                  <span className="text-xs text-gray-400">{ex.last_passed ? 'Lulus' : 'Selesai'}</span>
                )}
              </div>
            </Card>
          ))}
          {!exams.length && <p className="text-sm text-gray-400 text-center py-4">Tidak ada ujian aktif</p>}

          <SectionHeader title="Riwayat Hasil" />
          {results.slice(0, 5).map((r: any) => (
            <Card key={r.id} className="p-3 flex justify-between text-sm">
              <span>{r.exam_title}</span>
              <span className={r.is_passed ? 'text-green-600 font-medium' : 'text-red-600'}>{r.percentage ?? r.score}%</span>
            </Card>
          ))}

          <SectionHeader title="Kompetensi" />
          {competencies.map((c: any) => (
            <Card key={c.id} className="p-3 text-sm">
              <p className="font-medium">{c.competency_name}</p>
              <p className="text-gray-500 capitalize">{c.level} · {c.source_type}</p>
            </Card>
          ))}
          {!competencies.length && <p className="text-sm text-gray-400 text-center">Belum ada kompetensi tercatat</p>}
        </main>
      </div>
    </>
  );
}
