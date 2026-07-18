import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { Plus, Play, Square, Settings } from 'lucide-react';
import Link from 'next/link';

export default function LmsTestsPage() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ exam_type: 'online', passing_score: 70, duration_minutes: 60, max_attempts: 1, shuffle_questions: true, anti_cheat_enabled: true, proctor_enabled: false });

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=tests').then((r) => r.json());
    setTests(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await fetch('/api/humanify/lms?action=create-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  const toggleExam = async (exam_id: string, open: boolean) => {
    await fetch(`/api/humanify/lms?action=${open ? 'open-exam' : 'close-exam'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_id }) });
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsTests')} subtitle="Pembuatan dan pengelolaan tes/ujian online">
        <LmsPageNav active="tests" />
        <div className="flex justify-between mb-4">
          <DataSourceBadge source={dataSource} />
          <button type="button" onClick={() => setModal(true)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Buat Tes Baru
          </button>
        </div>

        <div className="grid gap-4">
          {tests.map((ex) => (
            <div key={ex.id} className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{ex.title}</h3>
                <p className="text-sm text-gray-500">{ex.question_count || 0} soal · {ex.duration_minutes} menit · lulus {ex.passing_score}%</p>
                <div className="flex gap-2 mt-1">
                  <LmsStatusBadge status={ex.status} />
                  {ex.anti_cheat_enabled && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Anti-cheat</span>}
                  {ex.proctor_enabled && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">Proctoring</span>}
                  {ex.shuffle_questions && <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded">Random soal</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/humanify/lms/tests/${ex.id}`} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1"><Settings className="w-4 h-4" /> Kelola Soal</Link>
                {ex.status !== 'open' ? (
                  <button type="button" onClick={() => toggleExam(ex.id, true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><Play className="w-4 h-4" /> Buka</button>
                ) : (
                  <button type="button" onClick={() => toggleExam(ex.id, false)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm flex items-center gap-1"><Square className="w-4 h-4" /> Tutup</button>
                )}
              </div>
            </div>
          ))}
          {!tests.length && <p className="text-center text-gray-400 py-12">Belum ada tes — buat tes baru untuk memulai</p>}
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Buat Tes/Ujian">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul tes" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Deskripsi" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Durasi (menit)<input type="number" className="w-full border rounded px-2 py-1 mt-1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></label>
              <label className="text-sm">Nilai Lulus (%)<input type="number" className="w-full border rounded px-2 py-1 mt-1" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: +e.target.value })} /></label>
              <label className="text-sm">Max Percobaan<input type="number" className="w-full border rounded px-2 py-1 mt-1" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: +e.target.value })} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.shuffle_questions} onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })} /> Acak urutan soal</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.anti_cheat_enabled} onChange={(e) => setForm({ ...form, anti_cheat_enabled: e.target.checked })} /> Aktifkan anti-cheating</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.proctor_enabled} onChange={(e) => setForm({ ...form, proctor_enabled: e.target.checked })} /> Aktifkan proctoring kamera</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.fullscreen_required} onChange={(e) => setForm({ ...form, fullscreen_required: e.target.checked })} /> Wajib fullscreen</label>
            <button type="button" onClick={create} className="w-full py-2 bg-indigo-600 text-white rounded-lg">Buat Tes</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
