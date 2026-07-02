import { useTranslation } from '@/lib/i18n';
import { Plus, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';
import { ChartTooltip, ChartCard, ChartLegendItem, CHART_COLORS, STAGE_COLORS } from '@/components/sfa/chart-components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ── Opportunity Types & Constants ──
export const OPP_STAGES: Record<string, { tKey: string; color: string; gradient: string; prob: number }> = {
  qualification: { tKey: 'stageQualification', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', prob: 10 },
  needs_analysis: { tKey: 'stageAnalysis', color: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600', prob: 25 },
  proposal: { tKey: 'stageProposal', color: 'bg-violet-500', gradient: 'from-violet-500 to-violet-600', prob: 40 },
  negotiation: { tKey: 'stageNegotiation', color: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600', prob: 70 },
  closed_won: { tKey: 'stageWon', color: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600', prob: 100 },
  closed_lost: { tKey: 'stageLost', color: 'bg-red-500', gradient: 'from-red-500 to-red-600', prob: 0 },
};

interface Opportunity {
  id: string;
  title: string;
  opportunity_number?: string;
  customer_name?: string;
  stage: string;
  expected_value: number;
  expected_close_date?: string;
}

interface PipelineData {
  stages?: { stage: string; count: number; value: number }[];
  totalValue?: number;
  totalCount?: number;
  weightedValue?: number;
}

interface OpportunitiesTabProps {
  opportunities: Opportunity[];
  pipelineData: PipelineData | null;
  onAdd: () => void;
  onUpdateStage: (opp: Opportunity, stage: string) => void;
  fmtCur: (n: number) => string;
  fmtDate: (d: string) => string;
  t: (key: string) => string;
}

export default function OpportunitiesTab({ opportunities, pipelineData, onAdd, onUpdateStage, fmtCur, fmtDate, t }: OpportunitiesTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.salesPipeline')} subtitle={`Total: ${fmtCur(parseFloat(String(pipelineData?.totalValue || 0)))} (${pipelineData?.totalCount || 0} deals) | Weighted: ${fmtCur(parseFloat(String(pipelineData?.weightedValue || 0)))}`}
        action={<PrimaryBtn onClick={onAdd} icon={Plus}>{t('sfa.addBtn')}</PrimaryBtn>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(OPP_STAGES).map(([stage, info]) => {
          const d = (pipelineData?.stages || []).find((s: any) => s.stage === stage);
          return (
            <Card key={stage} className="p-4 text-center group hover:shadow-md transition-all">
              <div className={`w-full h-1 rounded-full bg-gradient-to-r ${info.gradient} mb-4 group-hover:h-1.5 transition-all`} />
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{t(`sfa.${info.tKey}`)}</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{d?.count || 0}</p>
              <p className="text-xs text-gray-400 mt-1">{fmtCur(parseFloat(String(d?.value || 0)))}</p>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('sfa.pipelineValueStage')} subtitle={t('sfa.pipelineValueSub')}>
          {(pipelineData?.stages || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={(pipelineData?.stages || []).filter((s: any) => s.stage !== 'closed_lost').map((s: any) => ({ name: t(`sfa.${OPP_STAGES[s.stage]?.tKey}`) || s.stage, value: parseFloat(s.value), count: parseInt(s.count) }))}
                margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                <Bar dataKey="value" name="Nilai" radius={[8, 8, 0, 0]} maxBarSize={45}>
                  {(pipelineData?.stages || []).filter((s: any) => s.stage !== 'closed_lost').map((s: any, i: number) => <Cell key={i} fill={STAGE_COLORS[s.stage] || CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><TrendingUp className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noData')}</span></div>}
        </ChartCard>
        <ChartCard title={t('sfa.dealsDistribution')} subtitle={t('sfa.dealsProportion')}>
          {(pipelineData?.stages || []).length > 0 ? (() => {
            const totalDeals = (pipelineData?.stages || []).reduce((s: number, d: any) => s + parseInt(d.count), 0);
            return (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-44 h-44 shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={(pipelineData?.stages || []).map((s: any) => ({ name: t(`sfa.${OPP_STAGES[s.stage]?.tKey}`) || s.stage, value: parseInt(s.count), fill: STAGE_COLORS[s.stage] || '#94a3b8' }))}
                        cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>
                        {(pipelineData?.stages || []).map((s: any, i: number) => <Cell key={i} fill={STAGE_COLORS[s.stage] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-gray-900">{totalDeals}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Deals</span>
                  </div>
                </div>
                <div className="flex-1 w-full divide-y divide-gray-50">
                  {(pipelineData?.stages || []).map((s: any, i: number) => (
                    <ChartLegendItem key={i} color={STAGE_COLORS[s.stage] || '#94a3b8'} label={t(`sfa.${OPP_STAGES[s.stage]?.tKey}`) || s.stage} value={parseInt(s.count)} total={totalDeals} />
                  ))}
                </div>
              </div>
            );
          })() : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><TrendingUp className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noData')}</span></div>}
        </ChartCard>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Opportunity</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
            <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
            <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Close Date</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {opportunities.length === 0 ? <tr><td colSpan={5}><EmptyState icon={TrendingUp} title={t('sfa.noOpportunity')} /></td></tr> :
              opportunities.map(o => (
                <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-5 py-4"><div className="font-semibold text-gray-900">{o.title}</div><div className="text-xs text-gray-400 mt-0.5">{o.opportunity_number}</div></td>
                  <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{o.customer_name || '-'}</td>
                  <td className="px-5 py-4"><select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" value={o.stage} onChange={e => onUpdateStage(o, e.target.value)}>{Object.entries(OPP_STAGES).map(([k, v]) => <option key={k} value={k}>{t(`sfa.${v.tKey}`)}</option>)}</select></td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">{fmtCur(parseFloat(String(o.expected_value)))}</td>
                  <td className="px-5 py-4 text-right text-gray-500 hidden md:table-cell">{fmtDate(o.expected_close_date || '')}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
