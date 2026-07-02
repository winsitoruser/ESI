import React, { useState, useEffect, useCallback } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'react-hot-toast';
import {
  BarChart3, TrendingUp, AlertTriangle, FileText, Loader2,
  DollarSign, ClipboardList, Building2, Star, Award, Package,
  CheckCircle, XCircle, Clock, Send, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Truck, Receipt, ShieldCheck, Wallet, History,
  Settings, PieChart, AlertCircle, CreditCard, Calculator, Layers,
  MoreHorizontal, ExternalLink, Banknote, Scale, Box, UserCheck
} from 'lucide-react';
import {
  TabType, Badge, StarRating, ScoreBar, GradientStatCard, MiniStatCard,
  ProgressBar, Toolbar, DataTable, DetailDrawer, CreateModal,
  FormInput, FormTextarea, FormSelect, ApprovalTimeline, AuditTrailList,
  SectionHeader, InfoRow, EmptyState, eprFetch,
  fmtShort, fD, fDT, fmt, pct, SC
} from '../../../components/procurement/shared';
import {
  rowsOr,
  MOCK_EPR_DASHBOARD,
  MOCK_EPR_VENDORS,
  MOCK_EPR_RFQS,
  MOCK_EPR_TENDERS,
  MOCK_EPR_PROC_REQUESTS,
  MOCK_EPR_CONTRACTS,
  MOCK_EPR_EVALUATIONS,
  MOCK_EPR_PURCHASE_ORDERS,
  MOCK_EPR_GOODS_RECEIPTS,
  MOCK_EPR_INVOICES,
  MOCK_EPR_APPROVALS,
  MOCK_EPR_BUDGETS,
  MOCK_EPR_AUDIT,
  MOCK_EPR_ANALYTICS,
  MOCK_EPR_SETTINGS,
} from '@/lib/hq/mock-data';

