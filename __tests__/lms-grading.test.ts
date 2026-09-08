import { applyManualScores, gradeExam } from '@/lib/hris/lms/grading';

const questions = [
  { id: 'mc1', question_type: 'multiple_choice', score: 2, correct_answer: 'A', options: [{ label: 'A', text: 'Ya', isCorrect: true }] },
  { id: 'es1', question_type: 'essay', score: 8, explanation: 'Sebutkan 3 poin' },
];

describe('LMS auto grading', () => {
  it('scores MC immediately and flags essay as needsManual', () => {
    const graded = gradeExam(questions, [
      { question_id: 'mc1', answer: 'A' },
      { question_id: 'es1', answer: 'Jawaban panjang' },
    ]);
    expect(graded.needsManual).toBe(true);
    expect(graded.totalScore).toBe(2);
    expect(graded.maxScore).toBe(10);
    expect(graded.pct).toBe(20);
  });
});

describe('LMS applyManualScores', () => {
  const autoAnswers = [
    { questionId: 'mc1', answer: 'A', score: 2, isCorrect: true },
    { questionId: 'es1', answer: 'Jawaban panjang', score: 0, isCorrect: null },
  ];

  it('recomputes percentage from max score instead of adding on top', () => {
    const graded = applyManualScores(questions, autoAnswers, [{ question_id: 'es1', score: 8, feedback: 'Lengkap' }], 70);
    expect(graded.totalScore).toBe(10);
    expect(graded.pct).toBe(100);
    expect(graded.isPassed).toBe(true);
    expect(graded.needsManual).toBe(false);
    expect(graded.answers.find((a) => a.questionId === 'es1')?.feedback).toBe('Lengkap');
  });

  it('caps essay score at question max and keeps queue open until all essays graded', () => {
    const extra = [...questions, { id: 'es2', question_type: 'essay', score: 5 }];
    const answers = [
      ...autoAnswers,
      { questionId: 'es2', answer: 'Pendek', score: 0, isCorrect: null },
    ];
    const graded = applyManualScores(extra, answers, [{ question_id: 'es1', score: 99 }], 70);
    const es1 = graded.answers.find((a) => a.questionId === 'es1');
    expect(es1?.score).toBe(8);
    expect(graded.needsManual).toBe(true);
    expect(graded.isPassed).toBe(false);
  });
});
