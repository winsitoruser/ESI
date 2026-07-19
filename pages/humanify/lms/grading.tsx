import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { PenTool } from 'lucide-react';

export default function GradingPage() {
  const { t } = useTranslation();
  const [results, setResults] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tab, setTab] = useState<'auto' | 'manual' | 'integrity'>('auto');
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [gradeModal, setGradeModal] = useState<any>(null);
  const [manualScore, setManualScore] = useState(0);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      fetch('/api/humanify/lms?action=results').then((x) => x.json()),
      fetch('/api/humanify/lms?action=exam-sessions&flagged=true').then((x) => x.json()),
    ]);
    setResults(r.data || []);
    setSessions(s.data || []);
    setDataSource(r.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const manualQueue = results.filter((r) => r.metadata?.needs_manual === true || r.status === 'submitted');
  const graded = results.filter((r) => r.status === 'graded');

  const submitManual = async () => {
    await fetch('/api/humanify/lms?action=manual-grade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_id: gradeModal.id, scores: [{ question_id: 'essay', score: manualScore }], feedback: 'Manual graded' }),
    });
    setGradeModal(null);
    load();
  };

  return (
    <PageGuard anyPermission={['lms.grade', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsGrading')} subtitle="Penilaian otomatis MC/TF dan manual grading essay">
        <LmsPageNav active="grading" />
        <DataSourceBadge source={dataSource} className="mb-4" />

        <div className="flex gap-2 mb-4">
          {(['auto', 'manual', 'integrity'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-gray-100'}`}>
              {t === 'auto' ? 'Sudah Dinilai' : t === 'manual' ? `Manual (${manualQueue.length})` : `Integritas (${sessions.length})`}
            </button>
          ))}
        </div>

        {tab === 'auto' && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="p-3 text-left">Peserta</th><th className="p-3">Tes</th><th className="p-3">Skor</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {graded.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.employee_name}</td>
                    <td className="p-3">{r.exam_title}</td>
                    <td className="p-3 font-medium">{r.percentage ?? r.score}%</td>
                    <td className="p-3"><LmsStatusBadge status={r.is_passed ? 'passed' : 'failed'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-3">
            {manualQueue.map((r) => (
              <div key={r.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{r.employee_name}</p>
                  <p className="text-sm text-gray-500">{r.exam_title} — perlu penilaian manual (essay/situational)</p>
                </div>
                <button type="button" onClick={() => setGradeModal(r)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-1"><PenTool className="w-4 h-4" /> Nilai</button>
              </div>
            ))}
            {!manualQueue.length && <p className="text-gray-400 text-center py-8">Tidak ada antrian penilaian manual</p>}
          </div>
        )}

        {tab === 'integrity' && (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white border rounded-xl p-4 border-orange-200">
                <p className="font-medium">{s.employee_name} — {s.exam_title}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Tab switch: {s.tab_switch_count} · Fullscreen exit: {s.fullscreen_exit_count} · Copy/paste: {s.copy_paste_count}
                </p>
                <p className="text-sm">Integrity score: <strong>{s.integrity_score ?? '-'}</strong></p>
                <LmsStatusBadge status={s.status} />
              </div>
            ))}
            {!sessions.length && <p className="text-gray-400 text-center py-8">Tidak ada sesi yang di-flag</p>}
          </div>
        )}

        <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Penilaian Manual">
          <p className="text-sm mb-3">{gradeModal?.employee_name} — {gradeModal?.exam_title}</p>
          <input type="number" className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Skor" value={manualScore} onChange={(e) => setManualScore(+e.target.value)} />
          <button type="button" onClick={submitManual} className="w-full py-2 bg-teal-600 text-white rounded-lg">Simpan Nilai</button>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
