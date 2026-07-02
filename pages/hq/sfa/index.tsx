import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useTranslation, formatCurrencyValue, formatDateValue, localeMap, Language, Currency } from '@/lib/i18n';
import HQLayout from '@/components/hq/HQLayout';
import dynamic from 'next/dynamic';
import {
  Search, Plus, X, MapPin, Users, TrendingUp, Target, BarChart3,
  Navigation, Loader2, DollarSign, ArrowRight, RefreshCw, UserPlus,
  ShoppingCart, Eye, Swords, ClipboardList, CheckCircle, Shield, Settings,
  Award, Phone, Mail, Trash2, Globe, Activity, Calendar, AlertTriangle, Percent,
  Heart, MessageCircle, Briefcase, FileText, Zap, Clock, Camera,
  Bot, LayoutList, CalendarDays, Headphones,
  Download, Upload, FileUp, Table2, ArrowDownToLine, Filter,
  History, ArrowRightLeft, Link2, Brain, Cpu, Sparkles, Building2
} from 'lucide-react';

const TaskCalendarModule = dynamic(() => import('@/components/sfa/TaskCalendarModule'), { ssr: false, loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div> });
const SalesManagementModule = dynamic(() => import('@/components/sfa/SalesManagementModule'), { ssr: false, loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div> });
const SfaExportModal = dynamic(() => import('@/components/sfa/SfaExportModal'), { ssr: false });
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  rowsOr,
  MOCK_SFA_DASHBOARD,
  MOCK_SFA_LEADS,
  MOCK_SFA_OPPORTUNITIES,
  MOCK_SFA_TEAMS,
  MOCK_SFA_TERRITORIES,
  MOCK_SFA_VISITS,
  MOCK_SFA_COVERAGE_PLANS,
  MOCK_SFA_COMPLIANCE,
  MOCK_SFA_FIELD_ORDERS,
  MOCK_SFA_QUOTATIONS,
  MOCK_SFA_TARGET_GROUPS,
  MOCK_SFA_INCENTIVE_SCHEMES,
  MOCK_SFA_COMMISSIONS,
  MOCK_SFA_INV_PRODUCTS,
  MOCK_SFA_COMM_GROUPS,
  MOCK_SFA_OUTLET_TARGETS,
  MOCK_SFA_SALES_STRATEGIES,
  MOCK_SFA_DISPLAY_AUDITS,
  MOCK_SFA_COMPETITORS,
  MOCK_SFA_COMPETITOR_SUMMARY,
  MOCK_SFA_SURVEY_TEMPLATES,
  MOCK_SFA_SURVEY_RESPONSES,
  MOCK_SFA_APPROVAL_WORKFLOWS,
  MOCK_SFA_APPROVAL_REQUESTS,
  MOCK_SFA_GEOFENCES,
  MOCK_SFA_PARAMETERS,
  MOCK_SFA_PLAFON,
  MOCK_SFA_CURRENCIES,
  MOCK_SFA_EXCHANGE_RATES,
  MOCK_SFA_TAX_SETTINGS,
  MOCK_SFA_NUMBERING,
  MOCK_SFA_PAYMENT_TERMS,
  MOCK_SFA_BIZ_SETTINGS,
  MOCK_SFA_CRM_CUSTOMERS,
  MOCK_SFA_CRM_COMMS,
  MOCK_SFA_CRM_FOLLOWUPS,
  MOCK_SFA_CRM_TASKS,
  MOCK_SFA_CRM_CALENDAR,
  MOCK_SFA_CRM_FORECASTS,
  MOCK_SFA_CRM_FORECAST_ANALYTICS,
  MOCK_SFA_CRM_AUTOMATION_RULES,
  MOCK_SFA_CRM_AUTOMATION_LOGS,
  MOCK_SFA_INT_LEADS,
  MOCK_SFA_INT_VISITS,
  MOCK_SFA_INT_PIPELINE,
  MOCK_SFA_AUDIT_TIMELINE,
  MOCK_SFA_HRIS_DEPTS,
  MOCK_SFA_HRIS_USERS,
  MOCK_SFA_AI_MODELS,
  MOCK_SFA_AI_CATALOG,
  MOCK_SFA_AI_WORKFLOWS,
  MOCK_SFA_AI_WF_TEMPLATES,
  MOCK_SFA_AI_EXECUTIONS,
} from '@/lib/hq/mock-data';

// ══════════════════════════════════════════════════════
// Types & Constants
// ══════════════════════════════════════════════════════
type Tab = 'dashboard' | 'leads' | 'pipeline' | 'teams' | 'visits' | 'field-tasks' | 'orders' | 'sales-mgmt' | 'targets' | 'incentives' | 'merchandising' | 'competitor' | 'survey' | 'approval' | 'settings' | 'customers' | 'communications' | 'tasks' | 'forecasting' | 'automation' | 'import-export' | 'integration' | 'audit-trail' | 'ai-workflow';

const TAB_GROUPS: { tKey: string; tabs: { id: Tab; tKey: string; icon: any; modules?: ('crm' | 'sfa')[] }[] }[] = [
  { tKey: 'groupMain', tabs: [
    { id: 'dashboard', tKey: 'tabDashboard', icon: BarChart3 },
    { id: 'leads', tKey: 'tabLeads', icon: UserPlus, modules: ['sfa'] },
    { id: 'pipeline', tKey: 'tabPipeline', icon: TrendingUp, modules: ['sfa'] },
  ]},
  { tKey: 'groupCustomers', tabs: [
    { id: 'customers', tKey: 'tabCustomers360', icon: Heart, modules: ['crm'] },
    { id: 'communications', tKey: 'tabCommunications', icon: MessageCircle, modules: ['crm'] },
  ]},
  { tKey: 'groupProductivity', tabs: [
    { id: 'tasks', tKey: 'tabTasksCalendar', icon: LayoutList, modules: ['crm'] },
    { id: 'forecasting', tKey: 'tabForecasting', icon: TrendingUp, modules: ['crm'] },
    { id: 'automation', tKey: 'tabAutomation', icon: Zap, modules: ['crm'] },
  ]},
  { tKey: 'groupFieldForce', tabs: [
    { id: 'teams', tKey: 'tabTeamsTerritory', icon: Users, modules: ['sfa'] },
    { id: 'visits', tKey: 'tabVisitsCoverage', icon: Navigation, modules: ['sfa'] },
    { id: 'field-tasks', tKey: 'tabVisitPlanTasks', icon: CalendarDays, modules: ['sfa'] },
    { id: 'orders', tKey: 'tabOrdersQuotations', icon: ShoppingCart, modules: ['sfa'] },
  ]},
  { tKey: 'groupPerformance', tabs: [
    { id: 'sales-mgmt', tKey: 'tabSalesManagement', icon: ShoppingCart, modules: ['sfa'] },
    { id: 'targets', tKey: 'tabTargetsAchievement', icon: Target, modules: ['sfa'] },
    { id: 'incentives', tKey: 'tabIncentivesCommissions', icon: Award, modules: ['sfa'] },
  ]},
  { tKey: 'groupIntelligence', tabs: [
    { id: 'merchandising', tKey: 'tabMerchandising', icon: Eye, modules: ['sfa'] },
    { id: 'competitor', tKey: 'tabCompetitor', icon: Swords, modules: ['sfa'] },
    { id: 'survey', tKey: 'tabSurvey', icon: ClipboardList, modules: ['sfa'] },
    { id: 'ai-workflow', tKey: 'tabAiWorkflow', icon: Brain },
  ]},
  { tKey: 'groupAdmin', tabs: [
    { id: 'approval', tKey: 'tabApproval', icon: CheckCircle, modules: ['sfa'] },
    { id: 'integration', tKey: 'tabIntegration', icon: ArrowRightLeft, modules: ['crm', 'sfa'] },
    { id: 'audit-trail', tKey: 'tabAuditTrail', icon: History },
    { id: 'settings', tKey: 'tabSettings', icon: Settings },
    { id: 'import-export', tKey: 'tabImportExport', icon: ArrowDownToLine },
  ]},
];

