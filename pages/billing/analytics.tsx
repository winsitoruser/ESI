import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Store, 
  Receipt,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface UsageAnalytics {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    users: {
      current: number;
      limit: number;
      percentage: number;
      trend: number;
    };
    branches: {
      current: number;
      limit: number;
      percentage: number;
      trend: number;
    };
    products: {
      current: number;
      limit: number;
      percentage: number;
      trend: number;
    };
    transactions: {
      current: number;
      limit: number;
      percentage: number;
      trend: number;
    };
  };
  dailyUsage: Array<{
    date: string;
    users: number;
    transactions: number;
    products: number;
  }>;
  topUsage: Array<{
    metric: string;
    value: number;
    percentage: number;
  }>;
  predictions: {
    nextMonth: {
      users: number;
      transactions: number;
      products: number;
    };
    recommendations: Array<{
      type: 'upgrade' | 'optimize' | 'warning';
      message: string;
      metric: string;
    }>;
  };
}

const BillingAnalyticsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const MOCK_ANALYTICS: UsageAnalytics = { period: { start: '2026-03-01', end: '2026-03-31' }, metrics: { users: { current: 45, limit: 200, percentage: 22.5, trend: 5.2 }, branches: { current: 6, limit: 50, percentage: 12, trend: 0 }, products: { current: 2450, limit: 10000, percentage: 24.5, trend: 3.1 }, transactions: { current: 18420, limit: 100000, percentage: 18.4, trend: 12.8 } }, dailyUsage: [{ date: '2026-03-13', users: 42, transactions: 620, products: 2440 }, { date: '2026-03-14', users: 44, transactions: 580, products: 2445 }, { date: '2026-03-15', users: 45, transactions: 650, products: 2450 }], topUsage: [{ metric: 'transactions', value: 18420, percentage: 18.4 }, { metric: 'products', value: 2450, percentage: 24.5 }], predictions: { nextMonth: { users: 48, transactions: 21000, products: 2600 }, recommendations: [{ type: 'optimize', message: 'Pertimbangkan arsip produk tidak aktif', metric: 'products' }] } };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageAnalytics | null>(MOCK_ANALYTICS);
  const [period, setPeriod] = useState('current_month');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, period]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/billing/analytics?period=${period}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData(MOCK_ANALYTICS);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const exportAnalytics = async () => {
    try {
      const res = await fetch(`/api/billing/analytics/export?period=${period}`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-analytics-${period}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const getMetricIcon = (metric: string) => {
    const iconMap: Record<string, any> = {
      users: <Users className="w-5 h-5" />,
      branches: <Store className="w-5 h-5" />,
      products: <Package className="w-5 h-5" />,
      transactions: <Receipt className="w-5 h-5" />
    };
    return iconMap[metric] || <Activity className="w-5 h-5" />;
  };

  const getMetricLabel = (metric: string) => {
    const labelMap: Record<string, string> = {
      users: 'Pengguna',
      branches: 'Cabang',
      products: 'Produk',
      transactions: 'Transaksi'
    };
    return labelMap[metric] || metric;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'upgrade':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'optimize':
        return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tidak Ada Data</h3>
          <p className="text-gray-500">Belum ada data penggunaan untuk periode ini</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Analisis Penggunaan</h1>
            <p className="text-gray-500">
              Pantau penggunaan dan prediksi kebutuhan Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Bulan Ini</SelectItem>
                <SelectItem value="last_month">Bulan Lalu</SelectItem>
                <SelectItem value="last_3_months">3 Bulan Terakhir</SelectItem>
                <SelectItem value="last_6_months">6 Bulan Terakhir</SelectItem>
                <SelectItem value="current_year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Period Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                Periode: {new Date(data.period.start).toLocaleDateString('id-ID')} - {' '}
                {new Date(data.period.end).toLocaleDateString('id-ID')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(data.metrics).map(([metric, values]) => (
            <Card key={metric}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  {getMetricIcon(metric)}
                  {getTrendIcon(values.trend)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{values.current}</p>
                <p className="text-sm text-gray-500">
                  dari {values.limit === -1 ? '∞' : values.limit} {getMetricLabel(metric)}
                </p>
                {values.limit !== -1 && (
                  <Progress 
                    value={Math.min(values.percentage, 100)} 
                    className="mt-2"
                  />
                )}
                {values.trend !== 0 && (
                  <p className={`text-xs mt-1 ${
                    values.trend > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {values.trend > 0 ? '+' : ''}{values.trend}% dari periode lalu
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Tren</TabsTrigger>
            <TabsTrigger value="predictions">Prediksi</TabsTrigger>
            <TabsTrigger value="recommendations">Rekomendasi</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Top Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Penggunaan Tertinggi</CardTitle>
                <CardDescription>
                  Metrik dengan penggunaan tertinggi periode ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topUsage.map((item, index) => (
                    <div key={item.metric} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{getMetricLabel(item.metric)}</p>
                          <p className="text-sm text-gray-500">{item.value} penggunaan</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.percentage}%</p>
                        <Progress value={item.percentage} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tren Penggunaan Harian</CardTitle>
                <CardDescription>
                  Grafik penggunaan per hari
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>Grafik akan segera tersedia</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prediksi Bulan Depan</CardTitle>
                <CardDescription>
                  Perkiraan penggunaan berdasarkan tren saat ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(data.predictions.nextMonth).map(([metric, value]) => (
                    <div key={metric} className="text-center p-4 border rounded-lg">
                      {getMetricIcon(metric)}
                      <p className="text-2xl font-bold mt-2">{value}</p>
                      <p className="text-sm text-gray-500">{getMetricLabel(metric)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rekomendasi</CardTitle>
                <CardDescription>
                  Saran berdasarkan pola penggunaan Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.predictions.recommendations.map((rec, index) => (
                    <div key={index} className="flex gap-3 p-4 border rounded-lg">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <p className="font-semibold">{rec.message}</p>
                        <p className="text-sm text-gray-500">
                          Terkait: {getMetricLabel(rec.metric)}
                        </p>
                      </div>
                      {rec.type === 'upgrade' && (
                        <Button size="sm" asChild>
                          <Link href="/billing/plans">
                            Upgrade
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BillingAnalyticsPage;
