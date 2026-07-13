/**
 * LMS grading — auto-grade MC/TF/Likert, manual for essay
 */
export function gradeAnswer(question: any, userAnswer: string | null): { score: number; isCorrect: boolean | null } {
  const maxScore = Number(question.score) || 1;
  if (!userAnswer) return { score: 0, isCorrect: false };

  const qType = question.question_type || 'multiple_choice';

  if (qType === 'essay' || qType === 'situational') {
    return { score: 0, isCorrect: null }; // manual grading
  }

  if (qType === 'likert') {
    // Personality: score from option metadata
    const opts = Array.isArray(question.options) ? question.options : [];
    const match = opts.find((o: any) => o.label === userAnswer || o.text === userAnswer);
    const pts = match?.score != null ? Number(match.score) : maxScore;
    return { score: pts, isCorrect: null };
  }

  if (qType === 'true_false' || qType === 'multiple_choice') {
    const correct = (question.correct_answer || '').trim().toLowerCase();
    const given = userAnswer.trim().toLowerCase();
    if (correct && given === correct) return { score: maxScore, isCorrect: true };
    // MC: check options isCorrect flag
    const opts = Array.isArray(question.options) ? question.options : [];
    const correctOpt = opts.find((o: any) => o.isCorrect);
    if (correctOpt && (userAnswer === correctOpt.label || userAnswer === correctOpt.text)) {
      return { score: maxScore, isCorrect: true };
    }
    return { score: 0, isCorrect: false };
  }

  return { score: 0, isCorrect: false };
}

export function gradeExam(questions: any[], answers: Array<{ question_id: string; answer: string }>) {
  let totalScore = 0;
  let totalCorrect = 0;
  let totalAnswered = 0;
  let needsManual = false;
  const gradedAnswers: any[] = [];

  for (const q of questions) {
    const ua = answers.find((a) => a.question_id === q.id);
    const answer = ua?.answer ?? null;
    if (answer) totalAnswered++;
    const { score, isCorrect } = gradeAnswer(q, answer);
    if (isCorrect === null && (q.question_type === 'essay' || q.question_type === 'situational')) {
      needsManual = true;
    }
    if (isCorrect === true) totalCorrect++;
    totalScore += score;
    gradedAnswers.push({ questionId: q.id, answer, score, isCorrect });
  }

  const maxScore = questions.reduce((s, q) => s + (Number(q.score) || 1), 0);
  const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return { totalScore, maxScore, pct, totalCorrect, totalAnswered, gradedAnswers, needsManual };
}

export function computeIntegrityScore(flags: {
  tab_switch_count?: number;
  fullscreen_exit_count?: number;
  copy_paste_count?: number;
  idle_warnings?: number;
}): number {
  const tab = flags.tab_switch_count || 0;
  const fs = flags.fullscreen_exit_count || 0;
  const cp = flags.copy_paste_count || 0;
  const idle = flags.idle_warnings || 0;
  const penalty = tab * 5 + fs * 8 + cp * 10 + idle * 3;
  return Math.max(0, 100 - penalty);
}
