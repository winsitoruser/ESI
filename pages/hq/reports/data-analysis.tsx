import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  BarChart3, RefreshCw, Download, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Zap,
  Activity, Target, Lightbulb, Search, Clock, ShoppingCart,
  Package, DollarSign, Users, Eye, Brain
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, ComposedChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function DataAnalysisReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'sales' | 'inventory' | 'financial' | 'insights'>('sales');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/reports/comprehensive?section=data-analysis');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching data analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  if (!mounted || loading || !data) {
    return (
      <HQLayout title="Olah Data & Analisis" subtitle="Data analytics & business intelligence">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const { salesAnalysis, inventoryAnalysis, financialAnalysis, anomalies, insights } = data;

  const exportAnalysis = () => {
    const lines = ['Section,Metric,Value'];
    salesAnalysis.peakHours.forEach((h: any) => {
      lines.push(`Peak Hours,${h.hour},${h.revenue}`);
    });
    salesAnalysis.dayOfWeekAnalysis.forEach((d: any) => {
      lines.push(`Day Analysis,${d.day},${d.avgRevenue}`);
    });
    inventoryAnalysis.abcClassification.forEach((a: any) => {
      lines.push(`ABC Classification,${a.category},${a.valueContribution}%`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export analisis data berhasil');
  };

  const abcPieData = inventoryAnalysis.abcClassification.map((a: any, i: number) => ({
    name: a.category, value: a.valueContribution, items: a.items, color: COLORS[i]
  }));

  const profitRadarData = financialAnalysis.profitabilityByCategory.map((c: any) => ({
    category: c.category.length > 10 ? c.category.substring(0, 10) + '...' : c.category,
    margin: c.margin, roi: c.roi
  }));

  return (
    <HQLayout title="Olah Data & Analisis" subtitle="Data analytics & business intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { v: 'sales' as const, l: 'Analisis Penjualan', icon: ShoppingCart },
              { v: 'inventory' as const, l: 'Analisis Inventori', icon: Package },
              { v: 'financial' as const, l: 'Analisis Keuangan', icon: DollarSign },
              { v: 'insights' as const, l: 'Insights & Anomali', icon: Lightbulb },
            ]).map(t => (
              <button key={t.v} onClick={() => setSubTab(t.v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${subTab === t.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <t.icon className="w-4 h-4" />{t.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportAnalysis} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* ─── Sales Analysis ─── */}
        {subTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
              <p className="text-sm text-cyan-700"><strong>Analisis Penjualan</strong>: Pola jam sibuk, analisis hari, dan korelasi produk untuk optimasi strategi penjualan.</p>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Pola Jam Sibuk (Peak Hours)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesAnalysis.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number, n: string) => [n === 'Revenue' ? formatCurrency(v) : v, n]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transaksi" stroke="#F59E0B" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day of Week Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Analisis per Hari</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesAnalysis.dayOfWeekAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number, n: string) => [n === 'Revenue' ? formatCurrency(v) : v, n]} />
                    <Legend />
                    <Bar dataKey="avgRevenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {salesAnalysis.dayOfWeekAnalysis.map((d: any) => (
                  <div key={d.day} className={`text-center p-2 rounded-lg ${d.index >= 100 ? 'bg-green-50 border border-green-200' : d.index >= 90 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-xs font-medium text-gray-600">{d.day}</p>
                    <p className={`text-lg font-bold ${d.index >= 100 ? 'text-green-600' : d.index >= 90 ? 'text-blue-600' : 'text-gray-600'}`}>{d.index}</p>
                    <p className="text-xs text-gray-400">Index</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Correlation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Korelasi Produk (Cross-Selling)</h3>
                <p className="text-sm text-gray-500 mt-1">Produk yang sering dibeli bersamaan</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Produk A</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">+</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Produk B</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Korelasi</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Frekuensi</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody>
                  {salesAnalysis.productCorrelation.map((pc: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{pc.productA}</td>
                      <td className="py-3 px-4 text-center text-gray-400">↔</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{pc.productB}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pc.correlation >= 0.8 ? 'bg-green-500' : pc.correlation >= 0.7 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                              style={{ width: `${pc.correlation * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium">{(pc.correlation * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">{pc.frequency.toLocaleString()}x</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pc.correlation >= 0.8 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {pc.correlation >= 0.8 ? 'Bundle Promo' : 'Cross-Sell'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Inventory Analysis ─── */}
        {subTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-700"><strong>Analisis Inventori</strong>: Klasifikasi ABC, analisis turnover, dan prediksi demand untuk manajemen stok optimal.</p>
            </div>

            {/* ABC Classification */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Klasifikasi ABC</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={abcPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                        label={({ name, value }: any) => `${name.split(' ')[0]} ${value}%`}
                      >
                        {abcPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string, p: any) => [`${v}% value, ${p.payload.items} items`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Detail Klasifikasi</h3>
                <div className="space-y-4">
                  {inventoryAnalysis.abcClassification.map((a: any, i: number) => (
                    <div key={a.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <div>
                          <p className="font-medium text-gray-900">{a.category}</p>
                          <p className="text-sm text-gray-500">{a.items} produk ({a.percentage}% total)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{a.valueContribution}%</p>
                        <p className="text-xs text-gray-500">kontribusi nilai</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Turnover Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Analisis Turnover</h3>
              </div>
              <div className="grid grid-cols-4 gap-4 p-4">
                {inventoryAnalysis.turnoverAnalysis.map((t: any) => (
                  <div key={t.category} className={`p-4 rounded-xl border ${
                    t.category === 'Fast Moving' ? 'bg-green-50 border-green-200' :
                    t.category === 'Medium Moving' ? 'bg-blue-50 border-blue-200' :
                    t.category === 'Slow Moving' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <p className="font-semibold text-gray-900">{t.category}</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Items</span>
                        <span className="font-medium">{t.items}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Turnover</span>
                        <span className="font-medium">{t.avgTurnover}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Days on Hand</span>
                        <span className="font-medium">{t.daysOnHand}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand Forecast */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Prediksi Demand 3 Bulan</h3>
              <div className="grid grid-cols-3 gap-4">
                {inventoryAnalysis.demandForecast.map((f: any) => (
                  <div key={f.month} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">{f.month} 2026</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.confidence >= 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {f.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(f.predictedDemand)}</p>
                    <p className="text-sm text-gray-500 mt-1">Predicted Demand</p>
                    <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Financial Analysis ─── */}
        {subTab === 'financial' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700"><strong>Analisis Keuangan</strong>: Profitabilitas per kategori, proyeksi cash flow, dan break-even analysis.</p>
            </div>

            {/* Profitability by Category */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Margin & ROI per Kategori</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={profitRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 50]} />
                      <Radar name="Margin %" dataKey="margin" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                      <Radar name="ROI %" dataKey="roi" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Profitabilitas per Kategori</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Kategori</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">Cost</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">Margin</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialAnalysis.profitabilityByCategory.map((c: any) => (
                      <tr key={c.category} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm font-medium text-gray-900">{c.category}</td>
                        <td className="py-2 px-3 text-right text-sm">{formatCurrency(c.revenue)}</td>
                        <td className="py-2 px-3 text-right text-sm text-gray-500">{formatCurrency(c.cost)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.margin >= 25 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {c.margin}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-sm font-medium text-green-600">{c.roi}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash Flow Projection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Proyeksi Cash Flow (Miliar)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialAnalysis.cashFlowProjection.map((c: any) => ({
                    ...c,
                    inflowB: c.inflow / 1000000000,
                    outflowB: c.outflow / 1000000000,
                    netB: c.netCashFlow / 1000000000,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`Rp ${v.toFixed(2)}M`, '']} />
                    <Legend />
                    <Bar dataKey="inflowB" name="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflowB" name="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="netB" name="Net Cash Flow" stroke="#3B82F6" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Break-Even Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Break-Even Analysis</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Fixed Costs', value: formatCurrency(financialAnalysis.breakEvenAnalysis.fixedCosts), color: 'text-red-600' },
                  { label: 'Variable Cost Ratio', value: `${(financialAnalysis.breakEvenAnalysis.variableCostRatio * 100).toFixed(0)}%`, color: 'text-orange-600' },
                  { label: 'Break-Even Revenue', value: formatCurrency(financialAnalysis.breakEvenAnalysis.breakEvenRevenue), color: 'text-yellow-600' },
                  { label: 'Current Revenue', value: formatCurrency(financialAnalysis.breakEvenAnalysis.currentRevenue), color: 'text-green-600' },
                  { label: 'Safety Margin', value: `${financialAnalysis.breakEvenAnalysis.safetyMargin}%`, color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    <strong>Status: Aman</strong> — Revenue saat ini {formatCurrency(financialAnalysis.breakEvenAnalysis.currentRevenue)} berada {financialAnalysis.breakEvenAnalysis.safetyMargin}% di atas break-even point {formatCurrency(financialAnalysis.breakEvenAnalysis.breakEvenRevenue)}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Insights & Anomali ─── */}
        {subTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-700"><strong>AI Insights & Anomali</strong>: Temuan otomatis, rekomendasi aksi, dan deteksi anomali dari seluruh data ERP.</p>
            </div>

            {/* Anomalies */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" /> Anomali Terdeteksi
                </h3>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  {anomalies.length} anomali
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {anomalies.map((a: any) => (
                  <div key={a.id} className={`p-4 flex items-start gap-4 ${
                    a.severity === 'high' ? 'bg-red-50/50' : a.severity === 'medium' ? 'bg-yellow-50/50' : ''
                  }`}>
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      a.severity === 'high' ? 'bg-red-100' : a.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.severity === 'high' ? 'bg-red-100 text-red-700' : a.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {a.severity}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{a.module}</span>
                        <span className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-sm text-gray-700">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" /> Business Insights
                </h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {insights.length} insights
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {insights.map((ins: any) => {
                  const categoryIcons: Record<string, any> = {
                    opportunity: { icon: Zap, bg: 'bg-green-100', text: 'text-green-600', label: 'Opportunity' },
                    optimization: { icon: Target, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Optimization' },
                    warning: { icon: AlertTriangle, bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Warning' },
                    trend: { icon: TrendingUp, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Trend' },
                    prediction: { icon: Activity, bg: 'bg-cyan-100', text: 'text-cyan-600', label: 'Prediction' },
                  };
                  const cat = categoryIcons[ins.category] || categoryIcons.opportunity;
                  const CatIcon = cat.icon;
                  return (
                    <div key={ins.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${cat.bg}`}>
                        <CatIcon className={`w-5 h-5 ${cat.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.text}`}>
                            {cat.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            ins.impact === 'high' ? 'bg-red-100 text-red-700' : ins.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {ins.impact} impact
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">{ins.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{ins.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Olah Data & Business Intelligence</h3>
              <p className="text-cyan-100 text-sm">
                Analisis komprehensif dari seluruh data ERP. {insights.length} insights ditemukan, {anomalies.length} anomali terdeteksi.
                Safety margin break-even: {financialAnalysis.breakEvenAnalysis.safetyMargin}%.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{insights.length}</p>
                <p className="text-xs text-cyan-200">Insights</p>
              </div>
              <div className="w-px h-10 bg-white/30" />
              <div className="text-center">
                <p className="text-2xl font-bold">{anomalies.length}</p>
                <p className="text-xs text-cyan-200">Anomali</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
