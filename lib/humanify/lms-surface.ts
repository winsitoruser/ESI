/**
 * LMS surface cut — GA vs lab (P2).
 * Lab routes remain in codebase but are redirected unless HUMANIFY_LMS_LAB=true.
 */

export const LMS_GA_PATH_PREFIXES = [
  '/humanify/lms',
  '/humanify/lms/courses',
  '/humanify/lms/tests',
  '/humanify/lms/competency',
  '/humanify/lms/analytics',
] as const;

/** Exact lab page segments under /humanify/lms/* */
export const LMS_LAB_SEGMENTS = new Set([
  'question-bank',
  'blueprints',
  'psychometric',
  'psychometric-reports',
  'schedules',
  'grading',
  'reports',
  'proctoring',
  'integrations',
  'academy',
  'ai-assistant',
  'access',
]);

export const LMS_LAB_API_SEGMENTS = new Set([
  'academy',
  'ai',
  'blueprints',
  'integrations',
  'sync',
]);

export function isLmsLabEnabled(): boolean {
  return String(process.env.HUMANIFY_LMS_LAB || '').toLowerCase() === 'true';
}

/** True if pathname is an LMS lab page (not GA). */
export function isLmsLabPath(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (!path.startsWith('/humanify/lms/')) return false;
  const rest = path.slice('/humanify/lms/'.length);
  const first = rest.split('/')[0];
  if (!first) return false;
  // GA nested: courses/:id, tests/:id
  if (first === 'courses' || first === 'tests' || first === 'competency' || first === 'analytics') {
    return false;
  }
  return LMS_LAB_SEGMENTS.has(first);
}

export function isLmsLabApiPath(pathname: string): boolean {
  const path = pathname.split('?')[0];
  const m = path.match(/^\/api\/humanify\/lms\/([^/?]+)/);
  if (!m) return false;
  if (m[1] === 'courses' || m[1] === 'index' || m[1] === 'analytics') return false;
  return LMS_LAB_API_SEGMENTS.has(m[1]);
}

export const LMS_GA_MODULES = [
  { id: 'courses', href: '/humanify/lms/courses', label: 'Kursus & Learning Path', desc: 'Kurikulum, modul, materi, progress belajar' },
  { id: 'tests', href: '/humanify/lms/tests', label: 'Tes & Ujian', desc: 'Buat & kelola tes/ujian online' },
  { id: 'competency', href: '/humanify/lms/competency', label: 'Kompetensi & Sertifikat', desc: 'Sertifikat & riwayat kompetensi' },
  { id: 'analytics', href: '/humanify/lms/analytics', label: 'Analytics L&D', desc: 'Heatmap departemen & skill gap' },
] as const;
