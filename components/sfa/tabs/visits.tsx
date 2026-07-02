import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Navigation, Users, Plus, Building2, ArrowRight, CalendarDays, Link2, Clock, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';
import { ChartTooltip, ChartCard, ChartLegendItem } from '@/components/sfa/chart-components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Visit {
  id: string;
  customer_name?: string;
  salesperson_name?: string;
  visit_type?: string;
  purpose?: string;
  visit_date?: string;
  status: string;
  order_taken?: boolean;
  order_value?: number;
  check_in_time?: string;
  check_out_time?: string;
  duration_minutes?: number;
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  outcome?: string;
  outcome_notes?: string;
  feedback?: string;
}

interface CoveragePlan {
  id: string;
  name: string;
  customer_class?: string;
  assignment_count?: number;
  visit_frequency?: string;
  visits_per_period?: number;
}

interface Compliance {
  name: string;
  total_customers: number;
  total_planned: number;
  total_actual: number;
  compliance_pct: string;
  overdue_visits: string;
}

interface VisitsTabProps {
  visits: Visit[];
  coveragePlans: CoveragePlan[];
  compliance: Compliance[];
  visitBridgeStat: any;
  onAdd: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onSwitchToFieldTasks: () => void;
  fmtCur: (n: number) => string;
  fmtDate: (d: string) => string;
  fmtDateTime: (d: string | null | undefined) => string;
  t: (key: string) => string;
}

