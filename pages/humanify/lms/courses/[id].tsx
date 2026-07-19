import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal } from '@/components/humanify/lms/shared';
import Link from 'next/link';
import { ArrowLeft, Plus, Layers, UserPlus, Send, Video, FileText, Link as LinkIcon } from 'lucide-react';

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

  const load = useCallback(async () => {
    if (!id) return;
    const d = await fetch(`${API}?action=detail&id=${id}`).then((r) => r.json());
    setData(d.data);
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
    if (!employeeId.trim()) return;
    await fetch(`${API}?action=enroll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum_id: id, employee_ids: [employeeId.trim()], mandatory: true }),
    });
    setEnrollModal(false);
    load();
  };

  const publish = async () => {
    await fetch(`${API}?action=publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum_id: id }),
    });
    load();
  };

  if (!data) return null;
  const { curriculum, modules, enrollments } = data;

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={curriculum.title} subtitle={`Kode: ${curriculum.code} · ${modules?.length || 0} modul`}>
        <LmsPageNav active="courses" />
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/humanify/lms/courses" className="p-2 border rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
          <button type="button" onClick={() => setModuleModal(true)} className="px-3 py-1.5 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Modul</button>
          <button type="button" onClick={() => setEnrollModal(true)} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" /> Enroll</button>
          {curriculum.status !== 'active' && (
            <button type="button" onClick={publish} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><Send className="w-4 h-4" /> Publish</button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Layers className="w-5 h-5" /> Modul Pembelajaran</h3>
            {(modules || []).map((m: any, i: number) => {
              const materials = Array.isArray(m.materials) ? m.materials : [];
              return (
                <div key={m.id} className="bg-white border rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-400">Modul {i + 1}</p>
                      <h4 className="font-medium">{m.title}</h4>
                      <p className="text-sm text-gray-500">{m.delivery_method} · {materials.length} materi</p>
                    </div>
                    <button type="button" onClick={() => { setMaterialModal(m.id); setMatForm({ type: 'text' }); }} className="text-sm text-[color:var(--hf-brand-600)]">+ Materi</button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {materials.map((mat: any) => (
                      <div key={mat.id} className="flex items-center gap-2 text-sm text-gray-600 pl-2 border-l-2 border-[var(--hf-brand-100)]">
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

          <div>
            <h3 className="font-semibold mb-3">Peserta ({enrollments?.length || 0})</h3>
            <div className="bg-white border rounded-xl divide-y max-h-80 overflow-y-auto">
              {(enrollments || []).map((e: any) => (
                <div key={e.id} className="p-3 text-sm">
                  <p className="font-medium">{e.employee_name || e.employee_id}</p>
                  <p className="text-gray-500">{e.progress_pct || 0}% · {e.status}</p>
                </div>
              ))}
              {!enrollments?.length && <p className="p-4 text-gray-400 text-sm">Belum ada peserta</p>}
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

        <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll Karyawan">
          <input className="w-full border rounded-lg px-3 py-2 text-sm mb-3" placeholder="Employee UUID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <button type="button" onClick={enroll} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Enroll</button>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
