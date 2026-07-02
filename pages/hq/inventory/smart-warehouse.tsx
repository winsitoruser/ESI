import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Brain, Cpu, Wifi, WifiOff, Thermometer, Droplets, Activity, Zap, Shield,
  AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  BarChart3, RefreshCw, Download, Search, Eye, Plus, Settings, ChevronRight,
  Package, Box, Warehouse, Bell, CheckCircle, XCircle, Clock, Target,
  Layers, RotateCcw, Gauge, Radio, ScanLine, Move, ClipboardCheck,
  Lightbulb, ShoppingCart, Truck, Map, Play, Pause, ToggleLeft, ToggleRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type MainTab = 'dashboard' | 'ai-insights' | 'iot-monitor' | 'automation' | 'pick-pack' | 'quality' | 'bin-opt';

const api = async (action: string, method = 'GET', body?: any) => {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const url = `/api/hq/warehouse/smart?action=${action}`;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

export default function SmartWarehousePage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MainTab>('dashboard');

  // Dashboard
  const [dashboard, setDashboard] = useState<any>(null);
  const [whHealth, setWhHealth] = useState<any[]>([]);

  // AI
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [forecastStats, setForecastStats] = useState<any>(null);
  const [reorderRecs, setReorderRecs] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [aiSubTab, setAiSubTab] = useState<'insights' | 'forecast' | 'reorder' | 'anomaly'>('insights');
  const [aiGenerating, setAiGenerating] = useState(false);

  // IoT
  const [sensors, setSensors] = useState<any[]>([]);
  const [iotDash, setIotDash] = useState<any>(null);
  const [iotSubTab, setIotSubTab] = useState<'overview' | 'sensors' | 'charts'>('overview');

  // Automation
  const [autoRules, setAutoRules] = useState<any[]>([]);
  const [autoLogs, setAutoLogs] = useState<any[]>([]);
  const [autoSubTab, setAutoSubTab] = useState<'rules' | 'logs'>('rules');

  // Pick/Pack
  const [pickTasks, setPickTasks] = useState<any[]>([]);

  // Quality
  const [qualityData, setQualityData] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [qcSubTab, setQcSubTab] = useState<'dashboard' | 'inspections'>('dashboard');

  // Bin Optimization
  const [binOpts, setBinOpts] = useState<any[]>([]);
  const [binProposal, setBinProposal] = useState<any>(null);

  // Snapshots
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const [exporting, setExporting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, hRes, sRes] = await Promise.all([
        api('smart-dashboard'), api('warehouse-health'), api('snapshots')
      ]);
      setDashboard(dRes.data);
      setWhHealth(hRes.data || []);
      setSnapshots((sRes.data || []).slice(0, 14));
    } catch (e) { console.error('Dashboard error:', e); }
    setLoading(false);
  }, []);

  const fetchAI = useCallback(async () => {
    try {
      const [fRes, rRes, aRes, iRes] = await Promise.all([
        api('ai-forecast'), api('ai-reorder'), api('ai-anomaly'), api('ai-insights')
      ]);
      setForecasts(fRes.data?.forecasts || []);
      setForecastStats(fRes.data?.stats || null);
      setReorderRecs(rRes.data?.recommendations || []);
      setAnomalies(aRes.data?.anomalies || []);
      setInsights(iRes.data?.insights || []);
    } catch (e) { console.error('AI error:', e); }
  }, []);

  const fetchIoT = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([api('iot-sensors'), api('iot-dashboard')]);
      setSensors(sRes.data || []);
      setIotDash(dRes.data || null);
    } catch (e) { console.error('IoT error:', e); }
  }, []);

  const fetchAutomation = useCallback(async () => {
    try {
      const [rRes, lRes] = await Promise.all([api('automation-rules'), api('automation-logs')]);
      setAutoRules(rRes.data || []);
      setAutoLogs(lRes.data || []);
    } catch (e) { console.error('Automation error:', e); }
  }, []);

  const fetchPick = useCallback(async () => {
    try {
      const r = await api('pick-tasks');
      setPickTasks(r.data || []);
    } catch (e) { console.error('Pick error:', e); }
  }, []);

  const fetchQuality = useCallback(async () => {
    try {
      const [dRes, iRes] = await Promise.all([api('quality-dashboard'), api('quality-inspections')]);
      setQualityData(dRes.data || null);
      setInspections(iRes.data || []);
    } catch (e) { console.error('Quality error:', e); }
  }, []);

  const fetchBin = useCallback(async () => {
    try {
      const r = await api('bin-optimization');
      setBinOpts(r.data || []);
    } catch (e) { console.error('Bin error:', e); }
  }, []);

  useEffect(() => { setMounted(true); fetchDashboard(); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (tab === 'dashboard') fetchDashboard();
    else if (tab === 'ai-insights') fetchAI();
    else if (tab === 'iot-monitor') fetchIoT();
    else if (tab === 'automation') fetchAutomation();
    else if (tab === 'pick-pack') fetchPick();
    else if (tab === 'quality') fetchQuality();
    else if (tab === 'bin-opt') fetchBin();
  }, [tab]);

  const handleGenerateForecast = async () => {
    setAiGenerating(true);
    try {
      const r = await api('ai-forecast', 'POST', { weeks: 8 });
      setForecasts(r.data?.forecasts || []);
      setForecastStats(r.data?.stats || null);
      toast.success(t('inventory.swForecastsGenerated').replace('{count}', String(r.data?.forecasts?.length || 0)));
    } catch { toast.error(t('inventory.swForecastFailed')); }
    setAiGenerating(false);
  };

  const handleGenerateReorder = async () => {
    setAiGenerating(true);
    try {
      const r = await api('ai-reorder', 'POST', { action: 'generate' });
      setReorderRecs(r.data?.recommendations || []);
      toast.success(t('inventory.swReorderRecsGenerated').replace('{count}', String(r.data?.recommendations?.length || 0)));
    } catch { toast.error(t('inventory.swReorderFailed')); }
    setAiGenerating(false);
  };

  const handleExecuteRule = async (ruleId: number) => {
    try {
      await api('automation-execute', 'POST', { ruleId });
      toast.success(t('inventory.swAutoRuleExecuted'));
      fetchAutomation();
    } catch { toast.error(t('inventory.swExecutionFailed')); }
  };

  const handleToggleRule = async (ruleId: number, isActive: boolean) => {
    try {
      await api('automation-rules', 'PUT', { id: ruleId, isActive: !isActive });
      toast.success(isActive ? t('inventory.swRuleDisabled') : t('inventory.swRuleEnabled'));
      fetchAutomation();
    } catch { toast.error(t('inventory.swToggleFailed')); }
  };

  const handleOptimizePick = async (taskId: number) => {
    try {
      const r = await api('pick-optimize', 'POST', { taskId });
      toast.success(t('inventory.swRouteOptimized').replace('{time}', r.data?.timeSaved || ''));
    } catch { toast.error(t('inventory.swOptFailed')); }
  };

  const handleGenerateBinOpt = async () => {
    try {
      const r = await api('bin-optimization', 'POST', { action: 'generate' });
      setBinProposal(r.data);
      toast.success(t('inventory.swBinOptGenerated'));
    } catch { toast.error(t('inventory.swGenFailed')); }
  };

  const handleExport = async (type: string) => {
    setExporting(true);
    try {
      const r = await api(`export&type=${type}`);
      const csv = r.data?.csv || '';
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `smart-warehouse-${type}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(t('inventory.swExportSuccess'));
    } catch { toast.error(t('inventory.swExportFailed')); }
    setExporting(false);
  };

  if (!mounted) return (
    <HQLayout>
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </HQLayout>
  );

  const fmt = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(0)}jt` : `Rp ${v.toLocaleString('id-ID')}`;
  const fmtN = (v: number) => v?.toLocaleString('id-ID') || '0';

  const TABS: { id: MainTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: t('inventory.swTabDashboard'), icon: Gauge },
    { id: 'ai-insights', label: t('inventory.swTabAI'), icon: Brain },
    { id: 'iot-monitor', label: t('inventory.swTabIoT'), icon: Radio },
    { id: 'automation', label: t('inventory.swTabAutomation'), icon: Zap },
    { id: 'pick-pack', label: t('inventory.swTabPickPack'), icon: ScanLine },
    { id: 'quality', label: t('inventory.swTabQuality'), icon: Shield },
    { id: 'bin-opt', label: t('inventory.swTabBinOpt'), icon: Move },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-100', text: 'text-green-600', iconBg: 'bg-green-100' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', iconBg: 'bg-cyan-100' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', iconBg: 'bg-pink-100' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', iconBg: 'bg-yellow-100' },
    red: { bg: 'bg-red-100', text: 'text-red-600', iconBg: 'bg-red-100' },
  };
  const urgencyColor = (u: string) => u === 'critical' ? 'bg-red-100 text-red-700' : u === 'high' ? 'bg-orange-100 text-orange-700' : u === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  const severityColor = (s: string) => s === 'critical' ? 'text-red-600 bg-red-50 border-red-200' : s === 'high' ? 'text-orange-600 bg-orange-50 border-orange-200' : s === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-blue-600 bg-blue-50 border-blue-200';
  const statusColor = (s: string) => s === 'online' ? 'text-green-600' : s === 'offline' ? 'text-gray-400' : s === 'error' ? 'text-red-600' : 'text-yellow-600';

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              {t('inventory.swTitle')}
            </h1>
            <p className="text-gray-500 mt-1">{t('inventory.swSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/hq/inventory" className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> {t('inventory.swInventoryClassic')}
            </Link>
            <button onClick={() => handleExport('sensors')} disabled={exporting} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50">
              <Download className="w-4 h-4" /> {t('inventory.swExport')}
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === tb.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <tb.icon className="w-4 h-4" />{tb.label}
            </button>
          ))}
        </div>

        {/* ═══════════ SMART DASHBOARD ═══════════ */}
        {tab === 'dashboard' && dashboard && (<>
          {/* Smart Score */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('inventory.swScoreTitle')}</p>
                <p className="text-5xl font-black mt-2">{dashboard.smartScore}<span className="text-2xl font-normal text-blue-200">/100</span></p>
                <p className="text-blue-200 text-sm mt-2">{t('inventory.swScoreDesc')}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <Radio className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.iot.online}/{dashboard.iot.totalSensors}</p>
                  <p className="text-xs text-blue-200">{t('inventory.swIoTOnline')}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <Zap className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.automation.activeRules}</p>
                  <p className="text-xs text-blue-200">{t('inventory.swActiveRules')}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <Shield className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.quality.passRate}%</p>
                  <p className="text-xs text-blue-200">{t('inventory.swQCPassRate')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: t('inventory.swWarehouses'), value: dashboard.inventory.warehouseCount, icon: Warehouse, color: 'blue' },
              { label: t('inventory.swProducts'), value: fmtN(dashboard.inventory.productCount), icon: Package, color: 'green' },
              { label: t('inventory.swTotalStock'), value: fmtN(dashboard.inventory.totalStock), icon: Box, color: 'purple' },
              { label: t('inventory.swLowStock'), value: dashboard.inventory.lowStock, icon: AlertTriangle, color: 'orange' },
              { label: t('inventory.swPendingPicks'), value: dashboard.pickPack.pendingPicks, icon: ScanLine, color: 'cyan' },
              { label: t('inventory.swAIReorders'), value: dashboard.aiReorder.pending, icon: ShoppingCart, color: 'pink' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`w-8 h-8 ${colorMap[kpi.color]?.bg || 'bg-gray-100'} rounded-lg flex items-center justify-center mb-2`}>
                  <kpi.icon className={`w-4 h-4 ${colorMap[kpi.color]?.text || 'text-gray-600'}`} />
                </div>
                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Warehouse Health Cards */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> {t('inventory.swHealthTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {whHealth.map((wh: any) => (
                <div key={wh.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{wh.name}</p>
                      <p className="text-xs text-gray-500">{wh.code} | {wh.type}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${wh.healthScore >= 90 ? 'bg-green-100 text-green-700' : wh.healthScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {wh.healthScore}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t('inventory.swUtilization')}</span>
                      <span className="font-medium">{wh.utilizationPct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${wh.utilizationPct > 90 ? 'bg-red-500' : wh.utilizationPct > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(wh.utilizationPct, 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div><p className="text-lg font-bold text-gray-900">{fmtN(wh.products)}</p><p className="text-xs text-gray-400">{t('inventory.swProducts')}</p></div>
                      <div><p className="text-lg font-bold text-gray-900">{wh.locations}</p><p className="text-xs text-gray-400">{t('inventory.swLocationsLabel')}</p></div>
                      <div><p className="text-lg font-bold text-gray-900">{wh.sensorsOnline}/{wh.sensors}</p><p className="text-xs text-gray-400">{t('inventory.swSensorsLabel')}</p></div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {wh.iotEnabled && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">IoT</span>}
                      <span className={`px-2 py-0.5 rounded text-xs ${wh.automationLevel === 'fully_auto' ? 'bg-purple-100 text-purple-700' : wh.automationLevel === 'semi_auto' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{wh.automationLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Trend (from snapshots) */}
          {snapshots.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.swTrendTitle')}</h3>
              <Chart
                options={{
                  chart: { type: 'area', toolbar: { show: false } },
                  stroke: { curve: 'smooth', width: 2 },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                  colors: ['#3B82F6', '#10B981', '#EF4444'],
                  xaxis: { categories: [...snapshots].reverse().map((s: any) => s.snapshot_date?.slice(5) || '') },
                  yaxis: [
                    { title: { text: t('inventory.swQuantity') }, labels: { formatter: (v: number) => fmtN(v) } },
                    { opposite: true, title: { text: t('inventory.swRatePercent') }, labels: { formatter: (v: number) => `${v}%` } }
                  ],
                  legend: { position: 'top' }, dataLabels: { enabled: false }
                }}
                series={[
                  { name: t('inventory.swTotalStockSeries'), data: [...snapshots].reverse().map((s: any) => s.total_quantity) },
                  { name: t('inventory.swFillRate'), data: [...snapshots].reverse().map((s: any) => parseFloat(s.fill_rate || 95)) },
                  { name: t('inventory.swLowStockItems'), data: [...snapshots].reverse().map((s: any) => s.low_stock_count) },
                ]}
                type="area" height={300}
              />
            </div>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <ScanLine className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{dashboard.pickPack.completedToday}</p>
              <p className="text-green-100 text-sm">{t('inventory.swPicksToday')}</p>
              <p className="text-xs text-green-200 mt-1">{t('inventory.swAvgPickTime').replace('{time}', String(dashboard.pickPack.avgPickTimeMin))}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white">
              <Zap className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{dashboard.automation.totalTriggers}</p>
              <p className="text-purple-100 text-sm">{t('inventory.swAutoTriggers')}</p>
              <p className="text-xs text-purple-200 mt-1">{t('inventory.swSuccessRate').replace('{rate}', String(dashboard.automation.successRate))}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-white">
              <Radio className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{dashboard.iot.totalSensors}</p>
              <p className="text-cyan-100 text-sm">{t('inventory.swIoTSensorsActive')}</p>
              <p className="text-xs text-cyan-200 mt-1">{dashboard.iot.error > 0 ? t('inventory.swSensorError').replace('{count}', String(dashboard.iot.error)) : t('inventory.swAllHealthy')}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white">
              <AlertTriangle className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{dashboard.aiReorder.critical}</p>
              <p className="text-orange-100 text-sm">{t('inventory.swCriticalReorders')}</p>
              <p className="text-xs text-orange-200 mt-1">{t('inventory.swTotalPending').replace('{count}', String(dashboard.aiReorder.pending))}</p>
            </div>
          </div>
        </>)}

        {/* ═══════════ AI ENGINE ═══════════ */}
        {tab === 'ai-insights' && (<>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { v: 'insights' as const, l: t('inventory.swAIInsights'), ic: Lightbulb },
              { v: 'forecast' as const, l: t('inventory.swDemandForecast'), ic: TrendingUp },
              { v: 'reorder' as const, l: t('inventory.swSmartReorder'), ic: ShoppingCart },
              { v: 'anomaly' as const, l: t('inventory.swAnomalyDetection'), ic: AlertTriangle },
            ].map(st => (
              <button key={st.v} onClick={() => setAiSubTab(st.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${aiSubTab === st.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <st.ic className="w-4 h-4" />{st.l}
              </button>
            ))}
          </div>

          {/* AI Insights */}
          {aiSubTab === 'insights' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-700"><strong>{t('inventory.swAIInsightsEngine')}</strong>: {t('inventory.swAIInsightsDesc')}</p>
              </div>
              {insights.map((ins: any) => (
                <div key={ins.id} className={`bg-white rounded-xl border p-5 ${ins.impact === 'critical' ? 'border-red-200' : ins.impact === 'high' ? 'border-orange-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ins.category === 'optimization' ? 'bg-blue-100' : ins.category === 'cost' ? 'bg-green-100' : ins.category === 'forecast' ? 'bg-purple-100' : ins.category === 'quality' ? 'bg-orange-100' : 'bg-cyan-100'}`}>
                        <Lightbulb className={`w-5 h-5 ${ins.category === 'optimization' ? 'text-blue-600' : ins.category === 'cost' ? 'text-green-600' : ins.category === 'forecast' ? 'text-purple-600' : ins.category === 'quality' ? 'text-orange-600' : 'text-cyan-600'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{ins.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{ins.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor(ins.impact)}`}>{ins.impact}</span>
                      <span className="text-xs text-gray-500">{ins.confidence}% {t('inventory.swConfidence')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-green-600">{ins.estimatedSavings}</p>
                    <div className="flex gap-2">
                      {ins.actions?.map((a: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demand Forecast */}
          {aiSubTab === 'forecast' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex-1 mr-3">
                  <p className="text-sm text-amber-700"><strong>{t('inventory.swAIDemandForecast')}</strong>: {t('inventory.swDemandForecastDesc')}</p>
                </div>
                <button onClick={handleGenerateForecast} disabled={aiGenerating} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2 disabled:opacity-50">
                  <Brain className={`w-4 h-4 ${aiGenerating ? 'animate-pulse' : ''}`} /> {aiGenerating ? t('inventory.swGenerating') : t('inventory.swGenerateForecast')}
                </button>
              </div>

              {forecastStats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-gray-900">{fmtN(forecastStats.count)}</p><p className="text-xs text-gray-500">{t('inventory.swForecastPoints')}</p></div>
                  <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-gray-900">{forecastStats.avgConfidence}%</p><p className="text-xs text-gray-500">{t('inventory.swAvgConfidence')}</p></div>
                  <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-gray-900">{fmtN(forecastStats.totalDemand || 0)}</p><p className="text-xs text-gray-500">{t('inventory.swTotalPredictedDemand')}</p></div>
                </div>
              )}

              {forecasts.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.swForecastByProduct')}</h3>
                  <Chart
                    options={{
                      chart: { type: 'line', toolbar: { show: false } },
                      stroke: { curve: 'smooth', width: 2 },
                      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
                      xaxis: { categories: [...new Set(forecasts.map((f: any) => f.forecastDate || f.forecast_date))].slice(0, 8) },
                      yaxis: { labels: { formatter: (v: number) => fmtN(v) } },
                      legend: { position: 'top' }, dataLabels: { enabled: false },
                    }}
                    series={[...new Set(forecasts.map((f: any) => f.productName || f.product_name))].slice(0, 8).map(name => ({
                      name: String(name),
                      data: forecasts.filter((f: any) => (f.productName || f.product_name) === name).slice(0, 8).map((f: any) => f.predictedDemand || f.predicted_demand || 0)
                    }))}
                    type="line" height={350}
                  />
                </div>
              )}
            </div>
          )}

          {/* Smart Reorder */}
          {aiSubTab === 'reorder' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex-1 mr-3">
                  <p className="text-sm text-green-700"><strong>{t('inventory.swSmartReorderEngine')}</strong>: {t('inventory.swSmartReorderDesc')}</p>
                </div>
                <button onClick={handleGenerateReorder} disabled={aiGenerating} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50">
                  <Brain className={`w-4 h-4 ${aiGenerating ? 'animate-pulse' : ''}`} /> {aiGenerating ? t('inventory.swGenerating') : t('inventory.swGenerateReorders')}
                </button>
              </div>
              {reorderRecs.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThProduct')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThCurrent')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThMin')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThRecommended')}</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.swThUrgency')}</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.swThStockout')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThEstCost')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reorderRecs.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><p className="font-medium text-gray-900">{r.productName || r.product_name}</p><p className="text-xs text-gray-500">{r.sku}</p></td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">{r.currentStock || r.current_stock}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{r.minimumStock || r.minimum_stock}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600">{r.recommendedQty || r.recommended_qty}</td>
                          <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor(r.urgency)}`}>{r.urgency}</span></td>
                          <td className="px-4 py-3 text-center text-sm">{r.predictedStockoutDate || r.predicted_stockout_date}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{fmt(r.estimatedCost || r.estimated_cost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Anomaly Detection */}
          {aiSubTab === 'anomaly' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700"><strong>{t('inventory.swAnomalyTitle')}</strong>: {t('inventory.swAnomalyDesc')}</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: t('inventory.swTotalAnomalies'), value: anomalies.length, color: 'blue' },
                  { label: t('inventory.swCritical'), value: anomalies.filter(a => a.severity === 'critical').length, color: 'red' },
                  { label: t('inventory.swHigh'), value: anomalies.filter(a => a.severity === 'high').length, color: 'orange' },
                  { label: t('inventory.swActive'), value: anomalies.filter(a => a.status === 'active').length, color: 'yellow' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4">
                    <p className={`text-2xl font-bold ${colorMap[s.color]?.text || 'text-gray-600'}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              {anomalies.map((a: any) => (
                <div key={a.id} className={`rounded-xl border p-4 ${severityColor(a.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${a.severity === 'critical' ? 'bg-red-600 text-white' : a.severity === 'high' ? 'bg-orange-600 text-white' : 'bg-yellow-500 text-white'}`}>{a.severity}</span>
                        <span className="text-xs text-gray-500">{a.type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">{a.confidence}% {t('inventory.swConfidence')}</span>
                      </div>
                      <p className="font-semibold text-gray-900">{a.product}</p>
                      <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${a.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between">
                    <p className="text-sm"><strong>{t('inventory.swRecommendation')}:</strong> {a.recommendation}</p>
                    <span className="text-xs text-gray-400">{new Date(a.detectedAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ═══════════ IoT MONITOR ═══════════ */}
        {tab === 'iot-monitor' && (<>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { v: 'overview' as const, l: t('inventory.swOverview'), ic: Gauge },
              { v: 'sensors' as const, l: t('inventory.swSensorList'), ic: Radio },
              { v: 'charts' as const, l: t('inventory.swLiveCharts'), ic: BarChart3 },
            ].map(st => (
              <button key={st.v} onClick={() => setIotSubTab(st.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${iotSubTab === st.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <st.ic className="w-4 h-4" />{st.l}
              </button>
            ))}
          </div>

          {iotSubTab === 'overview' && iotDash && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {iotDash.sensorsByType?.map((s: any) => (
                  <div key={s.type} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 capitalize">{s.type}</span>
                      <span className={`text-xs ${s.online === s.count ? 'text-green-600' : 'text-orange-600'}`}>{s.online}/{s.count}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{s.avgValue} <span className="text-sm font-normal text-gray-400">{s.unit}</span></p>
                  </div>
                ))}
              </div>

              {iotDash.recentAlerts?.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">{t('inventory.swRecentIoTAlerts')}</h3>
                  {iotDash.recentAlerts.map((a: any) => (
                    <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${a.severity === 'critical' ? 'bg-red-50' : a.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${a.severity === 'critical' ? 'text-red-600' : a.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{a.message}</p>
                        <p className="text-xs text-gray-500">{a.sensor} | {a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {iotSubTab === 'sensors' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThSensor')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThType')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThWarehouse')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.swThStatus')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThLastReading')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.swThBattery')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sensors.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.sensor_code}</p></td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">{s.sensor_type}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.warehouse_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center gap-1 justify-center text-xs font-medium ${statusColor(s.status)}`}>
                          {s.status === 'online' ? <Wifi className="w-3 h-3" /> : s.status === 'error' ? <AlertTriangle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{s.last_reading?.value} {s.last_reading?.unit}</td>
                      <td className="px-4 py-3 text-center">
                        {s.battery_level != null && (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${s.battery_level > 50 ? 'bg-green-500' : s.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.battery_level}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{s.battery_level}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {iotSubTab === 'charts' && iotDash && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Thermometer className="w-5 h-5 text-red-500" /> {t('inventory.swTemperature24h')}</h3>
                <Chart
                  options={{ chart: { type: 'line', toolbar: { show: false } }, stroke: { curve: 'smooth', width: 2 }, colors: ['#EF4444', '#F59E0B', '#3B82F6'], xaxis: { categories: iotDash.temperatureTrend?.map((t: any) => t.hour) || [], labels: { show: true, rotate: -45, style: { fontSize: '10px' } }, tickAmount: 12 }, yaxis: { title: { text: '°C' } }, legend: { position: 'top' }, dataLabels: { enabled: false } }}
                  series={[ { name: 'Zone A', data: iotDash.temperatureTrend?.map((t: any) => +t.zone_a.toFixed(1)) || [] }, { name: 'Zone B', data: iotDash.temperatureTrend?.map((t: any) => +t.zone_b.toFixed(1)) || [] }, { name: 'Cold Storage', data: iotDash.temperatureTrend?.map((t: any) => +t.cold_storage.toFixed(1)) || [] } ]}
                  type="line" height={300}
                />
              </div>
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-500" /> {t('inventory.swHumidity24h')}</h3>
                <Chart
                  options={{ chart: { type: 'area', toolbar: { show: false } }, stroke: { curve: 'smooth', width: 2 }, fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } }, colors: ['#3B82F6', '#10B981', '#8B5CF6'], xaxis: { categories: iotDash.humidityTrend?.map((t: any) => t.hour) || [], labels: { show: true, rotate: -45, style: { fontSize: '10px' } }, tickAmount: 12 }, yaxis: { title: { text: '%' } }, legend: { position: 'top' }, dataLabels: { enabled: false } }}
                  series={[ { name: 'Zone A', data: iotDash.humidityTrend?.map((t: any) => +t.zone_a.toFixed(1)) || [] }, { name: 'Zone B', data: iotDash.humidityTrend?.map((t: any) => +t.zone_b.toFixed(1)) || [] }, { name: 'Cold Storage', data: iotDash.humidityTrend?.map((t: any) => +t.cold_storage.toFixed(1)) || [] } ]}
                  type="area" height={300}
                />
              </div>
            </div>
          )}
        </>)}

        {/* ═══════════ AUTOMATION ═══════════ */}
        {tab === 'automation' && (<>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { v: 'rules' as const, l: t('inventory.swAutomationRules'), ic: Settings },
              { v: 'logs' as const, l: t('inventory.swExecutionLogs'), ic: Clock },
            ].map(st => (
              <button key={st.v} onClick={() => setAutoSubTab(st.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${autoSubTab === st.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <st.ic className="w-4 h-4" />{st.l}
              </button>
            ))}
          </div>

          {autoSubTab === 'rules' && (
            <div className="space-y-3">
              {autoRules.map((r: any) => (
                <div key={r.id} className={`bg-white rounded-xl border p-4 ${r.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleRule(r.id, r.is_active)} className="flex-shrink-0">
                        {r.is_active ? <ToggleRight className="w-8 h-5 text-green-600" /> : <ToggleLeft className="w-8 h-5 text-gray-400" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{r.name}</p>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{r.rule_type}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{r.trigger_type}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{t('inventory.swTriggered')}: {r.trigger_count}x</span>
                          <span>{t('inventory.swSuccess')}: {r.success_count} ({r.trigger_count > 0 ? ((r.success_count/r.trigger_count)*100).toFixed(0) : 0}%)</span>
                          <span>{t('inventory.swCooldown')}: {r.cooldown_minutes}min</span>
                          {r.last_triggered_at && <span>{t('inventory.swLast')}: {new Date(r.last_triggered_at).toLocaleString('id-ID')}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleExecuteRule(r.id)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs flex items-center gap-1">
                      <Play className="w-3 h-3" /> {t('inventory.swExecute')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {autoSubTab === 'logs' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThRule')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.swThStatus')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.swThTimems')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.swThExecutedAt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {autoLogs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-gray-900">{l.rule_name}</p><p className="text-xs text-gray-500">{l.rule_type}</p></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{l.execution_time_ms}ms</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(l.executed_at).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ═══════════ PICK & PACK ═══════════ */}
        {tab === 'pick-pack' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: t('inventory.swPending'), value: pickTasks.filter(pk => pk.status === 'pending').length, color: 'yellow' },
                { label: t('inventory.swInProgress'), value: pickTasks.filter(pk => pk.status === 'in_progress').length, color: 'blue' },
                { label: t('inventory.swCompleted'), value: pickTasks.filter(pk => pk.status === 'completed').length, color: 'green' },
                { label: t('inventory.swAvgTime'), value: `${pickTasks.filter(pk => pk.actual_time_min).reduce((s, pk) => s + pk.actual_time_min, 0) / Math.max(pickTasks.filter(pk => pk.actual_time_min).length, 1) || 0} min`, color: 'purple' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border p-4">
                  <p className={`text-2xl font-bold ${colorMap[s.color]?.text || 'text-gray-600'}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            {pickTasks.map((pk: any) => (
              <div key={pk.id} className={`bg-white rounded-xl border p-4 ${pk.priority === 'urgent' ? 'border-red-300' : pk.priority === 'high' ? 'border-orange-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${pk.priority === 'urgent' ? 'bg-red-600 text-white' : pk.priority === 'high' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{pk.priority}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{pk.task_number}</p>
                      <p className="text-xs text-gray-500">{pk.task_type} | {pk.warehouse_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pk.status === 'completed' ? 'bg-green-100 text-green-700' : pk.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{pk.status}</span>
                    {pk.status !== 'completed' && (
                      <button onClick={() => handleOptimizePick(pk.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{t('inventory.swOptimizeRoute')}</button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {pk.assigned_to && <span>{t('inventory.swAssigned')}: <strong>{pk.assigned_to}</strong></span>}
                  <span>{t('inventory.swItems')}: {Array.isArray(pk.items) ? pk.items.length : 0}</span>
                  {pk.estimated_time_min && <span>{t('inventory.swEst')}: {pk.estimated_time_min}min</span>}
                  {pk.actual_time_min && <span>{t('inventory.swActual')}: {pk.actual_time_min}min</span>}
                </div>
                {Array.isArray(pk.items) && pk.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pk.items.map((item: any, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{item.productName} x{item.qty} @ {item.location}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════════ QUALITY CONTROL ═══════════ */}
        {tab === 'quality' && (<>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { v: 'dashboard' as const, l: t('inventory.swQCDashboard'), ic: BarChart3 },
              { v: 'inspections' as const, l: t('inventory.swInspections'), ic: ClipboardCheck },
            ].map(st => (
              <button key={st.v} onClick={() => setQcSubTab(st.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${qcSubTab === st.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <st.ic className="w-4 h-4" />{st.l}
              </button>
            ))}
          </div>

          {qcSubTab === 'dashboard' && qualityData && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-gray-900">{qualityData.summary.totalInspections}</p><p className="text-xs text-gray-500">{t('inventory.swTotalInspections')}</p></div>
                <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-green-600">{qualityData.summary.passed}</p><p className="text-xs text-gray-500">{t('inventory.swPassed')}</p></div>
                <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-red-600">{qualityData.summary.failed}</p><p className="text-xs text-gray-500">{t('inventory.swFailed')}</p></div>
                <div className="bg-white rounded-xl border p-4"><p className="text-2xl font-bold text-blue-600">{qualityData.summary.passRate}%</p><p className="text-xs text-gray-500">{t('inventory.swPassRate')}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.swPassRateTrend')}</h3>
                  <Chart
                    options={{ chart: { type: 'line', toolbar: { show: false } }, stroke: { curve: 'smooth', width: 3 }, colors: ['#10B981'], xaxis: { categories: qualityData.trend?.map((t: any) => t.month) || [] }, yaxis: { min: 80, max: 100, labels: { formatter: (v: number) => `${v}%` } }, dataLabels: { enabled: false } }}
                    series={[{ name: 'Pass Rate', data: qualityData.trend?.map((t: any) => t.rate) || [] }]}
                    type="line" height={250}
                  />
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.swInspectionsByType')}</h3>
                  <Chart
                    options={{ chart: { type: 'donut' }, labels: qualityData.byType?.map((t: any) => t.type) || [], colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'], legend: { position: 'bottom' } }}
                    series={qualityData.byType?.map((t: any) => t.total) || []}
                    type="donut" height={250}
                  />
                </div>
              </div>

              {qualityData.topIssues?.length > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">{t('inventory.swTopQualityIssues')}</h3>
                  {qualityData.topIssues.map((issue: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${issue.severity === 'critical' ? 'bg-red-500' : issue.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm text-gray-900">{issue.issue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{issue.count}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${urgencyColor(issue.severity)}`}>{issue.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {qcSubTab === 'inspections' && (
            <div className="space-y-3">
              {inspections.map((insp: any) => (
                <div key={insp.id} className={`bg-white rounded-xl border p-4 ${insp.overall_result === 'failed' ? 'border-red-200' : insp.overall_result === 'conditional' ? 'border-yellow-200' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{insp.inspection_number}</p>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{insp.inspection_type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{insp.warehouse_name} | {insp.inspector_name} | {new Date(insp.inspection_date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${insp.overall_result === 'passed' ? 'bg-green-100 text-green-700' : insp.overall_result === 'failed' ? 'bg-red-100 text-red-700' : insp.overall_result === 'conditional' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{insp.overall_result}</span>
                  </div>
                  {insp.findings && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">{insp.findings}</p>}
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ═══════════ BIN OPTIMIZATION ═══════════ */}
        {tab === 'bin-opt' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex-1 mr-3">
                <p className="text-sm text-indigo-700"><strong>{t('inventory.swAIBinOpt')}</strong>: {t('inventory.swBinOptDesc')}</p>
              </div>
              <button onClick={handleGenerateBinOpt} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2">
                <Brain className="w-4 h-4" /> {t('inventory.swGenerateOpt')}
              </button>
            </div>

            {binProposal && (
              <div className="bg-white rounded-xl border border-indigo-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{t('inventory.swNewOptProposal')}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{binProposal.optimizationType}</span>
                    <span className="text-sm text-green-600 font-medium">{t('inventory.swEstSavings')}: {binProposal.estimatedSavingsPct}%</span>
                    <span className="text-xs text-gray-500">{binProposal.aiConfidence}% {t('inventory.swAIConfidenceLabel')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {binProposal.moves?.map((mv: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">{mv.from}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">{mv.to}</span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium flex-1">{mv.product}</p>
                      <p className="text-xs text-gray-500">{mv.reason}</p>
                      <span className="text-sm font-medium text-green-600">-{mv.savingPct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{t('inventory.swOptHistory')}</h3>
              {binOpts.map((opt: any) => (
                <div key={opt.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{opt.optimization_type}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${opt.status === 'completed' ? 'bg-green-100 text-green-700' : opt.status === 'proposed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{opt.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{opt.total_moves} {t('inventory.swMoves')} | {t('inventory.swAIConfidenceLabel')}: {opt.ai_confidence}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{opt.actual_savings_pct || opt.estimated_savings_pct}% {t('inventory.swSavings')}</p>
                    <p className="text-xs text-gray-400">{new Date(opt.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-500">{t('inventory.swLoading')}</span>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
