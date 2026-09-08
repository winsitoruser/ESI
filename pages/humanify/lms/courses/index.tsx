import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, BookOpen, ChevronRight, Users, Archive } from 'lucide-react';

const API = '/api/humanify/lms/courses';

export default function LmsCoursesPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ category: 'onboarding', certificate_enabled: true, certificate_validity_months: 12 });

  const load = useCallback(async () => {
    const d = await fetch(`${API}?action=list`).then((r) => r.json());
    setCourses(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = courses.filter((c) => showArchived || c.status !== 'archived');

  const create = async () => {
    if (!form.title?.trim()) {
      toast.error('Judul kursus wajib');
      return;
    }
    setActing('create');
    try {
      const res = await fetch(`${API}?action=create-course`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal');
      toast.success('Kursus dibuat');
      setModal(false);
      setForm({ category: 'onboarding', certificate_enabled: true, certificate_validity_months: 12 });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  const archive = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Arsipkan kursus "${title}"?`)) return;
    setActing(`arc-${id}`);
    try {
      const res = await fetch(`${API}?action=archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, curriculum_id: id }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal arsip');
      toast.success('Kursus diarsipkan');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsCourses')} subtitle="Kurikulum, modul pembelajaran, dan learning path terpadu">
        <TalentShell
          current="courses"
          title="Kursus & Learning Path"
          subtitle="Bangun kurikulum, modul, dan jalur pembelajaran untuk tim Anda."
          icon={BookOpen}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="hf-btn-secondary text-sm"
              >
                {showArchived ? 'Sembunyikan arsip' : 'Tampilkan arsip'}
              </button>
              <button type="button" onClick={() => setModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> Buat kursus
              </button>
            </div>
          }
        >

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((c) => {
              return (
                <div
                  key={c.id}
                  className="hf-tile group relative flex h-full min-h-[188px] flex-col overflow-hidden"
                >
                  <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
                  <Link href={`/humanify/lms/courses/${c.id}`} className="hf-tile-interactive flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col px-4 py-4 pl-5 pb-12">
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-md bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                          {String(c.category || 'general').replace('_', ' ')}
                        </span>
                        <LmsStatusBadge status={c.status} />
                      </div>
                      <h3 className="mt-3 font-semibold text-[color:var(--hf-ink)]">{c.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--hf-ink-muted)]">{c.description || 'Tanpa deskripsi'}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-[color:var(--hf-ink-muted)]">
                        <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{c.module_count || 0} modul</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.enrollment_count || 0} peserta</span>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)]">
                        Buka detail <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                  {c.status !== 'archived' && (
                    <button
                      type="button"
                      disabled={acting === `arc-${c.id}`}
                      onClick={(e) => archive(e, c.id, c.title)}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 hf-tile-nested px-2.5 py-1.5 text-xs font-medium text-[color:var(--hf-ink-muted)] hover:border-[var(--hf-brand-100)] hover:text-[color:var(--hf-brand-600)] disabled:opacity-50"
                    >
                      <Archive className="h-3.5 w-3.5" /> Arsip
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!visible.length && (
            <div className="rounded-[var(--hf-radius-xl)] border border-dashed border-[var(--hf-border)] bg-white py-16 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-[color:var(--hf-ink-muted)]">
                {courses.length ? 'Tidak ada kursus aktif — coba tampilkan arsip' : 'Belum ada kursus — buat kursus pertama untuk memulai learning path'}
              </p>
              {!courses.length && (
                <button type="button" onClick={() => setModal(true)} className="hf-btn-primary mt-4 inline-flex items-center gap-1.5 text-sm">
                  <Plus className="h-4 w-4" /> Buat kursus
                </button>
              )}
            </div>
          )}

          <Modal open={modal} onClose={() => setModal(false)} title="Buat Kursus Baru">
            <div className="space-y-3">
              <input className="hf-input w-full" placeholder="Judul kursus" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea className="hf-input w-full" placeholder="Deskripsi" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="hf-input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="onboarding">Onboarding</option>
                <option value="compliance">Compliance</option>
                <option value="technical">Technical</option>
                <option value="soft_skill">Soft Skill</option>
                <option value="general">General</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.certificate_enabled} onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })} />
                Terbitkan sertifikat otomatis
              </label>
              <button type="button" disabled={acting === 'create'} onClick={create} className="hf-btn-primary w-full disabled:opacity-50">
                {acting === 'create' ? 'Menyimpan…' : 'Buat Kursus'}
              </button>
            </div>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
