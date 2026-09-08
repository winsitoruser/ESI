import { useState, useEffect, useCallback, useMemo } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { PageGuard } from '@/components/permissions';
import { Modal, LmsStatusBadge, LmsQuestionForm, EMPTY_QUESTION_FORM } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import { QUESTION_TYPE_LABELS } from '@/lib/hris/lms/types';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Library } from 'lucide-react';

export default function QuestionBankPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_QUESTION_FORM });

  const loadMeta = useCallback(async () => {
    const [c, m] = await Promise.all([
      fetch('/api/humanify/lms/courses?action=list').then((r) => r.json()),
      fetch('/api/humanify/lms?action=modules').then((r) => r.json()),
    ]);
    setCourses(c.data || []);
    setModules(m.data || []);
  }, []);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ action: 'question-bank' });
    if (search) q.set('search', search);
    if (typeFilter) q.set('question_type', typeFilter);
    if (courseFilter) q.set('curriculum_id', courseFilter);
    const d = await fetch(`/api/humanify/lms?${q}`).then((r) => r.json());
    setItems(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, [search, typeFilter, courseFilter]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.question_text?.trim()) {
      toast.error('Teks soal wajib');
      return;
    }
    if (form.question_type === 'multiple_choice' && !(form.options || []).some((o: any) => o.isCorrect && o.text?.trim())) {
      toast.error('Pilih kunci jawaban dan isi opsi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/lms?action=create-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal menyimpan');
      toast.success('Soal masuk bank');
      setModal(false);
      setForm({ ...EMPTY_QUESTION_FORM });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus soal ini dari bank?')) return;
    await fetch(`/api/humanify/lms?action=delete-question&id=${id}`, { method: 'DELETE' });
    load();
  };

  const stats = useMemo(() => ({
    total: items.length,
    mc: items.filter((x) => x.question_type === 'multiple_choice' || x.question_type === 'true_false').length,
    essay: items.filter((x) => x.question_type === 'essay' || x.question_type === 'situational').length,
  }), [items]);

  const courseTitle = (id?: string) => courses.find((c) => c.id === id)?.title;
  const moduleTitle = (id?: string) => modules.find((m) => m.id === id)?.title;

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsQuestionBank')} subtitle="Bank soal terpusat — pilihan ganda dan essay per modul">
        <TalentShell
          current="bank"
          title="Bank Soal"
          subtitle="Kelola inventory soal pilihan ganda dan essay, tautkan ke kursus/modul, lalu impor ke tes."
          icon={Library}
          chips={[{ label: `${stats.total} soal` }, { label: `${stats.essay} essay` }]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={() => { setForm({ ...EMPTY_QUESTION_FORM }); setModal(true); }} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> Tambah soal
              </button>
            </div>
          )}
        >
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input className="hf-input w-full pl-9" placeholder="Cari teks, kode, atau kategori…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="hf-input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Semua tipe</option>
              <option value="multiple_choice">Pilihan ganda</option>
              <option value="true_false">Benar/salah</option>
              <option value="essay">Essay</option>
              <option value="situational">Situational</option>
            </select>
            <select className="hf-input w-auto" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">Semua kursus</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {!items.length ? (
            <HrisEmptyState
              source={dataSource}
              title="Bank soal masih kosong"
              description="Tambah pilihan ganda atau essay, tautkan ke modul, lalu impor ke tes ujian."
              action={(
                <button type="button" onClick={() => setModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                  <Plus className="h-4 w-4" /> Soal pertama
                </button>
              )}
            />
          ) : (
            <div className="hf-table-wrap">
              <table className="hf-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Soal</th>
                    <th>Tipe</th>
                    <th>Pemetaan</th>
                    <th>Poin</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => {
                    const meta = q.metadata || {};
                    return (
                      <tr key={q.id}>
                        <td>
                          <p className="font-mono text-[11px] text-[color:var(--hf-ink-faint)]">{q.code}</p>
                          <p className="max-w-lg truncate font-medium text-[color:var(--hf-ink)]">{q.question_text}</p>
                          <p className="text-[11px] text-[color:var(--hf-ink-muted)]">{q.category} · {q.difficulty}</p>
                        </td>
                        <td>{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</td>
                        <td className="text-xs text-[color:var(--hf-ink-muted)]">
                          {courseTitle(meta.curriculum_id) || '—'}
                          {meta.module_id ? ` · ${moduleTitle(meta.module_id) || 'modul'}` : ''}
                        </td>
                        <td className="tabular-nums">{q.score}</td>
                        <td><LmsStatusBadge status={q.status} /></td>
                        <td>
                          <button type="button" onClick={() => remove(q.id)} className="text-rose-600 hover:text-rose-800" aria-label="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Modal open={modal} onClose={() => setModal(false)} title="Tambah soal ke bank">
            <LmsQuestionForm form={form} onChange={setForm} courses={courses} modules={modules} />
            <button type="button" disabled={saving} onClick={save} className="hf-btn-primary mt-4 w-full disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan ke bank'}
            </button>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
