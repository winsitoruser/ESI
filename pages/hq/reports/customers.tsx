import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Users, RefreshCw, Download, Search, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Heart, Star, UserPlus, UserMinus,
  Award, ShoppingCart, Building2, Mail
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CustomerReport() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/reports/comprehensive?section=customers');
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (error) {
      console.error('Error fetching customer report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  if (!mounted) {
    return (
      <HQLayout title="Laporan Pelanggan" subtitle="Analisis pelanggan & CRM">
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

  const exportToCSV = () => {
    if (!data) return;
    const lines = ['Segment,Count,Revenue,Avg Spend,Retention'];
    data.segmentation.forEach((s: any) => {
      lines.push(`${s.segment},${s.count},${s.revenue},${s.avgSpend},${s.retention}%`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export laporan pelanggan berhasil');
  };

  if (loading || !data) {
    return (
      <HQLayout title="Laporan Pelanggan" subtitle="Analisis pelanggan & CRM">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  const { summary, segmentation, topCustomers, acquisitionTrend, channelDistribution } = data;

  const channelPieData = channelDistribution.map((c: any, i: number) => ({
    name: c.channel, value: c.percentage, count: c.count, color: COLORS[i % COLORS.length]
  }));

  return (
    <HQLayout title="Laporan Pelanggan" subtitle="Analisis pelanggan & CRM">
      <div className="space-y-6">
        {/* Period & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {p === 'month' ? 'Bulan Ini' : p === 'quarter' ? 'Kuartal' : 'Tahun'}
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

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 opacity-80" />
              <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> +18.9%
              </span>
            </div>
            <p className="text-3xl font-bold">{summary.totalCustomers.toLocaleString()}</p>
            <p className="text-orange-100 mt-1">Total Pelanggan</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <UserPlus className="w-8 h-8 opacity-80" />
              <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" /> +22.5%
              </span>
            </div>
            <p className="text-3xl font-bold">{summary.newCustomers.toLocaleString()}</p>
            <p className="text-green-100 mt-1">Pelanggan Baru</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Heart className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{summary.retentionRate}%</span>
            </div>
            <p className="text-3xl font-bold">{summary.retentionRate}%</p>
            <p className="text-blue-100 mt-1">Retention Rate</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summary.avgCLV)}</p>
            <p className="text-purple-100 mt-1">Avg CLV</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4" /><span className="text-sm">Returning</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.returningCustomers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <UserMinus className="w-4 h-4" /><span className="text-sm">Churned</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.churnedCustomers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Star className="w-4 h-4" /><span className="text-sm">Loyalty Points</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{(summary.totalLoyaltyPoints / 1000000).toFixed(1)}Jt</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <ShoppingCart className="w-4 h-4" /><span className="text-sm">Redemption Rate</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.redemptionRate}%</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Trend Akuisisi Pelanggan</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={acquisitionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="newCustomers" name="Pelanggan Baru" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="churnedCustomers" name="Churned" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                  <Line type="monotone" dataKey="netGrowth" name="Net Growth" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Distribusi Channel</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {channelPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Proporsi']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Segmentation Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Segmentasi Pelanggan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Segmen</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Jumlah</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Avg Spend</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Retention</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {segmentation.map((seg: any) => {
                  const totalRevenue = segmentation.reduce((s: number, x: any) => s + x.revenue, 0);
                  const contribution = ((seg.revenue / totalRevenue) * 100).toFixed(1);
                  return (
                    <tr key={seg.segment} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${seg.segment.includes('VIP') ? 'bg-yellow-100' : seg.segment.includes('Gold') ? 'bg-amber-100' : seg.segment.includes('Silver') ? 'bg-gray-100' : 'bg-blue-100'}`}>
                            <Award className={`w-4 h-4 ${seg.segment.includes('VIP') ? 'text-yellow-600' : seg.segment.includes('Gold') ? 'text-amber-600' : seg.segment.includes('Silver') ? 'text-gray-600' : 'text-blue-600'}`} />
                          </div>
                          <span className="font-medium text-gray-900">{seg.segment}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{seg.count.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(seg.revenue)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(seg.avgSpend)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${seg.retention >= 90 ? 'bg-green-100 text-green-800' : seg.retention >= 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {seg.retention}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${contribution}%` }} />
                          </div>
                          <span className="text-sm text-gray-600">{contribution}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Top Pelanggan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-center py-3 px-4 font-medium text-gray-500 w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Pelanggan</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Tipe</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Belanja</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Transaksi</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Kunjungan Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((cust: any, idx: number) => (
                  <tr key={cust.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                        <div className="p-2 bg-orange-100 rounded-lg">
                          {cust.type === 'Corporate' ? <Building2 className="w-4 h-4 text-orange-600" /> : <Users className="w-4 h-4 text-orange-600" />}
                        </div>
                        <span className="font-medium text-gray-900">{cust.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cust.type === 'Corporate' ? 'bg-blue-100 text-blue-700' : cust.type === 'Reseller' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {cust.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-green-600">{formatCurrency(cust.totalSpend)}</td>
                    <td className="py-3 px-4 text-center">{cust.transactions}</td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {new Date(cust.lastVisit).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Satisfaction Summary */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Ringkasan Kepuasan Pelanggan</h3>
              <p className="text-orange-100">
                Total {summary.totalCustomers.toLocaleString()} pelanggan aktif dengan retention rate {summary.retentionRate}%.
                {summary.newCustomers.toLocaleString()} pelanggan baru bergabung periode ini.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{data.satisfactionScore}</p>
                <p className="text-sm text-orange-200">Satisfaction</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <p className="text-3xl font-bold">+{data.npsScore}</p>
                <p className="text-sm text-orange-200">NPS Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
