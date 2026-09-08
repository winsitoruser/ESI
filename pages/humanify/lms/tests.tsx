import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HRStatCard from '@/components/humanify/HRStatCard';
import { PageGuard } from '@/components/permissions';
import { Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import {
  Plus, Play, Square, Settings, ClipboardList, Search, Trash2, Clock, Target, Shield,
} from 'lucide-react';

export default function LmsTestsPage() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<any>({
    exam_type: 'online',
    passing_score: 70,
    duration_minutes: 60,
    max_attempts: 1,
    shuffle_questions: true,
    anti_cheat_enabled: true,
    proctor_enabled: false,
    fullscreen_required: false,
    curriculum_id: '',
    module_id: '',
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [d, c, m] = await Promise.all([
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()),
      fetch('/api/humanify/lms/courses?action=list').then((r) => r.json()),
      fetch('/api/humanify/lms?action=modules').then((r) => r.json()),
    ]);
    setTests(d.data || []);
    setCourses(c.data || []);
    setModules(m.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const open = tests.filter((x) => x.status === 'open').length;
    const draft = tests.filter((x) => x.status === 'draft' || !x.status).length;
    const questions = tests.reduce((s, x) => s + (Number(x.question_count) || 0), 0);
    return { total: tests.length, open, draft, questions };
  }, [tests]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tests.filter((ex) => {
      if (statusFilter !== 'all' && String(ex.status || 'draft') !== statusFilter) return false;
      if (!term) return true;
      return String(ex.title || '').toLowerCase().includes(term)
        || String(ex.description || '').toLowerCase().includes(term);
    });
  }, [tests, q, statusFilter]);

  const create = async () => {
    if (!form.title?.trim()) {
      toast.error('Judul tes wajib diisi');
      return;
    }
    setActing('create');
    try {
      const res = await fetch('/api/humanify/lms?action=create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal membuat tes');
      toast.success('Tes dibuat');
      setModal(false);
      setForm({
        exam_type: 'online',
        passing_score: 70,
        duration_minutes: 60,
        max_attempts: 1,
        shuffle_questions: true,
        anti_cheat_enabled: true,
        proctor_enabled: false,
        fullscreen_required: false,
        curriculum_id: '',
        module_id: '',
      });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  const toggleExam = async (exam_id: string, open: boolean) => {
    setActing(`${open ? 'open' : 'close'}-${exam_id}`);
    try {
      const res = await fetch(`/api/humanify/lms?action=${open ? 'open-exam' : 'close-exam'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id, id: exam_id }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal mengubah status');
      toast.success(open ? 'Tes dibuka' : 'Tes ditutup');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  const removeExam = async (exam_id: string, title: string) => {
    if (!window.confirm(`Hapus tes "${title}"? Soal terkait juga akan dihapus.`)) return;
    setActing(`del-${exam_id}`);
    try {
      const res = await fetch(`/api/humanify/lms?action=delete-test&id=${encodeURIComponent(exam_id)}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal menghapus');
      toast.success('Tes dihapus');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsTests')} subtitle="Pembuatan dan pengelolaan tes/ujian online">
        <TalentShell
          current="tests"
          title="Tes & Ujian"
          subtitle="Buat ujian online, atur anti-cheat, lalu buka/tutup sesi untuk peserta."
          icon={ClipboardList}
          chips={[
            { label: `${stats.total} tes` },
            { label: `${stats.open} dibuka` },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={() => setModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> Buat tes
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OpsKpiShell>
              <HRStatCard icon={ClipboardList} label="Total tes" value={stats.total} accent="violet" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Play} label="Sedang dibuka" value={stats.open} accent="emerald" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Square} label="Draft" value={stats.draft} accent="blue" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Target} label="Total soal" value={stats.questions} accent="amber" />
            </OpsKpiShell>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input
                className="hf-input w-full pl-9"
                placeholder="Cari judul atau deskripsi tes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="hf-input sm:w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="grid gap-3">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                className="flex flex-wrap items-center justify-between gap-4 hf-card p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-[color:var(--hf-ink)]">{ex.title}</h3>
                    <LmsStatusBadge status={ex.status || 'draft'} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-[color:var(--hf-ink-muted)]">
                    {ex.description || 'Tanpa deskripsi'}
                  </p>
                  {(ex.curriculum_title || ex.module_title) && (
                    <p className="mt-1 text-xs font-medium text-[color:var(--hf-brand-600)]">
                      {ex.curriculum_title}{ex.module_title ? ` · ${ex.module_title}` : ''}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--hf-ink-muted)]">
                    <span className="inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{ex.question_count || 0} soal{ex.essay_count ? ` · ${ex.essay_count} esai` : ''}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ex.duration_minutes || 0} menit</span>
                    <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" />lulus {ex.passing_score || 70}%</span>
                    {ex.anti_cheat_enabled && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                        <Shield className="h-3 w-3" /> Anti-cheat
                      </span>
                    )}
                    {ex.proctor_enabled && (
                      <span className="rounded-md bg-[var(--hf-brand-50)] px-2 py-0.5 font-medium text-[color:var(--hf-brand-600)]">Proctor</span>
                    )}
                    {ex.shuffle_questions && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Random soal</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/humanify/lms/tests/${ex.id}`}
                    className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm"
                  >
                    <Settings className="h-4 w-4" /> Kelola soal
                  </Link>
                  {ex.status !== 'open' ? (
                    <button
                      type="button"
                      disabled={acting === `open-${ex.id}`}
                      onClick={() => toggleExam(ex.id, true)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" /> Buka
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={acting === `close-${ex.id}`}
                      onClick={() => toggleExam(ex.id, false)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Square className="h-4 w-4" /> Tutup
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={acting === `del-${ex.id}`}
                    onClick={() => removeExam(ex.id, ex.title)}
                    className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </button>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <div className="rounded-[var(--hf-radius-xl)] border border-dashed border-[var(--hf-border)] bg-white py-16 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-[color:var(--hf-ink-muted)]">
                  {tests.length ? 'Tidak ada tes yang cocok filter' : 'Belum ada tes — buat tes baru untuk memulai'}
                </p>
                {!tests.length && (
                  <button type="button" onClick={() => setModal(true)} className="hf-btn-primary mt-4 inline-flex items-center gap-1.5 text-sm">
                    <Plus className="h-4 w-4" /> Buat tes
                  </button>
                )}
              </div>
            )}
          </div>

          <Modal open={modal} onClose={() => setModal(false)} title="Buat tes/ujian">
            <div className="space-y-3">
              <input className="hf-input w-full" placeholder="Judul tes" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea className="hf-input w-full" placeholder="Deskripsi" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="hf-input w-full" value={form.curriculum_id || ''} onChange={(e) => setForm({ ...form, curriculum_id: e.target.value, module_id: '' })}>
                  <option value="">Tanpa kursus (tes mandiri)</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select className="hf-input w-full" value={form.module_id || ''} onChange={(e) => setForm({ ...form, module_id: e.target.value })}>
                  <option value="">Tanpa modul</option>
                  {modules.filter((m) => !form.curriculum_id || m.curriculum_id === form.curriculum_id).map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-[color:var(--hf-ink-secondary)]">Durasi (menit)
                  <input type="number" className="hf-input mt-1 w-full" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} />
                </label>
                <label className="text-sm text-[color:var(--hf-ink-secondary)]">Nilai lulus (%)
                  <input type="number" className="hf-input mt-1 w-full" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: +e.target.value })} />
                </label>
                <label className="text-sm text-[color:var(--hf-ink-secondary)]">Max percobaan
                  <input type="number" className="hf-input mt-1 w-full" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: +e.target.value })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.shuffle_questions} onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })} /> Acak urutan soal</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.anti_cheat_enabled} onChange={(e) => setForm({ ...form, anti_cheat_enabled: e.target.checked })} /> Aktifkan anti-cheating</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.proctor_enabled} onChange={(e) => setForm({ ...form, proctor_enabled: e.target.checked })} /> Aktifkan proctoring kamera</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.fullscreen_required} onChange={(e) => setForm({ ...form, fullscreen_required: e.target.checked })} /> Wajib fullscreen</label>
              <button type="button" disabled={acting === 'create'} onClick={create} className="hf-btn-primary w-full disabled:opacity-50">
                {acting === 'create' ? 'Menyimpan…' : 'Buat tes'}
              </button>
            </div>
          </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
