import { useState } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { Sparkles, Upload, Brain } from 'lucide-react';

const API = '/api/humanify/lms/ai';

export default function LmsAiAssistantPage() {
  const { t } = useTranslation();
  const [sopText, setSopText] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`${API}?action=generate-questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sop_text: sopText, count: 5 }),
    });
    const data = await res.json();
    setQuestions(data.data?.questions || []);
    setLoading(false);
  };

  const importBank = async () => {
    await fetch(`${API}?action=import-to-bank`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });
    alert(`${questions.length} soal diimpor ke bank soal`);
  };

  const loadRecommendations = async () => {
    const res = await fetch(`${API}?action=recommend-paths`, { method: 'POST' });
    const data = await res.json();
    setRecommendations(data.data?.recommendations || []);
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsAiAssistant')} subtitle="AI-assisted — generate soal dari SOP, rekomendasi learning path">
        <LmsPageNav active="ai-assistant" />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Generate Soal dari SOP</h3>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm h-40"
              placeholder="Tempel teks SOP / kebijakan perusahaan di sini (min. 50 karakter)..."
              value={sopText}
              onChange={(e) => setSopText(e.target.value)}
            />
            <button type="button" disabled={loading || sopText.length < 50} onClick={generate} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg disabled:opacity-50">
              {loading ? 'Memproses...' : 'Generate 5 Soal'}
            </button>
            {questions.length > 0 && (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={i} className="border rounded-lg p-2 text-sm">
                      <p className="font-medium">{i + 1}. {q.question_text}</p>
                      <p className="text-xs text-gray-500">Jawaban: {q.correct_answer}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={importBank} className="w-full py-2 border border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)] rounded-lg flex items-center justify-center gap-1">
                  <Upload className="w-4 h-4" /> Impor ke Bank Soal
                </button>
              </>
            )}
          </div>

          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" /> Rekomendasi Learning Path</h3>
            <p className="text-sm text-gray-500">Berdasarkan skill gap kompetensi per departemen</p>
            <button type="button" onClick={loadRecommendations} className="w-full py-2 bg-purple-600 text-white rounded-lg">Analisis Skill Gap</button>
            <div className="space-y-2">
              {recommendations.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.priority}</span>
                  <p className="mt-1">{r.suggestion}</p>
                </div>
              ))}
              {!recommendations.length && <p className="text-gray-400 text-sm">Klik analisis untuk melihat rekomendasi</p>}
            </div>
          </div>
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
