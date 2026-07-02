import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { 
  FaChartLine, FaBoxOpen, FaShoppingCart, FaUsers, FaMoneyBillWave, 
  FaArrowUp, FaArrowDown, FaSpinner, FaWarehouse,
  FaReceipt, FaClock, FaCalendarAlt, FaChartBar, FaChartPie,
  FaExclamationTriangle, FaBell, FaStar, FaTicketAlt, FaUtensils,
  FaCalendar, FaDollarSign
} from "react-icons/fa";
import { ChefHat, UtensilsCrossed, ClipboardList } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useBusinessType } from "@/contexts/BusinessTypeContext";
import { useTranslation } from '@/lib/i18n';

const Dashboard: NextPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { businessType, hasModule, isLoading: isLoadingBusinessType } = useBusinessType();
  const { t, language, formatCurrency: fmtCurrency } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'week' | 'month'>('today');
  const MOCK_DASHBOARD = { mainStats: { sales: 12500000, transactions: 85, products: 320, customers: 45 }, changes: { sales: 8.5, transactions: 12.3, products: 0, customers: 5.2 }, topProducts: [{ name: 'Nasi Goreng Spesial', qty: 28, revenue: 2800000 }, { name: 'Es Teh Manis', qty: 45, revenue: 450000 }], recentTransactions: [{ id: 'txn-1', total: 185000, date: '2026-03-15', status: 'completed' }] };
  const MOCK_KITCHEN_ORDERS = [{ id: 'ko1', orderNumber: '#ORD-085', items: [{ name: 'Nasi Goreng', qty: 2 }], status: 'new', createdAt: new Date().toISOString() }];
  const [dashboardData, setDashboardData] = useState<any>(MOCK_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [kitchenOrders, setKitchenOrders] = useState<any[]>(MOCK_KITCHEN_ORDERS);
  
  // Check if F&B business type
  const isFnB = businessType === 'fnb' || hasModule('kitchen');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    
    // Wait for business type to load before redirecting
    if (status === "authenticated" && !isLoadingBusinessType) {
      if (isFnB) {
        console.log('Redirecting to F&B dashboard, businessType:', businessType);
        router.push("/dashboard-fnb");
      }
    }
  }, [session, status, router, isFnB, isLoadingBusinessType, businessType]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
      if (isFnB) {
        fetchKitchenOrders();
      }
    }
  }, [session, salesPeriod, isFnB]);

  const fetchKitchenOrders = async () => {
    try {
      const response = await fetch('/api/kitchen/orders?status=new&limit=6');
      const data = await response.json();
      if (data.success) {
        setKitchenOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      setKitchenOrders(MOCK_KITCHEN_ORDERS);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/stats?period=${salesPeriod}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(MOCK_DASHBOARD);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatSalesAmount = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) {
      return 'Rp 0';
    }
    if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)} Jt`;
    }
    return formatCurrency(amount);
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin h-12 w-12 mx-auto text-sky-600" />
            <p className="mt-4 text-gray-700">{t('dashboard.loadingDashboard')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      title: t('dashboard.totalSalesToday'),
      value: loading ? "..." : formatCurrency(dashboardData?.mainStats?.sales || 0),
      change: loading ? "..." : `${dashboardData?.changes?.sales >= 0 ? '+' : ''}${dashboardData?.changes?.sales?.toFixed(1) || 0}%`,
      changeText: t('common.vsYesterday'),
      isPositive: (dashboardData?.changes?.sales || 0) >= 0,
      icon: FaMoneyBillWave,
      gradient: "from-green-500 to-emerald-600",
      bgLight: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: t('dashboard.transactionsToday'),
      value: loading ? "..." : String(dashboardData?.mainStats?.transactions || 0),
      change: loading ? "..." : `${dashboardData?.changes?.transactions >= 0 ? '+' : ''}${dashboardData?.changes?.transactions?.toFixed(1) || 0}%`,
      changeText: t('common.vsYesterday'),
      isPositive: (dashboardData?.changes?.transactions || 0) >= 0,
      icon: FaShoppingCart,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: t('dashboard.productsSold'),
      value: loading ? "..." : String(dashboardData?.mainStats?.items || 0),
      change: loading ? "..." : `${dashboardData?.changes?.items >= 0 ? '+' : ''}${dashboardData?.changes?.items?.toFixed(1) || 0}%`,
      changeText: t('common.vsYesterday'),
      isPositive: (dashboardData?.changes?.items || 0) >= 0,
      icon: FaBoxOpen,
      gradient: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      title: t('dashboard.activeCustomers'),
      value: loading ? "..." : String(dashboardData?.mainStats?.customers || 0),
      change: "+0%",
      changeText: t('common.thisMonth'),
      isPositive: true,
      icon: FaUsers,
      gradient: "from-orange-500 to-orange-600",
      bgLight: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const quickStats = [
    { 
      label: t('dashboard.avgTransaction'), 
      value: loading ? "..." : formatCurrency(dashboardData?.quickStats?.avgTransaction || 0), 
      icon: FaReceipt 
    },
    { 
      label: t('dashboard.lowStock'), 
      value: loading ? "..." : t('dashboard.lowStockProducts', { count: dashboardData?.quickStats?.lowStock || 0 }), 
      icon: FaWarehouse, 
      alert: (dashboardData?.quickStats?.lowStock || 0) > 0 
    },
    { 
      label: t('dashboard.pendingOrders'), 
      value: loading ? "..." : String(dashboardData?.quickStats?.pendingOrders || 0), 
      icon: FaClock 
    },
  ];

  const topProducts = loading ? [] : (dashboardData?.topProducts || []).map((p: any) => ({
    name: p.name,
    sold: p.sold,
    revenue: formatCurrency(p.revenue),
    trend: p.trend
  }));

  const recentTransactions = loading ? [] : (dashboardData?.recentTransactions || []).map((t: any) => ({
    id: t.id,
    time: t.time,
    customer: t.customer,
    amount: formatCurrency(t.amount),
    status: t.status
  }));

  const alerts = loading ? [] : (dashboardData?.alerts || []);

  const colors = ['from-blue-500 to-blue-600', 'from-green-500 to-green-600', 'from-purple-500 to-purple-600', 'from-orange-500 to-orange-600', 'from-pink-500 to-pink-600', 'from-yellow-500 to-yellow-600'];
  const salesData = loading ? [] : (dashboardData?.salesByCashier || []).map((s: any, idx: number) => ({
    cashier: s.cashier,
    sales: s.sales,
    transactions: s.transactions,
    color: colors[idx % colors.length]
  }));

  const maxSales = salesData.length > 0 ? Math.max(...salesData.map((d: any) => d.sales || 0)) : 0;
  const totalSalesCashier = salesData.reduce((sum: number, d: any) => sum + (d.sales || 0), 0);
  const totalTransactionsCashier = salesData.reduce((sum: number, d: any) => sum + (d.transactions || 0), 0);

  const categoryColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
  const categoryData = loading ? [] : (dashboardData?.categoryData || []).map((c: any, idx: number) => ({
    name: c.name,
    value: c.value,
    color: categoryColors[idx % categoryColors.length]
  }));

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Welcome Section with Time */}
        <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {t('dashboard.welcome', { name: session?.user?.name || 'User' })}
                </h1>
                <p className="text-blue-100 text-lg">
                  {t('dashboard.businessSummary')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-blue-100 text-sm">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
            
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {quickStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <p className="text-xs text-blue-100">{stat.label}</p>
                        <p className="text-lg font-bold flex items-center space-x-2">
                          <span>{stat.value}</span>
                          {stat.alert && <FaExclamationTriangle className="w-4 h-4 text-yellow-300" />}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Grid - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${stat.gradient} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                      stat.isPositive ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {stat.isPositive ? (
                        <FaArrowUp className={`w-3 h-3 ${
                          stat.isPositive ? 'text-green-600' : 'text-red-600'
                        }`} />
                      ) : (
                        <FaArrowDown className={`w-3 h-3 ${
                          stat.isPositive ? 'text-green-600' : 'text-red-600'
                        }`} />
                      )}
                      <span className={`text-xs font-bold ${
                        stat.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>{stat.change}</span>
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium mb-2">{stat.title}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.changeText}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, idx) => (
              <Card key={idx} className={`border-l-4 ${
                alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaBell className={`w-5 h-5 ${
                        alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <p className="font-medium text-gray-900">{alert.message}</p>
                    </div>
                    <Link href={alert.link}>
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        alert.type === 'warning' 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } transition-colors`}>
                        {alert.action}
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FaChartBar className="w-5 h-5 text-blue-600" />
                    <span>{t('dashboard.salesPerCashier')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.cashierPerformance')} {salesPeriod === 'today' ? t('dashboard.cashierPerformanceToday') : salesPeriod === 'week' ? t('dashboard.cashierPerformanceWeek') : t('dashboard.cashierPerformanceMonth')}
                  </CardDescription>
                </div>
                <select 
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(e.target.value as 'today' | 'week' | 'month')}
                >
                  <option value="today">{t('common.today')}</option>
                  <option value="week">{t('common.thisWeek')}</option>
                  <option value="month">{t('common.thisMonth')}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.map((data, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 w-48">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg font-bold text-gray-700">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{data.cashier}</p>
                        <p className="text-xs text-gray-500">{data.transactions} {t('common.transaction')}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                          <div 
                            className={`bg-gradient-to-r ${data.color} h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500 shadow-md`}
                            style={{ width: `${(data.sales / maxSales) * 100}%` }}
                          >
                            <span className="text-white text-xs font-bold">
                              {data.sales >= 1000000 ? `${(data.sales / 1000000).toFixed(1)}M` : formatCurrency(data.sales)}
                            </span>
                          </div>
                        </div>
                        <div className="w-32 text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatSalesAmount(data.sales)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((data.sales / totalSalesCashier) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('dashboard.totalSales')}</p>
                    <p className="text-xl font-bold text-gray-900">{formatSalesAmount(totalSalesCashier)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('dashboard.totalTransactions')}</p>
                    <p className="text-xl font-bold text-blue-600">{totalTransactionsCashier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{t('dashboard.avgPerCashier')}</p>
                    <p className="text-xl font-bold text-green-600">
                      {salesData.length > 0 ? formatSalesAmount(totalSalesCashier / salesData.length) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FaChartPie className="w-5 h-5 text-purple-600" />
                <span>{t('dashboard.productCategory')}</span>
              </CardTitle>
              <CardDescription>{t('dashboard.salesByCategory')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((cat, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{cat.value}%</span>
                    </div>
                    <Progress value={cat.value} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600">{t('dashboard.topCategory')}</p>
                    <p className="text-lg font-bold text-blue-600">{categoryData[0]?.name || '-'}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600">{t('dashboard.growth')}</p>
                    <p className="text-lg font-bold text-green-600">+12%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FaChartLine className="w-5 h-5 text-green-600" />
                    <span>{t('dashboard.topProductsToday')}</span>
                  </CardTitle>
                  <CardDescription>{t('dashboard.topProductsDesc')}</CardDescription>
                </div>
                <Link href="/reports">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    {t('common.viewAll')} →
                  </button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sold} {t('common.sold')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{product.revenue}</p>
                      <p className="text-sm text-green-600 font-medium">{product.trend}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions - Enhanced */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
              <CardDescription>{isFnB ? t('dashboard.quickActionsFnb') : t('dashboard.quickActionsStd')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isFnB ? (
                /* F&B Specific Quick Actions */
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/kitchen/display">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <UtensilsCrossed className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.kitchenDisplay')}</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/kitchen/orders">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.orderList')}</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/tables">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <FaUtensils className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.tableManagement')}</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/reservations">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <FaCalendar className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.tableReservation')}</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/kitchen/recipes">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.recipeMenu')}</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/pos/cashier">
                    <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                          <FaShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.newTransaction')}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : (
                /* Standard Quick Actions */
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/pos/cashier">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaShoppingCart className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.newTransaction')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/inventory">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaBoxOpen className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.manageStock')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/reports">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaChartLine className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.viewReports')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/customers">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaUsers className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.customerData')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/promo-voucher">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaTicketAlt className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.promoVoucher')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/loyalty-program">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaStar className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.loyaltyProgram')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/tables">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaUtensils className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.tableManagement')}</p>
                    </div>
                  </div>
                </Link>

                <Link href="/reservations">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                        <FaCalendar className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm" style={{ whiteSpace: 'pre-line' }}>{t('dashboard.reservations')}</p>
                    </div>
                  </div>
                </Link>
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* F&B Specific: Kitchen Orders Grid */}
        {isFnB && kitchenOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <ChefHat className="w-6 h-6 mr-2 text-orange-600" />
                  {t('dashboard.newKitchenOrders')}
                </h2>
                <p className="text-sm text-gray-600">{t('dashboard.ordersToProcess')}</p>
              </div>
              <Link href="/kitchen/display">
                <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-medium transition-all">
                  {t('dashboard.openKDS')}
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenOrders.slice(0, 6).map((order: any) => (
                <Card key={order.id} className="border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{order.order_number}</p>
                          <p className="text-xs text-gray-500">
                            {order.table_number ? t('dashboard.table', { number: order.table_number }) : order.customer_name || t('dashboard.takeaway')}
                          </p>
                        </div>
                      </div>
                      {order.priority === 'urgent' && (
                        <Badge className="bg-red-500 text-white">{t('dashboard.urgent')}</Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.items?.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="text-sm bg-gray-50 rounded p-2">
                          <span className="font-medium">{item.quantity}x</span> {item.name}
                        </div>
                      ))}
                      {order.items?.length > 2 && (
                        <p className="text-xs text-gray-500">{t('common.otherItems', { count: order.items.length - 2 })}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-600">
                        <FaClock className="w-3 h-3 mr-1" />
                        <span>{order.estimated_time || 15} {t('common.minute')}</span>
                      </div>
                      <Link href={`/kitchen/display`}>
                        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                          {t('common.viewDetails')} →
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FaReceipt className="w-5 h-5 text-blue-600" />
                  <span>{t('dashboard.recentTransactions')}</span>
                </CardTitle>
                <CardDescription>{t('dashboard.last4Transactions')}</CardDescription>
              </div>
              <Link href="/pos/transactions">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {t('common.viewAll')} →
                </button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((trx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <FaShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{trx.id}</p>
                      <p className="text-sm text-gray-500">{trx.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{trx.amount}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-gray-500">{trx.time}</p>
                      <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                        {t('common.success')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
