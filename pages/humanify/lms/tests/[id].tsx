import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal } from '@/components/humanify/lms/shared';
import { Plus, ArrowLeft, Import } from 'lucide-react';
import Link from 'next/link';

export default function TestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [questions, setQuestions] = useState<any[]>([]);
  const [bank, setBank] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<any>({ question_type: 'multiple_choice', options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }] });

  const load = useCallback(async () => {
    if (!id) return;
    const [q, t] = await Promise.all([
      fetch(`/api/humanify/lms?action=exam-questions&exam_id=${id}`).then((r) => r.json()),
      fetch('/api/humanify/lms?action=tests').then((r) => r.json()),
    ]);
    setQuestions(q.data || []);
    setExam((t.data || []).find((x: any) => x.id === id));
  }, [id]);

  const loadBank = async () => {
    const d = await fetch('/api/humanify/lms?action=question-bank').then((r) => r.json());
    setBank(d.data || []);
  };

  useEffect(() => { load(); }, [load]);

  const addQuestion = async () => {
    await fetch('/api/humanify/lms?action=create-exam-question', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, exam_id: id }),
    });
    setModal(false);
    load();
  };

  const importFromBank = async () => {
    await fetch('/api/humanify/lms?action=import-questions-to-exam', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: id, question_ids: selected }),
    });
    setImportModal(false);
    setSelected([]);
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={exam?.title || 'Kelola Soal Tes'} subtitle="Tambah soal manual atau impor dari bank soal">
        <LmsPageNav active="tests" />
        <div className="flex gap-2 mb-4">
          <Link href="/humanify/lms/tests" className="p-2 border rounded-lg"><ArrowLeft className="w-4 h-4" /></Link>
          <button type="button" onClick={() => setModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Soal Baru</button>
          <button type="button" onClick={() => { loadBank(); setImportModal(true); }} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1"><Import className="w-4 h-4" /> Impor Bank Soal</button>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Soal #{q.question_number || i + 1} · {q.question_type} · {q.score} poin</p>
              <p className="text-gray-900">{q.question_text}</p>
            </div>
          ))}
          {!questions.length && <p className="text-center text-gray-400 py-8">Belum ada soal dalam tes ini</p>}
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Tambah Soal ke Tes">
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] mb-3" placeholder="Teks soal" value={form.question_text || ''} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
          <button type="button" onClick={addQuestion} className="w-full py-2 bg-indigo-600 text-white rounded-lg">Simpan</button>
        </Modal>

        <Modal open={importModal} onClose={() => setImportModal(false)} title="Impor dari Bank Soal">
          <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
            {bank.map((q) => (
              <label key={q.id} className="flex gap-2 items-start p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selected.includes(q.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, q.id] : selected.filter((x) => x !== q.id))} />
                <span className="text-sm">{q.question_text}</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={importFromBank} disabled={!selected.length} className="w-full py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Impor {selected.length} soal</button>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
