import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import ProductFormModal from '../../../components/hq/inventory/ProductFormModal';
import { toast } from 'react-hot-toast';
import {
  Package, RefreshCw, Download, Search, AlertTriangle, TrendingUp, TrendingDown,
  Building2, Box, BarChart3, ArrowUpRight, ArrowDownRight, Warehouse, ArrowRightLeft,
  Clock, CheckCircle, XCircle, Filter, Eye, Plus, Bell, ShoppingCart, Truck, FileText,
  Settings, ChevronRight, Target, Activity, Layers, Zap, Thermometer, RotateCcw
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { rowsOr, MOCK_HQ_BRANCHES } from '@/lib/hq/mock-data';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface InventorySummary {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  pendingTransfers: number;
  pendingOrders: number;
}

interface BranchStock {
  id: string;
  name: string;
  code: string;
  totalProducts: number;
  totalStock: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  overStock: number;
  lastSync: string;
  status: 'synced' | 'pending' | 'error';
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  totalStock: number;
  stockValue: number;
  movement: 'fast' | 'medium' | 'slow';
  trend: number;
}

interface RecentActivity {
  id: string;
  type: 'transfer' | 'adjustment' | 'receipt' | 'return' | 'stocktake';
  description: string;
  branch: string;
  quantity: number;
  timestamp: string;
  user: string;
}

const defaultInvSummary: InventorySummary = { totalProducts: 0, totalStock: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0, overStockItems: 0, pendingTransfers: 0, pendingOrders: 0 };

const MOCK_INV_SUMMARY: InventorySummary = {
  totalProducts: 342, totalStock: 28450, totalValue: 1850000000,
  lowStockItems: 18, outOfStockItems: 5, overStockItems: 12, pendingTransfers: 8, pendingOrders: 14,
};

const MOCK_BRANCH_STOCK: BranchStock[] = [
  { id: 'b1', name: 'Kantor Pusat Jakarta', code: 'HQ-001', totalProducts: 245, totalStock: 8200, stockValue: 620000000, lowStock: 5, outOfStock: 1, overStock: 3, lastSync: '2026-03-12T08:00:00', status: 'synced' },
  { id: 'b2', name: 'Cabang Bandung', code: 'BR-002', totalProducts: 198, totalStock: 5600, stockValue: 380000000, lowStock: 4, outOfStock: 2, overStock: 2, lastSync: '2026-03-12T07:45:00', status: 'synced' },
  { id: 'b3', name: 'Cabang Surabaya', code: 'BR-003', totalProducts: 185, totalStock: 4800, stockValue: 320000000, lowStock: 6, outOfStock: 1, overStock: 4, lastSync: '2026-03-12T07:30:00', status: 'synced' },
  { id: 'b5', name: 'Cabang Bali', code: 'BR-005', totalProducts: 165, totalStock: 3500, stockValue: 250000000, lowStock: 2, outOfStock: 0, overStock: 1, lastSync: '2026-03-12T07:50:00', status: 'synced' },
  { id: 'b8', name: 'Gudang Pusat Bekasi', code: 'WH-008', totalProducts: 320, totalStock: 6350, stockValue: 280000000, lowStock: 1, outOfStock: 1, overStock: 2, lastSync: '2026-03-12T06:00:00', status: 'synced' },
];

const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { id: 'p1', name: 'Kopi Arabica Gayo 1kg', sku: 'SKU-KAG-001', category: 'Bahan Baku', totalStock: 850, stockValue: 127500000, movement: 'fast', trend: 12 },
  { id: 'p2', name: 'Gula Pasir Premium 1kg', sku: 'SKU-GP-001', category: 'Bahan Baku', totalStock: 1200, stockValue: 18000000, movement: 'fast', trend: 8 },
  { id: 'p3', name: 'Cup Plastik 16oz (1000pcs)', sku: 'SKU-CP16-001', category: 'Packaging', totalStock: 45, stockValue: 6750000, movement: 'fast', trend: -5 },
  { id: 'p4', name: 'Susu Full Cream 1L', sku: 'SKU-SFC-001', category: 'Bahan Baku', totalStock: 680, stockValue: 13600000, movement: 'medium', trend: 3 },
  { id: 'p5', name: 'Sirup Vanila 750ml', sku: 'SKU-SV-001', category: 'Bahan Baku', totalStock: 320, stockValue: 32000000, movement: 'medium', trend: 0 },
];

