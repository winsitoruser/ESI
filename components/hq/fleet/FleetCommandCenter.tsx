import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, ArrowRightLeft, Award,
  BarChart3, Bell, Boxes, Building2, Calendar, Car, CheckCircle, ChevronRight,
  ClipboardList, Clock, CreditCard, Crosshair, DollarSign, Disc, Download,
  Factory, FileText, Fuel, Gauge, Globe, Inbox, KeyRound, Layers, LayoutDashboard,
  Link2, LinkIcon, Loader2, MapPin, Navigation, Package, PieChart as PieChartIcon,
  Plug, Receipt, RefreshCw, Send, Shield, ShoppingCart, Smartphone, Star, Target,
  Timer, TrendingUp, Truck, Users, Warehouse, Wallet, Wrench, Zap, Briefcase,
  BadgeCheck, Sparkles, Gift, HeartPulse, Workflow,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';

// ========================= Types =========================
type TabKey =
  | 'overview'
  | 'operations'
  | 'tracking'
  | 'transport'
  | 'analytics'
  | 'financial'
  | 'supply-chain'
  | 'driver-app'
  | 'hris'
  | 'finance'
  | 'inventory'
  | 'manufacturing'
  | 'module-hub';

const CHART_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#3B82F6','#14B8A6'];

const ICONS: Record<string, any> = {
  Truck, Users, Wrench, Fuel, ClipboardList, AlertTriangle, Navigation, Zap, Activity,
  Crosshair, Package, Send, Building2, MapPin, Timer, BarChart3, Target, Award, Star,
  Disc, DollarSign, Wallet, Receipt, CreditCard, KeyRound, FileText, Bell, Globe,
  Warehouse, LayoutDashboard, Car, Factory, ArrowRightLeft, Inbox, ShoppingCart,
  Boxes, Layers, Workflow,
};

// ========================= Helpers =========================
const fmt = (n: any) => Number(n || 0).toLocaleString('id-ID');
const fmtRp = (n: any) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
const fmtRpShort = (n: any) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `Rp ${(v/1_000_000_000).toFixed(1)} M`;
  if (v >= 1_000_000) return `Rp ${(v/1_000_000).toFixed(1)} Jt`;
  if (v >= 1_000) return `Rp ${(v/1_000).toFixed(0)} Rb`;
  return `Rp ${v}`;
};
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID') : '-';
const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString('id-ID') : '-';

// Static color map (Tailwind JIT friendly — ensures classes are detected)
const COLOR_BG: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  purple: 'bg-purple-50 text-purple-600',
  pink: 'bg-pink-50 text-pink-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  teal: 'bg-teal-50 text-teal-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
  green: 'bg-green-50 text-green-600',
};

const MOD_BADGE_STYLE: Record<string, { color: string; icon: any }> = {
  driver_app: { color: 'from-indigo-500 to-purple-500', icon: Smartphone },
  hris: { color: 'from-emerald-500 to-teal-500', icon: HeartPulse },
  finance: { color: 'from-amber-500 to-orange-500', icon: Wallet },
  inventory: { color: 'from-sky-500 to-cyan-500', icon: Warehouse },
  manufacturing: { color: 'from-fuchsia-500 to-pink-500', icon: Factory },
  pos: { color: 'from-rose-500 to-pink-500', icon: Receipt },
  procurement: { color: 'from-slate-500 to-gray-500', icon: Briefcase },
};

const VALID_TABS: TabKey[] = [
  'overview', 'operations', 'tracking', 'transport', 'analytics', 'financial',
  'supply-chain', 'driver-app', 'hris', 'finance', 'inventory', 'manufacturing', 'module-hub',
];