export default function EProcurementPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [pg, setPg] = useState(1);

  const [dashboard, setDashboard] = useState<any>(MOCK_EPR_DASHBOARD);
  const [vendors, setVendors] = useState<any[]>(MOCK_EPR_VENDORS);
  const [vendorTotal, setVendorTotal] = useState(MOCK_EPR_VENDORS.length);
  const [rfqs, setRfqs] = useState<any[]>(MOCK_EPR_RFQS);
  const [rfqTotal, setRfqTotal] = useState(MOCK_EPR_RFQS.length);
  const [tenders, setTenders] = useState<any[]>(MOCK_EPR_TENDERS);
  const [tenderTotal, setTenderTotal] = useState(MOCK_EPR_TENDERS.length);
  const [procRequests, setProcRequests] = useState<any[]>(MOCK_EPR_PROC_REQUESTS);
  const [prTotal, setPrTotal] = useState(MOCK_EPR_PROC_REQUESTS.length);
  const [contracts, setContracts] = useState<any[]>(MOCK_EPR_CONTRACTS);
  const [contractTotal, setContractTotal] = useState(MOCK_EPR_CONTRACTS.length);
  const [evaluations, setEvaluations] = useState<any[]>(MOCK_EPR_EVALUATIONS);
  const [evalTotal, setEvalTotal] = useState(MOCK_EPR_EVALUATIONS.length);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(MOCK_EPR_PURCHASE_ORDERS);
  const [poTotal, setPoTotal] = useState(MOCK_EPR_PURCHASE_ORDERS.length);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>(MOCK_EPR_GOODS_RECEIPTS);
  const [grnTotal, setGrnTotal] = useState(MOCK_EPR_GOODS_RECEIPTS.length);
  const [invoices, setInvoices] = useState<any[]>(MOCK_EPR_INVOICES);
  const [invoiceTotal, setInvoiceTotal] = useState(MOCK_EPR_INVOICES.length);
  const [approvals, setApprovals] = useState<any[]>(MOCK_EPR_APPROVALS);
  const [approvalTotal, setApprovalTotal] = useState(MOCK_EPR_APPROVALS.length);
  const [budgets, setBudgets] = useState<any[]>(MOCK_EPR_BUDGETS);
  const [budgetTotal, setBudgetTotal] = useState(MOCK_EPR_BUDGETS.length);
  const [auditItems, setAuditItems] = useState<any[]>(MOCK_EPR_AUDIT);
  const [analyticsData, setAnalyticsData] = useState<any>(MOCK_EPR_ANALYTICS);
  const [settingsData, setSettingsData] = useState<any[]>(MOCK_EPR_SETTINGS);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [drawer, setDrawer] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async (tab: string, p = 1) => {
    setLoading(true);
    try {
      const q: Record<string, string> = { page: String(p), limit: '20' };
      if (statusFilter !== 'all') q.status = statusFilter;
      if (search) q.search = search;
      const action = tab === 'dashboard' ? 'dashboard' : tab === 'budget' ? 'budget-allocations' : tab;
      const d = await eprFetch(action, 'GET', undefined, q);
      switch (tab) {
        case 'dashboard': setDashboard(d && Object.keys(d).length ? d : MOCK_EPR_DASHBOARD); break;
        case 'vendors': {
          const rows = rowsOr(d.rows, MOCK_EPR_VENDORS);
          setVendors(rows); setVendorTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'rfqs': {
          const rows = rowsOr(d.rows, MOCK_EPR_RFQS);
          setRfqs(rows); setRfqTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'tenders': {
          const rows = rowsOr(d.rows, MOCK_EPR_TENDERS);
          setTenders(rows); setTenderTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'procurement-requests': {
          const rows = rowsOr(d.rows, MOCK_EPR_PROC_REQUESTS);
          setProcRequests(rows); setPrTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'contracts': {
          const rows = rowsOr(d.rows, MOCK_EPR_CONTRACTS);
          setContracts(rows); setContractTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'evaluations': {
          const rows = rowsOr(d.rows, MOCK_EPR_EVALUATIONS);
          setEvaluations(rows); setEvalTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'purchase-orders': {
          const rows = rowsOr(d.rows, MOCK_EPR_PURCHASE_ORDERS);
          setPurchaseOrders(rows); setPoTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'goods-receipts': {
          const rows = rowsOr(d.rows, MOCK_EPR_GOODS_RECEIPTS);
          setGoodsReceipts(rows); setGrnTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'invoices': {
          const rows = rowsOr(d.rows, MOCK_EPR_INVOICES);
          setInvoices(rows); setInvoiceTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'approvals': {
          const rows = rowsOr(d.rows, MOCK_EPR_APPROVALS);
          setApprovals(rows); setApprovalTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'budget': {
          const rows = rowsOr(d.rows, MOCK_EPR_BUDGETS);
          setBudgets(rows); setBudgetTotal(d.total && d.total > 0 ? d.total : rows.length);
          break;
        }
        case 'audit-trail': setAuditItems(rowsOr(d.rows, MOCK_EPR_AUDIT)); break;
        case 'analytics': setAnalyticsData(d && Object.keys(d).length ? d : MOCK_EPR_ANALYTICS); break;
        case 'settings': {
          const raw = Array.isArray(d) ? d : d?.rows || [];
          setSettingsData(rowsOr(raw, MOCK_EPR_SETTINGS));
          break;
        }
      }
    } catch (e: any) { console.error(`[EPR] ${tab}:`, e.message); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { if (mounted) { setPg(1); fetchData(activeTab, 1); } }, [mounted, activeTab, fetchData]);

  const refresh = () => fetchData(activeTab, pg);
  const goPage = (p: number) => { setPg(p); fetchData(activeTab, p); };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const action = activeTab === 'budget' ? 'budget-allocations' : activeTab;
      await eprFetch(action, 'POST', form);
      toast.success('Berhasil dibuat!'); setShowCreate(false); setForm({}); refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row: any) => {
    if (!confirm('Yakin ingin menghapus?')) return;
    try {
      const action = activeTab === 'budget' ? 'budget-allocations' : activeTab;
      await eprFetch(action, 'DELETE', undefined, { id: row.id });
      toast.success('Dihapus'); refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const openDetail = async (type: string, id: string) => {
    try {
      const map: Record<string, string> = { 'purchase-orders': 'po-detail', 'goods-receipts': 'grn-detail', invoices: 'invoice-detail' };
      const d = await eprFetch(map[type] || type, 'GET', undefined, { id });
      setDrawer({ type, data: d });
    } catch { toast.error('Gagal memuat detail'); }
  };

  if (!mounted) return null;

  const tabs: { id: TabType; name: string; icon: any }[] = [
    { id: 'dashboard', name: t('eProcurement.tabDashboard'), icon: BarChart3 },
    { id: 'vendors', name: t('eProcurement.tabVendors'), icon: Building2 },
    { id: 'procurement-requests', name: t('eProcurement.tabPR'), icon: ClipboardList },
    { id: 'rfqs', name: 'RFQ', icon: Send },
    { id: 'tenders', name: 'Tender', icon: Award },
    { id: 'purchase-orders', name: 'Purchase Order', icon: ShoppingCart },
    { id: 'goods-receipts', name: 'Goods Receipt', icon: Truck },
    { id: 'invoices', name: 'Invoice', icon: Receipt },
    { id: 'contracts', name: t('eProcurement.tabContracts'), icon: FileText },
    { id: 'evaluations', name: t('eProcurement.tabEvaluations'), icon: Star },
    { id: 'approvals', name: 'Approval', icon: ShieldCheck },
    { id: 'budget', name: 'Budget', icon: Wallet },
    { id: 'analytics', name: t('eProcurement.tabAnalytics'), icon: PieChart },
    { id: 'audit-trail', name: 'Audit Trail', icon: History },
    { id: 'settings', name: t('eProcurement.tabSettings'), icon: Settings },
  ];

  const tbProps = { search, setSearch, statusFilter, setStatusFilter, onRefresh: refresh, onCreateClick: () => { setForm({}); setShowCreate(true); }, loading };

  return (
    <HQLayout title={t('eProcurement.title')} subtitle={t('eProcurement.subtitle')}>
      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex overflow-x-auto px-4 gap-1 scrollbar-hide">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setStatusFilter('all'); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 relative ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'}`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading && activeTab !== 'dashboard' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
            <p className="text-sm font-medium text-gray-600">{t('eProcurement.loadingData')}</p>
          </div>
        ) : (<>

          {/* ===== DASHBOARD ===== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <GradientStatCard title="Vendor Aktif" value={dashboard.vendorStats?.active || 0} sub={`dari ${dashboard.vendorStats?.total || 0} vendor`} icon={Building2} gradient="blue" />
                <GradientStatCard title="RFQ Aktif" value={dashboard.rfqStats?.published || 0} sub={`${dashboard.rfqStats?.awarded || 0} dimenangkan`} icon={Send} gradient="indigo" />
                <GradientStatCard title="Tender Berjalan" value={dashboard.tenderStats?.ongoing || 0} sub={`${dashboard.tenderStats?.awarded || 0} awarded`} icon={Award} gradient="purple" />
                <GradientStatCard title="Kontrak Aktif" value={dashboard.contractStats?.active || 0} sub={`${dashboard.contractStats?.expiring_soon || 0} segera berakhir`} icon={FileText} gradient="green" />
                <GradientStatCard title="PR Pending" value={dashboard.prStats?.pending_approval || 0} sub={fmtShort(Number(dashboard.prStats?.total_budget || 0))} icon={ClipboardList} gradient="orange" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniStatCard icon={ShoppingCart} label="Purchase Order" value={`${dashboard.poStats?.approved || 0} aktif`} color="bg-blue-50 text-blue-600" />
                <MiniStatCard icon={Truck} label="Goods Receipt" value={`${dashboard.grnStats?.confirmed || 0} dikonfirmasi`} color="bg-emerald-50 text-emerald-600" />
                <MiniStatCard icon={Receipt} label="Invoice Outstanding" value={fmtShort(Number(dashboard.invoiceStats?.outstanding || 0))} color="bg-amber-50 text-amber-600" />
                <MiniStatCard icon={ShieldCheck} label="Pending Approval" value={`${(dashboard.pendingApprovals || []).reduce((s: number, a: any) => s + Number(a.count || 0), 0)} item`} color="bg-rose-50 text-rose-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><DollarSign className="w-6 h-6 text-blue-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Total Nilai Kontrak</p><p className="text-lg font-bold text-gray-900">{fmtShort(Number(dashboard.contractStats?.total_value || 0))}</p></div>
                </div>
                <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Total Belanja Vendor</p><p className="text-lg font-bold text-gray-900">{fmtShort(Number(dashboard.vendorStats?.total_spend || 0))}</p></div>
                </div>
                <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Star className="w-6 h-6 text-amber-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Rata-rata Rating</p><p className="text-lg font-bold text-gray-900">{Number(dashboard.vendorStats?.avg_rating || 0).toFixed(2)} / 5.00</p></div>
                </div>
                <div className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-indigo-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Total Nilai PO</p><p className="text-lg font-bold text-gray-900">{fmtShort(Number(dashboard.poStats?.total_value || 0))}</p></div>
                </div>
              </div>
              {/* Top Vendors */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Award className="w-4 h-4 text-blue-600" /></div><h3 className="font-semibold text-gray-900">Vendor Terbaik</h3></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50/50"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th><th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th><th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Spend</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {(dashboard.topVendors || []).map((v: any, i: number) => (
                      <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span></td>
                        <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{(v.name || '').substring(0, 2).toUpperCase()}</div><div><p className="font-semibold text-gray-900">{v.name}</p><p className="text-xs text-gray-400">{v.vendor_code}</p></div></div></td>
                        <td className="px-5 py-3"><StarRating rating={Number(v.rating || 0)} /></td>
                        <td className="px-5 py-3 text-right font-semibold">{fmtShort(Number(v.total_spend || 0))}</td>
                      </tr>
                    ))}
                    {(dashboard.topVendors || []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada vendor</td></tr>}
                  </tbody>
                </table></div>
              </div>
              {/* Alerts */}
              {Number(dashboard.contractStats?.expiring_soon || 0) > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                  <div><p className="font-semibold text-amber-800">Kontrak Segera Berakhir</p><p className="text-sm text-amber-700 mt-0.5">{dashboard.contractStats.expiring_soon} kontrak akan berakhir dalam 30 hari ke depan.</p></div>
                </div>
              )}
            </div>
          )}

          {/* ===== VENDORS ===== */}
          {activeTab === 'vendors' && (<div className="space-y-4">
            <Toolbar placeholder="Cari vendor..." statuses={[{v:'active',l:'Aktif'},{v:'inactive',l:'Nonaktif'},{v:'blacklisted',l:'Blacklist'},{v:'pending_approval',l:'Pending'}]} createLabel="Tambah Vendor" {...tbProps} />
            <DataTable columns={[
              { key: 'vendor_code', label: 'Kode', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'name', label: 'Vendor', render: (v: any, r: any) => (<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{(v || '').substring(0, 2).toUpperCase()}</div><div><p className="font-semibold text-gray-900">{v}</p><p className="text-xs text-gray-400">{r.vendor_type} | {r.city || '-'}</p></div></div>) },
              { key: 'category', label: 'Kategori', render: (v: any) => v ? <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{v}</span> : '-' },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'rating', label: 'Rating', render: (v: any) => <StarRating rating={Number(v || 0)} /> },
              { key: 'total_orders', label: 'Order', render: (v: any) => <span className="font-medium">{v || 0}</span> },
              { key: 'total_spend', label: 'Total Spend', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
            ]} data={vendors} total={vendorTotal} page={pg} onPageChange={goPage} onView={(r: any) => openDetail('vendors', r.id)} onDelete={handleDelete} />
          </div>)}

          {/* ===== PROCUREMENT REQUESTS ===== */}
          {activeTab === 'procurement-requests' && (<div className="space-y-4">
            <Toolbar placeholder="Cari permintaan..." statuses={[{v:'draft',l:'Draft'},{v:'submitted',l:'Diajukan'},{v:'approved',l:'Disetujui'},{v:'rejected',l:'Ditolak'},{v:'in_process',l:'Proses'},{v:'fulfilled',l:'Terpenuhi'}]} createLabel="Buat PR" {...tbProps} />
            <DataTable columns={[
              { key: 'request_number', label: 'No. PR', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'title', label: 'Judul', render: (v: any, r: any) => <div><p className="font-semibold text-gray-900">{v}</p><p className="text-xs text-gray-400">{r.department || '-'}</p></div> },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'priority', label: 'Prioritas', render: (v: any) => <Badge value={v} /> },
              { key: 'estimated_budget', label: 'Est. Budget', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'needed_date', label: 'Dibutuhkan', render: (v: any) => fD(v) },
              { key: 'requested_by_name', label: 'Peminta', render: (v: any) => v || '-' },
            ]} data={procRequests} total={prTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== RFQ ===== */}
          {activeTab === 'rfqs' && (<div className="space-y-4">
            <Toolbar placeholder="Cari RFQ..." statuses={[{v:'draft',l:'Draft'},{v:'published',l:'Published'},{v:'closed',l:'Closed'},{v:'awarded',l:'Awarded'}]} createLabel="Buat RFQ" {...tbProps} />
            <DataTable columns={[
              { key: 'rfq_number', label: 'No. RFQ', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'title', label: 'Judul', render: (v: any) => <span className="font-semibold text-gray-900">{v}</span> },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'priority', label: 'Prioritas', render: (v: any) => <Badge value={v} /> },
              { key: 'estimated_budget', label: 'Est. Budget', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'closing_date', label: 'Batas Waktu', render: (v: any) => fD(v) },
              { key: 'total_responses', label: 'Respons', render: (v: any) => v || 0 },
            ]} data={rfqs} total={rfqTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== TENDERS ===== */}
          {activeTab === 'tenders' && (<div className="space-y-4">
            <Toolbar placeholder="Cari tender..." statuses={[{v:'draft',l:'Draft'},{v:'announcement',l:'Pengumuman'},{v:'submission',l:'Penawaran'},{v:'evaluation',l:'Evaluasi'},{v:'awarded',l:'Awarded'}]} createLabel="Buat Tender" {...tbProps} />
            <DataTable columns={[
              { key: 'tender_number', label: 'No. Tender', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'title', label: 'Judul', render: (v: any) => <span className="font-semibold text-gray-900">{v}</span> },
              { key: 'tender_type', label: 'Tipe', render: (v: any) => <span className="capitalize px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{v}</span> },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'estimated_value', label: 'Est. Nilai', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'submission_deadline', label: 'Batas', render: (v: any) => fD(v) },
              { key: 'winner_name', label: 'Pemenang', render: (v: any) => v ? <span className="text-emerald-600 font-medium">{v}</span> : '-' },
            ]} data={tenders} total={tenderTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== PURCHASE ORDERS ===== */}
          {activeTab === 'purchase-orders' && (<div className="space-y-4">
            <Toolbar placeholder="Cari PO..." statuses={[{v:'draft',l:'Draft'},{v:'approved',l:'Approved'},{v:'sent',l:'Terkirim'},{v:'partial_received',l:'Partial'},{v:'completed',l:'Selesai'},{v:'cancelled',l:'Batal'}]} createLabel="Buat PO" {...tbProps} />
            <DataTable columns={[
              { key: 'po_number', label: 'No. PO', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'title', label: 'Judul', render: (v: any, r: any) => <div><p className="font-semibold text-gray-900">{v}</p><p className="text-xs text-gray-400">{r.vendor_name || '-'}</p></div> },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'priority', label: 'Prioritas', render: (v: any) => <Badge value={v} /> },
              { key: 'total_amount', label: 'Total', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'order_date', label: 'Tgl Order', render: (v: any) => fD(v) },
              { key: 'expected_delivery', label: 'Est. Terima', render: (v: any) => fD(v) },
              { key: 'received_percent', label: 'Penerimaan', render: (v: any) => <ProgressBar value={Number(v || 0)} max={100} color="bg-emerald-500" /> },
              { key: 'approval_status', label: 'Approval', render: (v: any) => <Badge value={v || 'pending'} /> },
            ]} data={purchaseOrders} total={poTotal} page={pg} onPageChange={goPage} onView={(r: any) => openDetail('purchase-orders', r.id)} onDelete={handleDelete} />
          </div>)}

          {/* ===== GOODS RECEIPTS ===== */}
          {activeTab === 'goods-receipts' && (<div className="space-y-4">
            <Toolbar placeholder="Cari GRN..." statuses={[{v:'draft',l:'Draft'},{v:'confirmed',l:'Dikonfirmasi'},{v:'rejected',l:'Ditolak'}]} createLabel="Buat GRN" {...tbProps} />
            <DataTable columns={[
              { key: 'grn_number', label: 'No. GRN', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'po_number', label: 'No. PO', render: (v: any) => <span className="font-mono text-xs text-blue-500">{v || '-'}</span> },
              { key: 'vendor_name', label: 'Vendor', render: (v: any) => v || '-' },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'receipt_date', label: 'Tgl Terima', render: (v: any) => fD(v) },
              { key: 'inspection_status', label: 'Inspeksi', render: (v: any) => <Badge value={v || 'pending'} /> },
              { key: 'received_by_name', label: 'Diterima Oleh', render: (v: any) => v || '-' },
            ]} data={goodsReceipts} total={grnTotal} page={pg} onPageChange={goPage} onView={(r: any) => openDetail('goods-receipts', r.id)} onDelete={handleDelete} />
          </div>)}

          {/* ===== INVOICES ===== */}
          {activeTab === 'invoices' && (<div className="space-y-4">
            <Toolbar placeholder="Cari invoice..." statuses={[{v:'draft',l:'Draft'},{v:'submitted',l:'Diajukan'},{v:'approved',l:'Approved'},{v:'paid',l:'Dibayar'},{v:'overdue',l:'Overdue'}]} createLabel="Buat Invoice" {...tbProps} />
            <DataTable columns={[
              { key: 'invoice_number', label: 'No. Invoice', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'vendor_name', label: 'Vendor', render: (v: any) => v || '-' },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'total_amount', label: 'Total', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'paid_amount', label: 'Dibayar', render: (v: any) => <span className="text-emerald-600">{fmtShort(Number(v || 0))}</span> },
              { key: 'due_date', label: 'Jatuh Tempo', render: (v: any) => { const od = v && new Date(v) < new Date(); return <span className={od ? 'text-red-600 font-semibold' : ''}>{fD(v)}</span>; }},
              { key: 'match_status', label: '3-Way Match', render: (v: any) => <Badge value={v || 'unmatched'} /> },
              { key: 'po_number', label: 'PO Ref', render: (v: any) => <span className="font-mono text-xs text-blue-500">{v || '-'}</span> },
            ]} data={invoices} total={invoiceTotal} page={pg} onPageChange={goPage} onView={(r: any) => openDetail('invoices', r.id)} onDelete={handleDelete} />
          </div>)}

          {/* ===== CONTRACTS ===== */}
          {activeTab === 'contracts' && (<div className="space-y-4">
            <Toolbar placeholder="Cari kontrak..." statuses={[{v:'draft',l:'Draft'},{v:'active',l:'Aktif'},{v:'expired',l:'Expired'},{v:'terminated',l:'Terminated'}]} createLabel="Buat Kontrak" {...tbProps} />
            <DataTable columns={[
              { key: 'contract_number', label: 'No. Kontrak', render: (v: any) => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'title', label: 'Judul', render: (v: any, r: any) => <div><p className="font-semibold text-gray-900">{v}</p><p className="text-xs text-gray-400">{r.vendor_name}</p></div> },
              { key: 'contract_type', label: 'Tipe', render: (v: any) => <span className="capitalize px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{v}</span> },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'total_value', label: 'Nilai', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'start_date', label: 'Periode', render: (v: any, r: any) => <span className="text-xs">{fD(v)} - {fD(r.end_date)}</span> },
              { key: 'auto_renew', label: 'Auto Renew', render: (v: any) => v ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" /> },
            ]} data={contracts} total={contractTotal} page={pg} onPageChange={goPage} onView={(r: any) => openDetail('contracts', r.id)} onDelete={handleDelete} />
          </div>)}

          {/* ===== EVALUATIONS ===== */}
          {activeTab === 'evaluations' && (<div className="space-y-4">
            <Toolbar placeholder="Cari evaluasi..." statuses={[]} createLabel="Evaluasi Baru" {...tbProps} />
            <DataTable columns={[
              { key: 'vendor_name', label: 'Vendor', render: (v: any) => <span className="font-semibold text-gray-900">{v}</span> },
              { key: 'evaluation_period', label: 'Periode', render: (v: any) => v || '-' },
              { key: 'quality_score', label: 'Kualitas', render: (v: any) => <ScoreBar label="" score={Number(v || 0)} color="bg-blue-500" /> },
              { key: 'delivery_score', label: 'Pengiriman', render: (v: any) => <ScoreBar label="" score={Number(v || 0)} color="bg-emerald-500" /> },
              { key: 'overall_score', label: 'Skor', render: (v: any) => <span className="text-lg font-bold text-blue-600">{Number(v || 0).toFixed(1)}</span> },
              { key: 'grade', label: 'Nilai', render: (v: any) => { const gc: Record<string,string> = {A:'bg-emerald-100 text-emerald-700',B:'bg-blue-100 text-blue-700',C:'bg-amber-100 text-amber-700',D:'bg-orange-100 text-orange-700',F:'bg-red-100 text-red-700'}; return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${gc[v] || 'bg-gray-100'}`}>{v}</span>; }},
            ]} data={evaluations} total={evalTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== APPROVALS ===== */}
          {activeTab === 'approvals' && (<div className="space-y-4">
            <Toolbar placeholder="Cari approval..." statuses={[{v:'pending',l:'Pending'},{v:'approved',l:'Approved'},{v:'rejected',l:'Rejected'}]} createLabel="Buat Approval" {...tbProps} />
            <DataTable columns={[
              { key: 'entity_number', label: 'Dokumen', render: (v: any) => <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v || '-'}</span> },
              { key: 'entity_type', label: 'Tipe', render: (v: any) => <span className="capitalize px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{(v || '').replace(/_/g, ' ')}</span> },
              { key: 'step', label: 'Step', render: (v: any, r: any) => `${v}/${r.total_steps}` },
              { key: 'approver_name', label: 'Approver', render: (v: any) => v || '-' },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
              { key: 'amount', label: 'Nilai', render: (v: any) => <span className="font-semibold">{fmtShort(Number(v || 0))}</span> },
              { key: 'decided_at', label: 'Diputuskan', render: (v: any) => fDT(v) },
            ]} data={approvals} total={approvalTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== BUDGET ===== */}
          {activeTab === 'budget' && (<div className="space-y-4">
            <Toolbar placeholder="Cari budget..." statuses={[{v:'active',l:'Aktif'},{v:'closed',l:'Ditutup'}]} createLabel="Alokasi Budget" {...tbProps} />
            <DataTable columns={[
              { key: 'budget_code', label: 'Kode', render: (v: any) => <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{v}</span> },
              { key: 'department', label: 'Dept', render: (v: any) => <span className="font-semibold">{v}</span> },
              { key: 'fiscal_year', label: 'Tahun', render: (v: any) => v },
              { key: 'allocated_amount', label: 'Alokasi', render: (v: any) => <span className="font-semibold text-blue-600">{fmtShort(Number(v || 0))}</span> },
              { key: 'spent_amount', label: 'Terpakai', render: (v: any) => <span className="text-red-600">{fmtShort(Number(v || 0))}</span> },
              { key: 'remaining_amount', label: 'Sisa', render: (v: any, r: any) => (<div><span className="font-semibold text-emerald-600">{fmtShort(Number(v || 0))}</span><ProgressBar value={Number(r.spent_amount || 0)} max={Number(r.allocated_amount || 1)} color={Number(r.spent_amount || 0) > Number(r.allocated_amount || 0) * 0.9 ? 'bg-red-500' : 'bg-emerald-500'} /></div>) },
              { key: 'status', label: 'Status', render: (v: any) => <Badge value={v} /> },
            ]} data={budgets} total={budgetTotal} page={pg} onPageChange={goPage} onDelete={handleDelete} />
          </div>)}

          {/* ===== ANALYTICS ===== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <SectionHeader icon={PieChart} title="Analitik Procurement" subtitle="Ringkasan data pengadaan, performa vendor & tren keuangan" color="from-blue-500 to-indigo-600" />
              {analyticsData && (<>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MiniStatCard icon={Truck} label="On-Time Delivery" value={`${analyticsData.deliveryPerformance?.on_time || 0}/${analyticsData.deliveryPerformance?.total_delivered || 0}`} color="bg-emerald-50 text-emerald-600" />
                  <MiniStatCard icon={Receipt} label="Outstanding Invoice" value={fmtShort(Number(analyticsData.invoiceAging?.total_outstanding || 0))} color="bg-amber-50 text-amber-600" />
                  <MiniStatCard icon={AlertCircle} label="Overdue >30d" value={analyticsData.invoiceAging?.overdue_30 || 0} color="bg-red-50 text-red-600" />
                  <MiniStatCard icon={Scale} label="Overdue >60d" value={Number(analyticsData.invoiceAging?.overdue_60 || 0) + Number(analyticsData.invoiceAging?.overdue_90_plus || 0)} color="bg-rose-50 text-rose-600" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Spend by Category */}
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white"><h4 className="font-semibold text-gray-900">Spend per Kategori</h4></div>
                    <div className="p-5 space-y-4">
                      {(analyticsData.spendByCategory || []).length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>}
                      {(analyticsData.spendByCategory || []).map((s: any, i: number) => {
                        const mx = Math.max(...(analyticsData.spendByCategory || []).map((x: any) => Number(x.spend || 0)), 1);
                        const p = (Number(s.spend || 0) / mx) * 100;
                        const colors = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500'];
                        return (<div key={s.category || i}><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} /><span className="text-sm font-medium text-gray-700">{s.category || 'Lainnya'}</span></div><span className="text-sm font-bold text-gray-900">{fmtShort(Number(s.spend || 0))}</span></div><div className="bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`} style={{width:`${p}%`}} /></div></div>);
                      })}
                    </div>
                  </div>
                  {/* Top Vendors by Spend */}
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white"><h4 className="font-semibold text-gray-900">Top Vendor (Spend)</h4></div>
                    <div className="p-5 space-y-3">
                      {(analyticsData.topVendorsBySpend || []).length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>}
                      {(analyticsData.topVendorsBySpend || []).map((v: any, i: number) => (
                        <div key={v.vendor_name || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{v.vendor_name}</p><p className="text-xs text-gray-400">{v.po_count} PO</p></div>
                          <span className="text-sm font-bold">{fmtShort(Number(v.total_spend || 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Monthly Spend */}
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden lg:col-span-2">
                    <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-white"><h4 className="font-semibold text-gray-900">Tren Pengeluaran Bulanan</h4></div>
                    <div className="p-5">
                      {(analyticsData.monthlySpend || []).length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada data</p>}
                      {(analyticsData.monthlySpend || []).length > 0 && (
                        <div className="flex items-end gap-2 h-48">
                          {(analyticsData.monthlySpend || []).slice().reverse().map((m: any) => {
                            const mx = Math.max(...(analyticsData.monthlySpend || []).map((x: any) => Number(x.value || 0)), 1);
                            const p = Math.max((Number(m.value || 0) / mx) * 100, 4);
                            return (<div key={m.month} className="flex-1 flex flex-col items-center gap-1 group"><div className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{fmtShort(Number(m.value || 0))}</div><div className="w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-indigo-500 cursor-pointer" style={{height:`${p}%`}} /><span className="text-[10px] text-gray-400 font-medium">{(m.month || '').slice(5)}</span></div>);
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>)}
            </div>
          )}

          {/* ===== AUDIT TRAIL ===== */}
          {activeTab === 'audit-trail' && (<div className="space-y-4">
            <SectionHeader icon={History} title="Audit Trail" subtitle="Riwayat seluruh aktivitas procurement" color="from-slate-500 to-slate-700" />
            <AuditTrailList items={auditItems} />
          </div>)}

          {/* ===== SETTINGS ===== */}
          {activeTab === 'settings' && (<div className="space-y-6">
            <SectionHeader icon={Settings} title="Pengaturan Procurement" subtitle="Konfigurasi sistem e-procurement" color="from-gray-600 to-gray-800" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
                <h4 className="font-semibold text-gray-900">Umum</h4>
                <div className="space-y-3">
                  {settingsData.map((s: any) => (
                    <div key={s.id || s.setting_key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div><p className="text-sm font-medium text-gray-900">{(s.setting_key || '').replace(/_/g, ' ')}</p><p className="text-xs text-gray-400">{s.description || ''}</p></div>
                      <span className="text-sm font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{s.setting_value || '-'}</span>
                    </div>
                  ))}
                  {settingsData.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada pengaturan</p>}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
                <h4 className="font-semibold text-gray-900">Workflow Approval</h4>
                <div className="space-y-3">
                  {[{t:'Purchase Order',d:'Dept Manager → Finance Manager → Director (jika > Rp 50Jt)'},{t:'Procurement Request',d:'Dept Head → Procurement Manager'},{t:'Invoice Payment',d:'AP Clerk → Finance Manager → CFO (jika > Rp 100Jt)'}].map(w => (
                    <div key={w.t} className="p-3 bg-gray-50 rounded-xl"><p className="text-sm font-medium text-gray-900">{w.t}</p><p className="text-xs text-gray-500 mt-1">{w.d}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </div>)}
        </>)}
      </div>

      {/* ===== CREATE MODAL ===== */}
      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} title={`Buat ${tabs.find(t => t.id === activeTab)?.name || ''} Baru`} onSubmit={handleCreate} saving={saving}>
        {activeTab === 'vendors' && (<>
          <FormInput label="Nama Vendor" required value={form.name || ''} onChange={(e: any) => setForm({...form, name: e.target.value})} placeholder="Masukkan nama vendor" />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Tipe" value={form.vendorType || 'supplier'} onChange={(e: any) => setForm({...form, vendorType: e.target.value})} options={[{value:'supplier',label:'Pemasok'},{value:'contractor',label:'Kontraktor'},{value:'consultant',label:'Konsultan'},{value:'distributor',label:'Distributor'}]} />
            <FormInput label="Kategori" value={form.category || ''} onChange={(e: any) => setForm({...form, category: e.target.value})} placeholder="e.g. IT" />
          </div>
          <FormTextarea label="Alamat" rows={2} value={form.address || ''} onChange={(e: any) => setForm({...form, address: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Kota" value={form.city || ''} onChange={(e: any) => setForm({...form, city: e.target.value})} />
            <FormInput label="Telepon" value={form.phone || ''} onChange={(e: any) => setForm({...form, phone: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Email" value={form.email || ''} onChange={(e: any) => setForm({...form, email: e.target.value})} />
            <FormInput label="Narahubung" value={form.contactPerson || ''} onChange={(e: any) => setForm({...form, contactPerson: e.target.value})} />
          </div>
        </>)}
        {activeTab === 'procurement-requests' && (<>
          <FormInput label="Judul" required value={form.title || ''} onChange={(e: any) => setForm({...form, title: e.target.value})} />
          <FormTextarea label="Deskripsi" rows={3} value={form.description || ''} onChange={(e: any) => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Departemen" value={form.department || ''} onChange={(e: any) => setForm({...form, department: e.target.value})} />
            <FormSelect label="Prioritas" value={form.priority || 'normal'} onChange={(e: any) => setForm({...form, priority: e.target.value})} options={[{value:'low',label:'Rendah'},{value:'normal',label:'Normal'},{value:'high',label:'Tinggi'},{value:'urgent',label:'Mendesak'}]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Est. Budget" type="number" value={form.estimatedBudget || ''} onChange={(e: any) => setForm({...form, estimatedBudget: e.target.value})} />
            <FormInput label="Dibutuhkan Tgl" type="date" value={form.neededDate || ''} onChange={(e: any) => setForm({...form, neededDate: e.target.value})} />
          </div>
        </>)}
        {activeTab === 'rfqs' && (<>
          <FormInput label="Judul RFQ" required value={form.title || ''} onChange={(e: any) => setForm({...form, title: e.target.value})} />
          <FormTextarea label="Deskripsi" rows={3} value={form.description || ''} onChange={(e: any) => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Kategori" value={form.category || ''} onChange={(e: any) => setForm({...form, category: e.target.value})} />
            <FormInput label="Est. Budget" type="number" value={form.estimatedBudget || ''} onChange={(e: any) => setForm({...form, estimatedBudget: e.target.value})} />
          </div>
          <FormInput label="Batas Waktu" type="datetime-local" value={form.closingDate || ''} onChange={(e: any) => setForm({...form, closingDate: e.target.value})} />
        </>)}
        {activeTab === 'tenders' && (<>
          <FormInput label="Judul Tender" required value={form.title || ''} onChange={(e: any) => setForm({...form, title: e.target.value})} />
          <FormTextarea label="Deskripsi" rows={3} value={form.description || ''} onChange={(e: any) => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Tipe" value={form.tenderType || 'open'} onChange={(e: any) => setForm({...form, tenderType: e.target.value})} options={[{value:'open',label:'Terbuka'},{value:'selective',label:'Selektif'},{value:'direct',label:'Langsung'}]} />
            <FormInput label="Est. Nilai" type="number" value={form.estimatedValue || ''} onChange={(e: any) => setForm({...form, estimatedValue: e.target.value})} />
          </div>
          <FormInput label="Batas Penawaran" type="datetime-local" value={form.submissionDeadline || ''} onChange={(e: any) => setForm({...form, submissionDeadline: e.target.value})} />
        </>)}
        {activeTab === 'purchase-orders' && (<>
          <FormInput label="Judul PO" required value={form.title || ''} onChange={(e: any) => setForm({...form, title: e.target.value})} />
          <FormInput label="Vendor ID" required value={form.vendorId || ''} onChange={(e: any) => setForm({...form, vendorId: e.target.value})} placeholder="UUID vendor" />
          <FormInput label="Nama Vendor" value={form.vendorName || ''} onChange={(e: any) => setForm({...form, vendorName: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Prioritas" value={form.priority || 'normal'} onChange={(e: any) => setForm({...form, priority: e.target.value})} options={[{value:'low',label:'Rendah'},{value:'normal',label:'Normal'},{value:'high',label:'Tinggi'},{value:'urgent',label:'Mendesak'}]} />
            <FormInput label="Est. Delivery" type="date" value={form.expectedDelivery || ''} onChange={(e: any) => setForm({...form, expectedDelivery: e.target.value})} />
          </div>
          <FormInput label="Total Amount" type="number" value={form.totalAmount || ''} onChange={(e: any) => setForm({...form, totalAmount: e.target.value})} />
          <FormSelect label="Payment Terms" value={form.paymentTerms || 'net30'} onChange={(e: any) => setForm({...form, paymentTerms: e.target.value})} options={[{value:'net30',label:'Net 30'},{value:'net60',label:'Net 60'},{value:'net90',label:'Net 90'},{value:'cod',label:'COD'}]} />
        </>)}
        {activeTab === 'goods-receipts' && (<>
          <FormInput label="PO ID" required value={form.poId || ''} onChange={(e: any) => setForm({...form, poId: e.target.value})} placeholder="UUID PO" />
          <FormInput label="Nama Vendor" value={form.vendorName || ''} onChange={(e: any) => setForm({...form, vendorName: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Tgl Terima" type="date" value={form.receiptDate || ''} onChange={(e: any) => setForm({...form, receiptDate: e.target.value})} />
            <FormInput label="No. Surat Jalan" value={form.deliveryNoteNumber || ''} onChange={(e: any) => setForm({...form, deliveryNoteNumber: e.target.value})} />
          </div>
          <FormInput label="Diterima Oleh" value={form.receivedByName || ''} onChange={(e: any) => setForm({...form, receivedByName: e.target.value})} />
        </>)}
        {activeTab === 'invoices' && (<>
          <FormInput label="No. Invoice Vendor" value={form.vendorInvoiceNumber || ''} onChange={(e: any) => setForm({...form, vendorInvoiceNumber: e.target.value})} />
          <FormInput label="Nama Vendor" value={form.vendorName || ''} onChange={(e: any) => setForm({...form, vendorName: e.target.value})} />
          <FormInput label="PO ID (opsional)" value={form.poId || ''} onChange={(e: any) => setForm({...form, poId: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Tgl Invoice" type="date" value={form.invoiceDate || ''} onChange={(e: any) => setForm({...form, invoiceDate: e.target.value})} />
            <FormInput label="Jatuh Tempo" type="date" value={form.dueDate || ''} onChange={(e: any) => setForm({...form, dueDate: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Subtotal" type="number" value={form.subtotal || ''} onChange={(e: any) => setForm({...form, subtotal: e.target.value})} />
            <FormInput label="Pajak" type="number" value={form.taxAmount || ''} onChange={(e: any) => setForm({...form, taxAmount: e.target.value})} />
            <FormInput label="Total" type="number" value={form.totalAmount || ''} onChange={(e: any) => setForm({...form, totalAmount: e.target.value})} />
          </div>
        </>)}
        {activeTab === 'contracts' && (<>
          <FormInput label="Judul Kontrak" required value={form.title || ''} onChange={(e: any) => setForm({...form, title: e.target.value})} />
          <FormInput label="Vendor ID" required value={form.vendorId || ''} onChange={(e: any) => setForm({...form, vendorId: e.target.value})} />
          <FormInput label="Nama Vendor" value={form.vendorName || ''} onChange={(e: any) => setForm({...form, vendorName: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Tipe" value={form.contractType || 'purchase'} onChange={(e: any) => setForm({...form, contractType: e.target.value})} options={[{value:'purchase',label:'Pembelian'},{value:'service',label:'Layanan'},{value:'framework',label:'Kerangka'}]} />
            <FormInput label="Nilai" type="number" value={form.totalValue || ''} onChange={(e: any) => setForm({...form, totalValue: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Mulai" required type="date" value={form.startDate || ''} onChange={(e: any) => setForm({...form, startDate: e.target.value})} />
            <FormInput label="Berakhir" required type="date" value={form.endDate || ''} onChange={(e: any) => setForm({...form, endDate: e.target.value})} />
          </div>
        </>)}
        {activeTab === 'evaluations' && (<>
          <FormInput label="Vendor ID" required value={form.vendorId || ''} onChange={(e: any) => setForm({...form, vendorId: e.target.value})} />
          <FormInput label="Nama Vendor" value={form.vendorName || ''} onChange={(e: any) => setForm({...form, vendorName: e.target.value})} />
          <FormInput label="Periode" value={form.evaluationPeriod || ''} onChange={(e: any) => setForm({...form, evaluationPeriod: e.target.value})} placeholder="Q1-2026" />
          <div className="grid grid-cols-2 gap-4">
            {[{k:'qualityScore',l:'Kualitas'},{k:'deliveryScore',l:'Pengiriman'},{k:'priceScore',l:'Harga'},{k:'serviceScore',l:'Layanan'},{k:'complianceScore',l:'Kepatuhan'}].map(({k,l}) => (
              <FormInput key={k} label={`${l} (0-100)`} type="number" min="0" max="100" value={form[k] || ''} onChange={(e: any) => setForm({...form, [k]: parseInt(e.target.value)})} />
            ))}
          </div>
        </>)}
        {activeTab === 'budget' && (<>
          <FormInput label="Kode Budget" required value={form.budgetCode || ''} onChange={(e: any) => setForm({...form, budgetCode: e.target.value})} placeholder="BDG-IT-2026" />
          <FormInput label="Departemen" required value={form.department || ''} onChange={(e: any) => setForm({...form, department: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Tahun Fiskal" type="number" value={form.fiscalYear || new Date().getFullYear()} onChange={(e: any) => setForm({...form, fiscalYear: parseInt(e.target.value)})} />
            <FormInput label="Kategori" value={form.category || ''} onChange={(e: any) => setForm({...form, category: e.target.value})} />
          </div>
          <FormInput label="Alokasi (Rp)" type="number" required value={form.allocatedAmount || ''} onChange={(e: any) => setForm({...form, allocatedAmount: e.target.value})} />
        </>)}
      </CreateModal>

      {/* ===== DETAIL DRAWER ===== */}
      {drawer && (
        <DetailDrawer open={!!drawer} onClose={() => setDrawer(null)}
          title={drawer.data?.po_number || drawer.data?.grn_number || drawer.data?.invoice_number || drawer.data?.name || drawer.data?.title || ''}
          subtitle={drawer.data?.vendor_name || drawer.data?.title || ''}
          badge={drawer.data?.status} width="max-w-3xl">
          {/* PO Detail */}
          {drawer.type === 'purchase-orders' && (<div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow label="Vendor" value={drawer.data.vendor_name} />
              <InfoRow label="Prioritas" value={<Badge value={drawer.data.priority} />} />
              <InfoRow label="Tgl Order" value={fD(drawer.data.order_date)} />
              <InfoRow label="Est. Terima" value={fD(drawer.data.expected_delivery)} />
              <InfoRow label="Total" value={fmt(Number(drawer.data.total_amount || 0))} />
              <InfoRow label="Approval" value={<Badge value={drawer.data.approval_status || 'pending'} />} />
              <InfoRow label="Payment Terms" value={drawer.data.payment_terms} />
              <InfoRow label="Departemen" value={drawer.data.department} />
            </div>
            {drawer.data.items?.length > 0 && (<div><h4 className="font-semibold text-gray-900 mb-3">Item PO ({drawer.data.items.length})</h4>
              <div className="bg-gray-50 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-100"><th className="px-3 py-2 text-left text-xs font-semibold">#</th><th className="px-3 py-2 text-left text-xs font-semibold">Produk</th><th className="px-3 py-2 text-right text-xs font-semibold">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold">Harga</th><th className="px-3 py-2 text-right text-xs font-semibold">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-200">{drawer.data.items.map((it: any) => (<tr key={it.id}><td className="px-3 py-2">{it.line_number}</td><td className="px-3 py-2 font-medium">{it.product_name}</td><td className="px-3 py-2 text-right">{it.quantity} {it.uom}</td><td className="px-3 py-2 text-right">{fmt(Number(it.unit_price || 0))}</td><td className="px-3 py-2 text-right font-semibold">{fmt(Number(it.line_total || 0))}</td></tr>))}</tbody></table></div>
            </div>)}
            {drawer.data.approvals?.length > 0 && (<div><h4 className="font-semibold text-gray-900 mb-3">Approval Flow</h4><ApprovalTimeline steps={drawer.data.approvals} /></div>)}
            {drawer.data.audit?.length > 0 && (<div><h4 className="font-semibold text-gray-900 mb-3">Audit Trail</h4><AuditTrailList items={drawer.data.audit} /></div>)}
          </div>)}
          {/* Invoice Detail */}
          {drawer.type === 'invoices' && (<div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow label="Vendor" value={drawer.data.vendor_name} />
              <InfoRow label="No. Vendor" value={drawer.data.vendor_invoice_number} />
              <InfoRow label="PO Ref" value={drawer.data.po_number} />
              <InfoRow label="Tgl Invoice" value={fD(drawer.data.invoice_date)} />
              <InfoRow label="Jatuh Tempo" value={fD(drawer.data.due_date)} />
              <InfoRow label="Total" value={fmt(Number(drawer.data.total_amount || 0))} />
              <InfoRow label="Dibayar" value={fmt(Number(drawer.data.paid_amount || 0))} />
              <InfoRow label="3-Way Match" value={<Badge value={drawer.data.match_status || 'unmatched'} />} />
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-3">3-Way Matching</h4>
              <div className="grid grid-cols-3 gap-3">
                {[{icon:ShoppingCart,match:drawer.data.po_match,label:'PO'},{icon:Truck,match:drawer.data.grn_match,label:'GRN'},{icon:Receipt,match:drawer.data.match_status==='matched',label:'Invoice'}].map(m => (
                  <div key={m.label} className={`p-3 rounded-lg text-center ${m.match ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-100 border border-gray-200'}`}>
                    <m.icon className={`w-5 h-5 mx-auto ${m.match ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <p className="text-xs font-medium mt-1">{m.label} {m.match ? 'Matched' : 'Unmatched'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>)}
          {/* GRN Detail */}
          {drawer.type === 'goods-receipts' && (<div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow label="No. PO" value={drawer.data.po_number} />
              <InfoRow label="Vendor" value={drawer.data.vendor_name} />
              <InfoRow label="Tgl Terima" value={fD(drawer.data.receipt_date)} />
              <InfoRow label="No. Surat Jalan" value={drawer.data.delivery_note_number} />
              <InfoRow label="Inspeksi" value={<Badge value={drawer.data.inspection_status || 'pending'} />} />
              <InfoRow label="Diterima Oleh" value={drawer.data.received_by_name} />
            </div>
            {drawer.data.items?.length > 0 && (<div><h4 className="font-semibold text-gray-900 mb-3">Item Diterima ({drawer.data.items.length})</h4>
              {drawer.data.items.map((it: any, i: number) => (
                <div key={it.id || i} className="p-3 bg-gray-50 rounded-xl mb-2 flex justify-between">
                  <div><p className="text-sm font-medium">{it.product_name || `Item ${i + 1}`}</p><p className="text-xs text-gray-400">{it.uom}</p></div>
                  <div className="text-right"><p className="text-sm font-medium">Diterima: {it.received_quantity} / {it.ordered_quantity}</p>{Number(it.rejected_quantity) > 0 && <p className="text-xs text-red-500">Ditolak: {it.rejected_quantity}</p>}</div>
                </div>
              ))}
            </div>)}
          </div>)}
          {/* Generic Detail for vendors/contracts/rfqs/tenders */}
          {['vendors','contracts','rfqs','tenders'].includes(drawer.type) && (<div className="space-y-4">
            {Object.entries(drawer.data || {}).filter(([k,v]) => typeof v !== 'object' && !k.endsWith('_id') && k !== 'id').map(([k,v]) => (
              <InfoRow key={k} label={k.replace(/_/g, ' ')} value={String(v ?? '-')} />
            ))}
          </div>)}
        </DetailDrawer>
      )}
    </HQLayout>
  );
}