const MOCK_INV_ACTIVITIES: RecentActivity[] = [
  { id: 'a1', type: 'transfer', description: 'Transfer Kopi Arabica 50kg', branch: 'Gudang Bekasi → Cabang Bali', quantity: 50, timestamp: '2026-03-12T09:30:00', user: 'Eko Prasetyo' },
  { id: 'a2', type: 'receipt', description: 'Penerimaan dari PT Sumber Makmur', branch: 'Gudang Pusat Bekasi', quantity: 200, timestamp: '2026-03-12T08:15:00', user: 'Hendra Gunawan' },
  { id: 'a3', type: 'adjustment', description: 'Adjustment stok cup plastik', branch: 'Cabang Bandung', quantity: -15, timestamp: '2026-03-11T16:45:00', user: 'Yuni Kartika' },
  { id: 'a4', type: 'stocktake', description: 'Stock Opname Mingguan', branch: 'Cabang Surabaya', quantity: 0, timestamp: '2026-03-11T14:00:00', user: 'Budi Santoso' },
];

const INDUSTRY_LABEL: Record<string, string> = {
  general: 'industryGeneral',
  fnb: 'industryFnb',
  retail: 'industryRetail',
  logistics: 'industryLogistics',
  hospitality: 'industryHospitality',
  manufacturing: 'industryManufacturing',
  pharmacy: 'industryPharmacy',
  distributor: 'industryDistributor',
};

