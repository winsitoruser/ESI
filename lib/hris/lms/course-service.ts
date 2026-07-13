/**
 * LMS course / learning path helpers
 */
import crypto from 'crypto';

export type MaterialType = 'video' | 'pdf' | 'text' | 'link' | 'slide';

export interface LearningMaterial {
  id: string;
  type: MaterialType;
  title: string;
  url?: string;
  content?: string;
  duration_minutes?: number;
  order: number;
}

export function parseMaterials(raw: unknown): LearningMaterial[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: any, i) => ({
    id: m.id || `lesson-${i + 1}`,
    type: m.type || 'text',
    title: m.title || `Materi ${i + 1}`,
    url: m.url,
    content: m.content,
    duration_minutes: m.duration_minutes || 5,
    order: m.order ?? i + 1,
  })).sort((a, b) => a.order - b.order);
}

export function calcCurriculumProgress(
  modules: Array<{ id: string; materials?: unknown }>,
  completedLessonIds: Set<string>,
): number {
  let total = 0;
  let done = 0;
  for (const mod of modules) {
    const lessons = parseMaterials(mod.materials);
    total += Math.max(lessons.length, 1);
    if (lessons.length === 0) {
      if (completedLessonIds.has(`module:${mod.id}`)) done += 1;
    } else {
      done += lessons.filter((l) => completedLessonIds.has(l.id)).length;
    }
  }
  if (total === 0) return 0;
  return Math.round((done / total) * 10000) / 100;
}

export function generateVerifyToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function buildCertificateNumber(curriculumCode: string, employeeId: string): string {
  const suffix = employeeId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `HMF-${curriculumCode}-${suffix}-${Date.now().toString(36).toUpperCase()}`;
}
