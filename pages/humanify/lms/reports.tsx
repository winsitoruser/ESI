import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { BarChart3 } from 'lucide-react';

export default function LmsReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>({});
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');

  const load = useCallback(async () => {
    const d = await fetch('/api/humanify/lms?action=reports').then((r) => r.json());
    setData(d.data || {});
    setDataSource((d.data?.byExam?.length || 0) > 0 ? 'live' : 'empty');
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*', 'training.*']}>
      <HumanifyLayout title={t('hris.lmsReports')} subtitle="Laporan hasil ujian, pass rate, dan analitik kompetensi">
        <LmsPageNav active="reports" />
        <div className="mb-4"><DataSourceBadge source={dataSource} /></div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" /> Performa per Tes</h3>
            <div className="space-y-3">
              {(data.byExam || []).map((ex: any) => (
                <div key={ex.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-medium">{ex.title}</p>
                    {ex.psychometric_type && <p className="text-xs text-purple-600 capitalize">{ex.psychometric_type}</p>}
                  </div>
                  <div className="text-right">
                    <p>{ex.attempts} attempt</p>
                    <p className="text-green-600">{ex.passed} lulus · avg {ex.avg_score}%</p>
                  </div>
                </div>
              ))}
              {!data.byExam?.length && <p className="text-gray-400 text-sm">Belum ada data</p>}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Trend Bulanan</h3>
            <div className="space-y-2">
              {(data.byMonth || []).map((m: any) => (
                <div key={m.month} className="flex justify-between text-sm">
                  <span>{m.month}</span>
                  <span>{m.count} ujian · avg {m.avg_score}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-5 md:col-span-2">
            <h3 className="font-semibold mb-4">Top Kompetensi</h3>
            <div className="flex flex-wrap gap-2">
              {(data.topCompetencies || []).map((c: any) => (
                <span key={c.competency_name} className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm">{c.competency_name} ({c.count})</span>
              ))}
              {!data.topCompetencies?.length && <p className="text-gray-400 text-sm">Belum ada riwayat kompetensi</p>}
            </div>
          </div>
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
