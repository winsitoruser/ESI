/**
 * ATS job opening custom fields — FlowHCM-style configurable opening form fields.
 */

export type JobFieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'url';

export interface JobCustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: JobFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  showOnCareers?: boolean;
}

export interface JobCustomFieldValue {
  key: string;
  value: string | number | boolean | null;
}

const KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;

export function normalizeFieldKey(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function sanitizeFieldDefs(input: unknown): JobCustomFieldDef[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: JobCustomFieldDef[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as any;
    const key = normalizeFieldKey(r.key || r.label || '');
    if (!key || !KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    const type = (['text', 'textarea', 'number', 'select', 'date', 'checkbox', 'url'].includes(r.type)
      ? r.type
      : 'text') as JobFieldType;
    let options: string[] | undefined;
    if (Array.isArray(r.options)) {
      options = r.options.map((o: any) => String(o).slice(0, 80)).filter(Boolean).slice(0, 30);
    } else if (typeof r.options === 'string' && r.options.trim()) {
      // Wave-89: parse comma-separated options from UI builder
      options = r.options.split(/[,;|]/).map((s: string) => s.trim().slice(0, 80)).filter(Boolean).slice(0, 30);
    }
    out.push({
      id: String(r.id || key),
      key,
      label: String(r.label || key).slice(0, 120),
      type,
      required: !!r.required,
      options: options?.length ? options : undefined,
      placeholder: r.placeholder ? String(r.placeholder).slice(0, 120) : undefined,
      showOnCareers: r.showOnCareers !== false,
    });
    if (out.length >= 20) break;
  }
  return out;
}

/** Count non-empty custom answer keys for badge display */
export function countCustomAnswers(raw: unknown): number {
  if (!raw) return 0;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return 0; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;
  return Object.values(obj as Record<string, unknown>).filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== '',
  ).length;
}

/** Count field defs on a job opening row */
export function countFieldDefs(raw: unknown): number {
  if (!raw) return 0;
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return 0; }
  }
  return Array.isArray(arr) ? arr.length : 0;
}

export function sanitizeFieldValues(
  defs: JobCustomFieldDef[],
  values: unknown,
): Record<string, string | number | boolean | null> {
  const map = new Map(defs.map((d) => [d.key, d]));
  const src = values && typeof values === 'object' && !Array.isArray(values)
    ? (values as Record<string, unknown>)
    : {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, def] of map) {
    const v = src[key];
    if (v === undefined || v === null || v === '') {
      if (def.required) out[key] = null;
      continue;
    }
    if (def.type === 'number') {
      const n = Number(v);
      out[key] = Number.isFinite(n) ? n : null;
    } else if (def.type === 'checkbox') {
      out[key] = v === true || v === 'true' || v === 1 || v === '1';
    } else {
      out[key] = String(v).slice(0, 2000);
    }
  }
  return out;
}

export const DEFAULT_JOB_FIELD_TEMPLATES: JobCustomFieldDef[] = [
  { id: 'experience_years', key: 'experience_years', label: 'Pengalaman (tahun)', type: 'number', required: false, showOnCareers: true },
  { id: 'education', key: 'education', label: 'Pendidikan minimal', type: 'select', options: ['SMA/SMK', 'D3', 'S1', 'S2'], required: false, showOnCareers: true },
  { id: 'work_mode', key: 'work_mode', label: 'Mode kerja', type: 'select', options: ['On-site', 'Hybrid', 'Remote'], required: false, showOnCareers: true },
  { id: 'hiring_manager', key: 'hiring_manager', label: 'Hiring manager', type: 'text', required: false, showOnCareers: false },
];
