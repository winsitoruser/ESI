import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2,
  Send, Flag, ArrowLeft, Eye, Shield,
} from 'lucide-react';

const API = '/api/employee/lms';

export default function EmployeeExamPage() {
  const router = useRouter();
  const { id: examId } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [canAttempt, setCanAttempt] = useState(false);
  const [started, setStarted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityWarned = useRef(false);

  const reportEvent = useCallback(async (event_type: string) => {
    if (!resultId) return;
    try {
      await fetch(`${API}?action=exam-event`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId, event_type }),
      });
    } catch { /* ignore */ }
  }, [resultId]);

  // Anti-cheat: tab visibility
  useEffect(() => {
    if (!started || submitted) return;
    const onVis = () => {
      if (document.hidden) {
        reportEvent('tab_switch');
        if (!visibilityWarned.current) {
          visibilityWarned.current = true;
          alert('Peringatan: Jangan berpindah tab selama ujian!');
        }
      }
    };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); reportEvent('copy_paste'); };
    const onFs = () => { if (!document.fullscreenElement && exam?.fullscreen_required) reportEvent('fullscreen_exit'); };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [started, submitted, exam, reportEvent]);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    fetch(`${API}?action=exam-detail&exam_id=${examId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setExam(data.data.exam);
          setQuestions(data.data.questions);
          setCanAttempt(data.data.can_attempt);
          setTimeLeft((data.data.exam.duration_minutes || 60) * 60);
        } else {
          alert(data.error || 'Gagal memuat ujian');
          router.push('/employee/training');
        }
      })
      .finally(() => setLoading(false));
  }, [examId, router]);

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!canAttempt) return;
    if (exam?.fullscreen_required && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch { /* ignore */ }
    }
    const res = await fetch(`${API}?action=start-exam`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId }),
    });
    const data = await res.json();
    if (data.success) {
      setResultId(data.data.id);
      setStarted(true);
      setTimeLeft((exam?.duration_minutes || 60) * 60);
    } else alert(data.error);
  };

  const handleSubmit = async (auto = false) => {
    if (submitting || submitted) return;
    if (!auto && !confirm('Kumpulkan jawaban?')) return;
    setSubmitting(true);
    const answerArr = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
    const res = await fetch(`${API}?action=submit-exam`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_id: resultId, answers: answerArr }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      setSubmitted(true);
      setResult(data.data);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else alert(data.error);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!started) {
    return (
      <>
        <Head><title>{exam?.title} — Ujian</title></Head>
        <div className="min-h-screen bg-slate-50 p-6 max-w-lg mx-auto">
          <Link href="/employee/training" className="text-sm text-indigo-600 flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
          <h1 className="text-xl font-bold">{exam?.title}</h1>
          <p className="text-gray-500 mt-2">{exam?.description}</p>
          <div className="mt-4 space-y-2 text-sm">
            <p>⏱ {exam?.duration_minutes} menit · {questions.length} soal</p>
            <p>Nilai lulus: {exam?.passing_score}%</p>
            {exam?.anti_cheat_enabled && <p className="flex items-center gap-1 text-orange-600"><Shield className="w-4 h-4" /> Mode anti-cheating aktif</p>}
          </div>
          <button type="button" disabled={!canAttempt} onClick={handleStart} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {canAttempt ? 'Mulai Ujian' : 'Batas percobaan habis'}
          </button>
        </div>
      </>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-lg mx-auto text-center">
        <CheckCircle2 className={`w-16 h-16 mx-auto mb-4 ${result.is_passed ? 'text-green-500' : 'text-red-500'}`} />
        <h1 className="text-xl font-bold">{result.is_passed ? 'Lulus!' : result.needs_manual ? 'Dikumpulkan' : 'Belum Lulus'}</h1>
        <p className="text-3xl font-bold mt-2">{result.percentage?.toFixed?.(1) ?? result.percentage}%</p>
        {result.integrity_score != null && <p className="text-sm text-gray-500 mt-2">Integrity: {result.integrity_score}</p>}
        <Link href="/employee/training" className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl">Kembali</Link>
      </div>
    );
  }

  const q = questions[currentQ];
  if (!q) return null;

  return (
    <>
      <Head><title>Ujian — Soal {currentQ + 1}/{questions.length}</title></Head>
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 bg-indigo-600 text-white px-4 py-3 flex justify-between items-center z-10">
          <span className="text-sm font-medium">{currentQ + 1}/{questions.length}</span>
          <span className={`flex items-center gap-1 font-mono ${timeLeft < 300 ? 'text-red-200' : ''}`}><Clock className="w-4 h-4" />{formatTime(timeLeft)}</span>
          {exam?.anti_cheat_enabled && <Shield className="w-4 h-4 opacity-70" />}
        </div>

        <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
          <div className="flex justify-between mb-3">
            <button type="button" onClick={() => setFlagged((f) => { const n = new Set(f); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })} className={flagged.has(q.id) ? 'text-orange-500' : 'text-gray-400'}>
              <Flag className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-900 font-medium mb-4">{q.question_text}</p>
          <div className="space-y-2">
            {(Array.isArray(q.options) ? q.options : []).map((o: any) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setAnswers({ ...answers, [q.id]: o.label })}
                className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${answers[q.id] === o.label ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
              >
                <span className="font-mono mr-2">{o.label}.</span>{o.text}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 max-w-2xl mx-auto w-full">
          <button type="button" disabled={currentQ === 0} onClick={() => setCurrentQ((c) => c - 1)} className="p-3 border rounded-xl disabled:opacity-30"><ChevronLeft /></button>
          {currentQ < questions.length - 1 ? (
            <button type="button" onClick={() => setCurrentQ((c) => c + 1)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">Lanjut</button>
          ) : (
            <button type="button" onClick={() => handleSubmit()} disabled={submitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kumpulkan
            </button>
          )}
          <button type="button" disabled={currentQ >= questions.length - 1} onClick={() => setCurrentQ((c) => c + 1)} className="p-3 border rounded-xl disabled:opacity-30"><ChevronRight /></button>
        </div>
      </div>
    </>
  );
}
