import Link from 'next/link';
import { LMS_STATUS_COLORS } from '@/lib/hris/lms/types';

export const LMS_API = '/api/humanify/lms';
export const EMPLOYEE_LMS_API = '/api/employee/lms';

export function LmsStatusBadge({ status }: { status: string }) {
  const cls = LMS_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

export function LmsPageNav({ active }: { active: string }) {
  const links = [
    { id: 'hub', href: '/humanify/lms', label: 'Dashboard' },
    { id: 'courses', href: '/humanify/lms/courses', label: 'Kursus & Learning Path' },
    { id: 'question-bank', href: '/humanify/lms/question-bank', label: 'Bank Soal' },
    { id: 'tests', href: '/humanify/lms/tests', label: 'Tes & Ujian' },
    { id: 'blueprints', href: '/humanify/lms/blueprints', label: 'Blueprint Adaptif' },
    { id: 'psychometric', href: '/humanify/lms/psychometric', label: 'Psikotes' },
    { id: 'psycho-reports', href: '/humanify/lms/psychometric-reports', label: 'Laporan Psikotes' },
    { id: 'schedules', href: '/humanify/lms/schedules', label: 'Penjadwalan' },
    { id: 'grading', href: '/humanify/lms/grading', label: 'Penilaian' },
    { id: 'reports', href: '/humanify/lms/reports', label: 'Laporan' },
    { id: 'analytics', href: '/humanify/lms/analytics', label: 'Analytics L&D' },
    { id: 'proctoring', href: '/humanify/lms/proctoring', label: 'Proctoring' },
    { id: 'competency', href: '/humanify/lms/competency', label: 'Kompetensi' },
    { id: 'access', href: '/humanify/lms/access', label: 'Akses & Role' },
  ];
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3 mb-6">
      {links.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === l.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {l.label}
        </Link>
      ))}
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
