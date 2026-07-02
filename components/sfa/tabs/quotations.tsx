import { useTranslation } from '@/lib/i18n';
import { ShoppingCart, Plus } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';
import { ChartTooltip, ChartCard, ChartLegendItem } from '@/components/sfa/chart-components';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FieldOrder {
  id: string;
  order_number?: string;
  customer_name?: string;
  item_count?: number;
  total?: number;
  status: string;
  order_date?: string;
}

interface Quotation {
  id: string;
  quotation_number?: string;
  customer_name?: string;
  status: string;
  total: string;
  valid_until?: string;
}

interface QuotationsTabProps {
  fieldOrders: FieldOrder[];
  quotations: Quotation[];
  onAdd: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  canApprove: boolean;
  fmtCur: (n: number) => string;
  fmtDate: (d: string) => string;
  t: (key: string) => string;
}

export default function QuotationsTab({ fieldOrders, quotations, onAdd, onApprove, onReject, canApprove, fmtCur, fmtDate, t }: QuotationsTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.fieldOrderQuotation')} subtitle={`${fieldOrders.length} orders | ${quotations.length} quotations`}
        action={<PrimaryBtn onClick={onAdd} icon={Plus}>{t('sfa.createFieldOrder')}</PrimaryBtn>} />

      {/* Order Analytics */}
      {fieldOrders.length > 0 && (() => {
        const oStatusCounts = fieldOrders.reduce((a: any, fo: FieldOrder) => { a[fo.status] = (a[fo.status] || 0) + 1; return a; }, {});
        const oColors: Record<string, string> = { approved: '#10b981', submitted: '#3b82f6', draft: '#94a3b8', rejected: '#ef4444', processing: '#f59e0b' };
        const totalRev = fieldOrders.reduce((s: number, fo: FieldOrder) => s + (parseFloat(String(fo.total)) || 0), 0);
        const approvedRev = fieldOrders.filter((fo: FieldOrder) => fo.status === 'approved').reduce((s: number, fo: FieldOrder) => s + (parseFloat(String(fo.total)) || 0), 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title={t('sfa.orderStatus')} subtitle={t('sfa.orderDistSub')}>
              <div className="flex flex-col items-center gap-4">
                <div className="w-40 h-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(oStatusCounts).map(([s, c]) => ({ name: s, value: c as number, fill: oColors[s] || '#94a3b8' }))}
                        cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>
                        {Object.entries(oStatusCounts).map(([s], i) => <Cell key={i} fill={oColors[s] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-gray-900">{fieldOrders.length}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Order</span>
                  </div>
                </div>
                <div className="w-full divide-y divide-gray-50">
                  {Object.entries(oStatusCounts).map(([s, c]: any, i) => (
                    <ChartLegendItem key={i} color={oColors[s] || '#94a3b8'} label={s} value={c} total={fieldOrders.length} />
                  ))}
                </div>
              </div>
            </ChartCard>
            <ChartCard title={t('sfa.orderSummary')} subtitle={t('sfa.orderPerfSub')} className="lg:col-span-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-2xl font-extrabold text-gray-900">{fieldOrders.length}</p><p className="text-[10px] text-gray-500 font-medium mt-1">{t('sfa.totalOrder')}</p></div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-2xl font-extrabold text-emerald-600">{oStatusCounts['approved'] || 0}</p><p className="text-[10px] text-gray-500 font-medium mt-1">{t('sfa.approvedLabel')}</p></div>
                <div className="bg-blue-50 rounded-xl p-4 text-center"><p className="text-lg font-bold text-blue-600">{fmtCur(totalRev)}</p><p className="text-[10px] text-gray-500 font-medium mt-1">{t('sfa.totalValueLabel')}</p></div>
                <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-lg font-bold text-amber-600">{fmtCur(approvedRev)}</p><p className="text-[10px] text-gray-500 font-medium mt-1">{t('sfa.approvedValueLabel')}</p></div>
              </div>
            </ChartCard>
          </div>
        );
      })()}

      <TableWrap>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Order</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Items</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tanggal</th><th className="px-5 py-3.5"></th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {fieldOrders.length === 0 ? <tr><td colSpan={7}><EmptyState icon={ShoppingCart} title={t('sfa.noFieldOrder')} /></td></tr> :
              fieldOrders.map((fo: FieldOrder) => (
                <tr key={fo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-medium">{fo.order_number}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{fo.customer_name}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600 hidden sm:table-cell">{fo.item_count}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmtCur(parseFloat(String(fo.total || 0)))}</td>
                  <td className="px-5 py-3.5 text-center"><Badge color={fo.status === 'approved' ? 'green' : fo.status === 'rejected' ? 'red' : fo.status === 'submitted' ? 'blue' : 'gray'}>{fo.status}</Badge></td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fo.order_date}</td>
                  <td className="px-5 py-3.5">{canApprove && (fo.status === 'draft' || fo.status === 'submitted') && (<div className="flex gap-1.5"><button onClick={() => onApprove(fo.id)} className="px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors">{t('sfa.approveBtn')}</button><button onClick={() => onReject(fo.id)} className="px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors">{t('sfa.rejectBtn')}</button></div>)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </TableWrap>

      {quotations.length > 0 && (<>
        <SectionHeader title={t('sfa.quotationTitle')} />
        <TableWrap>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Quotation</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Valid Until</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {quotations.map((q: Quotation) => (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{q.quotation_number}</td>
                  <td className="px-5 py-3.5 text-gray-600">{q.customer_name}</td>
                  <td className="px-5 py-3.5 text-center"><Badge color={q.status === 'approved' ? 'green' : q.status === 'sent' ? 'blue' : q.status === 'rejected' ? 'red' : 'gray'}>{q.status}</Badge></td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmtCur(parseFloat(q.total))}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fmtDate(q.valid_until || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </>)}
    </>
  );
}
