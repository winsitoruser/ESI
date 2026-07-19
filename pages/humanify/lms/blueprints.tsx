import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { Plus, Layers, Zap } from 'lucide-react';

const API = '/api/humanify/lms/blueprints';

const TEMPLATES = [
  { title: 'Blueprint Kognitif', psychometric_type: 'cognitive', sections: [
    { category: 'numerical', count: 5, difficulty: 'medium' },
    { category: 'verbal', count: 5, difficulty: 'medium' },
    { category: 'logical', count: 5, difficulty: 'hard' },
  ]},
  { title: 'Blueprint Integritas', psychometric_type: 'integrity', sections: [
    { category: 'integrity', count: 10, psychometric_type: 'integrity' },
  ]},
  { title: 'Blueprint Kepribadian', psychometric_type: 'personality', sections: [
    { category: 'personality', count: 15, psychometric_type: 'personality' },
  ]},
];

export default function BlueprintsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [applyModal, setApplyModal] = useState<any>(null);
  const [examId, setExamId] = useState('');
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    const [b, e] = await Promise.all([
      fetch(`${API}?action=list`).then((r) => r.json()),
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()),
    ]);
    setItems(b.data || []);
    setExams(e.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await fetch(`${API}?action=create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    load();
  };

  const apply = async () => {
    await fetch(`${API}?action=apply-to-exam`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blueprint_id: applyModal.id, exam_id: examId }),
    });
    setApplyModal(null);
    alert('Soal di-generate dari bank soal sesuai blueprint');
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsBlueprints')} subtitle="Blueprint tes adaptif — randomisasi soal per kategori & tingkat kesulitan">
        <LmsPageNav active="blueprints" />
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.title} type="button" onClick={() => { setForm(tpl); setModal(true); }} className="bg-white border rounded-xl p-4 text-left hover:border-[var(--hf-brand-100)]">
              <Zap className="w-6 h-6 text-amber-500 mb-2" />
              <p className="font-medium">{tpl.title}</p>
              <p className="text-xs text-gray-500 mt-1">{tpl.sections.reduce((s, x) => s + x.count, 0)} soal · {tpl.psychometric_type}</p>
            </button>
          ))}
        </div>

        <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="w-5 h-5" /> Blueprint Tersimpan</h3>
        <div className="space-y-3">
          {items.map((bp) => (
            <div key={bp.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{bp.title}</p>
                <p className="text-sm text-gray-500 capitalize">{bp.psychometric_type || 'general'} · {bp.total_questions} soal target</p>
              </div>
              <button type="button" onClick={() => setApplyModal(bp)} className="px-3 py-1.5 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">Terapkan ke Tes</button>
            </div>
          ))}
          {!items.length && <p className="text-gray-400 text-sm">Buat blueprint dari template di atas</p>}
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Simpan Blueprint">
          <input className="w-full border rounded-lg px-3 py-2 text-sm mb-3" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <button type="button" onClick={create} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg">Simpan</button>
        </Modal>

        <Modal open={!!applyModal} onClose={() => setApplyModal(null)} title="Terapkan Blueprint ke Tes">
          <select className="w-full border rounded-lg px-3 py-2 text-sm mb-3" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">Pilih tes...</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
          <button type="button" onClick={apply} disabled={!examId} className="w-full py-2 bg-[var(--hf-brand-600)] text-white rounded-lg disabled:opacity-50">Generate Soal</button>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
