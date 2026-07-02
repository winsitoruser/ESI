import dynamic from 'next/dynamic';
import { useTranslation } from '@/lib/i18n';
import { Phone, Mail, Calendar, CheckCircle, Trash2, MessageCircle } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';

const CommChart = dynamic(() => import('@/components/sfa/comm-chart'), { ssr: false });

interface Activity {
  id: string;
  comm_type?: string;
  customer_name?: string;
  subject?: string;
  direction?: string;
  status: string;
  created_at?: string;
}

interface FollowUp {
  id: string;
  title: string;
  customer_name?: string;
  follow_up_type?: string;
  due_date: string;
  status: string;
}

interface ActivitiesTabProps {
  activities: Activity[];
  followUps: FollowUp[];
  onAdd: () => void;
  onCompleteFollowUp: (id: string) => void;
  onDelete: (id: string, type: string) => void;
  canDelete: boolean;
  fmtDate: (d: string) => string;
  t: (key: string) => string;
}

export default function ActivitiesTab({ activities, followUps, onAdd, onCompleteFollowUp, onDelete, canDelete, fmtDate, t }: ActivitiesTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.commHub')} subtitle={`${activities.length} ${t('sfa.communications')} | ${followUps.length} follow-up`}
        action={<PrimaryBtn onClick={onAdd} icon={MessageCircle}>{t('sfa.logComm')}</PrimaryBtn>} />

      {/* Comm Summary — client-only chart */}
      {activities.length > 0 && <CommChart activities={activities} followUps={followUps} t={t} onCompleteFollowUp={onCompleteFollowUp} fmtDate={fmtDate} />}

      {/* Activity Log */}
      <TableWrap>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Subject</th>
            <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Arah</th>
            <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tanggal</th>
            {canDelete && <th className="px-5 py-3.5 w-12"></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {activities.length === 0 ? <tr><td colSpan={6}><EmptyState icon={MessageCircle} title={t('sfa.noComm')} subtitle={t('sfa.noCommSub')} /></td></tr> :
              activities.map((cm: Activity) => (
                <tr key={cm.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-2">{cm.comm_type === 'call' ? <Phone className="w-4 h-4 text-blue-500" /> : cm.comm_type === 'email' ? <Mail className="w-4 h-4 text-emerald-500" /> : cm.comm_type === 'meeting' ? <Calendar className="w-4 h-4 text-violet-500" /> : <MessageCircle className="w-4 h-4 text-green-500" />}<span className="text-xs font-medium capitalize">{cm.comm_type}</span></div></td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{cm.customer_name || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">{cm.subject || '-'}</td>
                  <td className="px-5 py-3.5 text-center"><Badge color={cm.direction === 'inbound' ? 'blue' : 'green'}>{cm.direction}</Badge></td>
                  <td className="px-5 py-3.5 text-center">
                    <button title={t('sfa.changeStatus')}><Badge color={cm.status === 'completed' ? 'green' : cm.status === 'scheduled' ? 'yellow' : 'gray'}>{cm.status}</Badge></button>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fmtDate(cm.created_at || '')}</td>
                  {canDelete && <td className="px-5 py-3.5"><button onClick={() => onDelete(cm.id, 'Komunikasi')} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button></td>}
                </tr>
              ))
            }
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
