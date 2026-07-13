import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { Plus, Award } from 'lucide-react';

export default function CompetencyPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=competency-history').then((r) => r.json());
    setRecords(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    await fetch('/api/humanify/lms?action=record-competency', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsCompetency')} subtitle="Sertifikat dan riwayat kompetensi karyawan">
        <LmsPageNav active="competency" />
        <div className="flex justify-between mb-4">
          <div className="flex gap-2 items-center">
            <DataSourceBadge source={dataSource} />
            <Link href="/humanify/certificates" className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Award className="w-4 h-4" /> Certificate Registry</Link>
          </div>
          <button type="button" onClick={() => setModal(true)} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Catat Kompetensi</button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Karyawan</th><th className="p-3">Kompetensi</th><th className="p-3">Level</th><th className="p-3">Skor</th><th className="p-3">Sumber</th><th className="p-3">Sertifikasi</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.employee_name}</td>
                  <td className="p-3"><span className="font-mono text-xs text-gray-400">{r.competency_code}</span><br />{r.competency_name}</td>
                  <td className="p-3 capitalize">{r.level || '-'}</td>
                  <td className="p-3">{r.score ?? '-'}</td>
                  <td className="p-3 capitalize">{r.source_type}</td>
                  <td className="p-3">{fmt(r.certified_at)}{r.expires_at ? ` → ${fmt(r.expires_at)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && <p className="p-8 text-center text-gray-400">Belum ada riwayat kompetensi</p>}
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Catat Kompetensi Manual">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Employee ID (UUID)" value={form.employee_id || ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nama karyawan" value={form.employee_name || ''} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Kode kompetensi" value={form.competency_code || ''} onChange={(e) => setForm({ ...form, competency_code: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nama kompetensi" value={form.competency_name || ''} onChange={(e) => setForm({ ...form, competency_name: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="">Level...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button type="button" onClick={save} className="w-full py-2 bg-indigo-600 text-white rounded-lg">Simpan</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
