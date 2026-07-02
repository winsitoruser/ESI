import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2,
  Send, GraduationCap, Flag, ArrowLeft, PenTool, Eye
} from 'lucide-react';

const API_PORTAL = '/api/candidate/portal';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('candidate_token');
}

export default function ExamTakingPage() {
  const router = useRouter();
  const { id: examId } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [canAttempt, setCanAttempt] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  // Exam state
  const [started, setStarted] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const authHeaders = { Authorization: `Bearer ${getToken()}` };

  // Load exam detail
  useEffect(() => {
    if (!examId || !getToken()) return;
    setLoading(true);
    fetch(`${API_PORTAL}?action=exam-detail&exam_id=${examId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setExam(data.data.exam);
          setQuestions(data.data.questions);
          setCanAttempt(data.data.can_attempt);
          setAttemptsUsed(data.data.attempts_used);
          setTimeLeft((data.data.exam.duration_minutes || 60) * 60);
        } else {
          alert(data.error || 'Gagal memuat ujian');
          router.push('/candidate/dashboard');
        }
      })
      .catch(() => { alert('Error loading exam'); router.push('/candidate/dashboard'); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // Timer
  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
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

  // Start exam
  const handleStart = async () => {
    if (!canAttempt) return;
    try {
      const res = await fetch(`${API_PORTAL}?action=start-exam`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId })
      });
      const data = await res.json();
      if (data.success) {
        setResultId(data.data.id);
        setStarted(true);
        setTimeLeft((exam?.duration_minutes || 60) * 60);
      } else {
        alert(data.error || 'Gagal memulai ujian');
      }
    } catch { alert('Error starting exam'); }
  };

  // Submit exam
  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !confirm('Yakin ingin mengumpulkan ujian? Jawaban tidak bisa diubah setelah dikumpulkan.')) return;
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answerPayload = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        answer
      }));

      const res = await fetch(`${API_PORTAL}?action=submit-exam`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId, answers: answerPayload })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setResult(data.data);
      } else {
        alert(data.error || 'Gagal mengumpulkan ujian');
      }
    } catch { alert('Error submitting exam'); }
    setSubmitting(false);
  };

  const setAnswer = (qId: string, ans: string) => {
    setAnswers(prev => ({ ...prev, [qId]: ans }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const answeredCount = Object.keys(answers).length;
  const q = questions[currentQ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ═══════════════════════════════════
  // RESULT SCREEN
  // ═══════════════════════════════════
  if (submitted && result) {
    return (
      <>
        <Head><title>Hasil Ujian - {exam?.title}</title></Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.is_passed ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.is_passed ? <CheckCircle2 className="w-10 h-10 text-green-600" /> : <AlertCircle className="w-10 h-10 text-red-600" />}
            </div>
            <h1 className="text-2xl font-bold">{result.is_passed ? 'Selamat! Anda Lulus! 🎉' : 'Belum Lulus'}</h1>
            <p className="text-gray-500 mt-1">{exam?.title}</p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className={`text-3xl font-bold ${result.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(result.score_percentage || result.score || 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Skor</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-600">{result.total_correct || 0}</p>
                <p className="text-xs text-gray-500">Benar</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-gray-600">{questions.length}</p>
                <p className="text-xs text-gray-500">Total Soal</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              KKM: {exam?.passing_score} • Skor Anda: {Number(result.score_percentage || result.score || 0).toFixed(1)}
            </div>

            {result.needs_manual_grading && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                ⏳ Beberapa soal essay/praktik memerlukan penilaian manual oleh instruktur.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push('/candidate/dashboard')}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════
  // PRE-START SCREEN
  // ═══════════════════════════════════
  if (!started) {
    return (
      <>
        <Head><title>{exam?.title} - Ujian</title></Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold">{exam?.title}</h1>
              {exam?.description && <p className="text-sm text-gray-500 mt-2">{exam.description}</p>}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Jumlah Soal</span><strong>{exam?.total_questions}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Durasi</span><strong>{exam?.duration_minutes} menit</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">KKM (Passing Score)</span><strong>{exam?.passing_score}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Tipe</span><strong className="capitalize">{exam?.exam_type}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Percobaan</span><strong>{attemptsUsed}/{exam?.max_attempts}</strong></div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
              <h4 className="font-semibold mb-1">⚠️ Perhatian:</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Ujian akan dimulai setelah Anda menekan tombol "Mulai Ujian"</li>
                <li>Timer akan berjalan otomatis dan ujian akan otomatis dikumpulkan jika waktu habis</li>
                <li>Jawaban tidak dapat diubah setelah dikumpulkan</li>
                <li>Pastikan koneksi internet Anda stabil</li>
              </ul>
            </div>

            {canAttempt ? (
              <button onClick={handleStart}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                <PenTool className="w-5 h-5" /> Mulai Ujian
              </button>
            ) : (
              <div className="text-center text-red-600 text-sm font-medium">
                Batas percobaan sudah habis ({attemptsUsed}/{exam?.max_attempts})
              </div>
            )}

            <button onClick={() => router.back()} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700 flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════
  // EXAM IN PROGRESS
  // ═══════════════════════════════════
  return (
    <>
      <Head><title>Ujian: {exam?.title}</title></Head>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PenTool className="w-5 h-5 text-indigo-600" />
              <div>
                <h1 className="font-semibold text-sm">{exam?.title}</h1>
                <p className="text-xs text-gray-500">Soal {currentQ + 1} dari {questions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
              </div>
              <div className="text-xs text-gray-500">{answeredCount}/{questions.length} dijawab</div>
              <button onClick={() => setShowReview(!showReview)}
                className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Navigasi
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-6">
          {/* Main Question Area */}
          <div className="flex-1">
            {q && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                      {currentQ + 1}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{q.question_type?.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{q.score} poin</span>
                  </div>
                  <button onClick={() => toggleFlag(q.id)}
                    className={`p-1.5 rounded-lg transition ${flagged.has(q.id) ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                    <Flag className="w-4 h-4" />
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-gray-900 text-base leading-relaxed mb-6 whitespace-pre-wrap">{q.question_text}</div>

                {/* Answer Area */}
                {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && q.options && (
                  <div className="space-y-3">
                    {q.options.map((opt: any, i: number) => (
                      <button key={i} onClick={() => setAnswer(q.id, opt.label)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          answers[q.id] === opt.label
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          answers[q.id] === opt.label ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {opt.label}
                        </span>
                        <span className="text-sm">{opt.text}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(q.question_type === 'short_answer') && (
                  <input type="text" value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Ketik jawaban singkat..."
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none" />
                )}

                {(q.question_type === 'essay' || q.question_type === 'practical') && (
                  <textarea value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)}
                    rows={6} placeholder="Tulis jawaban Anda..."
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none resize-none" />
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-4 border-t">
                  <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
                    className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1 disabled:opacity-30 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>

                  {currentQ < questions.length - 1 ? (
                    <button onClick={() => setCurrentQ(currentQ + 1)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700">
                      Selanjutnya <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => handleSubmit(false)} disabled={submitting}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kumpulkan Ujian
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Question Navigator Sidebar */}
          {showReview && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20">
                <h3 className="font-semibold text-sm mb-3">Navigasi Soal</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((qq, i) => (
                    <button key={qq.id} onClick={() => setCurrentQ(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition relative ${
                        i === currentQ ? 'bg-indigo-600 text-white' :
                        answers[qq.id] ? 'bg-green-100 text-green-700 border border-green-300' :
                        'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {i + 1}
                      {flagged.has(qq.id) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Sudah dijawab</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-100" /> Belum dijawab</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-600" /> Soal aktif</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Ditandai</div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">{answeredCount}/{questions.length} soal dijawab</p>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                  </div>
                </div>

                <button onClick={() => handleSubmit(false)} disabled={submitting}
                  className="w-full mt-4 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kumpulkan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
