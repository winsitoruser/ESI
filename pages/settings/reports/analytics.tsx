import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
  FaChartLine, FaDownload, FaFilter, FaCalendarAlt, FaFileExcel,
  FaFilePdf, FaFileCsv, FaTachometerAlt, FaDollarSign, FaShoppingCart,
  FaUsers, FaBox, FaArrowUp, FaArrowDown, FaEye
} from 'react-icons/fa';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  topProducts: any[];
  salesByCategory: any[];
  salesByPayment: any[];
  dailySales: any[];
  hourlySales: any[];
}

const ReportsAnalytics: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_ANALYTICS: AnalyticsData = { totalRevenue: 125000000, totalOrders: 1842, totalCustomers: 450, totalProducts: 120, revenueGrowth: 12.5, orderGrowth: 8.3, customerGrowth: 5.1, topProducts: [{ name: 'Nasi Goreng', quantity: 320, revenue: 11200000 }, { name: 'Mie Ayam', quantity: 280, revenue: 7000000 }], salesByCategory: [{ category: 'Makanan', total: 85000000 }, { category: 'Minuman', total: 40000000 }], salesByPayment: [{ method: 'Cash', total: 75000000 }, { method: 'QRIS', total: 50000000 }], dailySales: [], hourlySales: [] };
  const MOCK_AN_BRANCHES = [{ id: 'b1', name: 'Pusat' }, { id: 'b2', name: 'Cabang Bandung' }];
  const [data, setData] = useState<AnalyticsData | null>(MOCK_ANALYTICS);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [reportType, setReportType] = useState('overview');
  const [branchId, setBranchId] = useState('all');
  const [branches, setBranches] = useState<any[]>(MOCK_AN_BRANCHES);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
      fetchBranches();
    }
  }, [session, dateRange, branchId, reportType]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        reportType,
        branchId
      });

      const response = await fetch(`/api/settings/reports/analytics?${params}`);
      const result = await response.json();
      
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

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/settings/store/branches');
      const result = await response.json();
      
      if (result.success) {
        setBranches(result.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches(MOCK_AN_BRANCHES);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        reportType,
        branchId,
        format
      });

      const response = await fetch(`/api/settings/reports/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Gagal export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon, 
    color 
  }: { 
    title: string; 
    value: string | number; 
    growth?: number; 
    icon: React.ReactNode; 
    color: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {growth !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {growth >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                {Math.abs(growth)}% dari periode sebelumnya
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Reports & Analytics | BEDAGANG Cloud POS</title>
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FaChartLine className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                  <p className="text-teal-100">Analisis performa bisnis Anda</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => exportReport('excel')}>
                  <FaFileExcel className="mr-2" />
                  Excel
                </Button>
                <Button variant="secondary" onClick={() => exportReport('pdf')}>
                  <FaFilePdf className="mr-2" />
                  PDF
                </Button>
                <Button variant="secondary" onClick={() => exportReport('csv')}>
                  <FaFileCsv className="mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-400" />
                  <DateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange(range);
                      }
                    }}
                  />
                </div>
                
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="products">Products Report</SelectItem>
                    <SelectItem value="customers">Customers Report</SelectItem>
                    <SelectItem value="payments">Payments Report</SelectItem>
                  </SelectContent>
                </Select>

                {branches.length > 0 && (
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button onClick={fetchAnalytics}>
                  <FaFilter className="mr-2" />
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {data && (
            <>
              {/* Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Revenue"
                  value={formatCurrency(data.totalRevenue)}
                  growth={data.revenueGrowth}
                  icon={<FaDollarSign className="w-6 h-6 text-white" />}
                  color="bg-blue-500"
                />
                <MetricCard
                  title="Total Orders"
                  value={formatNumber(data.totalOrders)}
                  growth={data.orderGrowth}
                  icon={<FaShoppingCart className="w-6 h-6 text-white" />}
                  color="bg-green-500"
                />
                <MetricCard
                  title="Total Customers"
                  value={formatNumber(data.totalCustomers)}
                  growth={data.customerGrowth}
                  icon={<FaUsers className="w-6 h-6 text-white" />}
                  color="bg-purple-500"
                />
                <MetricCard
                  title="Total Products"
                  value={formatNumber(data.totalProducts)}
                  icon={<FaBox className="w-6 h-6 text-white" />}
                  color="bg-orange-500"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Sales Trend</CardTitle>
                    <CardDescription>Revenue per day in selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      <FaChartLine className="w-16 h-16" />
                      <span className="ml-2">Chart will be rendered here</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Sales by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Revenue distribution by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.salesByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }}
                            />
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(category.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Best performing products in selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Product</th>
                          <th className="text-right p-2">Units Sold</th>
                          <th className="text-right p-2">Revenue</th>
                          <th className="text-right p-2">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.map((product, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{product.name}</td>
                            <td className="text-right p-2">{formatNumber(product.unitsSold)}</td>
                            <td className="text-right p-2">{formatCurrency(product.revenue)}</td>
                            <td className="text-right p-2">
                              <span className={`inline-flex items-center ${
                                product.growth >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {product.growth >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                                {Math.abs(product.growth)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default ReportsAnalytics;