export default function VisitsTab({ visits, coveragePlans, compliance, visitBridgeStat, onAdd, onUpdateStatus, onSwitchToFieldTasks, fmtCur, fmtDate, fmtDateTime, t }: VisitsTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.visitsCoverage')} subtitle={`${visits.length} ${t('sfa.visits').toLowerCase()} | ${coveragePlans.length} coverage plans`}
        action={<PrimaryBtn onClick={onAdd} icon={Plus}>{t('sfa.scheduleBtn')}</PrimaryBtn>} />

      {/* Visit-Task Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2 border border-violet-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{t('sfa.visitTaskBridgeTitle')}</h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{t('sfa.visitTaskBridgeSub')}</p>
              </div>
            </div>
            <button onClick={onSwitchToFieldTasks} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shrink-0">
              <CalendarDays className="w-4 h-4" /> {t('sfa.openVisitPlanTasks')}
            </button>
          </div>
        </Card>
        {visitBridgeStat && (
          <Card className="p-4 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">{t('sfa.visitBridgePeriod')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">{t('sfa.visitsScheduled')}</span><div className="font-bold text-gray-900">{visitBridgeStat.visits_in_period ?? '—'}</div></div>
              <div><span className="text-gray-500">{t('sfa.visitsDone')}</span><div className="font-bold text-emerald-700">{visitBridgeStat.visits_completed ?? '—'}</div></div>
              <div><span className="text-gray-500">{t('sfa.visitTasksLinked')}</span><div className="font-bold text-violet-700">{visitBridgeStat.visit_tasks_in_period ?? '—'}</div></div>
              <div><span className="text-gray-500">{t('sfa.visitTasksDone')}</span><div className="font-bold text-indigo-700">{visitBridgeStat.visit_tasks_completed ?? '—'}</div></div>
            </div>
          </Card>
        )}
      </div>

      {/* Visit Analytics */}
      {visits.length > 0 && (() => {
        const vStatusCounts = visits.reduce((a: any, v: Visit) => { a[v.status] = (a[v.status] || 0) + 1; return a; }, {});
        const vColors: Record<string, string> = { completed: '#10b981', in_progress: '#3b82f6', checked_in: '#3b82f6', planned: '#f59e0b', cancelled: '#ef4444', missed: '#6b7280' };
        const pieData = Object.entries(vStatusCounts).map(([s, c]) => ({ name: s, value: c as number, fill: vColors[s] || '#94a3b8' }));
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('sfa.visitStatus')} subtitle={t('sfa.visitStatusSub')}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-40 h-40 shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-gray-900">{visits.length}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Total</span>
                  </div>
                </div>
                <div className="flex-1 w-full divide-y divide-gray-50">
                  {pieData.map((d, i) => (
                    <ChartLegendItem key={i} color={d.fill} label={d.name.replace('_', ' ')} value={d.value} total={visits.length} />
                  ))}
                </div>
              </div>
            </ChartCard>
            {compliance.length > 0 && (
              <ChartCard title={t('sfa.compliancePerFf')} subtitle={t('sfa.complianceSub')}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compliance.slice(0, 8).map((c: any) => ({ name: (c.name || '').split(' ')[0], compliance: parseFloat(c.compliance_pct), planned: parseInt(c.total_planned), actual: parseInt(c.total_actual) }))} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                    <Bar dataKey="compliance" name="Compliance %" radius={[8, 8, 0, 0]} maxBarSize={36}>
                      {compliance.slice(0, 8).map((c: any, i: number) => <Cell key={i} fill={parseFloat(c.compliance_pct) >= 80 ? '#10b981' : parseFloat(c.compliance_pct) >= 60 ? '#f59e0b' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        );
      })()}

      {coveragePlans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {coveragePlans.map((cp: CoveragePlan) => (
            <Card key={cp.id} className="p-4" hover>
              <div className="flex items-center justify-between mb-2">
                <Badge color={cp.customer_class === 'platinum' ? 'purple' : cp.customer_class === 'gold' ? 'yellow' : cp.customer_class === 'silver' ? 'gray' : 'orange'}>{cp.customer_class}</Badge>
                <span className="text-[11px] text-gray-400 font-medium">{cp.assignment_count} cust</span>
              </div>
              <h4 className="font-semibold text-sm text-gray-900">{cp.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{cp.visit_frequency} | {cp.visits_per_period}x/period</p>
            </Card>
          ))}
        </div>
      )}

      {compliance.length > 0 && (<>
        <SectionHeader title={t('sfa.visitComplianceTitle')} />
        <TableWrap>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Customer</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Planned</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Compliance</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Overdue</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {compliance.map((c: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600 hidden sm:table-cell">{c.total_customers}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{c.total_planned}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600">{c.total_actual}</td>
                  <td className="px-5 py-3.5 text-right"><Badge color={parseFloat(c.compliance_pct) >= 80 ? 'green' : parseFloat(c.compliance_pct) >= 60 ? 'yellow' : 'red'}>{c.compliance_pct}%</Badge></td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">{parseInt(c.overdue_visits) > 0 ? <Badge color="red">{c.overdue_visits}</Badge> : <span className="text-gray-400">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </>)}

      <SectionHeader title={t('sfa.recentVisits')} />
      <div className="grid gap-3">
        {visits.length === 0 ? <Card><EmptyState icon={Navigation} title={t('sfa.noVisits')} subtitle={t('sfa.noVisitsSub')} /></Card> :
          visits.slice(0, 20).map(v => (
            <Card key={v.id} className="p-4 sm:px-5" hover>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : v.status === 'in_progress' || v.status === 'checked_in' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}><Navigation className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{v.customer_name || 'Customer'}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {v.salesperson_name ? <span className="text-gray-500">{v.salesperson_name} · </span> : null}
                      {v.purpose || v.visit_type} | {fmtDate(v.visit_date || '')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {v.order_taken && <Badge color="green">Order: {fmtCur(parseFloat(String(v.order_value)))}</Badge>}
                  <button onClick={() => {
                    const next: Record<string, string> = { planned: 'in_progress', in_progress: 'completed', completed: 'planned', cancelled: 'planned', missed: 'planned', checked_in: 'completed' };
                    const ns = next[v.status] || 'in_progress';
                    onUpdateStatus(v.id, ns);
                  }} title={t('sfa.changeStatus')}>
                    <Badge color={v.status === 'completed' ? 'green' : v.status === 'in_progress' || v.status === 'checked_in' ? 'blue' : 'gray'}>{v.status}</Badge>
                  </button>
                </div>
              </div>
              {(v.check_in_time || v.check_out_time || v.duration_minutes != null) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 border-t border-gray-50 pt-3">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('sfa.visitCheckIn')}: <span className="font-medium text-gray-800">{fmtDateTime(v.check_in_time)}</span></span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{t('sfa.visitCheckOut')}: <span className="font-medium text-gray-800">{fmtDateTime(v.check_out_time)}</span></span>
                  {v.duration_minutes != null && Number(v.duration_minutes) > 0 && (
                    <span>{t('sfa.visitDuration')}: <span className="font-medium text-gray-800">{v.duration_minutes} min</span></span>
                  )}
                </div>
              )}
              {(v.check_in_photo_url || v.check_out_photo_url) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-50 pt-3">
                  {v.check_in_photo_url && (
                    <a href={v.check_in_photo_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 ring-1 ring-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.check_in_photo_url} alt="" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white text-center py-0.5">{t('sfa.visitOpenPhoto')}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Camera className="w-3 h-3" />{t('sfa.visitPhotoIn')}</span>
                    </a>
                  )}
                  {v.check_out_photo_url && (
                    <a href={v.check_out_photo_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 ring-1 ring-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.check_out_photo_url} alt="" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white text-center py-0.5">{t('sfa.visitOpenPhoto')}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Camera className="w-3 h-3" />{t('sfa.visitPhotoOut')}</span>
                    </a>
                  )}
                </div>
              )}
              {(v.outcome || v.outcome_notes || v.feedback) && (
                <div className="mt-3 space-y-2 text-xs border-t border-gray-50 pt-3">
                  {v.outcome && <p className="text-gray-700"><span className="text-gray-500 font-medium">{t('sfa.visitOutcome')}: </span>{v.outcome}</p>}
                  {v.outcome_notes && <p className="text-gray-700 whitespace-pre-wrap"><span className="text-gray-500 font-medium">{t('sfa.visitNotes')}: </span>{v.outcome_notes}</p>}
                  {v.feedback && <p className="text-gray-700 whitespace-pre-wrap"><span className="text-gray-500 font-medium">{t('sfa.visitFeedback')}: </span>{v.feedback}</p>}
                </div>
              )}
            </Card>
          ))
        }
      </div>
    </>
  );
}
