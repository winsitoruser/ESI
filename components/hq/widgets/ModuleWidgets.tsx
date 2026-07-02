import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Wallet, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  FileText, PiggyBank, Receipt, DollarSign,
  Users, UserCheck, CalendarCheck, Award, Clock, Briefcase,
  Package, AlertCircle, ArrowRightLeft, Layers,
  Target, Heart, Navigation, ShoppingCart, MessageCircle,
  Factory, Cog, Shield, Gauge, ClipboardList,
  Truck, Fuel, Wrench, Activity,
  Megaphone, Gift, BarChart3
} from 'lucide-react';
import WidgetWrapper from './WidgetWrapper';
import { WidgetComponentProps } from '../../../lib/widgets/types';
import { useTranslation } from '@/lib/i18n';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });


// ═══════════════════════════════════════════════
// FINANCE WIDGETS
// ═══════════════════════════════════════════════

export function FinanceRevenueWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/finance/summary');
        if (r.ok) { const j = await r.json(); setData(j.data || j); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-revenue')} module="finance" icon={<Wallet className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-20 bg-gray-100 rounded-lg" /> : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{t('dashboard.wc.totalRevenue')}</span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />8.2%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.totalRevenue || data?.revenue || 485000000)}</p>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">{t('dashboard.wc.receivables')}</p>
              <p className="text-sm font-semibold text-amber-600">{formatCurrency(data?.receivables || 125000000)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('dashboard.wc.payables')}</p>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(data?.payables || 85000000)}</p>
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

export function FinanceProfitLossWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-profit-loss')} module="finance" icon={<TrendingUp className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
          <div><p className="text-xs text-emerald-600">{t('dashboard.wc.income')}</p><p className="text-lg font-bold text-emerald-700">{formatCurrency(485000000)}</p></div>
          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div><p className="text-xs text-red-600">{t('dashboard.wc.expenses')}</p><p className="text-lg font-bold text-red-700">{formatCurrency(312000000)}</p></div>
          <ArrowDownRight className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
          <div><p className="text-xs text-indigo-600">{t('dashboard.wc.netProfit')}</p><p className="text-lg font-bold text-indigo-700">{formatCurrency(173000000)}</p></div>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">35.7%</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export function FinanceCashFlowWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const months = [t('dashboard.wc.jan'), t('dashboard.wc.feb'), t('dashboard.wc.mar'), t('dashboard.wc.apr'), t('dashboard.wc.may'), t('dashboard.wc.jun')];
  const inflow = [120, 145, 132, 168, 155, 178];
  const outflow = [85, 92, 88, 105, 98, 112];

  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-cashflow')} module="finance" icon={<ArrowRightLeft className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="h-48">
        <Chart type="bar" height="100%" width="100%" options={{
          chart: { toolbar: { show: false }, stacked: false },
          colors: ['#10B981', '#EF4444'],
          plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
          xaxis: { categories: months, labels: { style: { fontSize: '10px' } }, axisBorder: { show: false } },
          yaxis: { labels: { formatter: (v: number) => formatCurrency(v * 1000000), style: { fontSize: '10px' } } },
          grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
          legend: { position: 'top', fontSize: '11px' },
          dataLabels: { enabled: false },
        }} series={[{ name: t('dashboard.wc.inflow'), data: inflow }, { name: t('dashboard.wc.outflow'), data: outflow }]} />
      </div>
    </WidgetWrapper>
  );
}

export function FinanceInvoicesWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/finance/invoices?limit=5');
        if (r.ok) { const j = await r.json(); setInvoices((j.data || []).slice(0, 5)); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-invoices')} module="finance" icon={<FileText className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div> : (
        <div className="space-y-2">
          {invoices.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">{t('dashboard.wc.noInvoices')}</p> : invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{inv.invoice_number || inv.invoiceNumber || '-'}</p>
                <p className="text-xs text-gray-500">{inv.status || 'pending'}</p>
              </div>
              <p className="text-xs font-semibold text-gray-900 flex-shrink-0">{formatCurrency(parseFloat(inv.total_amount || inv.totalAmount || 0))}</p>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  );
}

