import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Clock, Users, 
  BarChart3, PieChart, Calendar, Zap
} from 'lucide-react';

interface ModuleUsageStats {
  moduleCode: string;
  moduleName: string;
  activationCount: number;
  activeUsers: number;
  lastUsed: string;
  usageFrequency: number;
  avgResponseTime: number;
  errorRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface ModuleAnalyticsProps {
  tenantId: string;
}

export default function ModuleAnalytics({ tenantId }: ModuleAnalyticsProps) {
  const [stats, setStats] = useState<ModuleUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/modules/analytics?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Module Analytics</h3>
              <p className="text-sm text-gray-600">Analisa penggunaan dan performa modul</p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7 Hari' : range === '30d' ? '30 Hari' : '90 Hari'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 font-medium">Total Aktivasi</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {stats.reduce((sum, s) => sum + s.activationCount, 0)}
            </p>
            <p className="text-xs text-blue-600 mt-1">Dalam {timeRange}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700 font-medium">Active Users</span>
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">
              {stats.reduce((sum, s) => sum + s.activeUsers, 0)}
            </p>
            <p className="text-xs text-green-600 mt-1">Pengguna aktif</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-700 font-medium">Avg Response</span>
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {stats.length > 0
                ? Math.round(stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / stats.length)
                : 0}ms
            </p>
            <p className="text-xs text-purple-600 mt-1">Response time</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-700 font-medium">Error Rate</span>
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900">
              {stats.length > 0
                ? (stats.reduce((sum, s) => sum + s.errorRate, 0) / stats.length).toFixed(2)
                : 0}%
            </p>
            <p className="text-xs text-amber-600 mt-1">Rata-rata error</p>
          </div>
        </div>
      </div>

      {/* Module Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Module Usage Details</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktivasi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data analitik
                  </td>
                </tr>
              ) : (
                stats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{stat.moduleName}</p>
                        <p className="text-xs text-gray-500">{stat.moduleCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{stat.activationCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-900">{stat.activeUsers}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{stat.usageFrequency}x/day</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        stat.avgResponseTime < 200 ? 'text-green-600' :
                        stat.avgResponseTime < 500 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {stat.avgResponseTime}ms
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        stat.errorRate < 1 ? 'text-green-600' :
                        stat.errorRate < 5 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {stat.errorRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 ${getTrendColor(stat.trend)}`}>
                        {getTrendIcon(stat.trend)}
                        <span className="text-sm font-medium capitalize">{stat.trend}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{new Date(stat.lastUsed).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Module Usage Distribution</h4>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Chart visualization akan ditampilkan di sini</p>
            <p className="text-xs mt-1">Gunakan library seperti Chart.js atau Recharts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
