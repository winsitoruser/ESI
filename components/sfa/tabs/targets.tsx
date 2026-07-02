import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Target, Award, Plus, TrendingUp } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';
import { ChartTooltip, ChartLegendItem } from '@/components/sfa/chart-components';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TargetGroup {
  id: string;
  name: string;
  code: string;
  period_type: string;
  status: string;
  period_start: string;
  period_end: string;
  target_metric: string;
  target_type: string;
  assignment_count?: number;
}

interface IncentiveScheme {
  id: string;
  name: string;
  code: string;
  scheme_type: string;
  is_active: boolean;
  calculation_basis: string;
  tier_count?: number;
  effective_from?: string;
  effective_to?: string;
}

interface TargetsTabProps {
  targetGroups: TargetGroup[];
  incentiveSchemes: IncentiveScheme[];
  fmtCur: (n: number) => string;
  fmtDate: (d: string) => string;
  t: (key: string) => string;
}

export default function TargetsTab({ targetGroups, incentiveSchemes, fmtCur, fmtDate, t }: TargetsTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.targetGroupsTitle')} subtitle={t('sfa.targetGroupsSub')} />
      <div className="grid sm:grid-cols-2 gap-4">
        {targetGroups.length === 0 ? <div className="col-span-2"><EmptyState icon={Target} title={t('sfa.noTargetGroup')} /></div> :
          targetGroups.map((tg: TargetGroup) => (
            <Card key={tg.id} className="p-5" hover>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0"><Target className="w-5 h-5" /></div>
                  <div><h4 className="font-semibold text-sm text-gray-900">{tg.name}</h4><p className="text-xs text-gray-400">{tg.code} | {tg.period_type}</p></div>
                </div>
                <Badge color={tg.status === 'active' ? 'green' : 'gray'}>{tg.status}</Badge>
              </div>
              <div className="text-xs text-gray-400 mb-3">{tg.period_start} → {tg.period_end}</div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
                <div><p className="text-[10px] text-gray-400 uppercase">{t('sfa.metricLabel')}</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{tg.target_metric}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">{t('sfa.typeLabel')}</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{tg.target_type}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase">{t('sfa.assignLabel')}</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{tg.assignment_count || 0}</p></div>
              </div>
            </Card>
          ))
        }
      </div>

      {/* Incentives Section */}
      <SectionHeader title={t('sfa.incentiveSchemes')} />
      <div className="grid sm:grid-cols-2 gap-4">
        {incentiveSchemes.length === 0 ? <div className="col-span-2"><EmptyState icon={Award} title={t('sfa.noIncentiveScheme')} /></div> :
          incentiveSchemes.map((s: IncentiveScheme) => (
            <Card key={s.id} className="p-5" hover>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shrink-0"><Award className="w-4 h-4" /></div>
                  <div><h4 className="font-semibold text-sm text-gray-900">{s.name}</h4><p className="text-xs text-gray-400">{s.code} | {s.scheme_type}</p></div>
                </div>
                <Badge color={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                <span>{s.calculation_basis}</span><span>|</span><span>{s.tier_count || 0} tiers</span><span>|</span><span>{s.effective_from} → {s.effective_to || '∞'}</span>
              </div>
            </Card>
          ))
        }
      </div>
    </>
  );
}