export function FinanceBudgetWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const budgets = [
    { name: t('dashboard.wc.operational'), used: 78, color: '#6366F1' },
    { name: t('dashboard.wc.marketing'), used: 45, color: '#EC4899' },
    { name: t('dashboard.wc.hr'), used: 92, color: '#F59E0B' },
    { name: t('dashboard.wc.itInfra'), used: 35, color: '#10B981' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.finance-budget')} module="finance" icon={<PiggyBank className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-3">
        {budgets.map(b => (
          <div key={b.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">{b.name}</span>
              <span className={`font-medium ${b.used > 85 ? 'text-red-600' : b.used > 70 ? 'text-amber-600' : 'text-gray-900'}`}>{b.used}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${b.used}%`, backgroundColor: b.color }} />
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// HRIS WIDGETS
// ═══════════════════════════════════════════════

export function HRISAttendanceWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/hris/attendance-management?action=today');
        if (r.ok) { const j = await r.json(); const d = j.data || j; setStats({ total: d.total || 50, present: d.present || 42, absent: d.absent || 3, late: d.late || 4, onLeave: d.onLeave || 1 }); }
      } catch { setStats({ total: 50, present: 42, absent: 3, late: 4, onLeave: 1 }); }
      setLoading(false);
    })();
  }, []);

  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <WidgetWrapper title={t('dashboard.widgets.hris-attendance')} module="hris" icon={<CalendarCheck className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      {loading ? <div className="animate-pulse h-20 bg-gray-100 rounded-lg" /> : (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-center">
              <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
              <p className="text-[10px] text-emerald-700">{t('dashboard.wc.present')}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-center">
              <p className="text-xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-[10px] text-red-700">{t('dashboard.wc.absent')}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-center">
              <p className="text-xl font-bold text-amber-600">{stats.late}</p>
              <p className="text-[10px] text-amber-700">{t('dashboard.wc.late')}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-600">{stats.onLeave}</p>
              <p className="text-[10px] text-blue-700">{t('dashboard.wc.leave')}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">{t('dashboard.wc.attendance')} {pct}%</span>
              <span className="text-gray-900 font-medium">{stats.present}/{stats.total}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

export function HRISKPIWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.hris-kpi')} module="hris" icon={<Target className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-3">
        {[
          { name: t('dashboard.wc.sales'), score: 87, color: '#10B981' },
          { name: t('dashboard.wc.serviceLabel'), score: 92, color: '#6366F1' },
          { name: t('dashboard.wc.operational'), score: 78, color: '#F59E0B' },
          { name: t('dashboard.wc.attendance'), score: 95, color: '#3B82F6' },
        ].map(k => (
          <div key={k.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">{k.name}</span>
              <span className="font-medium" style={{ color: k.color }}>{k.score}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full" style={{ width: `${k.score}%`, backgroundColor: k.color }} />
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function HRISLeaveWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.hris-leave')} module="hris" icon={<Clock className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {[
          { name: 'Ahmad Fauzi', type: t('dashboard.wc.annualLeave'), days: 3, status: 'pending' },
          { name: 'Siti Nurhaliza', type: t('dashboard.wc.sick'), days: 1, status: 'approved' },
          { name: 'Budi Santoso', type: t('dashboard.wc.annualLeave'), days: 5, status: 'pending' },
        ].map((l, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{l.name}</p>
              <p className="text-xs text-gray-500">{l.type} • {l.days} {t('dashboard.wc.days')}</p>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>{l.status === 'approved' ? t('dashboard.wc.approved') : t('dashboard.wc.pending')}</span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function HRISHeadcountWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const depts = [
    { name: t('dashboard.wc.sales'), count: 15, color: '#6366F1' },
    { name: t('dashboard.wc.operational'), count: 12, color: '#10B981' },
    { name: t('dashboard.wc.finance'), count: 8, color: '#F59E0B' },
    { name: t('dashboard.wc.hr'), count: 5, color: '#EC4899' },
    { name: 'IT', count: 6, color: '#3B82F6' },
    { name: t('dashboard.wc.marketing'), count: 4, color: '#8B5CF6' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.hris-headcount')} module="hris" icon={<Users className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="text-center mb-3">
        <p className="text-3xl font-bold text-gray-900">{depts.reduce((s, d) => s + d.count, 0)}</p>
        <p className="text-xs text-gray-500">{t('dashboard.wc.totalActiveEmployees')}</p>
      </div>
      <div className="space-y-2">
        {depts.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-600 flex-1">{d.name}</span>
            <span className="text-xs font-medium text-gray-900">{d.count}</span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// INVENTORY WIDGETS
// ═══════════════════════════════════════════════

export function InventoryLowStockWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const items = [
    { name: 'Beras Premium 5kg', stock: 8, min: 20, unit: 'sak' },
    { name: 'Minyak Goreng 2L', stock: 12, min: 30, unit: 'btl' },
    { name: 'Gula Pasir 1kg', stock: 5, min: 15, unit: 'pcs' },
    { name: 'Telur Ayam', stock: 15, min: 50, unit: 'kg' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.inventory-low-stock')} module="inventory" icon={<AlertCircle className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-red-600">{t('dashboard.wc.minStock')}: {item.min} {item.unit}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-red-600">{item.stock}</p>
              <p className="text-[10px] text-gray-500">{item.unit}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function InventoryMovementWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const days = [t('dashboard.wc.mon'), t('dashboard.wc.tue'), t('dashboard.wc.wed'), t('dashboard.wc.thu'), t('dashboard.wc.fri'), t('dashboard.wc.sat'), t('dashboard.wc.sun')];
  const inbound = [45, 52, 38, 65, 42, 58, 30];
  const outbound = [38, 48, 42, 55, 50, 62, 35];

  return (
    <WidgetWrapper title={t('dashboard.widgets.inventory-movement')} module="inventory" icon={<ArrowRightLeft className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="h-48">
        <Chart type="line" height="100%" width="100%" options={{
          chart: { toolbar: { show: false } },
          colors: ['#10B981', '#EF4444'],
          stroke: { curve: 'smooth', width: 2 },
          xaxis: { categories: days, labels: { style: { fontSize: '10px' } }, axisBorder: { show: false } },
          yaxis: { labels: { style: { fontSize: '10px' } } },
          grid: { borderColor: '#E5E7EB', strokeDashArray: 4 },
          legend: { position: 'top', fontSize: '11px' },
          dataLabels: { enabled: false },
        }} series={[{ name: t('dashboard.wc.inflow'), data: inbound }, { name: t('dashboard.wc.outflow'), data: outbound }]} />
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// SFA / CRM WIDGETS
// ═══════════════════════════════════════════════

export function SFAPipelineWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  const stages = [
    { name: t('dashboard.wc.prospect'), count: 24, value: 450, color: 'bg-blue-100 text-blue-700' },
    { name: t('dashboard.wc.qualification'), count: 18, value: 380, color: 'bg-indigo-100 text-indigo-700' },
    { name: t('dashboard.wc.proposal'), count: 12, value: 285, color: 'bg-violet-100 text-violet-700' },
    { name: t('dashboard.wc.negotiation'), count: 8, value: 195, color: 'bg-purple-100 text-purple-700' },
    { name: t('dashboard.wc.closing'), count: 5, value: 125, color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.sfa-pipeline')} module="sfa" icon={<Target className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {stages.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${s.color} min-w-[72px] text-center`}>{s.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(s.count / 24) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-700 w-6 text-right">{s.count}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
          <span className="text-gray-500">{t('dashboard.wc.totalPipelineValue')}</span>
          <span className="font-semibold text-indigo-600">{formatCurrency(1430000000)}</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export function SFATargetWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.sfa-target')} module="sfa" icon={<Award className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle cx="48" cy="48" r="40" fill="none" stroke="#6366F1" strokeWidth="8"
              strokeDasharray={`${72 * 2.51} 251`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-900">72%</span>
            <span className="text-[10px] text-gray-500">{t('dashboard.wc.achieved')}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <p className="text-sm font-bold text-indigo-600">{formatCurrency(3600000000)}</p>
          <p className="text-[10px] text-indigo-700">{t('dashboard.wc.achieved')}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-sm font-bold text-gray-600">{formatCurrency(5000000000)}</p>
          <p className="text-[10px] text-gray-500">{t('dashboard.wc.target')}</p>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export function SFAActivitiesWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.sfa-activities')} module="sfa" icon={<Navigation className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {[
          { type: t('dashboard.wc.visits'), count: 28, target: 40, color: 'bg-blue-500' },
          { type: t('dashboard.wc.meeting'), count: 12, target: 15, color: 'bg-violet-500' },
          { type: t('dashboard.wc.phone'), count: 45, target: 50, color: 'bg-emerald-500' },
          { type: t('dashboard.wc.proposal'), count: 8, target: 10, color: 'bg-amber-500' },
        ].map(a => (
          <div key={a.type}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{a.type}</span>
              <span className="font-medium text-gray-900">{a.count}/{a.target}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${a.color}`} style={{ width: `${Math.min((a.count / a.target) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// MANUFACTURING WIDGETS
// ═══════════════════════════════════════════════

export function MfgWorkOrdersWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const statuses = [
    { label: t('dashboard.wc.draft'), count: 3, color: 'bg-gray-100 text-gray-700' },
    { label: t('dashboard.wc.inProgress'), count: 8, color: 'bg-blue-100 text-blue-700' },
    { label: t('dashboard.wc.completed'), count: 15, color: 'bg-emerald-100 text-emerald-700' },
    { label: t('dashboard.wc.onHold'), count: 2, color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <WidgetWrapper title={t('dashboard.widgets.mfg-work-orders')} module="manufacturing" icon={<ClipboardList className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="grid grid-cols-2 gap-2">
        {statuses.map(s => (
          <div key={s.label} className={`p-3 rounded-lg text-center ${s.color}`}>
            <p className="text-xl font-bold">{s.count}</p>
            <p className="text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
        <span className="text-gray-500">{t('dashboard.wc.totalWOThisMonth')}</span>
        <span className="font-semibold text-gray-900">28</span>
      </div>
    </WidgetWrapper>
  );
}

export function MfgOEEWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  const oee = 78;
  const availability = 92;
  const performance = 85;
  const quality = 99;

  return (
    <WidgetWrapper title={t('dashboard.widgets.mfg-oee')} module="manufacturing" icon={<Gauge className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none"
              stroke={oee >= 85 ? '#10B981' : oee >= 65 ? '#F59E0B' : '#EF4444'}
              strokeWidth="8" strokeDasharray={`${oee * 2.01} 201`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{oee}%</span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { label: t('dashboard.wc.availability'), value: availability, color: 'bg-blue-500' },
          { label: t('dashboard.wc.performance'), value: performance, color: 'bg-violet-500' },
          { label: t('dashboard.wc.quality'), value: quality, color: 'bg-emerald-500' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 w-20">{m.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
            </div>
            <span className="font-medium w-8 text-right">{m.value}%</span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function MfgQualityWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.mfg-quality')} module="manufacturing" icon={<Shield className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="text-center mb-3">
        <p className="text-3xl font-bold text-emerald-600">99.2%</p>
        <p className="text-xs text-gray-500">{t('dashboard.wc.passRate')}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <p className="text-sm font-bold text-emerald-600">486</p>
          <p className="text-[10px] text-emerald-700">{t('dashboard.wc.pass')}</p>
        </div>
        <div className="p-2 bg-red-50 rounded-lg">
          <p className="text-sm font-bold text-red-600">4</p>
          <p className="text-[10px] text-red-700">{t('dashboard.wc.fail')}</p>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg">
          <p className="text-sm font-bold text-amber-600">2</p>
          <p className="text-[10px] text-amber-700">{t('dashboard.wc.hold')}</p>
        </div>
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// FLEET WIDGETS
// ═══════════════════════════════════════════════

export function FleetVehiclesWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.fleet-vehicles')} module="fleet" icon={<Truck className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('dashboard.wc.active'), count: 12, color: 'bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
          { label: t('dashboard.wc.maintenance'), count: 3, color: 'bg-amber-50 text-amber-700', iconColor: 'text-amber-500' },
          { label: t('dashboard.wc.standby'), count: 5, color: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-500' },
          { label: t('dashboard.wc.inactive'), count: 1, color: 'bg-red-50 text-red-700', iconColor: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className={`p-2.5 rounded-lg text-center ${s.color}`}>
            <p className="text-xl font-bold">{s.count}</p>
            <p className="text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-center text-gray-500">
        {t('dashboard.wc.totalVehicles', { count: 21 })}
      </div>
    </WidgetWrapper>
  );
}

export function FleetFuelWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t, formatCurrency } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.fleet-fuel')} module="fleet" icon={<Fuel className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="text-center mb-3">
        <p className="text-2xl font-bold text-gray-900">2,450 L</p>
        <p className="text-xs text-gray-500">{t('dashboard.wc.thisMonth')}</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.fuelCost')}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(32500000)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.avgPerVehicle')}</span>
          <span className="font-semibold text-gray-900">117 L</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.vsLastMonth')}</span>
          <span className="font-semibold text-red-600">+5.2%</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export function FleetMaintenanceWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.fleet-maintenance')} module="fleet" icon={<Wrench className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {[
          { vehicle: 'B 1234 ABC', type: t('dashboard.wc.periodicService'), dueIn: '3 ' + t('dashboard.wc.days'), urgency: 'warning' },
          { vehicle: 'B 5678 DEF', type: t('dashboard.wc.oilChange'), dueIn: '5 ' + t('dashboard.wc.days'), urgency: 'info' },
          { vehicle: 'B 9012 GHI', type: t('dashboard.wc.tireInspection'), dueIn: '1 ' + t('dashboard.wc.days'), urgency: 'critical' },
        ].map((m, i) => (
          <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${
            m.urgency === 'critical' ? 'bg-red-50 border-red-200' : m.urgency === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900">{m.vehicle}</p>
              <p className="text-xs text-gray-500">{m.type}</p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              m.urgency === 'critical' ? 'bg-red-100 text-red-700' : m.urgency === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>{m.dueIn}</span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

// ═══════════════════════════════════════════════
// MARKETING WIDGETS
// ═══════════════════════════════════════════════

export function MarketingCampaignsWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.marketing-campaigns')} module="marketing" icon={<Megaphone className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="space-y-2">
        {[
          { name: 'Promo Ramadhan', reach: 12500, conv: 3.2, status: 'active' },
          { name: 'Flash Sale Weekend', reach: 8200, conv: 5.1, status: 'active' },
          { name: 'Loyalty Reward', reach: 4500, conv: 8.7, status: 'scheduled' },
        ].map((c, i) => (
          <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-900">{c.name}</p>
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>{c.status === 'active' ? t('dashboard.wc.active') : t('dashboard.wc.scheduled')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{t('dashboard.wc.reach')}: {c.reach.toLocaleString()}</span>
              <span>{t('dashboard.wc.conv')}: {c.conv}%</span>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function MarketingEngagementWidget({ isEditMode, size }: WidgetComponentProps) {
  const { t } = useTranslation();
  return (
    <WidgetWrapper title={t('dashboard.widgets.marketing-engagement')} module="marketing" icon={<Heart className="w-4 h-4" />} size={size} isEditMode={isEditMode}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 bg-pink-50 rounded-lg text-center">
          <p className="text-xl font-bold text-pink-600">4.5K</p>
          <p className="text-[10px] text-pink-700">{t('dashboard.wc.activeUsers')}</p>
        </div>
        <div className="p-2.5 bg-violet-50 rounded-lg text-center">
          <p className="text-xl font-bold text-violet-600">82%</p>
          <p className="text-[10px] text-violet-700">{t('dashboard.wc.retention')}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.npsScore')}</span>
          <span className="font-semibold text-emerald-600">+45</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.reviewAvg')}</span>
          <span className="font-semibold text-amber-600">4.3/5</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{t('dashboard.wc.repeatOrder')}</span>
          <span className="font-semibold text-gray-900">38%</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}
