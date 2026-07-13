/**
 * Psychometric interpretation helpers
 */
export function interpretPersonalityScore(dimensions: Record<string, number>): string {
  const entries = Object.entries(dimensions).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return 'Belum ada profil kepribadian';
  const top = entries.slice(0, 2).map(([k]) => k.replace(/_/g, ' '));
  return `Dominan: ${top.join(', ')}`;
}

export function interpretIntegrityScore(score: number): { level: string; label: string } {
  if (score >= 85) return { level: 'high', label: 'Integritas Tinggi' };
  if (score >= 70) return { level: 'medium', label: 'Integritas Cukup' };
  if (score >= 50) return { level: 'low', label: 'Perlu Perhatian' };
  return { level: 'critical', label: 'Risiko Integritas' };
}

export function interpretCognitiveScore(score: number, passingScore = 70): { level: string; label: string } {
  if (score >= passingScore + 15) return { level: 'excellent', label: 'Kognitif Unggul' };
  if (score >= passingScore) return { level: 'pass', label: 'Memenuhi Standar' };
  if (score >= passingScore - 10) return { level: 'borderline', label: 'Batas Ambang' };
  return { level: 'below', label: 'Di Bawah Standar' };
}

export const PSYCHOMETRIC_TEMPLATES = {
  cognitive: {
    title: 'Psikotes Kognitif',
    description: 'Mengukur kemampuan numerik, verbal, logika, dan analitis',
    categories: ['numerical', 'verbal', 'logical', 'analytical'],
    defaultDuration: 90,
  },
  personality: {
    title: 'Psikotes Kepribadian',
    description: 'Mengukur dimensi kepribadian (Big Five / DISC style)',
    categories: ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'],
    defaultDuration: 45,
  },
  integrity: {
    title: 'Psikotes Integritas',
    description: 'Situational judgment test untuk integritas dan etika kerja',
    categories: ['honesty', 'compliance', 'teamwork', 'responsibility'],
    defaultDuration: 30,
  },
};
