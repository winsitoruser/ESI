import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Loader2, CheckCircle, Star, Send, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, SectionHeader } from '@/components/employee/portal-ui';

type SurveyQuestion = {
  id: string;
  text?: string;
  question?: string;
  type?: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
};

type Survey = {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  isAnonymous: boolean;
  questions: SurveyQuestion[];
  responded: boolean;
  endDate?: string | null;
};

function questionLabel(q: SurveyQuestion) {
  return q.text || q.question || 'Pertanyaan';
}

function SurveyForm({ survey, onDone }: { survey: Survey; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (qId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    const missing = survey.questions.filter((q) => answers[q.id] === undefined || answers[q.id] === '');
    if (missing.length > 0) {
      toast.error('Lengkapi semua pertanyaan sebelum mengirim');
      return;
    }
    setSubmitting(true);
    try {
      const payload = survey.questions.map((q) => ({
        question_id: q.id,
        questionId: q.id,
        answer: answers[q.id],
      }));
      const res = await fetch('/api/employee/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: survey.id, answers: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim survei');
      toast.success(json.message || 'Survei terkirim');
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengirim survei');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card variant="elevated" className="ring-2 ring-violet-200/80 border-violet-100">
      <div className="p-4 space-y-4">
        <div>
          <p className="font-bold text-slate-900">{survey.title}</p>
          {survey.description && <p className="text-xs text-slate-500 mt-1">{survey.description}</p>}
          {survey.isAnonymous && (
            <p className="text-[10px] text-violet-600 mt-2">Respons Anda bersifat anonim</p>
          )}
        </div>

        {survey.questions.map((q, idx) => {
          const label = questionLabel(q);
          const type = q.type || 'text';
          return (
            <div key={q.id || idx} className="space-y-2">
              <p className="text-sm font-medium text-slate-800">
                {idx + 1}. {label}
              </p>
              {(type === 'rating' || type === 'scale') && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 }, (_, i) => {
                    const val = (q.scaleMin || 1) + i;
                    const selected = answers[q.id] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswer(q.id, val)}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold border transition-colors ${
                          selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              )}
              {type === 'choice' && q.options?.length ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)}
                        className="text-violet-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : null}
              {(type === 'text' || type === 'open' || (!['rating', 'scale', 'choice'].includes(type))) && (
                <textarea
                  value={String(answers[q.id] || '')}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Tulis jawaban Anda..."
                />
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white py-3 text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Mengirim...' : 'Kirim Survei'}
        </button>
      </div>
    </Card>
  );
}

export default function SurveysTab() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/surveys');
      const json = await res.json();
      setSurveys(json.data || []);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = surveys.filter((s) => !s.responded);
  const completed = surveys.filter((s) => s.responded);
  const activeSurvey = surveys.find((s) => s.id === activeId);

  if (activeSurvey && !activeSurvey.responded) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveId(null)}
          className="text-sm text-violet-600 font-medium"
        >
          ← Kembali ke daftar
        </button>
        <SurveyForm
          survey={activeSurvey}
          onDone={() => { setActiveId(null); load(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Survei & Engagement"
        subtitle="Bagikan masukan Anda untuk membantu HR meningkatkan lingkungan kerja"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : surveys.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-sm text-slate-500">
            <Star className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Belum ada survei aktif saat ini
          </div>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perlu diisi ({pending.length})</p>
              {pending.map((s) => (
                <Card key={s.id} variant="elevated" className={s.isMandatory ? 'ring-2 ring-amber-200' : ''}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900">{s.title}</p>
                        {s.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {s.isMandatory && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Wajib</span>
                          )}
                          <span className="text-[10px] text-slate-400">{s.questions.length} pertanyaan</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className="shrink-0 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold"
                      >
                        Isi
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selesai ({completed.length})</p>
              {completed.map((s) => (
                <Card key={s.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="font-medium text-sm text-slate-800 truncate">{s.title}</p>
                    </div>
                    {expanded === s.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {expanded === s.id && s.description && (
                    <p className="px-4 pb-4 text-xs text-slate-500">{s.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
