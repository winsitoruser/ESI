import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav, Modal, LmsStatusBadge } from '@/components/humanify/lms/shared';
import { PSYCHOMETRIC_TEMPLATES } from '@/lib/hris/lms/psychometric';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { Brain, Plus } from 'lucide-react';

export default function PsychometricPage() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [modal, setModal] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=tests').then((r) => r.json());
    const psycho = (d.data || []).filter((x: any) => x.psychometric_type);
    setTests(psycho);
    setDataSource(psycho.length ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPsycho = async (type: string) => {
    const tpl = PSYCHOMETRIC_TEMPLATES[type as keyof typeof PSYCHOMETRIC_TEMPLATES];
    await fetch('/api/humanify/lms?action=create-test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || tpl.title,
        description: tpl.description,
        psychometric_type: type,
        exam_type: 'online',
        duration_minutes: tpl.defaultDuration,
        passing_score: type === 'integrity' ? 75 : 70,
        shuffle_questions: true,
        anti_cheat_enabled: true,
        manual_grading_required: type === 'personality',
      }),
    });
    setModal(null);
    setTitle('');
    load();
  };

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsPsychometric')} subtitle="Psikotes kognitif, kepribadian, dan integritas">
        <LmsPageNav active="psychometric" />
        <div className="mb-4"><DataSourceBadge source={dataSource} /></div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {Object.entries(PSYCHOMETRIC_TEMPLATES).map(([key, tpl]) => (
            <div key={key} className="bg-white border rounded-xl p-5">
              <Brain className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold">{tpl.title}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">{tpl.description}</p>
              <p className="text-xs text-gray-400 mb-3">Durasi default: {tpl.defaultDuration} menit</p>
              <button type="button" onClick={() => { setModal(key); setTitle(tpl.title); }} className="w-full py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50 flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Buat Paket
              </button>
            </div>
          ))}
        </div>

        <h3 className="font-semibold mb-3">Paket Psikotes Aktif</h3>
        <div className="space-y-3">
          {tests.map((ex) => (
            <div key={ex.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
              <div>
                <h4 className="font-medium">{ex.title}</h4>
                <p className="text-sm text-gray-500 capitalize">{ex.psychometric_type} · {ex.question_count} soal · {ex.attempt_count} peserta</p>
              </div>
              <LmsStatusBadge status={ex.status} />
            </div>
          ))}
          {!tests.length && <p className="text-gray-400 text-center py-6">Belum ada paket psikotes — buat dari template di atas</p>}
        </div>

        <Modal open={!!modal} onClose={() => setModal(null)} title={`Buat Psikotes ${modal}`}>
          <input className="w-full border rounded-lg px-3 py-2 text-sm mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="button" onClick={() => modal && createPsycho(modal)} className="w-full py-2 bg-purple-600 text-white rounded-lg">Buat & Kelola Soal</button>
        </Modal>
      </HumanifyLayout>
    </PageGuard>
  );
}
