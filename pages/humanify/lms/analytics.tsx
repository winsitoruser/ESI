import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import { LmsPageNav } from '@/components/humanify/lms/shared';
import { useTranslation } from '@/lib/i18n';
import { BarChart3, Users, Target, AlertTriangle } from 'lucide-react';

const API = '/api/humanify/lms/analytics';

export default function LmsAnalyticsPage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>({});
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [o, h, g] = await Promise.all([
      fetch(`${API}?action=overview`).then((r) => r.json()),
      fetch(`${API}?action=department-heatmap`).then((r) => r.json()),
      fetch(`${API}?action=competency-gaps`).then((r) => r.json()),
    ]);
    setOverview(o.data || {});
    setHeatmap(h.data || []);
    setGaps(g.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsAnalytics')} subtitle="Analytics L&D — progress training, performa ujian, skill gap per departemen">
        <LmsPageNav active="analytics" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Enrollment', value: overview.training?.enrollments || 0, icon: Users },
            { label: 'Kursus Selesai', value: overview.training?.completed || 0, icon: Target },
            { label: 'Avg Progress', value: `${overview.training?.avg_progress || 0}%`, icon: BarChart3 },
            { label: 'Proctor Flagged', value: overview.proctor_flagged || 0, icon: AlertTriangle },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4">
              <s.icon className="w-5 h-5 text-[color:var(--hf-brand-600)] mb-2" />
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Heatmap per Departemen</h3>
            <div className="space-y-3">
              {heatmap.map((d) => (
                <div key={d.department} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{d.department}</span>
                    <span>{d.avg_progress || 0}% progress</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-[var(--hf-brand-500)] rounded-full" style={{ width: `${Math.min(100, Number(d.avg_progress) || 0)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{d.enrolled} enrolled · avg ujian {d.avg_exam_score || 0}%</p>
                </div>
              ))}
              {!heatmap.length && <p className="text-gray-400 text-sm">Belum ada data enrollment</p>}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Skill Gap (Kompetensi Rendah)</h3>
            <div className="space-y-2">
              {gaps.slice(0, 8).map((g) => (
                <div key={g.competency_code} className="flex justify-between text-sm border-b pb-2">
                  <span>{g.competency_name}</span>
                  <span className="text-amber-600">{g.holders}/{g.total_employees || '?'} karyawan</span>
                </div>
              ))}
              {!gaps.length && <p className="text-gray-400 text-sm">Belum ada data kompetensi</p>}
            </div>
          </div>
        </div>
      </HumanifyLayout>
    </PageGuard>
  );
}
