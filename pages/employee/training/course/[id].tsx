import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Award, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { ContentPlayer } from '@/components/humanify/lms/ContentPlayer';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import type { LearningMaterial } from '@/lib/hris/lms/course-service';

const API = '/api/employee/lms';

export default function EmployeeCoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [certResult, setCertResult] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const d = await fetch(`${API}?action=course-detail&curriculum_id=${id}`).then((r) => r.json());
    if (d.error) { router.push('/employee/training'); return; }
    setData(d.data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const completedSet = new Set<string>(data?.completed_lessons || []);
  const modules = data?.modules || [];
  const mod = modules[activeModule];
  const lessons: LearningMaterial[] = mod?.materials || [];
  const lesson = lessons[activeLesson];

  const completeLesson = async () => {
    if (!lesson || !mod) return;
    await fetch(`${API}?action=complete-lesson`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        curriculum_id: id, module_id: mod.id, lesson_id: lesson.id, time_spent_seconds: 60,
      }),
    });
    await load();
    if (activeLesson < lessons.length - 1) setActiveLesson((i) => i + 1);
    else if (activeModule < modules.length - 1) { setActiveModule((i) => i + 1); setActiveLesson(0); }
  };

  const finishCourse = async () => {
    setCompleting(true);
    const d = await fetch(`${API}?action=complete-course`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum_id: id }),
    }).then((r) => r.json());
    setCompleting(false);
    if (d.success) setCertResult(d.data);
  };

  const allDone = (data?.progress_pct || 0) >= 100;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (certResult?.certificate) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-lg mx-auto text-center">
        <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold">Selamat! Kursus Selesai</h1>
        <p className="text-gray-600 mt-2">Sertifikat Anda telah diterbitkan</p>
        <p className="font-mono text-sm mt-4 bg-white border rounded-lg p-3">{certResult.certificate.certificateNumber}</p>
        {certResult.verify_url && (
          <Link href={certResult.verify_url} className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
            Verifikasi sertifikat
          </Link>
        )}
        <Link href="/employee/training" className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl">Kembali</Link>
      </div>
    );
  }

  return (
    <>
      <Head><title>{data?.curriculum?.title} — Belajar</title></Head>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link href="/employee/training"><ArrowLeft className="w-5 h-5" /></Link>
          <HumanifyLogo className="h-7" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{data?.curriculum?.title}</h1>
            <div className="h-1.5 bg-gray-200 rounded-full mt-1">
              <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${data?.progress_pct || 0}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{data?.progress_pct || 0}% selesai</p>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-4 gap-4">
          <aside className="md:col-span-1 space-y-2">
            {modules.map((m: any, mi: number) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setActiveModule(mi); setActiveLesson(0); }}
                className={`w-full text-left p-3 rounded-xl border text-sm ${activeModule === mi ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`}
              >
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-gray-500">{m.progress_pct || 0}%</p>
              </button>
            ))}
            {allDone && (
              <button type="button" disabled={completing} onClick={finishCourse} className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Klaim Sertifikat
              </button>
            )}
          </aside>

          <main className="md:col-span-3">
            {lesson ? (
              <>
                <div className="flex gap-1 mb-3 overflow-x-auto">
                  {lessons.map((l, li) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setActiveLesson(li)}
                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${activeLesson === li ? 'bg-indigo-600 text-white' : completedSet.has(l.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
                    >
                      {li + 1}. {l.title}
                    </button>
                  ))}
                </div>
                <ContentPlayer
                  material={lesson}
                  completed={completedSet.has(lesson.id)}
                  onComplete={completeLesson}
                />
              </>
            ) : (
              <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
                Modul ini belum memiliki materi pembelajaran
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
