import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import HQLayout from '@/components/hq/HQLayout';
import { MapPin, ShoppingCart, Eye, Swords, ClipboardList, CheckCircle, Navigation, DollarSign, Plus, RefreshCw, ChevronRight, AlertTriangle, TrendingUp, Users, Calendar, Search, Filter, BarChart3, Star, Shield, X } from 'lucide-react';
import { rowsOr, MOCK_SFA_ADVANCED } from '@/lib/hq/mock-data';

type Tab = 'overview' | 'coverage' | 'field-orders' | 'merchandising' | 'competitor' | 'survey' | 'approvals' | 'geofence' | 'commission';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'coverage', label: 'Coverage Plan', icon: MapPin },
  { id: 'field-orders', label: 'Field Order', icon: ShoppingCart },
  { id: 'merchandising', label: 'Merchandising', icon: Eye },
  { id: 'competitor', label: 'Kompetitor', icon: Swords },
  { id: 'survey', label: 'Survey', icon: ClipboardList },
  { id: 'approvals', label: 'Approval', icon: CheckCircle },
  { id: 'geofence', label: 'Geofence', icon: Navigation },
  { id: 'commission', label: 'Komisi Produk', icon: DollarSign },
];

const api = async (action: string, method = 'GET', body?: any) => {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/hq/sfa/advanced?action=${action}`, opts);
  return r.json();
};

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const fmtCur = (n: number) => `Rp ${fmt(n)}`;
const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) => {
  const colors: any = { blue: 'bg-blue-100 text-blue-800', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800', gray: 'bg-gray-100 text-gray-800', purple: 'bg-purple-100 text-purple-800', orange: 'bg-orange-100 text-orange-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{children}</span>;
};

export default function SFAAdvancedPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<string | null>(null);

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [coveragePlans, setCoveragePlans] = useState<any[]>(MOCK_SFA_ADVANCED.coveragePlans);
  const [coverageAssignments, setCoverageAssignments] = useState<any[]>(MOCK_SFA_ADVANCED.coverageAssignments);
  const [compliance, setCompliance] = useState<any[]>(MOCK_SFA_ADVANCED.compliance);
  const [fieldOrders, setFieldOrders] = useState<any[]>(MOCK_SFA_ADVANCED.fieldOrders);
  const [displayAudits, setDisplayAudits] = useState<any[]>(MOCK_SFA_ADVANCED.displayAudits);
  const [competitors, setCompetitors] = useState<any[]>(MOCK_SFA_ADVANCED.competitors);
  const [competitorSummary, setCompetitorSummary] = useState<any[]>(MOCK_SFA_ADVANCED.competitorSummary);
  const [surveyTemplates, setSurveyTemplates] = useState<any[]>(MOCK_SFA_ADVANCED.surveyTemplates);
  const [surveyResponses, setSurveyResponses] = useState<any[]>(MOCK_SFA_ADVANCED.surveyResponses);
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>(MOCK_SFA_ADVANCED.approvalWorkflows);
  const [approvalRequests, setApprovalRequests] = useState<any[]>(MOCK_SFA_ADVANCED.approvalRequests);
  const [geofences, setGeofences] = useState<any[]>(MOCK_SFA_ADVANCED.geofences);
  const [commissions, setCommissions] = useState<any[]>(MOCK_SFA_ADVANCED.commissions);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>(MOCK_SFA_ADVANCED.inventoryProducts);

  // Form states
  const [foForm, setFoForm] = useState<any>({ customer_name: '', items: [] });
  const [compForm, setCompForm] = useState<any>({ competitor_name: '', activity_type: 'promotion', impact_level: 'medium' });
  const [gfForm, setGfForm] = useState<any>({ name: '', center_lat: '', center_lng: '', radius_meters: 200, fence_type: 'circle' });
  const [comForm, setComForm] = useState<any>({ product_name: '', commission_type: 'percentage', commission_rate: 0 });
  const [cpForm, setCpForm] = useState<any>({ code: '', name: '', customer_class: 'general', visit_frequency: 'weekly', visits_per_period: 4 });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const r = await api('advanced-dashboard');
        if (r.success) setDashboard(r.data?.summary);
      } else if (tab === 'coverage') {
        const [r1, r2, r3] = await Promise.all([api('coverage-plans'), api('coverage-assignments'), api('coverage-compliance')]);
        if (r1.success) setCoveragePlans(rowsOr(r1.data, MOCK_SFA_ADVANCED.coveragePlans));
        if (r2.success) setCoverageAssignments(rowsOr(r2.data, MOCK_SFA_ADVANCED.coverageAssignments));
        if (r3.success) setCompliance(rowsOr(r3.data, MOCK_SFA_ADVANCED.compliance));
      } else if (tab === 'field-orders') {
        const r = await api('field-orders');
        if (r.success) setFieldOrders(rowsOr(r.data, MOCK_SFA_ADVANCED.fieldOrders));
      } else if (tab === 'merchandising') {
        const r = await api('display-audits');
        if (r.success) setDisplayAudits(rowsOr(r.data, MOCK_SFA_ADVANCED.displayAudits));
      } else if (tab === 'competitor') {
        const [r1, r2] = await Promise.all([api('competitor-activities'), api('competitor-summary')]);
        if (r1.success) setCompetitors(rowsOr(r1.data, MOCK_SFA_ADVANCED.competitors));
        if (r2.success) setCompetitorSummary(rowsOr(r2.data, MOCK_SFA_ADVANCED.competitorSummary));
      } else if (tab === 'survey') {
        const [r1, r2] = await Promise.all([api('survey-templates'), api('survey-responses')]);
        if (r1.success) setSurveyTemplates(rowsOr(r1.data, MOCK_SFA_ADVANCED.surveyTemplates));
        if (r2.success) setSurveyResponses(rowsOr(r2.data, MOCK_SFA_ADVANCED.surveyResponses));
      } else if (tab === 'approvals') {
        const [r1, r2] = await Promise.all([api('approval-workflows'), api('approval-requests')]);
        if (r1.success) setApprovalWorkflows(rowsOr(r1.data, MOCK_SFA_ADVANCED.approvalWorkflows));
        if (r2.success) setApprovalRequests(rowsOr(r2.data, MOCK_SFA_ADVANCED.approvalRequests));
      } else if (tab === 'geofence') {
        const r = await api('geofences');
        if (r.success) setGeofences(rowsOr(r.data, MOCK_SFA_ADVANCED.geofences));
      } else if (tab === 'commission') {
        const [r, rp] = await Promise.all([api('product-commissions'), api('inventory-products')]);
        if (r.success) setCommissions(rowsOr(r.data, MOCK_SFA_ADVANCED.commissions));
        if (rp.success) setInventoryProducts(rowsOr(rp.data, MOCK_SFA_ADVANCED.inventoryProducts));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { if (session) fetchData(); }, [session, tab, fetchData]);

  // Handlers
  const handleApproval = async (id: string, decision: string) => {
    const reason = decision === 'rejected' ? prompt('Alasan penolakan:') : '';
    if (decision === 'rejected' && !reason) return;
    const r = await api('process-approval', 'PUT', { id, decision, reason });
    if (r.success) { showToast(`Approval ${decision}`); fetchData(); } else showToast(r.error);
  };
  const handleCreateFieldOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('create-field-order', 'POST', foForm);
    if (r.success) { showToast(`Field order dibuat: ${r.data?.order_number}`); setModal(null); fetchData(); setFoForm({ customer_name: '', items: [] }); } else showToast(r.error);
  };
  const handleCreateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('create-competitor-activity', 'POST', compForm);
    if (r.success) { showToast('Aktivitas kompetitor dilaporkan'); setModal(null); fetchData(); setCompForm({ competitor_name: '', activity_type: 'promotion', impact_level: 'medium' }); } else showToast(r.error);
  };
  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('create-geofence', 'POST', gfForm);
    if (r.success) { showToast('Geofence dibuat'); setModal(null); fetchData(); setGfForm({ name: '', center_lat: '', center_lng: '', radius_meters: 200, fence_type: 'circle' }); } else showToast(r.error);
  };
  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('create-product-commission', 'POST', comForm);
    if (r.success) { showToast('Product commission dibuat'); setModal(null); fetchData(); setComForm({ product_name: '', commission_type: 'percentage', commission_rate: 0 }); } else showToast(r.error);
  };
  const handleCreateCoveragePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('create-coverage-plan', 'POST', cpForm);
    if (r.success) { showToast('Coverage plan dibuat'); setModal(null); fetchData(); setCpForm({ code: '', name: '', customer_class: 'general', visit_frequency: 'weekly', visits_per_period: 4 }); } else showToast(r.error);
  };
  const handleUpdateFoStatus = async (id: string, status: string) => {
    const rejected_reason = status === 'rejected' ? prompt('Alasan penolakan:') : undefined;
    if (status === 'rejected' && !rejected_reason) return;
    const r = await api('update-field-order-status', 'PUT', { id, status, rejected_reason });
    if (r.success) { showToast(`Order ${status}`); fetchData(); } else showToast(r.error);
  };

  return (
    <HQLayout title="SFA Advanced">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SFA Advanced</h1>
            <p className="text-sm text-gray-500">Coverage, Field Order, Merchandising, Kompetitor, Survey, Approval, Geofence, Komisi</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b pb-px">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">{toast}</div>}

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <>
            {/* ═══ OVERVIEW ═══ */}
            {tab === 'overview' && dashboard && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Customer Coverage', value: fmt(dashboard.total_coverage || 0), icon: MapPin, color: 'blue' },
                    { label: 'Overdue Visits', value: fmt(dashboard.overdue_visits || 0), icon: AlertTriangle, color: dashboard.overdue_visits > 0 ? 'red' : 'green' },
                    { label: 'Field Orders (Bulan)', value: fmt(dashboard.field_orders_this_month || 0), icon: ShoppingCart, color: 'blue' },
                    { label: 'Revenue Field Order', value: fmtCur(dashboard.field_order_revenue || 0), icon: TrendingUp, color: 'green' },
                    { label: 'Display Audit', value: fmt(dashboard.audits_this_month || 0), icon: Eye, color: 'purple' },
                    { label: 'Avg Compliance', value: `${parseFloat(dashboard.avg_compliance || 0).toFixed(1)}%`, icon: CheckCircle, color: parseFloat(dashboard.avg_compliance || 0) >= 80 ? 'green' : 'yellow' },
                    { label: 'Laporan Kompetitor', value: fmt(dashboard.competitor_reports || 0), icon: Swords, color: 'orange' },
                    { label: 'Belum Resolved', value: fmt(dashboard.unresolved_competitors || 0), icon: AlertTriangle, color: dashboard.unresolved_competitors > 0 ? 'red' : 'green' },
                    { label: 'Survey Selesai', value: fmt(dashboard.surveys_completed || 0), icon: ClipboardList, color: 'blue' },
                    { label: 'Pending Approval', value: fmt(dashboard.pending_approvals || 0), icon: Shield, color: dashboard.pending_approvals > 0 ? 'yellow' : 'green' },
                    { label: 'Active Geofences', value: fmt(dashboard.active_geofences || 0), icon: Navigation, color: 'blue' },
                    { label: 'Komisi Produk', value: fmt(dashboard.active_commissions || 0), icon: DollarSign, color: 'green' },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color === 'red' ? 'bg-red-100' : c.color === 'green' ? 'bg-green-100' : c.color === 'yellow' ? 'bg-yellow-100' : c.color === 'purple' ? 'bg-purple-100' : c.color === 'orange' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                          <c.icon className={`w-5 h-5 ${c.color === 'red' ? 'text-red-600' : c.color === 'green' ? 'text-green-600' : c.color === 'yellow' ? 'text-yellow-600' : c.color === 'purple' ? 'text-purple-600' : c.color === 'orange' ? 'text-orange-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{c.label}</p>
                          <p className="text-lg font-bold text-gray-900">{c.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ COVERAGE ═══ */}
            {tab === 'coverage' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Coverage Plans</h2>
                  <button onClick={() => setModal('coverage-plan')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Plan</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {coveragePlans.map((cp: any) => (
                    <div key={cp.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge color={cp.customer_class === 'platinum' ? 'purple' : cp.customer_class === 'gold' ? 'yellow' : cp.customer_class === 'silver' ? 'gray' : 'orange'}>{cp.customer_class}</Badge>
                        <span className="text-xs text-gray-500">{cp.assignment_count} pelanggan</span>
                      </div>
                      <h3 className="font-semibold text-sm">{cp.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{cp.visit_frequency} · {cp.visits_per_period}x · min {cp.min_visit_duration} mnt</p>
                    </div>
                  ))}
                </div>

                {compliance.length > 0 && (
                  <>
                    <h2 className="text-lg font-semibold mt-6">Visit Compliance per FF</h2>
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Nama</th><th className="p-3 text-left">Tim</th><th className="p-3 text-right">Customer</th><th className="p-3 text-right">Planned</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Compliance</th><th className="p-3 text-right">Overdue</th></tr></thead>
                        <tbody>
                          {compliance.map((c: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="p-3 font-medium">{c.name}</td>
                              <td className="p-3 text-gray-500">{c.team_name || '-'}</td>
                              <td className="p-3 text-right">{c.total_customers}</td>
                              <td className="p-3 text-right">{c.total_planned}</td>
                              <td className="p-3 text-right">{c.total_actual}</td>
                              <td className="p-3 text-right">
                                <Badge color={parseFloat(c.compliance_pct) >= 80 ? 'green' : parseFloat(c.compliance_pct) >= 60 ? 'yellow' : 'red'}>{c.compliance_pct}%</Badge>
                              </td>
                              <td className="p-3 text-right">{parseInt(c.overdue_visits) > 0 ? <Badge color="red">{c.overdue_visits}</Badge> : <span className="text-gray-400">0</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ FIELD ORDERS ═══ */}
            {tab === 'field-orders' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Field Orders</h2>
                  <button onClick={() => setModal('field-order')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Buat Order</button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">No. Order</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Sales</th><th className="p-3 text-right">Items</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Status</th><th className="p-3 text-left">Tanggal</th><th className="p-3"></th></tr></thead>
                    <tbody>
                      {fieldOrders.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada field order</td></tr> :
                        fieldOrders.map((fo: any) => (
                          <tr key={fo.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs">{fo.order_number}</td>
                            <td className="p-3 font-medium">{fo.customer_name}</td>
                            <td className="p-3 text-gray-500">{fo.salesperson_name || '-'}</td>
                            <td className="p-3 text-right">{fo.item_count}</td>
                            <td className="p-3 text-right font-semibold">{fmtCur(fo.total || 0)}</td>
                            <td className="p-3 text-center">
                              <Badge color={fo.status === 'approved' ? 'green' : fo.status === 'rejected' ? 'red' : fo.status === 'submitted' ? 'blue' : 'gray'}>{fo.status}</Badge>
                            </td>
                            <td className="p-3 text-gray-500">{fo.order_date}</td>
                            <td className="p-3">
                              {(fo.status === 'draft' || fo.status === 'submitted') && (
                                <div className="flex gap-1">
                                  <button onClick={() => handleUpdateFoStatus(fo.id, 'approved')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                                  <button onClick={() => handleUpdateFoStatus(fo.id, 'rejected')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ MERCHANDISING ═══ */}
            {tab === 'merchandising' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Display Audit / Merchandising</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Sales</th><th className="p-3 text-left">Tipe Toko</th><th className="p-3 text-right">Item</th><th className="p-3 text-right">Compliant</th><th className="p-3 text-right">Score</th><th className="p-3 text-right">Compliance</th><th className="p-3 text-left">Tanggal</th></tr></thead>
                    <tbody>
                      {displayAudits.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada audit display</td></tr> :
                        displayAudits.map((da: any) => (
                          <tr key={da.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{da.customer_name || '-'}</td>
                            <td className="p-3 text-gray-500">{da.salesperson_name || '-'}</td>
                            <td className="p-3">{da.store_type || '-'}</td>
                            <td className="p-3 text-right">{da.total_items}</td>
                            <td className="p-3 text-right">{da.compliant_items}</td>
                            <td className="p-3 text-right">{parseFloat(da.overall_score || 0).toFixed(1)}%</td>
                            <td className="p-3 text-right">
                              <Badge color={parseFloat(da.compliance_pct) >= 85 ? 'green' : parseFloat(da.compliance_pct) >= 60 ? 'yellow' : 'red'}>{parseFloat(da.compliance_pct || 0).toFixed(1)}%</Badge>
                            </td>
                            <td className="p-3 text-gray-500">{da.audit_date}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ COMPETITOR ═══ */}
            {tab === 'competitor' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Aktivitas Kompetitor</h2>
                  <button onClick={() => setModal('competitor')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Laporkan</button>
                </div>

                {competitorSummary.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {competitorSummary.slice(0, 6).map((cs: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">{cs.competitor_name}</h3>
                          {parseInt(cs.high_impact_count) > 0 && <Badge color="red">{cs.high_impact_count} High</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>Laporan: <span className="font-medium text-gray-700">{cs.report_count}</span></div>
                          <div>Territory: <span className="font-medium text-gray-700">{cs.territories_affected}</span></div>
                          <div>Market Share: <span className="font-medium text-gray-700">{cs.avg_market_share ? `${parseFloat(cs.avg_market_share).toFixed(1)}%` : '-'}</span></div>
                          <div>Unresolved: <span className={`font-medium ${parseInt(cs.unresolved_count) > 0 ? 'text-red-600' : 'text-green-600'}`}>{cs.unresolved_count}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Kompetitor</th><th className="p-3 text-left">Brand</th><th className="p-3 text-left">Tipe</th><th className="p-3 text-left">Deskripsi</th><th className="p-3 text-center">Impact</th><th className="p-3 text-left">Reporter</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-center">Status</th></tr></thead>
                    <tbody>
                      {competitors.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada laporan kompetitor</td></tr> :
                        competitors.map((c: any) => (
                          <tr key={c.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{c.competitor_name}</td>
                            <td className="p-3">{c.competitor_brand || '-'}</td>
                            <td className="p-3"><Badge>{c.activity_type}</Badge></td>
                            <td className="p-3 text-gray-500 max-w-xs truncate">{c.description || '-'}</td>
                            <td className="p-3 text-center"><Badge color={c.impact_level === 'high' ? 'red' : c.impact_level === 'medium' ? 'yellow' : 'green'}>{c.impact_level}</Badge></td>
                            <td className="p-3 text-gray-500">{c.reporter_name || '-'}</td>
                            <td className="p-3 text-gray-500">{c.reported_date}</td>
                            <td className="p-3 text-center"><Badge color={c.resolved ? 'green' : 'yellow'}>{c.resolved ? 'Resolved' : 'Open'}</Badge></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ SURVEY ═══ */}
            {tab === 'survey' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Survey Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {surveyTemplates.map((st: any) => (
                    <div key={st.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge color={st.status === 'active' ? 'green' : 'gray'}>{st.status}</Badge>
                        <span className="text-xs text-gray-500">{st.response_count} response</span>
                      </div>
                      <h3 className="font-semibold text-sm">{st.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{st.description}</p>
                      <div className="flex gap-3 mt-3 text-xs text-gray-400">
                        <span>{st.question_count} pertanyaan</span>
                        <span>~{st.estimated_minutes} mnt</span>
                        <span>{st.survey_type}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {surveyResponses.length > 0 && (
                  <>
                    <h2 className="text-lg font-semibold mt-4">Recent Responses</h2>
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th className="p-3 text-left">Survey</th><th className="p-3 text-left">Respondent</th><th className="p-3 text-left">Customer</th><th className="p-3 text-right">Score</th><th className="p-3 text-right">Completion</th><th className="p-3 text-left">Tanggal</th></tr></thead>
                        <tbody>
                          {surveyResponses.map((sr: any) => (
                            <tr key={sr.id} className="border-t">
                              <td className="p-3 font-medium">{sr.survey_title || '-'}</td>
                              <td className="p-3">{sr.respondent_name || '-'}</td>
                              <td className="p-3 text-gray-500">{sr.customer_name || '-'}</td>
                              <td className="p-3 text-right">{sr.score ? `${sr.score}/5` : '-'}</td>
                              <td className="p-3 text-right">{sr.completion_pct}%</td>
                              <td className="p-3 text-gray-500">{sr.response_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ APPROVALS ═══ */}
            {tab === 'approvals' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Approval Workflows</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {approvalWorkflows.map((aw: any) => (
                    <div key={aw.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <h3 className="font-semibold text-sm">{aw.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{aw.description}</p>
                      <div className="flex gap-3 mt-3 text-xs">
                        <Badge>{aw.entity_type}</Badge>
                        <span className="text-gray-400">{aw.step_count} step</span>
                        {parseInt(aw.pending_count) > 0 && <Badge color="yellow">{aw.pending_count} pending</Badge>}
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="text-lg font-semibold mt-4">Approval Requests</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Entity</th><th className="p-3 text-left">No.</th><th className="p-3 text-left">Diajukan oleh</th><th className="p-3 text-right">Nominal</th><th className="p-3 text-center">Step</th><th className="p-3 text-center">Status</th><th className="p-3 text-left">Tanggal</th><th className="p-3"></th></tr></thead>
                    <tbody>
                      {approvalRequests.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada approval request</td></tr> :
                        approvalRequests.map((ar: any) => (
                          <tr key={ar.id} className="border-t hover:bg-gray-50">
                            <td className="p-3"><Badge>{ar.entity_type}</Badge></td>
                            <td className="p-3 font-mono text-xs">{ar.entity_number || '-'}</td>
                            <td className="p-3">{ar.requester_name || '-'}</td>
                            <td className="p-3 text-right">{ar.amount ? fmtCur(ar.amount) : '-'}</td>
                            <td className="p-3 text-center">{ar.current_step}/{ar.total_steps}</td>
                            <td className="p-3 text-center"><Badge color={ar.status === 'approved' ? 'green' : ar.status === 'rejected' ? 'red' : 'yellow'}>{ar.status}</Badge></td>
                            <td className="p-3 text-gray-500">{ar.requested_at ? new Date(ar.requested_at).toLocaleDateString('id-ID') : '-'}</td>
                            <td className="p-3">
                              {ar.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button onClick={() => handleApproval(ar.id, 'approved')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                                  <button onClick={() => handleApproval(ar.id, 'rejected')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ GEOFENCE ═══ */}
            {tab === 'geofence' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Geofence Zones</h2>
                  <button onClick={() => setModal('geofence')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Geofence</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {geofences.length === 0 ? <p className="text-gray-400 col-span-3 text-center py-8">Belum ada geofence</p> :
                    geofences.map((gf: any) => (
                      <div key={gf.id} className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">{gf.name}</h3>
                          <Badge color={gf.is_active ? 'green' : 'gray'}>{gf.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Tipe: {gf.fence_type} · Radius: {gf.radius_meters}m</p>
                          <p>Lat: {gf.center_lat}, Lng: {gf.center_lng}</p>
                          {gf.territory_name && <p>Territory: {gf.territory_name}</p>}
                          <div className="flex gap-2 mt-2">
                            {gf.alert_on_enter && <Badge color="blue">Alert Enter</Badge>}
                            {gf.alert_on_exit && <Badge color="orange">Alert Exit</Badge>}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ═══ COMMISSION ═══ */}
            {tab === 'commission' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Komisi per Produk</h2>
                  <button onClick={() => setModal('commission')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Komisi</button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Produk</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Kategori</th><th className="p-3 text-center">Tipe</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Flat</th><th className="p-3 text-right">Min Qty</th><th className="p-3 text-right">Bonus Rate</th><th className="p-3 text-center">Status</th></tr></thead>
                    <tbody>
                      {commissions.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-gray-400">Belum ada komisi produk</td></tr> :
                        commissions.map((pc: any) => (
                          <tr key={pc.id} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{pc.product_name}</td>
                            <td className="p-3 text-gray-500 font-mono text-xs">{pc.product_sku || '-'}</td>
                            <td className="p-3">{pc.category_name || '-'}</td>
                            <td className="p-3 text-center"><Badge>{pc.commission_type}</Badge></td>
                            <td className="p-3 text-right font-semibold">{pc.commission_rate}%</td>
                            <td className="p-3 text-right">{parseFloat(pc.flat_amount) > 0 ? fmtCur(pc.flat_amount) : '-'}</td>
                            <td className="p-3 text-right">{parseFloat(pc.min_quantity) > 0 ? pc.min_quantity : '-'}</td>
                            <td className="p-3 text-right">{parseFloat(pc.bonus_rate) > 0 ? `${pc.bonus_rate}%` : '-'}</td>
                            <td className="p-3 text-center"><Badge color={pc.is_active ? 'green' : 'gray'}>{pc.is_active ? 'Active' : 'Inactive'}</Badge></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ MODALS ═══ */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">
                  {modal === 'field-order' ? 'Buat Field Order' : modal === 'competitor' ? 'Lapor Aktivitas Kompetitor' : modal === 'geofence' ? 'Tambah Geofence' : modal === 'commission' ? 'Tambah Komisi Produk' : modal === 'coverage-plan' ? 'Tambah Coverage Plan' : ''}
                </h3>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                {/* Coverage Plan Modal */}
                {modal === 'coverage-plan' && (
                  <form onSubmit={handleCreateCoveragePlan} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Kode *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={cpForm.code} onChange={e => setCpForm({ ...cpForm, code: e.target.value })} required /></div>
                      <div><label className="text-xs font-medium text-gray-600">Nama *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={cpForm.name} onChange={e => setCpForm({ ...cpForm, name: e.target.value })} required /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Customer Class</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={cpForm.customer_class} onChange={e => setCpForm({ ...cpForm, customer_class: e.target.value })}><option value="platinum">Platinum</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option><option value="general">General</option></select></div>
                      <div><label className="text-xs font-medium text-gray-600">Frekuensi</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={cpForm.visit_frequency} onChange={e => setCpForm({ ...cpForm, visit_frequency: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select></div>
                      <div><label className="text-xs font-medium text-gray-600">Visit/Period</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={cpForm.visits_per_period} onChange={e => setCpForm({ ...cpForm, visits_per_period: parseInt(e.target.value) })} /></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Buat Coverage Plan</button>
                  </form>
                )}
                {/* Field Order Modal */}
                {modal === 'field-order' && (
                  <form onSubmit={handleCreateFieldOrder} className="space-y-3">
                    <div><label className="text-xs font-medium text-gray-600">Nama Customer *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={foForm.customer_name} onChange={e => setFoForm({ ...foForm, customer_name: e.target.value })} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Alamat</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={foForm.customer_address || ''} onChange={e => setFoForm({ ...foForm, customer_address: e.target.value })} /></div>
                      <div><label className="text-xs font-medium text-gray-600">Metode Bayar</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={foForm.payment_method || 'credit'} onChange={e => setFoForm({ ...foForm, payment_method: e.target.value })}><option value="credit">Kredit</option><option value="cash">Tunai</option><option value="transfer">Transfer</option></select></div>
                    </div>
                    <div><label className="text-xs font-medium text-gray-600">Catatan</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={foForm.notes || ''} onChange={e => setFoForm({ ...foForm, notes: e.target.value })} /></div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Buat Field Order</button>
                  </form>
                )}
                {/* Competitor Modal */}
                {modal === 'competitor' && (
                  <form onSubmit={handleCreateCompetitor} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Nama Kompetitor *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.competitor_name} onChange={e => setCompForm({ ...compForm, competitor_name: e.target.value })} required /></div>
                      <div><label className="text-xs font-medium text-gray-600">Brand</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.competitor_brand || ''} onChange={e => setCompForm({ ...compForm, competitor_brand: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Tipe Aktivitas</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.activity_type} onChange={e => setCompForm({ ...compForm, activity_type: e.target.value })}><option value="promotion">Promosi</option><option value="new_product">Produk Baru</option><option value="price_change">Perubahan Harga</option><option value="display">Display</option><option value="distribution">Distribusi</option></select></div>
                      <div><label className="text-xs font-medium text-gray-600">Impact Level</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.impact_level} onChange={e => setCompForm({ ...compForm, impact_level: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Harga Kompetitor</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.competitor_price || ''} onChange={e => setCompForm({ ...compForm, competitor_price: e.target.value })} /></div>
                      <div><label className="text-xs font-medium text-gray-600">Harga Kita</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.our_price || ''} onChange={e => setCompForm({ ...compForm, our_price: e.target.value })} /></div>
                    </div>
                    <div><label className="text-xs font-medium text-gray-600">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={compForm.description || ''} onChange={e => setCompForm({ ...compForm, description: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-gray-600">Action Required</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={compForm.action_required || ''} onChange={e => setCompForm({ ...compForm, action_required: e.target.value })} /></div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Laporkan</button>
                  </form>
                )}
                {/* Geofence Modal */}
                {modal === 'geofence' && (
                  <form onSubmit={handleCreateGeofence} className="space-y-3">
                    <div><label className="text-xs font-medium text-gray-600">Nama Zone *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={gfForm.name} onChange={e => setGfForm({ ...gfForm, name: e.target.value })} required /></div>
                    <div><label className="text-xs font-medium text-gray-600">Deskripsi</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={gfForm.description || ''} onChange={e => setGfForm({ ...gfForm, description: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Latitude *</label><input type="number" step="any" className="w-full border rounded-lg px-3 py-2 text-sm" value={gfForm.center_lat} onChange={e => setGfForm({ ...gfForm, center_lat: e.target.value })} required /></div>
                      <div><label className="text-xs font-medium text-gray-600">Longitude *</label><input type="number" step="any" className="w-full border rounded-lg px-3 py-2 text-sm" value={gfForm.center_lng} onChange={e => setGfForm({ ...gfForm, center_lng: e.target.value })} required /></div>
                      <div><label className="text-xs font-medium text-gray-600">Radius (m)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={gfForm.radius_meters} onChange={e => setGfForm({ ...gfForm, radius_meters: parseInt(e.target.value) })} /></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Buat Geofence</button>
                  </form>
                )}
                {/* Commission Modal */}
                {modal === 'commission' && (
                  <form onSubmit={handleCreateCommission} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Pilih Produk dari Inventory *</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" required value={comForm.product_id || ''} onChange={e => {
                        const p = inventoryProducts.find((x: any) => String(x.id) === e.target.value);
                        if (p) setComForm({ ...comForm, product_id: p.id, product_name: p.name, product_sku: p.sku || '', category_name: p.category || '' });
                        else setComForm({ ...comForm, product_id: '', product_name: '', product_sku: '', category_name: '' });
                      }}>
                        <option value="">-- Pilih Produk --</option>
                        {inventoryProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''} — {p.category || 'Tanpa Kategori'}</option>)}
                      </select>
                    </div>
                    {comForm.product_name && <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-800 flex gap-3">
                      <span><strong>Produk:</strong> {comForm.product_name}</span>
                      <span><strong>SKU:</strong> {comForm.product_sku || '-'}</span>
                      <span><strong>Kategori:</strong> {comForm.category_name || '-'}</span>
                    </div>}
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Tipe Komisi</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={comForm.commission_type} onChange={e => setComForm({ ...comForm, commission_type: e.target.value })}><option value="percentage">Persentase</option><option value="flat">Flat Amount</option><option value="tiered">Tiered</option></select></div>
                      <div><label className="text-xs font-medium text-gray-600">Rate (%)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={comForm.commission_rate} onChange={e => setComForm({ ...comForm, commission_rate: parseFloat(e.target.value) })} /></div>
                      <div><label className="text-xs font-medium text-gray-600">Flat (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={comForm.flat_amount || 0} onChange={e => setComForm({ ...comForm, flat_amount: parseFloat(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-medium text-gray-600">Min Quantity</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={comForm.min_quantity || 0} onChange={e => setComForm({ ...comForm, min_quantity: parseFloat(e.target.value) })} /></div>
                      <div><label className="text-xs font-medium text-gray-600">Bonus Rate (%)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={comForm.bonus_rate || 0} onChange={e => setComForm({ ...comForm, bonus_rate: parseFloat(e.target.value) })} /></div>
                    </div>
                    <div><label className="text-xs font-medium text-gray-600">Catatan</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={comForm.notes || ''} onChange={e => setComForm({ ...comForm, notes: e.target.value })} /></div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Buat Komisi</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
