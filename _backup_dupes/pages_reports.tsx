import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaChartBar, FaShoppingCart, FaBoxOpen, FaMoneyBillWave, 
  FaUsers, FaArrowRight, FaCalendar, FaDownload, FaArrowUp,
  FaArrowDown, FaChartLine, FaChartPie
} from 'react-icons/fa';

const ReportsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/dashboard');
      
      if (!response.ok) {
        console.warn('API failed, using fallback data');
        // Use fallback data instead of throwing error
        setDashboardData(getFallbackData());
        setError(null);
        return;
      }

      const data = await response.json();
      setDashboardData(data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      // Use fallback data on error
      setDashboardData(getFallbackData());
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackData = () => {
    return {
      quickStats: [
        {
          label: 'Total Penjualan Bulan Ini',
          value: 0,
          valueFormatted: 'Rp 0',
          change: '+0%',
          isPositive: true
        },
        {
          label: 'Total Transaksi',
          value: 0,
          valueFormatted: '0',
          change: '+0%',
          isPositive: true
        },
        {
          label: 'Rata-rata Transaksi',
          value: 0,
          valueFormatted: 'Rp 0',
          change: '+0%',
          isPositive: true
        },
        {
          label: 'Produk Terjual',
          value: 0,
          valueFormatted: '0',
          change: '+0%',
          isPositive: true
        }
      ],
      reportCategories: [
        {
          title: 'Laporan Penjualan',
          description: 'Analisis penjualan dan transaksi POS',
          href: '/pos/reports',
          stats: {
            total: 'Rp 0',
            change: '+0%',
            trend: 'up'
          }
        },
        {
          title: 'Laporan Inventory',
          description: 'Stok, pergerakan, dan nilai inventory',
          href: '/inventory/reports',
          stats: {
            total: '0 Produk',
            change: '+0%',
            trend: 'up'
          }
        },
        {
          title: 'Laporan Keuangan',
          description: 'Pendapatan, pengeluaran, dan profit',
          href: '/finance/reports',
          stats: {
            total: 'Rp 0',
            change: '+0%',
            trend: 'up'
          }
        },
        {
          title: 'Laporan Pelanggan',
          description: 'Analisis pelanggan dan CRM',
          href: '/customers/reports',
          stats: {
            total: '0',
            change: '+0%',
            trend: 'up'
          }
        }
      ],
      recentReports: []
    };
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Laporan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={fetchDashboardData}>Coba Lagi</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-600">No data available</p>
        </div>
      </DashboardLayout>
    );
  }

  // Get data from API
  const quickStats = dashboardData?.quickStats || [];
  const reportCategories = [
    {
      ...dashboardData?.reportCategories?.[0],
      icon: FaShoppingCart,
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      ...dashboardData?.reportCategories?.[1],
      icon: FaBoxOpen,
      color: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      ...dashboardData?.reportCategories?.[2],
      icon: FaMoneyBillWave,
      color: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    {
      ...dashboardData?.reportCategories?.[3],
      icon: FaUsers,
      color: "bg-gradient-to-br from-orange-500 to-orange-600"
    }
  ];
  const recentReports = dashboardData?.recentReports || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Laporan & Analisis | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Laporan & Analisis</h1>
              <p className="text-sky-100">
                Dashboard laporan lengkap untuk semua aspek bisnis
              </p>
            </div>
            <FaChartBar className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat: any, index: number) => (
            <Card key={index}>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">{stat.valueFormatted}</p>
                  <div className="flex items-center">
                    {stat.isPositive ? (
                      <FaArrowUp className="text-green-600 mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-600 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-20 flex flex-col items-center justify-center bg-sky-600 hover:bg-sky-700">
                <FaCalendar className="text-xl mb-1" />
                <span className="text-sm">Pilih Periode</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-green-600 hover:bg-green-700">
                <FaDownload className="text-xl mb-1" />
                <span className="text-sm">Export Excel</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-purple-600 hover:bg-purple-700">
                <FaChartLine className="text-xl mb-1" />
                <span className="text-sm">Grafik</span>
              </Button>
              <Button className="h-20 flex flex-col items-center justify-center bg-orange-600 hover:bg-orange-700">
                <FaChartPie className="text-xl mb-1" />
                <span className="text-sm">Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kategori Laporan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link key={index} href={category.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${category.color} w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <FaArrowRight className="text-gray-400 group-hover:text-sky-600 transition-colors" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {category.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-lg font-bold text-gray-900">{category.stats.total}</p>
                        </div>
                        <div className="flex items-center">
                          {category.stats.trend === 'up' ? (
                            <FaArrowUp className="text-green-600 mr-1" />
                          ) : (
                            <FaArrowDown className="text-red-600 mr-1" />
                          )}
                          <span className={`text-sm font-medium ${
                            category.stats.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {category.stats.change}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Laporan Terbaru</CardTitle>
              <Button variant="outline" size="sm">
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                      <FaChartBar className="text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-sm text-gray-500">{report.type} • {report.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {report.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <FaDownload className="text-gray-600" />
                    </Button>
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

export default ReportsPage;
