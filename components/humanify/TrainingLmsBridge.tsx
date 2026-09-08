import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, Award, PenTool, Link2, RefreshCw, ArrowRight } from 'lucide-react';

const SYNC_API = '/api/humanify/lms/sync';

const CURRENT_PATHS: Record<string, string> = {
  training: '/humanify/training',
  'training-development': '/humanify/training-development',
  'training-scoring': '/humanify/training-scoring',
  certificates: '/humanify/certificates',
  lms: '/humanify/lms',
};
const MODULE_LINKS = [
  { href: '/humanify/lms', label: 'Dasbor LMS', icon: GraduationCap },
  { href: '/humanify/training', label: 'Program pelatihan', icon: BookOpen },
  { href: '/humanify/training-development', label: 'Pengembangan', icon: BookOpen },
  { href: '/humanify/training-scoring', label: 'Skor training', icon: PenTool },
  { href: '/humanify/certificates', label: 'Registri sertifikat', icon: Award },
];

type Props = {
  currentModule: 'training' | 'training-development' | 'training-scoring' | 'certificates' | 'lms';
  showSync?: boolean;
};

export default function TrainingLmsBridge({ currentModule, showSync = true }: Props) {
  const [overview, setOverview] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SYNC_API}?action=overview`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOverview(d.data); })
      .catch(() => {});
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${SYNC_API}?action=sync-all`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Sinkron OK — ${data.data.certificates?.migrated || 0} sertifikat, ${data.data.exam_scores?.synced || 0} skor ujian`);
        const o = await fetch(`${SYNC_API}?action=overview`).then((r) => r.json());
        if (o.success) setOverview(o.data);
      } else {
        setSyncResult(data.error || 'Sinkron gagal');
      }
    } catch { setSyncResult('Sinkron gagal'); }
    setSyncing(false);
  };

  const hints: Record<string, string> = {
    training: 'Program pelatihan terhubung ke LMS — sertifikat disinkronkan ke registri.',
    'training-development': 'Kurikulum & batch di modul ini dipakai bersama LMS kursus & ujian.',
    'training-scoring': 'Hasil ujian LMS otomatis masuk ke skor training jika ada data kelulusan.',
    certificates: 'Registry menampilkan sertifikat dari LMS, program pelatihan, dan lisensi eksternal.',
    lms: 'LMS adalah platform utama — modul training tetap terhubung lewat sinkronisasi ini.',
  };

  return (
    <div className="hf-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
            <Link2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Integrasi Talent & Belajar</p>
            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{hints[currentModule]}</p>
          </div>
        </div>
        {showSync && (
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="hf-btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sinkronkan semua
          </button>
        )}
      </div>

      {overview && (
        <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
          {[
            { k: 'programs', l: 'Program' },
            { k: 'curricula', l: 'Kurikulum' },
            { k: 'lms_enrollments', l: 'LMS enroll' },
            { k: 'exam_passed', l: 'Lulus ujian' },
            { k: 'registry_certificates', l: 'Sertifikat' },
            { k: 'participant_scores', l: 'Skor' },
          ].map((s) => (
            <div key={s.k} className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] px-2 py-1.5 text-center">
              <p className="text-lg font-semibold tabular-nums text-[color:var(--hf-ink)]">{overview[s.k] ?? 0}</p>
              <p className="text-[10px] text-[color:var(--hf-ink-muted)]">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {syncResult && <p className="mt-2 text-xs text-[color:var(--hf-ink-muted)]">{syncResult}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {MODULE_LINKS.filter((m) => m.href !== CURRENT_PATHS[currentModule]).slice(0, 4).map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="inline-flex items-center gap-1 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-2 py-1 text-xs text-[color:var(--hf-ink-secondary)] hover:border-[var(--hf-brand-100)] hover:text-[color:var(--hf-brand-600)]"
          >
            <m.icon className="h-3 w-3 text-[color:var(--hf-brand-600)]" />
            {m.label}
            <ArrowRight className="h-3 w-3 opacity-40" />
          </Link>
        ))}
        <Link
          href="/humanify/lms/integrations"
          className="inline-flex items-center gap-1 rounded-[var(--hf-radius)] border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-2 py-1 text-xs font-medium text-[color:var(--hf-brand-600)]"
        >
          Integrasi LMS <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
