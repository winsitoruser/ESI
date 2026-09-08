import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { PageGuard } from '@/components/permissions';
import { Modal, LmsQuestionForm, EMPTY_QUESTION_FORM } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import { QUESTION_TYPE_LABELS } from '@/lib/hris/lms/types';
import { Plus, ArrowLeft, Import, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [questions, setQuestions] = useState<any[]>([]);
  const [bank, setBank] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<any>({ ...EMPTY_QUESTION_FORM });
  const [saving, setSaving] = useState(false);
  const [bankType, setBankType] = useState('');
  const [bankScope, setBankScope] = useState<'mapped' | 'all'>('mapped');

  const load = useCallback(async () => {
    if (!id) return;
    const [q, t] = await Promise.all([
      fetch(`/api/humanify/lms?action=exam-questions&exam_id=${id}`).then((r) => r.json()),
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()),
    ]);
    setQuestions(q.data || []);
    setExam((t.data || []).find((x: any) => x.id === id));
  }, [id]);

  const loadBank = async (ex = exam) => {
    const q = new URLSearchParams({ action: 'question-bank' });
    if (bankType) q.set('question_type', bankType);
    if (bankScope === 'mapped' && ex?.curriculum_id) q.set('curriculum_id', ex.curriculum_id);
    if (bankScope === 'mapped' && ex?.module_id) q.set('module_id', ex.module_id);
    const d = await fetch(`/api/humanify/lms?${q}`).then((r) => r.json());
    setBank(d.data || []);
  };

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: questions.length,
    essay: questions.filter((q) => q.question_type === 'essay' || q.question_type === 'situational').length,
    max: questions.reduce((s, q) => s + (Number(q.score) || 1), 0),
  }), [questions]);

  const addQuestion = async () => {
    if (!form.question_text?.trim()) {
      toast.error('Teks soal wajib');
      return;
    }
    if (form.question_type === 'multiple_choice' && !(form.options || []).some((o: any) => o.isCorrect && o.text?.trim())) {
      toast.error('Isi opsi dan pilih kunci jawaban');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/lms?action=create-exam-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, exam_id: id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal menambah soal');
      toast.success('Soal ditambahkan ke tes');
      setModal(false);
      setForm({ ...EMPTY_QUESTION_FORM });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const importFromBank = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/lms?action=import-questions-to-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: id, question_ids: selected }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal impor');
      toast.success(`${selected.length} soal diimpor`);
      setImportModal(false);
      setSelected([]);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const mappingLabel = [exam?.curriculum_title, exam?.module_title].filter(Boolean).join(' · ');

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={exam?.title || 'Kelola soal tes'} subtitle="Susun pilihan ganda dan essay sesuai modul">
        <TalentShell
          current="tests"
          title={exam?.title || 'Kelola soal tes'}
          subtitle={mappingLabel ? `Dipetakan ke ${mappingLabel}. Tambah soal baru atau impor dari bank.` : 'Tambah soal manual atau impor dari bank soal.'}
          icon={ClipboardList}
          chips={[
            { label: `${stats.total} soal` },
            { label: `${stats.essay} essay` },
            { label: `${stats.max} poin` },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/humanify/lms/tests" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                <ArrowLeft className="h-4 w-4" /> Semua tes
              </Link>
              <button type="button" onClick={() => { setForm({ ...EMPTY_QUESTION_FORM }); setModal(true); }} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> Soal baru
              </button>
              <button
                type="button"
                onClick={() => { loadBank(); setImportModal(true); }}
                className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <Import className="h-4 w-4" /> Impor bank soal
              </button>
            </div>
          }
        >
          {!questions.length ? (
            <HrisEmptyState
              title="Tes belum punya soal"
              description="Tulis pilihan ganda atau essay, atau impor dari bank yang sudah dipetakan ke modul ini."
              action={
                <button type="button" onClick={() => setModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                  <Plus className="h-4 w-4" /> Soal pertama
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => {
                const opts = Array.isArray(q.options) ? q.options : [];
                const isEssay = q.question_type === 'essay' || q.question_type === 'situational';
                return (
                  <div key={q.id} className="hf-card p-4">
                    <p className="mb-1 text-xs text-[color:var(--hf-ink-muted)]">
                      Soal #{q.question_number || i + 1} · {QUESTION_TYPE_LABELS[q.question_type] || q.question_type} · {q.score} poin
                      {q.difficulty ? ` · ${q.difficulty}` : ''}
                    </p>
                    <p className="font-medium text-[color:var(--hf-ink)]">{q.question_text}</p>
                    {!isEssay && opts.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-[color:var(--hf-ink-secondary)]">
                        {opts.map((o: any) => (
                          <li key={o.label} className={o.isCorrect ? 'font-medium text-[color:var(--hf-brand-600)]' : ''}>
                            {o.label}. {o.text}{o.isCorrect ? ' (kunci)' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isEssay && q.explanation && (
                      <p className="mt-2 text-xs text-[color:var(--hf-ink-muted)]">Rubrik: {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Modal open={modal} onClose={() => setModal(false)} title="Tambah soal ke tes">
            <LmsQuestionForm form={form} onChange={setForm} />
            <button type="button" disabled={saving} onClick={addQuestion} className="hf-btn-primary mt-4 w-full disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan ke tes'}
            </button>
          </Modal>

          <Modal open={importModal} onClose={() => setImportModal(false)} title="Impor dari bank soal">
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                className="hf-input w-auto"
                value={bankType}
                onChange={(e) => { setBankType(e.target.value); }}
              >
                <option value="">Semua tipe</option>
                <option value="multiple_choice">Pilihan ganda</option>
                <option value="true_false">Benar/salah</option>
                <option value="essay">Essay</option>
                <option value="situational">Situational</option>
              </select>
              <select className="hf-input w-auto" value={bankScope} onChange={(e) => setBankScope(e.target.value as 'mapped' | 'all')}>
                <option value="mapped">Sesuai kursus/modul tes</option>
                <option value="all">Seluruh bank</option>
              </select>
              <button type="button" className="hf-btn-secondary text-sm" onClick={() => loadBank()}>Terapkan filter</button>
            </div>
            <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
              {bank.map((q) => (
                <label key={q.id} className="flex cursor-pointer items-start gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-border)] p-2 hover:bg-[var(--hf-surface-muted)]">
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, q.id] : selected.filter((x) => x !== q.id))}
                  />
                  <span className="text-sm">
                    <span className="mr-1 text-[11px] font-medium text-[color:var(--hf-ink-muted)]">
                      {QUESTION_TYPE_LABELS[q.question_type] || q.question_type}
                    </span>
                    {q.question_text}
                  </span>
                </label>
              ))}
              {!bank.length && <p className="py-6 text-center text-sm text-[color:var(--hf-ink-muted)]">Tidak ada soal yang cocok. Ubah filter atau buat soal di bank.</p>}
            </div>
            <button type="button" onClick={importFromBank} disabled={!selected.length || saving} className="hf-btn-primary w-full disabled:opacity-50">
              Impor {selected.length} soal
            </button>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