export default function HQInventoryDashboard() {
  const { t } = useTranslation();
  const industryOptions = React.useMemo(
    () =>
      Object.entries(INDUSTRY_LABEL).map(([value, key]) => ({
        value,
        label: t(`inventory.${key}`),
      })),
    [t]
  );
  const industryLabel = (v: string) => t(`inventory.${INDUSTRY_LABEL[v] ?? 'industryGeneral'}`);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary>(MOCK_INV_SUMMARY);
  const [branchStock, setBranchStock] = useState<BranchStock[]>(MOCK_BRANCH_STOCK);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(MOCK_TOP_PRODUCTS);
  const [activities, setActivities] = useState<RecentActivity[]>(MOCK_INV_ACTIVITIES);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>(MOCK_HQ_BRANCHES);
  const [industry, setIndustry] = useState('general');
  const [subTab, setSubTab] = useState<'overview' | 'kpis' | 'forecast' | 'abc'>('overview');
  const [industryKpis, setIndustryKpis] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [abcAnalysis, setAbcAnalysis] = useState<any>(null);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, branchesRes, enhancedRes] = await Promise.all([
        fetch('/api/hq/inventory/products?limit=100&offset=0'),
        fetch('/api/hq/branches?limit=100'),
        fetch(`/api/hq/inventory/enhanced?action=dashboard&industry=${industry}`)
      ]);
      
      if (productsRes.ok) {
        const result = await productsRes.json();
        const products = result.data || [];
        
        const totalProducts = products.length;
        const totalStock = products.reduce((sum: number, p: any) => {
          const stockSum = p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0;
          return sum + stockSum;
        }, 0);
        const totalValue = products.reduce((sum: number, p: any) => {
          const stockSum = p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0;
          return sum + (stockSum * parseFloat(p.costPrice || 0));
        }, 0);
        
        const lowStockItems = products.filter((p: any) => {
          const stockSum = p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0;
          return p.reorderPoint && stockSum <= p.reorderPoint;
        }).length;
        
        const outOfStockItems = products.filter((p: any) => {
          const stockSum = p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0;
          return stockSum === 0;
        }).length;
        
        setSummary({
          ...defaultInvSummary,
          totalProducts,
          totalStock,
          totalValue,
          lowStockItems,
          outOfStockItems
        });
        
        const topProds = products.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          totalStock: p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0,
          stockValue: (p.stocks?.reduce((s: number, st: any) => s + st.quantity, 0) || 0) * parseFloat(p.costPrice || 0),
          movement: 'medium' as const,
          trend: 0
        }));
        
        if (topProds.length > 0) setTopProducts(topProds);
      }
      
      if (branchesRes.ok) {
        const branchJson = await branchesRes.json();
        const branchPayload = branchJson.data || branchJson;
        setBranches(rowsOr(branchPayload.branches, MOCK_HQ_BRANCHES));
      }

      if (enhancedRes.ok) {
        const eData = await enhancedRes.json();
        setEnhancedData(eData.data || null);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setSummary(MOCK_INV_SUMMARY);
      setBranchStock(MOCK_BRANCH_STOCK);
      setTopProducts(MOCK_TOP_PRODUCTS);
      setActivities(MOCK_INV_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const res = await fetch(`/api/hq/inventory/enhanced?action=kpis&industry=${industry}`);
      if (res.ok) { const d = await res.json(); setIndustryKpis(d.data?.kpis || []); }
    } catch (e) { console.error('Error fetching KPIs:', e); }
  };

  const fetchForecast = async () => {
    try {
      const res = await fetch('/api/hq/inventory/enhanced?action=forecast');
      if (res.ok) { const d = await res.json(); setForecast(d.data?.forecast || []); }
    } catch (e) { console.error('Error fetching forecast:', e); }
  };

  const fetchABC = async () => {
    try {
      const res = await fetch('/api/hq/inventory/enhanced?action=abc-analysis');
      if (res.ok) { const d = await res.json(); setAbcAnalysis(d.data || null); }
    } catch (e) { console.error('Error fetching ABC:', e); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = branchStock.map(b => `${b.name},${b.code},${b.totalProducts},${b.totalStock},${b.stockValue},${b.lowStock},${b.outOfStock}`);
      const csv = `Branch,Code,Products,Stock,Value,LowStock,OutOfStock\n${rows.join('\n')}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `inventory-${selectedPeriod}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(t('inventory.exportSuccess'));
    } catch { toast.error(t('inventory.exportFailed')); }
    setExporting(false);
  };
  
  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (mounted) fetchData();
  }, [industry]);

  useEffect(() => {
    if (subTab === 'kpis') fetchKPIs();
    else if (subTab === 'forecast') fetchForecast();
    else if (subTab === 'abc') fetchABC();
  }, [subTab, industry]);

  if (!mounted) return (
    <HQLayout>
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </HQLayout>
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const formatNumber = (value: number) => value.toLocaleString('id-ID');

  const stockTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: ['#3B82F6', '#10B981'],
    xaxis: { categories: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (val) => formatNumber(val) } },
    legend: { position: 'top' },
    dataLabels: { enabled: false }
  };

  const stockTrendSeries = [
    { name: 'Stock In', data: [1200, 980, 1500, 1100, 1350, 800, 950] },
    { name: 'Stock Out', data: [850, 1100, 900, 1200, 1000, 600, 750] }
  ];

  const categoryStockOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: ['Bahan Pokok', 'Minuman', 'Snack', 'Frozen', 'Non-Food'],
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` }
  };

  const categoryStockSeries = [35, 25, 20, 12, 8];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transfer': return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'receipt': return <Package className="w-4 h-4 text-green-600" />;
      case 'adjustment': return <Settings className="w-4 h-4 text-orange-600" />;
      case 'return': return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'stocktake': return <FileText className="w-4 h-4 text-purple-600" />;
      default: return <Box className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />Synced</span>;
      case 'pending': return <span className="flex items-center gap-1 text-xs text-yellow-600"><Clock className="w-3 h-3" />Pending</span>;
      case 'error': return <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3 h-3" />Error</span>;
      default: return null;
    }
  };

  const getMovementBadge = (movement: string) => {
    switch (movement) {
      case 'fast': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('inventory.fastMoving')}</span>;
      case 'medium': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{t('inventory.medium')}</span>;
      case 'slow': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{t('inventory.slowMoving')}</span>;
      default: return null;
    }
  };

  const quickLinks = [
    { icon: Package, label: t('inventory.qlGlobalStock'), href: '/hq/inventory/stock', color: 'bg-blue-500' },
    { icon: Box, label: t('inventory.qlCategories'), href: '/hq/inventory/categories', color: 'bg-teal-500' },
    { icon: BarChart3, label: t('inventory.qlPricing'), href: '/hq/inventory/pricing', color: 'bg-emerald-500' },
    { icon: ArrowRightLeft, label: t('inventory.qlTransfers'), href: '/hq/inventory/transfers', color: 'bg-purple-500' },
    { icon: Bell, label: t('inventory.qlAlerts'), href: '/hq/inventory/alerts', color: 'bg-orange-500' },
    { icon: FileText, label: t('inventory.qlStocktake'), href: '/hq/inventory/stocktake', color: 'bg-green-500' },
    { icon: Truck, label: t('inventory.qlReceipts'), href: '/hq/inventory/receipts', color: 'bg-indigo-500' },
    { icon: ShoppingCart, label: t('inventory.qlPurchaseOrders'), href: '/hq/purchase-orders', color: 'bg-cyan-500' }
  ];

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
            <p className="text-gray-500">{t('inventory.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {industryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="day">{t('inventory.today')}</option>
              <option value="week">{t('inventory.thisWeek')}</option>
              <option value="month">{t('inventory.thisMonth')}</option>
            </select>
            <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('inventory.sync')}
            </button>
            <Link href="/hq/inventory/smart-warehouse" className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm">
              <Zap className="w-4 h-4" /> {t('inventory.smartWarehouse')}
            </Link>
            <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
              <Download className="w-4 h-4" /> {exporting ? t('inventory.exporting') : t('inventory.export')}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link, idx) => (
            <Link key={idx} href={link.href} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className={`w-9 h-9 ${link.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <link.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { v: 'overview' as const, l: t('inventory.tabOverview'), icon: BarChart3 },
            { v: 'kpis' as const, l: t('inventory.tabKpis'), icon: Target },
            { v: 'forecast' as const, l: t('inventory.tabForecast'), icon: Activity },
            { v: 'abc' as const, l: t('inventory.tabAbc'), icon: Layers },
          ]).map(tb => (
            <button key={tb.v} onClick={() => setSubTab(tb.v)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${subTab === tb.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <tb.icon className="w-4 h-4" />{tb.l}
            </button>
          ))}
        </div>

        {subTab === 'overview' && (<>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+5.2%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalProducts)}</p>
            <p className="text-sm text-gray-500">{t('inventory.totalProducts')}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Box className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />+12.8%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalStock)}</p>
            <p className="text-sm text-gray-500">{t('inventory.totalStockUnits')}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
            <p className="text-sm text-gray-500">{t('inventory.stockValue')}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <Link href="/hq/inventory/alerts" className="text-xs text-blue-600 hover:underline">{t('inventory.viewAll')}</Link>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.lowStockItems + summary.outOfStockItems}</p>
            <p className="text-sm text-gray-500">{t('inventory.itemsNeedAttention')}</p>
          </div>
        </div>

        {/* Alert Banner */}
        {(summary.outOfStockItems > 0 || summary.lowStockItems > 10) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">{t('inventory.alertCriticalTitle')}</p>
                <p className="text-sm text-red-600">{t('inventory.alertCriticalDesc', { outOfStock: summary.outOfStockItems, lowStock: summary.lowStockItems })}</p>
              </div>
            </div>
            <Link href="/hq/inventory/alerts" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              {t('inventory.reviewNow')}
            </Link>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t('inventory.stockMovementTrend')}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span>{t('inventory.stockIn')}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span>{t('inventory.stockOut')}</span>
              </div>
            </div>
            <Chart options={stockTrendOptions} series={stockTrendSeries} type="area" height={280} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.stockDistByCategory')}</h3>
            <Chart options={categoryStockOptions} series={categoryStockSeries} type="donut" height={280} />
          </div>
        </div>

        {/* Branch Stock Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('inventory.stockPerBranch')}</h3>
            <Link href="/hq/inventory/stock" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              {t('inventory.viewDetail')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.branch')}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.products')}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.totalStock')}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.stockValue')}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.lowStock')}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.outOfStock')}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.syncStatus')}</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branchStock.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {branch.code.startsWith('WH') ? <Warehouse className="w-4 h-4 text-gray-600" /> : <Building2 className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{branch.name}</p>
                          <p className="text-xs text-gray-500">{branch.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatNumber(branch.totalProducts)}</td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">{formatNumber(branch.totalStock)}</td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(branch.stockValue)}</td>
                    <td className="px-5 py-4 text-center">
                      {branch.lowStock > 0 ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{branch.lowStock}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {branch.outOfStock > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{branch.outOfStock}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-center">
                        {getStatusBadge(branch.status)}
                        <span className="text-xs text-gray-400 mt-1">{branch.lastSync}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Link href={`/hq/inventory/stock?branch=${branch.code}`} className="p-2 hover:bg-gray-100 rounded-lg inline-flex">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t('inventory.topProducts')}</h3>
              <Link href="/hq/inventory/stock" className="text-sm text-blue-600 hover:underline">{t('inventory.viewAllLink')}</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {topProducts.map((product) => (
                <div key={product.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku} • {product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatNumber(product.totalStock)} {t('inventory.unit')}</p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      {getMovementBadge(product.movement)}
                      <span className={`text-xs flex items-center gap-1 ${product.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(product.trend)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t('inventory.recentActivities')}</h3>
              <button className="text-sm text-blue-600 hover:underline">{t('inventory.viewAllLink')}</button>
            </div>
            <div className="divide-y divide-gray-100">
              {activities.map((activity) => (
                <div key={activity.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.branch} • {activity.user}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${activity.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.quantity >= 0 ? '+' : ''}{formatNumber(activity.quantity)}
                    </p>
                    <p className="text-xs text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/hq/inventory/transfers" className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">{t('inventory.transferPending')}</p>
                <p className="text-3xl font-bold mt-1">{summary.pendingTransfers}</p>
                <p className="text-purple-200 text-sm mt-2">{t('inventory.transferPendingDesc')}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-8 h-8" />
              </div>
            </div>
          </Link>

          <Link href="/hq/purchase-orders" className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm">{t('inventory.poPending')}</p>
                <p className="text-3xl font-bold mt-1">{summary.pendingOrders}</p>
                <p className="text-cyan-200 text-sm mt-2">{t('inventory.poPendingDesc')}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-8 h-8" />
              </div>
            </div>
          </Link>
        </div>

        {/* Enhanced KPI Cards from Enhanced API */}
        {enhancedData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><RotateCcw className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">{t('inventory.inventoryTurnover')}</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.inventoryTurnover}x</p>
              <p className="text-xs text-gray-400">{t('inventory.perYear')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">{t('inventory.daysOnHand')}</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.daysOnHand}</p>
              <p className="text-xs text-gray-400">{t('inventory.avgHoldingPeriod')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-500">{t('inventory.fillRate')}</span></div>
              <p className="text-xl font-bold text-gray-900">{enhancedData.summary.fillRate}%</p>
              <p className="text-xs text-gray-400">{t('inventory.orderFulfillment')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-500">{t('inventory.deadStock')}</span></div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(enhancedData.summary.deadStockValue)}</p>
              <p className="text-xs text-gray-400">{t('inventory.deadStockDesc')}</p>
            </div>
          </div>
        )}

        {/* Warehouse Health */}
        {enhancedData?.warehouseHealth && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Thermometer className="w-5 h-5 text-blue-600" />{t('inventory.warehouseHealth')}</h3>
            <div className="grid grid-cols-3 gap-4">
              {enhancedData.warehouseHealth.map((wh: any) => (
                <div key={wh.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{wh.name}</p>
                      <p className="text-xs text-gray-500">{wh.code}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${wh.score >= 90 ? 'bg-green-100 text-green-700' : wh.score >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      Score: {wh.score}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">{t('inventory.capacity')}</span><span className="font-medium">{wh.capacity}%</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${wh.capacity > 90 ? 'bg-red-500' : wh.capacity > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${wh.capacity}%` }} /></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">{t('inventory.temp')}</span><span className="font-medium">{wh.temperature}°C</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">{t('inventory.humidity')}</span><span className="font-medium">{wh.humidity}%</span></div>
                    {wh.issues > 0 && <p className="text-xs text-red-600 font-medium">{t('inventory.issuesDetected', { count: wh.issues })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reorder Suggestions */}
        {enhancedData?.reorderSuggestions && enhancedData.reorderSuggestions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-600" />{t('inventory.aiReorderSuggestions')}</h3>
              <span className="text-xs text-gray-500">{t('inventory.itemsNeedReorder', { count: enhancedData.reorderSuggestions.length })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.product')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.current')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.reorderPoint')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.suggestedQty')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.supplier')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.leadTime')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.urgency')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enhancedData.reorderSuggestions.map((item: any) => (
                    <tr key={item.productId} className="hover:bg-gray-50">
                      <td className="px-5 py-3"><p className="font-medium text-gray-900">{item.name}</p><p className="text-xs text-gray-500">{item.sku}</p></td>
                      <td className="px-5 py-3 text-right font-medium text-red-600">{formatNumber(item.currentStock)}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{formatNumber(item.reorderPoint)}</td>
                      <td className="px-5 py-3 text-right font-bold text-blue-600">{formatNumber(item.suggestedQty)}</td>
                      <td className="px-5 py-3 text-gray-600 text-sm">{item.supplier}</td>
                      <td className="px-5 py-3 text-center text-sm">{item.leadTimeDays}d</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.urgency === 'high' ? 'bg-red-100 text-red-700' : item.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>)}

        {/* ─── Industry KPIs Tab ─── */}
        {subTab === 'kpis' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm text-indigo-700"><strong>{t('inventory.industryKpisHeading', { label: industryLabel(industry) })}</strong>: {t('inventory.industryKpiDesc')}</p>
            </div>
            {industryKpis.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {industryKpis.map((kpi: any) => {
                  const isLowerBetter = kpi.key?.includes('waste') || kpi.key?.includes('shrinkage') || kpi.key?.includes('scrap') || kpi.key?.includes('expiry') || kpi.key?.includes('damage') || kpi.key?.includes('dead') || kpi.key?.includes('backorder') || kpi.key?.includes('return');
                  const isGood = isLowerBetter ? kpi.actual <= kpi.target : kpi.actual >= kpi.target;
                  return (
                    <div key={kpi.key} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">{kpi.label}</p>
                        <span className={`text-xs font-medium flex items-center gap-1 ${kpi.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {kpi.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(kpi.trend)}%
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{kpi.actual}{kpi.unit === '%' || kpi.unit === 'x' ? kpi.unit : ''}</p>
                      {kpi.unit !== '%' && kpi.unit !== 'x' && <p className="text-xs text-gray-400">{kpi.unit}</p>}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Target: {kpi.target}{kpi.unit === '%' || kpi.unit === 'x' ? kpi.unit : ` ${kpi.unit}`}</span>
                        <span className={`font-medium px-2 py-0.5 rounded-full ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isGood ? t('inventory.onTarget') : t('inventory.belowTarget')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((kpi.actual / kpi.target) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('inventory.loadingKpis')}</div>
            )}
          </div>
        )}

        {/* ─── Forecast & Reorder Tab ─── */}
        {subTab === 'forecast' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-700"><strong>{t('inventory.tabForecast')}</strong>: {t('inventory.forecastDesc')}</p>
            </div>
            {forecast.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.stockDepletionForecast')}</h3>
                  <Chart
                    options={{
                      chart: { type: 'line', toolbar: { show: false } },
                      stroke: { curve: 'smooth', width: 2 },
                      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                      xaxis: { categories: forecast[0]?.projectedWeekly?.map((w: any) => w.week) || [] },
                      yaxis: { labels: { formatter: (v: number) => formatNumber(v) } },
                      legend: { position: 'top' },
                    }}
                    series={forecast.map((p: any) => ({
                      name: p.name,
                      data: p.projectedWeekly?.map((w: any) => w.projected) || [],
                    }))}
                    type="line"
                    height={350}
                  />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">{t('inventory.reorderSchedule')}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.product')}</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.currentStock')}</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.avgDailySales')}</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('inventory.daysUntilStockout')}</th>
                          <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.reorderDate')}</th>
                          <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('inventory.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {forecast.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-5 py-3"><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-500">{p.sku}</p></td>
                            <td className="px-5 py-3 text-right font-medium">{formatNumber(p.currentStock)}</td>
                            <td className="px-5 py-3 text-right text-gray-600">{p.avgDailySales}/day</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`font-bold ${p.daysUntilStockout < 7 ? 'text-red-600' : p.daysUntilStockout < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {p.daysUntilStockout} days
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-sm">{p.reorderDate}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'critical' ? 'bg-red-100 text-red-700' : p.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('inventory.loadingForecast')}</div>
            )}
          </div>
        )}

        {/* ─── ABC Analysis Tab ─── */}
        {subTab === 'abc' && (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-sm text-teal-700"><strong>{t('inventory.tabAbc')}</strong>: {t('inventory.abcDesc')}</p>
            </div>
            {abcAnalysis ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {abcAnalysis.categories?.map((cat: any) => (
                    <div key={cat.class} className={`rounded-xl border-2 p-5 ${cat.class === 'A' ? 'border-blue-300 bg-blue-50' : cat.class === 'B' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-4xl font-black ${cat.class === 'A' ? 'text-blue-600' : cat.class === 'B' ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {cat.class}
                        </span>
                        <span className="text-xs text-gray-500">{cat.valuePct}% of total value</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatNumber(cat.items)} {t('inventory.items')}</p>
                      <p className="text-sm text-gray-600 mt-1">{formatCurrency(cat.stockValue)}</p>
                      <p className="text-xs text-gray-500 mt-2">{t('inventory.avgTurnover')}: {cat.avgTurnover}x</p>
                      <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.valueDistribution')}</h3>
                    <Chart
                      options={{
                        chart: { type: 'donut' },
                        labels: ['Class A (70%)', 'Class B (20%)', 'Class C (10%)'],
                        colors: ['#3B82F6', '#F59E0B', '#9CA3AF'],
                        legend: { position: 'bottom' },
                        dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%` },
                      }}
                      series={[70, 20, 10]}
                      type="donut"
                      height={300}
                    />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">{t('inventory.itemsDistribution')}</h3>
                    <Chart
                      options={{
                        chart: { type: 'bar', toolbar: { show: false } },
                        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
                        colors: ['#3B82F6', '#F59E0B', '#9CA3AF'],
                        xaxis: { categories: ['Class A', 'Class B', 'Class C'] },
                        yaxis: { labels: { formatter: (v: number) => formatNumber(v) } },
                        legend: { show: false },
                        dataLabels: { enabled: true },
                      }}
                      series={[{ name: 'Items', data: abcAnalysis.categories?.map((c: any) => c.items) || [] }]}
                      type="bar"
                      height={300}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('inventory.loadingAbc')}</div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
