/**
 * AI-powered candidate screening — rule-based scoring with extensible ML hook
 */

export interface ScreeningCriteria {
  minExperienceYears?: number;
  requiredEducation?: string[];
  requiredSkills?: string[];
  minRating?: number;
  knockoutQuestions?: { question: string; requiredAnswer: string }[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  experienceYears?: number;
  education?: string;
  skills?: string[];
  rating?: number;
  source?: string;
  resumeText?: string;
  answers?: Record<string, string>;
}

export interface ScreeningResult {
  candidateId: string;
  candidateName: string;
  overallScore: number; // 0-100
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  matchBreakdown: { criterion: string; score: number; maxScore: number; passed: boolean }[];
  aiSummary: string;
  flags: string[];
  autoAdvance: boolean;
}

const EDUCATION_RANK: Record<string, number> = {
  'S3': 5, 'S2': 4, 'S1': 3, 'D4': 3, 'D3': 2, 'D2': 2, 'D1': 1, 'SMA': 1, 'SMK': 1,
};

export function screenCandidate(candidate: CandidateProfile, criteria: ScreeningCriteria): ScreeningResult {
  const breakdown: ScreeningResult['matchBreakdown'] = [];
  const flags: string[] = [];
  let totalScore = 0;
  let maxTotal = 0;

  // Experience (25 pts)
  const expMax = 25;
  maxTotal += expMax;
  const minExp = criteria.minExperienceYears ?? 0;
  const exp = candidate.experienceYears ?? 0;
  const expScore = minExp === 0 ? expMax : Math.min(expMax, Math.round((exp / minExp) * expMax));
  const expPassed = exp >= minExp;
  breakdown.push({ criterion: 'Pengalaman', score: expScore, maxScore: expMax, passed: expPassed });
  totalScore += expScore;
  if (!expPassed) flags.push(`Pengalaman ${exp} tahun (min ${minExp})`);

  // Education (20 pts)
  const eduMax = 20;
  maxTotal += eduMax;
  const eduRank = EDUCATION_RANK[(candidate.education || '').split(' ')[0]?.toUpperCase()] ?? 1;
  const reqRank = Math.max(...(criteria.requiredEducation || ['SMA']).map(e => EDUCATION_RANK[e.toUpperCase()] ?? 1));
  const eduScore = eduRank >= reqRank ? eduMax : Math.round((eduRank / reqRank) * eduMax);
  breakdown.push({ criterion: 'Pendidikan', score: eduScore, maxScore: eduMax, passed: eduRank >= reqRank });
  totalScore += eduScore;

  // Skills match (25 pts)
  const skillMax = 25;
  maxTotal += skillMax;
  const reqSkills = criteria.requiredSkills || [];
  const candSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const matched = reqSkills.filter(s => candSkills.some(c => c.includes(s.toLowerCase()) || s.toLowerCase().includes(c)));
  const skillScore = reqSkills.length === 0 ? skillMax : Math.round((matched.length / reqSkills.length) * skillMax);
  breakdown.push({ criterion: 'Skill Match', score: skillScore, maxScore: skillMax, passed: skillScore >= skillMax * 0.6 });
  totalScore += skillScore;

  // Rating (15 pts)
  const ratingMax = 15;
  maxTotal += ratingMax;
  const rating = candidate.rating ?? 0;
  const ratingScore = Math.round((rating / 5) * ratingMax);
  breakdown.push({ criterion: 'Rating', score: ratingScore, maxScore: ratingMax, passed: rating >= (criteria.minRating ?? 3) });
  totalScore += ratingScore;

  // Source quality (15 pts)
  const srcMax = 15;
  maxTotal += srcMax;
  const sourceScores: Record<string, number> = { linkedin: 15, dealls: 14, referral: 13, indeed: 12, google_jobs: 11, walk_in: 8, other: 5 };
  const srcScore = sourceScores[(candidate.source || 'other').toLowerCase()] ?? 5;
  breakdown.push({ criterion: 'Sumber', score: srcScore, maxScore: srcMax, passed: true });
  totalScore += srcScore;

  // Knockout questions
  for (const kq of criteria.knockoutQuestions || []) {
    const ans = candidate.answers?.[kq.question];
    if (ans && ans.toLowerCase() !== kq.requiredAnswer.toLowerCase()) {
      flags.push(`Knockout: ${kq.question}`);
      totalScore = Math.max(0, totalScore - 30);
    }
  }

  const overallScore = Math.round((totalScore / maxTotal) * 100);
  let recommendation: ScreeningResult['recommendation'];
  if (overallScore >= 85) recommendation = 'strong_yes';
  else if (overallScore >= 70) recommendation = 'yes';
  else if (overallScore >= 50) recommendation = 'maybe';
  else if (overallScore >= 30) recommendation = 'no';
  else recommendation = 'strong_no';

  const aiSummary = generateSummary(candidate, overallScore, recommendation, flags);

  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    overallScore,
    recommendation,
    matchBreakdown: breakdown,
    aiSummary,
    flags,
    autoAdvance: overallScore >= 70 && flags.length === 0,
  };
}

function generateSummary(c: CandidateProfile, score: number, rec: string, flags: string[]): string {
  const recLabel: Record<string, string> = {
    strong_yes: 'Sangat direkomendasikan untuk lanjut ke wawancara',
    yes: 'Memenuhi kriteria, lanjutkan ke tahap berikutnya',
    maybe: 'Perlu review manual HR',
    no: 'Kurang memenuhi kriteria minimum',
    strong_no: 'Tidak direkomendasikan',
  };
  let s = `${c.name}: Skor ${score}/100 — ${recLabel[rec]}. `;
  if (c.experienceYears) s += `Pengalaman ${c.experienceYears} tahun. `;
  if (flags.length) s += `Catatan: ${flags.join('; ')}.`;
  return s.trim();
}

export function batchScreen(candidates: CandidateProfile[], criteria: ScreeningCriteria): ScreeningResult[] {
  return candidates
    .map(c => screenCandidate(c, criteria))
    .sort((a, b) => b.overallScore - a.overallScore);
}

export const DEFAULT_SCREENING_CRITERIA: ScreeningCriteria = {
  minExperienceYears: 2,
  requiredEducation: ['SMA'],
  requiredSkills: [],
  minRating: 3,
};
