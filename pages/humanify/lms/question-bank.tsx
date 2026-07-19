import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, lmsFetch, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { QUESTION_TYPE_LABELS, PSYCHOMETRIC_LABELS } from '@/lib/hris/lms/types';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function QuestionBankPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ question_type: 'multiple_choice', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }] });

  const load = useCallback(async () => {
    const q = new URLSearchParams({ action: 'question-bank' });
    if (search) q.set('search', search);
    if (filter) q.set('psychometric_type', filter);
    const d = await fetch(`/api/humanify/lms?${q}`).then((r) => r.json());
    setItems(d.data || []);
    setDataSource(d.data?.length ? 'live' : 'empty');
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    await fetch('/api/humanify/lms?action=create-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    setForm({ question_type: 'multiple_choice', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }] });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return;
    await fetch(`/api/humanify/lms?action=delete-question&id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsQuestionBank')} subtitle="Bank soal terpusat untuk semua jenis assessment">
        <LmsPageNav active="question-bank" />
        <div className="flex flex-wrap gap-3 mb-4 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="Cari soal..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="border rounded-lg px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Semua Tipe</option>
              <option value="cognitive">Kognitif</option>
              <option value="personality">Kepribadian</option>
              <option value="integrity">Integritas</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <DataSourceBadge source={dataSource} />
            <button type="button" onClick={() => setModal(true)} className="flex items-center gap-1 px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Soal</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Psikotes</th>
                <th className="p-3">Skor</th>
                <th className="p-3">Status</th>
                <th className="p-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{q.code}</td>
                  <td className="p-3 max-w-md truncate">{q.question_text}</td>
                  <td className="p-3">{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</td>
                  <td className="p-3">{q.psychometric_type ? PSYCHOMETRIC_LABELS[q.psychometric_type] : '-'}</td>
                  <td className="p-3">{q.score}</td>
                  <td className="p-3"><LmsStatusBadge status={q.status} /></td>
                  <td className="p-3">
                    <button type="button" onClick={() => remove(q.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="p-8 text-center text-gray-400">Belum ada soal — tambahkan dari bank soal</td></tr>}
            </tbody>
          </table>
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Tambah Soal">
          <div className="space-y-3">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Kategori" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })}>
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.psychometric_type || ''} onChange={(e) => setForm({ ...form, psychometric_type: e.target.value || null })}>
              <option value="">Umum (bukan psikotes)</option>
              <option value="cognitive">Kognitif</option>
              <option value="personality">Kepribadian</option>
              <option value="integrity">Integritas</option>
            </select>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" placeholder="Teks soal" value={form.question_text || ''} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
            {form.question_type === 'multiple_choice' && form.options?.map((o: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="font-mono w-6">{o.label}</span>
                <input className="flex-1 border rounded px-2 py-1 text-sm" value={o.text} onChange={(e) => {
                  const opts = [...form.options]; opts[i] = { ...o, text: e.target.value }; setForm({ ...form, options: opts });
                }} />
                <input type="radio" name="correct" checked={o.isCorrect} onChange={() => {
                  const opts = form.options.map((x: any, j: number) => ({ ...x, isCorrect: j === i }));
                  setForm({ ...form, options: opts, correct_answer: o.label });
                }} />
              </div>
            ))}
            <button type="button" onClick={save} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Simpan</button>
          </div>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
