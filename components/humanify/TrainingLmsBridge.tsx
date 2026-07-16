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
  { href: '/humanify/lms', label: 'LMS Dashboard', icon: GraduationCap, color: 'text-indigo-600' },
  { href: '/humanify/training', label: 'Program Training', icon: BookOpen, color: 'text-violet-600' },
  { href: '/humanify/training-development', label: 'Pelatihan & Pengembangan', icon: BookOpen, color: 'text-emerald-600' },
  { href: '/humanify/training-scoring', label: 'Skor Training', icon: PenTool, color: 'text-purple-600' },
  { href: '/humanify/certificates', label: 'Certificate Registry', icon: Award, color: 'text-amber-600' },
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
        setSyncResult(`Sync OK — ${data.data.certificates?.migrated || 0} sertifikat, ${data.data.exam_scores?.synced || 0} skor ujian`);
        const o = await fetch(`${SYNC_API}?action=overview`).then((r) => r.json());
        if (o.success) setOverview(o.data);
      }
    } catch { setSyncResult('Sync gagal'); }
    setSyncing(false);
  };

  const hints: Record<string, string> = {
    training: 'Program Training terhubung ke LMS — sertifikat disinkronkan ke Certificate Registry.',
    'training-development': 'Kurikulum & batch di modul ini dipakai bersama LMS Kursus & Ujian.',
    'training-scoring': 'Hasil ujian LMS otomatis masuk ke Skor Training jika ada data graduation.',
    certificates: 'Registry menampilkan sertifikat dari LMS, Program Training, dan lisensi eksternal.',
    lms: 'LMS adalah platform utama — modul training legacy tetap terhubung via bridge.',
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-indigo-900 text-sm">Humanify Learn — Terintegrasi dengan LMS</p>
            <p className="text-xs text-indigo-700 mt-0.5">{hints[currentModule]}</p>
          </div>
        </div>
        {showSync && (
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sinkronkan Semua
          </button>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {[
            { k: 'programs', l: 'Program' },
            { k: 'curricula', l: 'Kurikulum' },
            { k: 'lms_enrollments', l: 'LMS Enroll' },
            { k: 'exam_passed', l: 'Lulus Ujian' },
            { k: 'registry_certificates', l: 'Sertifikat' },
            { k: 'participant_scores', l: 'Skor' },
          ].map((s) => (
            <div key={s.k} className="bg-white/80 rounded-lg px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-gray-900">{overview[s.k] ?? 0}</p>
              <p className="text-[10px] text-gray-500">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {syncResult && <p className="text-xs text-green-700 mt-2">{syncResult}</p>}

      <div className="flex flex-wrap gap-2 mt-3">
        {MODULE_LINKS.filter((m) => m.href !== CURRENT_PATHS[currentModule]).slice(0, 4).map((m) => (
          <Link key={m.href} href={m.href} className="flex items-center gap-1 px-2 py-1 bg-white border rounded-lg text-xs text-gray-700 hover:border-indigo-300">
            <m.icon className={`w-3 h-3 ${m.color}`} />{m.label}<ArrowRight className="w-3 h-3 opacity-40" />
          </Link>
        ))}
        <Link href="/humanify/lms/integrations" className="flex items-center gap-1 px-2 py-1 bg-white border rounded-lg text-xs text-indigo-600 hover:border-indigo-300">
          Integrasi LMS <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
