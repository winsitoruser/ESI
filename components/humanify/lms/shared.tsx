import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LMS_STATUS_COLORS } from '@/lib/hris/lms/types';

export const LMS_API = '/api/humanify/lms';
export const EMPLOYEE_LMS_API = '/api/employee/lms';

export function LmsStatusBadge({ status }: { status: string }) {
  const cls = LMS_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

const PRIMARY_LINKS = [
  { id: 'hub', href: '/humanify/lms', label: 'Dashboard' },
  { id: 'courses', href: '/humanify/lms/courses', label: 'Kursus' },
  { id: 'tests', href: '/humanify/lms/tests', label: 'Tes & Ujian' },
  { id: 'question-bank', href: '/humanify/lms/question-bank', label: 'Bank Soal' },
  { id: 'grading', href: '/humanify/lms/grading', label: 'Penilaian' },
  { id: 'competency', href: '/humanify/lms/competency', label: 'Kompetensi' },
  { id: 'analytics', href: '/humanify/lms/analytics', label: 'Analytics' },
];

const MORE_LINKS = [
  { id: 'blueprints', href: '/humanify/lms/blueprints', label: 'Blueprint Adaptif' },
  { id: 'psychometric', href: '/humanify/lms/psychometric', label: 'Psikotes' },
  { id: 'psycho-reports', href: '/humanify/lms/psychometric-reports', label: 'Laporan Psikotes' },
  { id: 'schedules', href: '/humanify/lms/schedules', label: 'Penjadwalan' },
  { id: 'grading', href: '/humanify/lms/grading', label: 'Penilaian' },
  { id: 'reports', href: '/humanify/lms/reports', label: 'Laporan' },
  { id: 'proctoring', href: '/humanify/lms/proctoring', label: 'Proctoring' },
  { id: 'integrations', href: '/humanify/lms/integrations', label: 'Integrasi' },
  { id: 'academy', href: '/humanify/lms/academy', label: 'Academy' },
  { id: 'ai-assistant', href: '/humanify/lms/ai-assistant', label: 'AI Assistant' },
  { id: 'access', href: '/humanify/lms/access', label: 'Akses & Role' },
];

export function LmsPageNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const moreActive = MORE_LINKS.some((l) => l.id === active);

  return (
    <nav
      aria-label="Navigasi LMS"
      className="mb-4 flex min-w-0 flex-wrap items-center gap-1 overflow-x-auto hf-card p-1.5"
    >
      {PRIMARY_LINKS.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          className={`shrink-0 rounded-[var(--hf-radius)] px-3 py-1.5 text-sm font-medium transition ${
            active === l.id
              ? 'bg-[var(--hf-brand-600)] text-white'
              : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]'
          }`}
        >
          {l.label}
        </Link>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-[var(--hf-radius)] px-3 py-1.5 text-sm font-medium transition ${
            moreActive
              ? 'bg-[var(--hf-brand-600)] text-white'
              : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)] hover:bg-[var(--hf-brand-50)]'
          }`}
          aria-expanded={open}
        >
          Lainnya
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 z-30 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white py-1 shadow-[var(--hf-shadow-md)]">
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.id}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm ${
                    active === l.id
                      ? 'bg-[var(--hf-brand-50)] font-semibold text-[color:var(--hf-brand-600)]'
                      : 'text-[color:var(--hf-ink-secondary)] hover:bg-slate-50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

export async function lmsFetch(action: string, opts?: RequestInit & { method?: string }) {
  const url = `${LMS_API}?action=${action}`;
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } });
  return res.json();
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="hf-card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export const EMPTY_QUESTION_FORM = {
  question_type: 'multiple_choice',
  score: 1,
  difficulty: 'medium',
  options: [
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false },
  ],
};

export function LmsQuestionForm({
  form,
  onChange,
  courses = [],
  modules = [],
}: {
  form: any;
  onChange: (next: any) => void;
  courses?: Array<{ id: string; title: string }>;
  modules?: Array<{ id: string; title: string; curriculum_id?: string }>;
}) {
  const type = form.question_type || 'multiple_choice';
  const isMc = type === 'multiple_choice';
  const isTf = type === 'true_false';
  const isEssay = type === 'essay' || type === 'situational';
  const filteredMods = form.curriculum_id
    ? modules.filter((m) => !m.curriculum_id || m.curriculum_id === form.curriculum_id)
    : modules;

  const set = (patch: Record<string, unknown>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-3">
      {courses.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <select className="hf-input w-full" value={form.curriculum_id || ''} onChange={(e) => set({ curriculum_id: e.target.value || undefined, module_id: '' })}>
            <option value="">Semua kursus</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="hf-input w-full" value={form.module_id || ''} onChange={(e) => set({ module_id: e.target.value || undefined })}>
            <option value="">Semua modul</option>
            {filteredMods.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
      )}
      <select className="hf-input w-full" value={type} onChange={(e) => {
        const qt = e.target.value;
        if (qt === 'true_false') {
          set({
            question_type: qt,
            options: [
              { label: 'true', text: 'Benar', isCorrect: true },
              { label: 'false', text: 'Salah', isCorrect: false },
            ],
            correct_answer: 'true',
          });
        } else if (qt === 'multiple_choice') {
          set({ question_type: qt, options: EMPTY_QUESTION_FORM.options, correct_answer: 'A' });
        } else {
          set({ question_type: qt, options: [], correct_answer: '' });
        }
      }}>
        <option value="multiple_choice">Pilihan ganda</option>
        <option value="true_false">Benar / salah</option>
        <option value="essay">Essay</option>
        <option value="situational">Situational judgment</option>
      </select>
      <textarea className="hf-input min-h-[80px] w-full" placeholder="Teks soal" value={form.question_text || ''} onChange={(e) => set({ question_text: e.target.value })} />
      {isMc && (form.options || []).map((o: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 font-mono text-sm">{o.label}</span>
          <input className="hf-input flex-1" value={o.text} onChange={(e) => {
            const options = [...(form.options || [])];
            options[i] = { ...o, text: e.target.value };
            set({ options });
          }} placeholder={`Opsi ${o.label}`} />
          <label className="flex items-center gap-1 text-xs text-[color:var(--hf-ink-muted)]">
            <input
              type="radio"
              name="correct"
              checked={!!o.isCorrect}
              onChange={() => {
                const options = (form.options || []).map((x: any, j: number) => ({ ...x, isCorrect: j === i }));
                set({ options, correct_answer: o.label });
              }}
            />
            Kunci
          </label>
        </div>
      ))}
      {isTf && (
        <select className="hf-input w-full" value={form.correct_answer || 'true'} onChange={(e) => {
          const ans = e.target.value;
          set({
            correct_answer: ans,
            options: [
              { label: 'true', text: 'Benar', isCorrect: ans === 'true' },
              { label: 'false', text: 'Salah', isCorrect: ans === 'false' },
            ],
          });
        }}>
          <option value="true">Kunci: Benar</option>
          <option value="false">Kunci: Salah</option>
        </select>
      )}
      {isEssay && (
        <textarea className="hf-input min-h-[72px] w-full" placeholder="Rubrik / kunci penilaian essay (untuk penilai)" value={form.explanation || ''} onChange={(e) => set({ explanation: e.target.value })} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-[color:var(--hf-ink-muted)]">Poin
          <input type="number" className="hf-input mt-1 w-full" min={1} value={form.score ?? 1} onChange={(e) => set({ score: Number(e.target.value) || 1 })} />
        </label>
        <label className="text-sm text-[color:var(--hf-ink-muted)]">Kesulitan
          <select className="hf-input mt-1 w-full" value={form.difficulty || 'medium'} onChange={(e) => set({ difficulty: e.target.value })}>
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </select>
        </label>
      </div>
      <input className="hf-input w-full" placeholder="Kategori (contoh: onboarding, compliance)" value={form.category || ''} onChange={(e) => set({ category: e.target.value })} />
      <input className="hf-input w-full" placeholder="Tag, pisahkan koma" value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
    </div>
  );
}
