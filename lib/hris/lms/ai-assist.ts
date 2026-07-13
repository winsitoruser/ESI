/**
 * AI-assisted LMS helpers — rule-based question generation from SOP text
 * (No external LLM dependency — pattern extraction from document)
 */

export interface GeneratedQuestion {
  question_text: string;
  question_type: 'multiple_choice';
  options: Array<{ label: string; text: string }>;
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}

function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^[\d\.\-\*]+\s*/, '').trim())
    .filter((s) => s.length > 20 && s.length < 400);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateQuestionsFromSop(
  sopText: string,
  opts?: { count?: number; category?: string },
): GeneratedQuestion[] {
  const lines = sentences(sopText);
  const count = Math.min(opts?.count || 5, lines.length);
  if (!count) return [];

  const questions: GeneratedQuestion[] = [];
  const used = new Set<number>();

  while (questions.length < count && used.size < lines.length) {
    const idx = Math.floor(Math.random() * lines.length);
    if (used.has(idx)) continue;
    used.add(idx);

    const fact = lines[idx];
    const distractors = lines.filter((_, i) => i !== idx).slice(0, 3);
    if (distractors.length < 2) continue;

    const options = shuffle([
      { label: 'A', text: fact.slice(0, 120) },
      ...distractors.slice(0, 3).map((d, i) => ({
        label: String.fromCharCode(66 + i),
        text: d.slice(0, 120),
      })),
    ]).slice(0, 4);

    const labels = ['A', 'B', 'C', 'D'];
    options.forEach((o, i) => { o.label = labels[i]; });

    const correct = options.find((o) => o.text === fact.slice(0, 120))?.label || 'A';

    questions.push({
      question_text: `Manakah pernyataan yang BENAR sesuai SOP? (topik: "${fact.slice(0, 40)}...")`,
      question_type: 'multiple_choice',
      options,
      correct_answer: correct,
      difficulty: fact.length > 100 ? 'medium' : 'easy',
      category: opts?.category || 'sop',
    });
  }

  return questions;
}

export function summarizePsychometricForManager(report: {
  psychometric_type?: string;
  overall_score?: number;
  interpretation?: string;
  risk_level?: string;
  dimensions?: Record<string, unknown>;
}): string {
  const type = report.psychometric_type || 'assessment';
  const score = report.overall_score ?? 0;
  const risk = report.risk_level || 'low';
  const dims = report.dimensions && typeof report.dimensions === 'object'
    ? Object.entries(report.dimensions).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '';

  return [
    `Ringkasan ${type}: skor ${score}%, risiko ${risk}.`,
    report.interpretation || '',
    dims ? `Dimensi utama: ${dims}.` : '',
    risk === 'high' ? 'Rekomendasi: review manual oleh HR sebelum keputusan hiring.' : 'Rekomendasi: dapat dilanjutkan ke tahap berikutnya.',
  ].filter(Boolean).join(' ');
}

export function recommendLearningPaths(gaps: Array<{ competency_name: string; holders: number; total_employees?: number }>) {
  return gaps.slice(0, 5).map((g) => ({
    competency: g.competency_name,
    priority: (g.holders || 0) < 3 ? 'high' : 'medium',
    suggestion: `Assign kursus/kompetensi "${g.competency_name}" ke departemen dengan coverage rendah (${g.holders}/${g.total_employees || '?'} karyawan).`,
  }));
}
