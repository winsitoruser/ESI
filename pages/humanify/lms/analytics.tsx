import { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import { PageGuard } from '@/components/permissions';
import { OpsChartCard, OpsBarChart, OpsPieChart } from '@/components/humanify/ops-charts';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import { useTranslation } from '@/lib/i18n';
import { HF_CHART_COLORS_SOLID } from '@/lib/humanify/chart-tokens';
import {
  BarChart3, Users, Target, AlertTriangle, GraduationCap,
} from 'lucide-react';

const API = '/api/humanify/lms/analytics';

export default function LmsAnalyticsPage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>({});
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, h, g] = await Promise.all([
        fetch(`${API}?action=overview`).then((r) => r.json()),
        fetch(`${API}?action=department-heatmap`).then((r) => r.json()),
        fetch(`${API}?action=competency-gaps`).then((r) => r.json()),
      ]);
      setOverview(o.data || {});
      setHeatmap(h.data || []);
      setGaps(g.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deptChart = heatmap.slice(0, 8).map((d) => ({
    name: d.department || '—',
    progress: Number(d.avg_progress) || 0,
    score: Number(d.avg_exam_score) || 0,
  }));

  const gapPie = gaps.slice(0, 6).map((g) => ({
    name: g.competency_name || g.competency_code || 'Skill',
    value: Number(g.holders) || 0,
  }));

  return (
    <PageGuard anyPermission={['lms.view', 'lms.*']}>
      <HumanifyLayout title={t('hris.lmsAnalytics')} subtitle="Analytics L&D — progress training, performa ujian, skill gap">
        <TalentShell
          current="analytics"
          title="Analytics L&D"
          subtitle="Pantau enrollment, progress kursus, skor ujian, dan skill gap per departemen."
          icon={BarChart3}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OpsKpiShell>
              <HRStatCard icon={Users} label="Enrollment" value={loading ? '—' : overview.training?.enrollments || 0} sub="Peserta terdaftar" accent="violet" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={Target} label="Kursus selesai" value={loading ? '—' : overview.training?.completed || 0} sub="Completed enrollments" accent="emerald" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={GraduationCap} label="Avg progress" value={loading ? '—' : `${Math.round(Number(overview.training?.avg_progress) || 0)}%`} sub="Rata-rata penyelesaian" accent="blue" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={AlertTriangle} label="Proctor flagged" value={loading ? '—' : overview.proctor_flagged || 0} sub="Sesi perlu review" accent="amber" />
            </OpsKpiShell>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OpsChartCard title="Progress per departemen" subtitle="Rata-rata progress & skor ujian">
              {deptChart.length ? (
                <OpsBarChart
                  data={deptChart}
                  xKey="name"
                  bars={[
                    { key: 'progress', label: 'Progress %', color: HF_CHART_COLORS_SOLID[0] },
                    { key: 'score', label: 'Avg skor', color: HF_CHART_COLORS_SOLID[2] },
                  ]}
                  height={260}
                />
              ) : (
                <p className="py-16 text-center text-sm text-[color:var(--hf-ink-muted)]">Belum ada data enrollment</p>
              )}
            </OpsChartCard>

            <OpsChartCard title="Skill holders" subtitle="Kompetensi dengan pemegang terbanyak">
              {gapPie.some((x) => x.value > 0) ? (
                <OpsPieChart data={gapPie} nameKey="name" valueKey="value" height={260} />
              ) : (
                <p className="py-16 text-center text-sm text-[color:var(--hf-ink-muted)]">Belum ada data kompetensi</p>
              )}
            </OpsChartCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="hf-card overflow-hidden !p-0">
              <div className="border-b border-[var(--hf-border)] px-5 py-4">
                <p className="hf-section-label">Departemen</p>
                <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">Heatmap progress</h3>
              </div>
              <div className="space-y-3 p-5">
                {heatmap.map((d) => (
                  <div key={d.department} className="text-sm">
                    <div className="mb-1 flex justify-between gap-2">
                      <span className="font-medium text-[color:var(--hf-ink)]">{d.department}</span>
                      <span className="tabular-nums text-[color:var(--hf-ink-muted)]">{d.avg_progress || 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--hf-brand-500)] to-emerald-500"
                        style={{ width: `${Math.min(100, Number(d.avg_progress) || 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--hf-ink-faint)]">
                      {d.enrolled || 0} enrolled · avg ujian {d.avg_exam_score || 0}%
                    </p>
                  </div>
                ))}
                {!heatmap.length && (
                  <p className="py-8 text-center text-sm text-[color:var(--hf-ink-muted)]">Belum ada data enrollment</p>
                )}
              </div>
            </section>

            <section className="hf-card overflow-hidden !p-0">
              <div className="border-b border-[var(--hf-border)] px-5 py-4">
                <p className="hf-section-label">Kompetensi</p>
                <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">Skill gap</h3>
              </div>
              <ul className="divide-y divide-[var(--hf-border-subtle)]">
                {gaps.slice(0, 10).map((g) => (
                  <li key={g.competency_code || g.competency_name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--hf-ink)]">{g.competency_name}</p>
                      <p className="text-xs text-[color:var(--hf-ink-faint)]">{g.competency_code}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {g.holders}/{g.total_employees || '?'}
                    </span>
                  </li>
                ))}
                {!gaps.length && (
                  <li className="px-5 py-10 text-center text-sm text-[color:var(--hf-ink-muted)]">Belum ada data kompetensi</li>
                )}
              </ul>
            </section>
          </div>
        </TalentShell>
      </HumanifyLayout>
    </PageGuard>
  );
}
