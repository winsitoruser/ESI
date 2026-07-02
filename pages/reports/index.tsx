import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  Users, ShoppingCart, Calendar, Download, Filter,
  FileText, PieChart, Activity
} from 'lucide-react';

interface ReportSummary {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  salesChange: number;
  ordersChange: number;
  customersChange: number;
}

const ReportsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const MOCK_RPT_SUMMARY: ReportSummary = { totalSales: 125000000, totalOrders: 1842, totalCustomers: 450, avgOrderValue: 67900, salesChange: 12.5, ordersChange: 8.3, customersChange: 5.1 };
  const [summary, setSummary] = useState<ReportSummary>(MOCK_RPT_SUMMARY);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReportSummary();
    }
  }, [status, dateRange]);

  const fetchReportSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching report summary:', error);
      setSummary(MOCK_RPT_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const reportTypes = [
    {
      title: 'Sales Report',
      description: 'Detailed sales analysis and trends',
      icon: DollarSign,
      href: '/reports/sales',
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Kitchen Reports',
      description: 'Kitchen performance and efficiency',
      icon: BarChart3,
      href: '/kitchen/reports',
      color: 'from-orange-500 to-red-600'
    },
    {
      title: 'Inventory Reports',
      description: 'Stock levels and movements',
      icon: ShoppingCart,
      href: '/reports/inventory',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'Customer Analytics',
      description: 'Customer behavior and preferences',
      icon: Users,
      href: '/reports/customers',
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Staff Performance',
      description: 'Employee productivity metrics',
      icon: Activity,
      href: '/reports/staff',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      title: 'Financial Reports',
      description: 'Revenue, costs, and profits',
      icon: PieChart,
      href: '/reports/financial',
      color: 'from-amber-500 to-orange-600'
    }
  ];

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Reports | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-1.5 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full mr-3"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
              <p className="text-gray-600">Business insights and performance metrics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSales)}</p>
                  <div className={`flex items-center text-sm mt-1 ${getChangeColor(summary.salesChange)}`}>
                    {getChangeIcon(summary.salesChange)}
                    <span className="ml-1">{Math.abs(summary.salesChange)}%</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalOrders.toLocaleString()}</p>
                  <div className={`flex items-center text-sm mt-1 ${getChangeColor(summary.ordersChange)}`}>
                    {getChangeIcon(summary.ordersChange)}
                    <span className="ml-1">{Math.abs(summary.ordersChange)}%</span>
                  </div>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalCustomers.toLocaleString()}</p>
                  <div className={`flex items-center text-sm mt-1 ${getChangeColor(summary.customersChange)}`}>
                    {getChangeIcon(summary.customersChange)}
                    <span className="ml-1">{Math.abs(summary.customersChange)}%</span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgOrderValue)}</p>
                  <div className="text-sm text-gray-500 mt-1">Per transaction</div>
                </div>
                <BarChart3 className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report, index) => {
              const Icon = report.icon;
              return (
                <a key={index} href={report.href}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer group h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`bg-gradient-to-br ${report.color} w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <FileText className="text-gray-400 group-hover:text-sky-600 transition-colors" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {report.description}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Download className="text-xl mb-1" />
                <span className="text-sm">Export All</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Calendar className="text-xl mb-1" />
                <span className="text-sm">Schedule Report</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Filter className="text-xl mb-1" />
                <span className="text-sm">Custom Filters</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <FileText className="text-xl mb-1" />
                <span className="text-sm">Report Templates</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
