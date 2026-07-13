import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { Plus, Calendar } from 'lucide-react';

export default function SchedulesPage() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ target_type: 'all', open_exam: true });

  const load = useCallback(async () => {
    const [s, e] = await Promise.all([
      fetch('/api/humanify/lms?action=schedules').then((r) => r.json()),
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()),
    ]);
    setSchedules(s.data || []);
    setExams(e.data || []);
    setDataSource(s.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    await fetch('/api/humanify/lms?action=create-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleString('id-ID') : '-';

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsSchedules')} subtitle="Penjadwalan tes untuk karyawan, departemen, atau batch">
        <LmsPageNav active="schedules" />
        <div className="flex justify-between mb-4">
          <DataSourceBadge source={dataSource} />
          <button type="button" onClick={() => setModal(true)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Jadwalkan Tes</button>
        </div>

        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white border rounded-xl p-4 flex gap-4">
              <Calendar className="w-8 h-8 text-amber-500 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.exam_title} · Target: {s.target_type}</p>
                <p className="text-sm text-gray-600 mt-1">{fmt(s.scheduled_start)} — {fmt(s.scheduled_end)}</p>
              </div>
              <LmsStatusBadge status={s.status} />
            </div>
          ))}
          {!schedules.length && <p className="text-center text-gray-400 py-12">Belum ada jadwal tes</p>}
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Jadwalkan Tes">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul jadwal" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.exam_id || ''} onChange={(e) => setForm({ ...form, exam_id: e.target.value })}>
              <option value="">Pilih tes...</option>
              {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Mulai<input type="datetime-local" className="w-full border rounded px-2 py-1 mt-1" onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} /></label>
              <label className="text-sm">Selesai<input type="datetime-local" className="w-full border rounded px-2 py-1 mt-1" onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} /></label>
            </div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })}>
              <option value="all">Semua Karyawan</option>
              <option value="department">Per Departemen</option>
              <option value="role">Per Role</option>
              <option value="batch">Per Batch Pelatihan</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.open_exam} onChange={(e) => setForm({ ...form, open_exam: e.target.checked })} /> Buka tes otomatis saat jadwal aktif</label>
            <button type="button" onClick={save} className="w-full py-2 bg-indigo-600 text-white rounded-lg">Simpan Jadwal</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
