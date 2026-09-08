import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { Modal } from '@/components/humanify/lms/shared';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import EmployeePicker from '@/components/humanify/EmployeePicker';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Layers, UserPlus, Send, Video, FileText, Link as LinkIcon, BookOpen } from 'lucide-react';

const API = '/api/humanify/lms/courses';

export default function CourseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [moduleModal, setModuleModal] = useState(false);
  const [materialModal, setMaterialModal] = useState<string | null>(null);
  const [enrollModal, setEnrollModal] = useState(false);
  const [moduleForm, setModuleForm] = useState<any>({ delivery_method: 'self_paced' });
  const [matForm, setMatForm] = useState<any>({ type: 'text' });
  const [employeeId, setEmployeeId] = useState('');
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [pickedExam, setPickedExam] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [allTests, setAllTests] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [d, t] = await Promise.all([
      fetch(`${API}?action=detail&id=${id}`).then((r) => r.json()),
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setData(d.data);
    setAllTests(t.data || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addModule = async () => {
    await fetch(`${API}?action=create-module`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...moduleForm, curriculum_id: id }),
    });
    setModuleModal(false);
    load();
  };

  const addMaterial = async () => {
    await fetch(`${API}?action=add-material`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: materialModal, material: matForm }),
    });
    setMaterialModal(null);
    setMatForm({ type: 'text' });
    load();
  };

  const enroll = async () => {
    if (!employeeId.trim()) {
      toast.error('Pilih karyawan');
      return;
    }
    try {
      const res = await fetch(`${API}?action=enroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculum_id: id, employee_ids: [employeeId.trim()], mandatory: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal enroll');
      toast.success('Karyawan di-enroll');
      setEnrollModal(false);
      setEmployeeId('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal enroll');
    }
  };

  const publish = async () => {
    await fetch(`${API}?action=publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum_id: id }),
    });
    load();
  };

  const attachExam = async (moduleId: string, examId: string) => {
    if (!examId) {
      toast.error('Pilih tes');
      return;
    }
    setActing(`attach-${moduleId}`);
    try {
      const res = await fetch(`${API}?action=attach-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId, exam_id: examId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal menautkan tes');
      toast.success('Tes ditautkan ke modul');
      setAttachFor(null);
      setPickedExam('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  const createModuleExam = async (moduleRow: any) => {
    setActing(`create-${moduleRow.id}`);
    try {
      const res = await fetch('/api/humanify/lms?action=create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Tes: ${moduleRow.title}`,
          curriculum_id: id,
          module_id: moduleRow.id,
          passing_score: 70,
          duration_minutes: 30,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Gagal membuat tes');
      toast.success('Tes modul dibuat');
      load();
      if (j.data?.id) router.push(`/humanify/lms/tests/${j.data.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  };

  if (!data) return null;
  const { curriculum, modules, enrollments, exams } = data;

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={curriculum.title} subtitle={`Kode: ${curriculum.code} · ${modules?.length || 0} modul`}>
        <TalentShell
          current="courses"
          title={curriculum.title}
          subtitle={`${curriculum.code || 'Kursus'} · ${modules?.length || 0} modul · ${enrollments?.length || 0} peserta`}
          icon={BookOpen}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/humanify/lms/courses" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                <ArrowLeft className="h-4 w-4" /> Semua kursus
              </Link>
              <button type="button" onClick={() => setModuleModal(true)} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> Modul
              </button>
              <button type="button" onClick={() => setEnrollModal(true)} className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                <UserPlus className="h-4 w-4" /> Enroll
              </button>
              {curriculum.status !== 'active' && (
                <button type="button" onClick={publish} className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                  <Send className="h-4 w-4" /> Publish
                </button>
              )}
            </div>
          }
        >

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Layers className="w-5 h-5" /> Modul Pembelajaran</h3>
            {(modules || []).map((m: any, i: number) => {
              const materials = Array.isArray(m.materials) ? m.materials : [];
              const linked = (exams || []).find((ex: any) => ex.id === m.exam_id || ex.module_id === m.id);
              return (
                <div key={m.id} className="hf-card p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">Modul {i + 1}</p>
                      <h4 className="font-medium">{m.title}</h4>
                      <p className="text-sm text-[color:var(--hf-ink-muted)]">{m.delivery_method} · {materials.length} materi</p>
                      {linked ? (
                        <Link href={`/humanify/lms/tests/${linked.id}`} className="mt-1 inline-block text-sm font-medium text-[color:var(--hf-brand-600)]">
                          Tes: {linked.title} ({linked.question_count || 0} soal)
                        </Link>
                      ) : (
                        <p className="mt-1 text-xs text-[color:var(--hf-ink-faint)]">Belum ada tes terikat</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button type="button" onClick={() => { setMaterialModal(m.id); setMatForm({ type: 'text' }); }} className="text-sm text-[color:var(--hf-brand-600)]">+ Materi</button>
                      {linked ? (
                        <Link href={`/humanify/lms/tests/${linked.id}`} className="text-sm text-[color:var(--hf-ink-muted)]">Susun soal</Link>
                      ) : (
                        <>
                          <button type="button" disabled={acting === `create-${m.id}`} onClick={() => createModuleExam(m)} className="text-sm text-[color:var(--hf-brand-600)] disabled:opacity-50">
                            Buat tes modul
                          </button>
                          <button type="button" onClick={() => { setAttachFor(m.id); setPickedExam(''); }} className="text-sm text-[color:var(--hf-ink-muted)]">Tautkan tes</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {materials.map((mat: any) => (
                      <div key={mat.id} className="flex items-center gap-2 border-l-2 border-[var(--hf-brand-100)] pl-2 text-sm text-[color:var(--hf-ink-secondary)]">
                        {mat.type === 'video' && <Video className="w-3 h-3" />}
                        {mat.type === 'pdf' && <FileText className="w-3 h-3" />}
                        {mat.type === 'link' && <LinkIcon className="w-3 h-3" />}
                        {mat.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!modules?.length && <p className="text-gray-400 text-sm">Tambahkan modul untuk membangun learning path</p>}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-semibold">Tes kursus ({exams?.length || 0})</h3>
              <div className="max-h-48 divide-y overflow-y-auto hf-card">
                {(exams || []).map((ex: any) => (
                  <Link key={ex.id} href={`/humanify/lms/tests/${ex.id}`} className="block p-3 text-sm hover:bg-[var(--hf-surface-muted)]">
                    <p className="font-medium">{ex.title}</p>
                    <p className="text-[color:var(--hf-ink-muted)]">{ex.question_count || 0} soal · {ex.status}</p>
                  </Link>
                ))}
                {!exams?.length && <p className="p-4 text-sm text-[color:var(--hf-ink-muted)]">Belum ada tes. Buat dari modul.</p>}
              </div>
            </div>
            <div>
            <h3 className="font-semibold mb-3">Peserta ({enrollments?.length || 0})</h3>
            <div className="bg-white border rounded-xl divide-y max-h-80 overflow-y-auto">
              {(enrollments || []).map((e: any) => (
                <div key={e.id} className="p-3 text-sm">
                  <p className="font-medium">{e.employee_name || e.employee_id}</p>
                  <p className="text-gray-500">{e.progress_pct || 0}% · {e.status}</p>
                </div>
              ))}
              {!enrollments?.length && <p className="p-4 text-sm text-[color:var(--hf-ink-muted)]">Belum ada peserta</p>}
            </div>
            </div>
          </div>
        </div>

        <Modal open={moduleModal} onClose={() => setModuleModal(false)} title="Tambah Modul">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul modul" value={moduleForm.title || ''} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Deskripsi" value={moduleForm.description || ''} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
            <button type="button" onClick={addModule} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Simpan Modul</button>
          </div>
        </Modal>

        <Modal open={!!materialModal} onClose={() => setMaterialModal(null)} title="Tambah Materi">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul materi" value={matForm.title || ''} onChange={(e) => setMatForm({ ...matForm, title: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={matForm.type} onChange={(e) => setMatForm({ ...matForm, type: e.target.value })}>
              <option value="text">Teks</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="link">Link Eksternal</option>
            </select>
            {(matForm.type === 'video' || matForm.type === 'pdf' || matForm.type === 'link') && (
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="URL" value={matForm.url || ''} onChange={(e) => setMatForm({ ...matForm, url: e.target.value })} />
            )}
            {matForm.type === 'text' && (
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]" placeholder="Konten teks" value={matForm.content || ''} onChange={(e) => setMatForm({ ...matForm, content: e.target.value })} />
            )}
            <button type="button" onClick={addMaterial} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Tambah Materi</button>
          </div>
        </Modal>

        <Modal open={!!attachFor} onClose={() => setAttachFor(null)} title="Tautkan tes ke modul">
          <select className="hf-input w-full" value={pickedExam} onChange={(e) => setPickedExam(e.target.value)}>
            <option value="">Pilih tes yang sudah ada</option>
            {(allTests.length ? allTests : exams || []).map((ex: any) => (
              <option key={ex.id} value={ex.id}>{ex.title}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-[color:var(--hf-ink-muted)]">Kosong? Tutup dan gunakan “Buat tes modul”, lalu susun soal di bank.</p>
          <button
            type="button"
            disabled={acting === `attach-${attachFor}`}
            onClick={() => attachFor && attachExam(attachFor, pickedExam)}
            className="hf-btn-primary mt-3 w-full disabled:opacity-50"
          >
            Tautkan tes
          </button>
        </Modal>

        <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll karyawan">
          <EmployeePicker
            value={employeeId}
            onChange={(emp) => setEmployeeId(emp?.id || '')}
            label="Karyawan"
            required
          />
          <button type="button" onClick={enroll} className="hf-btn-primary mt-3 w-full">Enroll</button>
        </Modal>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
