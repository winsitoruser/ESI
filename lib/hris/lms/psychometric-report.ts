/**
 * Psychometric report generation from exam results
 */
import {
  interpretCognitiveScore,
  interpretIntegrityScore,
  interpretPersonalityScore,
} from './psychometric';

export interface PsychometricReportData {
  psychometric_type: string;
  overall_score: number;
  dimensions: Record<string, number>;
  interpretation: string;
  recommendations: string[];
  risk_level: string;
}

export function buildPsychometricReport(
  psychometricType: string,
  overallScore: number,
  answers: Array<{ questionId: string; answer: string; score?: number }>,
  questions: any[],
  passingScore = 70,
): PsychometricReportData {
  const dimensions: Record<string, number> = {};

  if (psychometricType === 'personality') {
    for (const q of questions) {
      if (q.question_type !== 'likert') continue;
      const ans = answers.find((a) => a.questionId === q.id);
      const opts = Array.isArray(q.options) ? q.options : [];
      const match = opts.find((o: any) => o.label === ans?.answer || o.text === ans?.answer);
      const dim = q.category || (Array.isArray(q.tags) && q.tags[0]) || 'general';
      const pts = match?.score != null ? Number(match.score) : 3;
      dimensions[dim] = (dimensions[dim] || 0) + pts;
    }
    const interp = interpretPersonalityScore(dimensions);
    return {
      psychometric_type: psychometricType,
      overall_score: overallScore,
      dimensions,
      interpretation: interp,
      recommendations: ['Pertimbangkan penempatan tim sesuai profil dominan', 'Follow-up interview perilaku disarankan'],
      risk_level: 'low',
    };
  }

  if (psychometricType === 'integrity') {
    const { level, label } = interpretIntegrityScore(overallScore);
    return {
      psychometric_type: psychometricType,
      overall_score: overallScore,
      dimensions: { integrity: overallScore },
      interpretation: label,
      recommendations: level === 'high'
        ? ['Kandidat menunjukkan integritas tinggi', 'Cocok untuk posisi handling kas/data sensitif']
        : ['Perlu wawancara lanjutan terkait etika kerja', 'Pertimbangkan reference check'],
      risk_level: level === 'critical' || level === 'low' ? level : 'medium',
    };
  }

  // cognitive default
  const { level, label } = interpretCognitiveScore(overallScore, passingScore);
  for (const q of questions) {
    const cat = q.category || q.difficulty || 'general';
    const ans = answers.find((a) => a.questionId === q.id);
    const correct = ans?.score != null ? Number(ans.score) > 0 : false;
    if (!dimensions[cat]) dimensions[cat] = 0;
    dimensions[cat] += correct ? 1 : 0;
  }
  return {
    psychometric_type: psychometricType || 'cognitive',
    overall_score: overallScore,
    dimensions,
    interpretation: label,
    recommendations: level === 'excellent'
      ? ['Kemampuan kognitif unggul — pertimbangkan fast-track development']
      : level === 'pass'
        ? ['Memenuhi standar minimum kognitif']
        : ['Rekomendasikan pelatihan dasar atau remedial'],
    risk_level: level === 'below' ? 'high' : level === 'borderline' ? 'medium' : 'low',
  };
}
