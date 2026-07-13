import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { Brain } from 'lucide-react';

const API = '/api/humanify/lms/analytics';

export default function PsychometricReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    const d = await fetch(`${API}?action=psychometric-reports`).then((r) => r.json());
    setReports(d.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsPsychoReports')} subtitle="Laporan psikotes kognitif, kepribadian, dan integritas">
        <LmsPageNav active="psycho-reports" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {reports.map((r) => (
              <button key={r.id} type="button" onClick={() => setSelected(r)} className={`w-full text-left bg-white border rounded-xl p-4 hover:border-purple-300 ${selected?.id === r.id ? 'border-purple-500' : ''}`}>
                <div className="flex justify-between">
                  <p className="font-medium">{r.employee_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.risk_level}</span>
                </div>
                <p className="text-sm text-gray-500 capitalize">{r.psychometric_type} · {r.exam_title} · {r.overall_score}%</p>
              </button>
            ))}
            {!reports.length && <p className="text-gray-400 text-center py-12">Belum ada laporan psikotes — hasil muncul setelah peserta menyelesaikan ujian psikometrik</p>}
          </div>

          {selected && (
            <div className="bg-white border rounded-xl p-6 sticky top-4">
              <Brain className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-bold text-lg">{selected.employee_name}</h3>
              <p className="text-sm text-gray-500 capitalize mb-4">{selected.psychometric_type} — Skor {selected.overall_score}%</p>
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-purple-900">Interpretasi</p>
                <p className="text-sm text-purple-800 mt-1">{selected.interpretation}</p>
              </div>
              {selected.dimensions && Object.keys(selected.dimensions).length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Dimensi</p>
                  {Object.entries(typeof selected.dimensions === 'string' ? JSON.parse(selected.dimensions) : selected.dimensions).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1"><span className="capitalize">{k.replace(/_/g, ' ')}</span><span>{String(v)}</span></div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-2">Rekomendasi</p>
                <ul className="text-sm text-gray-600 list-disc pl-4 space-y-1">
                  {(Array.isArray(selected.recommendations) ? selected.recommendations : JSON.parse(selected.recommendations || '[]')).map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
