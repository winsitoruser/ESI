import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronRight, Loader2 } from 'lucide-react';
import { Card, SectionHeader } from '@/components/employee/portal-ui';

const API = '/api/employee/lms';

export default function TrainingTab() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        fetch(`${API}?action=dashboard`).then((r) => r.json()),
        fetch(`${API}?action=my-courses`).then((r) => r.json()),
      ]);
      setExams(d.data?.exams || []);
      setResults(d.data?.results || []);
      setCourses(c.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Training & LMS" />
      <Link href="/employee/training" className="text-sm text-indigo-600 flex items-center gap-1">Lihat semua <ChevronRight className="w-4 h-4" /></Link>
      </div>

      {courses.slice(0, 2).map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{c.title}</p>
              <p className="text-xs text-gray-500">{c.progress_pct || 0}% selesai</p>
            </div>
            <Link href={`/employee/training/course/${c.curriculum_id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">Belajar</Link>
          </div>
        </Card>
      ))}

      <SectionHeader title="Ujian Aktif" />
      {exams.filter((e) => e.status === 'open').slice(0, 3).map((ex) => (
        <Card key={ex.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{ex.title}</p>
              <p className="text-xs text-gray-500">{ex.duration_minutes} menit</p>
            </div>
            <Link href={`/employee/training/exam/${ex.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">Mulai</Link>
          </div>
        </Card>
      ))}
      {!exams.length && <p className="text-sm text-gray-400 text-center py-4">Tidak ada ujian aktif</p>}

      {results.length > 0 && (
        <>
          <SectionHeader title="Riwayat Terbaru" />
          {results.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-3 flex justify-between text-sm">
              <span>{r.exam_title}</span>
              <span className={r.is_passed ? 'text-green-600' : 'text-gray-600'}>{r.percentage ?? r.score}%</span>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
