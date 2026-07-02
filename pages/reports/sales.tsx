import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { 
  DollarSign, TrendingUp, TrendingDown, ShoppingCart,
  Users, Calendar, Download, Filter, RefreshCw,
  BarChart3, PieChart, Clock, FileSpreadsheet, FileText, Wifi, WifiOff
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';
import { useWebSocket } from '@/hooks/useWebSocket';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SalesReportData {
  summary: {
    totalSales: number;
    totalTransactions: number;
    avgTransaction: number;
    uniqueCustomers: number;
    totalDiscounts: number;
    totalTax: number;
  };
  charts: {
    salesTrend: Array<{ period: string; sales: number; transactions: number }>;
    paymentMethods: Array<{ method: string; count: number; total: number }>;
    hourlyDistribution: Array<{ hour: number; transactions: number; sales: number }>;
  };
  topProducts: Array<{
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    orderCount: number;
  }>;
}

const SalesReportPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day',
    branch: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket for real-time updates
  const handleRealtimeUpdate = useCallback((message: any) => {
    if (message.event === 'report:sales:update' || message.event === 'pos:transaction:complete') {
      setLastUpdate(new Date());
      fetchReportData();
    }
  }, []);

  const { isConnected } = useWebSocket({
    branchId: session?.user?.branchId || 'default',
    role: 'reports',
    events: ['report:sales:update', 'pos:transaction:complete'],
    onMessage: handleRealtimeUpdate
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        reportType: 'sales',
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
        ...(filters.branch && { branch: filters.branch })
      });
      
      const response = await fetch(`/api/reports/comprehensive?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
      } else {
        setReportData(getMockData());
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData(getMockData());
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReportData();
    }
  }, [status, fetchReportData]);

  const getMockData = (): SalesReportData => ({
    summary: {
      totalSales: 125000000,
      totalTransactions: 1250,
      avgTransaction: 100000,
      uniqueCustomers: 450,
      totalDiscounts: 5000000,
      totalTax: 12500000
    },
    charts: {
      salesTrend: Array.from({ length: 30 }, (_, i) => ({
        period: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sales: Math.floor(Math.random() * 5000000) + 2000000,
        transactions: Math.floor(Math.random() * 50) + 20
      })),
      paymentMethods: [
        { method: 'Cash', count: 500, total: 50000000 },
        { method: 'Card', count: 400, total: 45000000 },
        { method: 'QRIS', count: 250, total: 20000000 },
        { method: 'E-Wallet', count: 100, total: 10000000 }
      ],
      hourlyDistribution: Array.from({ length: 14 }, (_, i) => ({
        hour: i + 8,
        transactions: Math.floor(Math.random() * 30) + 5,
        sales: Math.floor(Math.random() * 3000000) + 500000
      }))
    },
    topProducts: [
      { name: 'Nasi Goreng Spesial', sku: 'NG001', quantitySold: 250, revenue: 12500000, orderCount: 200 },
      { name: 'Ayam Bakar', sku: 'AB001', quantitySold: 180, revenue: 9000000, orderCount: 150 },
      { name: 'Es Teh Manis', sku: 'ETM01', quantitySold: 350, revenue: 3500000, orderCount: 300 },
      { name: 'Soto Ayam', sku: 'SA001', quantitySold: 120, revenue: 4800000, orderCount: 100 },
      { name: 'Mie Goreng', sku: 'MG001', quantitySold: 150, revenue: 6000000, orderCount: 130 }
    ]
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    
    const data = reportData.topProducts.map(p => ({
      'Produk': p.name,
      'SKU': p.sku,
      'Qty Terjual': p.quantitySold,
      'Revenue': p.revenue,
      'Jumlah Order': p.orderCount
    }));
    
    exportToExcel(data, 'sales-report', 'Laporan Penjualan');
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const data = reportData.topProducts.map(p => ({
      'Produk': p.name,
      'SKU': p.sku,
      'Qty Terjual': p.quantitySold,
      'Revenue': formatCurrency(p.revenue),
      'Jumlah Order': p.orderCount
    }));
    
    exportToPDF(data, {
      title: 'Laporan Penjualan',
      fileName: 'sales-report',
      columns: ['Produk', 'SKU', 'Qty Terjual', 'Revenue', 'Jumlah Order']
    });
  };

  const salesTrendOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    xaxis: { 
      categories: reportData?.charts.salesTrend.map(s => s.period.slice(-5)) || [],
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: { 
      labels: { 
        formatter: (val) => formatCurrency(val).replace('Rp', '').trim()
      }
    },
    colors: ['#0ea5e9'],
    tooltip: { y: { formatter: (val) => formatCurrency(val) } }
  };

  const paymentMethodOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: reportData?.charts.paymentMethods.map(p => p.method) || [],
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '60%' } } }
  };

  const hourlyOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    xaxis: { 
      categories: reportData?.charts.hourlyDistribution.map(h => `${h.hour}:00`) || [],
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: { labels: { formatter: (val) => Math.round(val).toString() } },
    colors: ['#8b5cf6']
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Laporan Penjualan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Laporan Penjualan | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-1.5 bg-gradient-to-b from-green-400 to-emerald-500 rounded-full mr-3"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h1>
              <p className="text-gray-600">Analisis penjualan dan transaksi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" onClick={fetchReportData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <div className="relative group">
              <Button className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={handleExportExcel} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Export Excel
                </button>
                <button onClick={handleExportPDF} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-red-600" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                  <select
                    value={filters.groupBy}
                    onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="day">Harian</option>
                    <option value="week">Mingguan</option>
                    <option value="month">Bulanan</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchReportData} className="w-full">
                    Terapkan Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100 mb-1">Total Penjualan</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData?.summary.totalSales || 0)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100 mb-1">Total Transaksi</p>
                  <p className="text-2xl font-bold">{(reportData?.summary.totalTransactions || 0).toLocaleString()}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100 mb-1">Rata-rata Transaksi</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData?.summary.avgTransaction || 0)}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100 mb-1">Pelanggan Unik</p>
                  <p className="text-2xl font-bold">{(reportData?.summary.uniqueCustomers || 0).toLocaleString()}</p>
                </div>
                <Users className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Tren Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== 'undefined' && reportData && (
                <Chart
                  options={salesTrendOptions}
                  series={[{ name: 'Penjualan', data: reportData.charts.salesTrend.map(s => s.sales) }]}
                  type="area"
                  height={300}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-purple-600" />
                Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== 'undefined' && reportData && (
                <Chart
                  options={paymentMethodOptions}
                  series={reportData.charts.paymentMethods.map(p => p.total)}
                  type="donut"
                  height={300}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Distribusi Per Jam
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== 'undefined' && reportData && (
                <Chart
                  options={hourlyOptions}
                  series={[{ name: 'Transaksi', data: reportData.charts.hourlyDistribution.map(h => h.transactions) }]}
                  type="bar"
                  height={250}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Produk</th>
                      <th className="text-right py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.topProducts.slice(0, 5).map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </td>
                        <td className="text-right py-2 px-2">{product.quantitySold}</td>
                        <td className="text-right py-2 px-2 font-medium text-green-600">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalesReportPage;