const LEAD_STATUS: Record<string, { tKey: string; color: string; ring: string }> = {
  new: { tKey: 'leadNew', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200' },
  contacted: { tKey: 'leadContacted', color: 'bg-sky-50 text-sky-700', ring: 'ring-sky-200' },
  qualified: { tKey: 'leadQualified', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200' },
  proposal: { tKey: 'leadProposal', color: 'bg-violet-50 text-violet-700', ring: 'ring-violet-200' },
  negotiation: { tKey: 'leadNegotiation', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200' },
  converted: { tKey: 'leadConverted', color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
  lost: { tKey: 'leadLost', color: 'bg-red-50 text-red-700', ring: 'ring-red-200' },
};

const OPP_STAGES: Record<string, { tKey: string; color: string; gradient: string; prob: number }> = {
  qualification: { tKey: 'stageQualification', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', prob: 10 },
  needs_analysis: { tKey: 'stageAnalysis', color: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600', prob: 25 },
  proposal: { tKey: 'stageProposal', color: 'bg-violet-500', gradient: 'from-violet-500 to-violet-600', prob: 40 },
  negotiation: { tKey: 'stageNegotiation', color: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600', prob: 70 },
  closed_won: { tKey: 'stageWon', color: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600', prob: 100 },
  closed_lost: { tKey: 'stageLost', color: 'bg-red-500', gradient: 'from-red-500 to-red-600', prob: 0 },
};

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) => {
  const c: any = {
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
    yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    gray: 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/10',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10',
    orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c[color] || c.blue}`}>{children}</span>;
};

const Card = ({ children, className = '', hover = false, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${hover ? 'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 cursor-pointer' : ''} transition-all duration-200 ${className}`}>{children}</div>
);

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div><h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
    {action}
  </div>
);

const PrimaryBtn = ({ children, onClick, icon: Icon }: { children: React.ReactNode; onClick: () => void; icon?: any }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all">
    {Icon && <Icon className="w-4 h-4" />} {children}
  </button>
);

const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-gray-300" /></div>
    <p className="text-sm font-medium text-gray-400">{title}</p>
    {subtitle && <p className="text-xs text-gray-300 mt-1">{subtitle}</p>}
  </div>
);

const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <Card className="overflow-hidden"><div className="overflow-x-auto">{children}</div></Card>
);

const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-gray-300";

const FI = ({ label, required, children, span }: { label: string; required?: boolean; children: React.ReactNode; span?: number }) => (
  <div className={span === 2 ? 'sm:col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const makeFmtCur = (currency: Currency) => (n: number) => formatCurrencyValue(n || 0, currency);
const makeFmtDate = (language: Language) => (d: string) => d ? formatDateValue(d, language, 'short') : '-';
const makeFmt = (language: Language) => (n: number) => new Intl.NumberFormat(localeMap[language]).format(n || 0);

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#6366f1', '#a855f7'];
const LEAD_COLORS: Record<string, string> = { new: '#3b82f6', contacted: '#06b6d4', qualified: '#6366f1', proposal: '#8b5cf6', negotiation: '#f59e0b', converted: '#10b981', lost: '#ef4444' };
const STAGE_COLORS: Record<string, string> = { qualification: '#3b82f6', needs_analysis: '#6366f1', proposal: '#8b5cf6', negotiation: '#f59e0b', closed_won: '#10b981', closed_lost: '#ef4444' };

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-200/60 shadow-lg shadow-gray-900/10 px-4 py-3 rounded-xl text-xs" style={{ minWidth: 140 }}>
      {label && <p className="text-gray-500 font-medium mb-2 pb-2 border-b border-gray-100">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: p.color || p.fill }} />
              <span className="text-gray-600">{p.name}</span>
            </div>
            <span className="font-bold text-gray-900">{typeof p.value === 'number' && p.value > 9999 ? fmtCur(p.value) : fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) => (
  <Card className={`p-0 overflow-hidden ${className}`}>
    <div className="px-5 pt-5 pb-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="px-5 pb-5">{children}</div>
  </Card>
);

const ChartLegendItem = ({ color, label, value, total, suffix = '' }: { color: string; label: string; value: number; total?: number; suffix?: string }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="w-3 h-3 rounded-md shadow-sm shrink-0" style={{ background: color }} />
    <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-bold text-gray-900">{(value || 0).toLocaleString()}{suffix}</span>
      {total != null && total > 0 && <span className="text-[10px] text-gray-400 w-10 text-right">{((value / total) * 100).toFixed(0)}%</span>}
    </div>
  </div>
);

// API helpers for 3 endpoints
const apiCore = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa?action=${action}`, o)).json();
};
const apiEnh = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/enhanced?action=${action}`, o)).json();
};
const apiAdv = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/advanced?action=${action}`, o)).json();
};
const apiCrm = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/crm?action=${action}`, o)).json();
};
const apiIE = async (action: string, method = 'GET', body?: any, query = '') => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/import-export?action=${action}${query}`, o)).json();
};

// ══════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════
export default function SFAUnifiedPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t, language, currency } = useTranslation();
  const fmtCur = useMemo(() => makeFmtCur(currency), [currency]);
  const fmtDate = useMemo(() => makeFmtDate(language), [language]);
  const fmtDateTime = useMemo(
    () => (d: string | null | undefined) => (d != null && String(d).trim() !== '' ? formatDateValue(d, language, 'datetime') : '—'),
    [language]
  );
  const fmt = useMemo(() => makeFmt(language), [language]);
  const localeDateLong = useMemo(() => {
    try { return new Date().toLocaleDateString(localeMap[language], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; }
  }, [language]);

  // ── Role-Based Access Control ──
  const userRole = (session?.user as any)?.role || 'staff';
  const userId = (session?.user as any)?.id;
  const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);
  const isStaff = !isManager; // staff, cashier, etc. = field force level
  const canDelete = isManager;
  const canApprove = isManager;
  const canManageSettings = isManager;
  const canViewAllData = isManager; // manager sees all, staff sees own
  const canImport = true; // both staff and manager can import
  const canExport = true; // both staff and manager can export

  // ── Module Availability ──
  // Tracks which modules (crm, sfa) are enabled for the current tenant.
  // Default: both enabled. The system fetches actual status from the API.
  const [enabledModules, setEnabledModules] = useState<string[]>(['crm', 'sfa']);
  const hasCrm = enabledModules.includes('crm');
  const hasSfa = enabledModules.includes('sfa');

  useEffect(() => {
    // Fetch tenant modules to check if crm/sfa are enabled
    (async () => {
      try {
        const r = await fetch('/api/modules/status');
        if (r.ok) {
          const data = await r.json();
          if (data.success && data.enabledModules) {
            const codes = data.enabledModules.map((m: any) => (m.code || m).toLowerCase());
            // Only filter if module system is actually configured; otherwise default both on
            if (codes.length > 0) {
              const active: string[] = [];
              if (codes.includes('crm')) active.push('crm');
              if (codes.includes('sfa')) active.push('sfa');
              // If neither crm nor sfa found in module list, keep both enabled (module not configured yet)
              if (active.length > 0) setEnabledModules(active);
            }
          }
        }
      } catch { /* Module system not available, keep defaults */ }
    })();
  }, []);

  // Staff sees operational tabs; Manager sees ALL including admin/monitoring
  // Also filter tabs by enabled modules (crm/sfa)
  const STAFF_HIDDEN_TABS: Tab[] = ['approval', 'settings', 'automation'];
  const visibleTabGroups = useMemo(() => {
    return TAB_GROUPS.map(g => ({
      ...g,
      tabs: g.tabs.filter(t => {
        // Role filter: staff hidden tabs
        if (!isManager && STAFF_HIDDEN_TABS.includes(t.id)) return false;
        // Module filter: only show tab if its module is enabled (no modules = always show)
        if (t.modules && t.modules.length > 0) {
          return t.modules.some(m => enabledModules.includes(m));
        }
        return true;
      })
    })).filter(g => g.tabs.length > 0);
  }, [isManager, enabledModules]);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [customerImportOpen, setCustomerImportOpen] = useState(false);
  const [customerImportCsv, setCustomerImportCsv] = useState('');
  const [customerImportBusy, setCustomerImportBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Data states - organized by feature area
  const [dashboard, setDashboard] = useState<any>(MOCK_SFA_DASHBOARD);
  // Sales
  const [leads, setLeads] = useState<any[]>(MOCK_SFA_LEADS);
  const [opportunities, setOpportunities] = useState<any[]>(MOCK_SFA_OPPORTUNITIES);
  const [pipelineData, setPipelineData] = useState<any>(null);
  // Field Force
  const [teams, setTeams] = useState<any[]>(MOCK_SFA_TEAMS);
  const [territories, setTerritories] = useState<any[]>(MOCK_SFA_TERRITORIES);
  const [visits, setVisits] = useState<any[]>(MOCK_SFA_VISITS);
  const [coveragePlans, setCoveragePlans] = useState<any[]>(MOCK_SFA_COVERAGE_PLANS);
  const [compliance, setCompliance] = useState<any[]>(MOCK_SFA_COMPLIANCE);
  /** Ringkasan integrasi kunjungan ↔ task (bulan berjalan) */
  const [visitBridgeStat, setVisitBridgeStat] = useState<{
    visits_in_period?: number;
    visits_completed?: number;
    visit_tasks_in_period?: number;
    visit_tasks_completed?: number;
  } | null>(null);
  const [fieldOrders, setFieldOrders] = useState<any[]>(MOCK_SFA_FIELD_ORDERS);
  const [quotations, setQuotations] = useState<any[]>(MOCK_SFA_QUOTATIONS);
  // Targets & Performance
  const [targetGroups, setTargetGroups] = useState<any[]>(MOCK_SFA_TARGET_GROUPS);
  const [incentiveSchemes, setIncentiveSchemes] = useState<any[]>(MOCK_SFA_INCENTIVE_SCHEMES);
  const [commissions, setCommissions] = useState<any[]>(MOCK_SFA_COMMISSIONS);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>(MOCK_SFA_INV_PRODUCTS);
  const [commissionGroups, setCommissionGroups] = useState<any[]>(MOCK_SFA_COMM_GROUPS);
  const [outletTargets, setOutletTargets] = useState<any[]>(MOCK_SFA_OUTLET_TARGETS);
  const [salesStrategies, setSalesStrategies] = useState<any[]>(MOCK_SFA_SALES_STRATEGIES);
  const [commSummary, setCommSummary] = useState<any>(null);
  const [incSubTab, setIncSubTab] = useState<'overview'|'product'|'group'|'outlet'|'strategy'>('overview');
  // Intelligence
  const [displayAudits, setDisplayAudits] = useState<any[]>(MOCK_SFA_DISPLAY_AUDITS);
  const [competitors, setCompetitors] = useState<any[]>(MOCK_SFA_COMPETITORS);
  const [competitorSummary, setCompetitorSummary] = useState<any[]>(MOCK_SFA_COMPETITOR_SUMMARY);
  const [surveyTemplates, setSurveyTemplates] = useState<any[]>(MOCK_SFA_SURVEY_TEMPLATES);
  const [surveyResponses, setSurveyResponses] = useState<any[]>(MOCK_SFA_SURVEY_RESPONSES);
  // Admin
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>(MOCK_SFA_APPROVAL_WORKFLOWS);
  const [approvalRequests, setApprovalRequests] = useState<any[]>(MOCK_SFA_APPROVAL_REQUESTS);
  const [geofences, setGeofences] = useState<any[]>(MOCK_SFA_GEOFENCES);
  const [parameters, setParameters] = useState<any[]>(MOCK_SFA_PARAMETERS);
  const [plafon, setPlafon] = useState<any[]>(MOCK_SFA_PLAFON);
  const [currencies, setCurrencies] = useState<any[]>(MOCK_SFA_CURRENCIES);
  const [exchangeRates, setExchangeRates] = useState<any[]>(MOCK_SFA_EXCHANGE_RATES);
  const [taxSettings, setTaxSettings] = useState<any[]>(MOCK_SFA_TAX_SETTINGS);
  const [numberingFormats, setNumberingFormats] = useState<any[]>(MOCK_SFA_NUMBERING);
  const [paymentTerms, setPaymentTerms] = useState<any[]>(MOCK_SFA_PAYMENT_TERMS);
  const [bizSettings, setBizSettings] = useState<any[]>(MOCK_SFA_BIZ_SETTINGS);
  const [settingsOverview, setSettingsOverview] = useState<any>(null);
  const [settSubTab, setSettSubTab] = useState<'master'|'currency'|'tax'|'numbering'|'payment'|'business'>('master');
  // CRM
  const [crmCustomers, setCrmCustomers] = useState<any[]>(MOCK_SFA_CRM_CUSTOMERS);
  const [crmAnalytics, setCrmAnalytics] = useState<any>(null);
  const [crmComms, setCrmComms] = useState<any[]>(MOCK_SFA_CRM_COMMS);
  const [crmFollowUps, setCrmFollowUps] = useState<any[]>(MOCK_SFA_CRM_FOLLOWUPS);
  const [crmTasks, setCrmTasks] = useState<any[]>(MOCK_SFA_CRM_TASKS);
  const [crmTaskSummary, setCrmTaskSummary] = useState<any>(null);
  const [crmCalendar, setCrmCalendar] = useState<any[]>(MOCK_SFA_CRM_CALENDAR);
  const [crmForecasts, setCrmForecasts] = useState<any[]>(MOCK_SFA_CRM_FORECASTS);
  const [crmForecastAnalytics, setCrmForecastAnalytics] = useState<any>(MOCK_SFA_CRM_FORECAST_ANALYTICS);
  const [crmAutomationRules, setCrmAutomationRules] = useState<any[]>(MOCK_SFA_CRM_AUTOMATION_RULES);
  const [crmAutomationLogs, setCrmAutomationLogs] = useState<any[]>(MOCK_SFA_CRM_AUTOMATION_LOGS);
  // Import/Export
  const [ieEntities, setIeEntities] = useState<any>(null);
  const [ieSelectedEntity, setIeSelectedEntity] = useState<string>('');
  const [ieMode, setIeMode] = useState<'import' | 'export'>('import');
  const [ieTemplate, setIeTemplate] = useState<any>(null);
  const [ieUploadedData, setIeUploadedData] = useState<any[]>([]);
  const [ieValidation, setIeValidation] = useState<any>(null);
  const [ieExportData, setIeExportData] = useState<any>(null);
  const [ieImporting, setIeImporting] = useState(false);
  const [ieImportResult, setIeImportResult] = useState<any>(null);
  const [ieFileInfo, setIeFileInfo] = useState<{ name: string; size: number; rows: number } | null>(null);
  // Integration
  const [intHealth, setIntHealth] = useState<any>(null);
  const [intConvertibleLeads, setIntConvertibleLeads] = useState<any[]>(MOCK_SFA_INT_LEADS);
  const [intUnlinkedVisits, setIntUnlinkedVisits] = useState<any[]>(MOCK_SFA_INT_VISITS);
  const [intSyncablePipeline, setIntSyncablePipeline] = useState<any[]>(MOCK_SFA_INT_PIPELINE);
  const [intLoading, setIntLoading] = useState(false);
  // Audit Trail
  const [auditTimeline, setAuditTimeline] = useState<any[]>(MOCK_SFA_AUDIT_TIMELINE);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditFilters, setAuditFilters] = useState<any>(null);
  const [auditFilterEntity, setAuditFilterEntity] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [auditFilterPeriod, setAuditFilterPeriod] = useState('7d');
  // HRIS Sync (for Teams tab)
  const [hrisDepartments, setHrisDepartments] = useState<any[]>(MOCK_SFA_HRIS_DEPTS);
  const [hrisSyncStatus, setHrisSyncStatus] = useState<any>(null);
  const [hrisSyncing, setHrisSyncing] = useState(false);
  const [hrisAvailableUsers, setHrisAvailableUsers] = useState<any[]>(MOCK_SFA_HRIS_USERS);
  // AI Workflow
  // Lookup Options (Settings)
  const [lookupCategories, setLookupCategories] = useState<Record<string, { label: string; description: string; options: any[] }>>({});
  const [lookupSelectedCat, setLookupSelectedCat] = useState('');
  const [lookupEditing, setLookupEditing] = useState<any>(null);
  const [lookupSaving, setLookupSaving] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [aiModels, setAiModels] = useState<any[]>(MOCK_SFA_AI_MODELS);
  const [aiModelCatalog, setAiModelCatalog] = useState<any[]>(MOCK_SFA_AI_CATALOG);
  const [aiWorkflows, setAiWorkflows] = useState<any[]>(MOCK_SFA_AI_WORKFLOWS);
  const [aiWorkflowTemplates, setAiWorkflowTemplates] = useState<any[]>(MOCK_SFA_AI_WF_TEMPLATES);
  const [aiExecutions, setAiExecutions] = useState<any[]>(MOCK_SFA_AI_EXECUTIONS);
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [aiSelectedWorkflow, setAiSelectedWorkflow] = useState<any>(null);
  const [aiExecResult, setAiExecResult] = useState<any>(null);
  const [aiExecLoading, setAiExecLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'dashboard': {
          const [r, r2, r3] = await Promise.all([
            apiCore('unified-dashboard'),
            apiCore('dashboard'),
            apiCore('pipeline'),
          ]);
          if (r.success) setDashboard({
            ...MOCK_SFA_DASHBOARD,
            ...r.data,
            leadsByStatus: rowsOr(r2.success ? (r2.data?.leadsByStatus || []) : [], MOCK_SFA_DASHBOARD.leadsByStatus),
            pipelineStages: rowsOr(r2.success ? (r2.data?.pipeline || []) : [], MOCK_SFA_DASHBOARD.pipelineStages),
            visitStats: rowsOr(r2.success ? (r2.data?.visitStats || []) : [], MOCK_SFA_DASHBOARD.visitStats),
            topLeads: rowsOr(r2.success ? (r2.data?.topLeads || []) : [], MOCK_SFA_DASHBOARD.topLeads),
            pipelineBreakdown: (r3.success && r3.data) ? r3.data : MOCK_SFA_DASHBOARD.pipelineBreakdown,
          });
          break;
        }
        case 'leads': {
          const r = await apiCore('leads');
          if (r.success) setLeads(rowsOr(r.data, MOCK_SFA_LEADS));
          break;
        }
        case 'pipeline': {
          const [r1, r2] = await Promise.all([apiCore('opportunities'), apiCore('pipeline')]);
          if (r1.success) setOpportunities(rowsOr(r1.data, MOCK_SFA_OPPORTUNITIES));
          if (r2.success) setPipelineData(r2.data);
          break;
        }
        case 'teams': {
          const apiHris = async (a: string, q2 = '') => (await fetch(`/api/hq/sfa/hris-sync?action=${a}${q2}`)).json();
          const [r1, r2, r3, r4, r5] = await Promise.all([
            apiEnh('teams'), apiCore('territories'),
            apiHris('sync-status'), apiHris('departments'), apiHris('available-users'),
          ]);
          if (r1.success) setTeams(rowsOr(r1.data, MOCK_SFA_TEAMS));
          if (r2.success) setTerritories(rowsOr(r2.data, MOCK_SFA_TERRITORIES));
          if (r3.success) setHrisSyncStatus(r3.data);
          if (r4.success) setHrisDepartments(rowsOr(r4.data, MOCK_SFA_HRIS_DEPTS));
          if (r5.success) setHrisAvailableUsers(rowsOr(r5.data, MOCK_SFA_HRIS_USERS));
          break;
        }
        case 'visits': {
          const period = new Date().toISOString().slice(0, 7);
          const [r1, r2, r3, r4] = await Promise.all([
            apiCore('visits'),
            apiAdv('coverage-plans'),
            apiAdv('coverage-compliance'),
            fetch(`/api/hq/sfa/task-calendar?action=visit-bridge&period=${period}`).then(r => r.json()),
          ]);
          if (r1.success) setVisits(rowsOr(r1.data, MOCK_SFA_VISITS));
          if (r2.success) setCoveragePlans(rowsOr(r2.data, MOCK_SFA_COVERAGE_PLANS));
          if (r3.success) setCompliance(rowsOr(r3.data, MOCK_SFA_COMPLIANCE));
          if (r4.success) setVisitBridgeStat(r4.data || null);
          break;
        }
        case 'orders': {
          const [r1, r2] = await Promise.all([apiAdv('field-orders'), apiCore('quotations')]);
          if (r1.success) setFieldOrders(rowsOr(r1.data, MOCK_SFA_FIELD_ORDERS));
          if (r2.success) setQuotations(rowsOr(r2.data, MOCK_SFA_QUOTATIONS));
          break;
        }
        case 'targets': {
          const r = await apiEnh('target-groups');
          if (r.success) setTargetGroups(rowsOr(r.data, MOCK_SFA_TARGET_GROUPS));
          break;
        }
        case 'incentives': {
          const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([apiEnh('incentive-schemes'), apiAdv('product-commissions'), apiAdv('inventory-products'), apiAdv('commission-groups'), apiAdv('outlet-targets'), apiAdv('sales-strategies'), apiAdv('commission-summary')]);
          if (r1.success) setIncentiveSchemes(rowsOr(r1.data, MOCK_SFA_INCENTIVE_SCHEMES));
          if (r2.success) setCommissions(rowsOr(r2.data, MOCK_SFA_COMMISSIONS));
          if (r3.success) setInventoryProducts(rowsOr(r3.data, MOCK_SFA_INV_PRODUCTS));
          if (r4.success) setCommissionGroups(rowsOr(r4.data, MOCK_SFA_COMM_GROUPS));
          if (r5.success) setOutletTargets(rowsOr(r5.data, MOCK_SFA_OUTLET_TARGETS));
          if (r6.success) setSalesStrategies(rowsOr(r6.data, MOCK_SFA_SALES_STRATEGIES));
          if (r7.success) setCommSummary(r7.data || null);
          break;
        }
        case 'merchandising': {
          const r = await apiAdv('display-audits');
          if (r.success) setDisplayAudits(rowsOr(r.data, MOCK_SFA_DISPLAY_AUDITS));
          break;
        }
        case 'competitor': {
          const [r1, r2] = await Promise.all([apiAdv('competitor-activities'), apiAdv('competitor-summary')]);
          if (r1.success) setCompetitors(rowsOr(r1.data, MOCK_SFA_COMPETITORS));
          if (r2.success) setCompetitorSummary(rowsOr(r2.data, MOCK_SFA_COMPETITOR_SUMMARY));
          break;
        }
        case 'survey': {
          const [r1, r2] = await Promise.all([apiAdv('survey-templates'), apiAdv('survey-responses')]);
          if (r1.success) setSurveyTemplates(rowsOr(r1.data, MOCK_SFA_SURVEY_TEMPLATES));
          if (r2.success) setSurveyResponses(rowsOr(r2.data, MOCK_SFA_SURVEY_RESPONSES));
          break;
        }
        case 'approval': {
          const [r1, r2] = await Promise.all([apiAdv('approval-workflows'), apiAdv('approval-requests')]);
          if (r1.success) setApprovalWorkflows(rowsOr(r1.data, MOCK_SFA_APPROVAL_WORKFLOWS));
          if (r2.success) setApprovalRequests(rowsOr(r2.data, MOCK_SFA_APPROVAL_REQUESTS));
          break;
        }
        case 'settings': {
          const apiLookup = async (a: string) => (await fetch(`/api/hq/sfa/lookup?action=${a}`)).json();
          const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
            apiEnh('parameters'), apiAdv('geofences'), apiEnh('plafon-list'), apiLookup('all'),
            apiEnh('currencies'), apiEnh('exchange-rates'), apiEnh('tax-settings'),
            apiEnh('numbering-formats'), apiEnh('payment-terms'), apiEnh('business-settings'),
            apiEnh('settings-overview'),
          ]);
          if (r1.success) setParameters(rowsOr(r1.data, MOCK_SFA_PARAMETERS));
          if (r2.success) setGeofences(rowsOr(r2.data, MOCK_SFA_GEOFENCES));
          if (r3.success) setPlafon(rowsOr(r3.data, MOCK_SFA_PLAFON));
          if (r4.success) setLookupCategories(r4.data || {});
          if (r5.success) setCurrencies(rowsOr(r5.data, MOCK_SFA_CURRENCIES));
          if (r6.success) setExchangeRates(rowsOr(r6.data, MOCK_SFA_EXCHANGE_RATES));
          if (r7.success) setTaxSettings(rowsOr(r7.data, MOCK_SFA_TAX_SETTINGS));
          if (r8.success) setNumberingFormats(rowsOr(r8.data, MOCK_SFA_NUMBERING));
          if (r9.success) setPaymentTerms(rowsOr(r9.data, MOCK_SFA_PAYMENT_TERMS));
          if (r10.success) setBizSettings(rowsOr(r10.data, MOCK_SFA_BIZ_SETTINGS));
          if (r11.success) setSettingsOverview(r11.data || null);
          break;
        }
        case 'customers': {
          const [r1, r2] = await Promise.all([apiCrm('customers'), apiCrm('customer-analytics')]);
          if (r1.success) setCrmCustomers(rowsOr(r1.data, MOCK_SFA_CRM_CUSTOMERS));
          if (r2.success) setCrmAnalytics(r2.data);
          break;
        }
        case 'communications': {
          const [r1, r2] = await Promise.all([apiCrm('communications'), apiCrm('follow-ups')]);
          if (r1.success) setCrmComms(rowsOr(r1.data, MOCK_SFA_CRM_COMMS));
          if (r2.success) setCrmFollowUps(rowsOr(r2.data, MOCK_SFA_CRM_FOLLOWUPS));
          break;
        }
        case 'tasks': {
          const [r1, r2, r3] = await Promise.all([apiCrm('tasks'), apiCrm('task-summary'), apiCrm('calendar-events')]);
          if (r1.success) setCrmTasks(rowsOr(r1.data, MOCK_SFA_CRM_TASKS));
          if (r2.success) setCrmTaskSummary(r2.data);
          if (r3.success) setCrmCalendar(rowsOr(r3.data, MOCK_SFA_CRM_CALENDAR));
          break;
        }
        case 'field-tasks': {
          break;
        }
        case 'forecasting': {
          const [r1, r2] = await Promise.all([apiCrm('forecasts'), apiCrm('forecast-analytics')]);
          if (r1.success) setCrmForecasts(rowsOr(r1.data, MOCK_SFA_CRM_FORECASTS));
          if (r2.success && r2.data) {
            const d = r2.data;
            setCrmForecastAnalytics({
              ...MOCK_SFA_CRM_FORECAST_ANALYTICS,
              ...d,
              forecasts: rowsOr(d.forecasts, MOCK_SFA_CRM_FORECAST_ANALYTICS.forecasts),
              accuracy: rowsOr(d.accuracy, MOCK_SFA_CRM_FORECAST_ANALYTICS.accuracy || []),
              dealScoreDist: rowsOr(d.dealScoreDist, MOCK_SFA_CRM_FORECAST_ANALYTICS.dealScoreDist),
            });
          } else {
            setCrmForecastAnalytics(MOCK_SFA_CRM_FORECAST_ANALYTICS);
          }
          break;
        }
        case 'automation': {
          const [r1, r2] = await Promise.all([apiCrm('automation-rules'), apiCrm('automation-logs')]);
          if (r1.success) setCrmAutomationRules(rowsOr(r1.data, MOCK_SFA_CRM_AUTOMATION_RULES));
          if (r2.success) setCrmAutomationLogs(rowsOr(r2.data, MOCK_SFA_CRM_AUTOMATION_LOGS));
          break;
        }
        case 'import-export': {
          const r = await apiIE('entities');
          if (r.success) setIeEntities(r.data);
          break;
        }
        case 'integration': {
          const apiInt = async (a: string) => (await fetch(`/api/hq/integrations/crm-sfa?action=${a}`)).json();
          const [h, cl, uv, sp] = await Promise.all([
            apiInt('health'), apiInt('convertible-leads'), apiInt('unlinkable-visits'), apiInt('syncable-pipeline')
          ]);
          if (h.success) setIntHealth(h.data);
          if (cl.success) setIntConvertibleLeads(rowsOr(cl.data, MOCK_SFA_INT_LEADS));
          if (uv.success) setIntUnlinkedVisits(rowsOr(uv.data, MOCK_SFA_INT_VISITS));
          if (sp.success) setIntSyncablePipeline(rowsOr(sp.data, MOCK_SFA_INT_PIPELINE));
          break;
        }
        case 'audit-trail': {
          const apiAudit = async (a: string, q = '') => (await fetch(`/api/hq/sfa/audit-trail?action=${a}${q}`)).json();
          const etQ = auditFilterEntity ? `&entityType=${auditFilterEntity}` : '';
          const acQ = auditFilterAction ? `&actionFilter=${auditFilterAction}` : '';
          const [tl, sm, fl] = await Promise.all([
            apiAudit('timeline', `&limit=30${etQ}${acQ}`),
            apiAudit('summary', `&period=${auditFilterPeriod}`),
            apiAudit('filters'),
          ]);
          if (tl.success) setAuditTimeline(rowsOr(tl.data, MOCK_SFA_AUDIT_TIMELINE));
          if (sm.success) setAuditSummary(sm.data);
          if (fl.success) setAuditFilters(fl.data);
          break;
        }
        case 'ai-workflow': {
          const apiAi = async (a: string) => (await fetch(`/api/hq/sfa/ai-workflow?action=${a}`)).json();
          const [m, w, e2, u] = await Promise.all([
            apiAi('models'), apiAi('workflows'), apiAi('executions'), apiAi('usage-stats'),
          ]);
          if (m.success) { setAiModels(rowsOr(m.data, MOCK_SFA_AI_MODELS)); setAiModelCatalog(rowsOr(m.catalog, MOCK_SFA_AI_CATALOG)); }
          if (w.success) { setAiWorkflows(rowsOr(w.data, MOCK_SFA_AI_WORKFLOWS)); setAiWorkflowTemplates(rowsOr(w.templates, MOCK_SFA_AI_WF_TEMPLATES)); }
          if (e2.success) setAiExecutions(rowsOr(e2.data, MOCK_SFA_AI_EXECUTIONS));
          if (u.success) setAiUsageStats(u.data);
          break;
        }
      }
    } catch (e) {
      console.error(e);
      // Fallback for most common tabs
      if (tab === 'dashboard' && !dashboard) setDashboard(MOCK_SFA_DASHBOARD);
      if (tab === 'leads' && leads.length === 0) setLeads(MOCK_SFA_LEADS);
      if (tab === 'pipeline' && opportunities.length === 0) setOpportunities(MOCK_SFA_OPPORTUNITIES);
    }
    setLoading(false);
  }, [tab, auditFilterEntity, auditFilterAction, auditFilterPeriod]);

  useEffect(() => { if (session) fetchData(); }, [session, tab, fetchData]);

  // Load lookup options once on mount for all form dropdowns
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const r = await (await fetch('/api/hq/sfa/lookup?action=all')).json();
        if (r.success) setLookupCategories(r.data || {});
      } catch (e) { /* silent */ }
    })();
  }, [session]);

  // Helper: get options array for a lookup category
  const getLookupOpts = (cat: string, fallback?: { value: string; label: string }[]) => {
    const opts = lookupCategories[cat]?.options;
    if (opts && opts.length > 0) return opts.map((o: any) => ({ value: o.value, label: o.label }));
    return fallback || [];
  };

  // ── CRUD Handlers ──
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiCore('create-lead', 'POST', form);
    if (r.success) { showToast(t('sfa.leadCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiCore('create-opportunity', 'POST', form);
    if (r.success) { showToast(t('sfa.opportunityCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleUpdateOppStage = async (opp: any, stage: string) => {
    const prob = OPP_STAGES[stage]?.prob || 10;
    const status = stage === 'closed_won' ? 'won' : stage === 'closed_lost' ? 'lost' : 'open';
    const r = await apiCore('update-opportunity', 'PUT', { id: opp.id, stage, probability: prob, status });
    if (r.success) { showToast(`Stage: ${t(`sfa.${OPP_STAGES[stage]?.tKey}`)}`); fetchData(); }
  };
  const handleConvertLead = async (lead: any) => {
    const r = await apiCore('convert-lead', 'POST', { lead_id: lead.id, opportunity_title: `Opportunity - ${lead.company_name || lead.contact_name}`, expected_value: lead.estimated_value });
    if (r.success) { showToast(t('sfa.leadConvertedSuccess')); setSelectedItem(null); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
  };
  const handleUpdateLeadStatus = async (lead: any, status: string) => {
    const r = await apiCore('update-lead', 'PUT', { id: lead.id, status });
    if (r.success) { showToast(`Status: ${t(`sfa.${LEAD_STATUS[status]?.tKey}`)}`); setSelectedItem({ ...lead, status }); fetchData(); }
  };
  const handleDeleteLead = async (id: string) => {
    if (!confirm(t('sfa.deleteLeadConfirm'))) return;
    const r = await apiCore(`delete-lead&id=${id}`, 'DELETE');
    if (r.success) { showToast(t('sfa.leadDeleted')); setSelectedItem(null); fetchData(); }
  };
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiCore('create-visit', 'POST', form);
    if (r.success) { showToast(t('sfa.visitScheduled')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateFieldOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-field-order', 'POST', form);
    if (r.success) { showToast(`Field order: ${r.data?.order_number}`); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleUpdateFoStatus = async (id: string, status: string) => {
    const rejected_reason = status === 'rejected' ? prompt(t('sfa.rejectionReason')) : undefined;
    if (status === 'rejected' && !rejected_reason) return;
    const r = await apiAdv('update-field-order-status', 'PUT', { id, status, rejected_reason });
    if (r.success) { showToast(`Order ${status}`); fetchData(); }
  };
  const handleCreateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-competitor-activity', 'POST', form);
    if (r.success) { showToast(t('sfa.competitorReported')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleApproval = async (id: string, decision: string) => {
    const reason = decision === 'rejected' ? prompt(t('sfa.rejectionReason')) : '';
    if (decision === 'rejected' && !reason) return;
    const r = await apiAdv('process-approval', 'PUT', { id, decision, reason });
    if (r.success) { showToast(`Approval ${decision}`); fetchData(); }
  };
  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-geofence', 'POST', form);
    if (r.success) { showToast(t('sfa.geofenceCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-product-commission', 'POST', form);
    if (r.success) { showToast(t('sfa.productCommCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateCommissionGroup = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-commission-group', 'POST', form);
    if (r.success) { showToast(t('sfa.groupCommCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateOutletTarget = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-outlet-target', 'POST', form);
    if (r.success) { showToast(t('sfa.outletTargetCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCreateSalesStrategy = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await apiAdv('create-sales-strategy', 'POST', form);
    if (r.success) { showToast(t('sfa.salesStrategyCreated')); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };

  // ── CRM Handlers ──
  const handleCrmCreate = async (action: string, e: React.FormEvent, msg: string) => {
    e.preventDefault(); setSaving(true);
    const r = await apiCrm(action, 'POST', form);
    if (r.success) { showToast(msg); setModal(null); setForm({}); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
    setSaving(false);
  };
  const handleCrmUpdate = async (action: string, data: any, msg: string) => {
    const r = await apiCrm(action, 'PUT', data);
    if (r.success) { showToast(msg); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
  };
  const handleCrmDelete = async (action: string, id: string, label: string) => {
    if (!confirm(t('sfa.deleteConfirm', { label }))) return;
    const r = await apiCrm(`${action}&id=${id}`, 'DELETE');
    if (r.success) { showToast(t('sfa.deletedSuccess', { label })); setSelectedItem(null); fetchData(); }
    else showToast(r.error || t('sfa.failedLabel'));
  };

  // ── Import/Export Handlers ──
  const ieLoadTemplate = async (entityId: string) => {
    setIeSelectedEntity(entityId);
    setIeValidation(null); setIeUploadedData([]); setIeImportResult(null); setIeExportData(null); setIeFileInfo(null);
    const r = await apiIE('template', 'GET', undefined, `&entity=${entityId}&format=json`);
    if (r.success) setIeTemplate(r.data);
  };
  const ieDownloadTemplate = (entityId: string) => {
    // Download professional Excel template directly
    window.open(`/api/hq/sfa/import-export?action=template&entity=${entityId}`, '_blank');
  };
  const ieHandleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    setIeFileInfo({ name: file.name, size: file.size, rows: 0 });
    setIeValidation(null); setIeImportResult(null);

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const XLSX = (await import('xlsx')).default;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        // Always read from first sheet ("Data Import")
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

        // Smart filtering: skip metadata rows (row 2 = info/types, row 3-4 = examples)
        // Template structure: Row 1=headers, Row 2=type info, Row 3-4=examples (italic/green), Row 5+=data
        // sheet_to_json uses Row 1 as headers automatically, so allRows starts from Row 2
        // We need to filter out info row and example rows that have italic/green styling
        const headerKeys = Object.keys(allRows[0] || {});
        const isMetaRow = (row: any): boolean => {
          const firstVal = String(row[headerKeys[0]] || '').trim();
          // Row 2 info pattern: "⬤ WAJIB" or type descriptions
          if (/^(⬤|WAJIB|Teks|Angka|Pilihan|true|false|YYYY)/i.test(firstVal)) return true;
          // Check if ALL non-empty values match example patterns (italic green rows)
          const vals = headerKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
          if (vals.length === 0) return true; // empty row
          return false;
        };

        // Filter: skip first row (type info) and keep only real data
        // The first row in allRows is the type/info row (Row 2 in Excel)
        const dataRows = allRows.filter((row, idx) => {
          // Skip row index 0 (type info row from Row 2)
          if (idx === 0) return false;
          // Skip rows where first cell looks like metadata
          const firstVal = String(row[headerKeys[0]] || '').trim();
          if (/^(⬤|WAJIB|Teks|Angka|Pilihan|true \/ false|YYYY)/i.test(firstVal)) return false;
          // Skip completely empty rows
          const hasData = headerKeys.some(k => String(row[k] || '').trim() !== '');
          return hasData;
        });

        // Clean header names: remove " *" suffix from required field headers
        const cleanedRows = dataRows.map(row => {
          const clean: Record<string, any> = {};
          headerKeys.forEach(k => {
            const cleanKey = k.replace(/\s*\*\s*$/, '').trim();
            clean[cleanKey] = row[k];
          });
          return clean;
        });

        setIeUploadedData(cleanedRows);
        setIeFileInfo(prev => prev ? { ...prev, rows: cleanedRows.length } : null);
        if (cleanedRows.length === 0) showToast(t('sfa.ieFileEmpty'));
      } catch (err) { showToast(t('sfa.ieReadError')); }
    } else if (ext === 'csv') {
      const text = await file.text();
      const allLines = text.split(/\r?\n/).filter(l => l.trim());
      const metaPatterns = /^(TEMPLATE IMPORT|Tanggal:|WAJIB|opsional|Teks|Angka|Pilihan:|Format:|true \/ false|---)/i;
      let headerIdx = 0;
      for (let i = 0; i < Math.min(allLines.length, 10); i++) {
        const firstCell = allLines[i].split(',')[0].replace(/^"|"$/g, '').trim();
        if (!firstCell || metaPatterns.test(firstCell)) continue;
        const cells = allLines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim()).filter(Boolean);
        if (cells.length >= 2) { headerIdx = i; break; }
      }
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []; let cell = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) { if (ch === '"' && line[i+1] === '"') { cell += '"'; i++; } else if (ch === '"') inQuotes = false; else cell += ch; }
          else { if (ch === '"') inQuotes = true; else if (ch === ',') { result.push(cell.trim()); cell = ''; } else cell += ch; }
        }
        result.push(cell.trim()); return result;
      };
      const lines = allLines.slice(headerIdx);
      if (lines.length < 2) { showToast(t('sfa.ieCsvEmpty')); return; }
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/\s*\*\s*$/, '').trim());
      const rows = lines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(row => Object.values(row).some(v => v.trim()) && !metaPatterns.test(Object.values(row)[0]));
      setIeUploadedData(rows);
      setIeFileInfo(prev => prev ? { ...prev, rows: rows.length } : null);
    } else {
      showToast(t('sfa.ieUnsupportedFormat'));
    }
    e.target.value = '';
  };
  const ieValidate = async () => {
    if (!ieSelectedEntity || ieUploadedData.length === 0) return;
    setIeImporting(true);
    const r = await apiIE('validate', 'POST', { entity: ieSelectedEntity, rows: ieUploadedData });
    if (r.success) setIeValidation(r.data);
    else showToast(r.error || t('sfa.ieValidationFailed'));
    setIeImporting(false);
  };
  const ieDoImport = async () => {
    if (!ieValidation || !ieValidation.canImport) return;
    setIeImporting(true);
    const validRows = ieValidation.results.filter((r: any) => r.status !== 'error').map((r: any) => r.data);
    const r = await apiIE('import', 'POST', { entity: ieSelectedEntity, rows: validRows });
    if (r.success) {
      setIeImportResult(r.data);
      showToast(t('sfa.ieImportSuccess', { count: r.data.inserted }));
    } else showToast(r.error || t('sfa.ieImportFailed'));
    setIeImporting(false);
  };
  const ieDoExport = async () => {
    if (!ieSelectedEntity) return;
    setIeImporting(true);
    // Direct Excel download from server
    window.open(`/api/hq/sfa/import-export?action=export&entity=${ieSelectedEntity}`, '_blank');
    setIeImporting(false);
  };

  const filteredLeads = leads.filter(l => {
    if (search && !(l.contact_name || '').toLowerCase().includes(search.toLowerCase()) && !(l.company_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <HQLayout>
      {/* ═══════════════════════════════════════════ */}
      {/* HERO HEADER CARD */}
      {/* ═══════════════════════════════════════════ */}
      <div className="relative mb-5 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 shadow-lg shadow-blue-500/20">
        {/* Decorative background layers */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-sky-300/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-14 -left-14 w-48 h-48 bg-blue-700/20 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/3 w-40 h-40 bg-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="absolute -inset-1 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent rotate-12 scale-150" />
          <div className="absolute top-4 right-16 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute top-10 right-36 w-1.5 h-1.5 bg-cyan-300/40 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
          <div className="absolute bottom-8 right-52 w-1 h-1 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '1.2s' }} />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5">
          {/* Left: Title & description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-md shadow-blue-600/20">
                <Briefcase className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-blue-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3 h-3" /> Platform
                </span>
                {hasCrm && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold shadow-sm">CRM</span>}
                {hasSfa && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[9px] font-bold shadow-sm">SFA</span>}
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
              {t('sfa.heroTitle')}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
              {t('sfa.heroDesc')}
            </p>
          </div>

          {/* Right: Quick stats */}
          <div className="flex items-center gap-2 shrink-0">
            {[
              { label: t('sfa.statLeads'), value: dashboard?.totalLeads || leads?.length || 0, icon: UserPlus, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
              { label: t('sfa.statPipeline'), value: dashboard?.openDeals || opportunities?.length || 0, icon: TrendingUp, iconColor: 'text-violet-500', iconBg: 'bg-violet-50' },
              { label: t('sfa.statTeams'), value: teams?.length || 0, icon: Users, iconColor: 'text-teal-500', iconBg: 'bg-teal-50' },
              { label: t('sfa.statRevenue'), value: fmtCur(dashboard?.totalRevenue || 0), icon: DollarSign, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
            ].map((s, i) => (
              <div key={i} className="group flex flex-col items-center p-2 sm:p-2.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-md shadow-blue-700/10 hover:bg-white hover:shadow-lg hover:scale-[1.03] transition-all duration-300 min-w-[64px]">
                <div className={`flex items-center justify-center w-7 h-7 rounded-md ${s.iconBg} mb-1.5`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                </div>
                <span className="text-sm sm:text-base font-bold text-gray-800 tabular-nums">{typeof s.value === 'number' ? fmt(s.value) : s.value}</span>
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar with date & actions */}
        <div className="relative flex items-center justify-between px-4 sm:px-5 py-2 border-t border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-[11px] text-white/90">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-white" /> {localeDateLong}</span>
            <span className="hidden sm:flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-300" /> <span className="text-emerald-200 font-bold">Live</span></span>
          </div>
          <div className="flex items-center gap-2">
            {canExport && (
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/95 text-amber-700 text-[11px] font-bold shadow-sm hover:shadow-md active:scale-95 transition-all border border-amber-200/60"
              >
                <Download className="w-3 h-3" /> {t('sfa.openExportCenter')}
              </button>
            )}
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white text-blue-600 text-[11px] font-bold shadow-sm hover:shadow-md active:scale-95 transition-all">
              <RefreshCw className="w-3 h-3" /> {t('sfa.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60]">
          <div className="bg-gray-900 text-white pl-4 pr-5 py-3 rounded-xl shadow-2xl shadow-gray-900/20 text-sm font-medium flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {toast}
          </div>
        </div>
      )}

      <SfaExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} t={t} hasCrm={hasCrm} hasSfa={hasSfa} />

      {/* ── Tab Navigation (Two-Level: Group → Sub-tabs) ── */}
      {(() => {
        const activeGroupIdx = visibleTabGroups.findIndex(g => g.tabs.some(t => t.id === tab));
        const activeGroup = visibleTabGroups[activeGroupIdx] || visibleTabGroups[0];
        const groupIcons = [BarChart3, Heart, LayoutList, Users, Target, Eye, Settings];
        return (
          <div className="mb-6 space-y-3">
            {/* Row 1: Group selector — scrollable on mobile, centered on desktop */}
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-max sm:min-w-0 sm:flex-wrap sm:justify-center md:justify-start">
                {visibleTabGroups.map((group, gi) => {
                  const GIcon = groupIcons[gi];
                  const isActive = gi === activeGroupIdx;
                  return (
                    <button key={gi}
                      onClick={() => { setTab(group.tabs[0].id); setSearch(''); setSelectedItem(null); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50/50'
                      }`}>
                      <GIcon className="w-4 h-4 shrink-0" />
                      <span>{t(`sfa.${group.tKey}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Row 2: Sub-tabs for active group */}
            <div className="bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
              <div className="flex items-center gap-1">
                {activeGroup.tabs.map(tabItem => (
                  <button key={tabItem.id}
                    onClick={() => { setTab(tabItem.id); setSearch(''); setSelectedItem(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      tab === tabItem.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}>
                    <tabItem.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t(`sfa.${tabItem.tKey}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative"><div className="w-12 h-12 rounded-full border-[3px] border-gray-100" /><div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-amber-500 border-t-transparent animate-spin" /></div>
          <p className="mt-4 text-sm text-gray-400 font-medium">{t('sfa.loadingData')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ═══════════════════════════════════════════ */}
          {/* DASHBOARD - Unified from Core+Enhanced+Advanced */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'dashboard' && dashboard && (<>
            <SectionHeader title={t('sfa.dashboardOverview')} subtitle={t('sfa.dashboardSubtitle')}
              action={<button onClick={fetchData} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-sm hover:shadow transition-all"><RefreshCw className="w-3.5 h-3.5" /> {t('sfa.refresh')}</button>} />

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: t('sfa.totalLeads'), value: fmt(dashboard.totalLeads), sub: `${fmt(dashboard.newLeads)} ${t('sfa.newThisMonth')}`, icon: UserPlus, gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', trend: dashboard.newLeads > 0 },
                { label: t('sfa.pipelineValue'), value: fmtCur(dashboard.pipelineValue), sub: `${fmt(dashboard.pipelineCount)} ${t('sfa.activeDeals')}`, icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', trend: dashboard.pipelineCount > 0 },
                { label: t('sfa.conversionRate'), value: `${dashboard.conversionRate}%`, sub: `${fmt(dashboard.convertedLeads)} ${t('sfa.converted')}`, icon: Percent, gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', trend: parseFloat(dashboard.conversionRate) > 0 },
                { label: t('sfa.visits'), value: `${fmt(dashboard.visitsCompleted)}/${fmt(dashboard.visitsThisMonth)}`, sub: `${dashboard.overdueVisits} ${t('sfa.overdue')}`, icon: Navigation, gradient: 'from-violet-500 to-violet-600', light: 'bg-violet-50', trend: dashboard.overdueVisits === 0 },
              ].map((c, i) => (
                <Card key={i} className="p-4 sm:p-5 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${c.light} -mr-6 -mt-6 opacity-50 group-hover:opacity-80 transition-opacity`} />
                  <div className="relative">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm mb-3`}><c.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">{c.value}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{c.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      {c.trend ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      {c.sub}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* ── Role Indicator Banner ── */}
            <Card className={`p-4 border-l-4 ${isManager ? 'border-l-indigo-500 bg-indigo-50/30' : 'border-l-amber-500 bg-amber-50/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isManager ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                    {isManager ? <Shield className="w-5 h-5 text-indigo-600" /> : <Activity className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{isManager ? t('sfa.managerView') : t('sfa.staffView')}</p>
                    <p className="text-xs text-gray-500">{isManager ? t('sfa.managerAccessDesc') : t('sfa.staffAccessDesc')}</p>
                  </div>
                </div>
                <Badge color={isManager ? 'purple' : 'orange'}>{userRole.replace('_', ' ').toUpperCase()}</Badge>
              </div>
            </Card>

            {/* ── Manager Monitoring Panel (Manager/Leader only) ── */}
            {isManager && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Team Performance Overview */}
                <Card className="p-5 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-900">{t('sfa.teamMonitoring')}</h3>
                    <Badge color="purple">Manager</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: t('sfa.totalTeams'), value: fmt(dashboard.activeTeams || 0), icon: Users, color: 'text-blue-600 bg-blue-50' },
                      { label: t('sfa.activeStaff'), value: fmt(dashboard.teamMembers || 0), icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
                      { label: t('sfa.approvalPending'), value: fmt(dashboard.pendingApprovals || 0), icon: CheckCircle, color: 'text-amber-600 bg-amber-50' },
                      { label: t('sfa.openTickets'), value: fmt(dashboard.openTickets || 0), icon: Headphones, color: 'text-red-600 bg-red-50' },
                    ].map((m, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center mx-auto mb-2`}><m.icon className="w-4 h-4" /></div>
                        <p className="text-lg font-bold text-gray-900">{m.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">{t('sfa.managerCapabilities')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[t('sfa.capMonitorAll'), t('sfa.capManageTeam'), t('sfa.capApproveReject'), t('sfa.capDeleteData'), t('sfa.capSetTargets'), t('sfa.capManageAutomation'), t('sfa.capSystemSettings'), t('sfa.capExportReports')].map(c => (
                        <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-medium"><CheckCircle className="w-3 h-3" />{c}</span>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Quick Actions for Manager */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">{t('sfa.quickActions')}</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: t('sfa.actionViewApproval'), tab: 'approval' as Tab, icon: CheckCircle, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                      { label: t('sfa.actionMonitorVisits'), tab: 'visits' as Tab, icon: Navigation, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                      { label: t('sfa.actionCheckTargets'), tab: 'targets' as Tab, icon: Target, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                      { label: t('sfa.actionManageTickets'), action: () => router.push('/hq/helpdesk'), icon: Headphones, color: 'bg-red-50 text-red-700 hover:bg-red-100' },
                      { label: t('sfa.actionViewForecast'), tab: 'forecasting' as Tab, icon: TrendingUp, color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
                      { label: t('sfa.actionManageAutomation'), tab: 'automation' as Tab, icon: Bot, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                      { label: t('sfa.actionImportExport'), tab: 'import-export' as Tab, icon: ArrowDownToLine, color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
                    ].map(a => (
                      <button key={a.label} onClick={() => {
                        if ('action' in a && a.action) { a.action(); return; }
                        setTab((a as { tab: Tab }).tab); setSearch(''); setSelectedItem(null);
                      }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${a.color}`}>
                        <a.icon className="w-4 h-4 shrink-0" />{a.label}<ArrowRight className="w-3 h-3 ml-auto opacity-40" />
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Staff Quick Actions Panel (Staff/FF only) ── */}
            {isStaff && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-900">{t('sfa.quickActionsStaff')}</h3>
                  <Badge color="orange">Field Force</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: t('sfa.actionAddLead'), action: () => { setForm({}); setModal('lead'); }, icon: UserPlus, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                    { label: t('sfa.actionInputVisit'), action: () => { setForm({}); setModal('visit'); }, icon: Navigation, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                    { label: t('sfa.actionCreateOrder'), action: () => { setForm({}); setModal('field-order'); }, icon: ShoppingCart, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                    { label: t('sfa.actionAddCustomer'), action: () => { setForm({}); setModal('customer'); }, icon: Heart, color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
                    { label: t('sfa.actionLogComm'), action: () => { setForm({}); setModal('communication'); }, icon: MessageCircle, color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
                    { label: t('sfa.actionCreateTask'), action: () => { setForm({}); setModal('task'); }, icon: LayoutList, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                    { label: t('sfa.actionCreateTicket'), action: () => router.push('/hq/helpdesk?open=ticket'), icon: Headphones, color: 'bg-red-50 text-red-700 hover:bg-red-100' },
                    { label: t('sfa.actionImportData'), action: () => { setTab('import-export' as Tab); }, icon: Upload, color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl text-xs font-medium transition-colors ${a.color}`}>
                      <a.icon className="w-5 h-5" />{a.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{t('sfa.staffCapabilities')} <span className="text-gray-600">{t('sfa.staffCapDesc')}</span></p>
                </div>
              </Card>
            )}

            {/* ── Charts Row: Lead Status Doughnut + Pipeline Bar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={t('sfa.leadDistribution')} subtitle={t('sfa.leadDistSub')}>
                {(dashboard.leadsByStatus || []).length > 0 ? (() => {
                  const totalLeads = (dashboard.leadsByStatus || []).reduce((s: number, d: any) => s + parseInt(d.count), 0);
                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-44 h-44 shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={(dashboard.leadsByStatus || []).map((s: any) => ({ name: t(`sfa.${LEAD_STATUS[s.status]?.tKey}`) || s.status, value: parseInt(s.count), fill: LEAD_COLORS[s.status] || '#94a3b8' }))}
                              cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>
                              {(dashboard.leadsByStatus || []).map((s: any, i: number) => <Cell key={i} fill={LEAD_COLORS[s.status] || '#94a3b8'} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold text-gray-900">{totalLeads}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Total</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full divide-y divide-gray-50">
                        {(dashboard.leadsByStatus || []).map((s: any, i: number) => (
                          <ChartLegendItem key={i} color={LEAD_COLORS[s.status] || '#94a3b8'} label={t(`sfa.${LEAD_STATUS[s.status]?.tKey}`) || s.status} value={parseInt(s.count)} total={totalLeads} />
                        ))}
                      </div>
                    </div>
                  );
                })() : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><BarChart3 className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noLeadData')}</span></div>}
              </ChartCard>

              <ChartCard title={t('sfa.pipelinePerStage')} subtitle={t('sfa.pipelineStageSub')}>
                {(dashboard.pipelineStages || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(dashboard.pipelineStages || []).map((s: any) => ({ name: t(`sfa.${OPP_STAGES[s.stage]?.tKey}`) || s.stage, deals: parseInt(s.count), value: parseFloat(s.value) }))}
                      margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                      <Bar dataKey="deals" name="Deals" radius={[8, 8, 0, 0]} maxBarSize={42}>
                        {(dashboard.pipelineStages || []).map((s: any, i: number) => <Cell key={i} fill={STAGE_COLORS[s.stage] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><TrendingUp className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noPipelineData')}</span></div>}
              </ChartCard>
            </div>

            {/* ── Operational KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t('sfa.fieldOrders'), value: fmt(dashboard.fieldOrdersThisMonth), sub: fmtCur(dashboard.fieldOrderRevenue), icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: t('sfa.auditCompliance'), value: `${parseFloat(dashboard.avgCompliance || 0).toFixed(0)}%`, sub: `${fmt(dashboard.auditsThisMonth)} audit`, icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: t('sfa.competitorLabel'), value: fmt(dashboard.competitorReports), sub: `${dashboard.unresolvedCompetitor} unresolved`, icon: Swords, color: dashboard.unresolvedCompetitor > 0 ? 'text-red-500' : 'text-blue-500', bg: dashboard.unresolvedCompetitor > 0 ? 'bg-red-50' : 'bg-blue-50' },
                { label: t('sfa.pendingApprovalLabel'), value: fmt(dashboard.pendingApprovals), sub: `${fmt(dashboard.surveysCompleted)} ${t('sfa.surveyLabel')}`, icon: Shield, color: dashboard.pendingApprovals > 0 ? 'text-amber-500' : 'text-gray-400', bg: dashboard.pendingApprovals > 0 ? 'bg-amber-50' : 'bg-gray-50' },
              ].map((m, i) => (
                <Card key={i} className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${m.bg} ${m.color} flex items-center justify-center mb-2.5`}><m.icon className="w-4 h-4" /></div>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.sub}</p>
                </Card>
              ))}
            </div>

            {/* ── Visit Stats Doughnut + Top Leads ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={t('sfa.visitStatus')} subtitle={t('sfa.last30Days')}>
                {(dashboard.visitStats || []).length > 0 ? (() => {
                  const visitColors: Record<string,string> = { completed: '#10b981', in_progress: '#3b82f6', planned: '#f59e0b', cancelled: '#ef4444', missed: '#6b7280' };
                  const totalVisits = (dashboard.visitStats || []).reduce((s: number, v: any) => s + parseInt(v.count), 0);
                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-40 h-40 shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={(dashboard.visitStats || []).map((v: any) => ({ name: v.status, value: parseInt(v.count), fill: visitColors[v.status] || CHART_COLORS[0] }))}
                              cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>
                              {(dashboard.visitStats || []).map((v: any, i: number) => <Cell key={i} fill={visitColors[v.status] || CHART_COLORS[0]} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-extrabold text-gray-900">{totalVisits}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Visit</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full divide-y divide-gray-50">
                        {(dashboard.visitStats || []).map((v: any, i: number) => (
                          <ChartLegendItem key={i} color={visitColors[v.status] || CHART_COLORS[i]} label={v.status ? v.status.replace('_', ' ') : 'Unknown'} value={parseInt(v.count)} total={totalVisits} />
                        ))}
                      </div>
                    </div>
                  );
                })() : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><Navigation className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noVisitData')}</span></div>}
              </ChartCard>

              {/* Top Leads */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.topLeads')}</h3>
                <p className="text-xs text-gray-400 mb-4">{t('sfa.topLeadsSub')}</p>
                {(dashboard.topLeads || []).length > 0 ? (
                  <div className="space-y-3">
                    {(dashboard.topLeads || []).slice(0, 5).map((l: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{l.company_name || l.contact_name}</p>
                          <p className="text-[10px] text-gray-400">{l.industry || l.source || '-'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{fmtCur(parseFloat(l.estimated_value || 0))}</p>
                          <Badge color={l.status === 'converted' ? 'green' : l.status === 'lost' ? 'red' : l.priority === 'high' ? 'yellow' : 'blue'}>{t(`sfa.${LEAD_STATUS[l.status]?.tKey}`) || l.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-8 text-gray-300 text-sm">{t('sfa.noLeadData')}</div>}
              </Card>
            </div>

            {/* ── Teams & Targets Summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: t('sfa.activeTeams'), value: fmt(dashboard.activeTeams), icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
                { label: t('sfa.targetGroupsLabel'), value: fmt(dashboard.targetGroups), icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: t('sfa.assignmentsLabel'), value: fmt(dashboard.targetAssignments), icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: t('sfa.activeIncentives'), value: fmt(dashboard.incentiveSchemes), icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: t('sfa.coverageLabel'), value: fmt(dashboard.totalCoverage), icon: MapPin, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                { label: t('sfa.surveyLabel'), value: fmt(dashboard.surveysCompleted), icon: ClipboardList, color: 'text-pink-500', bg: 'bg-pink-50' },
              ].map((m, i) => (
                <Card key={i} className="p-3 text-center">
                  <div className={`w-8 h-8 rounded-lg ${m.bg} ${m.color} flex items-center justify-center mx-auto mb-2`}><m.icon className="w-4 h-4" /></div>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{m.label}</p>
                </Card>
              ))}
            </div>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* LEADS */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'leads' && (<>
            <SectionHeader title={t('sfa.leadManagement')} subtitle={`${filteredLeads.length} leads`}
              action={<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" /><input className={`${inputCls} pl-10 !py-2`} placeholder={t('sfa.searchLead')} value={search} onChange={e => setSearch(e.target.value)} /></div>
                <PrimaryBtn onClick={() => { setModal('lead'); setForm({}); }} icon={Plus}>{t('sfa.addLead')}</PrimaryBtn>
              </div>} />

            {/* Lead Stats Bar */}
            {!selectedItem && leads.length > 0 && (() => {
              const statusCounts = leads.reduce((a: any, l: any) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
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
                      <div className="flex justify-between"><span className="text-xs text-gray-500">{t('sfa.totalEstimate')}</span><span className="text-sm font-bold text-emerald-600">{fmtCur(leads.reduce((s: number, l: any) => s + parseFloat(l.estimated_value || 0), 0))}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-gray-500">{t('sfa.avgScore')}</span><span className="text-sm font-bold text-amber-600">{(leads.reduce((s: number, l: any) => s + (l.score || 0), 0) / total).toFixed(0)}</span></div>
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
                      <button onClick={() => handleConvertLead(selectedItem)} className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 shadow-sm transition-all"><ArrowRight className="w-4 h-4" /> Convert</button>
                    )}
                    {canDelete && <button onClick={() => handleDeleteLead(selectedItem.id)} className="p-2.5 rounded-xl border border-gray-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                    <button onClick={() => setSelectedItem(null)} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    {[{ icon: Phone, val: selectedItem.contact_phone || '-' }, { icon: Mail, val: selectedItem.contact_email || '-' }, { icon: MapPin, val: `${selectedItem.city || '-'}, ${selectedItem.province || '-'}` }].map((r, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm"><div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0"><r.icon className="w-4 h-4 text-gray-400" /></div><span className="text-gray-700">{r.val}</span></div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50"><span className="text-xs text-gray-500">{t('sfa.estimatedValue')}</span><span className="text-sm font-bold text-emerald-600">{fmtCur(parseFloat(selectedItem.estimated_value))}</span></div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50"><span className="text-xs text-gray-500">{t('sfa.leadScore')}</span><div className="flex items-center gap-2"><div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${selectedItem.score}%` }} /></div><span className="text-sm font-bold text-gray-700">{selectedItem.score}</span></div></div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('sfa.territory')}</span><span className="text-sm font-medium text-gray-700">{selectedItem.territory_name || '-'}</span></div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('sfa.changeStatus')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(LEAD_STATUS).map(([k, v]) => (
                      <button key={k} disabled={selectedItem.status === k} onClick={() => handleUpdateLeadStatus(selectedItem, k)}
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
                        <tr key={l.id} className="hover:bg-amber-50/30 cursor-pointer group transition-colors" onClick={() => setSelectedItem(l)}>
                          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{(l.company_name || l.contact_name || '?')[0].toUpperCase()}</div><div><div className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{l.company_name || l.contact_name}</div><div className="text-xs text-gray-400 mt-0.5">{l.lead_number}</div></div></div></td>
                          <td className="px-5 py-4 hidden sm:table-cell"><div className="text-gray-700">{l.contact_name}</div><div className="text-xs text-gray-400">{l.contact_email}</div></td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg font-medium ${LEAD_STATUS[l.status]?.color || ''}`}>{t(`sfa.${LEAD_STATUS[l.status]?.tKey}`) || l.status}</span></td>
                          <td className="px-5 py-4 text-right hidden md:table-cell"><span className="font-semibold text-gray-900">{fmtCur(parseFloat(l.estimated_value))}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><div className="flex items-center gap-2 justify-end"><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${l.score}%` }} /></div><span className="text-xs font-medium text-gray-500 w-6 text-right">{l.score}</span></div></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </TableWrap>
            )}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* PIPELINE */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'pipeline' && (<>
            <SectionHeader title={t('sfa.salesPipeline')} subtitle={`Total: ${fmtCur(pipelineData?.totalValue || 0)} (${pipelineData?.totalCount || 0} deals) | Weighted: ${fmtCur(pipelineData?.weightedValue || 0)}`}
              action={<PrimaryBtn onClick={() => { setModal('opportunity'); setForm({}); }} icon={Plus}>{t('sfa.addBtn')}</PrimaryBtn>} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(OPP_STAGES).map(([stage, info]) => {
                const d = (pipelineData?.stages || []).find((s: any) => s.stage === stage);
                return (
                  <Card key={stage} className="p-4 text-center group hover:shadow-md transition-all">
                    <div className={`w-full h-1 rounded-full bg-gradient-to-r ${info.gradient} mb-4 group-hover:h-1.5 transition-all`} />
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{t(`sfa.${info.tKey}`)}</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1">{d?.count || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtCur(parseFloat(d?.value || 0))}</p>
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
                        <td className="px-5 py-4"><select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" value={o.stage} onChange={e => handleUpdateOppStage(o, e.target.value)}>{Object.entries(OPP_STAGES).map(([k, v]) => <option key={k} value={k}>{t(`sfa.${v.tKey}`)}</option>)}</select></td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600">{fmtCur(parseFloat(o.expected_value))}</td>
                        <td className="px-5 py-4 text-right text-gray-500 hidden md:table-cell">{fmtDate(o.expected_close_date)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* TEAMS & TERRITORY (merged from Enhanced) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'teams' && (<>
            <SectionHeader title={t('sfa.teamFieldForce')} subtitle={`${teams.length} ${t('sfa.statTeams').toLowerCase()} | ${territories.length} territory`}
              action={<div className="flex gap-2">
                <PrimaryBtn onClick={() => { setModal('create-team'); setForm({ team_type: 'field_force' }); }} icon={Plus}>{t('sfa.createTeam')}</PrimaryBtn>
              </div>} />

            {/* HRIS Sync Status Banner */}
            {hrisSyncStatus && (
              <Card className="mb-4 !bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-violet-600" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{t('sfa.hrisIntegration')}</h3>
                      <p className="text-xs text-gray-500">{hrisSyncStatus.activeHrisEmployees} karyawan aktif | {hrisSyncStatus.syncedToSfa} sudah di SFA | {hrisSyncStatus.unsyncedCount} belum assign</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><div className="text-lg font-bold text-violet-600">{hrisSyncStatus.sfaTeams}</div><div className="text-[10px] text-gray-400">Tim</div></div>
                      <div><div className="text-lg font-bold text-blue-600">{hrisSyncStatus.sfaMembers}</div><div className="text-[10px] text-gray-400">Member</div></div>
                      <div><div className="text-lg font-bold text-amber-600">{hrisSyncStatus.unsyncedCount}</div><div className="text-[10px] text-gray-400">Belum Sync</div></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* HRIS Department Quick-Sync */}
            {isManager && hrisDepartments.length > 0 && (
              <Card className="mb-4">
                <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-violet-500" /> {t('sfa.syncFromHris')}</h4>
                <p className="text-xs text-gray-500 mb-3">{t('sfa.syncFromHrisDesc')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {hrisDepartments.map((d: any) => (
                    <button key={d.department} disabled={hrisSyncing}
                      onClick={async () => {
                        if (!confirm(`Buat tim dari department "${d.department}" dan sync ${d.active_count} karyawan?`)) return;
                        setHrisSyncing(true);
                        const r = await (await fetch('/api/hq/sfa/hris-sync?action=create-team-from-dept', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ department: d.department, auto_sync_members: true }),
                        })).json();
                        if (r.success) showToast(r.message); else showToast(r.error || 'Gagal');
                        setHrisSyncing(false); fetchData();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-left disabled:opacity-50"
                    >
                      <div>
                        <div className="text-xs font-medium text-gray-900">{d.department}</div>
                        <div className="text-[10px] text-gray-400">{d.active_count} karyawan aktif</div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Teams Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.length === 0 ? <div className="col-span-3"><EmptyState icon={Users} title={t('sfa.noTeams')} /></div> :
                teams.map((team: any) => (
                  <Card key={team.id} className="p-5" hover>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{(team.name || '?')[0]}</div>
                        <div><h3 className="font-semibold text-gray-900 text-sm">{team.name}</h3><p className="text-[11px] text-gray-400 mt-0.5">{team.code} | {team.team_type}</p></div>
                      </div>
                      <Badge color={team.is_active ? 'green' : 'gray'}>{team.is_active ? 'Active' : 'Off'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {team.member_count || 0} anggota</div>
                      {team.leader_name && <div className="text-gray-400">| Leader: <span className="text-gray-600 font-medium">{team.leader_name}</span></div>}
                    </div>
                    {/* Add Member Button */}
                    {isManager && (
                      <button onClick={() => { setModal('add-member'); setForm({ team_id: team.id, team_name: team.name, role: 'member' }); }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all">
                        <Plus className="w-3 h-3" /> {t('sfa.addMember')}
                      </button>
                    )}
                  </Card>
                ))
              }
            </div>

            {/* Available Users from HRIS */}
            {isManager && hrisAvailableUsers.length > 0 && (
              <>
                <SectionHeader title={t('sfa.availableEmployees')} subtitle={`${hrisAvailableUsers.filter((u: any) => !u.current_team).length} ${t('sfa.notAssignedYet')}`} />
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden sm:table-cell">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Posisi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tim SFA</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {hrisAvailableUsers.slice(0, 15).map((u: any) => (
                        <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{u.name}</div>
                            <div className="text-[10px] text-gray-400">{u.email}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell text-xs">{u.hris_department || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">{u.hris_position || u.role}</td>
                          <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === 'manager' || u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                          <td className="px-4 py-3">
                            {u.current_team ? <span className="text-xs text-green-600 font-medium">{u.current_team}</span> :
                              <span className="text-xs text-gray-400">{t('sfa.notAssignedYet')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </>
            )}

            {territories.length > 0 && (<>
              <SectionHeader title="Territory" subtitle={`${territories.length} wilayah`} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Region</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Kota</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Provinsi</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {territories.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-medium">{t.code}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{t.name}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{t.region || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{t.city || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell">{t.province || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* VISITS & COVERAGE (merged Core visits + Advanced coverage) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'visits' && (<>
            <SectionHeader title={t('sfa.visitsCoverage')} subtitle={`${visits.length} ${t('sfa.visits').toLowerCase()} | ${coveragePlans.length} coverage plans`}
              action={<PrimaryBtn onClick={() => { setModal('visit'); setForm({ visit_date: new Date().toISOString().split('T')[0] }); }} icon={Plus}>{t('sfa.scheduleBtn')}</PrimaryBtn>} />

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
                  <button
                    type="button"
                    onClick={() => { setTab('field-tasks'); setSearch(''); setSelectedItem(null); }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shrink-0"
                  >
                    <CalendarDays className="w-4 h-4" />
                    {t('sfa.openVisitPlanTasks')}
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
              const vStatusCounts = visits.reduce((a: any, v: any) => { a[v.status] = (a[v.status] || 0) + 1; return a; }, {});
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
                {coveragePlans.map((cp: any) => (
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
                            {v.purpose || v.visit_type} | {fmtDate(v.visit_date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {v.order_taken && <Badge color="green">Order: {fmtCur(parseFloat(v.order_value))}</Badge>}
                        <button onClick={() => {
                          const next: Record<string,string> = { planned: 'in_progress', in_progress: 'completed', completed: 'planned', cancelled: 'planned', missed: 'planned', checked_in: 'completed' };
                          const ns = next[v.status] || 'in_progress';
                          apiCore('update-visit', 'PUT', { id: v.id, status: ns }).then(r => { if (r.success) { showToast(`Visit → ${ns.replace('_',' ')}`); fetchData(); } else showToast(r.error || t('sfa.failedLabel')); });
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
                        {v.outcome && (
                          <p className="text-gray-700"><span className="text-gray-500 font-medium">{t('sfa.visitOutcome')}: </span>{v.outcome}</p>
                        )}
                        {v.outcome_notes && (
                          <p className="text-gray-700 whitespace-pre-wrap"><span className="text-gray-500 font-medium">{t('sfa.visitNotes')}: </span>{v.outcome_notes}</p>
                        )}
                        {v.feedback && (
                          <p className="text-gray-700 whitespace-pre-wrap"><span className="text-gray-500 font-medium">{t('sfa.visitFeedback')}: </span>{v.feedback}</p>
                        )}
                      </div>
                    )}
                  </Card>
                ))
              }
            </div>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* ORDERS & QUOTATIONS (merged Advanced field orders + Core quotations) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'orders' && (<>
            <SectionHeader title={t('sfa.fieldOrderQuotation')} subtitle={`${fieldOrders.length} orders | ${quotations.length} quotations`}
              action={<PrimaryBtn onClick={() => { setModal('field-order'); setForm({}); }} icon={Plus}>{t('sfa.createFieldOrder')}</PrimaryBtn>} />

            {/* Order Analytics */}
            {fieldOrders.length > 0 && (() => {
              const oStatusCounts = fieldOrders.reduce((a: any, fo: any) => { a[fo.status] = (a[fo.status] || 0) + 1; return a; }, {});
              const oColors: Record<string, string> = { approved: '#10b981', submitted: '#3b82f6', draft: '#94a3b8', rejected: '#ef4444', processing: '#f59e0b' };
              const totalRev = fieldOrders.reduce((s: number, fo: any) => s + (parseFloat(fo.total) || 0), 0);
              const approvedRev = fieldOrders.filter((fo: any) => fo.status === 'approved').reduce((s: number, fo: any) => s + (parseFloat(fo.total) || 0), 0);
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
                    fieldOrders.map((fo: any) => (
                      <tr key={fo.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-medium">{fo.order_number}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{fo.customer_name}</td>
                        <td className="px-5 py-3.5 text-right text-gray-600 hidden sm:table-cell">{fo.item_count}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmtCur(fo.total || 0)}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={fo.status === 'approved' ? 'green' : fo.status === 'rejected' ? 'red' : fo.status === 'submitted' ? 'blue' : 'gray'}>{fo.status}</Badge></td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fo.order_date}</td>
                        <td className="px-5 py-3.5">{canApprove && (fo.status === 'draft' || fo.status === 'submitted') && (<div className="flex gap-1.5"><button onClick={() => handleUpdateFoStatus(fo.id, 'approved')} className="px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors">{t('sfa.approveBtn')}</button><button onClick={() => handleUpdateFoStatus(fo.id, 'rejected')} className="px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors">{t('sfa.rejectBtn')}</button></div>)}</td>
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
                    {quotations.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{q.quotation_number}</td>
                        <td className="px-5 py-3.5 text-gray-600">{q.customer_name}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={q.status === 'approved' ? 'green' : q.status === 'sent' ? 'blue' : q.status === 'rejected' ? 'red' : 'gray'}>{q.status}</Badge></td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmtCur(parseFloat(q.total))}</td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fmtDate(q.valid_until)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* SALES MANAGEMENT (Retail · FMCG · Direct Sales) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'sales-mgmt' && (
            <SalesManagementModule
              fmtCur={fmtCur}
              fmtDate={fmtDate}
              fmtNum={fmt}
              canManage={isManager}
            />
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TARGET & ACHIEVEMENT (from Enhanced - replaces basic Core targets) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'targets' && (<>
            <SectionHeader title={t('sfa.targetGroupsTitle')} subtitle={t('sfa.targetGroupsSub')} />
            <div className="grid sm:grid-cols-2 gap-4">
                {targetGroups.length === 0 ? <div className="col-span-2"><EmptyState icon={Target} title={t('sfa.noTargetGroup')} /></div> :
                targetGroups.map((tg: any) => (
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
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* INCENTIVES & COMMISSIONS (merged Enhanced incentives + Advanced commissions) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'incentives' && (<>
            {/* Sub-tab navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              {([['overview',`📊 ${t('sfa.incOverview')}`],['product',`🏷️ ${t('sfa.incProductComm')}`],['group',`📦 ${t('sfa.incGroupComm')}`],['outlet',`🏪 ${t('sfa.incOutletTarget')}`],['strategy',`🎯 ${t('sfa.incSalesStrategy')}`]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setIncSubTab(k as any)} className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${incSubTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {incSubTab === 'overview' && (<>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-blue-200" onClick={() => setIncSubTab('product')} hover>
                  <div className="text-2xl font-bold text-blue-600">{commSummary?.product_commissions?.active || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('sfa.activeProductComm')}</div>
                </Card>
                <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-purple-200" onClick={() => setIncSubTab('group')} hover>
                  <div className="text-2xl font-bold text-purple-600">{commSummary?.commission_groups?.active || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('sfa.activeGroupComm')}</div>
                </Card>
                <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-amber-200" onClick={() => setIncSubTab('outlet')} hover>
                  <div className="text-2xl font-bold text-amber-600">{commSummary?.outlet_targets?.total || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('sfa.incOutletTarget')}</div>
                </Card>
                <Card className="p-4 text-center cursor-pointer hover:ring-2 ring-emerald-200" onClick={() => setIncSubTab('strategy')} hover>
                  <div className="text-2xl font-bold text-emerald-600">{commSummary?.strategies?.active || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('sfa.activeSalesStrategy')}</div>
                </Card>
              </div>
              <SectionHeader title={t('sfa.incentiveSchemes')} />
              <div className="grid sm:grid-cols-2 gap-4">
                {incentiveSchemes.length === 0 ? <div className="col-span-2"><EmptyState icon={Award} title={t('sfa.noIncentiveScheme')} /></div> :
                  incentiveSchemes.map((s: any) => (
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
            </>)}

            {/* ── KOMISI PRODUK ── */}
            {incSubTab === 'product' && (<>
              <SectionHeader title={t('sfa.productCommission')} action={<PrimaryBtn onClick={() => { setModal('commission'); setForm({ commission_type: 'percentage', commission_rate: 0 }); }} icon={Plus}>{t('sfa.addCommission')}</PrimaryBtn>} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produk</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">SKU</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {commissions.length === 0 ? <tr><td colSpan={5}><EmptyState icon={Award} title={t('sfa.noProductComm')} /></td></tr> :
                      commissions.map((pc: any) => (
                        <tr key={pc.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-gray-900">{pc.product_name}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-gray-400 hidden sm:table-cell">{pc.product_sku || '-'}</td>
                          <td className="px-5 py-3.5 text-center"><Badge>{pc.commission_type}</Badge></td>
                          <td className="px-5 py-3.5 text-right font-bold text-gray-900">{pc.commission_rate}%</td>
                          <td className="px-5 py-3.5 text-center"><Badge color={pc.is_active ? 'green' : 'gray'}>{pc.is_active ? 'Active' : 'Off'}</Badge></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </TableWrap>
            </>)}

            {/* ── KOMISI GROUP (Bundle/Cross-sell) ── */}
            {incSubTab === 'group' && (<>
              <SectionHeader title={t('sfa.groupCommTitle')} subtitle={t('sfa.groupCommSub')} action={<PrimaryBtn onClick={() => { setModal('commission-group'); setForm({ group_type: 'bundle', calculation_method: 'flat', bonus_amount: 0, products: [] }); }} icon={Plus}>{t('sfa.addGroup')}</PrimaryBtn>} />
              {commissionGroups.length === 0 ? <EmptyState icon={Award} title={t('sfa.noGroupComm')} subtitle={t('sfa.noGroupCommSub')} /> :
                <div className="grid sm:grid-cols-2 gap-4">
                  {commissionGroups.map((g: any) => (
                    <Card key={g.id} className="p-5" hover>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge color={g.group_type === 'bundle' ? 'blue' : g.group_type === 'cross_sell' ? 'purple' : 'amber'}>{g.group_type}</Badge>
                            <span className="font-semibold text-sm text-gray-900">{g.name}</span>
                          </div>
                          <p className="text-xs text-gray-400">{g.code} | {g.period_type}</p>
                        </div>
                        <Badge color={g.is_active ? 'green' : 'gray'}>{g.is_active ? 'Active' : 'Off'}</Badge>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">{t('sfa.productsInGroup')}</div>
                        <div className="space-y-1">
                          {(g.products || []).map((p: any, pi: number) => (
                            <div key={pi} className="flex justify-between text-xs">
                              <span className="text-gray-700">{p.product_name} <span className="text-gray-400">({p.product_sku})</span></span>
                              <span className="text-gray-500">min. {p.min_quantity} pcs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{t('sfa.bonusLabel')}</span>
                        <span className="font-bold text-emerald-600">
                          {g.calculation_method === 'flat' ? fmtCur(Number(g.bonus_amount)) : `${g.bonus_percentage}%`}
                        </span>
                      </div>
                      {(Number(g.min_total_quantity) > 0 || Number(g.min_total_value) > 0) && (
                        <div className="flex gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                          {Number(g.min_total_quantity) > 0 && <span>Min Qty: {g.min_total_quantity}</span>}
                          {Number(g.min_total_value) > 0 && <span>Min Value: {fmtCur(Number(g.min_total_value))}</span>}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              }
            </>)}

            {/* ── TARGET OUTLET per Produk ── */}
            {incSubTab === 'outlet' && (<>
              <SectionHeader title={t('sfa.outletTargetTitle')} subtitle={t('sfa.outletTargetSub')} action={<PrimaryBtn onClick={() => { setModal('outlet-target'); setForm({ target_type: 'outlet_count', period_type: 'monthly', bronze_threshold_pct: 60, silver_threshold_pct: 80, gold_threshold_pct: 100, platinum_threshold_pct: 120 }); }} icon={Plus}>{t('sfa.addTarget')}</PrimaryBtn>} />
              {outletTargets.length === 0 ? <EmptyState icon={Target} title={t('sfa.noOutletTarget')} subtitle={t('sfa.noOutletTargetSub')} /> :
                <div className="space-y-4">
                  {outletTargets.map((ot: any) => {
                    const pct = Number(ot.achievement_pct) || 0;
                    const tier = pct >= Number(ot.platinum_threshold_pct) ? 'platinum' : pct >= Number(ot.gold_threshold_pct) ? 'gold' : pct >= Number(ot.silver_threshold_pct) ? 'silver' : pct >= Number(ot.bronze_threshold_pct) ? 'bronze' : 'below';
                    const tierColor: Record<string, string> = { platinum: 'bg-purple-100 text-purple-700', gold: 'bg-amber-100 text-amber-700', silver: 'bg-gray-200 text-gray-700', bronze: 'bg-orange-100 text-orange-700', below: 'bg-red-100 text-red-700' };
                    const barColor: Record<string, string> = { platinum: 'bg-purple-500', gold: 'bg-amber-500', silver: 'bg-gray-400', bronze: 'bg-orange-500', below: 'bg-red-400' };
                    return (
                      <Card key={ot.id} className="p-5" hover>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">{ot.product_name}</h4>
                            <p className="text-xs text-gray-400">{ot.code} | {ot.product_sku || '-'} | {ot.target_type.replace('_', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierColor[tier]}`}>{tier.toUpperCase()}</span>
                            <span className="text-xs text-gray-400">{ot.period}/{ot.year}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Achieved: <strong>{ot.achieved_value || 0}</strong> / {ot.target_value} outlets</span>
                              <span className="font-bold">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div className={`h-2.5 rounded-full transition-all ${barColor[tier]}`} style={{ width: `${Math.min(pct, 150)}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {(['bronze', 'silver', 'gold', 'platinum'] as const).map(t => (
                            <div key={t} className={`rounded-lg p-2 ${tier === t ? 'ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50'}`}>
                              <div className="text-[10px] text-gray-400 uppercase">{t}</div>
                              <div className="text-xs font-bold text-gray-700">≥{ot[`${t}_threshold_pct`]}%</div>
                              <div className="text-[10px] text-emerald-600 font-medium">{fmtCur(Number(ot[`${t}_bonus`]))}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              }
            </>)}

            {/* ── SALES STRATEGY ── */}
            {incSubTab === 'strategy' && (<>
              <SectionHeader title={t('sfa.salesStrategyTitle')} subtitle={t('sfa.salesStrategySub')} action={<PrimaryBtn onClick={() => { setModal('sales-strategy'); setForm({ strategy_type: 'balanced', period_type: 'monthly', kpis: [{ kpi_name: '', kpi_type: 'revenue', target_value: 0, weight: 0, unit: '' }] }); }} icon={Plus}>{t('sfa.createStrategy')}</PrimaryBtn>} />
              {salesStrategies.length === 0 ? <EmptyState icon={Target} title={t('sfa.noSalesStrategy')} subtitle={t('sfa.noSalesStrategySub')} /> :
                <div className="space-y-4">
                  {salesStrategies.map((st: any) => (
                    <Card key={st.id} className="p-5" hover>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0"><Target className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{st.name}</h4>
                            <p className="text-xs text-gray-400">{st.code} | {st.strategy_type} | {st.period_type} {st.period}/{st.year}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={st.status === 'active' ? 'green' : st.status === 'draft' ? 'amber' : 'gray'}>{st.status}</Badge>
                          {st.status === 'draft' && (
                            <button onClick={async () => { const r = await apiAdv('activate-strategy', 'PUT', { id: st.id }); if (r.success) { showToast(t('sfa.strategyActivated')); fetchData(); } }} className="text-xs text-blue-600 hover:underline">{t('sfa.activateStrategy')}</button>
                          )}
                        </div>
                      </div>
                      {st.description && <p className="text-xs text-gray-500 mb-3">{st.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{st.kpi_count || 0} KPIs</span>
                        <span>|</span>
                        <span>{t('sfa.totalWeight')}: {st.total_weight}%</span>
                        <span>|</span>
                        <span>Score: <strong className="text-gray-700">{Number(st.overall_score).toFixed(1)}%</strong></span>
                      </div>
                    </Card>
                  ))}
                </div>
              }
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* MERCHANDISING (from Advanced) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'merchandising' && (<>
            <SectionHeader title={t('sfa.displayAudit')} subtitle={`${displayAudits.length} audit records`} />

            {/* Merchandising Analytics */}
            {displayAudits.length > 0 && (() => {
              const avgScore = displayAudits.reduce((s: number, d: any) => s + parseFloat(d.overall_score || 0), 0) / displayAudits.length;
              const avgComp = displayAudits.reduce((s: number, d: any) => s + parseFloat(d.compliance_pct || 0), 0) / displayAudits.length;
              const highComp = displayAudits.filter((d: any) => parseFloat(d.compliance_pct || 0) >= 85).length;
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.complianceScoreTitle')}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t('sfa.complianceScoreSub')}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={displayAudits.slice(0, 12).map((d: any) => ({ name: (d.customer_name || 'N/A').substring(0, 10), score: parseFloat(d.overall_score || 0), compliance: parseFloat(d.compliance_pct || 0) }))} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="compliance" name="Compliance %" radius={[6, 6, 0, 0]} maxBarSize={30}>
                          {displayAudits.slice(0, 12).map((d: any, i: number) => <Cell key={i} fill={parseFloat(d.compliance_pct || 0) >= 85 ? '#10b981' : parseFloat(d.compliance_pct || 0) >= 60 ? '#f59e0b' : '#ef4444'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('sfa.summaryTitle')}</h3>
                    <div className="space-y-4">
                      <div className="text-center p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}%</p><p className="text-[10px] text-gray-500 mt-1">Avg Score</p></div>
                      <div className="text-center p-3 bg-emerald-50 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{avgComp.toFixed(1)}%</p><p className="text-[10px] text-gray-500 mt-1">Avg Compliance</p></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-500">High Compliance (&ge;85%)</span><span className="font-bold text-emerald-600">{highComp}/{displayAudits.length}</span></div>
                    </div>
                  </Card>
                </div>
              );
            })()}

            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tipe Toko</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Compliance</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tanggal</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {displayAudits.length === 0 ? <tr><td colSpan={5}><EmptyState icon={Eye} title={t('sfa.noAudit')} /></td></tr> :
                    displayAudits.map((da: any) => (
                      <tr key={da.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5"><div className="font-semibold text-gray-900">{da.customer_name || '-'}</div><div className="text-xs text-gray-400 sm:hidden">{da.store_type || '-'}</div></td>
                        <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{da.store_type || '-'}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{parseFloat(da.overall_score || 0).toFixed(1)}%</td>
                        <td className="px-5 py-3.5 text-right"><Badge color={parseFloat(da.compliance_pct) >= 85 ? 'green' : parseFloat(da.compliance_pct) >= 60 ? 'yellow' : 'red'}>{parseFloat(da.compliance_pct || 0).toFixed(1)}%</Badge></td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{da.audit_date}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* COMPETITOR (from Advanced) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'competitor' && (<>
            <SectionHeader title={t('sfa.competitorActivity')} subtitle={`${competitors.length} ${t('sfa.noReport').includes('laporan') ? 'laporan' : 'reports'}`}
              action={<PrimaryBtn onClick={() => { setModal('competitor'); setForm({ activity_type: 'promotion', impact_level: 'medium' }); }} icon={Plus}>{t('sfa.reportBtn')}</PrimaryBtn>} />
            {/* Competitor Analytics */}
            {competitors.length > 0 && (() => {
              const typeCounts = competitors.reduce((a: any, c: any) => { a[c.activity_type] = (a[c.activity_type] || 0) + 1; return a; }, {});
              const impactCounts = competitors.reduce((a: any, c: any) => { a[c.impact_level] = (a[c.impact_level] || 0) + 1; return a; }, {});
              const impColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.activityPerType')}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t('sfa.activityPerTypeSub')}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={Object.entries(typeCounts).map(([t, c]) => ({ name: t.replace('_', ' '), count: c as number }))} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Laporan" radius={[6, 6, 0, 0]} maxBarSize={40}>
                          {Object.keys(typeCounts).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.impactLevel')}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t('sfa.impactLevelSub')}</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-36 h-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={Object.entries(impactCounts).map(([l, c]) => ({ name: l, value: c as number, fill: impColors[l] || '#94a3b8' }))}
                              cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={4} dataKey="value" strokeWidth={0}>
                              {Object.keys(impactCounts).map((k, i) => <Cell key={i} fill={impColors[k] || '#94a3b8'} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        {Object.entries(impactCounts).map(([l, c]: any, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: impColors[l] || '#94a3b8' }} /><span className="text-gray-600 capitalize">{l}</span></div>
                            <span className="font-bold text-gray-900">{c} laporan</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                          <span className="text-gray-400">{t('sfa.resolved')}</span>
                          <span className="font-bold text-emerald-600">{competitors.filter((c: any) => c.resolved).length}/{competitors.length}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {competitorSummary.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {competitorSummary.slice(0, 6).map((cs: any, i: number) => (
                  <Card key={i} className="p-4" hover>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm text-gray-900">{cs.competitor_name}</h3>
                      {parseInt(cs.high_impact_count) > 0 && <Badge color="red">{cs.high_impact_count} High</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <div>Laporan: <span className="font-semibold text-gray-700">{cs.report_count}</span></div>
                      <div>Unresolved: <span className={`font-semibold ${parseInt(cs.unresolved_count) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{cs.unresolved_count}</span></div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kompetitor</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Deskripsi</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Impact</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {competitors.length === 0 ? <tr><td colSpan={5}><EmptyState icon={Swords} title={t('sfa.noReport')} /></td></tr> :
                    competitors.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{c.competitor_name}</td>
                        <td className="px-5 py-3.5"><Badge>{c.activity_type}</Badge></td>
                        <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate hidden sm:table-cell">{c.description || '-'}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={c.impact_level === 'high' ? 'red' : c.impact_level === 'medium' ? 'yellow' : 'green'}>{c.impact_level}</Badge></td>
                        <td className="px-5 py-3.5 text-center"><button onClick={() => {
                          apiAdv('update-competitor-activity', 'PUT', { id: c.id, resolved: !c.resolved }).then(r => { if (r.success) { showToast(c.resolved ? t('sfa.reopened') : t('sfa.resolved')); fetchData(); } else showToast(r.error || t('sfa.failedLabel')); });
                        }} title="Klik untuk toggle status"><Badge color={c.resolved ? 'green' : 'yellow'}>{c.resolved ? 'Resolved' : 'Open'}</Badge></button></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* SURVEY (from Advanced) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'survey' && (<>
            <SectionHeader title={t('sfa.surveyTitle')} subtitle={`${surveyTemplates.length} template | ${surveyResponses.length} responses`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveyTemplates.length === 0 ? <div className="col-span-3"><EmptyState icon={ClipboardList} title={t('sfa.noSurvey')} /></div> :
                surveyTemplates.map((st: any) => (
                  <Card key={st.id} className="p-5" hover>
                    <div className="flex items-center justify-between mb-3">
                      <Badge color={st.status === 'active' ? 'green' : 'gray'}>{st.status}</Badge>
                      <span className="text-xs text-gray-400 font-medium">{st.response_count} resp</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{st.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{st.description}</p>
                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                      <span>{st.question_count} pertanyaan</span><span>~{st.estimated_minutes} mnt</span>
                    </div>
                  </Card>
                ))
              }
            </div>
            {surveyResponses.length > 0 && (<>
              <SectionHeader title={t('sfa.recentResponses')} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Survey</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Respondent</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {surveyResponses.map((sr: any) => (
                      <tr key={sr.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{sr.survey_title || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{sr.respondent_name || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{sr.customer_name || '-'}</td>
                        <td className="px-5 py-3.5 text-right font-bold">{sr.score ? `${sr.score}/5` : '-'}</td>
                        <td className="px-5 py-3.5 text-gray-500">{sr.response_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* APPROVAL (from Advanced) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'approval' && (<>
            <SectionHeader title={t('sfa.approvalWorkflow')} subtitle={`${approvalWorkflows.length} workflow | ${approvalRequests.length} requests`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {approvalWorkflows.length === 0 ? <div className="col-span-4"><EmptyState icon={CheckCircle} title={t('sfa.noWorkflow')} /></div> :
                approvalWorkflows.map((aw: any) => (
                  <Card key={aw.id} className="p-4" hover>
                    <h3 className="font-semibold text-sm text-gray-900">{aw.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{aw.description}</p>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 text-xs items-center flex-wrap">
                      <Badge>{aw.entity_type}</Badge>
                      <span className="text-gray-400">{aw.step_count} step</span>
                      {parseInt(aw.pending_count) > 0 && <Badge color="yellow">{aw.pending_count} pending</Badge>}
                    </div>
                  </Card>
                ))
              }
            </div>
            <SectionHeader title={t('sfa.approvalRequests')} />
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Nominal</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Step</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-5 py-3.5"></th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {approvalRequests.length === 0 ? <tr><td colSpan={5}><EmptyState icon={CheckCircle} title={t('sfa.noRequest')} /></td></tr> :
                    approvalRequests.map((ar: any) => (
                      <tr key={ar.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5"><Badge>{ar.entity_type}</Badge><span className="text-xs text-gray-400 ml-2">{ar.entity_number || ''}</span></td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900 hidden sm:table-cell">{ar.amount ? fmtCur(ar.amount) : '-'}</td>
                        <td className="px-5 py-3.5 text-center text-sm font-medium text-gray-600">{ar.current_step}/{ar.total_steps}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={ar.status === 'approved' ? 'green' : ar.status === 'rejected' ? 'red' : 'yellow'}>{ar.status}</Badge></td>
                        <td className="px-5 py-3.5">{canApprove && ar.status === 'pending' && (<div className="flex gap-1.5"><button onClick={() => handleApproval(ar.id, 'approved')} className="px-2.5 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors">{t('sfa.approveBtn')}</button><button onClick={() => handleApproval(ar.id, 'rejected')} className="px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors">{t('sfa.rejectBtn')}</button></div>)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* SETTINGS (merged Plafon + Geofence + Parameters) */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'settings' && (<>
            <SectionHeader title={t('sfa.settingsTitle')} subtitle={t('sfa.settingsSub')} />

            {/* Settings sub-tab navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
              {([['master',t('sfa.settMasterData')],['currency',t('sfa.settMultiCurrency')],['tax',t('sfa.settTax')],['numbering',t('sfa.settNumbering')],['payment',t('sfa.settPayment')],['business',t('sfa.settBusiness')]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setSettSubTab(k as any)} className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-lg transition-all ${settSubTab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
              ))}
            </div>

            {/* ── MULTI-CURRENCY ── */}
            {settSubTab === 'currency' && (<>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 text-center" hover><div className="text-2xl font-bold text-blue-600">{settingsOverview?.currencies?.active || 0}</div><div className="text-xs text-gray-500 mt-1">{t('sfa.activeCurrencies')}</div></Card>
                <Card className="p-4 text-center" hover><div className="text-2xl font-bold text-purple-600">{settingsOverview?.rates?.total || 0}</div><div className="text-xs text-gray-500 mt-1">{t('sfa.activeRates')}</div></Card>
                <Card className="p-4 text-center" hover><div className="text-lg font-bold text-emerald-600">{settingsOverview?.defaultCurrency?.code || 'IDR'}</div><div className="text-xs text-gray-500 mt-1">Default: {settingsOverview?.defaultCurrency?.symbol || 'Rp'}</div></Card>
                <Card className="p-4 text-center" hover><div className="text-lg font-bold text-amber-600">{currencies.filter((c: any) => c.is_active).length}/{currencies.length}</div><div className="text-xs text-gray-500 mt-1">{t('sfa.activeSlashTotal')}</div></Card>
              </div>

              <SectionHeader title={t('sfa.currencyList')} action={<PrimaryBtn onClick={() => { setModal('add-currency'); setForm({ decimal_places: 2, symbol_position: 'before', thousand_separator: '.', decimal_separator: ',' }); }} icon={Plus}>{t('sfa.addCurrency')}</PrimaryBtn>} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Kode</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Nama</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Simbol</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Desimal</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Default</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {currencies.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-600">{c.code}</td>
                        <td className="px-5 py-3.5 text-gray-900">{c.name}</td>
                        <td className="px-5 py-3.5 text-center text-lg">{c.symbol}</td>
                        <td className="px-5 py-3.5 text-center text-gray-500 hidden sm:table-cell">{c.decimal_places}</td>
                        <td className="px-5 py-3.5 text-center">{c.is_default ? <Badge color="blue">Default</Badge> : <button onClick={async () => { await apiEnh('update-currency', 'PUT', { id: c.id, is_default: true }); fetchData(); }} className="text-xs text-gray-400 hover:text-blue-600">{t('sfa.setDefaultBtn')}</button>}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={c.is_active ? 'green' : 'gray'}>{c.is_active ? t('sfa.active') : t('sfa.offLabel')}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>

              <SectionHeader title={t('sfa.exchangeRate')} subtitle={t('sfa.exchangeRateSub')} action={<PrimaryBtn onClick={() => { setModal('add-rate'); setForm({ from_currency: 'USD', to_currency: 'IDR', source: 'manual' }); }} icon={Plus}>{t('sfa.addRate')}</PrimaryBtn>} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Dari</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">→</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Ke</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Berlaku</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Sumber</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {exchangeRates.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{r.from_currency}</td>
                        <td className="px-5 py-3.5 text-center text-gray-300">→</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{r.to_currency}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{Number(r.rate).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 text-center text-xs text-gray-400 hidden sm:table-cell">{r.effective_date}</td>
                        <td className="px-5 py-3.5 text-center hidden sm:table-cell"><Badge>{r.source}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}

            {/* ── TAX SETTINGS ── */}
            {settSubTab === 'tax' && (<>
              <SectionHeader title={t('sfa.taxSettings')} subtitle={t('sfa.taxSettingsSub')} action={<PrimaryBtn onClick={() => { setModal('add-tax'); setForm({ tax_type: 'vat', rate: 0, applies_to: 'all' }); }} icon={Plus}>{t('sfa.addTax')}</PrimaryBtn>} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Kode</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Nama</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Tipe</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Inklusif</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Default</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {taxSettings.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-amber-600">{t.code}</td>
                        <td className="px-5 py-3.5 text-gray-900">{t.name}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={t.tax_type === 'vat' ? 'blue' : t.tax_type === 'income' ? 'purple' : t.tax_type === 'withholding' ? 'amber' : 'gray'}>{t.tax_type}</Badge></td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{Number(t.rate)}%</td>
                        <td className="px-5 py-3.5 text-center hidden sm:table-cell">{t.is_inclusive ? <span className="text-emerald-600 font-medium">{t('sfa.yesLabel')}</span> : <span className="text-gray-400">{t('sfa.noLabel')}</span>}</td>
                        <td className="px-5 py-3.5 text-center">{t.is_default && <Badge color="blue">Default</Badge>}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? t('sfa.active') : t('sfa.offLabel')}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}

            {/* ── NUMBERING FORMATS ── */}
            {settSubTab === 'numbering' && (<>
              <SectionHeader title={t('sfa.numberingFormats')} subtitle={t('sfa.numberingFormatsSub')} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {numberingFormats.map((nf: any) => (
                  <Card key={nf.id} className="p-5" hover>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge color="blue">{nf.entity_type.replace('_', ' ')}</Badge>
                        <div className="mt-2 font-mono text-lg font-bold text-gray-900 tracking-wide">{nf.sample_output || '-'}</div>
                      </div>
                      <Badge color={nf.is_active ? 'green' : 'gray'}>{nf.is_active ? t('sfa.active') : t('sfa.offLabel')}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3 pt-3 border-t border-gray-100">
                      <div className="text-gray-400">Prefix</div><div className="font-mono font-medium text-gray-700">{nf.prefix || '-'}</div>
                      <div className="text-gray-400">Separator</div><div className="font-mono font-medium text-gray-700">{nf.separator || '-'}</div>
                      <div className="text-gray-400">{t('sfa.dateFormatLabel')}</div><div className="font-mono font-medium text-gray-700">{nf.date_format || '-'}</div>
                      <div className="text-gray-400">Digit Counter</div><div className="font-mono font-medium text-gray-700">{nf.counter_length}</div>
                      <div className="text-gray-400">Reset</div><div className="font-medium text-gray-700">{nf.reset_period}</div>
                      <div className="text-gray-400">{t('sfa.currentCounter')}</div><div className="font-mono font-medium text-gray-700">{nf.current_counter}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </>)}

            {/* ── PAYMENT TERMS ── */}
            {settSubTab === 'payment' && (<>
              <SectionHeader title={t('sfa.paymentTerms')} subtitle={t('sfa.paymentTermsSub')} action={<PrimaryBtn onClick={() => { setModal('add-payment-term'); setForm({ late_fee_type: 'none' }); }} icon={Plus}>{t('sfa.addPaymentTerm')}</PrimaryBtn>} />
              <div className="space-y-3">
                {paymentTerms.map((pt: any) => (
                  <Card key={pt.id} className="p-5" hover>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">{pt.code}</div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900">{pt.name}</h4>
                          {pt.description && <p className="text-xs text-gray-400 mt-0.5">{pt.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pt.is_default && <Badge color="blue">Default</Badge>}
                        <Badge color={pt.is_active ? 'green' : 'gray'}>{pt.is_active ? t('sfa.active') : t('sfa.offLabel')}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-100">
                      <div><div className="text-[10px] text-gray-400 uppercase mb-0.5">{t('sfa.dueDate')}</div><div className="text-sm font-bold text-gray-900">{pt.days_due === 0 ? t('sfa.immediate') : `${pt.days_due} ${t('sfa.daysLabel')}`}</div></div>
                      <div><div className="text-[10px] text-gray-400 uppercase mb-0.5">{t('sfa.earlyPayment')}</div><div className="text-sm font-medium text-gray-700">{Number(pt.discount_percentage) > 0 ? `${pt.discount_percentage}% jika ${pt.discount_days} hari` : '-'}</div></div>
                      <div><div className="text-[10px] text-gray-400 uppercase mb-0.5">{t('sfa.lateFee')}</div><div className="text-sm font-medium text-gray-700">{pt.late_fee_type === 'none' ? t('sfa.noneLabel') : pt.late_fee_type === 'percentage' ? `${pt.late_fee_value}%` : fmtCur(Number(pt.late_fee_value))}</div></div>
                      <div><div className="text-[10px] text-gray-400 uppercase mb-0.5">Status</div><div className="text-sm"><Badge color={pt.is_active ? 'green' : 'gray'}>{pt.is_active ? t('sfa.active') : t('sfa.offLabel')}</Badge></div></div>
                    </div>
                  </Card>
                ))}
              </div>
            </>)}

            {/* ── BUSINESS SETTINGS ── */}
            {settSubTab === 'business' && (<>
              <SectionHeader title={t('sfa.businessSettings')} subtitle={t('sfa.businessSettingsSub')} />
              {(() => {
                const grouped: Record<string, any[]> = {};
                bizSettings.forEach((s: any) => { if (!grouped[s.category]) grouped[s.category] = []; grouped[s.category].push(s); });
                const catLabels: Record<string, string> = { general: t('sfa.catGeneral'), sales: t('sfa.catSales'), commission: t('sfa.catCommission'), notification: t('sfa.catNotification'), approval: t('sfa.catApproval') };
                const catIcons: Record<string, string> = { general: 'from-blue-500 to-blue-600', sales: 'from-emerald-500 to-emerald-600', commission: 'from-amber-500 to-orange-500', notification: 'from-purple-500 to-purple-600', approval: 'from-red-500 to-red-600' };
                return Object.entries(grouped).map(([cat, items]) => (
                  <Card key={cat} className="p-0 overflow-hidden mb-4">
                    <div className={`px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50`}>
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${catIcons[cat] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}><Settings className="w-4 h-4 text-white" /></div>
                      <div><h4 className="text-sm font-bold text-gray-900">{catLabels[cat] || cat}</h4><p className="text-[11px] text-gray-400 mt-0.5">{items.length} {t('sfa.settingsCount')}</p></div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="text-sm font-medium text-gray-900">{s.label || s.setting_key}</div>
                            <div className="text-[10px] font-mono text-gray-400">{s.setting_key}</div>
                          </div>
                          <div className="shrink-0 w-48">
                            {s.setting_type === 'boolean' ? (
                              <button onClick={async () => {
                                const newVal = s.setting_value === 'true' ? 'false' : 'true';
                                await apiEnh('update-business-setting', 'PUT', { id: s.id, setting_value: newVal });
                                fetchData();
                              }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.setting_value === 'true' ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${s.setting_value === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            ) : s.setting_type === 'number' ? (
                              <input type="number" className={`${inputCls} !py-1.5 !text-xs text-right`} value={s.setting_value || ''} onBlur={async (e) => {
                                if (e.target.value !== s.setting_value) { await apiEnh('update-business-setting', 'PUT', { id: s.id, setting_value: e.target.value }); fetchData(); }
                              }} onChange={(e) => { setBizSettings(prev => prev.map(x => x.id === s.id ? { ...x, setting_value: e.target.value } : x)); }} />
                            ) : (
                              <input className={`${inputCls} !py-1.5 !text-xs`} value={s.setting_value || ''} onBlur={async (e) => {
                                if (e.target.value !== s.setting_value) { await apiEnh('update-business-setting', 'PUT', { id: s.id, setting_value: e.target.value }); fetchData(); }
                              }} onChange={(e) => { setBizSettings(prev => prev.map(x => x.id === s.id ? { ...x, setting_value: e.target.value } : x)); }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ));
              })()}

              {/* Plafon */}
              <SectionHeader title={t('sfa.plafonTitle')} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tipe</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Limit</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Used</th><th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Available</th><th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {plafon.length === 0 ? <tr><td colSpan={6}><EmptyState icon={DollarSign} title={t('sfa.noPlafon')} /></td></tr> :
                      plafon.map((p: any) => {
                        const avail = parseFloat(p.plafon_amount || 0) - parseFloat(p.used_amount || 0);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-gray-900">{p.customer_name || p.entity_name || '-'}</td>
                            <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{p.plafon_type || '-'}</td>
                            <td className="px-5 py-3.5 text-right text-gray-600">{fmtCur(p.plafon_amount)}</td>
                            <td className="px-5 py-3.5 text-right text-gray-600 hidden md:table-cell">{fmtCur(p.used_amount)}</td>
                            <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmtCur(avail)}</td>
                            <td className="px-5 py-3.5 text-center"><Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge></td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </TableWrap>

              {/* Geofence */}
              <SectionHeader title={t('sfa.geofenceZones')} action={<PrimaryBtn onClick={() => { setModal('geofence'); setForm({ fence_type: 'circle', radius_meters: 200 }); }} icon={Plus}>{t('sfa.addBtn')}</PrimaryBtn>} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {geofences.length === 0 ? <div className="col-span-3"><EmptyState icon={Globe} title={t('sfa.noGeofence')} /></div> :
                  geofences.map((gf: any) => (
                    <Card key={gf.id} className="p-4" hover>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-amber-500" /><h4 className="font-semibold text-sm text-gray-900">{gf.name}</h4></div>
                        <Badge color={gf.is_active ? 'green' : 'gray'}>{gf.is_active ? 'Active' : 'Off'}</Badge>
                      </div>
                      <div className="text-xs text-gray-400">{gf.fence_type} | {gf.radius_meters}m | ({gf.center_lat}, {gf.center_lng})</div>
                    </Card>
                  ))
                }
              </div>

              {/* Parameter Sistem */}
              {parameters.length > 0 && (<>
                <SectionHeader title={t('sfa.systemParams')} />
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nilai</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Kategori</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {parameters.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-medium">{p.param_key || p.code}</td>
                          <td className="px-5 py-3.5 text-gray-700">{p.param_name || p.name}</td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">{p.param_value || p.value}</td>
                          <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{p.category || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </>)}
            </>)}

            {/* ── MASTER DATA (original lookup options) ── */}
            {settSubTab === 'master' && (<>

            {/* ── Master Data Lookup Options ── */}
            <Card className="p-0 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm"><Settings className="w-4.5 h-4.5 text-white" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{t('sfa.masterDataTitle')}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{Object.keys(lookupCategories).length} {t('sfa.categoriesLabel')} · {t('sfa.masterDataDesc')}</p>
                  </div>
                </div>
                {isManager && Object.values(lookupCategories).every(c => c.options.length === 0) && (
                  <button onClick={async () => {
                    setLookupSaving(true);
                    const r = await (await fetch('/api/hq/sfa/lookup?action=seed-defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
                    if (r.success) { showToast(t('sfa.seedSuccess', { count: r.data?.created })); fetchData(); }
                    else showToast(r.error || t('sfa.failedLabel'));
                    setLookupSaving(false);
                  }} disabled={lookupSaving} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md disabled:opacity-50 transition-all">
                    {lookupSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} {t('sfa.seedDefaults')}
                  </button>
                )}
              </div>

              <div className="flex" style={{ minHeight: 480 }}>
                {/* Category sidebar */}
                <div className="w-64 shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50/30" style={{ maxHeight: 520 }}>
                  <div className="p-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input className={`${inputCls} !pl-8 !py-2 !text-xs`} placeholder={t('sfa.searchCategory')} value={lookupSearch} onChange={e => setLookupSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-0.5 px-2 pb-3">
                    {Object.entries(lookupCategories)
                      .filter(([cat, meta]) => !lookupSearch || meta.label.toLowerCase().includes(lookupSearch.toLowerCase()) || cat.includes(lookupSearch.toLowerCase()))
                      .map(([cat, meta]) => (
                        <button key={cat} onClick={() => { setLookupSelectedCat(cat); setLookupEditing(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${lookupSelectedCat === cat ? 'bg-amber-50 text-amber-700 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                          <span className="truncate">{meta.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lookupSelectedCat === cat ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>{meta.options.length}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Options panel */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: 520 }}>
                  {!lookupSelectedCat ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4"><Settings className="w-8 h-8 text-gray-300" /></div>
                      <p className="text-sm font-medium text-gray-500">{t('sfa.selectCategory')}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('sfa.selectCategorySub')}</p>
                    </div>
                  ) : (() => {
                    const catData = lookupCategories[lookupSelectedCat];
                    const catLabel = catData?.label || lookupSelectedCat;
                    const catDesc = catData?.description || '';
                    const options = catData?.options || [];
                    return (
                      <div className="p-5">
                        {/* Category header */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{catLabel}</h4>
                            {catDesc && <p className="text-[11px] text-gray-400 mt-0.5">{catDesc}</p>}
                            <p className="text-[10px] text-gray-300 font-mono mt-1">{lookupSelectedCat}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isManager && options.length === 0 && (
                              <button onClick={async () => {
                                setLookupSaving(true);
                                const r = await (await fetch('/api/hq/sfa/lookup?action=seed-category', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: lookupSelectedCat }) })).json();
                                if (r.success) { showToast(t('sfa.seedSuccess', { count: r.data?.created })); fetchData(); }
                                else showToast(r.error || t('sfa.failedLabel'));
                                setLookupSaving(false);
                              }} disabled={lookupSaving} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[11px] font-semibold hover:bg-amber-100 disabled:opacity-50 transition-all">
                                <Zap className="w-3 h-3" /> {t('sfa.seedDefaults')}
                              </button>
                            )}
                            {isManager && (
                              <button onClick={() => setLookupEditing({ category: lookupSelectedCat, value: '', label: '', color: '', is_default: false, _isNew: true })}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md transition-all">
                                <Plus className="w-3 h-3" /> {t('sfa.addOption')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Add/Edit inline form */}
                        {lookupEditing && lookupEditing.category === lookupSelectedCat && (
                          <div className="mb-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{t('sfa.valueCode')}</label>
                                <input className={`${inputCls} !py-2 !text-xs`} placeholder="cold_call" value={lookupEditing.value || ''} onChange={e => setLookupEditing({ ...lookupEditing, value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} disabled={!lookupEditing._isNew} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{t('sfa.labelDisplay')}</label>
                                <input className={`${inputCls} !py-2 !text-xs`} placeholder="Cold Call" value={lookupEditing.label || ''} onChange={e => setLookupEditing({ ...lookupEditing, label: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{t('sfa.colorLabel')}</label>
                                <select className={`${inputCls} !py-2 !text-xs`} value={lookupEditing.color || ''} onChange={e => setLookupEditing({ ...lookupEditing, color: e.target.value })}>
                                  <option value="">{t('sfa.noColor')}</option>
                                  <option value="red">🔴 {t('sfa.colorRed')}</option>
                                  <option value="orange">🟠 {t('sfa.colorOrange')}</option>
                                  <option value="yellow">🟡 {t('sfa.colorYellow')}</option>
                                  <option value="green">🟢 {t('sfa.colorGreen')}</option>
                                  <option value="blue">🔵 {t('sfa.colorBlue')}</option>
                                  <option value="purple">🟣 {t('sfa.colorPurple')}</option>
                                  <option value="gray">⚪ {t('sfa.colorGray')}</option>
                                </select>
                              </div>
                              <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                                  <input type="checkbox" checked={lookupEditing.is_default || false} onChange={e => setLookupEditing({ ...lookupEditing, is_default: e.target.checked })} className="rounded border-gray-300" />
                                  Default
                                </label>
                                <div className="flex gap-1 ml-auto">
                                  <button onClick={async () => {
                                    if (!lookupEditing.value || !lookupEditing.label) { showToast(t('sfa.valueLabelRequired')); return; }
                                    setLookupSaving(true);
                                    const action2 = lookupEditing._isNew ? 'add-option' : 'update-option';
                                    const r = await (await fetch(`/api/hq/sfa/lookup?action=${action2}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lookupEditing) })).json();
                                    if (r.success) { showToast(lookupEditing._isNew ? t('sfa.optionAdded') : t('sfa.optionUpdated')); setLookupEditing(null); fetchData(); }
                                    else showToast(r.error || t('sfa.failedLabel'));
                                    setLookupSaving(false);
                                  }} disabled={lookupSaving} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 disabled:opacity-50 transition-all">
                                    {lookupSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : t('sfa.saveBtn')}
                                  </button>
                                  <button onClick={() => setLookupEditing(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[11px] font-medium hover:bg-gray-300 transition-all">{t('sfa.cancelBtn')}</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Options list */}
                        {options.length === 0 ? (
                          <EmptyState icon={Settings} title={t('sfa.noOptions')} subtitle={t('sfa.noOptionsSub')} />
                        ) : (
                          <div className="space-y-1">
                            {options.map((opt: any, idx: number) => (
                              <div key={opt.id || idx} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
                                <span className="text-[11px] text-gray-300 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                                {opt.color ? (
                                  <span className={`w-3 h-3 rounded-full shrink-0 ${opt.color === 'red' ? 'bg-red-500' : opt.color === 'orange' ? 'bg-orange-500' : opt.color === 'yellow' ? 'bg-yellow-500' : opt.color === 'green' ? 'bg-emerald-500' : opt.color === 'blue' ? 'bg-blue-500' : opt.color === 'purple' ? 'bg-purple-500' : 'bg-gray-400'}`} />
                                ) : <span className="w-3 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{opt.value}</span>
                                    {opt.is_default && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase">Default</span>}
                                    {opt.is_system && <span className="text-[9px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">System</span>}
                                  </div>
                                </div>
                                {isManager && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setLookupEditing({ ...opt, _isNew: false })} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={async () => {
                                      if (!confirm(t('sfa.deleteOptionConfirm', { label: opt.label }))) return;
                                      const r = await (await fetch('/api/hq/sfa/lookup?action=delete-option', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: opt.id }) })).json();
                                      if (r.success) { showToast(t('sfa.optionDeleted')); fetchData(); }
                                      else showToast(r.error || t('sfa.failedLabel'));
                                    }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Hapus">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* CRM: CUSTOMER 360° */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'customers' && (<>
            <SectionHeader title={t('sfa.customer360')} subtitle={`${crmCustomers.length} ${t('sfa.registeredCustomers')}`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => { setCustomerImportCsv(''); setCustomerImportOpen(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                      <Upload className="w-4 h-4" /> Import CSV
                    </button>
                  )}
                  <PrimaryBtn onClick={() => { setModal('crm-customer'); setForm({ customer_type: 'company', lifecycle_stage: 'prospect', customer_status: 'active' }); }} icon={Plus}>{t('sfa.addCustomer')}</PrimaryBtn>
                </div>
              } />

            {/* Customer Analytics Charts */}
            {crmAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title={t('sfa.lifecycleStage')} subtitle={t('sfa.lifecycleStageSub')}>
                  {(crmAnalytics.byLifecycle || []).length > 0 ? (() => {
                    const lcColors: Record<string,string> = { prospect: '#94a3b8', lead: '#3b82f6', opportunity: '#8b5cf6', customer: '#10b981', evangelist: '#f59e0b', churned: '#ef4444' };
                    const data = (crmAnalytics.byLifecycle||[]).map((d:any) => ({ ...d, count: parseInt(d.count), fill: lcColors[d.lifecycle_stage]||'#94a3b8' }));
                    const totalLc = data.reduce((s:number,d:any) => s + d.count, 0);
                    return (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart><Pie data={data} dataKey="count" nameKey="lifecycle_stage" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="white" strokeWidth={2}>{data.map((d:any,i:number) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-extrabold text-gray-900">{totalLc}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Total</span>
                          </div>
                        </div>
                        <div className="w-full divide-y divide-gray-50">
                          {data.map((d:any,i:number) => (
                            <ChartLegendItem key={i} color={d.fill} label={d.lifecycle_stage} value={d.count} total={totalLc} />
                          ))}
                        </div>
                      </div>
                    );
                  })() : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><Heart className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noData')}</span></div>}
                </ChartCard>
                <ChartCard title={t('sfa.healthDistribution')} subtitle={t('sfa.healthDistSub')}>
                  {(crmAnalytics.healthDist || []).length > 0 ? (() => {
                    const hColors: Record<string,string> = { healthy: '#10b981', at_risk: '#f59e0b', critical: '#ef4444' };
                    const data = (crmAnalytics.healthDist||[]).map((d:any) => ({ ...d, count: parseInt(d.count), fill: hColors[d.health_group]||'#94a3b8' }));
                    const totalH = data.reduce((s:number,d:any) => s + d.count, 0);
                    return (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart><Pie data={data} dataKey="count" nameKey="health_group" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="white" strokeWidth={2}>{data.map((d:any,i:number) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-extrabold text-gray-900">{totalH}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Total</span>
                          </div>
                        </div>
                        <div className="w-full divide-y divide-gray-50">
                          {data.map((d:any,i:number) => (
                            <ChartLegendItem key={i} color={d.fill} label={(d.health_group||'').replace('_',' ')} value={d.count} total={totalH} />
                          ))}
                        </div>
                      </div>
                    );
                  })() : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><Activity className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noData')}</span></div>}
                </ChartCard>
                <ChartCard title={t('sfa.topSources')} subtitle={t('sfa.topSourcesSub')}>
                  {(crmAnalytics.bySource || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={(crmAnalytics.bySource||[]).map((d:any) => ({name: d.acquisition_source, count: parseInt(d.count)}))} margin={{top:8,right:8,bottom:0,left:-10}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                        <Bar dataKey="count" name="Customer" radius={[8,8,0,0]} maxBarSize={32}>{(crmAnalytics.bySource||[]).map((_:any,i:number) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex flex-col items-center justify-center py-12 text-gray-300"><Globe className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.noData')}</span></div>}
                </ChartCard>
              </div>
            )}

            {/* Customer Table */}
            <TableWrap>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Lifecycle</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Revenue</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Orders</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Segment</th>
                  {canDelete && <th className="px-5 py-3.5 w-12"></th>}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {crmCustomers.length === 0 ? <tr><td colSpan={canDelete ? 7 : 6}><EmptyState icon={Heart} title={t('sfa.noCustomer')} subtitle={t('sfa.noCustomerSub')} /></td></tr> :
                    crmCustomers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-amber-50/30 cursor-pointer transition-colors" onClick={() => setSelectedItem(c)}>
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center text-xs font-bold text-rose-500 shrink-0">{(c.display_name||'?')[0].toUpperCase()}</div><div><div className="font-semibold text-gray-900">{c.display_name}</div><div className="text-xs text-gray-400 mt-0.5">{c.customer_number} {c.company_name ? `· ${c.company_name}` : ''}</div></div></div></td>
                        <td className="px-5 py-4 hidden sm:table-cell"><Badge color={c.lifecycle_stage==='customer'?'green':c.lifecycle_stage==='opportunity'?'purple':c.lifecycle_stage==='churned'?'red':'blue'}>{c.lifecycle_stage}</Badge></td>
                        <td className="px-5 py-4 text-center"><div className="inline-flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${c.health_score>=80?'bg-emerald-500':c.health_score>=50?'bg-amber-500':'bg-red-500'}`} /><span className="text-xs font-semibold text-gray-700">{c.health_score}</span></div></td>
                        <td className="px-5 py-4 text-right hidden md:table-cell"><span className="font-semibold text-gray-900">{fmtCur(parseFloat(c.total_revenue||0))}</span></td>
                        <td className="px-5 py-4 text-center hidden lg:table-cell"><span className="text-sm font-medium text-gray-600">{c.total_orders||0}</span></td>
                        <td className="px-5 py-4 hidden lg:table-cell">{c.segment ? <Badge color={c.segment==='platinum'?'purple':c.segment==='gold'?'yellow':c.segment==='silver'?'gray':'orange'}>{c.segment}</Badge> : <span className="text-gray-300">-</span>}</td>
                        {canDelete && <td className="px-5 py-4"><button onClick={(e) => { e.stopPropagation(); handleCrmDelete('delete-customer', c.id, 'Customer'); }} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button></td>}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>

            {customerImportOpen && isManager && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40" onClick={() => !customerImportBusy && setCustomerImportOpen(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900">Import pelanggan (CSV)</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Header wajib: <code className="bg-gray-100 px-1 rounded">display_name</code> atau <code className="bg-gray-100 px-1 rounded">company_name</code>.
                    Opsional: address, city, province, segment, notes.
                  </p>
                  <textarea
                    className="w-full min-h-[160px] text-xs font-mono border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-300"
                    placeholder={`display_name,company_name,city,segment\nToko Maju Jaya,PT Maju,Jakarta,platinum`}
                    value={customerImportCsv}
                    onChange={e => setCustomerImportCsv(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" disabled={customerImportBusy} onClick={() => setCustomerImportOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">Batal</button>
                    <button
                      type="button"
                      disabled={customerImportBusy || !customerImportCsv.trim()}
                      onClick={async () => {
                        setCustomerImportBusy(true);
                        const r = await apiCrm('import-customers-csv', 'POST', { csv: customerImportCsv });
                        setCustomerImportBusy(false);
                        if (r.success) {
                          showToast(r.message || `${r.inserted || 0} diimpor`);
                          setCustomerImportOpen(false);
                          fetchData();
                        } else showToast(r.error || 'Gagal import');
                      }}
                      className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl disabled:opacity-50"
                    >
                      {customerImportBusy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null} Import
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* CRM: COMMUNICATION HUB */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'communications' && (<>
            <SectionHeader title={t('sfa.commHub')} subtitle={`${crmComms.length} ${t('sfa.communications')} | ${crmFollowUps.length} follow-up`}
              action={<PrimaryBtn onClick={() => { setModal('crm-comm'); setForm({ comm_type: 'call', direction: 'outbound', status: 'completed' }); }} icon={Plus}>{t('sfa.logComm')}</PrimaryBtn>} />

            {/* Comm Summary */}
            {crmComms.length > 0 && (() => {
              const typeCounts = crmComms.reduce((a: any, c: any) => { a[c.comm_type] = (a[c.comm_type] || 0) + 1; return a; }, {});
              const tColors: Record<string,string> = { call: '#3b82f6', email: '#10b981', meeting: '#8b5cf6', whatsapp: '#22c55e', sms: '#f59e0b' };
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title={t('sfa.commPerType')} subtitle={t('sfa.commPerTypeSub')}>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-40 h-40 shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={Object.entries(typeCounts).map(([t,c]) => ({name:t,value:c as number,fill:tColors[t]||'#94a3b8'}))} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" stroke="white" strokeWidth={2}>{Object.keys(typeCounts).map((t,i) => <Cell key={i} fill={tColors[t]||'#94a3b8'} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-extrabold text-gray-900">{crmComms.length}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Total</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full divide-y divide-gray-50">
                        {Object.entries(typeCounts).map(([t,c]:any,i) => (
                          <ChartLegendItem key={i} color={tColors[t]||'#94a3b8'} label={t} value={c} total={crmComms.length} />
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard title={t('sfa.followUpPending')} subtitle={t('sfa.followUpPendingSub')}>
                    {crmFollowUps.filter((f:any) => f.status === 'pending').length === 0 ? <div className="flex flex-col items-center justify-center py-10 text-gray-300"><CheckCircle className="w-10 h-10 mb-2 opacity-30" /><span className="text-sm">{t('sfa.allFollowUpDone')}</span></div> :
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {crmFollowUps.filter((f:any) => f.status === 'pending').slice(0,8).map((f:any) => (
                          <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100/80 transition-colors">
                            <div className="min-w-0"><div className="text-xs font-semibold text-gray-900 truncate">{f.title}</div><div className="text-[10px] text-gray-400 mt-0.5">{f.customer_name || '-'} · {f.follow_up_type}</div></div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-medium ${new Date(f.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>{fmtDate(f.due_date)}</span>
                              <button onClick={() => handleCrmUpdate('update-follow-up', {id:f.id,status:'completed'}, 'Follow-up selesai')} className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    }
                  </ChartCard>
                </div>
              );
            })()}

            {/* Communication Log */}
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
                  {crmComms.length === 0 ? <tr><td colSpan={6}><EmptyState icon={MessageCircle} title={t('sfa.noComm')} subtitle={t('sfa.noCommSub')} /></td></tr> :
                    crmComms.map((cm: any) => (
                      <tr key={cm.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5"><div className="flex items-center gap-2">{cm.comm_type==='call' ? <Phone className="w-4 h-4 text-blue-500" /> : cm.comm_type==='email' ? <Mail className="w-4 h-4 text-emerald-500" /> : cm.comm_type==='meeting' ? <Calendar className="w-4 h-4 text-violet-500" /> : <MessageCircle className="w-4 h-4 text-green-500" />}<span className="text-xs font-medium capitalize">{cm.comm_type}</span></div></td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{cm.customer_name || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">{cm.subject || '-'}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={cm.direction==='inbound'?'blue':'green'}>{cm.direction}</Badge></td>
                        <td className="px-5 py-3.5 text-center"><button onClick={() => {
                          const next: Record<string,string> = { scheduled: 'completed', completed: 'missed', missed: 'scheduled' };
                          const ns = next[cm.status] || 'completed';
                          handleCrmUpdate('update-communication', { id: cm.id, status: ns }, `${t('sfa.communications')} → ${ns}`);
                        }} title={t('sfa.changeStatus')}><Badge color={cm.status==='completed'?'green':cm.status==='scheduled'?'yellow':'gray'}>{cm.status}</Badge></button></td>
                        <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{fmtDate(cm.created_at)}</td>
                        {canDelete && <td className="px-5 py-3.5"><button onClick={() => handleCrmDelete('delete-communication', cm.id, 'Komunikasi')} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button></td>}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </TableWrap>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* CRM: TASKS & CALENDAR — Professional Module */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'tasks' && (
            <TaskCalendarModule showToast={showToast} />
          )}

          {tab === 'field-tasks' && (
            <TaskCalendarModule showToast={showToast} fieldForceBridge />
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* CRM: FORECASTING */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'forecasting' && (<>
            <SectionHeader title={t('sfa.salesForecasting')} subtitle={t('sfa.salesForecastingSub')}
              action={<PrimaryBtn onClick={() => { setModal('crm-forecast'); setForm({ forecast_period: 'monthly', status: 'draft' }); }} icon={Plus}>{t('sfa.createForecast')}</PrimaryBtn>} />

            {/* Forecast Analytics */}
            {crmForecastAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.targetVsActual')}</h3>
                  <p className="text-xs text-gray-400 mb-4">{t('sfa.targetVsActualSub')}</p>
                  {(crmForecastAnalytics.forecasts || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={(crmForecastAnalytics.forecasts||[]).slice(0,6).reverse().map((f:any) => ({name: f.name?.substring(0,12), target: parseFloat(f.target_revenue), actual: parseFloat(f.actual_revenue)}))} margin={{top:5,right:5,bottom:5,left:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v:number) => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:`${v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="target" name={t('sfa.targetLabel')} fill="#e2e8f0" radius={[4,4,0,0]} maxBarSize={25} />
                        <Bar dataKey="actual" name={t('sfa.actualLabel')} fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={25} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="text-center py-10 text-gray-300 text-sm">{t('sfa.noForecastData')}</div>}
                </Card>
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('sfa.dealTemperature')}</h3>
                  <p className="text-xs text-gray-400 mb-4">{t('sfa.dealTemperatureSub')}</p>
                  {(crmForecastAnalytics.dealScoreDist || []).length > 0 ? (() => {
                    const dtColors: Record<string,string> = { hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6' };
                    const data = (crmForecastAnalytics.dealScoreDist||[]).map((d:any) => ({...d, count: parseInt(d.count), fill: dtColors[d.temp]||'#94a3b8'}));
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-36 h-36 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="temp" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={4} strokeWidth={0}>{data.map((d:any,i:number) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div>
                        <div className="flex-1 space-y-3 w-full">{data.map((d:any,i:number) => (<div key={i} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{background:d.fill}} /><span className="text-gray-600 capitalize">{d.temp}</span></div><span className="font-bold text-gray-900">{d.count} deals</span></div>))}</div>
                      </div>
                    );
                  })() : <div className="text-center py-10 text-gray-300 text-sm">{t('sfa.noDealScore')}</div>}
                </Card>
              </div>
            )}

            {/* Forecast List */}
            <div className="grid sm:grid-cols-2 gap-4">
              {crmForecasts.length === 0 ? <div className="col-span-2"><EmptyState icon={TrendingUp} title={t('sfa.noForecast')} /></div> :
                crmForecasts.map((f: any) => {
                  const pct = f.target_revenue > 0 ? Math.round((parseFloat(f.actual_revenue) / parseFloat(f.target_revenue)) * 100) : 0;
                  return (
                    <Card key={f.id} className="p-5" hover>
                      <div className="flex justify-between items-start mb-3">
                        <div><h4 className="font-semibold text-gray-900">{f.name}</h4><p className="text-xs text-gray-400 mt-0.5">{f.forecast_period} · {f.period_start} → {f.period_end}</p></div>
                        <button onClick={() => {
                          const next: Record<string,string> = { draft: 'submitted', submitted: 'approved', approved: 'draft' };
                          const ns = next[f.status] || 'submitted';
                          handleCrmUpdate('update-forecast', { id: f.id, status: ns }, `Forecast → ${ns}`);
                        }} title={t('sfa.changeStatus')}><Badge color={f.status==='approved'?'green':f.status==='submitted'?'blue':'gray'}>{f.status}</Badge></button>
                      </div>
                      <div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Progress</span><span className="font-bold text-gray-900">{pct}%</span></div><div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{width:`${Math.min(pct,100)}%`}} /></div></div>
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                        <div><p className="text-[10px] text-gray-400 uppercase">Target</p><p className="text-xs font-bold text-gray-700 mt-0.5">{fmtCur(parseFloat(f.target_revenue))}</p></div>
                        <div><p className="text-[10px] text-gray-400 uppercase">Aktual</p><p className="text-xs font-bold text-emerald-600 mt-0.5">{fmtCur(parseFloat(f.actual_revenue))}</p></div>
                        <div><p className="text-[10px] text-gray-400 uppercase">Items</p><p className="text-xs font-bold text-gray-700 mt-0.5">{f.item_count || 0}</p></div>
                      </div>
                    </Card>
                  );
                })
              }
            </div>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* CRM: AUTOMATION */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'automation' && (<>
            <SectionHeader title={t('sfa.crmAutomation')} subtitle={`${crmAutomationRules.length} rules · ${crmAutomationLogs.length} execution logs`}
              action={<PrimaryBtn onClick={() => { setModal('crm-automation'); setForm({ rule_type: 'trigger', is_active: true, trigger_entity: 'lead', trigger_event: 'lead_created' }); }} icon={Plus}>{t('sfa.createRule')}</PrimaryBtn>} />

            {/* Rules */}
            <div className="grid sm:grid-cols-2 gap-4">
              {crmAutomationRules.length === 0 ? <div className="col-span-2"><EmptyState icon={Zap} title={t('sfa.noAutomationRule')} subtitle={t('sfa.noAutomationRuleSub')} /></div> :
                crmAutomationRules.map((r: any) => (
                  <Card key={r.id} className="p-5" hover>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shrink-0"><Zap className="w-5 h-5" /></div><div><h4 className="font-semibold text-sm text-gray-900">{r.name}</h4><p className="text-xs text-gray-400 mt-0.5">{r.rule_type} · {r.trigger_entity} · {r.trigger_event}</p></div></div>
                      <button onClick={() => handleCrmUpdate('update-automation-rule', {id:r.id,is_active:!r.is_active}, r.is_active?t('sfa.ruleDeactivated'):t('sfa.ruleActivated'))}>
                        <Badge color={r.is_active?'green':'gray'}>{r.is_active?'Active':'Off'}</Badge>
                      </button>
                    </div>
                    {r.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-4">
                        <span>Executed: {r.execution_count||0}x</span>
                        <span>Errors: {r.error_count||0}</span>
                        <span>Logs: {r.log_count||0}</span>
                      </div>
                      {canDelete && <button onClick={() => handleCrmDelete('delete-automation-rule', r.id, 'Automation rule')} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </Card>
                ))
              }
            </div>

            {/* Recent Logs */}
            {crmAutomationLogs.length > 0 && (<>
              <SectionHeader title={t('sfa.executionLogs')} subtitle={t('sfa.executionLogsSub')} />
              <TableWrap>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rule</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Event</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Waktu</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {crmAutomationLogs.slice(0, 20).map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{log.rule_name || '-'}</td>
                        <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{log.trigger_event}</td>
                        <td className="px-5 py-3.5 text-center"><Badge color={log.status==='success'?'green':log.status==='failed'?'red':'gray'}>{log.status}</Badge></td>
                        <td className="px-5 py-3.5 text-right text-gray-500 hidden md:table-cell">{log.execution_time_ms}ms</td>
                        <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">{fmtDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>)}
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* AI WORKFLOW */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'ai-workflow' && (<>
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 p-6 sm:p-8 mb-6 shadow-lg shadow-purple-500/20">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-indigo-400/15 rounded-full blur-3xl" />
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              </div>
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Brain className="w-5 h-5 text-white" /></div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">AI Engine</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">AI Workflow Engine</h2>
                  <p className="text-purple-100 text-sm mt-1">{t('sfa.aiWorkflowDesc')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isManager && (
                    <button onClick={() => { setModal('setup-ai-model'); setForm({}); }}
                      className="px-4 py-2 bg-white text-purple-700 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> {t('sfa.addModel')}
                    </button>
                  )}
                  <button onClick={fetchData} className="px-3 py-2 bg-white/15 border border-white/20 text-white rounded-xl text-xs font-medium hover:bg-white/25 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Eksekusi', value: aiUsageStats?.totalExecutions || 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
                { label: 'Berhasil', value: aiUsageStats?.successCount || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
                { label: 'Gagal', value: aiUsageStats?.failCount || 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100' },
                { label: 'Total Cost', value: `$${(aiUsageStats?.totalCost || 0).toFixed(4)}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
              ].map(s => (
                <Card key={s.label} className={`!p-4 ring-1 ${s.ring}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{s.label}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* AI Models Section */}
            <Card className="mb-6 !p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4.5 h-4.5 text-blue-500" />
                  <h3 className="font-bold text-gray-900 text-sm">{t('sfa.aiModels')}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{aiModels.length} {t('sfa.active')}</span>
                </div>
              </div>
              <div className="p-5">
                {aiModels.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8 text-blue-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{t('sfa.noAiModel')}</p>
                    <p className="text-xs text-gray-400 mb-5">{t('sfa.noAiModelSub', { count: aiModelCatalog.length })}</p>
                    {isManager && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                        {aiModelCatalog.slice(0, 8).map((m: any) => {
                          const pc: Record<string, string> = { openai: 'border-green-200 hover:bg-green-50', anthropic: 'border-orange-200 hover:bg-orange-50', google: 'border-blue-200 hover:bg-blue-50', deepseek: 'border-indigo-200 hover:bg-indigo-50', groq: 'border-purple-200 hover:bg-purple-50', local: 'border-gray-200 hover:bg-gray-50' };
                          const pt: Record<string, string> = { openai: 'bg-green-100 text-green-700', anthropic: 'bg-orange-100 text-orange-700', google: 'bg-blue-100 text-blue-700', deepseek: 'bg-indigo-100 text-indigo-700', groq: 'bg-purple-100 text-purple-700', local: 'bg-gray-100 text-gray-700' };
                          return (
                            <button key={m.model_id}
                              onClick={async () => {
                                const r = await (await fetch('/api/hq/sfa/ai-workflow?action=setup-model', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ code: m.model_id, name: m.name, provider: m.provider, model_id: m.model_id, capabilities: m.capabilities, cost_per_1k_input: m.cost_input, cost_per_1k_output: m.cost_output, max_context_tokens: m.max_tokens, is_default: aiModels.length === 0 }),
                                })).json();
                                if (r.success) { showToast(t('sfa.modelAdded', { name: m.name })); fetchData(); }
                                else showToast(r.error || t('sfa.failedLabel'));
                              }}
                              className={`p-4 rounded-xl border-2 ${pc[m.provider] || 'border-gray-200'} transition-all text-left group hover:shadow-md`}
                            >
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${pt[m.provider] || 'bg-gray-100'}`}>{m.provider}</span>
                              <div className="text-sm font-semibold text-gray-900 mt-2">{m.name}</div>
                              <div className="text-[10px] text-gray-400 mt-1">{m.max_tokens > 100000 ? `${(m.max_tokens/1000).toFixed(0)}K` : m.max_tokens} context tokens</div>
                              <div className="mt-2 text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">+ {t('sfa.clickToSetup')}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aiModels.map((m: any) => {
                      const provIcons: Record<string, string> = { openai: '🟢', anthropic: '🟠', google: '🔵', deepseek: '🟣', groq: '🟤', local: '⚫' };
                      const provColors: Record<string, string> = { openai: 'bg-green-100 text-green-700 border-green-200', anthropic: 'bg-orange-100 text-orange-700 border-orange-200', google: 'bg-blue-100 text-blue-700 border-blue-200', deepseek: 'bg-indigo-100 text-indigo-700 border-indigo-200', groq: 'bg-purple-100 text-purple-700 border-purple-200', local: 'bg-gray-100 text-gray-700 border-gray-200' };
                      return (
                        <div key={m.id} className={`p-4 rounded-xl border-2 transition-all ${m.is_default ? 'border-blue-300 bg-blue-50/30 shadow-sm shadow-blue-100' : 'border-gray-100 hover:border-gray-200'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${provColors[m.provider] || 'bg-gray-100'}`}>{provIcons[m.provider] || ''} {m.provider}</span>
                            {m.is_default && <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white text-[9px] font-bold">DEFAULT</span>}
                          </div>
                          <div className="text-sm font-bold text-gray-900 mt-1">{m.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{m.model_id}</div>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100">{m.max_context_tokens ? `${(m.max_context_tokens/1000).toFixed(0)}K ctx` : '-'}</span>
                            {m.capabilities && (typeof m.capabilities === 'string' ? JSON.parse(m.capabilities) : m.capabilities)?.slice?.(0,2)?.map?.((c: string) => (
                              <span key={c} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{c}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Workflows Section */}
            <Card className="mb-6 !p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  <h3 className="font-bold text-gray-900 text-sm">AI Workflows</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{aiWorkflows.length}</span>
                </div>
                {isManager && aiWorkflows.length === 0 && aiWorkflowTemplates.length > 0 && (
                  <button
                    onClick={async () => {
                      const mid = aiModels.length > 0 ? aiModels.find((m: any) => m.is_default)?.id || aiModels[0]?.id : null;
                      const r = await (await fetch('/api/hq/sfa/ai-workflow?action=init-templates', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ai_model_id: mid }),
                      })).json();
                      if (r.success) { showToast(t('sfa.workflowInitialized', { count: r.data?.created })); fetchData(); }
                      else showToast(r.error || t('sfa.failedLabel'));
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Init {aiWorkflowTemplates.length} Template
                  </button>
                )}
              </div>
              <div className="p-5">
                {aiWorkflows.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-amber-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{t('sfa.noWorkflow')}</p>
                    <p className="text-xs text-gray-400">{aiWorkflowTemplates.length > 0 ? t('sfa.initTemplateHint') : t('sfa.setupAiFirst')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiWorkflows.map((wf: any) => {
                      const catColors: Record<string, string> = {
                        lead_scoring: 'from-amber-400 to-orange-500', segmentation: 'from-purple-400 to-violet-500',
                        forecasting: 'from-blue-400 to-cyan-500', optimization: 'from-green-400 to-emerald-500',
                        content: 'from-pink-400 to-rose-500', analysis: 'from-indigo-400 to-blue-500',
                        classification: 'from-teal-400 to-cyan-500', general: 'from-gray-400 to-gray-500',
                      };
                      const catBg: Record<string, string> = {
                        lead_scoring: 'bg-amber-50', segmentation: 'bg-purple-50', forecasting: 'bg-blue-50',
                        optimization: 'bg-green-50', content: 'bg-pink-50', analysis: 'bg-indigo-50',
                        classification: 'bg-teal-50', general: 'bg-gray-50',
                      };
                      const catIcons: Record<string, any> = {
                        lead_scoring: Target, segmentation: Users, forecasting: TrendingUp,
                        optimization: Navigation, content: Mail, analysis: BarChart3,
                        classification: ClipboardList, general: Brain,
                      };
                      const CatIcon = catIcons[wf.category] || Brain;
                      return (
                        <div key={wf.id} className={`rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300 group`}>
                          {/* Gradient top accent */}
                          <div className={`h-1.5 bg-gradient-to-r ${catColors[wf.category] || 'from-gray-300 to-gray-400'}`} />
                          <div className="p-5">
                            <div className="flex items-start gap-3">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${catBg[wf.category] || 'bg-gray-100'}`}>
                                <CatIcon className="w-5 h-5 text-gray-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">{wf.name}</h4>
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold uppercase shrink-0">{wf.module}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{wf.description}</p>
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-[11px]">
                              {wf.model_name ? (
                                <span className="flex items-center gap-1 text-blue-600 font-medium"><Cpu className="w-3 h-3" /> {wf.model_name}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-400"><Cpu className="w-3 h-3" /> No model</span>
                              )}
                              <span className="text-gray-300">|</span>
                              <span className="text-gray-400">{wf.execution_count || 0}x {t('sfa.executed')}</span>
                            </div>

                            {/* Action row */}
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                disabled={aiExecLoading}
                                onClick={async () => {
                                  setAiExecLoading(true); setAiSelectedWorkflow(wf); setAiExecResult(null);
                                  const r = await (await fetch('/api/hq/sfa/ai-workflow?action=execute', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ workflow_id: wf.id, input_data: {} }),
                                  })).json();
                                  if (r.success) { setAiExecResult(r.data); showToast(t('sfa.workflowExecuted')); }
                                  else showToast(r.error || t('sfa.failedLabel'));
                                  setAiExecLoading(false); fetchData();
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
                                  aiExecLoading && aiSelectedWorkflow?.id === wf.id
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm shadow-purple-200 hover:shadow-md hover:shadow-purple-300'
                                }`}
                              >
                                {aiExecLoading && aiSelectedWorkflow?.id === wf.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {aiExecLoading && aiSelectedWorkflow?.id === wf.id ? t('sfa.processing') : t('sfa.runAi')}
                              </button>
                              {isManager && aiModels.length > 0 && (
                                <select className="px-2.5 py-2 border border-gray-200 rounded-lg text-[11px] bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all"
                                  value={wf.ai_model_id || ''}
                                  onChange={async (e) => {
                                    await (await fetch('/api/hq/sfa/ai-workflow?action=assign-model', {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ workflow_id: wf.id, ai_model_id: e.target.value || null }),
                                    })).json();
                                    showToast(t('sfa.modelAssigned')); fetchData();
                                  }}>
                                  <option value="">Model</option>
                                  {aiModels.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Execution Result */}
            {aiExecResult && (
              <Card className="mb-6 !p-0 overflow-hidden ring-2 ring-emerald-200">
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> {t('sfa.resultLabel')}: {aiSelectedWorkflow?.name}
                    {aiExecResult.mock && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">MOCK</span>}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700 font-bold">{aiExecResult.stats?.executionTimeMs}ms</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-700 font-bold">{aiExecResult.stats?.inputTokens}+{aiExecResult.stats?.outputTokens} tokens</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-700 font-bold">${(aiExecResult.stats?.cost || 0).toFixed(4)}</span>
                  </div>
                </div>
                <div className="p-5">
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 overflow-x-auto max-h-64 border border-gray-200 font-mono leading-relaxed">{JSON.stringify(aiExecResult.output, null, 2)}</pre>
                </div>
              </Card>
            )}

            {/* Execution History */}
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> {t('sfa.executionHistory')}</h4>
              </div>
              {aiExecutions.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">{t('sfa.noExecutionHistory')}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {aiExecutions.slice(0, 10).map((ex: any) => (
                    <div key={ex.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ex.status === 'completed' ? 'bg-emerald-500' : ex.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{ex.workflow_name || 'Workflow'}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            <span>{ex.model_name || '-'}</span>
                            <span>•</span>
                            <span className={`font-bold ${ex.status === 'completed' ? 'text-emerald-600' : ex.status === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>{ex.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-gray-400">
                        <span className="hidden sm:inline">{ex.execution_time_ms}ms</span>
                        <span className="hidden sm:inline">{ex.input_tokens}+{ex.output_tokens} tok</span>
                        <span className="font-medium text-gray-600">${(parseFloat(ex.total_cost) || 0).toFixed(4)}</span>
                        <span className="text-gray-300">{ex.created_at ? new Date(ex.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* INTEGRASI CRM ↔ SFA */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'integration' && (<>
            <SectionHeader title={t('sfa.integrationTitle')} subtitle={t('sfa.integrationSub')} />

            {/* Health Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'CRM Customers', value: intHealth?.crmCustomers, icon: Users, gradient: 'from-blue-500 to-blue-600' },
                { label: 'SFA Leads', value: intHealth?.sfaLeads, icon: Target, gradient: 'from-amber-500 to-amber-600' },
                { label: 'Leads → Customer', value: intHealth?.linkedLeads, icon: UserPlus, gradient: 'from-emerald-500 to-emerald-600' },
                { label: 'Visits → CRM', value: intHealth?.linkedVisits, icon: Navigation, gradient: 'from-purple-500 to-purple-600' },
                { label: 'Pipeline → Forecast', value: intHealth?.syncedForecasts, icon: TrendingUp, gradient: 'from-indigo-500 to-indigo-600' },
              ].map(s => (
                <Card key={s.label} className="p-4 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-gray-900">{s.value ?? 0}</div>
                      <div className="text-[11px] text-gray-500 truncate">{s.label}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Two-column layout for tables */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Convertible Leads */}
              <Card className="p-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><UserPlus className="w-4.5 h-4.5 text-amber-600" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t('sfa.leadToCustomer')}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">{intConvertibleLeads.length} {t('sfa.leadsReadyConvert')}</p>
                    </div>
                  </div>
                  {intConvertibleLeads.length > 0 && (
                    <button disabled={intLoading} onClick={async () => {
                      if (!confirm(t('sfa.confirmConvertLeads', { count: intConvertibleLeads.length }))) return;
                      setIntLoading(true);
                      const r = await (await fetch('/api/hq/integrations/crm-sfa?action=bulk-convert-leads', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadIds: intConvertibleLeads.map(l => l.id) })
                      })).json();
                      if (r.success) showToast(t('sfa.leadsConverted', { count: r.data?.converted || 0 }));
                      else showToast(r.error || t('sfa.failedLabel'));
                      setIntLoading(false); fetchData();
                    }} className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all">
                      {intLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />} {t('sfa.convertAll')}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-auto max-h-[340px]">
                  {intConvertibleLeads.length === 0 ? (
                    <EmptyState icon={CheckCircle} title={t('sfa.allLeadsConverted')} subtitle={t('sfa.noLeadsPending')} />
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0"><tr className="bg-gray-50/80 backdrop-blur-sm">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-5 py-3 w-24"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {intConvertibleLeads.slice(0, 10).map((l: any) => (
                          <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-medium text-gray-900 text-sm">{l.company_name || l.contact_name}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{l.email || l.contact_email || '-'}</div>
                            </td>
                            <td className="px-5 py-3 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{l.lead_score || l.score || 0}</span></td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-gray-700">{fmtCur(parseFloat(l.expected_value || l.estimated_value || 0))}</td>
                            <td className="px-5 py-3 text-right">
                              <button disabled={intLoading} onClick={async () => {
                                setIntLoading(true);
                                const r = await (await fetch('/api/hq/integrations/crm-sfa?action=convert-lead', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ leadId: l.id })
                                })).json();
                                if (r.success) showToast(t('sfa.leadConvertedSuccess'));
                                else showToast(r.error || t('sfa.failedLabel'));
                                setIntLoading(false); fetchData();
                              }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 ml-3">{t('sfa.convertBtn')}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* Unlinked Visits */}
              <Card className="p-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center"><Navigation className="w-4.5 h-4.5 text-purple-600" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t('sfa.visitToCrm')}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">{intUnlinkedVisits.length} {t('sfa.visitsUnlinked')}</p>
                    </div>
                  </div>
                  {intUnlinkedVisits.length > 0 && (
                    <button disabled={intLoading} onClick={async () => {
                      if (!confirm(t('sfa.confirmLinkVisits', { count: intUnlinkedVisits.length }))) return;
                      setIntLoading(true);
                      const r = await (await fetch('/api/hq/integrations/crm-sfa?action=bulk-link-visits', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ visitIds: intUnlinkedVisits.map(v => v.id) })
                      })).json();
                      if (r.success) showToast(t('sfa.visitsLinked', { count: r.data?.linked || 0 }));
                      else showToast(r.error || t('sfa.failedLabel'));
                      setIntLoading(false); fetchData();
                    }} className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-xs font-semibold shadow-sm shadow-purple-500/20 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all">
                      {intLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} {t('sfa.linkAll')}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-auto max-h-[340px]">
                  {intUnlinkedVisits.length === 0 ? (
                    <EmptyState icon={CheckCircle} title={t('sfa.allVisitsLinked')} subtitle={t('sfa.noVisitsPending')} />
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {intUnlinkedVisits.slice(0, 10).map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-purple-500" /></div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">{v.customer_name || 'Unknown'}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5 truncate">{v.visit_number} · oleh {v.salesperson_name || '-'}</div>
                            </div>
                          </div>
                          <button disabled={intLoading} onClick={async () => {
                            setIntLoading(true);
                            const r = await (await fetch('/api/hq/integrations/crm-sfa?action=link-visit', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ visitId: v.id })
                            })).json();
                            if (r.success) showToast(t('sfa.visitLinked'));
                            else showToast(r.error || t('sfa.failedLabel'));
                            setIntLoading(false); fetchData();
                          }} className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 ml-3">{t('sfa.linkBtn')}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Pipeline → Forecast Sync — full width */}
            <Card className="p-0 overflow-hidden mt-5">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><TrendingUp className="w-4.5 h-4.5 text-indigo-600" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{t('sfa.pipelineToForecast')}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{intSyncablePipeline.length} {t('sfa.oppNotInForecast')}</p>
                  </div>
                </div>
                {intSyncablePipeline.length > 0 && (
                  <button disabled={intLoading} onClick={async () => {
                    if (!confirm(t('sfa.confirmSyncPipeline'))) return;
                    setIntLoading(true);
                    const r = await (await fetch('/api/hq/integrations/crm-sfa?action=sync-pipeline-forecast', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({})
                    })).json();
                    if (r.success) showToast(t('sfa.oppSynced', { count: r.data?.synced || 0 }));
                    else showToast(r.error || t('sfa.failedLabel'));
                    setIntLoading(false); fetchData();
                  }} className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all">
                    {intLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {t('sfa.syncAll')}
                  </button>
                )}
              </div>
              {intSyncablePipeline.length === 0 ? (
                <EmptyState icon={CheckCircle} title={t('sfa.allPipelineSynced')} subtitle={t('sfa.noOppPending')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50/80">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Opportunity</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Stage</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Prob</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected Value</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {intSyncablePipeline.slice(0, 15).map((o: any) => (
                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{o.title}</td>
                          <td className="px-5 py-3.5 hidden sm:table-cell"><Badge color={o.stage === 'closed_won' ? 'green' : o.stage === 'closed_lost' ? 'red' : o.stage === 'negotiation' ? 'yellow' : 'blue'}>{(o.stage || '').replace('_', ' ')}</Badge></td>
                          <td className="px-5 py-3.5 text-center"><div className="inline-flex items-center gap-1.5"><div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${o.probability || 50}%`}} /></div><span className="text-xs font-medium text-gray-600">{o.probability || 50}%</span></div></td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-700">{fmtCur(parseFloat(o.expected_value || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* AUDIT TRAIL */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'audit-trail' && (<>
            <SectionHeader title={t('sfa.auditTrail')} subtitle={t('sfa.auditTrailSub')} />

            {/* Summary Cards */}
            {auditSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm"><Zap className="w-4.5 h-4.5 text-white" /></div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('sfa.activityPerAction')}</h4>
                  </div>
                  <div className="space-y-3">
                    {(auditSummary.byAction || []).slice(0, 5).map((a: any, i: number) => {
                      const maxCount = Math.max(...(auditSummary.byAction || []).map((x: any) => x.count || 0), 1);
                      const barColors = ['bg-blue-500', 'bg-emerald-500', 'bg-red-500', 'bg-amber-500', 'bg-purple-500'];
                      return (
                        <div key={a.action}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 capitalize">{a.label || a.action}</span>
                            <span className="text-xs font-bold text-gray-900">{a.count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColors[i % barColors.length]} rounded-full transition-all`} style={{ width: `${(a.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {(auditSummary.byAction || []).length === 0 && <p className="text-xs text-gray-400 text-center py-2">{t('sfa.noData')}</p>}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm"><LayoutList className="w-4.5 h-4.5 text-white" /></div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('sfa.activityPerEntity')}</h4>
                  </div>
                  <div className="space-y-3">
                    {(auditSummary.byEntity || []).slice(0, 5).map((e: any, i: number) => {
                      const maxCount = Math.max(...(auditSummary.byEntity || []).map((x: any) => x.count || 0), 1);
                      const barColors = ['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-teal-500', 'bg-pink-500'];
                      return (
                        <div key={e.entity_type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">{e.label || (e.entity_type || '').replace('_', ' ')}</span>
                            <span className="text-xs font-bold text-gray-900">{e.count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColors[i % barColors.length]} rounded-full transition-all`} style={{ width: `${(e.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {(auditSummary.byEntity || []).length === 0 && <p className="text-xs text-gray-400 text-center py-2">{t('sfa.noData')}</p>}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm"><Users className="w-4.5 h-4.5 text-white" /></div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('sfa.mostActiveUsers')}</h4>
                  </div>
                  <div className="space-y-3">
                    {(auditSummary.byUser || []).slice(0, 5).map((u: any, i: number) => (
                      <div key={u.user_id || i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-gray-600">{(u.user_name || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">{u.user_name || 'Unknown'}</div>
                        </div>
                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full">{u.count}</span>
                      </div>
                    ))}
                    {(auditSummary.byUser || []).length === 0 && <p className="text-xs text-gray-400 text-center py-2">{t('sfa.noData')}</p>}
                  </div>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card className="p-4 mb-5">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <select className={`${inputCls} max-w-[180px] !py-2 !text-xs`} value={auditFilterEntity} onChange={e => setAuditFilterEntity(e.target.value)}>
                    <option value="">{t('sfa.allEntities')}</option>
                    {(auditFilters?.entityTypes || []).map((et: any) => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>
                  <select className={`${inputCls} max-w-[160px] !py-2 !text-xs`} value={auditFilterAction} onChange={e => setAuditFilterAction(e.target.value)}>
                    <option value="">{t('sfa.allActions')}</option>
                    {(auditFilters?.actions || []).map((a: any) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                    {[{ v: '7d', l: `7 ${t('sfa.daysLabel')}` }, { v: '30d', l: `30 ${t('sfa.daysLabel')}` }, { v: '90d', l: `90 ${t('sfa.daysLabel')}` }].map(p => (
                      <button key={p.v} onClick={() => setAuditFilterPeriod(p.v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${auditFilterPeriod === p.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p.l}</button>
                    ))}
                  </div>
                </div>
                <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 transition-all">
                  <Filter className="w-3.5 h-3.5" /> {t('sfa.applyFilter')}
                </button>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><History className="w-4.5 h-4.5 text-gray-600" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{t('sfa.activityTimeline')}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{auditTimeline.length} {t('sfa.activitiesRecorded')}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {auditTimeline.length === 0 ? (
                  <EmptyState icon={History} title={t('sfa.noActivityRecorded')} subtitle={t('sfa.noActivityRecordedSub')} />
                ) : (
                  <div className="relative">
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent"></div>
                    <div className="space-y-1">
                      {auditTimeline.map((log: any, idx: number) => {
                        const actionColor = log.actionInfo?.color || 'gray';
                        const dotColorMap: Record<string, string> = {
                          green: 'bg-emerald-500 ring-emerald-100', blue: 'bg-blue-500 ring-blue-100', red: 'bg-red-500 ring-red-100',
                          purple: 'bg-purple-500 ring-purple-100', amber: 'bg-amber-500 ring-amber-100', indigo: 'bg-indigo-500 ring-indigo-100',
                          teal: 'bg-teal-500 ring-teal-100', cyan: 'bg-cyan-500 ring-cyan-100', violet: 'bg-violet-500 ring-violet-100', gray: 'bg-gray-400 ring-gray-100'
                        };
                        const bgColorMap: Record<string, string> = {
                          green: 'hover:bg-emerald-50/50', blue: 'hover:bg-blue-50/50', red: 'hover:bg-red-50/50',
                          purple: 'hover:bg-purple-50/50', amber: 'hover:bg-amber-50/50', indigo: 'hover:bg-indigo-50/50',
                          gray: 'hover:bg-gray-50/50'
                        };
                        return (
                          <div key={log.id || idx} className={`relative pl-10 py-3 rounded-xl transition-colors ${bgColorMap[actionColor] || 'hover:bg-gray-50/50'}`}>
                            <div className={`absolute left-[11px] top-[18px] w-2.5 h-2.5 rounded-full ring-4 ${dotColorMap[actionColor] || 'bg-gray-400 ring-gray-100'}`}></div>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm">{log.actionInfo?.icon || '📝'}</span>
                                  <span className="text-sm font-semibold text-gray-900">{log.entityLabel || (log.entity_type || '').replace('_', ' ')}</span>
                                  <Badge color={actionColor === 'green' ? 'green' : actionColor === 'red' ? 'red' : actionColor === 'blue' ? 'blue' : actionColor === 'amber' ? 'yellow' : 'gray'}>{log.actionInfo?.label || log.action}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">{(log.user_name || 'S')[0].toUpperCase()}</span> {log.user_name || 'System'}</span>
                                  {log.entity_id && <><span className="text-gray-300">·</span><span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{String(log.entity_id).slice(0, 12)}</span></>}
                                </div>
                              </div>
                              <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{log.created_at ? new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                            {log.new_values && typeof log.new_values === 'object' && Object.keys(log.new_values).length > 0 && (
                              <details className="mt-2 ml-6">
                                <summary className="text-[11px] text-blue-500 cursor-pointer font-medium hover:text-blue-600 transition-colors">{t('sfa.viewChangeDetails')}</summary>
                                <pre className="mt-2 text-[11px] text-gray-600 bg-gray-50 rounded-xl p-3 overflow-x-auto max-h-40 border border-gray-100 font-mono leading-relaxed">{JSON.stringify(log.new_values, null, 2)}</pre>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>)}

          {/* ═══════════════════════════════════════════ */}
          {/* IMPORT / EXPORT */}
          {/* ═══════════════════════════════════════════ */}
          {tab === 'import-export' && (<>
            <SectionHeader title={t('sfa.importExportTitle')} subtitle={t('sfa.importExportSub')} />

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setIeMode('import'); setIeExportData(null); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${ieMode==='import' ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'}`}><Upload className="w-4 h-4" /> Import</button>
              <button onClick={() => { setIeMode('export'); setIeValidation(null); setIeUploadedData([]); setIeImportResult(null); setIeFileInfo(null); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${ieMode==='export' ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'}`}><Download className="w-4 h-4" /> Export</button>
            </div>

            {/* Entity Selector */}
            {ieEntities && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {/* Entity List Panel */}
                <div className="lg:col-span-1">
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('sfa.selectData')}</h4>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {Object.entries(ieEntities.grouped || {}).map(([cat, ents]: any) => (
                        <div key={cat}>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1.5 px-2">{cat}</div>
                          {ents.map((e: any) => (
                            <button key={e.id} onClick={() => ieLoadTemplate(e.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${ieSelectedEntity===e.id ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                              <div className="flex items-center justify-between">
                                <span>{e.label}</span>
                                <Badge color={e.module==='crm'?'purple':'blue'}>{e.module.toUpperCase()}</Badge>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{e.columnCount} kolom · {e.requiredFields.length} wajib</div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Main Panel */}
                <div className="lg:col-span-3 space-y-4">
                  {!ieSelectedEntity ? (
                    <Card className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><Table2 className="w-8 h-8 text-gray-300" /></div>
                      <h3 className="text-lg font-semibold text-gray-400 mb-1">{t('sfa.selectDataType')}</h3>
                      <p className="text-sm text-gray-300">{t('sfa.selectEntityHint')}</p>
                    </Card>
                  ) : ieMode === 'import' ? (<>
                    {/* ── IMPORT MODE ── */}
                    {/* Step 1: Template */}
                    <Card className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="text-sm font-semibold text-gray-900">1. {t('sfa.downloadTemplate')}</h3><p className="text-xs text-gray-400 mt-0.5">{t('sfa.downloadTemplateDesc', { label: ieTemplate?.label })}</p></div>
                        <button onClick={() => ieDownloadTemplate(ieSelectedEntity)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"><Download className="w-3.5 h-3.5" /> {t('sfa.downloadTemplateBtn')}</button>
                      </div>
                      {ieTemplate && (
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-gray-50">{ieTemplate.headers.map((h: string, i: number) => (
                              <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">
                                {h} {ieTemplate.columns[i]?.required && <span className="text-red-400">*</span>}
                              </th>
                            ))}</tr></thead>
                            <tbody>
                              <tr className="bg-blue-50/30 border-b border-gray-100">{ieTemplate.types.map((t: string, i: number) => (
                                <td key={i} className="px-3 py-1.5 text-[10px] text-blue-500 whitespace-nowrap">{t}</td>
                              ))}</tr>
                              <tr>{ieTemplate.examples.map((ex: string, i: number) => (
                                <td key={i} className="px-3 py-2 text-gray-500 whitespace-nowrap">{ex || <span className="text-gray-200">-</span>}</td>
                              ))}</tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>

                    {/* Step 2: Upload */}
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">2. {t('sfa.uploadFile')}</h3>
                      <p className="text-xs text-gray-400 mb-4">{t('sfa.uploadFileDesc')}</p>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all group">
                        <FileUp className="w-8 h-8 text-gray-300 group-hover:text-amber-400 transition-colors mb-2" />
                        <span className="text-sm text-gray-400 group-hover:text-amber-600 font-medium">{t('sfa.clickToUpload')}</span>
                        <span className="text-[10px] text-gray-300 mt-1">Excel (.xlsx) — Max 10MB</span>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={ieHandleFile} />
                      </label>
                      {ieFileInfo && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-gray-900 truncate">{ieFileInfo.name}</div><div className="text-[10px] text-gray-400">{(ieFileInfo.size/1024).toFixed(1)} KB · {ieFileInfo.rows} baris data</div></div>
                          {ieUploadedData.length > 0 && !ieValidation && (
                            <button onClick={ieValidate} disabled={ieImporting} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50">
                              {ieImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} {t('sfa.validateBtn')}
                            </button>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Step 3: Preview & Validation */}
                    {ieUploadedData.length > 0 && !ieValidation && (
                      <Card className="p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">3. {t('sfa.previewData')}</h3>
                        <p className="text-xs text-gray-400 mb-3">{ieUploadedData.length} {t('sfa.rowsDetected')}</p>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-64">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0"><tr className="bg-gray-50">{Object.keys(ieUploadedData[0] || {}).slice(0, 10).map((k, i) => (
                              <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                            ))}{Object.keys(ieUploadedData[0] || {}).length > 10 && <th className="px-3 py-2.5 text-gray-400">+{Object.keys(ieUploadedData[0]).length - 10}</th>}</tr></thead>
                            <tbody className="divide-y divide-gray-50">{ieUploadedData.slice(0, 20).map((row, ri) => (
                              <tr key={ri} className="hover:bg-gray-50/50">{Object.values(row).slice(0, 10).map((v: any, ci) => (
                                <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[150px] truncate">{String(v ?? '')}</td>
                              ))}{Object.keys(row).length > 10 && <td className="px-3 py-2 text-gray-300">...</td>}</tr>
                            ))}</tbody>
                          </table>
                        </div>
                        {ieUploadedData.length > 20 && <p className="text-[10px] text-gray-400 mt-2 text-center">{t('sfa.showing20of', { total: ieUploadedData.length })}</p>}
                      </Card>
                    )}

                    {/* Validation Results */}
                    {ieValidation && (
                      <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div><h3 className="text-sm font-semibold text-gray-900">{t('sfa.validationResult')}</h3><p className="text-xs text-gray-400 mt-0.5">{ieValidation.totalRows} {t('sfa.rowsProcessed')}</p></div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Valid: <b>{ieValidation.validCount}</b></span>
                            {ieValidation.warningCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> {t('sfa.warnings')}: <b>{ieValidation.warningCount}</b></span>}
                            {ieValidation.errorCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Error: <b>{ieValidation.errorCount}</b></span>}
                          </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-72">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0"><tr className="bg-gray-50">
                              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-12">#</th>
                              <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-20">Status</th>
                              {ieTemplate?.columns?.slice(0, 6).map((c: any, i: number) => <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>)}
                              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">{t('sfa.messageLabel')}</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">{ieValidation.results.slice(0, 50).map((r: any) => (
                              <tr key={r.row} className={r.status==='error'?'bg-red-50/50':r.status==='warning'?'bg-amber-50/30':''}>
                                <td className="px-3 py-2 text-gray-400 font-mono">{r.row}</td>
                                <td className="px-3 py-2 text-center">
                                  {r.status==='valid' && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /></span>}
                                  {r.status==='warning' && <span className="inline-flex items-center gap-1 text-amber-500"><AlertTriangle className="w-3.5 h-3.5" /></span>}
                                  {r.status==='error' && <span className="inline-flex items-center gap-1 text-red-500"><X className="w-3.5 h-3.5" /></span>}
                                </td>
                                {ieTemplate?.columns?.slice(0, 6).map((c: any, ci: number) => (
                                  <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">{String(r.data[c.key] ?? '')}</td>
                                ))}
                                <td className="px-3 py-2">
                                  {r.errors.map((e: string, ei: number) => <div key={ei} className="text-red-500 text-[10px]">{e}</div>)}
                                  {r.warnings.map((w: string, wi: number) => <div key={wi} className="text-amber-500 text-[10px]">{w}</div>)}
                                  {r.errors.length === 0 && r.warnings.length === 0 && <span className="text-gray-300">-</span>}
                                </td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                        {/* Import Button */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-400">{ieValidation.canImport ? t('sfa.rowsReadyImport', { count: ieValidation.validCount + ieValidation.warningCount }) : t('sfa.fixErrorsFirst')}</p>
                          <button onClick={ieDoImport} disabled={!ieValidation.canImport || ieImporting} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 transition-all">
                            {ieImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import {ieValidation.validCount + ieValidation.warningCount}
                          </button>
                        </div>
                      </Card>
                    )}

                    {/* Import Result */}
                    {ieImportResult && (
                      <Card className="p-5">
                        <div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ieImportResult.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>{ieImportResult.failed === 0 ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}</div><div><h3 className="text-sm font-semibold text-gray-900">{t('sfa.importComplete')}</h3><p className="text-xs text-gray-400 mt-0.5">{ieImportResult.inserted} {t('sfa.successLabel')}, {ieImportResult.failed} {t('sfa.failedLabel')}</p></div></div>
                        {ieImportResult.errors?.length > 0 && (
                          <div className="mt-3 space-y-1">{ieImportResult.errors.slice(0, 10).map((err: any, i: number) => (
                            <div key={i} className="text-xs text-red-500 flex items-center gap-2"><span className="text-gray-400 font-mono">{t('sfa.rowLabel')} {err.row}:</span> {err.error}</div>
                          ))}</div>
                        )}
                      </Card>
                    )}
                  </>) : (<>
                    {/* ── EXPORT MODE ── */}
                    <Card className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Export {ieTemplate?.label || ieSelectedEntity}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{t('sfa.exportDesc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => ieDoExport()} disabled={ieImporting} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"><Download className="w-3.5 h-3.5" /> {t('sfa.downloadExcel')}</button>
                        </div>
                      </div>
                    </Card>
                  </>)}
                </div>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {modal === 'lead' && t('sfa.modalAddLead')}
                  {modal === 'opportunity' && t('sfa.modalAddOpp')}
                  {modal === 'visit' && t('sfa.modalScheduleVisit')}
                  {modal === 'field-order' && t('sfa.modalCreateOrder')}
                  {modal === 'competitor' && t('sfa.modalReportCompetitor')}
                  {modal === 'geofence' && t('sfa.modalAddGeofence')}
                  {modal === 'commission' && t('sfa.modalAddCommission')}
                  {modal === 'commission-group' && t('sfa.modalAddCommGroup')}
                  {modal === 'outlet-target' && t('sfa.modalAddOutletTarget')}
                  {modal === 'sales-strategy' && t('sfa.modalCreateStrategy')}
                  {modal === 'crm-customer' && t('sfa.addCustomer')}
                  {modal === 'crm-comm' && t('sfa.logComm')}
                  {modal === 'crm-task' && t('sfa.modalCreateTask')}
                  {modal === 'crm-forecast' && t('sfa.createForecast')}
                  {modal === 'crm-automation' && t('sfa.createRule')}
                  {modal === 'create-team' && t('sfa.modalCreateTeam')}
                  {modal === 'add-member' && t('sfa.modalAddMember', { name: form.team_name || 'Tim' })}
                  {modal === 'setup-ai-model' && t('sfa.modalSetupAi')}
                  {modal === 'add-currency' && t('sfa.addCurrency')}
                  {modal === 'add-rate' && t('sfa.modalAddRate')}
                  {modal === 'add-tax' && t('sfa.modalAddTax')}
                  {modal === 'add-payment-term' && t('sfa.modalAddPaymentTerm')}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{t('sfa.fillFormBelow')}</p>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={
              modal === 'lead' ? handleCreateLead :
              modal === 'opportunity' ? handleCreateOpportunity :
              modal === 'visit' ? handleCreateVisit :
              modal === 'field-order' ? handleCreateFieldOrder :
              modal === 'competitor' ? handleCreateCompetitor :
              modal === 'geofence' ? handleCreateGeofence :
              modal === 'commission' ? handleCreateCommission :
              modal === 'commission-group' ? handleCreateCommissionGroup :
              modal === 'outlet-target' ? handleCreateOutletTarget :
              modal === 'sales-strategy' ? handleCreateSalesStrategy :
              modal === 'crm-customer' ? (e: React.FormEvent) => handleCrmCreate('create-customer', e, t('sfa.customerCreated')) :
              modal === 'crm-comm' ? (e: React.FormEvent) => handleCrmCreate('create-communication', e, t('sfa.commRecorded')) :
              modal === 'crm-task' ? (e: React.FormEvent) => handleCrmCreate('create-task', e, t('sfa.taskCreated')) :
              modal === 'crm-forecast' ? (e: React.FormEvent) => handleCrmCreate('create-forecast', e, t('sfa.forecastCreated')) :
              modal === 'crm-automation' ? (e: React.FormEvent) => handleCrmCreate('create-automation-rule', e, t('sfa.ruleCreated')) :
              modal === 'create-team' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await (await fetch('/api/hq/sfa/enhanced?action=create-team', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
                })).json();
                if (r.success) { showToast(t('sfa.teamCreated')); setModal(null); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'add-member' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await (await fetch('/api/hq/sfa/enhanced?action=add-member', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ team_id: form.team_id, user_id: form.user_id, role: form.role, position: form.position, daily_visit_target: form.daily_visit_target, monthly_revenue_target: form.monthly_revenue_target }),
                })).json();
                if (r.success) { showToast(t('sfa.memberAdded')); setModal(null); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'setup-ai-model' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await (await fetch('/api/hq/sfa/ai-workflow?action=setup-model', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...form, is_default: aiModels.length === 0 }),
                })).json();
                if (r.success) { showToast(t('sfa.modelConfigured')); setModal(null); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'add-currency' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await apiEnh('create-currency', 'POST', form);
                if (r.success) { showToast(t('sfa.currencyAdded')); setModal(null); setForm({}); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'add-rate' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await apiEnh('save-exchange-rate', 'POST', form);
                if (r.success) { showToast(t('sfa.rateSaved')); setModal(null); setForm({}); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'add-tax' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await apiEnh('save-tax', 'POST', form);
                if (r.success) { showToast(t('sfa.taxSaved')); setModal(null); setForm({}); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              modal === 'add-payment-term' ? async (e: React.FormEvent) => {
                e.preventDefault(); setSaving(true);
                const r = await apiEnh('save-payment-term', 'POST', form);
                if (r.success) { showToast(t('sfa.paymentTermSaved')); setModal(null); setForm({}); fetchData(); }
                else showToast(r.error || t('sfa.failedLabel'));
                setSaving(false);
              } :
              (e: React.FormEvent) => e.preventDefault()
            } className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {modal === 'lead' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Perusahaan"><input className={inputCls} value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="PT. Contoh" /></FI>
                <FI label="Nama Kontak" required><input required className={inputCls} value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="John Doe" /></FI>
                <FI label="Email"><input type="email" className={inputCls} value={form.contact_email || ''} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="john@mail.com" /></FI>
                <FI label="Telepon"><input className={inputCls} value={form.contact_phone || ''} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="08xx" /></FI>
                <FI label="Industri"><select className={inputCls} value={form.industry || ''} onChange={e => setForm({ ...form, industry: e.target.value })}><option value="">Pilih Industri</option>{getLookupOpts('industry', [{value:'retail',label:'Retail'},{value:'manufacturing',label:'Manufaktur'},{value:'technology',label:'Teknologi'},{value:'fnb',label:'F&B'},{value:'other',label:'Lainnya'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Sumber"><select className={inputCls} value={form.source || 'manual'} onChange={e => setForm({ ...form, source: e.target.value })}>{getLookupOpts('lead_source', [{value:'manual',label:'Manual'},{value:'website',label:'Website'},{value:'referral',label:'Referral'},{value:'cold_call',label:'Cold Call'},{value:'social_media',label:'Social Media'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Prioritas"><select className={inputCls} value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>{getLookupOpts('lead_priority', [{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Estimasi Nilai (Rp)"><input type="number" className={inputCls} value={form.estimated_value || ''} onChange={e => setForm({ ...form, estimated_value: Number(e.target.value) })} /></FI>
                <FI label="Catatan" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></FI>
              </div>}

              {modal === 'opportunity' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Judul" required span={2}><input required className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></FI>
                <FI label="Customer"><input className={inputCls} value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></FI>
                <FI label="Expected Value"><input type="number" className={inputCls} value={form.expected_value || ''} onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })} /></FI>
                <FI label="Expected Close"><input type="date" className={inputCls} value={form.expected_close_date || ''} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} /></FI>
              </div>}

              {modal === 'visit' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Customer" required><input required className={inputCls} value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></FI>
                <FI label="Tanggal"><input type="date" className={inputCls} value={form.visit_date || ''} onChange={e => setForm({ ...form, visit_date: e.target.value })} /></FI>
                <FI label="Tipe"><select className={inputCls} value={form.visit_type || 'regular'} onChange={e => setForm({ ...form, visit_type: e.target.value })}>{getLookupOpts('visit_type', [{value:'regular',label:'Reguler'},{value:'follow_up',label:'Follow Up'},{value:'demo',label:'Demo'},{value:'closing',label:'Closing'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Tujuan"><input className={inputCls} value={form.purpose || ''} onChange={e => setForm({ ...form, purpose: e.target.value })} /></FI>
              </div>}

              {modal === 'field-order' && <div className="space-y-4">
                <FI label="Nama Customer" required><input required className={inputCls} value={form.customer_name || ''} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></FI>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FI label="Alamat"><input className={inputCls} value={form.customer_address || ''} onChange={e => setForm({ ...form, customer_address: e.target.value })} /></FI>
                  <FI label="Metode Bayar"><select className={inputCls} value={form.payment_method || 'credit'} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{getLookupOpts('payment_method', [{value:'credit',label:'Kredit'},{value:'cash',label:'Tunai'},{value:'transfer',label:'Transfer'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                </div>
                <FI label="Catatan"><textarea className={`${inputCls} resize-none`} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></FI>
              </div>}

              {modal === 'competitor' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Nama Kompetitor" required><input required className={inputCls} value={form.competitor_name || ''} onChange={e => setForm({ ...form, competitor_name: e.target.value })} /></FI>
                <FI label="Brand"><input className={inputCls} value={form.competitor_brand || ''} onChange={e => setForm({ ...form, competitor_brand: e.target.value })} /></FI>
                <FI label="Tipe"><select className={inputCls} value={form.activity_type} onChange={e => setForm({ ...form, activity_type: e.target.value })}>{getLookupOpts('competitor_activity_type', [{value:'promotion',label:'Promosi'},{value:'new_product',label:'Produk Baru'},{value:'price_change',label:'Perubahan Harga'},{value:'display',label:'Display'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Impact"><select className={inputCls} value={form.impact_level} onChange={e => setForm({ ...form, impact_level: e.target.value })}>{getLookupOpts('impact_level', [{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Deskripsi" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></FI>
              </div>}

              {modal === 'geofence' && <div className="space-y-4">
                <FI label="Nama Zone" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></FI>
                <div className="grid grid-cols-3 gap-3">
                  <FI label="Latitude" required><input required type="number" step="any" className={inputCls} value={form.center_lat || ''} onChange={e => setForm({ ...form, center_lat: e.target.value })} /></FI>
                  <FI label="Longitude" required><input required type="number" step="any" className={inputCls} value={form.center_lng || ''} onChange={e => setForm({ ...form, center_lng: e.target.value })} /></FI>
                  <FI label="Radius (m)"><input type="number" className={inputCls} value={form.radius_meters || 200} onChange={e => setForm({ ...form, radius_meters: parseInt(e.target.value) })} /></FI>
                </div>
              </div>}

              {modal === 'commission' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FI label="Pilih Produk dari Inventory" required>
                    <select required className={inputCls} value={form.product_id || ''} onChange={e => {
                      const p = inventoryProducts.find((x: any) => String(x.id) === e.target.value);
                      if (p) setForm({ ...form, product_id: p.id, product_name: p.name, product_sku: p.sku || '', category_name: p.category || '' });
                      else setForm({ ...form, product_id: '', product_name: '', product_sku: '', category_name: '' });
                    }}>
                      <option value="">-- Pilih Produk --</option>
                      {inventoryProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''} — {p.category || 'Tanpa Kategori'}</option>)}
                    </select>
                  </FI>
                </div>
                {form.product_name && <div className="sm:col-span-2 bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-800 flex gap-4">
                  <span><strong>Produk:</strong> {form.product_name}</span>
                  <span><strong>SKU:</strong> {form.product_sku || '-'}</span>
                  <span><strong>Kategori:</strong> {form.category_name || '-'}</span>
                </div>}
                <FI label="Tipe"><select className={inputCls} value={form.commission_type} onChange={e => setForm({ ...form, commission_type: e.target.value })}>{getLookupOpts('commission_type', [{value:'percentage',label:'Persentase'},{value:'flat',label:'Flat'},{value:'tiered',label:'Tiered'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Rate (%)"><input type="number" step="0.01" className={inputCls} value={form.commission_rate || 0} onChange={e => setForm({ ...form, commission_rate: parseFloat(e.target.value) })} /></FI>
              </div>}

              {modal === 'commission-group' && <div className="space-y-4">
                <FI label="Nama Group" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bundle Roti + Mentega" /></FI>
                <div className="grid grid-cols-2 gap-3">
                  <FI label="Tipe Group"><select className={inputCls} value={form.group_type || 'bundle'} onChange={e => setForm({ ...form, group_type: e.target.value })}><option value="bundle">Bundle</option><option value="cross_sell">Cross-sell</option><option value="upsell">Upsell</option><option value="volume_mix">Volume Mix</option></select></FI>
                  <FI label="Metode Kalkulasi"><select className={inputCls} value={form.calculation_method || 'flat'} onChange={e => setForm({ ...form, calculation_method: e.target.value })}><option value="flat">Flat Amount</option><option value="percentage">Persentase</option></select></FI>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {form.calculation_method === 'percentage' ? <FI label="Bonus (%)"><input type="number" step="0.01" className={inputCls} value={form.bonus_percentage || 0} onChange={e => setForm({ ...form, bonus_percentage: parseFloat(e.target.value) })} /></FI>
                    : <FI label="Bonus (Rp)"><input type="number" className={inputCls} value={form.bonus_amount || 0} onChange={e => setForm({ ...form, bonus_amount: parseFloat(e.target.value) })} /></FI>}
                  <FI label="Min Total Qty"><input type="number" className={inputCls} value={form.min_total_quantity || 0} onChange={e => setForm({ ...form, min_total_quantity: parseInt(e.target.value) })} /></FI>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Produk dalam Group (min. 2)</span>
                    <button type="button" onClick={() => setForm({ ...form, products: [...(form.products || []), { product_id: '', product_name: '', product_sku: '', min_quantity: 1 }] })} className="text-xs text-blue-600 hover:underline">+ Tambah Produk</button>
                  </div>
                  {(form.products || []).map((p: any, pi: number) => (
                    <div key={pi} className="flex gap-2 mb-2 items-end">
                      <div className="flex-1">
                        <select className={inputCls} value={p.product_id || ''} onChange={e => {
                          const prod = inventoryProducts.find((x: any) => String(x.id) === e.target.value);
                          const prods = [...form.products]; prods[pi] = { ...prods[pi], product_id: prod?.id || '', product_name: prod?.name || '', product_sku: prod?.sku || '' };
                          setForm({ ...form, products: prods });
                        }}>
                          <option value="">-- Pilih Produk --</option>
                          {inventoryProducts.map((ip: any) => <option key={ip.id} value={ip.id}>{ip.name} ({ip.sku || '-'})</option>)}
                        </select>
                      </div>
                      <div className="w-20"><input type="number" min={1} placeholder="Min Qty" className={inputCls} value={p.min_quantity || 1} onChange={e => { const prods = [...form.products]; prods[pi] = { ...prods[pi], min_quantity: parseInt(e.target.value) }; setForm({ ...form, products: prods }); }} /></div>
                      <button type="button" onClick={() => { const prods = form.products.filter((_: any, i: number) => i !== pi); setForm({ ...form, products: prods }); }} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <FI label="Catatan"><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></FI>
              </div>}

              {modal === 'outlet-target' && <div className="space-y-4">
                <div className="sm:col-span-2">
                  <FI label="Pilih Produk" required>
                    <select required className={inputCls} value={form.product_id || ''} onChange={e => {
                      const p = inventoryProducts.find((x: any) => String(x.id) === e.target.value);
                      if (p) setForm({ ...form, product_id: p.id, product_name: p.name, product_sku: p.sku || '' });
                      else setForm({ ...form, product_id: '', product_name: '', product_sku: '' });
                    }}>
                      <option value="">-- Pilih Produk --</option>
                      {inventoryProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || '-'})</option>)}
                    </select>
                  </FI>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FI label="Tipe Target"><select className={inputCls} value={form.target_type || 'outlet_count'} onChange={e => setForm({ ...form, target_type: e.target.value })}><option value="outlet_count">Jumlah Outlet</option><option value="new_outlet">Outlet Baru (NOO)</option><option value="active_outlet">Outlet Aktif</option><option value="customer_count">Jumlah Customer</option></select></FI>
                  <FI label="Target Value" required><input required type="number" className={inputCls} value={form.target_value || ''} onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) })} placeholder="e.g. 50" /></FI>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FI label="Periode"><select className={inputCls} value={form.period_type || 'monthly'} onChange={e => setForm({ ...form, period_type: e.target.value })}><option value="monthly">Bulanan</option><option value="quarterly">Kuartalan</option></select></FI>
                  <FI label="Tahun"><input type="number" className={inputCls} value={form.year || new Date().getFullYear()} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} /></FI>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-medium text-gray-600 mb-3">Tier Achievement & Bonus</div>
                  <div className="grid grid-cols-4 gap-3">
                    {(['bronze', 'silver', 'gold', 'platinum'] as const).map(t => (
                      <div key={t} className="space-y-2">
                        <div className="text-center text-xs font-bold text-gray-500 uppercase">{t}</div>
                        <input type="number" step="1" className={inputCls + ' text-center text-xs'} value={form[`${t}_threshold_pct`] || ''} onChange={e => setForm({ ...form, [`${t}_threshold_pct`]: parseInt(e.target.value) })} placeholder="%" />
                        <input type="number" className={inputCls + ' text-center text-xs'} value={form[`${t}_bonus`] || ''} onChange={e => setForm({ ...form, [`${t}_bonus`]: parseInt(e.target.value) })} placeholder="Rp" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-1 text-[10px] text-gray-400 text-center"><span>Threshold %</span><span>Threshold %</span><span>Threshold %</span><span>Threshold %</span></div>
                  <div className="grid grid-cols-4 gap-3 text-[10px] text-gray-400 text-center"><span>Bonus Rp</span><span>Bonus Rp</span><span>Bonus Rp</span><span>Bonus Rp</span></div>
                </div>
              </div>}

              {modal === 'sales-strategy' && <div className="space-y-4">
                <FI label="Nama Strategy" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q1 2026 Revenue Push" /></FI>
                <FI label="Deskripsi"><textarea className={inputCls} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></FI>
                <div className="grid grid-cols-3 gap-3">
                  <FI label="Tipe Strategy"><select className={inputCls} value={form.strategy_type || 'balanced'} onChange={e => setForm({ ...form, strategy_type: e.target.value })}><option value="balanced">Balanced</option><option value="revenue_focus">Revenue Focus</option><option value="volume_focus">Volume Focus</option><option value="coverage">Coverage</option><option value="penetration">Penetration</option><option value="retention">Retention</option></select></FI>
                  <FI label="Periode"><select className={inputCls} value={form.period_type || 'monthly'} onChange={e => setForm({ ...form, period_type: e.target.value })}><option value="monthly">Bulanan</option><option value="quarterly">Kuartalan</option><option value="yearly">Tahunan</option></select></FI>
                  <FI label="Tahun"><input type="number" className={inputCls} value={form.year || new Date().getFullYear()} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} /></FI>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">KPI Parameters</span>
                    <button type="button" onClick={() => setForm({ ...form, kpis: [...(form.kpis || []), { kpi_name: '', kpi_type: 'revenue', target_value: 0, weight: 0, unit: '' }] })} className="text-xs text-blue-600 hover:underline">+ Tambah KPI</button>
                  </div>
                  <div className="space-y-3">
                    {(form.kpis || []).map((k: any, ki: number) => (
                      <div key={ki} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-500">KPI #{ki + 1}</span>
                          {form.kpis.length > 1 && <button type="button" onClick={() => { const kpis = form.kpis.filter((_: any, i: number) => i !== ki); setForm({ ...form, kpis }); }} className="text-xs text-red-400 hover:text-red-600">Hapus</button>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input className={inputCls} placeholder="Nama KPI (e.g. Revenue)" value={k.kpi_name || ''} onChange={e => { const kpis = [...form.kpis]; kpis[ki] = { ...kpis[ki], kpi_name: e.target.value }; setForm({ ...form, kpis }); }} />
                          <select className={inputCls} value={k.kpi_type || 'revenue'} onChange={e => { const kpis = [...form.kpis]; kpis[ki] = { ...kpis[ki], kpi_type: e.target.value }; setForm({ ...form, kpis }); }}>
                            <option value="revenue">Revenue</option><option value="volume">Volume</option><option value="outlet_count">Outlet Count</option><option value="visit_count">Visit Count</option><option value="new_customer">New Customer</option><option value="effective_call">Effective Call</option><option value="product_mix">Product Mix</option><option value="collection">Collection</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" className={inputCls} placeholder="Target" value={k.target_value || ''} onChange={e => { const kpis = [...form.kpis]; kpis[ki] = { ...kpis[ki], target_value: parseFloat(e.target.value) }; setForm({ ...form, kpis }); }} />
                          <input type="number" className={inputCls} placeholder="Bobot (%)" value={k.weight || ''} onChange={e => { const kpis = [...form.kpis]; kpis[ki] = { ...kpis[ki], weight: parseFloat(e.target.value) }; setForm({ ...form, kpis }); }} />
                          <input className={inputCls} placeholder="Unit (Rp/pcs)" value={k.unit || ''} onChange={e => { const kpis = [...form.kpis]; kpis[ki] = { ...kpis[ki], unit: e.target.value }; setForm({ ...form, kpis }); }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {form.kpis?.length > 0 && <div className="text-xs text-gray-400 mt-1">Total Bobot: <strong>{(form.kpis || []).reduce((s: number, k: any) => s + (parseFloat(k.weight) || 0), 0)}%</strong> (harus 100%)</div>}
                </div>
              </div>}

              {modal === 'crm-customer' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Nama Tampilan" required><input required className={inputCls} value={form.display_name || ''} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="PT. Contoh / John Doe" /></FI>
                <FI label="Nama Perusahaan"><input className={inputCls} value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })} /></FI>
                <FI label="Tipe"><select className={inputCls} value={form.customer_type || 'company'} onChange={e => setForm({ ...form, customer_type: e.target.value })}>{getLookupOpts('customer_type', [{value:'company',label:'Perusahaan'},{value:'individual',label:'Individu'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Industri"><select className={inputCls} value={form.industry || ''} onChange={e => setForm({ ...form, industry: e.target.value })}><option value="">Pilih Industri</option>{getLookupOpts('industry', [{value:'retail',label:'Retail'},{value:'manufacturing',label:'Manufaktur'},{value:'technology',label:'Teknologi'},{value:'other',label:'Lainnya'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Lifecycle"><select className={inputCls} value={form.lifecycle_stage || 'prospect'} onChange={e => setForm({ ...form, lifecycle_stage: e.target.value })}>{getLookupOpts('lifecycle_stage', [{value:'prospect',label:'Prospect'},{value:'lead',label:'Lead'},{value:'opportunity',label:'Opportunity'},{value:'customer',label:'Customer'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Segment"><select className={inputCls} value={form.segment || ''} onChange={e => setForm({ ...form, segment: e.target.value })}><option value="">-</option>{getLookupOpts('customer_segment', [{value:'platinum',label:'Platinum'},{value:'gold',label:'Gold'},{value:'silver',label:'Silver'},{value:'bronze',label:'Bronze'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Sumber Akuisisi"><select className={inputCls} value={form.acquisition_source || ''} onChange={e => setForm({ ...form, acquisition_source: e.target.value })}><option value="">-</option>{getLookupOpts('acquisition_source', [{value:'website',label:'Website'},{value:'referral',label:'Referral'},{value:'cold_call',label:'Cold Call'},{value:'event',label:'Event'},{value:'social_media',label:'Social Media'},{value:'partner',label:'Partner'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Credit Limit"><input type="number" className={inputCls} value={form.credit_limit || ''} onChange={e => setForm({ ...form, credit_limit: Number(e.target.value) })} /></FI>
                <FI label="Kota"><input className={inputCls} value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></FI>
                <FI label="Provinsi"><input className={inputCls} value={form.province || ''} onChange={e => setForm({ ...form, province: e.target.value })} /></FI>
                <FI label="Alamat" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></FI>
                <FI label="Catatan" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></FI>
              </div>}

              {modal === 'crm-comm' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Tipe Komunikasi" required><select required className={inputCls} value={form.comm_type || 'call'} onChange={e => setForm({ ...form, comm_type: e.target.value })}>{getLookupOpts('comm_type', [{value:'call',label:'Telepon'},{value:'email',label:'Email'},{value:'meeting',label:'Meeting'},{value:'whatsapp',label:'WhatsApp'},{value:'sms',label:'SMS'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Arah"><select className={inputCls} value={form.direction || 'outbound'} onChange={e => setForm({ ...form, direction: e.target.value })}>{getLookupOpts('comm_direction', [{value:'outbound',label:'Outbound'},{value:'inbound',label:'Inbound'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Subject" span={2}><input className={inputCls} value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Topik komunikasi" /></FI>
                <FI label="Status"><select className={inputCls} value={form.status || 'completed'} onChange={e => setForm({ ...form, status: e.target.value })}>{getLookupOpts('comm_status', [{value:'completed',label:'Selesai'},{value:'scheduled',label:'Dijadwalkan'},{value:'missed',label:'Terlewat'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Outcome"><select className={inputCls} value={form.outcome || ''} onChange={e => setForm({ ...form, outcome: e.target.value })}><option value="">-</option>{getLookupOpts('comm_outcome', [{value:'positive',label:'Positif'},{value:'neutral',label:'Netral'},{value:'negative',label:'Negatif'},{value:'no_answer',label:'Tidak Dijawab'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Durasi (menit)"><input type="number" className={inputCls} value={form.call_duration || ''} onChange={e => setForm({ ...form, call_duration: parseInt(e.target.value) })} /></FI>
                <FI label="Next Action"><input className={inputCls} value={form.next_action || ''} onChange={e => setForm({ ...form, next_action: e.target.value })} placeholder="Tindak lanjut" /></FI>
                <FI label="Isi / Catatan" span={2}><textarea className={`${inputCls} resize-none`} rows={3} value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Detail komunikasi..." /></FI>
              </div>}

              {modal === 'crm-task' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Judul Task" required span={2}><input required className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Deskripsi task" /></FI>
                <FI label="Tipe"><select className={inputCls} value={form.task_type || 'follow_up'} onChange={e => setForm({ ...form, task_type: e.target.value })}>{getLookupOpts('task_type', [{value:'call',label:'Call'},{value:'email',label:'Email'},{value:'meeting',label:'Meeting'},{value:'follow_up',label:'Follow Up'},{value:'review',label:'Review'},{value:'approval',label:'Approval'},{value:'custom',label:'Custom'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Prioritas"><select className={inputCls} value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>{getLookupOpts('task_priority', [{value:'urgent',label:'Urgent'},{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Due Date"><input type="date" className={inputCls} value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></FI>
                <FI label="Estimasi Jam"><input type="number" step="0.5" className={inputCls} value={form.estimated_hours || ''} onChange={e => setForm({ ...form, estimated_hours: parseFloat(e.target.value) })} /></FI>
                <FI label="Deskripsi" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></FI>
              </div>}

              {modal === 'crm-forecast' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Nama Forecast" required span={2}><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Q1 2025 Forecast" /></FI>
                <FI label="Periode"><select className={inputCls} value={form.forecast_period || 'monthly'} onChange={e => setForm({ ...form, forecast_period: e.target.value })}>{getLookupOpts('forecast_period', [{value:'monthly',label:'Bulanan'},{value:'quarterly',label:'Kuartalan'},{value:'yearly',label:'Tahunan'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Status"><select className={inputCls} value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{getLookupOpts('forecast_status', [{value:'draft',label:'Draft'},{value:'submitted',label:'Submitted'},{value:'approved',label:'Approved'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Mulai"><input type="date" required className={inputCls} value={form.period_start || ''} onChange={e => setForm({ ...form, period_start: e.target.value })} /></FI>
                <FI label="Akhir"><input type="date" required className={inputCls} value={form.period_end || ''} onChange={e => setForm({ ...form, period_end: e.target.value })} /></FI>
                <FI label="Target Revenue"><input type="number" className={inputCls} value={form.target_revenue || ''} onChange={e => setForm({ ...form, target_revenue: Number(e.target.value) })} /></FI>
                <FI label="Target Deals"><input type="number" className={inputCls} value={form.target_deals || ''} onChange={e => setForm({ ...form, target_deals: parseInt(e.target.value) })} /></FI>
                <FI label="Best Case"><input type="number" className={inputCls} value={form.best_case || ''} onChange={e => setForm({ ...form, best_case: Number(e.target.value) })} /></FI>
                <FI label="Most Likely"><input type="number" className={inputCls} value={form.most_likely || ''} onChange={e => setForm({ ...form, most_likely: Number(e.target.value) })} /></FI>
                <FI label="Catatan" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></FI>
              </div>}

              {modal === 'crm-automation' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Nama Rule" required span={2}><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Auto-assign lead baru" /></FI>
                <FI label="Tipe Rule"><select className={inputCls} value={form.rule_type || 'trigger'} onChange={e => setForm({ ...form, rule_type: e.target.value })}>{getLookupOpts('automation_rule_type', [{value:'trigger',label:'Trigger'},{value:'scheduled',label:'Scheduled'},{value:'manual',label:'Manual'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Entity"><select className={inputCls} value={form.trigger_entity || 'lead'} onChange={e => setForm({ ...form, trigger_entity: e.target.value })}>{getLookupOpts('trigger_entity', [{value:'lead',label:'Lead'},{value:'opportunity',label:'Opportunity'},{value:'customer',label:'Customer'},{value:'ticket',label:'Ticket'},{value:'task',label:'Task'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Trigger Event"><select className={inputCls} value={form.trigger_event || 'lead_created'} onChange={e => setForm({ ...form, trigger_event: e.target.value })}>{getLookupOpts('trigger_event', [{value:'lead_created',label:'Lead Created'},{value:'deal_stage_changed',label:'Deal Stage Changed'},{value:'ticket_created',label:'Ticket Created'},{value:'task_overdue',label:'Task Overdue'},{value:'customer_inactive',label:'Customer Inactive'},{value:'health_score_drop',label:'Health Score Drop'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Prioritas"><input type="number" className={inputCls} value={form.priority || 0} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} /></FI>
                <FI label="Deskripsi" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Apa yang dilakukan rule ini..." /></FI>
              </div>}

              {modal === 'create-team' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Kode Tim" required><input required className={inputCls} value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="FF-JAKARTA" /></FI>
                <FI label="Nama Tim" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tim Jakarta Barat" /></FI>
                <FI label="Tipe Tim"><select className={inputCls} value={form.team_type || 'field_force'} onChange={e => setForm({ ...form, team_type: e.target.value })}>{getLookupOpts('team_type', [{value:'field_force',label:'Field Force'},{value:'inside_sales',label:'Inside Sales'},{value:'key_account',label:'Key Account'},{value:'telemarketing',label:'Telemarketing'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Maks Anggota"><input type="number" className={inputCls} value={form.max_members || 20} onChange={e => setForm({ ...form, max_members: parseInt(e.target.value) })} /></FI>
                <FI label="Territory">
                  <select className={inputCls} value={form.territory_id || ''} onChange={e => setForm({ ...form, territory_id: e.target.value || null })}>
                    <option value="">Pilih Territory</option>
                    {territories.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </FI>
                <FI label="Leader">
                  <select className={inputCls} value={form.leader_id || ''} onChange={e => setForm({ ...form, leader_id: e.target.value || null })}>
                    <option value="">Pilih Leader</option>
                    {hrisAvailableUsers.filter((u: any) => u.role === 'manager' || u.role === 'admin').map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.hris_department || u.role})</option>)}
                  </select>
                </FI>
                <FI label="Deskripsi" span={2}><textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi tim..." /></FI>
              </div>}

              {modal === 'add-member' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Anggota" required span={2}>
                  <select required className={inputCls} value={form.user_id || ''} onChange={e => {
                    const u = hrisAvailableUsers.find((u2: any) => String(u2.id) === e.target.value);
                    setForm({ ...form, user_id: e.target.value, position: u?.hris_position || form.position });
                  }}>
                    <option value="">Pilih Karyawan</option>
                    {hrisAvailableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name} {u.hris_department ? `(${u.hris_department})` : ''} {u.current_team ? `[${u.current_team}]` : ''}</option>)}
                  </select>
                </FI>
                <FI label="Role"><select className={inputCls} value={form.role || 'member'} onChange={e => setForm({ ...form, role: e.target.value })}>{getLookupOpts('member_role', [{value:'member',label:'Member'},{value:'leader',label:'Leader'},{value:'supervisor',label:'Supervisor'}]).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FI>
                <FI label="Posisi"><input className={inputCls} value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Sales Executive" /></FI>
                <FI label="Target Kunjungan/Hari"><input type="number" className={inputCls} value={form.daily_visit_target || 8} onChange={e => setForm({ ...form, daily_visit_target: parseInt(e.target.value) })} /></FI>
                <FI label="Target Revenue/Bulan"><input type="number" className={inputCls} value={form.monthly_revenue_target || 0} onChange={e => setForm({ ...form, monthly_revenue_target: parseInt(e.target.value) })} /></FI>
              </div>}

              {modal === 'setup-ai-model' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Provider" required><select required className={inputCls} value={form.provider || ''} onChange={e => {
                  const catalog = aiModelCatalog.filter((m: any) => m.provider === e.target.value);
                  setForm({ ...form, provider: e.target.value, model_id: catalog[0]?.model_id || '', name: catalog[0]?.name || '' });
                }}>
                  <option value="">Pilih Provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                  <option value="local">Local (Ollama)</option>
                </select></FI>
                <FI label="Model" required><select required className={inputCls} value={form.model_id || ''} onChange={e => {
                  const m = aiModelCatalog.find((m2: any) => m2.model_id === e.target.value);
                  setForm({ ...form, model_id: e.target.value, name: m?.name || e.target.value, capabilities: m?.capabilities || [], cost_per_1k_input: m?.cost_input, cost_per_1k_output: m?.cost_output, max_context_tokens: m?.max_tokens });
                }}>
                  <option value="">Pilih Model</option>
                  {aiModelCatalog.filter((m: any) => !form.provider || m.provider === form.provider).map((m: any) => <option key={m.model_id} value={m.model_id}>{m.name}</option>)}
                </select></FI>
                <FI label="API Key" span={2}><input className={inputCls} type="password" value={form.api_key_ref || ''} onChange={e => setForm({ ...form, api_key_ref: e.target.value })} placeholder="sk-... (opsional, bisa di env)" /></FI>
              </div>}

              {modal === 'add-currency' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Kode (3 huruf)" required><input required className={inputCls} maxLength={10} value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="USD" /></FI>
                <FI label="Nama Mata Uang" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" /></FI>
                <FI label="Simbol"><input className={inputCls} value={form.symbol || ''} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="$" /></FI>
                <FI label="Jumlah Desimal"><input type="number" className={inputCls} min={0} max={6} value={form.decimal_places ?? 2} onChange={e => setForm({ ...form, decimal_places: parseInt(e.target.value) })} /></FI>
                <FI label="Pemisah Ribuan"><select className={inputCls} value={form.thousand_separator || '.'} onChange={e => setForm({ ...form, thousand_separator: e.target.value })}><option value=".">Titik (.)</option><option value=",">Koma (,)</option><option value=" ">Spasi</option></select></FI>
                <FI label="Pemisah Desimal"><select className={inputCls} value={form.decimal_separator || ','} onChange={e => setForm({ ...form, decimal_separator: e.target.value })}><option value=",">Koma (,)</option><option value=".">Titik (.)</option></select></FI>
                <FI label="Posisi Simbol"><select className={inputCls} value={form.symbol_position || 'before'} onChange={e => setForm({ ...form, symbol_position: e.target.value })}><option value="before">Sebelum (Rp 100)</option><option value="after">Sesudah (100 €)</option></select></FI>
                <FI label="Jadikan Default"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default || false} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Default Currency</span></label></FI>
              </div>}

              {modal === 'add-rate' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Dari Currency" required><select required className={inputCls} value={form.from_currency || ''} onChange={e => setForm({ ...form, from_currency: e.target.value })}><option value="">Pilih</option>{currencies.filter((c: any) => c.is_active).map((c: any) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}</select></FI>
                <FI label="Ke Currency" required><select required className={inputCls} value={form.to_currency || ''} onChange={e => setForm({ ...form, to_currency: e.target.value })}><option value="">Pilih</option>{currencies.filter((c: any) => c.is_active).map((c: any) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}</select></FI>
                <FI label="Rate" required><input required type="number" step="0.000001" className={inputCls} value={form.rate || ''} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) })} placeholder="16250.00" /></FI>
                <FI label="Tanggal Berlaku"><input type="date" className={inputCls} value={form.effective_date || new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></FI>
                <FI label="Tanggal Berakhir"><input type="date" className={inputCls} value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></FI>
                <FI label="Sumber"><select className={inputCls} value={form.source || 'manual'} onChange={e => setForm({ ...form, source: e.target.value })}><option value="manual">Manual</option><option value="api">API</option><option value="bank">Bank</option></select></FI>
                <FI label="Catatan" span={2}><input className={inputCls} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan opsional" /></FI>
              </div>}

              {modal === 'add-tax' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Kode" required><input required className={inputCls} value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PPN" /></FI>
                <FI label="Nama Pajak" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PPN 11%" /></FI>
                <FI label="Tipe Pajak"><select className={inputCls} value={form.tax_type || 'vat'} onChange={e => setForm({ ...form, tax_type: e.target.value })}><option value="vat">VAT / PPN</option><option value="income">PPh (Income)</option><option value="withholding">Withholding</option><option value="service">Service Tax</option></select></FI>
                <FI label="Tarif (%)" required><input required type="number" step="0.01" className={inputCls} value={form.rate ?? 0} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) })} placeholder="11" /></FI>
                <FI label="Berlaku Untuk"><select className={inputCls} value={form.applies_to || 'all'} onChange={e => setForm({ ...form, applies_to: e.target.value })}><option value="all">Semua</option><option value="product">Produk</option><option value="service">Jasa</option></select></FI>
                <FI label="Opsi"><div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_inclusive || false} onChange={e => setForm({ ...form, is_inclusive: e.target.checked })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Pajak Inklusif (sudah termasuk harga)</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default || false} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Jadikan Default</span></label>
                </div></FI>
              </div>}

              {modal === 'add-payment-term' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FI label="Kode" required><input required className={inputCls} value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="NET30" /></FI>
                <FI label="Nama" required><input required className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Net 30 Hari" /></FI>
                <FI label="Deskripsi" span={2}><input className={inputCls} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jatuh tempo 30 hari setelah invoice" /></FI>
                <FI label="Jatuh Tempo (hari)"><input type="number" className={inputCls} min={0} value={form.days_due ?? 0} onChange={e => setForm({ ...form, days_due: parseInt(e.target.value) })} /></FI>
                <FI label="Diskon Early Payment (%)"><input type="number" step="0.01" className={inputCls} min={0} value={form.discount_percentage ?? 0} onChange={e => setForm({ ...form, discount_percentage: parseFloat(e.target.value) })} /></FI>
                <FI label="Bayar Dalam (hari) untuk Diskon"><input type="number" className={inputCls} min={0} value={form.discount_days ?? 0} onChange={e => setForm({ ...form, discount_days: parseInt(e.target.value) })} /></FI>
                <FI label="Tipe Denda Keterlambatan"><select className={inputCls} value={form.late_fee_type || 'none'} onChange={e => setForm({ ...form, late_fee_type: e.target.value })}><option value="none">Tidak Ada</option><option value="percentage">Persentase (%)</option><option value="flat">Nominal Tetap (Rp)</option></select></FI>
                {form.late_fee_type && form.late_fee_type !== 'none' && (
                  <FI label={form.late_fee_type === 'percentage' ? 'Denda (%)' : 'Denda (Rp)'}><input type="number" step="0.01" className={inputCls} min={0} value={form.late_fee_value ?? 0} onChange={e => setForm({ ...form, late_fee_value: parseFloat(e.target.value) })} /></FI>
                )}
                <FI label="Opsi"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default || false} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Jadikan Default</span></label></FI>
              </div>}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">{t('sfa.cancelBtn')}</button>
                <button type="submit" disabled={saving} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t('sfa.saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
