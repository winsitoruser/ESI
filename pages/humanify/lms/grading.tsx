import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { PageGuard } from '@/components/permissions';
import { Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { PenTool } from 'lucide-react';

function parseAnswers(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function answerFor(answers: any[], questionId: string) {
  return answers.find((a) => (a.questionId || a.question_id) === questionId);
}

export default function GradingPage() {
  const { t } = useTranslation();
  const [results, setResults] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tab, setTab] = useState<'auto' | 'manual' | 'integrity'>('auto');
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [gradeModal, setGradeModal] = useState<any>(null);
  const [essayItems, setEssayItems] = useState<any[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const openGrade = async (r: any) => {
    setGradeModal(r);
    setOverallFeedback(r.feedback || '');
    setLoadingDetail(true);
    try {
      const q = await fetch(`/api/humanify/lms?action=exam-questions&exam_id=${r.exam_id}`).then((x) => x.json());
      const questions = q.data || [];
      const answers = parseAnswers(r.answers);
      const essays = questions.filter((item: any) => item.question_type === 'essay' || item.question_type === 'situational');
      const nextScores: Record<string, number> = {};
      const nextFb: Record<string, string> = {};
      for (const eq of essays) {
        const a = answerFor(answers, eq.id);
        nextScores[eq.id] = Number(a?.score) || 0;
        nextFb[eq.id] = a?.feedback || '';
      }
      setEssayItems(essays.map((eq: any) => ({
        ...eq,
        learnerAnswer: answerFor(answers, eq.id)?.answer || '',
      })));
      setScoreMap(nextScores);
      setFeedbackMap(nextFb);
    } finally {
      setLoadingDetail(false);
    }
  };

  const submitManual = async () => {
    if (!gradeModal) return;
    setSaving(true);
    try {
      const scores = essayItems.map((q) => ({
        question_id: q.id,
        score: Number(scoreMap[q.id]) || 0,
        feedback: feedbackMap[q.id] || undefined,
      }));
      const res = await fetch('/api/humanify/lms?action=manual-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: gradeModal.id, scores, feedback: overallFeedback }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal menilai');
      toast.success(j.data?.needs_manual ? 'Nilai sebagian tersimpan' : 'Penilaian selesai');
      setGradeModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageGuard anyPermission={['lms.grade', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsGrading')} subtitle="Penilaian otomatis MC/TF dan manual grading essay">
        <TalentShell
          current="grading"
          title="Penilaian ujian"
          subtitle="MC/benar-salah dinilai otomatis. Essay dan situational dinilai per soal dengan rubrik."
          icon={PenTool}
          actions={<DataSourceBadge source={dataSource} />}
        >
          <EnterpriseTabBar
            tabs={[
              { key: 'auto', label: 'Sudah dinilai', count: graded.length },
              { key: 'manual', label: 'Antrian essay', count: manualQueue.length },
              { key: 'integrity', label: 'Integritas', count: sessions.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'auto' && (
            graded.length ? (
              <div className="hf-table-wrap">
                <table className="hf-table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Peserta</th>
                      <th>Tes</th>
                      <th>Skor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graded.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.employee_name}</td>
                        <td>{r.exam_title}</td>
                        <td className="tabular-nums">{r.percentage ?? r.score}%</td>
                        <td><LmsStatusBadge status={r.is_passed ? 'passed' : 'failed'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <HrisEmptyState source={dataSource} title="Belum ada hasil dinilai" description="Hasil muncul setelah peserta mengumpulkan tes tanpa essay, atau setelah essay dinilai." />
            )
          )}

          {tab === 'manual' && (
            <div className="space-y-3">
              {manualQueue.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 hf-card p-4">
                  <div>
                    <p className="font-medium text-[color:var(--hf-ink)]">{r.employee_name}</p>
                    <p className="text-sm text-[color:var(--hf-ink-muted)]">
                      {r.exam_title} — skor otomatis sementara {r.percentage ?? r.score}% (essay belum lengkap)
                    </p>
                  </div>
                  <button type="button" onClick={() => openGrade(r)} className="hf-btn-primary inline-flex items-center gap-1 text-sm">
                    <PenTool className="h-4 w-4" /> Nilai per soal
                  </button>
                </div>
              ))}
              {!manualQueue.length && (
                <HrisEmptyState title="Tidak ada antrian essay" description="Tes dengan essay akan masuk sini setelah peserta mengumpulkan." />
              )}
            </div>
          )}

          {tab === 'integrity' && (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="hf-card p-4">
                  <p className="font-medium">{s.employee_name} — {s.exam_title}</p>
                  <p className="mt-1 text-sm text-[color:var(--hf-ink-secondary)]">
                    Tab switch: {s.tab_switch_count} · Keluar fullscreen: {s.fullscreen_exit_count} · Salin/tempel: {s.copy_paste_count}
                  </p>
                  <p className="text-sm">Skor integritas: <strong>{s.integrity_score ?? '-'}</strong></p>
                  <LmsStatusBadge status={s.status} />
                </div>
              ))}
              {!sessions.length && <HrisEmptyState title="Tidak ada sesi yang di-flag" description="Peringatan muncul jika peserta sering pindah tab, keluar fullscreen, atau menyalin jawaban." />}
            </div>
          )}

          <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Nilai essay per soal">
            <p className="mb-3 text-sm text-[color:var(--hf-ink-secondary)]">{gradeModal?.employee_name} — {gradeModal?.exam_title}</p>
            {loadingDetail ? (
              <p className="py-6 text-center text-sm text-[color:var(--hf-ink-muted)]">Memuat jawaban…</p>
            ) : (
              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                {essayItems.map((q, i) => (
                  <div key={q.id} className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] p-3">
                    <p className="text-xs text-[color:var(--hf-ink-muted)]">Essay #{i + 1} · maks {q.score} poin</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--hf-ink)]">{q.question_text}</p>
                    {q.explanation && <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">Rubrik: {q.explanation}</p>}
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-[var(--hf-surface-muted)] p-2 text-sm">
                      {q.learnerAnswer || <span className="text-[color:var(--hf-ink-faint)]">Tidak ada jawaban</span>}
                    </p>
                    <label className="mt-2 block text-sm text-[color:var(--hf-ink-muted)]">
                      Skor (0–{q.score})
                      <input
                        type="number"
                        min={0}
                        max={Number(q.score) || 1}
                        className="hf-input mt-1 w-full"
                        value={scoreMap[q.id] ?? 0}
                        onChange={(e) => setScoreMap({ ...scoreMap, [q.id]: Number(e.target.value) })}
                      />
                    </label>
                    <textarea
                      className="hf-input mt-2 min-h-[56px] w-full"
                      placeholder="Umpan balik untuk soal ini"
                      value={feedbackMap[q.id] || ''}
                      onChange={(e) => setFeedbackMap({ ...feedbackMap, [q.id]: e.target.value })}
                    />
                  </div>
                ))}
                {!essayItems.length && <p className="text-sm text-[color:var(--hf-ink-muted)]">Tidak ada soal essay pada tes ini.</p>}
                <textarea
                  className="hf-input min-h-[64px] w-full"
                  placeholder="Umpan balik keseluruhan (opsional)"
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                />
              </div>
            )}
            <button type="button" disabled={saving || loadingDetail || !essayItems.length} onClick={submitManual} className="hf-btn-primary mt-4 w-full disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan penilaian'}
            </button>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
