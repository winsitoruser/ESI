import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Truck, RefreshCw, Download, ShoppingCart, DollarSign, Clock,
  TrendingUp, ArrowUpRight, ArrowDownRight, Building2, Package,
  CheckCircle, AlertTriangle, Star, FileText, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ProcurementReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'overview' | 'suppliers' | 'spend' | 'deliveries'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/reports/comprehensive?section=procurement');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching procurement report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  if (!mounted || loading || !data) {
    return (
      <HQLayout title="Laporan Pengadaan" subtitle="Analisis pembelian & supplier">
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

  const { summary, topSuppliers, categorySpend, spendTrend, pendingDeliveries } = data;

  const exportToCSV = () => {
    const lines = ['Supplier,Total PO,Total Value,On-Time Rate,Rating'];
    topSuppliers.forEach((s: any) => {
      lines.push(`${s.name},${s.totalPO},${s.totalValue},${s.onTimeRate}%,${s.rating}`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export laporan pengadaan berhasil');
  };

  const categoryPieData = categorySpend.map((c: any, i: number) => ({
    name: c.category, value: c.percentage, spend: c.spend, color: COLORS[i % COLORS.length]
  }));

  return (
    <HQLayout title="Laporan Pengadaan" subtitle="Analisis pembelian & supplier">
      <div className="space-y-6">
        {/* Sub-Tabs & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { v: 'overview' as const, l: 'Overview', icon: Truck },
              { v: 'suppliers' as const, l: 'Suppliers', icon: Building2 },
              { v: 'spend' as const, l: 'Spend Analysis', icon: DollarSign },
              { v: 'deliveries' as const, l: 'Deliveries', icon: Package },
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
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* ─── Overview ─── */}
        {subTab === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 opacity-80" />
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{summary.activePOs} aktif</span>
                </div>
                <p className="text-3xl font-bold">{summary.totalPOs}</p>
                <p className="text-indigo-100 mt-1">Total PO</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(summary.totalSpend)}</p>
                <p className="text-green-100 mt-1">Total Spend</p>
                <p className="text-sm text-green-200">MTD: {formatCurrency(summary.spendMTD)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="w-8 h-8 opacity-80" />
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{summary.onTimeDelivery}%</span>
                </div>
                <p className="text-3xl font-bold">{summary.onTimeDelivery}%</p>
                <p className="text-blue-100 mt-1">On-Time Delivery</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(summary.costSavings)}</p>
                <p className="text-emerald-100 mt-1">Cost Savings</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Completed PO', value: summary.completedPOs, color: 'text-green-600' },
                { label: 'Active PO', value: summary.activePOs, color: 'text-blue-600' },
                { label: 'Cancelled PO', value: summary.cancelledPOs, color: 'text-red-600' },
                { label: 'Active Suppliers', value: summary.activeSuppliers, color: 'text-purple-600' },
                { label: 'Avg Lead Time', value: `${summary.avgLeadTime} hari`, color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Spend Trend & Savings (Juta)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={spendTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`Rp ${v} Jt`, '']} />
                      <Legend />
                      <Bar dataKey="spend" name="Spend" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="savings" name="Savings" stroke="#10B981" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Distribusi Spend per Kategori</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                        label={({ name, value }: any) => `${name} ${value}%`}
                      >
                        {categoryPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string, p: any) => [`${v}% - ${formatCurrency(p.payload.spend)}`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Suppliers Tab ─── */}
        {subTab === 'suppliers' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Suppliers</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-center py-3 px-4 font-medium text-gray-500 w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Supplier</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Total PO</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Value</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">On-Time %</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Rating</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s: any, idx: number) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-center">
                      {idx < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-gray-500">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{s.totalPO}</td>
                    <td className="py-3 px-4 text-right font-medium text-green-600">{formatCurrency(s.totalValue)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.onTimeRate >= 93 ? 'bg-green-100 text-green-800' : s.onTimeRate >= 90 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {s.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{s.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Spend Analysis Tab ─── */}
        {subTab === 'spend' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Spend per Kategori</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Kategori</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Total Spend</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">% Kontribusi</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Jumlah PO</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Avg per PO</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySpend.map((c: any) => (
                    <tr key={c.category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Package className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{c.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(c.spend)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.percentage}%` }} />
                          </div>
                          <span className="text-sm text-gray-600">{c.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{c.poCount}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(Math.round(c.spend / c.poCount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(categorySpend.reduce((s: number, c: any) => s + c.spend, 0))}</td>
                    <td className="py-3 px-4 text-center">100%</td>
                    <td className="py-3 px-4 text-center">{categorySpend.reduce((s: number, c: any) => s + c.poCount, 0)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(Math.round(categorySpend.reduce((s: number, c: any) => s + c.spend, 0) / categorySpend.reduce((s: number, c: any) => s + c.poCount, 0)))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ─── Deliveries Tab ─── */}
        {subTab === 'deliveries' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800 font-medium">{pendingDeliveries.length} pengiriman sedang dalam perjalanan</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Pending Deliveries</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">No. PO</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Supplier</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Items</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Nilai</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">ETA</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeliveries.map((d: any) => (
                    <tr key={d.poNumber} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-blue-600">{d.poNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Truck className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900">{d.supplier}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{d.items}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(d.value)}</td>
                      <td className="py-3 px-4 text-center text-sm">
                        {new Date(d.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 justify-center w-fit mx-auto">
                          <Clock className="w-3 h-3" /> In Transit
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ringkasan Pengadaan</h3>
              <p className="text-indigo-100">
                Total spend {formatCurrency(summary.totalSpend)} dari {summary.totalPOs} PO.
                On-time delivery rate {summary.onTimeDelivery}% dengan {summary.activeSuppliers} supplier aktif.
                Cost savings: {formatCurrency(summary.costSavings)}.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{summary.fulfillmentRate}%</p>
                <p className="text-sm text-indigo-200">Fulfillment</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
