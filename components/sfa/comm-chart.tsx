'use client';

import { ChartCard } from '@/components/sfa/chart-components';
import { CheckCircle } from 'lucide-react';

interface Activity { id: string; comm_type?: string; customer_name?: string; subject?: string; direction?: string; status: string; created_at?: string; }
interface FollowUp { id: string; title: string; customer_name?: string; follow_up_type?: string; due_date: string; status: string; }
interface Props { activities: Activity[]; followUps: FollowUp[]; t: (key: string) => string; onCompleteFollowUp: (id: string) => void; fmtDate: (d: string) => string; }

export default function CommChart({ activities, followUps, t }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title={t('sfa.commPerType')} subtitle={t('sfa.commPerTypeSub')}>
        <div className="py-8 text-center text-gray-400">Chart will render on client</div>
      </ChartCard>
      <ChartCard title={t('sfa.followUpPending')} subtitle={t('sfa.followUpPendingSub')}>
        {followUps.filter(f => f.status === 'pending').length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <CheckCircle className="w-10 h-10 mb-2 opacity-30" />
            <span className="text-sm">{t('sfa.allFollowUpDone')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {followUps.filter(f => f.status === 'pending').map(f => (
              <div key={f.id} className="text-xs">{f.title}</div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
