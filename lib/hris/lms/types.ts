export type PsychometricType = 'cognitive' | 'personality' | 'integrity' | null;
export type QuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'likert' | 'situational';

export interface QuestionBankItem {
  id: string;
  code: string;
  category: string;
  psychometric_type?: PsychometricType;
  question_type: QuestionType;
  question_text: string;
  options?: Array<{ label: string; text: string; isCorrect?: boolean; score?: number }>;
  correct_answer?: string;
  score: number;
  difficulty: string;
  tags?: string[];
  explanation?: string;
  status: string;
}

export interface ExamSessionFlags {
  tab_switch_count: number;
  fullscreen_exit_count: number;
  copy_paste_count: number;
  idle_warnings: number;
}

export const PSYCHOMETRIC_LABELS: Record<string, string> = {
  cognitive: 'Psikotes Kognitif',
  personality: 'Psikotes Kepribadian',
  integrity: 'Psikotes Integritas',
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Pilihan Ganda',
  true_false: 'Benar/Salah',
  essay: 'Essay',
  likert: 'Skala Likert',
  situational: 'Situational Judgment',
};

export const LMS_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  graded: 'bg-teal-100 text-teal-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  flagged: 'bg-orange-100 text-orange-700',
};