// ========================= Component =========================
export default function FleetCommandCenter() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync tab from query string (e.g. /hq/fleet?tab=manufacturing)
  useEffect(() => {
    if (!router.isReady) return;
    const q = (router.query.tab as string) || '';
    if (q && VALID_TABS.includes(q as TabKey) && q !== tab) {
      setTab(q as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.tab]);

  // Overview state
  const [kpi, setKpi] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [moduleLinks, setModuleLinks] = useState<any>(null);
  const [costBreakdown, setCostBreakdown] = useState<any[]>([]);
  const [deliveryTrend, setDeliveryTrend] = useState<any[]>([]);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);
  const [topVehicles, setTopVehicles] = useState<any[]>([]);

  // Integration tabs state
  const [driverApp, setDriverApp] = useState<any>(null);
  const [driverAppExpenses, setDriverAppExpenses] = useState<any[]>([]);
  const [driverAppSessions, setDriverAppSessions] = useState<any[]>([]);
  const [driverAppPods, setDriverAppPods] = useState<any[]>([]);

  const [hrisSummary, setHrisSummary] = useState<any>(null);
  const [hrisDrivers, setHrisDrivers] = useState<any[]>([]);
  const [hrisAttendance, setHrisAttendance] = useState<any[]>([]);
  const [hrisPayroll, setHrisPayroll] = useState<any>(null);

  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [financeJournals, setFinanceJournals] = useState<any[]>([]);
  const [financePayables, setFinancePayables] = useState<any[]>([]);
  const [financeFreight, setFinanceFreight] = useState<any[]>([]);

  const [invSummary, setInvSummary] = useState<any>(null);
  const [invCatalog, setInvCatalog] = useState<any[]>([]);
  const [invLowStock, setInvLowStock] = useState<any[]>([]);
  const [invMovements, setInvMovements] = useState<any[]>([]);
  const [invDispatch, setInvDispatch] = useState<any[]>([]);
  const [invWarehouses, setInvWarehouses] = useState<any[]>([]);
  const [invTransfers, setInvTransfers] = useState<any[]>([]);
  const [invReceipts, setInvReceipts] = useState<any[]>([]);
  const [invReorder, setInvReorder] = useState<any[]>([]);

  // Manufacturing state
  const [mfgSummary, setMfgSummary] = useState<any>(null);
  const [mfgActive, setMfgActive] = useState<any[]>([]);
  const [mfgReady, setMfgReady] = useState<any[]>([]);
  const [mfgMaterials, setMfgMaterials] = useState<any[]>([]);
  const [mfgShipments, setMfgShipments] = useState<any[]>([]);
  const [mfgCapacity, setMfgCapacity] = useState<any[]>([]);
  const [mfgOutput, setMfgOutput] = useState<any[]>([]);

  // Supply chain state
  const [supplyChainKPI, setSupplyChainKPI] = useState<any>(null);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [warehouseNetwork, setWarehouseNetwork] = useState<any>({ nodes: [], edges: [] });

  const fetchJSON = useCallback(async (url: string) => {
    try {
      const r = await fetch(url);
      const j = await r.json();
      return j?.data ?? j;
    } catch (e) {
      console.error(url, e);
      return null;
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, cb, dt, td, tv, ml] = await Promise.all([
        fetchJSON('/api/hq/fleet/command-center?action=overview'),
        fetchJSON('/api/hq/fleet/command-center?action=cost-breakdown'),
        fetchJSON('/api/hq/fleet/command-center?action=delivery-trend'),
        fetchJSON('/api/hq/fleet/command-center?action=top-drivers'),
        fetchJSON('/api/hq/fleet/command-center?action=top-vehicles'),
        fetchJSON('/api/hq/fleet/command-center?action=module-links'),
      ]);
      if (ov) {
        setKpi(ov.kpi);
        setAlerts(ov.alerts || []);
        setIntegrations(ov.integrations || []);
      }
      setCostBreakdown(cb || []);
      setDeliveryTrend(dt || []);
      setTopDrivers(td || []);
      setTopVehicles(tv || []);
      setModuleLinks(ml || null);
    } finally {
      setLoading(false);
    }
  }, [fetchJSON]);

  const loadDriverApp = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ex, ss, po] = await Promise.all([
        fetchJSON('/api/hq/fleet/integrations/driver-app?action=summary'),
        fetchJSON('/api/hq/fleet/integrations/driver-app?action=pending-expenses'),
        fetchJSON('/api/hq/fleet/integrations/driver-app?action=live-sessions'),
        fetchJSON('/api/hq/fleet/integrations/driver-app?action=recent-deliveries'),
      ]);
      setDriverApp(s);
      setDriverAppExpenses(Array.isArray(ex) ? ex : []);
      setDriverAppSessions(Array.isArray(ss) ? ss : []);
      setDriverAppPods(Array.isArray(po) ? po : []);
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const loadHRIS = useCallback(async () => {
    setLoading(true);
    try {
      const [s, dv, at, py] = await Promise.all([
        fetchJSON('/api/hq/fleet/integrations/hris?action=summary'),
        fetchJSON('/api/hq/fleet/integrations/hris?action=employees-drivers'),
        fetchJSON('/api/hq/fleet/integrations/hris?action=attendance-today'),
        fetchJSON('/api/hq/fleet/integrations/hris?action=payroll-impact'),
      ]);
      setHrisSummary(s);
      setHrisDrivers(Array.isArray(dv) ? dv : []);
      setHrisAttendance(Array.isArray(at) ? at : []);
      setHrisPayroll(py);
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const [s, je, pa, fr] = await Promise.all([
        fetchJSON('/api/hq/fleet/integrations/finance?action=summary'),
        fetchJSON('/api/hq/fleet/integrations/finance?action=journal-entries'),
        fetchJSON('/api/hq/fleet/integrations/finance?action=payables'),
        fetchJSON('/api/hq/fleet/integrations/finance?action=freight-invoices'),
      ]);
      setFinanceSummary(s);
      setFinanceJournals(Array.isArray(je) ? je : []);
      setFinancePayables(Array.isArray(pa) ? pa : []);
      setFinanceFreight(Array.isArray(fr) ? fr : []);
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ca, ls, mv, di, wh, tr, rc, ro] = await Promise.all([
        fetchJSON('/api/hq/fleet/integrations/inventory?action=summary'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=spare-parts-catalog'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=low-stock-spareparts'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=spare-parts-movements'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=dispatch-shipments'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=warehouses'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=pending-transfers'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=purchase-receipts'),
        fetchJSON('/api/hq/fleet/integrations/inventory?action=reorder-recommendations'),
      ]);
      setInvSummary(s);
      setInvCatalog(Array.isArray(ca) ? ca : []);
      setInvLowStock(Array.isArray(ls) ? ls : []);
      setInvMovements(Array.isArray(mv) ? mv : []);
      setInvDispatch(Array.isArray(di) ? di : []);
      setInvWarehouses(Array.isArray(wh) ? wh : []);
      setInvTransfers(Array.isArray(tr) ? tr : []);
      setInvReceipts(Array.isArray(rc) ? rc : []);
      setInvReorder(Array.isArray(ro) ? ro : []);
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const loadManufacturing = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ab, fg, ms, ps, cv, ob] = await Promise.all([
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=summary'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=active-batches'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=fg-ready-to-dispatch'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=material-supply-queue'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=production-shipments'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=capacity-vs-output'),
        fetchJSON('/api/hq/fleet/integrations/manufacturing?action=output-by-product'),
      ]);
      setMfgSummary(s);
      setMfgActive(Array.isArray(ab) ? ab : []);
      setMfgReady(Array.isArray(fg) ? fg : []);
      setMfgMaterials(Array.isArray(ms) ? ms : []);
      setMfgShipments(Array.isArray(ps) ? ps : []);
      setMfgCapacity(Array.isArray(cv) ? cv : []);
      setMfgOutput(Array.isArray(ob) ? ob : []);
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const loadSupplyChain = useCallback(async () => {
    setLoading(true);
    try {
      const [kpi, flow, net] = await Promise.all([
        fetchJSON('/api/hq/fleet/command-center?action=supply-chain-kpi'),
        fetchJSON('/api/hq/fleet/command-center?action=production-flow'),
        fetchJSON('/api/hq/fleet/command-center?action=warehouse-network'),
      ]);
      setSupplyChainKPI(kpi);
      setProductionFlow(flow);
      setWarehouseNetwork(net || { nodes: [], edges: [] });
    } finally { setLoading(false); }
  }, [fetchJSON]);

  const dispatchFG = useCallback(async (productionId: number) => {
    const res = await fetch('/api/hq/fleet/integrations/manufacturing?action=create-fg-shipment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productionId, priority: 'normal' })
    });
    const j = await res.json();
    if (j?.success) { alert(t('fleetHub.alerts.shipmentCreated').replace('{{n}}', String(j.data.shipmentNumber))); loadManufacturing(); }
    else alert(j?.error || t('fleetHub.alerts.shipmentFail'));
  }, [loadManufacturing, t]);

  const dispatchTransfer = useCallback(async (transferId: number) => {
    const res = await fetch('/api/hq/fleet/integrations/inventory?action=create-transfer-shipment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId, priority: 'normal' })
    });
    const j = await res.json();
    if (j?.success) { alert(t('fleetHub.alerts.shipmentCreated').replace('{{n}}', String(j.data.shipmentNumber))); loadInventory(); }
    else alert(j?.error || t('fleetHub.alerts.shipmentFail'));
  }, [loadInventory, t]);

  const pickupReceipt = useCallback(async (poId: number, supplierAddress?: string) => {
    const res = await fetch('/api/hq/fleet/integrations/inventory?action=create-receipt-pickup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poId, supplierAddress })
    });
    const j = await res.json();
    if (j?.success) { alert(t('fleetHub.alerts.pickupCreated').replace('{{n}}', String(j.data.shipmentNumber))); loadInventory(); }
    else alert(j?.error || t('fleetHub.alerts.pickupFail'));
  }, [loadInventory, t]);

  const generateReorderPO = useCallback(async () => {
    if (!invReorder.length) return alert(t('fleetHub.alerts.noReorder'));
    const items = invReorder.map((r: any) => ({
      productId: r.product_id,
      quantity: Number(r.recommended_qty || 1),
      unitPrice: Number(r.cost_price || 0),
    }));
    const res = await fetch('/api/hq/fleet/integrations/inventory?action=generate-reorder-po', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const j = await res.json();
    if (j?.success) { alert(t('fleetHub.alerts.poCreated').replace('{{n}}', String(j.data.poNumber)).replace('{{c}}', String(j.data.itemCount))); loadInventory(); }
    else alert(j?.error || t('fleetHub.alerts.poFail'));
  }, [invReorder, loadInventory, t]);

  useEffect(() => {
    if (tab === 'overview' || tab === 'operations' || tab === 'tracking' || tab === 'transport' || tab === 'analytics' || tab === 'financial' || tab === 'module-hub') {
      if (!kpi) loadOverview();
    } else if (tab === 'driver-app' && !driverApp) loadDriverApp();
    else if (tab === 'hris' && !hrisSummary) loadHRIS();
    else if (tab === 'finance' && !financeSummary) loadFinance();
    else if (tab === 'inventory' && !invSummary) loadInventory();
    else if (tab === 'manufacturing' && !mfgSummary) loadManufacturing();
    else if (tab === 'supply-chain' && !supplyChainKPI) loadSupplyChain();
  }, [tab, kpi, driverApp, hrisSummary, financeSummary, invSummary, mfgSummary, supplyChainKPI,
      loadOverview, loadDriverApp, loadHRIS, loadFinance, loadInventory, loadManufacturing, loadSupplyChain]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      loadOverview(), loadDriverApp(), loadHRIS(), loadFinance(),
      loadInventory(), loadManufacturing(), loadSupplyChain(),
    ]);
    setRefreshing(false);
  };

  const tabs: { id: TabKey; label: string; icon: any; group?: string }[] = [
    { id: 'overview', label: t('fleetHub.tabs.overview'), icon: LayoutDashboard },
    { id: 'operations', label: t('fleetHub.tabs.operations'), icon: Wrench },
    { id: 'tracking', label: t('fleetHub.tabs.tracking'), icon: Navigation },
    { id: 'transport', label: t('fleetHub.tabs.transport'), icon: Send },
    { id: 'analytics', label: t('fleetHub.tabs.analytics'), icon: BarChart3 },
    { id: 'financial', label: t('fleetHub.tabs.financial'), icon: DollarSign },
    { id: 'supply-chain', label: t('fleetHub.tabs.supplyChain'), icon: Workflow },
    { id: 'driver-app', label: t('fleetHub.tabs.driverApp'), icon: Smartphone },
    { id: 'hris', label: t('fleetHub.tabs.hris'), icon: HeartPulse },
    { id: 'finance', label: t('fleetHub.tabs.finance'), icon: Wallet },
    { id: 'inventory', label: t('fleetHub.tabs.inventory'), icon: Warehouse },
    { id: 'manufacturing', label: t('fleetHub.tabs.manufacturing'), icon: Factory },
    { id: 'module-hub', label: t('fleetHub.tabs.moduleHub'), icon: Plug },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3 h-3" /> {t('fleetHub.hero.badge')}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{t('fleetHub.hero.title')}</h1>
            <p className="text-white/80 mt-2 max-w-2xl">
              {t('fleetHub.hero.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('fleetHub.hero.refresh')}
            </button>
            <Link href="/hq/fms" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-white/90 transition">
              <Truck className="w-4 h-4" /> {t('fleetHub.hero.detailFms')}
            </Link>
            <Link href="/hq/tms" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-700 rounded-lg font-semibold hover:bg-white/90 transition">
              <Send className="w-4 h-4" /> {t('fleetHub.hero.detailTms')}
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <KPIRow kpi={kpi} loading={!kpi && loading} t={t} />

      {/* Integration Strip */}
      <IntegrationStrip integrations={integrations} t={t} />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const active = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                  active
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {tabItem.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 md:p-6">
          {tab === 'overview' && (
            <OverviewTab
              kpi={kpi} alerts={alerts} costBreakdown={costBreakdown}
              deliveryTrend={deliveryTrend} topDrivers={topDrivers} topVehicles={topVehicles}
              loading={loading}
              t={t}
            />
          )}
          {tab === 'operations' && <QuickLinksGrid title={t('fleetHub.quickGrid.operations')} items={moduleLinks?.operations || []} color="blue" t={t} />}
          {tab === 'tracking' && <QuickLinksGrid title={t('fleetHub.quickGrid.tracking')} items={moduleLinks?.tracking || []} color="purple" t={t} />}
          {tab === 'transport' && <QuickLinksGrid title={t('fleetHub.quickGrid.transport')} items={moduleLinks?.transport || []} color="green" t={t} />}
          {tab === 'analytics' && <QuickLinksGrid title={t('fleetHub.quickGrid.analytics')} items={moduleLinks?.analytics || []} color="amber" t={t} />}
          {tab === 'financial' && <QuickLinksGrid title={t('fleetHub.quickGrid.financial')} items={moduleLinks?.financial || []} color="rose" t={t} />}
          {tab === 'module-hub' && <ModuleHub links={moduleLinks} t={t} />}

          {tab === 'driver-app' && (
            <DriverAppTab
              summary={driverApp}
              expenses={driverAppExpenses}
              sessions={driverAppSessions}
              pods={driverAppPods}
              loading={loading}
              onRefresh={loadDriverApp}
            />
          )}
          {tab === 'hris' && (
            <HRISTab
              summary={hrisSummary}
              drivers={hrisDrivers}
              attendance={hrisAttendance}
              payroll={hrisPayroll}
              loading={loading}
              onRefresh={loadHRIS}
            />
          )}
          {tab === 'finance' && (
            <FinanceTab
              summary={financeSummary}
              journals={financeJournals}
              payables={financePayables}
              freight={financeFreight}
              loading={loading}
              onRefresh={loadFinance}
            />
          )}
          {tab === 'inventory' && (
            <InventoryTab
              summary={invSummary}
              catalog={invCatalog}
              lowStock={invLowStock}
              movements={invMovements}
              dispatch={invDispatch}
              warehouses={invWarehouses}
              transfers={invTransfers}
              receipts={invReceipts}
              reorder={invReorder}
              loading={loading}
              onRefresh={loadInventory}
              onDispatchTransfer={dispatchTransfer}
              onPickupReceipt={pickupReceipt}
              onGenerateReorderPO={generateReorderPO}
            />
          )}

          {tab === 'manufacturing' && (
            <ManufacturingTab
              summary={mfgSummary}
              active={mfgActive}
              ready={mfgReady}
              materials={mfgMaterials}
              shipments={mfgShipments}
              capacity={mfgCapacity}
              output={mfgOutput}
              loading={loading}
              onRefresh={loadManufacturing}
              onDispatchFG={dispatchFG}
            />
          )}

          {tab === 'supply-chain' && (
            <SupplyChainTab
              kpi={supplyChainKPI}
              flow={productionFlow}
              network={warehouseNetwork}
              loading={loading}
              onRefresh={loadSupplyChain}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ========================= KPI ROW =========================
function KPIRow({ kpi, loading, t }: { kpi: any; loading: boolean; t: (k: string) => string }) {
  if (loading && !kpi) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (!kpi) return null;

  const cards = [
    { label: t('fleetHub.kpi.totalVehicles'), value: fmt(kpi.totalVehicles), sub: `${kpi.activeVehicles} ${t('fleetHub.kpi.activeSuffix')}`, icon: Truck, color: 'blue' },
    { label: t('fleetHub.kpi.fleetUtil'), value: `${kpi.fleetUtilization}%`, sub: `${kpi.inMaintenance} ${t('fleetHub.kpi.maintSuffix')}`, icon: Gauge, color: 'indigo' },
    { label: t('fleetHub.kpi.totalDrivers'), value: fmt(kpi.totalDrivers), sub: `${kpi.onDutyDrivers} ${t('fleetHub.kpi.onDutySuffix')}`, icon: Users, color: 'purple' },
    { label: t('fleetHub.kpi.avgDriverScore'), value: `${Number(kpi.avgDriverScore).toFixed(1)}`, sub: t('fleetHub.kpi.outOf100'), icon: Award, color: 'pink' },
    { label: t('fleetHub.kpi.activeShipments'), value: fmt(kpi.inTransitShipments), sub: `${kpi.deliveredToday} ${t('fleetHub.kpi.doneTodaySuffix')}`, icon: Package, color: 'emerald' },
    { label: t('fleetHub.kpi.onTimeRate'), value: `${Number(kpi.onTimeDeliveryRate).toFixed(1)}%`, sub: t('fleetHub.kpi.last30d'), icon: Timer, color: 'teal' },
    { label: t('fleetHub.kpi.opexMtd'), value: fmtRpShort(kpi.totalOperationalCostMTD), sub: t('fleetHub.kpi.monthToDate'), icon: DollarSign, color: 'amber' },
    { label: t('fleetHub.kpi.activeAlerts'), value: fmt(kpi.expiringDocs + kpi.overdueInspections + kpi.openIncidents + kpi.overdueMaintenance), sub: t('fleetHub.kpi.needsAttention'), icon: AlertTriangle, color: 'rose' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="relative bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${COLOR_BG[c.color] || 'bg-gray-50 text-gray-600'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xs text-gray-500 font-medium">{c.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{c.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ========================= Integration Strip =========================
function IntegrationStrip({ integrations, t }: { integrations: any[]; t: (k: string) => string }) {
  if (!integrations?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">{t('fleetHub.integration.title')}</h2>
        </div>
        <span className="text-xs text-gray-400">{t('fleetHub.integration.autoUpdate')}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {integrations.map((i: any) => {
          const style = MOD_BADGE_STYLE[i.module] || MOD_BADGE_STYLE.procurement;
          const Icon = style.icon;
          const badgeLabel = t(`fleetHub.modBadge.${i.module}` as any) || t('fleetHub.modBadge.procurement');
          return (
            <div key={i.module} className="relative border border-gray-100 rounded-lg p-3 hover:shadow-md transition">
              <div className={`absolute top-0 left-0 h-1 w-full rounded-t-lg bg-gradient-to-r ${style.color}`} />
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded bg-gradient-to-br ${style.color} text-white`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {i.connected ? (
                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <div className="text-xs font-bold text-gray-900 truncate">{badgeLabel}</div>
              <div className="text-[10px] text-gray-500">{i.linkedCount} {t('fleetHub.integration.connectedSuffix')}</div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${style.color}`}
                  style={{ width: `${i.healthScore}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">{t('fleetHub.integration.health')}: {i.healthScore}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================= Overview Tab =========================
function OverviewTab({ kpi, alerts, costBreakdown, deliveryTrend, topDrivers, topVehicles, loading, t }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery trend */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> {t('fleetHub.overview.deliveryTrend14')}
            </h3>
          </div>
          {deliveryTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={deliveryTrend}>
                <defs>
                  <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="delivered" stroke="#10B981" fill="url(#gDelivered)" name={t('fleetHub.overview.chartDelivered')} />
                <Area type="monotone" dataKey="pending" stroke="#F59E0B" fill="url(#gPending)" name={t('fleetHub.overview.chartPending')} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyMini />}
        </div>

        {/* Cost breakdown pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <PieChartIcon className="w-4 h-4 text-rose-600" /> {t('fleetHub.overview.costBreakdownMtd')}
          </h3>
          {costBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={costBreakdown} dataKey="amount" nameKey="category" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {costBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmtRp(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyMini />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-600" /> {t('fleetHub.overview.activeAlerts')} ({alerts.length})
          </h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="text-sm">{t('fleetHub.overview.noActiveAlerts')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alerts.slice(0, 10).map((a) => {
                const sev = a.severity === 'critical' ? 'border-red-200 bg-red-50' : a.severity === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50';
                const iconColor = a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500';
                return (
                  <Link href={a.actionUrl || '#'} key={a.id} className={`block border rounded-lg p-3 ${sev} hover:shadow-sm transition`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
                        <div className="text-xs text-gray-600 truncate">{a.description}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Top drivers */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-600" /> {t('fleetHub.overview.topDrivers')}
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {topDrivers.slice(0, 8).map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm bg-gradient-to-br ${
                  i === 0 ? 'from-yellow-400 to-amber-500' : i === 1 ? 'from-gray-300 to-gray-400' : i === 2 ? 'from-orange-400 to-orange-500' : 'from-indigo-400 to-indigo-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{d.name}</div>
                  <div className="text-xs text-gray-500">{fmt(d.trips)} {t('fleetHub.overview.tripsOnTime')} {d.onTimeRate}%</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{d.score}</div>
                  <div className="text-[10px] text-gray-400">{t('fleetHub.overview.score')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vehicles */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-blue-600" /> {t('fleetHub.overview.topFleetCost')}
        </h3>
        {topVehicles.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topVehicles.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="plate" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtRpShort(v)} />
              <Tooltip formatter={(v: any) => fmtRp(v)} />
              <Bar dataKey="cost" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyMini />}
      </div>
    </div>
  );
}

// ========================= Quick Links Grid =========================
function QuickLinksGrid({ title, items, color, t }: { title: string; items: any[]; color: string; t: (k: string) => string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
  };
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(items || []).map((it: any) => {
          const Icon = ICONS[it.icon] || Activity;
          return (
            <Link
              key={it.id}
              href={it.href}
              className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-white mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-semibold text-gray-900 mb-1">{it.label}</div>
              <div className="flex items-center text-xs text-gray-400 group-hover:text-indigo-600">
                {t('fleetHub.common.open')} <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ========================= Module Hub (all links) =========================
function ModuleHub({ links, t }: { links: any; t: (k: string) => string }) {
  if (!links) return <EmptyMini />;
  const sections = [
    { key: 'operations', title: t('fleetHub.moduleHub.operations'), color: 'blue' },
    { key: 'tracking', title: t('fleetHub.moduleHub.tracking'), color: 'purple' },
    { key: 'transport', title: t('fleetHub.moduleHub.transport'), color: 'green' },
    { key: 'analytics', title: t('fleetHub.moduleHub.analytics'), color: 'amber' },
    { key: 'financial', title: t('fleetHub.moduleHub.financial'), color: 'rose' },
    { key: 'supplyChain', title: t('fleetHub.moduleHub.supplyMfg'), color: 'purple' },
    { key: 'admin', title: t('fleetHub.moduleHub.admin'), color: 'blue' },
  ];
  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <div key={s.key}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <span className={`w-1 h-4 bg-gradient-to-b rounded-full ${
              s.color === 'blue' ? 'from-blue-500 to-cyan-500' :
              s.color === 'purple' ? 'from-purple-500 to-pink-500' :
              s.color === 'green' ? 'from-emerald-500 to-teal-500' :
              s.color === 'amber' ? 'from-amber-500 to-orange-500' :
              'from-rose-500 to-pink-500'
            }`} />
            {s.title}
          </h3>
          <QuickLinksGrid title="" items={links[s.key] || []} color={s.color} t={t} />
        </div>
      ))}
    </div>
  );
}

// ========================= Driver App Tab =========================
function DriverAppTab({ summary, expenses, sessions, pods, loading, onRefresh }: any) {
  const { t } = useTranslation();
  const dh = t('fleetHub.driverApp.headersLine').split('|');
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.driverApp.title')}
        description={t('fleetHub.driverApp.desc')}
        icon={Smartphone}
        gradient="from-indigo-500 to-purple-500"
        onRefresh={onRefresh}
      />
      <StatGrid stats={[
        { label: t('fleetHub.driverApp.statAccounts'), value: fmt(summary?.accounts || 0), icon: Users, color: 'indigo' },
        { label: t('fleetHub.driverApp.statSessions24'), value: fmt(summary?.activeSessions || 0), icon: Activity, color: 'green', sub: t('fleetHub.driverApp.loginActive') },
        { label: t('fleetHub.driverApp.statExpensePending'), value: fmt(summary?.pendingExpenses || 0), icon: Wallet, color: 'amber', sub: fmtRpShort(summary?.pendingAmount || 0) },
        { label: t('fleetHub.driverApp.statPodToday'), value: fmt(summary?.podToday || 0), icon: CheckCircle, color: 'emerald' },
      ]} />

      <SectionPanel title={t('fleetHub.driverApp.pendingExpenses')} count={expenses.length} icon={Wallet}>
        {expenses.length === 0 ? <EmptyMini /> : (
          <Table
            headers={dh}
            rows={expenses.slice(0, 20).map((e: any) => [
              e.expense_number || '-',
              e.driver_name || '-',
              e.license_plate || '-',
              e.expense_type || '-',
              <span className="font-semibold">{fmtRp(e.amount)}</span>,
              fmtDate(e.submitted_at),
              <Link href="/hq/fleet/expenses" className="text-indigo-600 hover:underline text-xs">{t('fleetHub.common.review')}</Link>,
            ])}
          />
        )}
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.driverApp.activeSessions')} count={sessions.length} icon={Activity}>
          {sessions.length === 0 ? <EmptyMini /> : (
            <ul className="divide-y divide-gray-100">
              {sessions.slice(0, 10).map((s: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{s.driver_name || '-'}</div>
                    <div className="text-xs text-gray-500">{s.driver_code} · {s.assigned_plate || t('fleetHub.common.noVehicle')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{fmtDateTime(s.last_login_at)}</div>
                    <div className="text-[10px] text-gray-400">{s.app_version || '-'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
        <SectionPanel title={t('fleetHub.driverApp.recentPod')} count={pods.length} icon={CheckCircle}>
          {pods.length === 0 ? <EmptyMini /> : (
            <ul className="divide-y divide-gray-100">
              {pods.slice(0, 10).map((p: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{p.customer_name || '-'}</div>
                    <div className="text-xs text-gray-500">{p.order_reference} · {p.driver_name}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                      {p.status || 'diterima'}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmtDateTime(p.submitted_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}

// ========================= HRIS Tab =========================
function HRISTab({ summary, drivers, attendance, payroll, loading, onRefresh }: any) {
  const { t } = useTranslation();
  const hh = t('fleetHub.hris.headersLine').split('|');
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.hris.title')}
        description={t('fleetHub.hris.desc')}
        icon={HeartPulse}
        gradient="from-emerald-500 to-teal-500"
        onRefresh={onRefresh}
      />
      <StatGrid stats={[
        { label: t('fleetHub.hris.statTotal'), value: fmt(summary?.totalDriverEmployees || 0), icon: Users, color: 'emerald' },
        { label: t('fleetHub.hris.statLinked'), value: fmt(summary?.linkedDrivers || 0), icon: Link2, color: 'teal' },
        { label: t('fleetHub.hris.statUnlinked'), value: fmt(summary?.unlinkedDrivers || 0), icon: AlertCircle, color: 'amber' },
        { label: t('fleetHub.hris.statPresent'), value: fmt(summary?.presentToday || 0), icon: CheckCircle, color: 'green', sub: `${summary?.absentToday || 0} ${t('fleetHub.hris.absentSuffix')}` },
      ]} />

      <SectionPanel title={t('fleetHub.hris.mappingTitle')} count={drivers.length} icon={Link2}>
        {drivers.length === 0 ? <EmptyMini /> : (
          <Table
            headers={hh}
            rows={drivers.slice(0, 30).map((d: any) => [
              d.driver_code || '-',
              <div><div className="font-semibold">{d.full_name}</div><div className="text-xs text-gray-500">{d.phone}</div></div>,
              d.position || <span className="text-gray-400 text-xs">{t('fleetHub.common.notLinked')}</span>,
              d.department || '-',
              fmtDate(d.hire_date),
              d.base_salary ? fmtRp(d.base_salary) : '-',
              d.employee_id ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                  <BadgeCheck className="w-3 h-3" /> {t('fleetHub.common.linked')}
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">{t('fleetHub.common.notYet')}</span>
              ),
            ])}
          />
        )}
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.hris.attendanceToday')} count={attendance.length} icon={Calendar}>
          {attendance.length === 0 ? <EmptyMini /> : (
            <ul className="divide-y divide-gray-100">
              {attendance.slice(0, 12).map((a: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{a.full_name}</div>
                    <div className="text-xs text-gray-500">{a.driver_code || a.position} · {a.assigned_vehicle || t('fleetHub.common.noVehicle')}</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {a.status || '-'}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {t('fleetHub.hris.inOut')}: {a.check_in_time || '-'} | {t('fleetHub.hris.hours')}: {a.work_hours || 0}h
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>

        <SectionPanel title={t('fleetHub.hris.payrollImpact')} icon={Wallet}>
          {payroll?.totals ? (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="text-[10px] text-emerald-700 font-semibold">{t('fleetHub.common.basePay')}</div>
                  <div className="text-sm font-bold text-gray-900">{fmtRpShort(payroll.totals.base)}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-[10px] text-amber-700 font-semibold">{t('fleetHub.common.allowance')}</div>
                  <div className="text-sm font-bold text-gray-900">{fmtRpShort(payroll.totals.allowance)}</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="text-[10px] text-indigo-700 font-semibold">{t('fleetHub.common.total')}</div>
                  <div className="text-sm font-bold text-gray-900">{fmtRpShort(payroll.totals.total)}</div>
                </div>
              </div>
              <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {(payroll.drivers || []).slice(0, 15).map((d: any, i: number) => (
                  <li key={i} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{d.full_name}</div>
                      <div className="text-xs text-gray-500">{d.driver_code} · {d.trips_month || 0} {t('fleetHub.common.tripsPerMo')}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-gray-900">{fmtRpShort(Number(d.base_salary) + Number(d.allowance))}</div>
                      <div className="text-gray-400">{fmtRpShort(d.base_salary)} + {fmtRpShort(d.allowance)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : <EmptyMini />}
        </SectionPanel>
      </div>
    </div>
  );
}

// ========================= Finance Tab =========================
function FinanceTab({ summary, journals, payables, freight, loading, onRefresh }: any) {
  const { t } = useTranslation();
  const jl = t('fleetHub.finance.jHeadersLine').split('|');
  const pl = t('fleetHub.finance.pHeadersLine').split('|');
  const fl = t('fleetHub.finance.fHeadersLine').split('|');
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.finance.title')}
        description={t('fleetHub.finance.desc')}
        icon={Wallet}
        gradient="from-amber-500 to-orange-500"
        onRefresh={onRefresh}
      />
      <StatGrid stats={[
        { label: t('fleetHub.finance.statOpex'), value: fmtRpShort(summary?.opexMTD || 0), icon: DollarSign, color: 'rose' },
        { label: t('fleetHub.finance.statPayables'), value: fmtRpShort(summary?.payablesOutstanding || 0), icon: Receipt, color: 'amber', sub: t('fleetHub.finance.unpaid') },
        { label: t('fleetHub.finance.statFreightRev'), value: fmtRpShort(summary?.freightRevenueMTD || 0), icon: TrendingUp, color: 'emerald' },
        { label: t('fleetHub.finance.statMargin'), value: fmtRpShort(summary?.marginMTD || 0), icon: Gauge, color: 'indigo' },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.finance.journals')} count={journals.length} icon={FileText}>
          {journals.length === 0 ? <EmptyMini /> : (
            <Table
              headers={jl}
              rows={journals.slice(0, 20).map((j: any) => [
                <span className="font-mono text-xs">{j.entry_number}</span>,
                fmtDate(j.entry_date),
                <div className="truncate max-w-xs">{j.description}</div>,
                <span className="text-xs text-gray-500">{j.reference_type}</span>,
                <span className="font-semibold">{fmtRp(j.total_amount)}</span>,
                <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">{j.status}</span>,
              ])}
            />
          )}
        </SectionPanel>

        <SectionPanel title={t('fleetHub.finance.payables')} count={payables.length} icon={Receipt}>
          {payables.length === 0 ? <EmptyMini /> : (
            <Table
              headers={pl}
              rows={payables.slice(0, 15).map((p: any) => [
                <span className="font-mono text-xs">{p.payable_number}</span>,
                p.supplier_name || '-',
                fmtRpShort(p.total_amount),
                <span className="font-semibold text-rose-600">{fmtRpShort(p.balance_due)}</span>,
                fmtDate(p.due_date),
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  p.status === 'paid' ? 'bg-green-100 text-green-700' :
                  p.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{p.status}</span>,
              ])}
            />
          )}
        </SectionPanel>
      </div>

      <SectionPanel title={t('fleetHub.finance.freight')} count={freight.length} icon={CreditCard}>
        {freight.length === 0 ? <EmptyMini /> : (
          <Table
            headers={fl}
            rows={freight.slice(0, 20).map((f: any) => [
              <span className="font-mono text-xs">{f.bill_number}</span>,
              fmtDate(f.bill_date),
              f.customer_name || '-',
              f.carrier_name || '-',
              fmtRpShort(f.total_amount),
              <span className="font-semibold">{fmtRpShort(f.balance_due)}</span>,
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                f.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                f.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>{f.payment_status}</span>,
            ])}
          />
        )}
      </SectionPanel>
    </div>
  );
}

// ========================= Inventory Tab =========================
function InventoryTab({
  summary, catalog, lowStock, movements, dispatch,
  warehouses, transfers, receipts, reorder,
  loading, onRefresh, onDispatchTransfer, onPickupReceipt, onGenerateReorderPO,
}: any) {
  const { t } = useTranslation();
  const pol = t('fleetHub.inventory.poHeadersLine').split('|');
  const lol = t('fleetHub.inventory.lowHeadersLine').split('|');
  const rol = t('fleetHub.inventory.reorderRecHeadersLine').split('|');
  const dol = t('fleetHub.inventory.dHeadersLine').split('|');
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.inventory.title')}
        description={t('fleetHub.inventory.desc')}
        icon={Warehouse}
        gradient="from-sky-500 to-cyan-500"
        onRefresh={onRefresh}
      />

      {/* KPI Grid: 2 rows */}
      <StatGrid stats={[
        { label: t('fleetHub.inventory.statSpare'), value: fmt(summary?.spareParts || 0), icon: Disc, color: 'sky' },
        { label: t('fleetHub.inventory.statLow'), value: fmt(summary?.lowStock || 0), icon: AlertTriangle, color: 'amber', sub: t('fleetHub.inventory.needReorder') },
        { label: t('fleetHub.inventory.statValue'), value: fmtRpShort(summary?.totalStockValue || 0), icon: DollarSign, color: 'emerald' },
        { label: t('fleetHub.inventory.statIssued'), value: fmt(summary?.issuedMTD || 0), icon: Package, color: 'indigo', sub: t('fleetHub.inventory.usedMaint') },
      ]} />
      <StatGrid stats={[
        { label: t('fleetHub.inventory.statWh'), value: fmt(summary?.warehouseCount || warehouses?.length || 0), icon: Warehouse, color: 'teal' },
        { label: t('fleetHub.inventory.statTransfer'), value: fmt(summary?.pendingTransfers || 0), icon: ArrowRightLeft, color: 'purple', sub: t('fleetHub.inventory.needFleet') },
        { label: t('fleetHub.inventory.statPo'), value: fmt(summary?.pendingReceipts || 0), icon: Inbox, color: 'rose', sub: t('fleetHub.inventory.pickupSupplier') },
        { label: t('fleetHub.inventory.statDispatch'), value: fmt(summary?.dispatchShipments || 0), icon: Send, color: 'blue' },
      ]} />

      {/* Jaringan Gudang */}
      <SectionPanel title={t('fleetHub.inventory.warehouseNet')} count={warehouses?.length || 0} icon={Building2}>
        {!warehouses?.length ? <EmptyMini /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {warehouses.slice(0, 9).map((w: any) => (
              <div key={w.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-md transition bg-gradient-to-br from-white to-sky-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-sky-100 text-sky-600"><Warehouse className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 truncate">{w.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{w.code || '-'}</div>
                    </div>
                  </div>
                  {w.is_active && <BadgeCheck className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="text-xs text-gray-500 truncate">{w.address || w.city || '-'}</div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <div className="text-gray-400">SKU</div>
                    <div className="font-bold text-gray-800">{fmt(w.sku_count || 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('fleetHub.common.value')}</div>
                    <div className="font-bold text-gray-800">{fmtRpShort(w.stock_value || 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('fleetHub.common.totalQty')}</div>
                    <div className="font-bold text-gray-800">{fmt(w.total_stock || 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('fleetHub.common.sparePart')}</div>
                    <div className="font-bold text-sky-600">{fmt(w.sparepart_sku || 0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Transfer + Reorder side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.inventory.transferNeed')} count={transfers?.length || 0} icon={ArrowRightLeft}>
          {!transfers?.length ? <EmptyMini /> : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {transfers.slice(0, 10).map((xfer: any) => (
                <div key={xfer.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-gray-500">{xfer.transfer_number || `TRF-${xfer.id}`}</div>
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                        <span className="truncate">{xfer.from_warehouse || '-'}</span>
                        <ArrowRight className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{xfer.to_warehouse || '-'}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-medium mr-2">{xfer.status}</span>
                        {xfer.item_count || 0} {t('fleetHub.inventory.itemsQty')} · {fmt(xfer.total_qty)}
                      </div>
                    </div>
                    {xfer.has_shipment ? (
                      <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 flex-shrink-0">
                        <BadgeCheck className="w-3 h-3" /> {t('fleetHub.common.sent')}
                      </span>
                    ) : (
                      <button
                        onClick={() => onDispatchTransfer(xfer.id)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1 flex-shrink-0"
                      >
                        <Send className="w-3 h-3" /> {t('fleetHub.common.dispatch')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          title={t('fleetHub.inventory.reorderTitle')}
          count={reorder?.length || 0}
          icon={ShoppingCart}
        >
          {!reorder?.length ? (
            <div className="text-center py-10 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm">{t('fleetHub.inventory.allStockOk')}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  onClick={onGenerateReorderPO}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1"
                >
                  <ShoppingCart className="w-3 h-3" /> {t('fleetHub.inventory.genPo')} ({reorder.length})
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <Table
                  headers={rol}
                  rows={reorder.slice(0, 15).map((r: any) => [
                    <span className="font-mono text-xs">{r.sku}</span>,
                    <div className="truncate max-w-[140px]">{r.name}</div>,
                    <span className="font-bold text-rose-600">{fmt(r.current_stock)}</span>,
                    <span className="font-semibold text-indigo-600">{fmt(r.recommended_qty)}</span>,
                    fmtRpShort(r.estimated_po_value),
                  ])}
                />
              </div>
            </>
          )}
        </SectionPanel>
      </div>

      {/* PO Pickup Queue */}
      <SectionPanel title={t('fleetHub.inventory.poPickup')} count={receipts?.length || 0} icon={Inbox}>
        {!receipts?.length ? <EmptyMini /> : (
          <Table
            headers={pol}
            rows={receipts.slice(0, 10).map((p: any) => [
              <span className="font-mono text-xs">{p.po_number}</span>,
              <div className="truncate max-w-[140px]">{p.supplier_name || '-'}</div>,
              <span className="text-xs">{p.item_count || 0}</span>,
              fmtRpShort(p.total_amount || 0),
              fmtDate(p.expected_date),
              <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">{p.status}</span>,
              p.has_pickup ? (
                <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" /> {t('fleetHub.common.pickupSet')}
                </span>
              ) : (
                <button
                  onClick={() => onPickupReceipt(p.id, p.supplier_address)}
                  className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" /> {t('fleetHub.common.pickup')}
                </button>
              ),
            ])}
          />
        )}
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.inventory.lowStock')} count={lowStock.length} icon={AlertTriangle}>
          {lowStock.length === 0 ? <EmptyMini /> : (
            <Table
              headers={lol}
              rows={lowStock.slice(0, 10).map((p: any) => [
                <span className="font-mono text-xs">{p.sku}</span>,
                <div className="truncate max-w-[180px]">{p.name}</div>,
                <span className="font-bold text-rose-600">{fmt(p.stock)}</span>,
                <span className="text-xs text-gray-500">{fmt(p.reorder_point || 0)}</span>,
                fmtRpShort(p.cost_price),
              ])}
            />
          )}
        </SectionPanel>

        <SectionPanel title={t('fleetHub.inventory.movements')} count={movements.length} icon={Activity}>
          {movements.length === 0 ? <EmptyMini /> : (
            <ul className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
              {movements.slice(0, 12).map((m: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{m.product_name || m.sku}</div>
                    <div className="text-xs text-gray-500">{m.location_name || '-'} · {m.reference_type}</div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${m.movement_type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.movement_type === 'in' ? '+' : '−'}{fmt(m.quantity)}
                    </span>
                    <div className="text-[10px] text-gray-400">{fmtDate(m.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>

      <SectionPanel title={t('fleetHub.inventory.dispatchOrders')} count={dispatch.length} icon={Send}>
        {dispatch.length === 0 ? <EmptyMini /> : (
          <Table
            headers={dol}
            rows={dispatch.slice(0, 15).map((s: any) => [
              <span className="font-mono text-xs">{s.shipment_number}</span>,
              s.customer_name || '-',
              <div className="text-xs">
                <div className="truncate max-w-[180px]">{s.origin_address}</div>
                <div className="text-gray-400">↓ {s.destination_address}</div>
              </div>,
              s.vehicle_plate || '-',
              s.driver_name || '-',
              <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">{s.status}</span>,
              fmtDate(s.created_at),
            ])}
          />
        )}
      </SectionPanel>
    </div>
  );
}

// ========================= Manufacturing Tab =========================
function ManufacturingTab({
  summary, active, ready, materials, shipments, capacity, output,
  loading, onRefresh, onDispatchFG,
}: any) {
  const { t } = useTranslation();
  const mhl = t('fleetHub.mfgTab.matHeadersLine').split('|');
  const shl = t('fleetHub.mfgTab.shipHeadersLine').split('|');
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.mfgTab.title')}
        description={t('fleetHub.mfgTab.desc')}
        icon={Factory}
        gradient="from-fuchsia-500 to-pink-500"
        onRefresh={onRefresh}
      />

      <StatGrid stats={[
        { label: t('fleetHub.mfgTab.batchActive'), value: fmt(summary?.activeBatches || 0), icon: Factory, color: 'purple', sub: `${summary?.totalBatches || 0} ${t('fleetHub.mfgTab.totalSuffix')}` },
        { label: t('fleetHub.mfgTab.doneToday'), value: fmt(summary?.completedToday || 0), icon: CheckCircle, color: 'emerald' },
        { label: t('fleetHub.mfgTab.prodMtd'), value: fmt(summary?.producedQty || 0), icon: Boxes, color: 'indigo', sub: t('fleetHub.mfgTab.unitKg') },
        { label: t('fleetHub.mfgTab.fgReady'), value: fmt(summary?.fgReadyToDispatch || 0), icon: Package, color: 'sky', sub: t('fleetHub.mfgTab.needFleet') },
      ]} />
      <StatGrid stats={[
        { label: t('fleetHub.mfgTab.matReq'), value: fmt(summary?.materialRequests || 0), icon: Inbox, color: 'amber' },
        { label: t('fleetHub.mfgTab.shipMtd'), value: fmt(summary?.productionShipments || 0), icon: Send, color: 'rose' },
        { label: t('fleetHub.mfgTab.matCostMtd'), value: fmtRpShort(summary?.totalMaterialCost || 0), icon: DollarSign, color: 'green' },
        { label: t('fleetHub.mfgTab.avgBatchH'), value: `${Number(summary?.avgCompletionHours || 0).toFixed(1)} ${t('fleetHub.mfgTab.hours')}`, icon: Clock, color: 'teal' },
      ]} />

      {/* Capacity vs Output chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-fuchsia-600" /> {t('fleetHub.mfgTab.capVsOut')}
        </h3>
        {!capacity?.length ? <EmptyMini /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={capacity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="production_qty" fill="#A855F7" name={t('fleetHub.common.productionQty')} />
              <Bar yAxisId="left" dataKey="shipped_weight" fill="#06B6D4" name={t('fleetHub.common.shippedWeightKg')} />
              <Bar yAxisId="right" dataKey="shipment_count" fill="#F59E0B" name={t('fleetHub.common.shipmentCount')} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* FG Ready to Dispatch + Material supply side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.mfgTab.fgReadyTitle')} count={ready?.length || 0} icon={Package}>
          {!ready?.length ? <EmptyMini /> : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {ready.slice(0, 10).map((r: any) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-gray-500">{r.batch_number}</div>
                      <div className="text-sm font-bold text-gray-900 truncate">{r.product_name || r.recipe_name || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {fmt(r.produced_quantity)} {r.unit}
                        {r.quality_grade && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-semibold">
                            {t('fleetHub.common.grade')} {r.quality_grade}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">{t('fleetHub.common.done')} {fmtDate(r.completion_time)}</div>
                    </div>
                    {r.has_shipment ? (
                      <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1 flex-shrink-0">
                        <BadgeCheck className="w-3 h-3" /> {t('fleetHub.common.sent')}
                      </span>
                    ) : (
                      <button
                        onClick={() => onDispatchFG(r.id)}
                        className="px-2 py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1 flex-shrink-0"
                      >
                        <Send className="w-3 h-3" /> {t('fleetHub.common.dispatch')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title={t('fleetHub.mfgTab.batchActiveTitle')} count={active?.length || 0} icon={Factory}>
          {!active?.length ? <EmptyMini /> : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {active.slice(0, 10).map((b: any) => {
                const progress = b.planned_quantity > 0
                  ? Math.min(100, Math.round((Number(b.produced_quantity) / Number(b.planned_quantity)) * 100))
                  : 0;
                return (
                  <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-gray-500">{b.batch_number}</div>
                        <div className="text-sm font-bold text-gray-900 truncate">{b.product_name || b.recipe_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t('fleetHub.common.supervisor')}: {b.supervisor_name || '-'} · {b.material_count || 0} {t('fleetHub.common.material')}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                        b.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{b.status}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>{fmt(b.produced_quantity)} / {fmt(b.planned_quantity)} {b.unit}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>
      </div>

      {/* Material supply queue */}
      <SectionPanel title={t('fleetHub.mfgTab.matQueue')} count={materials?.length || 0} icon={ArrowRightLeft}>
        {!materials?.length ? <EmptyMini /> : (
          <Table
            headers={mhl}
            rows={materials.slice(0, 12).map((m: any) => [
              <span className="font-mono text-xs">{m.batch_number}</span>,
              <div className="truncate max-w-[160px]">{m.product_name || m.product_sku}</div>,
              <span>{fmt(m.planned_quantity)} {m.unit}</span>,
              fmt(m.used_quantity),
              <span className="font-bold text-amber-600">{fmt(m.shortage)}</span>,
              <span className={Number(m.available_stock) < Number(m.shortage) ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                {fmt(m.available_stock)}
              </span>,
              fmtDate(m.production_date),
            ])}
          />
        )}
      </SectionPanel>

      {/* Shipments + Output side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={t('fleetHub.mfgTab.shipRecent')} count={shipments?.length || 0} icon={Send}>
          {!shipments?.length ? <EmptyMini /> : (
            <div className="max-h-[360px] overflow-y-auto">
              <Table
                headers={shl}
                rows={shipments.slice(0, 12).map((s: any) => [
                  <span className="font-mono text-[11px]">{s.shipment_number}</span>,
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    s.shipment_category === 'material_supply'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-fuchsia-100 text-fuchsia-700'
                  }`}>
                    {s.shipment_category === 'material_supply' ? t('fleetHub.common.supply') : t('fleetHub.common.fg')}
                  </span>,
                  <div className="text-xs truncate max-w-[140px]">{s.destination_address}</div>,
                  s.vehicle_plate || '-',
                  <span className="inline-flex px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">{s.status}</span>,
                ])}
              />
            </div>
          )}
        </SectionPanel>

        <SectionPanel title={t('fleetHub.mfgTab.outPerProduct')} count={output?.length || 0} icon={BarChart3}>
          {!output?.length ? <EmptyMini /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={output} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="total_produced" fill="#A855F7" name={t('fleetHub.common.qtyProduction')} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}

// ========================= Supply Chain Tab =========================
function SupplyChainTab({ kpi, flow, network, loading, onRefresh }: any) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <IntegrationHeader
        title={t('fleetHub.supplyChain.title')}
        description={t('fleetHub.supplyChain.desc')}
        icon={Workflow}
        gradient="from-indigo-500 via-purple-500 to-pink-500"
        onRefresh={onRefresh}
      />

      {/* KPI Supply Chain */}
      <StatGrid stats={[
        { label: t('fleetHub.supplyChain.statWh'), value: fmt(kpi?.totalWarehouses || 0), icon: Warehouse, color: 'sky' },
        { label: t('fleetHub.supplyChain.statStockVal'), value: fmtRpShort(kpi?.totalStockValue || 0), icon: DollarSign, color: 'emerald' },
        { label: t('fleetHub.supplyChain.invTurn'), value: `${Number(kpi?.inventoryTurnover || 0).toFixed(2)}x`, icon: Activity, color: 'indigo', sub: `${t('fleetHub.supplyChain.doiPrefix')} ${Number(kpi?.daysOfInventory || 0).toFixed(0)} ${t('fleetHub.supplyChain.doiDays')}` },
        { label: t('fleetHub.supplyChain.onShelf'), value: `${kpi?.onShelfAvailability || 0}%`, icon: CheckCircle, color: 'green' },
      ]} />
      <StatGrid stats={[
        { label: t('fleetHub.supplyChain.batchActive'), value: fmt(kpi?.activeBatches || 0), icon: Factory, color: 'purple' },
        { label: t('fleetHub.supplyChain.prodMtd'), value: fmt(kpi?.producedQtyMTD || 0), icon: Boxes, color: 'pink', sub: t('fleetHub.mfgTab.unitKg') },
        { label: t('fleetHub.supplyChain.fgWait'), value: fmt(kpi?.fgReadyToDispatch || 0), icon: Package, color: 'amber' },
        { label: t('fleetHub.supplyChain.fleetFill'), value: `${kpi?.fleetFillRate || 0}%`, icon: Timer, color: 'teal', sub: t('fleetHub.supplyChain.last30') },
      ]} />

      {/* Flow Diagram (Horizontal) */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <Workflow className="w-4 h-4 text-indigo-600" /> {t('fleetHub.supplyChain.flowTitle')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
          <FlowNode icon={ShoppingCart} label={t('fleetHub.supplyChain.flowRaw')} value={flow?.rawMaterialRequests || 0} color="amber" />
          <FlowArrow />
          <FlowNode icon={Factory} label={t('fleetHub.supplyChain.flowBatch')} value={flow?.batchesInProgress || 0} color="purple" />
          <FlowArrow />
          <FlowNode icon={Package} label={t('fleetHub.supplyChain.flowFg')} value={flow?.fgReadyToShip || 0} color="pink" />
          <FlowArrow className="hidden md:block md:col-span-5 mx-auto mt-2 rotate-90 md:rotate-0" />
          <FlowNode icon={Truck} label={t('fleetHub.supplyChain.flowTransit')} value={flow?.shipmentsInTransit || 0} color="sky" />
          <FlowArrow />
          <FlowNode icon={CheckCircle} label={t('fleetHub.supplyChain.flowDone')} value={flow?.completedThisWeek || 0} color="emerald" />
        </div>
      </div>

      {/* Warehouse Network */}
      <SectionPanel title={t('fleetHub.supplyChain.whNet')} count={network?.nodes?.length || 0} icon={Building2}>
        {!network?.nodes?.length ? <EmptyMini /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {network.nodes.map((n: any) => {
              const incoming = network.edges?.filter((e: any) => e.target === n.id).reduce((s: number, e: any) => s + (e.transfer_count || 0), 0);
              const outgoing = network.edges?.filter((e: any) => e.source === n.id).reduce((s: number, e: any) => s + (e.transfer_count || 0), 0);
              return (
                <div key={n.id} className="border border-gray-100 rounded-lg p-3 bg-gradient-to-br from-white to-indigo-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><Warehouse className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{n.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{n.code}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 truncate mb-2">{n.city || n.address || '-'}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400 text-[10px]">{t('fleetHub.common.stock')}</div>
                      <div className="font-bold">{fmt(n.stock_qty || 0)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px]">{t('fleetHub.common.value')}</div>
                      <div className="font-bold">{fmtRpShort(n.stock_value || 0)}</div>
                    </div>
                    <div>
                      <div className="text-emerald-500 text-[10px] inline-flex items-center gap-0.5">
                        <ArrowRight className="w-2.5 h-2.5 rotate-180" /> {t('fleetHub.common.in')}
                      </div>
                      <div className="font-bold text-emerald-600">{fmt(incoming || 0)}</div>
                    </div>
                    <div>
                      <div className="text-rose-500 text-[10px] inline-flex items-center gap-0.5">
                        {t('fleetHub.common.out')} <ArrowRight className="w-2.5 h-2.5" />
                      </div>
                      <div className="font-bold text-rose-600">{fmt(outgoing || 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertCard
          icon={Inbox}
          title={t('fleetHub.supplyChain.alertTransfer')}
          value={fmt(kpi?.pendingTransfers || 0)}
          desc={t('fleetHub.supplyChain.alertTransferDesc')}
          color="purple"
          href="/hq/inventory/transfers"
        />
        <AlertCard
          icon={ShoppingCart}
          title={t('fleetHub.supplyChain.alertPo')}
          value={fmt(kpi?.pendingReceipts || 0)}
          desc={t('fleetHub.supplyChain.alertPoDesc')}
          color="amber"
          href="/hq/procurement"
        />
        <AlertCard
          icon={Package}
          title={t('fleetHub.supplyChain.alertMat')}
          value={fmt(kpi?.materialSupplyRequests || 0)}
          desc={t('fleetHub.supplyChain.alertMatDesc')}
          color="rose"
          href="/hq/inventory"
        />
      </div>
    </div>
  );
}

function FlowNode({ icon: Icon, label, value, color }: any) {
  return (
    <div className="text-center">
      <div className={`inline-flex p-4 rounded-2xl mb-2 ${COLOR_BG[color] || 'bg-gray-100 text-gray-600'} shadow-sm`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}

function FlowArrow({ className }: { className?: string }) {
  return (
    <div className={`hidden md:flex items-center justify-center ${className || ''}`}>
      <ArrowRight className="w-6 h-6 text-indigo-400" />
    </div>
  );
}

function AlertCard({ icon: Icon, title, value, desc, color, href }: any) {
  return (
    <Link href={href} className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-xl ${COLOR_BG[color] || 'bg-gray-100 text-gray-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-black text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </Link>
  );
}

// ========================= Shared Sub-Components =========================
function IntegrationHeader({ title, description, icon: Icon, gradient, onRefresh }: any) {
  const { t } = useTranslation();
  return (
    <div className={`rounded-xl p-5 bg-gradient-to-r ${gradient} text-white flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="p-3 bg-white/20 rounded-xl">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-white/90">{description}</p>
        </div>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> {t('fleetHub.common.refresh')}
        </button>
      )}
    </div>
  );
}

function StatGrid({ stats }: { stats: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${COLOR_BG[s.color] || 'bg-gray-50 text-gray-600'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xs text-gray-500 font-medium">{s.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</div>
            {s.sub && <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

function SectionPanel({ title, count, icon: Icon, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-600" /> {title}
          {typeof count === 'number' && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{count}</span>
          )}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-100 text-xs text-gray-500 uppercase">
            {headers.map((h, i) => (
              <th key={i} className="py-2 pr-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-3 align-top">{c as any}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyMini() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-10 text-gray-400">
      <Gift className="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p className="text-sm">{t('fleetHub.common.noData')}</p>
    </div>
  );
}
