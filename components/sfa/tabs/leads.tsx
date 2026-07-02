import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation, Currency, Language } from '@/lib/i18n';
import { Search, Plus, X, ArrowRight, Trash2, Phone, Mail, MapPin, TrendingUp, BarChart3, UserPlus } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap, FI, inputCls } from '@/components/sfa/shared-ui';
import { LEAD_COLORS } from '@/components/sfa/chart-components';
import { makeFmtCur, makeFmtDate } from '@/components/sfa/formatters';
import { Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// ── Lead Types & Constants ──
export const LEAD_STATUS: Record<string, { tKey: string; color: string; ring: string }> = {
  new: { tKey: 'leadNew', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200' },
  contacted: { tKey: 'leadContacted', color: 'bg-sky-50 text-sky-700', ring: 'ring-sky-200' },
  qualified: { tKey: 'leadQualified', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200' },
  proposal: { tKey: 'leadProposal', color: 'bg-violet-50 text-violet-700', ring: 'ring-violet-200' },
  negotiation: { tKey: 'leadNegotiation', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200' },
  converted: { tKey: 'leadConverted', color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
  lost: { tKey: 'leadLost', color: 'bg-red-50 text-red-700', ring: 'ring-red-200' },
};

interface Lead {
  id: string;
  contact_name?: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  lead_number?: string;
  industry?: string;
  source?: string;
  status: string;
  estimated_value: string | number;
  score?: number;
  priority?: string;
  territory_name?: string;
  city?: string;
  province?: string;
  notes?: string;
}

interface LeadsTabProps {
  leads: Lead[];
  filteredLeads: Lead[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedItem: any;
  onSelectItem: (item: any) => void;
  onClearSelection: () => void;
  onAdd: () => void;
  onConvert: (lead: any) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (lead: any, status: string) => void;
  canDelete: boolean;
  fmtCur: (n: number) => string;
  fmtDate: (d: string) => string;
  t: (key: string) => string;
}

export default function LeadsTab({
  leads, filteredLeads, search, onSearchChange,
  selectedItem, onSelectItem, onClearSelection, onAdd,
  onConvert, onDelete, onUpdateStatus, canDelete,
  fmtCur, fmtDate, t
}: LeadsTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.leadManagement')} subtitle={`${filteredLeads.length} leads`}
        action={<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" /><input className={`${inputCls} pl-10 !py-2`} placeholder={t('sfa.searchLead')} value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <PrimaryBtn onClick={onAdd} icon={Plus}>{t('sfa.addLead')}</PrimaryBtn>
        </div>} />

      {/* Lead Stats Bar */}
      {!selectedItem && leads.length > 0 && (() => {
        const statusCounts = leads.reduce((a: any, l: Lead) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
        const total = leads.length;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('sfa.statusDistribution')}</p>
              <div className="flex rounded-xl overflow-hidden h-4 bg-gray-100">
                {Object.entries(statusCounts).map(([status, count]: any, i: number) => (
                  <div key={i} title={`${t(`sfa.${LEAD_STATUS[status]?.tKey}`) || status}: ${count}`}
                    className="h-full transition-all" style={{ width: `${(count / total) * 100}%`, background: LEAD_COLORS[status] || '#94a3b8' }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {Object.entries(statusCounts).map(([status, count]: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: LEAD_COLORS[status] || '#94a3b8' }} />
                    <span className="text-gray-500">{t(`sfa.${LEAD_STATUS[status]?.tKey}`) || status}</span>
                    <span className="font-bold text-gray-700">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('sfa.summaryLabel')}</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-gray-500">{t('sfa.totalLead')}</span><span className="text-sm font-bold text-gray-900">{total}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">{t('sfa.totalEstimate')}</span><span className="text-sm font-bold text-emerald-600">{fmtCur(leads.reduce((s: number, l: Lead) => s + parseFloat(String(l.estimated_value || 0)), 0))}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">{t('sfa.avgScore')}</span><span className="text-sm font-bold text-amber-600">{(leads.reduce((s: number, l: Lead) => s + (l.score || 0), 0) / total).toFixed(0)}</span></div>
              </div>
            </Card>
          </div>
        );
      })()}

      {selectedItem ? (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shrink-0">{(selectedItem.company_name || selectedItem.contact_name || '?')[0].toUpperCase()}</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedItem.company_name || selectedItem.contact_name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedItem.lead_number} {selectedItem.industry && `| ${selectedItem.industry}`}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {selectedItem.status !== 'converted' && selectedItem.status !== 'lost' && (
                <button onClick={() => onConvert(selectedItem)} className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 shadow-sm transition-all"><ArrowRight className="w-4 h-4" /> Convert</button>
              )}
              {canDelete && <button onClick={() => onDelete(selectedItem.id)} className="p-2.5 rounded-xl border border-gray-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>}
              <button onClick={onClearSelection} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              {[{ icon: Phone, val: selectedItem.contact_phone || '-' }, { icon: Mail, val: selectedItem.contact_email || '-' }, { icon: MapPin, val: `${selectedItem.city || '-'}, ${selectedItem.province || '-'}` }].map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0"><r.icon className="w-4 h-4 text-gray-400" /></div><span className="text-gray-700">{r.val}</span></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50"><span className="text-xs text-gray-500">{t('sfa.estimatedValue')}</span><span className="text-sm font-bold text-emerald-600">{fmtCur(parseFloat(String(selectedItem.estimated_value)))}</span></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50"><span className="text-xs text-gray-500">{t('sfa.leadScore')}</span><div className="flex items-center gap-2"><div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${selectedItem.score}%` }} /></div><span className="text-sm font-bold text-gray-700">{selectedItem.score}</span></div></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('sfa.territory')}</span><span className="text-sm font-medium text-gray-700">{selectedItem.territory_name || '-'}</span></div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('sfa.changeStatus')}</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(LEAD_STATUS).map(([k, v]) => (
                <button key={k} disabled={selectedItem.status === k} onClick={() => onUpdateStatus(selectedItem, k)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${selectedItem.status === k ? `${v.color} ring-2 ${v.ring} shadow-sm` : `${v.color} opacity-60 hover:opacity-100`}`}>{t(`sfa.${v.tKey}`)}</button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Kontak</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Est. Value</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Score</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLeads.length === 0 ? <tr><td colSpan={5}><EmptyState icon={UserPlus} title={t('sfa.noLeads')} subtitle={t('sfa.noLeadsSub')} /></td></tr> :
                filteredLeads.map(l => (
                  <tr key={l.id} className="hover:bg-amber-50/30 cursor-pointer group transition-colors" onClick={() => onSelectItem(l)}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{(l.company_name || l.contact_name || '?')[0].toUpperCase()}</div><div><div className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{l.company_name || l.contact_name}</div><div className="text-xs text-gray-400 mt-0.5">{l.lead_number}</div></div></div></td>
                    <td className="px-5 py-4 hidden sm:table-cell"><div className="text-gray-700">{l.contact_name}</div><div className="text-xs text-gray-400">{l.contact_email}</div></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg font-medium ${LEAD_STATUS[l.status]?.color || ''}`}>{t(`sfa.${LEAD_STATUS[l.status]?.tKey}`) || l.status}</span></td>
                    <td className="px-5 py-4 text-right hidden md:table-cell"><span className="font-semibold text-gray-900">{fmtCur(parseFloat(String(l.estimated_value)))}</span></td>
                    <td className="px-5 py-4 hidden lg:table-cell"><div className="flex items-center gap-2 justify-end"><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${l.score}%` }} /></div><span className="text-xs font-medium text-gray-500 w-6 text-right">{l.score}</span></div></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
