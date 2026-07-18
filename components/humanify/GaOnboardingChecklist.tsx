/**
 * First-week HR GA checklist — local progress + deep links (PM-1).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Users, Clock, Calendar, DollarSign, UserCheck, FileText,
} from 'lucide-react';

const STORAGE_KEY = 'humanify-ga-checklist-v1';

const STEPS = [
  { id: 'import', label: 'Impor / tambah karyawan', href: '/humanify/employees-import', icon: Users },
  { id: 'docs', label: 'Upload dokumen inti (KTP/NPWP)', href: '/humanify/employees', icon: FileText },
  { id: 'attendance', label: 'Cek absensi / clock', href: '/humanify/attendance', icon: Clock },
  { id: 'leave', label: 'Ajukan / setujui cuti uji', href: '/humanify/leave', icon: Calendar },
  { id: 'payroll', label: 'Jalankan payroll (kalkulasi)', href: '/humanify/payroll', icon: DollarSign },
  { id: 'ess', label: 'Buka ESS / portal karyawan', href: '/humanify/ess', icon: UserCheck },
];

export default function GaOnboardingChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch { /* */ }
    setReady(true);
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  const completed = STEPS.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  if (!ready) return null;

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/40 shadow-sm">
      <div className="flex items-center justify-between border-b border-violet-100/60 px-5 py-4">
        <div>
          <h3 className="font-semibold text-gray-900">Checklist hari pertama HR</h3>
          <p className="text-xs text-slate-500 mt-0.5">Journey GA — {completed}/{STEPS.length} selesai ({pct}%)</p>
        </div>
        <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-violet-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-violet-50">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isDone = Boolean(done[step.id]);
          return (
            <li key={step.id} className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/40">
              <button
                type="button"
                onClick={() => toggle(step.id)}
                className="flex-shrink-0 text-violet-600"
                aria-label={isDone ? 'Tandai belum' : 'Tandai selesai'}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
              </button>
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <Link href={step.href} className={`flex-1 text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-violet-700'}`}>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
